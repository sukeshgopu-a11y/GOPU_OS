import { Body, Controller, Headers, HttpCode, Post, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../prisma.service';
import { verifySlackSignature } from './slack-signature';
import { enqueuePublishJobs } from '../worker/workflow';
import { AuditService } from '../audit/audit.service';

type SlackActionBody = {
  payload?: string;
};

type SlackActionPayload = {
  user?: { id?: string; username?: string; name?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
};

@Controller('slack')
export class SlackController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  @Post('interactivity')
  @HttpCode(200)
  async interactivity(
    @Req() request: Request & { rawBody?: string },
    @Headers('x-slack-request-timestamp') timestamp: string,
    @Headers('x-slack-signature') signature: string,
    @Body() body: SlackActionBody
  ) {
    if (!verifySlackSignature({ timestamp, signature, rawBody: request.rawBody })) {
      throw new UnauthorizedException('Invalid Slack signature');
    }

    const payload = JSON.parse(body.payload || '{}') as SlackActionPayload;
    const action = payload.actions?.[0];
    const [decision, runId] = String(action?.value || '').split(':');
    if (!runId || !['approve', 'reject', 'request_changes'].includes(decision)) {
      return { response_type: 'ephemeral', text: 'Unsupported action.' };
    }

    const approval = await this.prisma.approvalRequest.findFirstOrThrow({
      where: { runId },
      orderBy: { createdAt: 'desc' }
    });
    await this.prisma.approvalAction.create({
      data: {
        approvalRequestId: approval.id,
        action: decision,
        provider: 'slack',
        payload: {
          slackUser: payload.user?.id || payload.user?.username || payload.user?.name || 'unknown',
          actionId: action?.action_id
        }
      }
    });

    if (decision === 'approve') {
      await this.prisma.$transaction([
        this.prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: 'approved' } }),
        this.prisma.campaignRun.update({ where: { id: runId }, data: { status: 'approved' } }),
        this.prisma.contentVariant.updateMany({ where: { runId }, data: { status: 'approved' } })
      ]);
      await this.audit.write({ runId, level: 'info', event: 'approval_approved', payload: { provider: 'slack' } });
      await enqueuePublishJobs(runId);
      return { response_type: 'ephemeral', text: 'Approved. Publish jobs have been queued.' };
    }

    if (decision === 'reject') {
      await this.prisma.$transaction([
        this.prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: 'rejected' } }),
        this.prisma.campaignRun.update({ where: { id: runId }, data: { status: 'rejected', completedAt: new Date() } }),
        this.prisma.contentVariant.updateMany({ where: { runId }, data: { status: 'rejected' } })
      ]);
      await this.audit.write({ runId, level: 'warning', event: 'approval_rejected', payload: { provider: 'slack' } });
      return { response_type: 'ephemeral', text: 'Rejected. The run has been stopped.' };
    }

    await this.prisma.$transaction([
      this.prisma.approvalRequest.update({ where: { id: approval.id }, data: { status: 'pending' } }),
      this.prisma.campaignRun.update({ where: { id: runId }, data: { status: 'pending' } }),
      this.prisma.contentVariant.updateMany({ where: { runId }, data: { status: 'pending' } })
    ]);
    await this.audit.write({ runId, level: 'warning', event: 'approval_changes_requested', payload: { provider: 'slack' } });
    return { response_type: 'ephemeral', text: 'Changes requested. The run is marked for revision.' };
  }
}
