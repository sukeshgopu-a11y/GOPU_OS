import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import type { AuditLevel } from '../env';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: { runId?: string; level: AuditLevel; event: string; payload?: Record<string, unknown> }) {
    await this.prisma.auditLog.create({
      data: {
        runId: input.runId,
        level: input.level,
        event: input.event,
        payload: (input.payload || {}) as Prisma.InputJsonValue
      }
    });
  }
}
