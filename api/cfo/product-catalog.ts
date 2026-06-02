// @ts-nocheck
import {
  APEDA_SOURCE_URL,
  SPICE_BOARD_SOURCE_URL,
  apedaScheduledProductCategories,
  cfoExportProducts,
  marketPriceProducts,
  spiceBoardProducts
} from "../../lib/exportProductCatalog.mjs";

export const config = { api: { bodyParser: false } };

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "GET only" });
  }

  const liveMapped = marketPriceProducts.filter((product: any) => Boolean(product.agmarknet));
  const byGroup = marketPriceProducts.reduce((acc: Record<string, number>, product: any) => {
    acc[product.source_group] = (acc[product.source_group] || 0) + 1;
    return acc;
  }, {});

  return res.status(200).json({
    ok: true,
    source: {
      apeda: APEDA_SOURCE_URL,
      spiceBoard: SPICE_BOARD_SOURCE_URL
    },
    counts: {
      totalDropdownProducts: cfoExportProducts.length,
      cfoMarketRows: marketPriceProducts.length,
      spiceBoardScheduledSpices: spiceBoardProducts.length,
      apedaScheduledCategories: apedaScheduledProductCategories.length,
      liveAgmarknetMapped: liveMapped.length,
      referenceOrManualRequired: marketPriceProducts.length - liveMapped.length
    },
    byGroup,
    products: marketPriceProducts.map((product: any) => ({
      key: product.key,
      label: product.label,
      source_group: product.source_group,
      hs: product.hs,
      reference: product.reference,
      unit: product.unit,
      agmarknet: product.agmarknet,
      mandi: product.mandi,
      live_market_available: Boolean(product.agmarknet),
      note: product.note,
      source_reference: product.source_reference
    }))
  });
}
