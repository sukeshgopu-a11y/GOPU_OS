import type { Platform } from '../env';

export type GeneratedPost = {
  caption: string;
  hashtags: string[];
  imagePrompt: string;
};

export type ContentProviderInput = {
  productFocus: string;
  platform: Platform;
};

export interface ContentProvider {
  generatePost(input: ContentProviderInput): Promise<GeneratedPost>;
}

export interface ImageProvider {
  generate(prompt: string): Promise<{ imageBuffer: Buffer }>;
}

export interface PosterComposer {
  compose(input: { baseImage: Buffer; logoPath?: string }): Promise<Buffer>;
}

export interface StorageProvider {
  uploadPoster(input: { key: string; buffer: Buffer; contentType: string }): Promise<{ imageUrl: string }>;
}

export type ApprovalPoster = {
  platform: Platform;
  imageUrl: string;
  caption: string;
  hashtags: string[];
};

export interface ApprovalProvider {
  sendForApproval(input: { runId: string; posters: ApprovalPoster[] }): Promise<{ messageTs: string }>;
}

export interface PublishProvider {
  platform: Platform;
  publish(input: { imageUrl: string; caption: string }): Promise<{ externalPostId: string }>;
}
