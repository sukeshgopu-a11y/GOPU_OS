import { Injectable, OnModuleInit } from '@nestjs/common';
import { createDailyQueue } from './queues';
import { optionalEnv } from '../env';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { computeNextRunUtc, dbScheduleFromCampaign, formatInSelectedTimezone, localPostingTimeToCron } from '../schedule/schedule';

@Injectable()
export class SchedulerService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async onModuleInit() {
    const activeCampaign = await this.prisma.campaign.findFirst({ where: { isActive: true } });
    if (!activeCampaign) return;
    await this.registerCampaignSchedule(activeCampaign.id);
  }

  async registerCampaignSchedule(campaignId: string) {
    const activeCampaign = await this.prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } });

    const queue = createDailyQueue();
    const existingJobs = await queue.getRepeatableJobs();
    await Promise.all(
      existingJobs
        .filter((job) => job.id === `daily-campaign:${activeCampaign.id}`)
        .map((job) => queue.removeRepeatableByKey(job.key))
    );

    const dbSchedule = dbScheduleFromCampaign(activeCampaign);
    const cron = dbSchedule ? localPostingTimeToCron(dbSchedule.postingTimeLocal) : optionalEnv('DAILY_JOB_CRON_UTC', '30 2 * * *');
    const nextRunAtUtc = dbSchedule ? computeNextRunUtc(dbSchedule) : null;
    if (nextRunAtUtc) {
      await this.prisma.campaign.update({
        where: { id: activeCampaign.id },
        data: { nextRunAtUtc }
      });
    }

    await queue.add(
      'daily-campaign',
      {
        campaignId: activeCampaign.id,
        scheduleTimezone: dbSchedule?.timezone || 'UTC',
        postingTimeLocal: dbSchedule?.postingTimeLocal || null
      },
      {
        jobId: `daily-campaign:${activeCampaign.id}`,
        repeat: dbSchedule ? { pattern: cron, tz: dbSchedule.timezone } : { pattern: cron },
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 }
      }
    );
    await queue.close();
    await this.audit.write({
      level: 'info',
      event: 'daily_repeatable_job_registered',
      payload: {
        campaignId: activeCampaign.id,
        source: dbSchedule ? 'database_schedule' : 'env_fallback',
        country: dbSchedule?.country,
        timezone: dbSchedule?.timezone,
        postingTimeLocal: dbSchedule?.postingTimeLocal,
        cron,
        nextRunAtUtc: nextRunAtUtc?.toISOString(),
        nextRunPreview: nextRunAtUtc && dbSchedule ? formatInSelectedTimezone(nextRunAtUtc, dbSchedule.timezone) : null
      }
    });
  }
}
