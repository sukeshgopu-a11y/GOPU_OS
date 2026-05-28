import { optionalEnv, requiredEnv } from '../env';
import type { PublishProvider } from './interfaces';

export class InstagramPublisher implements PublishProvider {
  platform = 'instagram' as const;

  async publish(input: { imageUrl: string; caption: string }) {
    const version = optionalEnv('META_GRAPH_VERSION', 'v19.0');
    const igUserId = requiredEnv('META_IG_USER_ID');
    const token = requiredEnv('META_ACCESS_TOKEN');
    const mediaParams = new URLSearchParams({
      image_url: input.imageUrl,
      caption: input.caption,
      access_token: token
    });
    const media = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media`, {
      method: 'POST',
      body: mediaParams
    });
    const mediaResult = (await media.json()) as { id?: string; error?: { message?: string } };
    if (!media.ok || !mediaResult.id) {
      throw new Error(`Instagram media creation failed: ${mediaResult.error?.message || media.statusText}`);
    }

    const publishParams = new URLSearchParams({
      creation_id: mediaResult.id,
      access_token: token
    });
    const publish = await fetch(`https://graph.facebook.com/${version}/${igUserId}/media_publish`, {
      method: 'POST',
      body: publishParams
    });
    const publishResult = (await publish.json()) as { id?: string; error?: { message?: string } };
    if (!publish.ok || !publishResult.id) {
      throw new Error(`Instagram publish failed: ${publishResult.error?.message || publish.statusText}`);
    }
    return { externalPostId: publishResult.id };
  }
}
