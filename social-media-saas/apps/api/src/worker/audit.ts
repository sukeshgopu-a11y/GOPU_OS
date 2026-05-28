import { Prisma, type PrismaClient } from '@prisma/client';
import type { AuditLevel } from '../env';

export async function audit(
  prisma: PrismaClient,
  input: { runId?: string; level: AuditLevel; event: string; payload?: Record<string, unknown> }
) {
  await prisma.auditLog.create({
    data: {
      runId: input.runId,
      level: input.level,
      event: input.event,
      payload: (input.payload || {}) as Prisma.InputJsonValue
    }
  });
}
