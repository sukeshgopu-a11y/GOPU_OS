import { boolEnv, requiredEnv } from '../env';
import type { PublishProvider } from './interfaces';

type RegisterUploadResponse = {
  value?: {
    asset?: string;
    uploadMechanism?: {
      'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'?: {
        uploadUrl?: string;
      };
    };
  };
};

export class LinkedInPublisher implements PublishProvider {
  platform = 'linkedin' as const;

  async publish(input: { imageUrl: string; caption: string }) {
    if (!boolEnv('LINKEDIN_ENABLED', false)) {
      throw new Error('LinkedIn publishing is disabled by LINKEDIN_ENABLED=false.');
    }

    const accessToken = requiredEnv('LINKEDIN_ACCESS_TOKEN');
    const owner = requiredEnv('LINKEDIN_OWNER_URN');
    const register = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        registerUploadRequest: {
          recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
          owner,
          serviceRelationships: [{ relationshipType: 'OWNER', identifier: 'urn:li:userGeneratedContent' }]
        }
      })
    });
    const registerResult = (await register.json()) as RegisterUploadResponse;
    const uploadUrl = registerResult.value?.uploadMechanism?.['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']?.uploadUrl;
    const asset = registerResult.value?.asset;
    if (!register.ok || !uploadUrl || !asset) throw new Error('LinkedIn upload registration failed.');

    const image = await fetch(input.imageUrl);
    if (!image.ok) throw new Error('LinkedIn could not read poster image URL.');
    const upload = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: Buffer.from(await image.arrayBuffer())
    });
    if (!upload.ok) throw new Error(`LinkedIn image upload failed: ${upload.statusText}`);

    const create = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: owner,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: input.caption },
            shareMediaCategory: 'IMAGE',
            media: [{ status: 'READY', media: asset }]
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      })
    });
    const postId = create.headers.get('x-restli-id');
    if (!create.ok || !postId) throw new Error(`LinkedIn publish failed: ${create.statusText}`);
    return { externalPostId: postId };
  }
}
