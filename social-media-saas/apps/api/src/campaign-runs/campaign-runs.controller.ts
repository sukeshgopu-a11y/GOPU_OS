import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma.service';

@UseGuards(JwtGuard)
@Controller('campaign-runs')
export class CampaignRunsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.campaignRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        campaign: true,
        contentVariants: true,
        approvalRequests: true,
        publishJobs: true
      }
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.campaignRun.findUniqueOrThrow({
      where: { id },
      include: {
        campaign: true,
        contentVariants: true,
        approvalRequests: { include: { actions: true } },
        publishJobs: true,
        auditLogs: { orderBy: { createdAt: 'asc' } }
      }
    });
  }
}
