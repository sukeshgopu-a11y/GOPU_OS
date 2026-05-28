import { getApprovalQueue } from './approvalService.js';
import { getTasks } from './taskService.js';
import { demoTenantId } from './demoData.js';

function wait() {
  return Promise.resolve();
}

export async function getFounderMobileCommandData(tenantId = demoTenantId) {
  await wait();
  const [approvalResponse, taskResponse] = await Promise.all([
    getApprovalQueue(tenantId),
    getTasks(tenantId)
  ]);
  const approvals = approvalResponse.data || [];
  const tasks = taskResponse.data || [];
  const blockedTasks = tasks.filter((task) => ['Blocked', 'Escalated', 'Waiting Founder Approval'].includes(task.status));
  const dueTasks = tasks.filter((task) => String(task.due_date || '').toLowerCase().includes('today') || String(task.due_date || '').toLowerCase().includes('overdue'));
  return {
    data: {
      approvals,
      tasks,
      blockedTasks,
      dueTasks,
      risks: [],
      shipments: [],
      payments: [],
      executiveSummaries: [],
      briefingPlan: [],
      counts: {
        approvals: approvals.length,
        blocked: blockedTasks.length,
        risks: 0,
        payments: 0,
        shipments: 0
      }
    },
    error: null
  };
}
