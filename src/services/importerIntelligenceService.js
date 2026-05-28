import { isSupabaseConfigured, requireSupabase } from '../lib/supabaseClient.js';
import { demoTenantId } from './demoData.js';

const serviceDelay = 0;

function wait() {
  return new Promise((resolve) => setTimeout(resolve, serviceDelay));
}

export const importerCountries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda',
  'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain',
  'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria',
  'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada',
  'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros',
  'Congo', 'Costa Rica', 'Cote dIvoire', 'Croatia', 'Cuba', 'Cyprus', 'Czechia',
  'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica',
  'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea',
  'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France',
  'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada',
  'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras',
  'Hungary', 'Iceland', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati',
  'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia',
  'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi',
  'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania',
  'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia',
  'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria',
  'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau',
  'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda',
  'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines',
  'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal',
  'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia',
  'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan',
  'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria',
  'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga',
  'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'UAE',
  'Uganda', 'Ukraine', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan',
  'Vanuatu', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export const apedaProductCategories = [
  'Fruits, Vegetables and their Products',
  'Meat and Meat Products',
  'Poultry and Poultry Products',
  'Dairy Products',
  'Confectionery, Biscuits and Bakery Products',
  'Honey, Jaggery and Sugar Products',
  'Cocoa and its products, chocolates of all kinds',
  'Alcoholic and Non-Alcoholic Beverages',
  'Cereal and Cereal Products',
  'Basmati Rice',
  'Groundnuts, Peanuts and Walnuts',
  'Pickles, Papads and Chutneys',
  'Guar Gum',
  'Floriculture and Floriculture Products',
  'Herbal and Medicinal Plants',
  'De-oiled Rice Bran',
  'Green Pepper in Brine',
  'Cashew Nuts and Its Products',
  'Cashew Kernels',
  'Cashewnut Shell Liquid',
  'Cardanol',
  'Organic Products'
];

export const spiceBoardProducts = [
  'Cardamom', 'Pepper', 'Chilli', 'Ginger', 'Turmeric', 'Coriander', 'Cumin',
  'Fennel', 'Fenugreek', 'Celery', 'Aniseed', 'Ajwain', 'Caraway', 'Dill',
  'Cinnamon', 'Cassia', 'Garlic', 'Curry Leaf', 'Kokam', 'Mint', 'Mustard',
  'Parsley', 'Pomegranate Seed', 'Saffron', 'Vanilla', 'Tejpat', 'Long Pepper',
  'Star Anise', 'Sweet Flag', 'Greater Galanga', 'Horseradish', 'Caper',
  'Clove', 'Asafoetida', 'Cambodge', 'Hyssop', 'Juniper Berry', 'Bay Leaf',
  'Lovage', 'Marjoram', 'Nutmeg', 'Mace', 'Basil', 'Poppy Seed', 'Allspice',
  'Rosemary', 'Sage', 'Savory', 'Thyme', 'Oregano', 'Tarragon', 'Tamarind'
];

export const exportProductOptions = [
  ...apedaProductCategories.map((product) => ({ label: product, group: 'APEDA' })),
  ...spiceBoardProducts.map((product) => ({ label: product, group: 'Spice Board' }))
];

export const importerTypes = [
  'spice importer',
  'agri importer',
  'rice importer',
  'pulses importer',
  'dry fruit importer',
  'food ingredient importer',
  'horeca distributor',
  'supermarket distributor',
  'ethnic food wholesaler',
  'manufacturing ingredient buyer',
  'commodity trader',
  'wholesale distributor',
  'private label buyer'
];

export const importerRecords = [];

const marketSignals = [];

const marketSignalRecords = marketSignals.map(([signal, country, product, signal_summary, confidence], index) => ({
  id: `market-signal-${index}`,
  country,
  product,
  signal,
  signal_summary,
  source: index % 3 === 0 ? 'Trade data sample' : index % 3 === 1 ? 'Directory sample' : 'Manual research sample',
  confidence,
  signal_date: new Date(Date.now() - index * 86400000).toISOString()
}));

const dataSources = [];

const tradeEvents = [];

const tradeMapRegions = [];

const exportCorridors = [];

const apedaSpiceBoardLayers = {
  apeda: [],
  spiceBoard: []
};

const importerMemory = [];

function strategicOpportunityScore(importer) {
  const confidence = calculateImporterConfidence(importer);
  const countryDemand = ['UAE', 'Saudi Arabia', 'Germany', 'Australia', 'Netherlands'].includes(importer.country) ? 18 : 12;
  const marginPotential = importer.buyer_risk === 'Low' ? 18 : importer.buyer_risk === 'Medium' ? 14 : 9;
  const logisticsComplexity = importer.preferred_shipment_type?.includes('FCL') ? 10 : 14;
  const competitionIntensity = importer.tags?.includes('Private label') || importer.importer_type?.includes('commodity') ? 8 : 12;
  const relationshipPotential = importer.verification_status === 'High Confidence' ? 18 : importer.verification_status === 'Contact Verified' ? 15 : 10;
  return Math.min(100, Math.round(confidence * 0.3 + countryDemand + marginPotential + logisticsComplexity + competitionIntensity + relationshipPotential));
}

function opportunityTier(score) {
  if (score >= 82) return 'Strategic Expansion Opportunity';
  if (score >= 68) return 'High Opportunity';
  if (score >= 48) return 'Medium Opportunity';
  return 'Low Opportunity';
}

function buildImporterEstimates(importer) {
  const product = importer.preferred_products?.[0] || importer.products?.[0] || 'selected product';
  const isGcc = ['UAE', 'Oman', 'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain'].includes(importer.country);
  const isEurope = ['Germany', 'Netherlands', 'France', 'Italy', 'Spain', 'UK'].includes(importer.country);
  return {
    probable_order_size: importer.preferred_shipment_type?.includes('FCL') ? '1 FCL after qualification; sample or trial lot first' : 'LCL or trial shipment before recurring order',
    preferred_packing: product.toLowerCase().includes('rice') ? '25 KG / 50 KG bags depending buyer channel' : product.toLowerCase().includes('retail') ? 'Retail pack / private label review required' : '25 KG export bags or buyer-specific packing',
    likely_payment_expectations: importer.preferred_payment_terms || (isEurope ? 'Document-backed payment discussion after qualification' : 'To be verified'),
    communication_style: isEurope ? 'Evidence-led, certification-aware, concise and formal' : isGcc ? 'Relationship-led, responsive, documentation and timing focused' : 'Practical sourcing conversation with clear assumptions',
    operational_complexity: isEurope ? 'High documentation and claim sensitivity' : importer.buyer_risk === 'High' ? 'Manual verification required before quote' : 'Moderate operational coordination',
    documentation_sensitivity: isEurope ? 'High: claims, origin, lab tests, certification reminders' : 'Medium: invoice, packing, origin, shipment assumptions',
    sourcing_behavior: importer.importer_type?.includes('commodity') ? 'Compares price quickly; requires margin discipline' : 'Evaluates supplier reliability, documents, packing, and consistency',
    shipment_expectations: importer.preferred_shipment_type || 'Sea freight with clear ETA and document timeline',
    advisory_label: 'AI Strategic Suggestion - Human Validation Recommended'
  };
}

function enrichImporter(importer, index = 0) {
  const score = calculateImporterConfidence(importer);
  const opportunityScore = strategicOpportunityScore(importer);
  const estimates = buildImporterEstimates(importer);
  return {
    ...importer,
    confidence_score: score,
    confidence_level: confidenceLevel(score),
    strategic_opportunity_score: opportunityScore,
    strategic_opportunity_tier: opportunityTier(opportunityScore),
    relationship_status: score >= 80 ? 'Strategic Watchlist' : score >= 65 ? 'Qualified Prospect' : 'Research Required',
    estimated_import_behavior: estimates.sourcing_behavior,
    logistics_preference: importer.preferred_shipment_type || 'Sea freight review required',
    indexed_record_number: index + 1,
    intelligence_depth: 'Institutional profile',
    source: importer.source || importer.source_platform || 'Sample record',
    last_synced_at: importer.last_synced_at || null,
    estimates
  };
}

function buildGlobalImporterIndex() {
  return importerRecords.map((record, index) => enrichImporter(record, index));
}

function hasBusinessDomainEmail(importer) {
  if (!importer.email || !importer.website) return false;
  const domain = importer.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('.').slice(-2).join('.');
  return importer.email.toLowerCase().includes(domain.toLowerCase());
}

export function calculateImporterConfidence(importer) {
  const score =
    (importer.website ? 20 : 0) +
    (hasBusinessDomainEmail(importer) || importer.email ? 15 : 0) +
    (importer.linkedin ? 15 : 0) +
    ((importer.products?.length || 0) > 1 ? 20 : 0) +
    ((importer.apeda_relevance?.length || importer.spice_board_relevance?.length) ? 15 : 0) +
    ((importer.phone || importer.whatsapp) ? 10 : 0) +
    (importer.recent_activity ? 5 : 0);
  return Math.min(score, 100);
}

function confidenceLevel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function verificationChecks(importer) {
  return [
    ['Official website', importer.website ? 'Present' : 'Missing', importer.website ? 20 : 0],
    ['Business domain email', hasBusinessDomainEmail(importer) ? 'Likely matched' : importer.email ? 'Email present, domain review needed' : 'Missing', importer.email ? 15 : 0],
    ['LinkedIn company page', importer.linkedin ? 'Present' : 'Missing', importer.linkedin ? 15 : 0],
    ['Product-country relevance', importer.products?.length ? 'Product match identified' : 'Needs review', importer.products?.length ? 20 : 0],
    ['APEDA / Spice Board relevance', importer.apeda_relevance?.length || importer.spice_board_relevance?.length ? 'Relevant categories present' : 'Not mapped', importer.apeda_relevance?.length || importer.spice_board_relevance?.length ? 15 : 0],
    ['Public contact completeness', importer.phone || importer.whatsapp ? 'Public contact present' : 'Needs manual review', importer.phone || importer.whatsapp ? 10 : 0],
    ['Recent activity', importer.recent_activity ? 'Recent signal observed' : 'No recent public signal', importer.recent_activity ? 5 : 0]
  ];
}

function filterImporters(records, filters = {}) {
  const search = (filters.search || '').toLowerCase();
  return records.filter((importer) => {
    const haystack = [
      importer.company_name,
      importer.country,
      importer.city,
      importer.importer_type,
      importer.industry_category,
      ...(importer.products || []),
      ...(importer.apeda_relevance || []),
      ...(importer.spice_board_relevance || []),
      ...(importer.tags || []),
      importer.email,
      importer.phone,
      importer.linkedin,
      importer.source,
      importer.source_platform,
      importer.verification_status,
      importer.outreach_status
    ].join(' ').toLowerCase();

    const matchesSearch = !search || haystack.includes(search);
    const matchesCountry = !filters.country || filters.country === 'All' || importer.country === filters.country;
    const matchesProduct = !filters.product || filters.product === 'All' || importer.products.some((item) => item.toLowerCase().includes(filters.product.toLowerCase()));
    const matchesType = !filters.importerType || filters.importerType === 'All' || importer.importer_type === filters.importerType;
    const matchesVerification = !filters.verificationStatus || filters.verificationStatus === 'All' || importer.verification_status === filters.verificationStatus;
    const matchesRisk = !filters.buyerRisk || filters.buyerRisk === 'All' || importer.buyer_risk === filters.buyerRisk;
    const matchesSource = !filters.source || filters.source === 'All' || importer.source === filters.source || importer.source_platform === filters.source;
    const matchesStatus = !filters.status || filters.status === 'All' || importer.outreach_status === filters.status || importer.verification_status === filters.status;
    const matchesConfidence = !filters.confidence || filters.confidence === 'All' || confidenceLevel(importer.confidence_score) === filters.confidence;
    return matchesSearch && matchesCountry && matchesProduct && matchesType && matchesVerification && matchesRisk && matchesSource && matchesStatus && matchesConfidence;
  });
}

export async function getImporterIntelligenceDashboard() {
  await wait();
  const records = await loadImporterRecords();
  const signals = await loadMarketSignals();
  return {
    data: {
      importers: records,
      marketSignals: signals,
      importerMemory,
      importerTypes,
      countries: importerCountries,
      productOptions: exportProductOptions,
      apedaProductCategories,
      spiceBoardProducts,
      dataSources,
      tradeEvents,
      tradeMapRegions,
      exportCorridors,
      apedaSpiceBoardLayers,
      founderStrategicSummary: [
        ['Top importer opportunities', 'UAE black pepper, Australia HORECA premium spices, Saudi rice/pulses importers'],
        ['Fastest-growing markets', 'GCC wholesale spices, Europe ingredient sourcing, ASEAN commodity flows'],
        ['Highest-margin opportunities', 'Premium spices, private label packs after compliance review, HORECA ingredient supply'],
        ['Operationally safe markets', 'UAE and Australia when buyer verification, packing, and document assumptions are complete'],
        ['Competitor movements', 'Private-label and trade-directory positioning increasing across Europe and GCC'],
        ['Supplier pressure risks', 'Turmeric and pepper RFQ spikes require supplier availability validation before quoting'],
        ['Logistics/freight risks', 'CIF quotes need short validity windows where freight pressure is active'],
        ['Expansion recommendations', 'Build GCC importer watchlist first, then Europe certification-led outreach and ASEAN commodity mapping']
      ],
      executiveRibbons: [
        'Institution-grade importer discovery layer',
        'APEDA + Spice Board opportunity watch',
        'Buyer CRM conversion before quote release',
        'Human validation required before external communication'
      ],
      summary: {
        activeImporterRecords: records.length,
        platformCapacity: isSupabaseConfigured ? (records.length ? 'Live records synced' : 'No Records Yet') : 'Sample records loaded',
        countryCoverage: `${importerCountries.length} importer markets prepared`,
        productCoverage: `${apedaProductCategories.length} APEDA categories + ${spiceBoardProducts.length} Spice Board products`,
        representedCountries: new Set(records.map((item) => item.country)).size,
        highConfidence: records.filter((item) => calculateImporterConfidence(item) >= 70).length,
        needsReview: records.filter((item) => item.verification_status.includes('Review') || item.buyer_risk === 'High').length,
        apedaOpportunities: records.filter((item) => item.apeda_relevance?.length).length,
        spiceBoardOpportunities: records.filter((item) => item.spice_board_relevance?.length).length,
        strategicOpportunities: records.filter((item) => item.strategic_opportunity_tier === 'Strategic Expansion Opportunity').length,
        activeMarkets: tradeMapRegions.length,
        tradeSignals: signals.length,
        dataMode: isSupabaseConfigured ? 'Connected' : 'Integration Pending',
        nextAction: records.length ? 'Review high-confidence importers and convert qualified records into Buyer CRM.' : 'Awaiting Sync: connect approved CTO data sources or upload verified CSV records.'
      }
    },
    error: null
  };
}

export async function searchImporters(filters = {}) {
  await wait();
  const records = await loadImporterRecords();
  return { data: filterImporters(records, filters), error: null };
}

export async function getImporterById(importerId) {
  await wait();
  const records = await loadImporterRecords();
  const importer = records.find((item) => item.id === importerId) || (isSupabaseConfigured ? null : enrichImporter(importerRecords[0]));
  if (!importer) return { data: null, error: null };
  const score = calculateImporterConfidence(importer);
  const signals = await loadMarketSignals();
  return {
    data: {
      ...importer,
      confidence_score: score,
      confidence_level: confidenceLevel(score),
      strategic_opportunity_score: importer.strategic_opportunity_score,
      strategic_opportunity_tier: importer.strategic_opportunity_tier,
      verification_checks: verificationChecks(importer),
      outreach_history: [
        ['First introduction', 'Draft prepared', 'CMO Command', 'No external delivery'],
        ['Founder note', 'Pending', 'Founder', 'Relationship-led positioning recommended'],
        ['Trade desk review', 'Prepared', 'CIO Command', 'Country, corridor, product and buyer-risk notes attached']
      ],
      market_intelligence: signals.filter((signal) => signal.country === importer.country || importer.products.some((product) => signal.product.toLowerCase().includes(product.toLowerCase().split(' ')[0]))),
      memory: importerMemory
    },
    error: null
  };
}

async function loadImporterRecords() {
  if (!isSupabaseConfigured) return buildGlobalImporterIndex();
  const { client, error } = requireSupabase();
  if (error) return [];
  const { data, error: queryError } = await client
    .from('importer_records')
    .select('*')
    .eq('tenant_id', demoTenantId)
    .order('created_at', { ascending: false });
  if (queryError) return [];
  return (data || []).map((record, index) => enrichImporter({
    ...record,
    products: Array.isArray(record.products) ? record.products : [],
    city: record.metadata?.city || record.city || '',
    importer_type: record.metadata?.importer_type || record.importer_type || 'importer',
    website: record.metadata?.website || '',
    email: record.metadata?.email || '',
    phone: record.metadata?.phone || '',
    linkedin: record.metadata?.linkedin || '',
    source_url: record.metadata?.source_url || '',
    confidence_score: record.opportunity_score || record.metadata?.confidence_score || 0
  }, index));
}

async function loadMarketSignals() {
  if (!isSupabaseConfigured) return marketSignalRecords;
  const { client, error } = requireSupabase();
  if (error) return [];
  const { data, error: queryError } = await client
    .from('market_signals')
    .select('*')
    .eq('tenant_id', demoTenantId)
    .order('created_at', { ascending: false });
  if (queryError) return [];
  return (data || []).map((signal) => ({
    id: signal.id,
    country: signal.market || signal.country || '',
    product: signal.product || '',
    signal: signal.signal_type || signal.summary || '',
    signal_summary: signal.summary || signal.signal_type || '',
    source: signal.source || 'Supabase',
    confidence: signal.confidence || 'Verification Required',
    date: signal.created_at
  }));
}

export async function verifyImporter(importerId) {
  const { data } = await getImporterById(importerId);
  return {
    data: {
      importerId,
      status: data.verification_status,
      confidenceScore: data.confidence_score,
      confidenceLevel: data.confidence_level,
      checks: data.verification_checks,
      note: 'Operational/commercial verification only. Not legal KYC certification.'
    },
    error: null
  };
}

function buildDraftContext(importer) {
  const products = importer.preferred_products?.join(', ') || importer.products?.join(', ') || 'your import categories';
  return { products, market: `${importer.city}, ${importer.country}` };
}

export async function generateImporterEmailDraft(importerId, emailType = 'First introduction') {
  const { data: importer } = await getImporterById(importerId);
  const { products, market } = buildDraftContext(importer);
  await wait();
  const draft = [
    `Subject: A practical India supply conversation for ${products}`,
    '',
    `Hello ${importer.contact_person || 'Procurement Team'},`,
    '',
    `I know a new supplier email is easy to ignore, so I will keep this practical. If I were in your buying seat, I would not want a price list first. I would want to know whether the supplier understands my packing, documentation, timing, payment, and consistency concerns before asking for business.`,
    '',
    `That is why I am reaching out from GOPU Exports regarding ${products} for ${market}. Before we quote anything, we would prefer to understand what would actually make you comfortable as a buyer:`,
    '',
    `- Which product grades and packing sizes are useful for your channel`,
    `- Whether you prefer trial quantity, LCL, or FCL discussions`,
    `- Which documents you expect before shipment planning`,
    `- Which Incoterm, port, and payment assumptions you normally work with`,
    `- What makes a new supplier trustworthy enough for a first order`,
    '',
    `If there is no current requirement, no problem. But if you are reviewing India-origin supply options, we can first share a short product and export-readiness note, then prepare a controlled quotation only after the assumptions are clear. I would rather send you something accurate than push a generic offer.`,
    '',
    `Any certification, origin, APEDA, Spice Board, lab-test, or quality statement would be document-dependent and reviewed before use. We do not want to overclaim anything before verifying it.`,
    '',
    `Would it be useful if I send a concise product capability note for your review?`,
    '',
    'Regards,',
    'GOPU Exports',
    '',
    `Draft type: ${emailType}. This is a prepared outreach draft only; no email has been sent.`
  ].join('\n');
  return {
    data: {
      importerId,
      outreach_type: emailType,
      draft_content: draft,
      status: 'Outreach Draft Ready',
      note: 'Advisory draft only. Founder/CMO review required before external release.'
    },
    error: null
  };
}

export async function generateImporterWhatsAppDraft(importerId, messageType = 'First introduction') {
  const { data: importer } = await getImporterById(importerId);
  const { products } = buildDraftContext(importer);
  await wait();
  const draft = `Hello, this is GOPU Exports from India. I know new supplier messages can feel generic, so I wanted to ask first rather than push a price. If your team is reviewing ${products}, what would matter most before you consider a new supplier: packing size, grade, documents, shipment quantity, Incoterm, payment terms, or delivery timing? If relevant, we can send a short product/export-readiness note first and prepare a quote only after your buying requirements are clear.`;
  return {
    data: {
      importerId,
      outreach_type: messageType,
      draft_content: draft,
      status: 'Outreach Draft Ready',
      note: 'WhatsApp draft only. No external message has been sent.'
    },
    error: null
  };
}

export async function saveImporterOutreach(importerId, payload) {
  await wait();
  return {
    data: {
      id: `outreach-${Date.now()}`,
      importer_id: importerId,
      ...payload,
      status: payload.status || 'Draft',
      created_at: new Date().toISOString()
    },
    error: null
  };
}

export async function assignImporterOwner(importerId, owner) {
  await wait();
  return {
    data: {
      importer_id: importerId,
      assigned_owner: owner,
      status: 'Monitoring',
      audit_note: `Importer assigned to ${owner} for next action.`
    },
    error: null
  };
}

export async function addImporterFounderNote(importerId, note) {
  await wait();
  return {
    data: {
      importer_id: importerId,
      note,
      status: 'Founder note added',
      created_at: new Date().toISOString()
    },
    error: null
  };
}

export async function convertImporterToBuyerCRM(importerId) {
  const { data: importer } = await getImporterById(importerId);
  await wait();
  return {
    data: {
      importer_id: importerId,
      buyer_name: importer.contact_person || importer.company_name,
      company_name: importer.company_name,
      country: importer.country,
      product_interests: importer.products,
      relationship_status: 'New',
      risk_level: importer.buyer_risk,
      status: 'Buyer CRM draft prepared'
    },
    error: null
  };
}
