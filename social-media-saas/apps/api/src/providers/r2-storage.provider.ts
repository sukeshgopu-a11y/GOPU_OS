import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { requiredEnv } from '../env';
import type { StorageProvider } from './interfaces';

export class R2StorageProvider implements StorageProvider {
  private readonly bucket = requiredEnv('R2_BUCKET');
  private readonly publicBaseUrl = requiredEnv('R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  private readonly client = new S3Client({
    region: 'auto',
    endpoint: requiredEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requiredEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('R2_SECRET_ACCESS_KEY')
    }
  });

  async uploadPoster(input: { key: string; buffer: Buffer; contentType: string }) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      })
    );
    return { imageUrl: `${this.publicBaseUrl}/${input.key}` };
  }
}
