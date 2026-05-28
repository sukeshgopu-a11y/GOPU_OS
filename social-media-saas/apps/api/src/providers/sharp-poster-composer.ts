import fs from 'node:fs/promises';
import sharp from 'sharp';
import type { PosterComposer } from './interfaces';

async function loadLogo(logoPath?: string) {
  if (logoPath) {
    try {
      return await fs.readFile(logoPath);
    } catch {
      // Fall through to local generated mark so the slice can boot without a supplied asset.
    }
  }

  return sharp({
    create: {
      width: 260,
      height: 90,
      channels: 4,
      background: { r: 3, g: 20, b: 32, alpha: 0.72 }
    }
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="260" height="90" viewBox="0 0 260 90" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="256" height="86" rx="18" fill="none" stroke="#22d3ee" stroke-width="3"/>
            <text x="130" y="56" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" fill="#e5faff">GOPU</text>
          </svg>`
        )
      }
    ])
    .png()
    .toBuffer();
}

export class SharpPosterComposer implements PosterComposer {
  async compose({ baseImage, logoPath }: { baseImage: Buffer; logoPath?: string }): Promise<Buffer> {
    const logo = await sharp(await loadLogo(logoPath)).resize({ width: 220, withoutEnlargement: true }).png().toBuffer();
    return sharp(baseImage)
      .resize(1080, 1080, { fit: 'cover' })
      .composite([{ input: logo, gravity: 'southeast', left: 820, top: 940 }])
      .png()
      .toBuffer();
  }
}
