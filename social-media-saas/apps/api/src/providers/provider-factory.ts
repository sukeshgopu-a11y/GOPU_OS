import { optionalEnv } from '../env';
import { FacebookPublisher } from './meta-facebook.publisher';
import { InstagramPublisher } from './meta-instagram.publisher';
import { LinkedInPublisher } from './linkedin.publisher';
import { OpenAiContentProvider } from './openai-content.provider';
import { OpenAiImageProvider } from './openai-image.provider';
import { R2StorageProvider } from './r2-storage.provider';
import { SharpPosterComposer } from './sharp-poster-composer';
import { SlackApprovalProvider } from './slack-approval.provider';
import type { Platform } from '../env';
import type { PublishProvider } from './interfaces';

export function contentProvider() {
  return new OpenAiContentProvider();
}

export function imageProvider() {
  const provider = optionalEnv('IMAGE_PROVIDER', 'openai');
  if (provider !== 'openai') throw new Error(`Unsupported IMAGE_PROVIDER: ${provider}`);
  return new OpenAiImageProvider();
}

export function posterComposer() {
  return new SharpPosterComposer();
}

export function storageProvider() {
  return new R2StorageProvider();
}

export function approvalProvider() {
  return new SlackApprovalProvider();
}

export function publisherFor(platform: Platform): PublishProvider {
  if (platform === 'instagram') return new InstagramPublisher();
  if (platform === 'facebook') return new FacebookPublisher();
  return new LinkedInPublisher();
}
