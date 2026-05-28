import { PrismaClient } from '@prisma/client';
import { Job, Worker } from 'bullmq';
import { boolEnv, optionalEnv, platforms } from '../env';
import { createPublishQueue, dailyQueueName, publishQueueName, redisConnection } from '../queues/queues';
import { approvalProvider, contentProvider, imageProvider, posterComposer, publisherFor, storageProvider } from '../providers/provider-factory';
import type { ApprovalPoster, GeneratedPost } from '../providers/interfaces';
import { computeNextRunUtc, dbScheduleFromCampaign } from '../schedule/schedule';
import { audit } from './audit';

const prisma = new PrismaClient();

type DailyJobData = {
  campaignId: string;
};

type PublishJobData = {
  publishJobId: string;
};

async function createRun(job: Job<DailyJobData>) {
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: job.data.campaignId } });
  const dbSchedule = dbScheduleFromCampaign(campaign);
  const scheduledFor = campaign.nextRunAtUtc || new Date();
  const run = await prisma.campaignRun.create({
    data: {
      campaignId: campaign.id,
      status: 'generating',
      scheduledFor,
      startedAt: new Date()
    }
  });
  if (dbSchedule) {
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { nextRunAtUtc: computeNextRunUtc(dbSchedule, new Date(Date.now() + 60_000)) }
    });
  }
  await audit(prisma, {
    runId: run.id,
    level: 'info',
    event: 'campaign_run_generation_started',
    payload: {
      campaignId: campaign.id,
      scheduledForUtc: scheduledFor.toISOString(),
      scheduleSource: dbSchedule ? 'database_schedule' : 'env_fallback',
      timezone: dbSchedule?.timezone,
      postingTimeLocal: dbSchedule?.postingTimeLocal
    }
  });

  try {
    const content = contentProvider();
    const variants: Array<{ platform: (typeof platforms)[number]; generated: GeneratedPost }> = [];
    for (const platform of platforms) {
      const generated = await content.generatePost({ productFocus: campaign.productFocus, platform });
      variants.push({ platform, generated });
      await prisma.contentVariant.create({
        data: {
          runId: run.id,
          platform,
          caption: generated.caption,
          hashtags: generated.hashtags,
          imagePrompt: generated.imagePrompt,
          status: 'generating'
        }
      });
      await audit(prisma, { runId: run.id, level: 'info', event: 'content_variant_generated', payload: { platform } });
    }

    const basePrompt = variants[0]?.generated.imagePrompt || `Premium social poster for ${campaign.productFocus}`;
    const basePoster = await imageProvider().generate(basePrompt);
    await audit(prisma, { runId: run.id, level: 'info', event: 'base_poster_generated', payload: { provider: optionalEnv('IMAGE_PROVIDER', 'openai') } });

    const finalPoster = await posterComposer().compose({
      baseImage: basePoster.imageBuffer,
      logoPath: optionalEnv('LOGO_PATH')
    });
    const key = `campaign-runs/${run.id}/poster.png`;
    const { imageUrl } = await storageProvider().uploadPoster({ key, buffer: finalPoster, contentType: 'image/png' });
    await audit(prisma, { runId: run.id, level: 'info', event: 'poster_composed_and_uploaded', payload: { key } });

    await prisma.contentVariant.updateMany({
      where: { runId: run.id },
      data: { imageUrl, status: 'awaiting_approval' }
    });

    const posters: ApprovalPoster[] = variants.map(({ platform, generated }) => ({
      platform,
      imageUrl,
      caption: generated.caption,
      hashtags: generated.hashtags
    }));
    const approval = await prisma.approvalRequest.create({
      data: { runId: run.id, status: 'pending', provider: 'slack' }
    });
    await audit(prisma, { runId: run.id, level: 'info', event: 'approval_request_created', payload: { approvalRequestId: approval.id } });

    const slack = await approvalProvider().sendForApproval({ runId: run.id, posters });
    await prisma.approvalRequest.update({ where: { id: approval.id }, data: { messageTs: slack.messageTs } });
    await prisma.campaignRun.update({ where: { id: run.id }, data: { status: 'awaiting_approval' } });
    await audit(prisma, { runId: run.id, level: 'info', event: 'slack_approval_sent', payload: { messageTs: slack.messageTs } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown generation failure';
    await prisma.campaignRun.update({ where: { id: run.id }, data: { status: 'failed', failureReason: message, completedAt: new Date() } });
    await audit(prisma, { runId: run.id, level: 'error', event: 'campaign_run_generation_failed', payload: { message } });
    throw error;
  }
}

async function publishPlatform(job: Job<PublishJobData>) {
  const publishJob = await prisma.publishJob.findUniqueOrThrow({
    where: { id: job.data.publishJobId },
    include: { contentVariant: true, run: { include: { approvalRequests: { orderBy: { createdAt: 'desc' }, take: 1 } } } }
  });
  if (publishJob.status === 'published' && publishJob.externalPostId) return;

  const latestApproval = publishJob.run.approvalRequests[0];
  if (publishJob.run.status !== 'approved' || latestApproval?.status !== 'approved') {
    await prisma.publishJob.update({
      where: { id: publishJob.id },
      data: { status: 'blocked', error: 'Publish blocked because run is not approved.' }
    });
    await audit(prisma, {
      runId: publishJob.runId,
      level: 'warning',
      event: 'publish_job_blocked_unapproved_run',
      payload: { platform: publishJob.platform, runStatus: publishJob.run.status, approvalStatus: latestApproval?.status || 'missing' }
    });
    return;
  }

  await prisma.publishJob.update({
    where: { id: publishJob.id },
    data: { status: 'publishing', attempts: { increment: 1 } }
  });
  await prisma.campaignRun.update({ where: { id: publishJob.runId }, data: { status: 'publishing' } });
  await audit(prisma, { runId: publishJob.runId, level: 'info', event: 'publish_job_started', payload: { platform: publishJob.platform } });

  try {
    if (publishJob.platform === 'linkedin' && !boolEnv('LINKEDIN_ENABLED', false)) {
      await prisma.publishJob.update({
        where: { id: publishJob.id },
        data: { status: 'skipped', error: 'LinkedIn publishing is disabled by LINKEDIN_ENABLED=false.' }
      });
      await audit(prisma, { runId: publishJob.runId, level: 'warning', event: 'linkedin_publish_skipped_by_feature_flag', payload: {} });
      return;
    } else {
      if (!publishJob.contentVariant.imageUrl) throw new Error('Content variant is missing image URL.');
      const result = await publisherFor(publishJob.platform as never).publish({
        imageUrl: publishJob.contentVariant.imageUrl,
        caption: publishJob.contentVariant.caption
      });
      await prisma.publishJob.update({
        where: { id: publishJob.id },
        data: { status: 'published', externalPostId: result.externalPostId, error: null }
      });
      await prisma.contentVariant.update({
        where: { id: publishJob.contentVariantId },
        data: { status: 'published' }
      });
      await audit(prisma, {
        runId: publishJob.runId,
        level: 'info',
        event: 'publish_job_succeeded',
        payload: { platform: publishJob.platform, externalPostId: result.externalPostId }
      });
    }

    const remaining = await prisma.publishJob.count({
      where: { runId: publishJob.runId, NOT: { status: 'published' } }
    });
    if (remaining === 0) {
      await prisma.campaignRun.update({
        where: { id: publishJob.runId },
        data: { status: 'published', completedAt: new Date() }
      });
      await audit(prisma, { runId: publishJob.runId, level: 'info', event: 'campaign_run_published', payload: {} });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown publishing failure';
    await prisma.publishJob.update({
      where: { id: publishJob.id },
      data: { status: 'failed', error: message }
    });
    await audit(prisma, { runId: publishJob.runId, level: 'error', event: 'publish_job_failed', payload: { platform: publishJob.platform, message } });
    throw error;
  }
}

export function startWorkers() {
  const dailyWorker = new Worker<DailyJobData>(dailyQueueName, createRun, {
    connection: redisConnection(),
    concurrency: 1
  });
  const publishWorker = new Worker<PublishJobData>(publishQueueName, publishPlatform, {
    connection: redisConnection(),
    concurrency: 3
  });

  dailyWorker.on('failed', (job, error) => {
    console.error('[daily-worker] failed', { jobId: job?.id, message: error.message });
  });
  publishWorker.on('failed', (job, error) => {
    console.error('[publish-worker] failed', { jobId: job?.id, message: error.message });
  });
}

export async function enqueuePublishJobs(runId: string) {
  const variants = await prisma.contentVariant.findMany({ where: { runId } });
  const queue = createPublishQueue();
  for (const variant of variants) {
    if (variant.platform === 'linkedin' && !boolEnv('LINKEDIN_ENABLED', false)) {
      await audit(prisma, { runId, level: 'warning', event: 'linkedin_publish_not_enqueued_feature_flag_disabled', payload: {} });
      continue;
    }
    const idempotencyKey = `${runId}:${variant.platform}`;
    const publishJob = await prisma.publishJob.upsert({
      where: { idempotencyKey },
      update: {},
      create: {
        runId,
        contentVariantId: variant.id,
        platform: variant.platform,
        idempotencyKey,
        status: 'pending'
      }
    });
    await queue.add(
      'publish-platform',
      { publishJobId: publishJob.id },
      {
        jobId: idempotencyKey,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 }
      }
    );
  }
  await queue.close();
}
