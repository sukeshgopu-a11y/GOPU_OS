import OpenAI from 'openai';
import { optionalEnv, requiredEnv } from '../env';
import type { ImageProvider } from './interfaces';

export class OpenAiImageProvider implements ImageProvider {
  private readonly client = new OpenAI({ apiKey: requiredEnv('OPENAI_API_KEY') });

  async generate(prompt: string): Promise<{ imageBuffer: Buffer }> {
    const response = await this.client.images.generate({
      model: optionalEnv('OPENAI_IMAGE_MODEL', 'gpt-image-1'),
      prompt,
      size: '1024x1024',
      response_format: 'b64_json'
    } as OpenAI.Images.ImageGenerateParams);
    const encoded = response.data?.[0]?.b64_json;
    if (!encoded) throw new Error('Image provider did not return image data.');
    return { imageBuffer: Buffer.from(encoded, 'base64') };
  }
}
