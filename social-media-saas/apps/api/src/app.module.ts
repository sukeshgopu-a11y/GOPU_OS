import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { requiredEnv } from './env';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit/audit.service';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { JwtGuard } from './auth/jwt.guard';
import { CampaignRunsController } from './campaign-runs/campaign-runs.controller';
import { SchedulerService } from './queues/scheduler.service';
import { SettingsController } from './settings/settings.controller';
import { SlackController } from './slack/slack.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: requiredEnv('JWT_SECRET'),
      signOptions: { expiresIn: '12h' }
    })
  ],
  controllers: [AuthController, CampaignRunsController, SettingsController, SlackController],
  providers: [PrismaService, AuditService, AuthService, JwtGuard, SchedulerService]
})
export class AppModule {}
