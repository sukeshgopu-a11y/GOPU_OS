import assert from "node:assert/strict";
import {
  buildCmoCanvaAutofillData,
  extractCanvaSlides,
  getCmoCanvaConfig,
  missingCanvaConfiguration,
  selectCmoCanvaTemplateType,
  validateCmoCanvaBeforePublish
} from "../lib/cmoCanvaWorkflow.mjs";

process.env.CMO_CANVA_REQUIRED = "true";
process.env.CANVA_TEMPLATE_KNOWLEDGE_CAROUSEL_ID = "BTM_KNOWLEDGE";
process.env.CANVA_TEMPLATE_SHIPMENT_ANNOUNCEMENT_ID = "BTM_SHIPMENT";
process.env.CANVA_TEMPLATE_MARKET_UPDATE_ID = "BTM_MARKET";
process.env.CANVA_TEMPLATE_PRODUCT_SPOTLIGHT_ID = "BTM_PRODUCT";
process.env.CANVA_TEMPLATE_BUYER_EDUCATION_ID = "BTM_BUYER";
process.env.CANVA_GOPU_LOGO_ASSET_ID = "MsdGopuLogo";
process.env.CANVA_ACCESS_TOKEN = "test-token";

const row = {
  id: "content-1",
  run_id: "canva-test-1",
  platform: "LinkedIn",
  topic: "FOB vs CIF: What Spice Importers Should Confirm",
  caption: [
    "FOB vs CIF is not just a pricing choice.",
    "",
    "1. Price Responsibility",
    "FOB covers seller delivery to Indian port; CIF includes freight and insurance.",
    "",
    "2. Risk Transfer",
    "Risk usually moves when cargo is loaded on vessel.",
    "",
    "3. Document Match",
    "Invoice, packing list, B/L, COA, and insurance certificate must match buyer specs.",
    "",
    "#GOPUExports #ExportBusiness #InternationalTrade"
  ].join("\n"),
  hashtags: ["#GOPUExports", "#ExportBusiness", "#InternationalTrade"],
  metadata: {}
};

const slides = extractCanvaSlides(row);
assert.equal(slides.length, 3);
assert.equal(slides[0].heading, "Price Responsibility");

assert.equal(selectCmoCanvaTemplateType(row), "buyer_education");

const dataset = {
  headline: { type: "text" },
  slide_1_heading: { type: "text" },
  slide_1_body: { type: "text" },
  slide_2_heading: { type: "text" },
  slide_2_body: { type: "text" },
  website: { type: "text" },
  linkedin_page_name: { type: "text" },
  company_name: { type: "text" },
  logo: { type: "image" },
  hashtags: { type: "text" }
};

const config = await getCmoCanvaConfig();
assert.deepEqual(missingCanvaConfiguration(config), []);

const autofill = buildCmoCanvaAutofillData(row, dataset, config);
assert.equal(autofill.data.headline.text, row.topic);
assert.equal(autofill.data.slide_1_heading.text, "Price Responsibility");
assert.match(autofill.data.slide_1_body.text, /FOB covers seller/);
assert.equal(autofill.data.website.text, "www.gopuexports.com");
assert.equal(autofill.data.linkedin_page_name.text, "GOPU Exports");
assert.equal(autofill.data.company_name.text, "GOPU EXPORTS");
assert.equal(autofill.data.logo.asset_id, "MsdGopuLogo");
assert.match(autofill.data.hashtags.text, /#GOPUExports/);

const blocked = validateCmoCanvaBeforePublish(row);
assert.equal(blocked.ok, false);
assert.equal(blocked.status, "missing_canva_design");

const publishable = validateCmoCanvaBeforePublish({
  ...row,
  poster_url: "https://cdn.example.com/canva.png",
  metadata: { canva: { ok: true, provider: "canva" } }
});
assert.equal(publishable.ok, true);

console.log(JSON.stringify({
  ok: true,
  status: "passed",
  slides: slides.length,
  template_type: selectCmoCanvaTemplateType(row),
  canva_publish_guard: "enforced"
}, null, 2));
