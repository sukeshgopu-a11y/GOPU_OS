import OpenAI from 'openai';
import { optionalEnv, requiredEnv } from '../env';
import type { ContentProvider, ContentProviderInput, GeneratedPost } from './interfaces';

export class OpenAiContentProvider implements ContentProvider {
  private readonly client = new OpenAI({ apiKey: requiredEnv('OPENAI_API_KEY') });

  async generatePost({ productFocus, platform }: ContentProviderInput): Promise<GeneratedPost> {
    const completion = await this.client.chat.completions.create({
      model: optionalEnv('OPENAI_CONTENT_MODEL', 'gpt-4o-mini'),
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a senior export-industry content strategist. Generate concise, trustworthy social content for importers and business buyers. Return JSON only.'
        },
        {
          role: 'user',
          content: JSON.stringify({
            platform,
            productFocus,
            requiredShape: {
              caption: 'human, professional, buyer-trust oriented caption',
              hashtags: ['5 to 10 hashtags'],
              imagePrompt: 'poster image prompt, premium export-business visual, no fake claims'
            }
          })
        }
      ]
    });

    const raw = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(raw) as Partial<GeneratedPost>;
    return {
      caption: String(parsed.caption || '').trim(),
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.map(String).slice(0, 10) : [],
      imagePrompt: String(parsed.imagePrompt || `${productFocus} premium export business poster`).trim()
    };
  }
}
