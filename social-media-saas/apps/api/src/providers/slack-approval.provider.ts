import { requiredEnv } from '../env';
import type { ApprovalProvider, ApprovalPoster } from './interfaces';
import { buildSlackApprovalPayload } from './slack-blocks';

export class SlackApprovalProvider implements ApprovalProvider {
  async sendForApproval(input: { runId: string; posters: ApprovalPoster[] }): Promise<{ messageTs: string }> {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${requiredEnv('SLACK_BOT_TOKEN')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildSlackApprovalPayload(input))
    });
    const result = (await response.json()) as { ok?: boolean; ts?: string; error?: string };
    if (!response.ok || !result.ok || !result.ts) {
      throw new Error(`Slack approval failed: ${result.error || response.statusText}`);
    }
    return { messageTs: result.ts };
  }
}
