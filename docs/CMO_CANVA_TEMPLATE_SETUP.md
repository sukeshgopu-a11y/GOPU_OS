# CMO Canva Template Setup

GOPU OS CMO requires Canva Connect API brand templates for final social graphics. AI may generate only:

- Headline
- Slide content
- Caption
- Hashtags

Canva must render all visible creative text, the GOPU EXPORTS logo, `www.gopuexports.com`, `GOPU Exports`, and brand colors.

## Required Brand Templates

Create and publish these Canva brand templates with autofill fields:

- Knowledge Carousel
- Shipment Announcement
- Market Update
- Product Spotlight
- Buyer Education

Each template should be `1080 x 1350` and use:

- Navy Blue: `#0D2A4A`
- Gold: `#D4AF37`
- White: `#FFFFFF`

## Suggested Autofill Fields

Use these field names so GOPU OS can fill the template automatically:

- `headline`
- `slide_1_heading`
- `slide_1_body`
- `slide_2_heading`
- `slide_2_body`
- `slide_3_heading`
- `slide_3_body`
- `slide_4_heading`
- `slide_4_body`
- `slide_5_heading`
- `slide_5_body`
- `caption`
- `hashtags`
- `website`
- `linkedin_page_name`
- `company_name`
- `tagline`
- `logo`

The `logo` field must be an image field. Store the uploaded Canva asset ID in `CANVA_GOPU_LOGO_ASSET_ID`.

## Configuration

Set the template IDs in environment variables or in `platform_integrations.config.templates` for the `canva` row:

- `CANVA_TEMPLATE_KNOWLEDGE_CAROUSEL_ID`
- `CANVA_TEMPLATE_SHIPMENT_ANNOUNCEMENT_ID`
- `CANVA_TEMPLATE_MARKET_UPDATE_ID`
- `CANVA_TEMPLATE_PRODUCT_SPOTLIGHT_ID`
- `CANVA_TEMPLATE_BUYER_EDUCATION_ID`

Set the Canva access token server-side:

- `CANVA_ACCESS_TOKEN`
- or `CTO_PROVIDER_CANVA_ACCESS_TOKEN`

Do not expose Canva tokens as `VITE_*` variables.
