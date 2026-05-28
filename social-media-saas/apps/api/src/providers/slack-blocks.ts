import type { ApprovalPoster } from './interfaces';

function truncate(value: string, length = 2800) {
  return value.length > length ? `${value.slice(0, length - 1)}…` : value;
}

export function buildSlackApprovalPayload(input: { runId: string; posters: ApprovalPoster[] }) {
  const firstPoster = input.posters[0];
  return {
    channel: process.env.SLACK_CHANNEL_ID,
    text: `Approval required for campaign run ${input.runId}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: 'GOPU Daily Content Approval' }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Run:* ${input.runId}\n*Status:* Awaiting approval\nReview the poster, captions, and hashtags before publishing.`
        }
      },
      firstPoster?.imageUrl
        ? {
            type: 'image',
            image_url: firstPoster.imageUrl,
            alt_text: 'Generated social poster preview'
          }
        : null,
      ...input.posters.flatMap((poster) => [
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${poster.platform.toUpperCase()}*\n${truncate(poster.caption)}\n\n${poster.hashtags.join(' ')}`
          }
        }
      ]),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Approve' },
            style: 'primary',
            value: `approve:${input.runId}`,
            action_id: 'approve_run'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Reject' },
            style: 'danger',
            value: `reject:${input.runId}`,
            action_id: 'reject_run'
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Request Changes' },
            value: `request_changes:${input.runId}`,
            action_id: 'request_changes_run'
          }
        ]
      }
    ].filter(Boolean)
  };
}
