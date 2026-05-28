import { optionalEnv, requiredEnv } from '../env';
import type { PublishProvider } from './interfaces';

export class FacebookPublisher implements PublishProvider {
  platform = 'facebook' as const;

  async publish(input: { imageUrl: string; caption: string }) {
    const version = optionalEnv('META_GRAPH_VERSION', 'v19.0');
    const pageId = requiredEnv('META_FACEBOOK_PAGE_ID');
    const token = requiredEnv('META_ACCESS_TOKEN');
    const params = new URLSearchParams({
      url: input.imageUrl,
      caption: input.caption,
      published: 'true',
      access_token: token
    });
    const response = await fetch(`https://graph.facebook.com/${version}/${pageId}/photos`, {
      method: 'POST',
      body: params
    });
    const result = (await response.json()) as { id?: string; post_id?: string; error?: { message?: string } };
    if (!response.ok || !(result.post_id || result.id)) {
      throw new Error(`Facebook publish failed: ${result.error?.message || response.statusText}`);
    }
    return { externalPostId: result.post_id || result.id || '' };
  }
}
