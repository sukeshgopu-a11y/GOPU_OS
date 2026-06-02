export const APEDA_SOURCE_URL = "https://apeda.gov.in/product-categories";
export const SPICE_BOARD_SOURCE_URL = "https://www.indianspices.com/indianspices/right-to-information/particulars-its-organisation-functions-and-duties.html";

export const apedaScheduledProductCategories = Object.freeze([
  "Fruits, Vegetables and their Products",
  "Meat and Meat Products",
  "Poultry and Poultry Products",
  "Dairy Products",
  "Confectionery, Biscuits and Bakery Products",
  "Honey, Jaggery and Sugar Products",
  "Cocoa and its products, chocolates of all kinds",
  "Alcoholic and Non-Alcoholic Beverages",
  "Cereal and Cereal Products",
  "Groundnuts, Peanuts and Walnuts",
  "Pickles, Papads and Chutneys",
  "Guar Gum",
  "Floriculture and Floriculture Products",
  "Herbal and Medicinal Plants",
  "De-oiled Rice Bran",
  "Green Pepper in Brine",
  "Cashew Nuts and Its Products",
  "Basmati Rice",
  "Cashew Kernels",
  "Cashewnut Shell Liquid",
  "Cardanol",
  "Organic Products",
  "Sugar",
]);

export const apedaOperationalProducts = Object.freeze([
  "Alcoholic Beverages",
  "Non-Alcoholic Beverages",
  "Bakery Products",
  "Biscuits",
  "Cashew Nuts and Products",
  "Cereal and Cereal Products",
  "Chocolates",
  "Cocoa Products",
  "Dairy Products",
  "Floriculture Products",
  "Fresh Fruits",
  "Fresh Vegetables",
  "Groundnuts",
  "Honey",
  "Jaggery",
  "Medicinal Plants",
  "Meat Products",
  "Millets",
  "Peanuts",
  "Poultry Products",
  "Processed Fruit Products",
  "Processed Vegetable Products",
  "Rice",
  "Seeds",
  "Sugar Products",
  "Walnuts",
]);

export const spiceBoardProducts = Object.freeze([
  "Cardamom",
  "Pepper",
  "Chilli",
  "Ginger",
  "Turmeric",
  "Coriander",
  "Cumin",
  "Fennel",
  "Fenugreek",
  "Celery",
  "Aniseed",
  "Bishops Weed",
  "Caraway",
  "Dill",
  "Cinnamon",
  "Cassia",
  "Garlic",
  "Curry Leaf",
  "Kokam",
  "Mint",
  "Mustard",
  "Parsley",
  "Pomegranate Seed",
  "Saffron",
  "Vanilla",
  "Tejpat",
  "Long Pepper",
  "Star Anise",
  "Sweet Flag",
  "Greater Galanga",
  "Horse Radish",
  "Caper",
  "Clove",
  "Asafoetida",
  "Cambodge",
  "Hyssop",
  "Juniper Berry",
  "Bay Leaf",
  "Lovage",
  "Marjoram",
  "Nutmeg",
  "Mace",
  "Basil",
  "Poppy Seed",
  "Allspice",
  "Rosemary",
  "Sage",
  "Savory",
  "Thyme",
  "Oregano",
  "Tarragon",
  "Tamarind",
]);

export const spiceBoardOperationalAliases = Object.freeze([
  "Ajwain",
  "Ajowan",
  "Bayleaf",
  "Birds Eye Chilli",
  "Black Pepper",
  "Capsicum",
  "Cardamom Large",
  "Cardamom Small",
  "Coriander Seeds",
  "Cumin Seeds",
  "Fenugreek Seeds",
  "Guntur Red Chilli",
  "Mustard Seeds",
  "Nutmeg and Mace",
  "Paprika",
  "Red Chilli",
  "Red Chilli Powder",
  "Turmeric Powder",
]);

function uniqueSorted(items) {
  return Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export const cfoExportProducts = Object.freeze(uniqueSorted([
  ...spiceBoardProducts,
  ...spiceBoardOperationalAliases,
  ...apedaScheduledProductCategories,
  ...apedaOperationalProducts,
]));

export function productSlug(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const SPICE_SET = new Set([...spiceBoardProducts, ...spiceBoardOperationalAliases].map(productSlug));
const APEDA_SET = new Set([...apedaScheduledProductCategories, ...apedaOperationalProducts].map(productSlug));

const DEFAULT_REFERENCE_BY_GROUP = {
  "Spice Board": 150,
  APEDA: 110,
  "APEDA + Spice Board": 130,
};

const PRODUCT_OVERRIDES = {
  ajowan: { pricingKey: "ajwain", reference: 180, hs: "09109990", agmarknet: "Ajwan", mandi: "Neemuch", divisor: 100, source: "Neemuch Mandi reference", note: "Ajwain seed; verify oil content and cleanliness." },
  ajwain: { pricingKey: "ajwain", reference: 180, hs: "09109990", agmarknet: "Ajwan", mandi: "Neemuch", divisor: 100, source: "Neemuch Mandi reference", note: "Ajwain seed; verify oil content and cleanliness." },
  allspice: { reference: 720, hs: "09109990", source: "Spice Board reference", note: "Allspice; low liquidity item, verify current supplier quote." },
  aniseed: { reference: 155, hs: "09096139", agmarknet: "Aniseed", mandi: "Unjha", divisor: 100, source: "Unjha Mandi reference", note: "Aniseed; verify current crop quality." },
  asafoetida: { reference: 1850, hs: "13019013", source: "Spice Board reference", note: "Asafoetida; verify compound/pure grade before quote." },
  basil: { reference: 210, hs: "12119099", source: "Herbs reference", note: "Dried basil; verify leaf grade and moisture." },
  basmati_rice: { pricingKey: "rice", reference: 92, hs: "10063020", agmarknet: "Rice", mandi: "Karnal", divisor: 100, source: "Basmati rice mandi reference", note: "Basmati export grade; verify variety and crop year." },
  bay_leaf: { reference: 150, hs: "09109990", source: "Spice Board reference", note: "Bay leaf/tejpat; verify leaf grade." },
  bayleaf: { pricingKey: "bay_leaf", reference: 150, hs: "09109990", source: "Spice Board reference", note: "Bay leaf/tejpat; verify leaf grade." },
  birds_eye_chilli: { pricingKey: "chilli", reference: 265, hs: "09042110", agmarknet: "Chilli", mandi: "Guntur", divisor: 100, source: "Guntur Mandi reference", note: "Birds eye chilli; verify SHU and moisture." },
  black_pepper: { pricingKey: "pepper", reference: 680, hs: "09041100", agmarknet: "Black pepper", mandi: "Kochi", divisor: 100, source: "Kochi pepper reference", note: "Black pepper; verify grade, garbling and density." },
  cambodge: { reference: 230, hs: "09109990", source: "Spice Board reference", note: "Cambodge/kokam; verify dried rind grade." },
  caper: { reference: 950, hs: "07119090", source: "Spice Board reference", note: "Caper; verify brined/dried specification." },
  capsicum: { reference: 95, hs: "07096010", agmarknet: "Capsicum", mandi: "Bangalore", divisor: 100, source: "Bangalore Mandi reference", note: "Fresh capsicum; cold-chain rate varies daily." },
  caraway: { reference: 390, hs: "09096190", source: "Spice Board reference", note: "Caraway seed; verify volatile oil content." },
  cardamom: { pricingKey: "cardamom", reference: 2200, hs: "09083110", agmarknet: "Cardamoms", mandi: "Kumily", divisor: 1, source: "Spice Board auction reference", note: "Green cardamom; verify auction average and size grade." },
  cardamom_large: { pricingKey: "cardamom", reference: 980, hs: "09083120", agmarknet: "Cardamoms", mandi: "Gangtok", divisor: 1, source: "Large cardamom reference", note: "Large cardamom; verify origin and size grade." },
  cardamom_small: { pricingKey: "cardamom", reference: 2200, hs: "09083110", agmarknet: "Cardamoms", mandi: "Kumily", divisor: 1, source: "Small cardamom auction reference", note: "Small cardamom; verify auction average and size grade." },
  cashew_kernels: { reference: 705, hs: "08013220", source: "Cashew kernel reference", note: "Cashew kernels; verify W grade, broken percentage and crop." },
  cashew_nuts_and_its_products: { pricingKey: "cashew_kernels", reference: 650, hs: "08013200", source: "APEDA cashew reference", note: "Cashew product category; select grade before quote." },
  cashew_nuts_and_products: { pricingKey: "cashew_kernels", reference: 650, hs: "08013200", source: "APEDA cashew reference", note: "Cashew product category; select grade before quote." },
  cashewnut_shell_liquid: { reference: 62, hs: "13021919", source: "CNSL reference", note: "Cashewnut shell liquid; verify technical specification." },
  cardanol: { reference: 78, hs: "29072990", source: "Cardanol reference", note: "Cardanol; verify industrial grade specification." },
  cassia: { pricingKey: "cinnamon", reference: 245, hs: "09061910", source: "Cassia reference", note: "Cassia; verify stick/cut grade and origin." },
  celery: { reference: 210, hs: "09099990", agmarknet: "Celery", mandi: "Neemuch", divisor: 100, source: "Neemuch Mandi reference", note: "Celery seed; verify current crop quality." },
  chilli: { pricingKey: "chilli", reference: 120, hs: "09042110", agmarknet: "Chilli", mandi: "Guntur", divisor: 100, source: "Guntur Mandi reference", note: "Dry red chilli; verify grade, ASTA/SHU and stem percentage." },
  cinnamon: { pricingKey: "cinnamon", reference: 320, hs: "09061000", source: "Kochi market reference", note: "Cinnamon; verify quill/cut grade and oil content." },
  clove: { pricingKey: "clove", reference: 820, hs: "09072000", source: "Kochi market reference", note: "Whole clove; verify headless percentage and moisture." },
  cocoa_products: { reference: 420, hs: "18050000", source: "Cocoa products reference", note: "Cocoa products; verify powder/butter/liquor grade." },
  chocolates: { reference: 360, hs: "18069010", source: "Processed foods reference", note: "Chocolate products; quote by recipe and pack format." },
  coriander: { pricingKey: "coriander", reference: 90, hs: "09092100", agmarknet: "Coriander", mandi: "Kota", divisor: 100, source: "Kota Mandi reference", note: "Coriander seed; verify split/whole grade." },
  coriander_seeds: { pricingKey: "coriander", reference: 90, hs: "09092100", agmarknet: "Coriander", mandi: "Kota", divisor: 100, source: "Kota Mandi reference", note: "Coriander seed; verify split/whole grade." },
  cumin: { pricingKey: "cumin", reference: 250, hs: "09093100", agmarknet: "Cummin Seed(Jeera)", mandi: "Unjha", divisor: 100, source: "Unjha Mandi reference", note: "Cumin/jeera; verify Europe/Singapore quality." },
  cumin_seeds: { pricingKey: "cumin", reference: 250, hs: "09093100", agmarknet: "Cummin Seed(Jeera)", mandi: "Unjha", divisor: 100, source: "Unjha Mandi reference", note: "Cumin/jeera; verify Europe/Singapore quality." },
  curry_leaf: { reference: 135, hs: "12119099", source: "Spice Board reference", note: "Dried curry leaf; verify leaf grade and moisture." },
  dairy_products: { reference: 310, hs: "04022100", source: "APEDA dairy reference", note: "Dairy category; verify product, fat percentage and cold-chain." },
  de_oiled_rice_bran: { reference: 22, hs: "23024000", source: "Rice bran reference", note: "De-oiled rice bran; verify protein/oil residue." },
  dill: { reference: 150, hs: "09099990", agmarknet: "Dill Seed", mandi: "Unjha", divisor: 100, source: "Unjha Mandi reference", note: "Dill seed; verify current crop quality." },
  fennel: { reference: 145, hs: "09096133", agmarknet: "Fennel", mandi: "Unjha", divisor: 100, source: "Unjha Mandi reference", note: "Fennel seed; verify bold/small grade." },
  fenugreek: { pricingKey: "fenugreek", reference: 75, hs: "09109912", agmarknet: "Fenugreek", mandi: "Rajkot", divisor: 100, source: "Rajkot Mandi reference", note: "Fenugreek/methi seed; verify cleaned grade." },
  fenugreek_seeds: { pricingKey: "fenugreek", reference: 75, hs: "09109912", agmarknet: "Fenugreek", mandi: "Rajkot", divisor: 100, source: "Rajkot Mandi reference", note: "Fenugreek/methi seed; verify cleaned grade." },
  fresh_fruits: { reference: 82, hs: "08045000", source: "APEDA fruits reference", note: "Fresh fruits category; quote by fruit, grade, season and cold-chain." },
  fresh_vegetables: { reference: 45, hs: "07099990", source: "APEDA vegetables reference", note: "Fresh vegetables category; quote by vegetable, pack and season." },
  garlic: { pricingKey: "garlic", reference: 32, hs: "07032000", agmarknet: "Garlic", mandi: "Indore", divisor: 100, source: "Indore Mandi reference", note: "Garlic; verify bulb size and crop." },
  ginger: { pricingKey: "ginger", reference: 165, hs: "09101110", agmarknet: "Ginger", mandi: "Kochi", divisor: 100, source: "Kochi Mandi reference", note: "Dry/fresh ginger; verify form and moisture." },
  green_pepper_in_brine: { pricingKey: "pepper", reference: 210, hs: "09041190", source: "APEDA green pepper reference", note: "Green pepper in brine; verify drained weight and brine strength." },
  groundnuts: { pricingKey: "groundnut", reference: 92, hs: "12024210", agmarknet: "Groundnut", mandi: "Rajkot", divisor: 100, source: "Rajkot Mandi reference", note: "Groundnut; verify count, aflatoxin and shell/without shell." },
  groundnuts_peanuts_and_walnuts: { pricingKey: "groundnut", reference: 120, hs: "12024210", source: "APEDA nut category reference", note: "Nut category; select product and grade before quote." },
  guar_gum: { reference: 125, hs: "13023230", agmarknet: "Guar", mandi: "Jodhpur", divisor: 100, source: "Jodhpur Mandi reference", note: "Guar gum; verify viscosity and mesh." },
  guntur_red_chilli: { pricingKey: "chilli", reference: 132, hs: "09042110", agmarknet: "Chilli", mandi: "Guntur", divisor: 100, source: "Guntur Mandi reference", note: "Guntur red chilli; verify S4/Teja grade, ASTA and moisture." },
  honey: { reference: 165, hs: "04090000", source: "APEDA honey reference", note: "Honey; verify floral source, HMF and antibiotics tests." },
  horse_radish: { reference: 240, hs: "12119099", source: "Spice Board reference", note: "Horse radish; verify dried/fresh specification." },
  jaggery: { reference: 58, hs: "17011310", agmarknet: "Gur(Jaggery)", mandi: "Muzaffarnagar", divisor: 100, source: "Muzaffarnagar Mandi reference", note: "Jaggery; verify block/powder grade." },
  kokam: { reference: 230, hs: "09109990", source: "Spice Board reference", note: "Kokam/cambodge; verify dried rind grade." },
  long_pepper: { reference: 780, hs: "09041190", source: "Spice Board reference", note: "Long pepper; low liquidity item, verify supplier quote." },
  mace: { reference: 1650, hs: "09082100", source: "Spice Board reference", note: "Mace; verify blade grade and moisture." },
  meat_products: { reference: 310, hs: "02023000", source: "APEDA meat reference", note: "Meat category; quote by cut, cold-chain and importing country approvals." },
  millets: { reference: 48, hs: "10082920", agmarknet: "Millets", mandi: "Bangalore", divisor: 100, source: "Millet mandi reference", note: "Millets; verify variety and cleaning grade." },
  mustard: { pricingKey: "mustard", reference: 65, hs: "12075090", agmarknet: "Mustard", mandi: "Jaipur", divisor: 100, source: "Jaipur Mandi reference", note: "Mustard seed; verify yellow/black grade." },
  mustard_seeds: { pricingKey: "mustard", reference: 65, hs: "12075090", agmarknet: "Mustard", mandi: "Jaipur", divisor: 100, source: "Jaipur Mandi reference", note: "Mustard seed; verify yellow/black grade." },
  nutmeg: { reference: 720, hs: "09081110", source: "Spice Board reference", note: "Nutmeg; verify with/without shell and aflatoxin." },
  nutmeg_and_mace: { pricingKey: "nutmeg", reference: 940, hs: "09081110", source: "Spice Board reference", note: "Nutmeg and mace category; quote separately by grade." },
  organic_products: { reference: 145, hs: "09103010", source: "APEDA organic category reference", note: "Organic category; verify NPOP/transaction certificate and product." },
  paprika: { pricingKey: "chilli", reference: 180, hs: "09042211", source: "Paprika reference", note: "Paprika/chilli powder; verify ASTA color value." },
  peanuts: { pricingKey: "groundnut", reference: 92, hs: "12024210", agmarknet: "Groundnut", mandi: "Rajkot", divisor: 100, source: "Rajkot Mandi reference", note: "Peanuts/groundnut; verify count and aflatoxin." },
  pepper: { pricingKey: "pepper", reference: 680, hs: "09041100", agmarknet: "Black pepper", mandi: "Kochi", divisor: 100, source: "Kochi pepper reference", note: "Pepper; verify grade, garbling and density." },
  pickles_papads_and_chutneys: { reference: 115, hs: "20019000", source: "APEDA processed food reference", note: "Processed foods; quote by recipe, pack size and shelf life." },
  poppy_seed: { reference: 1250, hs: "12079100", source: "Spice Board reference", note: "Poppy seed; verify import/export restrictions and certificate needs." },
  pomegranate_seed: { reference: 470, hs: "08134090", source: "Spice Board reference", note: "Anardana; verify whole/powder grade." },
  poultry_products: { reference: 190, hs: "02071400", source: "APEDA poultry reference", note: "Poultry category; verify frozen/chilled and country approvals." },
  red_chilli: { pricingKey: "chilli", reference: 120, hs: "09042110", agmarknet: "Chilli", mandi: "Guntur", divisor: 100, source: "Guntur Mandi reference", note: "Dry red chilli; verify grade, ASTA/SHU and stem percentage." },
  red_chilli_powder: { pricingKey: "chilli", reference: 145, hs: "09042211", source: "Guntur chilli powder reference", note: "Red chilli powder; verify ASTA, SHU, moisture and mesh." },
  rice: { pricingKey: "rice", reference: 68, hs: "10063000", agmarknet: "Rice", mandi: "Nizamabad", divisor: 100, source: "Rice mandi reference", note: "Rice; verify basmati/non-basmati variety and broken percentage." },
  saffron: { reference: 195000, hs: "09102020", source: "Spice Board reference", note: "Saffron; quote only after supplier certificate and lab confirmation." },
  star_anise: { reference: 620, hs: "09096149", source: "Spice Board reference", note: "Star anise; verify whole/broken grade." },
  sugar: { pricingKey: "sugar", reference: 42, hs: "17019990", agmarknet: "Sugar", mandi: "Mumbai", divisor: 100, source: "Sugar market reference", note: "Sugar; verify grade, quota/regulatory position and packing." },
  sugar_products: { pricingKey: "sugar", reference: 52, hs: "17019990", source: "APEDA sugar products reference", note: "Sugar products; select product and pack before quote." },
  tamarind: { reference: 125, hs: "08134010", agmarknet: "Tamarind Fruit", mandi: "Hyderabad", divisor: 100, source: "Hyderabad Mandi reference", note: "Tamarind; verify seedless/with seed and moisture." },
  tejpat: { pricingKey: "bay_leaf", reference: 150, hs: "09109990", source: "Spice Board reference", note: "Tejpat/bay leaf; verify leaf grade." },
  turmeric: { pricingKey: "turmeric", reference: 148, hs: "09103010", agmarknet: "Turmeric", mandi: "Nizamabad", divisor: 100, source: "Nizamabad Mandi reference", note: "Turmeric; verify finger/powder, curcumin and moisture." },
  turmeric_powder: { pricingKey: "turmeric", reference: 165, hs: "09103030", source: "Turmeric powder reference", note: "Turmeric powder; verify curcumin, mesh and moisture." },
  vanilla: { reference: 11500, hs: "09051000", source: "Spice Board reference", note: "Vanilla; verify beans/extract grade and origin." },
  walnuts: { reference: 760, hs: "08023100", source: "APEDA walnut reference", note: "Walnuts; verify kernel/inshell grade and crop." },
};

function productGroup(label) {
  const key = productSlug(label);
  const spice = SPICE_SET.has(key);
  const apeda = APEDA_SET.has(key);
  if (spice && apeda) return "APEDA + Spice Board";
  if (spice) return "Spice Board";
  return "APEDA";
}

function profileFor(label) {
  const key = productSlug(label);
  const sourceGroup = productGroup(label);
  const override = PRODUCT_OVERRIDES[key] || {};
  const reference = override.reference ?? DEFAULT_REFERENCE_BY_GROUP[sourceGroup] ?? 110;
  const source = override.source || `${sourceGroup} reference`;
  return {
    key,
    label,
    pricing_key: override.pricingKey || key,
    source_group: sourceGroup,
    unit: "kg",
    hs: override.hs || "",
    reference,
    mandi: override.mandi || source,
    agmarknet: override.agmarknet || null,
    divisor: override.divisor || 100,
    source,
    note: override.note || `${sourceGroup} product/category. Verify exact grade, supplier quote and live market before final quote.`,
    product_grade: override.productGrade || "Commercial export grade",
    market_location: override.mandi || source,
    source_reference: override.sourceReference || (override.agmarknet ? "data.gov.in Agmarknet API" : `${sourceGroup} catalog reference`),
  };
}

export const marketPriceProducts = Object.freeze(cfoExportProducts.map(profileFor));

const marketFallbackEntries = marketPriceProducts.map((product) => [
  product.key,
  {
    price: product.reference,
    source: product.source,
    note: product.note,
    label: product.label,
    product_label: product.label,
    hs: product.hs,
    unit: product.unit,
    source_group: product.source_group,
    product_grade: product.product_grade,
    market_location: product.market_location,
    price_source_reference: product.source_reference,
  },
]);
marketFallbackEntries.push([
  "default",
  {
    price: 115,
    source: "Generic commodity estimate",
    note: "No product-specific market rate is available. CFO must verify manually before quote.",
    label: "Default Export Product",
    product_label: "Default Export Product",
    hs: "",
    unit: "kg",
    source_group: "Reference",
    product_grade: "Commercial export grade",
    market_location: "Manual market entry",
    price_source_reference: "GOPU reference fallback",
  },
]);

export const marketPriceFallbacks = Object.freeze(Object.fromEntries(marketFallbackEntries));

const PROFILE_BY_KEY = Object.freeze(Object.fromEntries(marketPriceProducts.map((product) => [product.key, product])));
const PROFILE_KEY_BY_LABEL = Object.freeze(Object.fromEntries(marketPriceProducts.map((product) => [productSlug(product.label), product.key])));

const PRODUCT_KEY_ALIASES = Object.freeze({
  ajowan: "ajwain",
  bishops_weed: "ajwain",
  black_pepper: "pepper",
  bayleaf: "bay_leaf",
  cardamom_large: "cardamom",
  cardamom_small: "cardamom",
  coriander_seed: "coriander",
  coriander_seeds: "coriander",
  cummin_seed_jeera: "cumin",
  cumin_seed: "cumin",
  cumin_seeds: "cumin",
  guntur_red_chilli: "chilli",
  red_chilli: "chilli",
  red_chili: "chilli",
  red_chilli_powder: "chilli",
  red_chili_powder: "chilli",
  turmeric_powder: "turmeric",
  fenugreek_seed: "fenugreek",
  fenugreek_seeds: "fenugreek",
  mustard_seed: "mustard",
  mustard_seeds: "mustard",
  nutmeg_and_mace: "nutmeg",
  basmati_rice: "rice",
  non_basmati_rice: "rice",
  cereal_and_cereal_products: "rice",
  cereals: "rice",
  groundnuts: "groundnut",
  peanuts: "groundnut",
  groundnuts_peanuts_and_walnuts: "groundnut",
  green_pepper_in_brine: "pepper",
  sugar_products: "sugar",
});

export function resolveMarketProductKey(name) {
  const key = productSlug(name);
  if (!key) return "default";
  return PROFILE_KEY_BY_LABEL[key] || PROFILE_BY_KEY[key]?.key || key;
}

export function resolvePricingProductKey(name) {
  const exactKey = resolveMarketProductKey(name);
  const alias = PRODUCT_KEY_ALIASES[exactKey] || PRODUCT_KEY_ALIASES[productSlug(name)];
  if (alias) return alias;
  return PROFILE_BY_KEY[exactKey]?.pricing_key || exactKey || "default";
}

export function resolvePricingProductKeys(name) {
  const exactKey = resolveMarketProductKey(name);
  const pricingKey = resolvePricingProductKey(name);
  return Array.from(new Set([exactKey, pricingKey, "default"].filter(Boolean)));
}

export function getMarketProductProfile(name) {
  const key = resolveMarketProductKey(name);
  return PROFILE_BY_KEY[key] || null;
}
