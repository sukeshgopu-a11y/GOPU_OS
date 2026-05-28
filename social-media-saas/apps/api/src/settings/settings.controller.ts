import { BadRequestException, Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { publicConfigStatus } from '../env';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import { SchedulerService } from '../queues/scheduler.service';
import {
  assertValidSchedule,
  computeNextRunUtc,
  dbScheduleFromCampaign,
  formatInSelectedTimezone,
  supportedScheduleOptions,
  type ScheduleSettings
} from '../schedule/schedule';

export class UpdateScheduleDto {
  country!: string;
  timezone!: string;
  postingTimeLocal!: string;
}

@UseGuards(JwtGuard)
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scheduler: SchedulerService
  ) {}

  @Get()
  async getSettings() {
    const campaign = await this.prisma.campaign.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    const dbSchedule = campaign ? dbScheduleFromCampaign(campaign) : null;
    const nextRunAtUtc = campaign?.nextRunAtUtc || (dbSchedule ? computeNextRunUtc(dbSchedule) : null);
    return {
      product: 'Daily Social Content Automation',
      status: publicConfigStatus(),
      scheduleOptions: supportedScheduleOptions,
      schedule: campaign
        ? {
            campaignId: campaign.id,
            source: dbSchedule ? 'database_schedule' : 'env_fallback',
            country: dbSchedule?.country || '',
            timezone: dbSchedule?.timezone || '',
            postingTimeLocal: dbSchedule?.postingTimeLocal || '',
            nextRunAtUtc: nextRunAtUtc?.toISOString() || '',
            nextRunPreview: nextRunAtUtc && dbSchedule ? formatInSelectedTimezone(nextRunAtUtc, dbSchedule.timezone) : 'Using DAILY_JOB_CRON_UTC fallback'
          }
        : null
    };
  }

  @Put('schedule')
  async updateSchedule(@Body() body: UpdateScheduleDto) {
    const schedule: ScheduleSettings = {
      country: String(body.country || '').trim(),
      timezone: String(body.timezone || '').trim(),
      postingTimeLocal: String(body.postingTimeLocal || '').trim()
    };

    try {
      assertValidSchedule(schedule);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'Invalid schedule settings.');
    }

    const campaign = await this.prisma.campaign.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
    if (!campaign) throw new BadRequestException('No active campaign exists.');

    const nextRunAtUtc = computeNextRunUtc(schedule);
    const updated = await this.prisma.campaign.update({
      where: { id: campaign.id },
      data: {
        scheduleCountry: schedule.country,
        scheduleTimezone: schedule.timezone,
        postingTimeLocal: schedule.postingTimeLocal,
        nextRunAtUtc
      }
    });

    await this.audit.write({
      level: 'info',
      event: 'posting_schedule_changed',
      payload: {
        campaignId: campaign.id,
        country: schedule.country,
        timezone: schedule.timezone,
        postingTimeLocal: schedule.postingTimeLocal,
        nextRunAtUtc: nextRunAtUtc.toISOString()
      }
    });

    await this.scheduler.registerCampaignSchedule(campaign.id);

    return {
      ok: true,
      schedule: {
        campaignId: updated.id,
        source: 'database_schedule',
        country: updated.scheduleCountry,
        timezone: updated.scheduleTimezone,
        postingTimeLocal: updated.postingTimeLocal,
        nextRunAtUtc: nextRunAtUtc.toISOString(),
        nextRunPreview: formatInSelectedTimezone(nextRunAtUtc, schedule.timezone)
      }
    };
  }
}
