import React, { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity, AlertTriangle, ArrowLeft, ArrowUpRight, Archive, BarChart3, Bell,
  Bookmark, Bot, Boxes, BrainCircuit, Building2, Calculator, CalendarDays,
  CalendarClock, CheckCircle2, ChevronRight, CircleDollarSign, ClipboardCheck,
  ClipboardList, Command, Database, Eye, ExternalLink, FileCheck2, FileBarChart,
  FileText, Factory, Fingerprint, Gauge, Gem, Keyboard, KeyRound, LockKeyhole,
  LayoutDashboard, Mail, Menu, Network, PackageCheck, Palette, Plug, Printer,
  RadioTower, Route, ScanLine, Search, Send, Settings, ShieldCheck, SlidersHorizontal,
  Sparkles, Sprout, TrendingUp, Target, TimerReset, TriangleAlert, UploadCloud,
  User, UsersRound, Workflow, X, Zap
} from 'lucide-react';
import { supabase, isSupabaseConfigured, backendStatus } from '../lib/supabaseClient';
import { demoTenantId, buildCompanySnapshotFromVault, createInvoiceCompanySnapshot, createInvoiceDraftFromVault, demoTenantId as invoiceTenantId, validateInvoice as validateInvoiceFromService, writeInvoiceAuditLog } from '../services/invoiceService.js';
import { generateCFOReport, getCFODashboard, generateFounderFinancialSummary, getCFOSummary, getFinancialRisks, getMonthlyProfit, getMarginAnalytics, getPayables, getPaymentVaultSummary, getRecurringPayments, getReceivables, getRenewalForecast, getWeeklyProfit, initiatePayment } from '../services/cfoService.js';
import { addApprovalComment, approveRequest, createApprovalRequest, getApprovalQueue, needsReviewRequest, rejectRequest } from '../services/approvalService.js';
import { createAuditLog, listAuditLogs } from '../services/auditService.js';
// Shared components from main.jsx (resolved at runtime — main chunk loads first)
import { ExportOSShell, Breadcrumb, StatusBadge, TrendIndicator, EmptyState, SkeletonBlock, SkeletonCard, SkeletonTable, SkeletonKpiBar, MetricSkeletonGrid, HBarChart, SortableTableHeader, StatusPulse, PriorityBadge, SeverityBadge, Panel, StatusPill, StateChip, SignalList, MiniBars, BulkActionBar, FilterBar, VirtualList, useSortable } from '../main.jsx';


const otherPricingOption = 'Others';
const apedaScheduledProductCategories = [
  'Alcoholic Beverages',
  'Non-Alcoholic Beverages',
  'Basmati Rice',
  'Cashew Kernels',
  'Cashew Nuts and Products',
  'Cashewnut Shell Liquid',
  'Cardanol',
  'Cereal and Cereal Products',
  'Cocoa Products',
  'Chocolates',
  'Confectionery Products',
  'Biscuits',
  'Bakery Products',
  'Dairy Products',
  'De-oiled Rice Bran',
  'Floriculture Products',
  'Seeds',
  'Fresh Fruits',
  'Processed Fruit Products',
  'Fresh Vegetables',
  'Processed Vegetable Products',
  'Green Pepper in Brine',
  'Groundnuts',
  'Peanuts',
  'Walnuts',
  'Guar Gum',
  'Herbal Plants',
  'Medicinal Plants',
  'Honey',
  'Jaggery',
  'Sugar Products',
  'Meat Products',
  'Poultry Products',
  'Pickles',
  'Papads',
  'Chutneys',
  'Organic Products'
];

const spiceBoardProducts = [
  'Ajowan',
  'Allspice',
  'Aniseed',
  'Asafoetida',
  'Basil',
  'Bay Leaf',
  'Birds Eye Chilli',
  'Bishops Weed',
  'Product pending',
  'Camboge',
  'Caper',
  'Capsicum',
  'Caraway',
  'Cardamom Large',
  'Cardamom Small',
  'Cassia',
  'Celery',
  'Chilli',
  'Cinnamon',
  'Clove',
  'Coriander',
  'Coriander Seeds',
  'Cumin',
  'Cumin Seeds',
  'Curry Leaf',
  'Dill',
  'Fennel',
  'Fenugreek',
  'Fenugreek Seeds',
  'Garlic',
  'Ginger',
  'Greater Galanga',
  'Guntur Red Chilli',
  'Horse Radish',
  'Hyssop',
  'Juniper Berry',
  'Kokam',
  'Long Pepper',
  'Lovage',
  'Mace',
  'Marjoram',
  'Mint',
  'Mustard',
  'Mustard Seeds',
  'Nutmeg',
  'Nutmeg and Mace',
  'Oregano',
  'Paprika',
  'Parsley',
  'Pomegranate Seed',
  'Poppy Seed',
  'Red Chilli Powder',
  'Rosemary',
  'Saffron',
  'Sage',
  'Savory',
  'Star Anise',
  'Sweet Flag',
  'Tamarind',
  'Tarragon',
  'Tejpat',
  'Thyme',
  'Turmeric',
  'Product pending',
  'Turmeric Powder',
  'Vanilla'
];

const pricingProducts = Array.from(new Set([...spiceBoardProducts, ...apedaScheduledProductCategories])).sort((a, b) => a.localeCompare(b));
const pricingCountries = [
  'Afghanistan',
  'Albania',
  'Algeria',
  'Andorra',
  'Angola',
  'Antigua and Barbuda',
  'Argentina',
  'Armenia',
  'Australia',
  'Austria',
  'Azerbaijan',
  'Bahamas',
  'Bahrain',
  'Bangladesh',
  'Barbados',
  'Belarus',
  'Belgium',
  'Belize',
  'Benin',
  'Bhutan',
  'Bolivia',
  'Bosnia and Herzegovina',
  'Botswana',
  'Brazil',
  'Brunei',
  'Bulgaria',
  'Burkina Faso',
  'Burundi',
  'Cabo Verde',
  'Cambodia',
  'Cameroon',
  'Canada',
  'Central African Republic',
  'Chad',
  'Chile',
  'China',
  'Colombia',
  'Comoros',
  'Congo',
  'Costa Rica',
  "Cote d'Ivoire",
  'Croatia',
  'Cuba',
  'Cyprus',
  'Czechia',
  'Democratic Republic of the Congo',
  'Denmark',
  'Djibouti',
  'Dominica',
  'Dominican Republic',
  'Ecuador',
  'Egypt',
  'El Salvador',
  'Equatorial Guinea',
  'Eritrea',
  'Estonia',
  'Eswatini',
  'Ethiopia',
  'Fiji',
  'Finland',
  'France',
  'Gabon',
  'Gambia',
  'Georgia',
  'Germany',
  'Ghana',
  'Greece',
  'Grenada',
  'Guatemala',
  'Guinea',
  'Guinea-Bissau',
  'Guyana',
  'Haiti',
  'Honduras',
  'Hungary',
  'Iceland',
  'India',
  'Indonesia',
  'Iran',
  'Iraq',
  'Ireland',
  'Israel',
  'Italy',
  'Jamaica',
  'Japan',
  'Jordan',
  'Kazakhstan',
  'Kenya',
  'Kiribati',
  'Kuwait',
  'Kyrgyzstan',
  'Laos',
  'Latvia',
  'Lebanon',
  'Lesotho',
  'Liberia',
  'Libya',
  'Liechtenstein',
  'Lithuania',
  'Luxembourg',
  'Madagascar',
  'Malawi',
  'Malaysia',
  'Maldives',
  'Mali',
  'Malta',
  'Marshall Islands',
  'Mauritania',
  'Mauritius',
  'Mexico',
  'Micronesia',
  'Moldova',
  'Monaco',
  'Mongolia',
  'Montenegro',
  'Morocco',
  'Mozambique',
  'Myanmar',
  'Namibia',
  'Nauru',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Nicaragua',
  'Niger',
  'Nigeria',
  'North Korea',
  'North Macedonia',
  'Norway',
  'Oman',
  'Pakistan',
  'Palau',
  'Palestine',
  'Panama',
  'Papua New Guinea',
  'Paraguay',
  'Peru',
  'Philippines',
  'Poland',
  'Portugal',
  'Qatar',
  'Romania',
  'Russia',
  'Rwanda',
  'Saint Kitts and Nevis',
  'Saint Lucia',
  'Saint Vincent and the Grenadines',
  'Samoa',
  'San Marino',
  'Sao Tome and Principe',
  'Saudi Arabia',
  'Senegal',
  'Serbia',
  'Seychelles',
  'Sierra Leone',
  'Singapore',
  'Slovakia',
  'Slovenia',
  'Solomon Islands',
  'Somalia',
  'South Africa',
  'South Korea',
  'South Sudan',
  'Spain',
  'Sri Lanka',
  'Sudan',
  'Suriname',
  'Sweden',
  'Switzerland',
  'Syria',
  'Taiwan',
  'Tajikistan',
  'Tanzania',
  'Thailand',
  'Timor-Leste',
  'Togo',
  'Tonga',
  'Trinidad and Tobago',
  'Tunisia',
  'Turkey',
  'Turkmenistan',
  'Tuvalu',
  'Uganda',
  'Ukraine',
  'United Arab Emirates',
  'United Kingdom',
  'United States',
  'Uruguay',
  'Uzbekistan',
  'Vanuatu',
  'Vatican City',
  'Venezuela',
  'Country pending',
  'Yemen',
  'Zambia',
  'Zimbabwe'
].sort((a, b) => a.localeCompare(b));
const pricingPortsByCountry = {
  Australia: ['Brisbane', 'Fremantle', 'Melbourne', 'Sydney'],
  Canada: ['Montreal', 'Toronto', 'Vancouver'],
  Germany: ['Bremen', 'Hamburg'],
  India: ['Chennai', 'Cochin', 'Mundra', 'Nhava Sheva', 'Tuticorin'],
  Japan: ['Kobe', 'Tokyo', 'Yokohama'],
  'Saudi Arabia': ['Dammam', 'Jeddah', 'Riyadh Dry Port'],
  Singapore: ['Singapore'],
  'United Arab Emirates': ['Abu Dhabi', 'Jebel Ali', 'Sharjah'],
  'United Kingdom': ['Felixstowe', 'London Gateway', 'Southampton'],
  'United States': ['Houston', 'Los Angeles', 'New York/New Jersey', 'Savannah']
};
const pricingCurrencyOptions = ['INR', 'USD', 'AUD', 'EUR', 'GBP', 'AED', 'SAR', 'SGD'];
const pricingBasisOptions = ['PER_KG', 'PER_MT', 'PER_TON', 'PER_BAG', 'PER_CARTON', 'PER_CONTAINER', 'PER_ORDER', 'PERCENT_PRODUCT_VALUE', 'PERCENT_INVOICE_VALUE', 'PERCENT_SHIPMENT_VALUE'];
const pricingUnitOptions = ['kg', 'MT', 'Ton', 'Bags', 'Cartons', 'Containers', 'Pounds', 'Liters', 'Units'];
const pricingPaymentTerms = [
  '100% Advance',
  'Advance',
  'TT in Advance',
  '50% Advance / 50% Before Dispatch',
  '30% Advance / 70% Against BL Copy',
  'Balance Before Shipment',
  'Confirmed LC at Sight',
  'Irrevocable LC at Sight',
  'LC at Sight',
  'LC 30 Days',
  'Cash Against Documents (CAD)',
  'Documents Against Payment (DP at Sight)',
  'Documents Against Acceptance (DA 30)',
  'Documents Against Acceptance (DA 60)',
  'Documents Against Acceptance (DA 90)',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'Open Account',
  'Payment After Delivery',
  'Consignment',
  'Escrow',
  'Mixed Terms - Manual Review'
];
const paymentTermRiskProfiles = {
  '100% Advance': ['Low', 'Cash secured before production/dispatch.', 'Proceed with normal CFO review.'],
  Advance: ['Low', 'Buyer pays upfront before commercial exposure increases.', 'Proceed with normal CFO review.'],
  'TT in Advance': ['Low', 'Bank transfer before shipment keeps receivable exposure low.', 'Proceed with normal CFO review.'],
  '50% Advance / 50% Before Dispatch': ['Low', 'Balanced advance with balance before goods leave control.', 'Confirm payment milestones before quote release.'],
  '30% Advance / 70% Against BL Copy': ['Medium', 'Seller ships before full collection; BL copy control reduces but does not remove risk.', 'CFO should verify buyer and document release control.'],
  'Balance Before Shipment': ['Low', 'Final payment expected before shipment movement.', 'Keep dispatch blocked until balance confirmation.'],
  'Confirmed LC at Sight': ['Low', 'Bank-confirmed payment instrument reduces buyer/payment risk.', 'Verify LC wording and bank details.'],
  'Irrevocable LC at Sight': ['Medium', 'LC provides structure, but bank/document discrepancy risk remains.', 'CFO should review LC clauses before quote finalization.'],
  'LC at Sight': ['Medium', 'Payment depends on clean documents and LC compliance.', 'Review documentation accuracy and bank terms.'],
  'LC 30 Days': ['Medium', 'Deferred LC creates timing and document discrepancy exposure.', 'CFO review required before accepting deferred terms.'],
  'Cash Against Documents (CAD)': ['Medium', 'Document-based collection still carries buyer refusal and timing risk.', 'Use only after buyer verification.'],
  'Documents Against Payment (DP at Sight)': ['Medium', 'Payment expected against documents, but buyer can delay/refuse documents.', 'CFO should confirm bank collection route.'],
  'Documents Against Acceptance (DA 30)': ['High', 'Buyer accepts documents and pays later; credit exposure begins.', 'Director review recommended for new buyers.'],
  'Documents Against Acceptance (DA 60)': ['Critical', 'Long deferred payment creates high receivable exposure.', 'Director approval required before quote release.'],
  'Documents Against Acceptance (DA 90)': ['Critical', 'Very long deferred payment creates critical receivable exposure.', 'Director approval required before quote release.'],
  'Net 7': ['Medium', 'Short post-invoice credit exposure.', 'Use only for verified buyers.'],
  'Net 15': ['High', 'Post-shipment credit terms increase receivable risk.', 'CFO + Director review recommended for new buyers.'],
  'Net 30': ['High', 'Extended credit terms increase receivable and collection risk.', 'CFO + Director review recommended for new buyers.'],
  'Net 45': ['Critical', 'Long credit terms create high collection exposure.', 'Director approval required before quote release.'],
  'Net 60': ['Critical', 'Long credit terms create critical collection exposure.', 'Director approval required before quote release.'],
  'Net 90': ['Critical', 'Very long credit terms create critical collection exposure.', 'Director approval required before quote release.'],
  'Open Account': ['Critical', 'Goods may move before secured payment; highest buyer credit exposure.', 'Director approval required. Avoid for new buyers.'],
  'Payment After Delivery': ['Critical', 'Payment depends on buyer after delivery; high default exposure.', 'Director approval required. Avoid for new buyers.'],
  Consignment: ['Critical', 'Payment depends on resale/stock movement after delivery.', 'Director approval required. Avoid unless legally reviewed.'],
  Escrow: ['Low', 'Funds are controlled by neutral escrow if terms are verified.', 'Verify escrow provider and release conditions.'],
  'Mixed Terms - Manual Review': ['High', 'Custom terms need manual commercial review.', 'CFO must document exact payment sequence.']
};
const pricingCostRowsSeed = [
  ['raw_material_cost', 'Raw Material Cost'],
  ['packaging_cost', 'Packaging Cost'],
  ['processing_cost', 'Processing Cost'],
  ['labor_cost', 'Labour Cost'],
  ['overhead_cost', 'Overhead'],
  ['inland_logistics_cost', 'Inland Logistics'],
  ['export_clearance_cost', 'Export Clearance'],
  ['cha_charges_cost', 'CHA Charges'],
  ['documentation_charges_cost', 'Documentation'],
  ['port_charges_cost', 'Port / Terminal Charges'],
  ['freight_cost', 'Freight'],
  ['insurance_cost', 'Insurance'],
  ['commission_cost', 'Commission'],
  ['misc_cost', 'Misc / Contingency']
];
// Reference-only fallbacks — CFO must set live prices in Market Prices tab
const pricingMarketFallbacks = {
  pepper:    680,
  cardamom:  2200,
  cinnamon:  320,
  clove:     820,
  coriander: 90,
  cumin:     250,
  fenugreek: 75,
  chilli:    120,
  mustard:   65,
  turmeric:  148,
  rice:      68,
  onion:     20,
  garlic:    32,
};

// baseInrPerKg here is the FALLBACK reference only — live price from CFO Market Prices tab overrides this
const pricingCommercialPresets = {
  pepper:      { baseInrPerKg: 680,  packagingInrPerKg: 10.5, processingInrPerKg: 15,   laborInrPerKg: 4.8, overheadInrPerKg: 6.5,  complexity: 'Medium', packing: '25 KG moisture-protected export bags',           category: 'Spice Board product' },
  turmeric:    { baseInrPerKg: 148,  packagingInrPerKg: 8.5,  processingInrPerKg: 12,   laborInrPerKg: 3.8, overheadInrPerKg: 5.5,  complexity: 'Medium', packing: '25 KG PP bags or retail master cartons',          category: 'Spice Board / APEDA product' },
  chilli:      { baseInrPerKg: 120,  packagingInrPerKg: 9.5,  processingInrPerKg: 13.5, laborInrPerKg: 4.2, overheadInrPerKg: 6,    complexity: 'High',   packing: '10 KG cartons or 25 KG PP bags',                   category: 'Spice Board product' },
  coriander:   { baseInrPerKg: 90,   packagingInrPerKg: 7.5,  processingInrPerKg: 9.5,  laborInrPerKg: 3.2, overheadInrPerKg: 4.8,  complexity: 'Medium', packing: '25 KG PP bags / 50 KG bulk bags after cleaning',   category: 'Spice Board seed spice' },
  cumin:       { baseInrPerKg: 250,  packagingInrPerKg: 10,   processingInrPerKg: 16,   laborInrPerKg: 5.5, overheadInrPerKg: 8.4,  complexity: 'Medium', packing: '25 KG PP bags / kraft bags with moisture protection', category: 'Spice Board seed spice' },
  cardamom:    { baseInrPerKg: 2200, packagingInrPerKg: 14,   processingInrPerKg: 22,   laborInrPerKg: 6.5, overheadInrPerKg: 10,   complexity: 'High',   packing: 'Vacuum / premium cartons after buyer approval',       category: 'Spice Board product' },
  fenugreek:   { baseInrPerKg: 75,   packagingInrPerKg: 7.5,  processingInrPerKg: 9,    laborInrPerKg: 3.1, overheadInrPerKg: 4.5,  complexity: 'Medium', packing: '25 KG PP bags / 50 KG bulk bags after cleaning',   category: 'Spice Board seed spice' },
  mustard:     { baseInrPerKg: 65,   packagingInrPerKg: 7,    processingInrPerKg: 8.5,  laborInrPerKg: 3,   overheadInrPerKg: 4.2,  complexity: 'Medium', packing: '25 KG PP bags / 50 KG bulk bags',                  category: 'Seed spice / oilseed product' },
  rice:        { baseInrPerKg: 68,   packagingInrPerKg: 6,    processingInrPerKg: 7,    laborInrPerKg: 2.5, overheadInrPerKg: 4,    complexity: 'Medium', packing: '25 KG / 50 KG woven export bags',                  category: 'APEDA product' },
  onion:       { baseInrPerKg: 20,   packagingInrPerKg: 4,    processingInrPerKg: 5,    laborInrPerKg: 2,   overheadInrPerKg: 3,    complexity: 'Low',    packing: '25/50 KG mesh bags',                               category: 'APEDA product' },
  garlic:      { baseInrPerKg: 32,   packagingInrPerKg: 4.5,  processingInrPerKg: 5.5,  laborInrPerKg: 2.2, overheadInrPerKg: 3.5,  complexity: 'Low',    packing: '10/25 KG mesh bags',                               category: 'APEDA product' },
  'seed-spice':{ baseInrPerKg: 115,  packagingInrPerKg: 8,    processingInrPerKg: 9.5,  laborInrPerKg: 3.2, overheadInrPerKg: 4.8,  complexity: 'Medium', packing: '25 KG / 50 KG seed-spice export bags',             category: 'Spice Board seed spice' },
  default:     { baseInrPerKg: 115,  packagingInrPerKg: 8,    processingInrPerKg: 9,    laborInrPerKg: 3,   overheadInrPerKg: 4.5,  complexity: 'Medium', packing: 'Buyer-specific export packing',                      category: 'Export product' },
};

const pricingCountryFreightProfiles = {
  Australia: { zone: 'Australia', complexity: 1.45, seaInrPerKg: 15, airInrPerKg: 245, lead: '18-32 days by sea after vessel booking.' },
  Canada: { zone: 'North America', complexity: 1.55, seaInrPerKg: 17, airInrPerKg: 260, lead: '25-42 days by sea depending port and carrier.' },
  Germany: { zone: 'Europe', complexity: 1.38, seaInrPerKg: 14, airInrPerKg: 230, lead: '22-36 days by sea depending Europe lane.' },
  India: { zone: 'Domestic', complexity: 0.65, seaInrPerKg: 3, airInrPerKg: 70, lead: 'Domestic movement depends dispatch plan.' },
  Japan: { zone: 'East Asia', complexity: 1.28, seaInrPerKg: 12, airInrPerKg: 220, lead: '18-30 days by sea depending cut-off.' },
  'Saudi Arabia': { zone: 'GCC', complexity: 1.1, seaInrPerKg: 7.5, airInrPerKg: 165, lead: '10-20 days by sea to GCC after booking.' },
  Singapore: { zone: 'ASEAN', complexity: 1.05, seaInrPerKg: 8.5, airInrPerKg: 155, lead: '8-18 days by sea depending sailing.' },
  'United Arab Emirates': { zone: 'GCC', complexity: 1, seaInrPerKg: 6.5, airInrPerKg: 150, lead: '7-16 days by sea to Country pending after vessel cut-off.' },
  'United Kingdom': { zone: 'Europe', complexity: 1.48, seaInrPerKg: 15.5, airInrPerKg: 245, lead: '24-40 days by sea depending UK port.' },
  'United States': { zone: 'North America', complexity: 1.6, seaInrPerKg: 18, airInrPerKg: 275, lead: '28-45 days by sea depending US coast.' }
};

const defaultPricingInputs = {
  company_name: '',
  product_name: 'Red Chilli Powder',
  custom_product_name: '',
  spice_grade_or_spec: '',
  quantity: '',
  unit_of_measure: 'kg',
  packaging_type: '',
  packaging_size: '',
  incoterm: 'FOB',
  shipping_mode: 'Sea freight',
  destination_country: '',
  custom_destination_country: '',
  destination_port: '',
  custom_destination_port: '',
  buyer_type: 'New',
  buyer_risk_tier: 'LOW',
  payment_terms: 'Advance',
  currency: 'INR',
  cost_currency: 'INR',
  exchange_rate: '95.8824',
  margin_type: 'MARKUP_ON_COST',
  target_margin_percent: '20',
  minimum_margin_percent: '12',
  market_reference_price: '320',
  buyer_entered_price: '',
  previous_customer_price: '',
  notes: '----- MARKET PRICE AUTO CHECK START -----\nMARKET PRICE CHECK\nStatus: REFERENCE ESTIMATE\nProduct: Red Chilli Powder\nGrade/source match: Red Chilli/Guntur Chilli\nLive/reference price: ₹180.00/kg | ₹180,000.00/ton\nManual source check required before buyer-facing quote.'
};

function buildPricingCostRows(incoterm = 'FOB', currency = 'INR') {
  const included = incotermIncludedCostKeys(incoterm);
  return pricingCostRowsSeed.map(([key, label]) => ({ key, label, amount: '', currency, basis: getDefaultCostBasis(key), included: included.has(key), notes: '' }));
}

function getCommercialPreset(productName) {
  const key = marketProductKey(productName);
  if (key.includes('rice')) return pricingCommercialPresets.rice;
  return pricingCommercialPresets[key] || pricingCommercialPresets.default;
}

function getFreightProfile(country) {
  return pricingCountryFreightProfiles[country] || { zone: 'Global', complexity: 1.25, seaInrPerKg: 12, airInrPerKg: 215, lead: '10-35 days depending destination, route, and carrier.' };
}

function getPaymentTermRisk(paymentTerms) {
  const normalized = String(paymentTerms || '').trim();
  const profile = paymentTermRiskProfiles[normalized];
  if (profile) return { risk: profile[0], note: profile[1], action: profile[2] };
  return { risk: 'Medium', note: 'Payment terms need CFO review before quote release.', action: 'Select a standard term or document manual terms.' };
}

function freightInrPerKg(inputs) {
  const profile = getFreightProfile(inputs.destination_country);
  const mode = String(inputs.shipping_mode || '').toLowerCase();
  if (mode.includes('air')) return profile.airInrPerKg;
  if (mode.includes('courier')) return profile.airInrPerKg * 1.45;
  if (mode.includes('road')) return Math.max(9, profile.seaInrPerKg * 1.35);
  return profile.seaInrPerKg;
}

function getDefaultCostBasis(key) {
  if (['raw_material_cost', 'packaging_cost', 'processing_cost', 'labor_cost', 'overhead_cost'].includes(key)) return 'PER_KG';
  if (['insurance_cost', 'commission_cost'].includes(key)) return 'PERCENT_INVOICE_VALUE';
  return 'PER_ORDER';
}

function buildAiAssistedCostRows(inputs) {
  const displayProduct = getDisplayProduct(inputs);
  const preset = getCommercialPreset(displayProduct);
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const profile = getFreightProfile(inputs.destination_country);
  const included = incotermIncludedCostKeys(inputs.incoterm);
  const costCurrency = String(inputs.cost_currency || 'INR').toUpperCase();
  const exchangeRate = moneyNumber(inputs.exchange_rate) || moneyNumber(defaultPricingInputs.exchange_rate);
  const estimateAmount = (amountInr) => roundMoney(convertCurrency(amountInr, 'INR', costCurrency, exchangeRate));
  const kg = Math.max(quantity.kg, 1);
  const mode = String(inputs.shipping_mode || '').toLowerCase();
  const modeMultiplier = mode.includes('air') ? 1.28 : mode.includes('courier') ? 1.55 : mode.includes('road') ? 1.12 : 1;
  const inlandOrder = roundMoney((52000 + kg * 1.65) * profile.complexity * (mode.includes('air') ? 0.72 : 1));
  const clearanceOrder = roundMoney(18500 * profile.complexity);
  const portOrder = roundMoney((mode.includes('air') ? 16500 : 36500) * profile.complexity);
  const chaOrder = roundMoney(13500 * profile.complexity);
  const documentationOrder = roundMoney(6500 * profile.complexity);
  const freightOrder = roundMoney(kg * freightInrPerKg(inputs) * modeMultiplier);
  const miscOrder = roundMoney(Math.max(8500, kg * 0.75));
  const estimates = {
    raw_material_cost: { amount: estimateAmount(moneyNumber(inputs.market_reference_price) || preset.baseInrPerKg), basis: 'PER_KG', notes: `Market/product reference cost for ${displayProduct}; verify with supplier/current market.` },
    packaging_cost: { amount: estimateAmount(preset.packagingInrPerKg), basis: 'PER_KG', notes: `Suggested packing: ${preset.packing}.` },
    processing_cost: { amount: estimateAmount(preset.processingInrPerKg), basis: 'PER_KG', notes: 'AI-assisted processing estimate; verify factory/supplier quote.' },
    labor_cost: { amount: estimateAmount(preset.laborInrPerKg), basis: 'PER_KG', notes: 'Estimated packing, handling, and preparation labor.' },
    overhead_cost: { amount: estimateAmount(preset.overheadInrPerKg), basis: 'PER_KG', notes: 'Estimated export overhead allocation.' },
    inland_logistics_cost: { amount: estimateAmount(inlandOrder), basis: 'PER_ORDER', notes: `Estimated India-side movement for ${profile.zone} lane.` },
    export_clearance_cost: { amount: estimateAmount(clearanceOrder), basis: 'PER_ORDER', notes: 'Estimated export clearance / documentation handling; human review required.' },
    cha_charges_cost: { amount: estimateAmount(chaOrder), basis: 'PER_ORDER', notes: 'Estimated CHA coordination and customs handling guidance.' },
    documentation_charges_cost: { amount: estimateAmount(documentationOrder), basis: 'PER_ORDER', notes: 'Estimated export documentation preparation guidance.' },
    port_charges_cost: { amount: estimateAmount(portOrder), basis: 'PER_ORDER', notes: `${inputs.shipping_mode} terminal/port handling estimate.` },
    freight_cost: { amount: estimateAmount(freightOrder), basis: 'PER_ORDER', notes: `Commercial freight estimate for ${inputs.destination_country}; live carrier quote not connected.` },
    insurance_cost: { amount: '0.35', basis: 'PERCENT_INVOICE_VALUE', notes: 'Insurance default percentage guidance; validate before release.' },
    commission_cost: { amount: '2.5', basis: 'PERCENT_INVOICE_VALUE', notes: 'Commercial commission default percentage guidance.' },
    misc_cost: { amount: estimateAmount(miscOrder), basis: 'PER_ORDER', notes: 'Estimated documentation, bank, communication, and contingency buffer.' }
  };
  return pricingCostRowsSeed.map(([key, label]) => ({
    key,
    label,
    amount: String(estimates[key]?.amount ?? ''),
    currency: costCurrency,
    basis: estimates[key]?.basis || 'PER_ORDER',
    included: included.has(key),
    estimated: true,
    source: 'AI-assisted estimate',
    notes: estimates[key]?.notes || 'AI-assisted estimate; verify before buyer-facing quote.'
  }));
}

function mergeAiAssistedCostRows(currentRows, inputs) {
  const estimatesByKey = Object.fromEntries(buildAiAssistedCostRows(inputs).map((row) => [row.key, row]));
  return currentRows.map((row) => {
    const estimate = estimatesByKey[row.key];
    if (!estimate) return row;
    const shouldRefreshEstimate = row.estimated || !String(row.amount || '').trim();
    return {
      ...row,
      included: estimate.included,
      ...(shouldRefreshEstimate
        ? {
            amount: estimate.amount,
            currency: estimate.currency,
            basis: estimate.basis,
            estimated: true,
            source: estimate.source,
            notes: row.notes || estimate.notes
          }
        : {})
    };
  });
}

function incotermIncludedCostKeys(incoterm) {
  const normalized = String(incoterm || '').toUpperCase();
  const keys = new Set(['raw_material_cost', 'packaging_cost', 'processing_cost', 'labor_cost', 'overhead_cost', 'commission_cost']);
  if (['FOB', 'CFR', 'CIF', 'DAP', 'DDP'].includes(normalized)) {
    keys.add('inland_logistics_cost');
    keys.add('export_clearance_cost');
    keys.add('cha_charges_cost');
    keys.add('documentation_charges_cost');
    keys.add('port_charges_cost');
  }
  if (['CFR', 'CIF', 'DAP', 'DDP'].includes(normalized)) keys.add('freight_cost');
  if (['CIF', 'DAP', 'DDP'].includes(normalized)) keys.add('insurance_cost');
  return keys;
}

function criticalPricingFields(incoterm) {
  const normalized = String(incoterm || '').toUpperCase();
  if (normalized === 'EXW') return [];
  if (normalized === 'FOB') return ['inland_logistics_cost', 'export_clearance_cost'];
  if (normalized === 'CFR') return ['inland_logistics_cost', 'export_clearance_cost', 'freight_cost'];
  if (normalized === 'CIF' || normalized === 'DAP' || normalized === 'DDP') return ['inland_logistics_cost', 'export_clearance_cost', 'freight_cost', 'insurance_cost'];
  return ['freight_cost'];
}

function pricingQuantities(quantity, unit) {
  const value = moneyNumber(quantity);
  const normalized = String(unit || '').toLowerCase();
  let kg = value * 1000;
  if (normalized === 'kg') kg = value;
  else if (normalized === 'mt' || normalized === 'ton' || normalized === 'tons') kg = value * 1000;
  else if (normalized === 'bags') kg = value * 25;
  else if (normalized === 'cartons') kg = value * 10;
  else if (normalized === 'containers') kg = value * 20000;
  else if (normalized === 'pounds') kg = value * 0.453592;
  else if (normalized === 'liters') kg = value;
  else if (normalized === 'units') kg = value;
  const tons = kg / 1000;
  return { value, unit, kg, tons };
}

function normalizeCostBasis(value) {
  const normalized = String(value || '').toUpperCase().replace(/[\s/-]+/g, '_');
  if (normalized.includes('PERCENT') && normalized.includes('SHIPMENT')) return 'PERCENT_SHIPMENT_VALUE';
  if (normalized.includes('PERCENT') && normalized.includes('INVOICE')) return 'PERCENT_INVOICE_VALUE';
  if (normalized.includes('PERCENT') && normalized.includes('PRODUCT')) return 'PERCENT_PRODUCT_VALUE';
  if (normalized.includes('CONTAINER')) return 'PER_CONTAINER';
  if (normalized.includes('CARTON')) return 'PER_CARTON';
  if (normalized.includes('BAG')) return 'PER_BAG';
  if (normalized === 'PER_MT' || normalized.includes('METRIC_TON') || normalized.includes('MT')) return 'PER_MT';
  if (normalized.includes('KG')) return 'PER_KG';
  if (normalized.includes('ORDER') || normalized.includes('TOTAL')) return 'PER_ORDER';
  return 'PER_TON';
}

function quantityCountForBasis(quantity, basis) {
  const unit = String(quantity.unit || '').toLowerCase();
  if (basis === 'PER_KG') return quantity.kg;
  if (basis === 'PER_MT' || basis === 'PER_TON') return quantity.tons;
  if (basis === 'PER_BAG') return unit === 'bags' ? quantity.value : quantity.kg / 25;
  if (basis === 'PER_CARTON') return unit === 'cartons' ? quantity.value : quantity.kg / 10;
  if (basis === 'PER_CONTAINER') return unit === 'containers' ? quantity.value : quantity.kg / 20000;
  return 1;
}

function costLineTotal(amount, basis, quantity, context = {}) {
  const normalized = normalizeCostBasis(basis);
  if (normalized === 'PER_ORDER') return roundMoney(amount);
  if (normalized === 'PERCENT_PRODUCT_VALUE') return roundMoney((context.productValue || 0) * amount / 100);
  if (normalized === 'PERCENT_INVOICE_VALUE') return roundMoney((context.invoiceSubtotal || 0) * amount / 100);
  if (normalized === 'PERCENT_SHIPMENT_VALUE') return roundMoney((context.shipmentValue || context.invoiceSubtotal || 0) * amount / 100);
  return roundMoney(amount * quantityCountForBasis(quantity, normalized));
}

function isPercentageCostBasis(basis) {
  return String(normalizeCostBasis(basis)).startsWith('PERCENT_');
}

function getCostLineContext(inputs, costRows) {
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const exchangeRate = moneyNumber(inputs.exchange_rate) || 1;
  const includedByIncoterm = incotermIncludedCostKeys(inputs.incoterm);
  const normalizedRows = pricingCostRowsSeed.map(([key]) => {
    const row = costRows.find((item) => item.key === key) || {};
    return {
      ...row,
      key,
      amount: moneyNumber(row.amount),
      currency: String(row.currency || inputs.cost_currency || 'INR').toUpperCase(),
      basis: normalizeCostBasis(row.basis || getDefaultCostBasis(key)),
      included: row.included === undefined ? includedByIncoterm.has(key) : Boolean(row.included)
    };
  });
  const rawMaterialRow = normalizedRows.find((row) => row.key === 'raw_material_cost');
  const rawMaterialEntered = rawMaterialRow?.included
    ? costLineTotal(rawMaterialRow.amount, rawMaterialRow.basis, quantity)
    : 0;
  const productValueInr = roundMoney(convertCurrency(rawMaterialEntered, rawMaterialRow?.currency || 'INR', 'INR', exchangeRate));
  const invoiceSubtotalInr = roundMoney(normalizedRows.reduce((sum, row) => {
    if (!row.included || isPercentageCostBasis(row.basis)) return sum;
    const entered = costLineTotal(row.amount, row.basis, quantity);
    return sum + convertCurrency(entered, row.currency, 'INR', exchangeRate);
  }, 0));
  return {
    productValueInr,
    invoiceSubtotalInr,
    shipmentValueInr: invoiceSubtotalInr
  };
}

function contextForCostCurrency(context, currency, exchangeRate) {
  return {
    productValue: convertCurrency(context.productValueInr || 0, 'INR', currency, exchangeRate),
    invoiceSubtotal: convertCurrency(context.invoiceSubtotalInr || 0, 'INR', currency, exchangeRate),
    shipmentValue: convertCurrency(context.shipmentValueInr || 0, 'INR', currency, exchangeRate)
  };
}

function convertCurrency(amount, from, to, usdToInrRate) {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (from === to) return amount;
  const rate = usdToInrRate > 0 ? usdToInrRate : 1;
  const normalizedFrom = String(from || 'INR').toUpperCase();
  const normalizedTo = String(to || 'INR').toUpperCase();
  const currencyToInr = {
    INR: 1,
    USD: rate,
    AED: rate / 3.6725,
    SAR: rate / 3.75,
    EUR: rate * 1.08,
    GBP: rate * 1.27,
    AUD: rate * 0.66,
    SGD: rate * 0.74
  };
  const fromRate = currencyToInr[normalizedFrom] || rate;
  const toRate = currencyToInr[normalizedTo] || rate;
  return (amount * fromRate) / toRate;
}

function quotePriceFromCost(cost, percent, marginType) {
  if (!Number.isFinite(cost) || cost <= 0) return 0;
  return roundMoney(cost * (1 + percent / 100));
}

function calculatePricing(inputs, costRows) {
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const quoteCurrency = String(inputs.currency || 'USD').toUpperCase();
  const costCurrency = String(inputs.cost_currency || inputs.currency || 'USD').toUpperCase();
  const exchangeRate = moneyNumber(inputs.exchange_rate) || 1;
  const includedByIncoterm = incotermIncludedCostKeys(inputs.incoterm);
  const warnings = [];
  const costs = {};
  const costContext = getCostLineContext(inputs, costRows);
  const lines = pricingCostRowsSeed.map(([key, label]) => {
    const row = costRows.find((item) => item.key === key);
    const amount = moneyNumber(row?.amount);
    const basis = normalizeCostBasis(row?.basis || getDefaultCostBasis(key));
    const currency = String(row?.currency || costCurrency).toUpperCase();
    const included = row?.included === undefined ? includedByIncoterm.has(key) : Boolean(row.included);
    const lineContext = contextForCostCurrency(costContext, currency, exchangeRate);
    const lineTotalEntered = included ? costLineTotal(amount, basis, quantity, lineContext) : 0;
    const lineTotalQuote = roundMoney(convertCurrency(lineTotalEntered, currency, quoteCurrency, exchangeRate));
    const excludedByIncoterm = !includedByIncoterm.has(key) && Boolean(row?.included);
    if (excludedByIncoterm) warnings.push({ factor: label, impact: 'NEGATIVE', note: `${label} is normally excluded for ${inputs.incoterm}; manually included.` });
    costs[key] = lineTotalQuote;
    return {
      key,
      label,
      amount,
      currency,
      basis,
      included,
      line_total: lineTotalQuote,
      line_total_inr: roundMoney(convertCurrency(lineTotalEntered, currency, 'INR', exchangeRate)),
      note: row?.notes || (included ? 'Included by Incoterm.' : `Excluded for ${inputs.incoterm}.`)
    };
  });
  const totalCost = roundMoney(Object.values(costs).reduce((sum, value) => sum + value, 0));
  const totalCostInr = roundMoney(lines.reduce((sum, line) => sum + line.line_total_inr, 0));
  const totalCostUsd = roundMoney(convertCurrency(totalCostInr, 'INR', 'USD', exchangeRate));
  const quantityValue = quantity.value || 0;
  const unitCost = quantityValue > 0 ? roundMoney(totalCost / quantityValue) : 0;
  const targetMargin = clampPercent(inputs.target_margin_percent);
  const minimumMargin = clampPercent(inputs.minimum_margin_percent);
  const marginType = String(inputs.margin_type || 'MARGIN_ON_SELLING_PRICE');
  const targetTotalQuote = quotePriceFromCost(totalCost, targetMargin, marginType);
  const minimumTotalQuote = quotePriceFromCost(totalCost, minimumMargin, marginType);
  const safeTotalQuote = quotePriceFromCost(totalCost, Math.max(targetMargin, 24), marginType);
  const aggressiveTotalQuote = quotePriceFromCost(totalCost, Math.max(minimumMargin, Math.min(targetMargin, 18)), marginType);
  const recommendedTotalQuote = roundMoney(Math.max(targetTotalQuote, minimumTotalQuote));
  const recommendedUnitPrice = quantityValue > 0 ? roundMoney(recommendedTotalQuote / quantityValue) : 0;
  const breakEvenPricePerKg = quantity.kg > 0 ? roundMoney(totalCostInr / quantity.kg) : 0;
  const recommendedPricePerKgInr = roundMoney(breakEvenPricePerKg * (1 + targetMargin / 100));
  const roundedRecommendedPricePerKgInr = Math.ceil(recommendedPricePerKgInr);
  const recommendedTotalInr = roundMoney(recommendedPricePerKgInr * quantity.kg);
  const profitAmount = roundMoney(Math.max(0, recommendedTotalQuote - totalCost));
  const achievedMarginPercent = targetMargin;
  const rangeSpread = getMissingPricingFields(inputs, costRows).length > 0 ? 0.08 : 0.03;
  return {
    productBaseCost: costs.raw_material_cost || 0,
    packagingCost: costs.packaging_cost || 0,
    freightCost: costs.freight_cost || 0,
    commission: costs.commission_cost || 0,
    otherCosts: roundMoney((costs.processing_cost || 0) + (costs.labor_cost || 0) + (costs.overhead_cost || 0) + (costs.inland_logistics_cost || 0) + (costs.export_clearance_cost || 0) + (costs.port_charges_cost || 0) + (costs.insurance_cost || 0) + (costs.misc_cost || 0)),
    totalLandedCost: totalCost,
    totalCostInr,
    totalCostUsd,
    margin: achievedMarginPercent,
    suggestedQuotePrice: targetTotalQuote,
    minimumSafePrice: minimumTotalQuote,
    safeQuotePrice: safeTotalQuote,
    aggressiveQuotePrice: aggressiveTotalQuote,
    aggressiveMarketPrice: aggressiveTotalQuote,
    recommendedOfferPrice: recommendedTotalQuote,
    recommendedUnitPrice,
    breakEvenPricePerKg,
    recommendedPricePerKgInr,
    roundedRecommendedPricePerKgInr,
    recommendedTotalInr,
    recommendedPriceRangeLow: roundMoney(recommendedUnitPrice * (1 - rangeSpread)),
    recommendedPriceRangeHigh: roundMoney(recommendedUnitPrice * (1 + rangeSpread)),
    profitAmount,
    fobEstimate: roundMoney((costs.raw_material_cost || 0) + (costs.packaging_cost || 0) + (costs.processing_cost || 0) + (costs.labor_cost || 0) + (costs.overhead_cost || 0) + (costs.inland_logistics_cost || 0) + (costs.export_clearance_cost || 0) + (costs.port_charges_cost || 0) + (costs.commission_cost || 0)),
    cifEstimate: recommendedTotalQuote,
    exwEstimate: roundMoney((costs.raw_material_cost || 0) + (costs.packaging_cost || 0) + (costs.processing_cost || 0) + (costs.labor_cost || 0) + (costs.overhead_cost || 0) + (costs.commission_cost || 0)),
    quantity,
    lines,
    warnings
  };
}

function pricingRiskAdjustments(inputs, totalCost = 0, calculationWarnings = []) {
  const adjustments = [...calculationWarnings];
  const quantity = moneyNumber(inputs.quantity);
  const buyerRisk = String(inputs.buyer_risk_tier || '').toLowerCase();
  const paymentRisk = getPaymentTermRisk(inputs.payment_terms);
  const packagingType = String(inputs.packaging_type || '').toLowerCase();
  const recommendedUnitCost = quantity > 0 ? totalCost / quantity : 0;
  const previousPrice = moneyNumber(inputs.previous_customer_price);
  const marketPrice = moneyNumber(inputs.market_reference_price);
  if (quantity >= 10000) adjustments.push({ factor: 'Large volume', impact: 'POSITIVE', note: 'Large volume may support a controlled discount, but Founder must approve it.' });
  else adjustments.push({ factor: 'Volume', impact: 'NEUTRAL', note: 'No automatic volume discount applied.' });
  if (buyerRisk.includes('high') || buyerRisk.includes('blocked')) adjustments.push({ factor: 'Buyer risk tier', impact: 'NEGATIVE', note: 'High-risk buyer requires Founder review before quote use.' });
  else if (buyerRisk) adjustments.push({ factor: 'Buyer risk tier', impact: 'NEUTRAL', note: `Buyer risk tier recorded as ${inputs.buyer_risk_tier}.` });
  if (['High', 'Critical'].includes(paymentRisk.risk)) adjustments.push({ factor: 'Payment terms', impact: 'NEGATIVE', note: `${paymentRisk.risk} payment risk: ${paymentRisk.note}` });
  else if (paymentRisk.risk === 'Medium') adjustments.push({ factor: 'Payment terms', impact: 'NEUTRAL', note: `Medium payment risk: ${paymentRisk.note}` });
  else if (inputs.payment_terms) adjustments.push({ factor: 'Payment terms', impact: 'POSITIVE', note: `Low payment risk: ${paymentRisk.note}` });
  if (/custom|glass|premium|retail|private label/.test(packagingType)) adjustments.push({ factor: 'Packaging', impact: 'NEGATIVE', note: 'Special packaging can increase cost and should be confirmed.' });
  if (previousPrice > 0 && recommendedUnitCost > 0) adjustments.push({ factor: 'Previous customer price', impact: previousPrice >= recommendedUnitCost ? 'NEUTRAL' : 'NEGATIVE', note: `Previous customer price supplied: ${previousPrice.toFixed(2)}.` });
  if (marketPrice > 0 && recommendedUnitCost > 0) adjustments.push({ factor: 'Market reference price', impact: marketPrice >= recommendedUnitCost ? 'NEUTRAL' : 'NEGATIVE', note: `Market reference price supplied: ${marketPrice.toFixed(2)}.` });
  return adjustments;
}

function getMissingPricingFields(inputs, costRows) {
  const requiredFields = ['product_name', 'quantity', 'unit_of_measure', 'incoterm', 'destination_country', 'raw_material_cost', 'packaging_cost', 'processing_cost', 'target_margin_percent', 'minimum_margin_percent', 'currency'];
  const criticalFields = criticalPricingFields(inputs.incoterm);
  const rowValues = Object.fromEntries(costRows.map((row) => [row.key, row.included ? row.amount : '']));
  const merged = { ...inputs, ...rowValues };
  return [...requiredFields, ...criticalFields].filter((field) => merged[field] === undefined || merged[field] === null || merged[field] === '');
}

function getPricingRisk(inputs, calc, costRows) {
  const missingCriticalFields = getMissingPricingFields(inputs, costRows);
  const riskAdjustments = pricingRiskAdjustments(inputs, calc.totalLandedCost, calc.warnings);
  const restricted = isSanctionedCountry(inputs.destination_country) || /sanction|denied|restricted/i.test(String(inputs.notes || ''));
  const highRisk = /high|blocked|manual/i.test(String(inputs.buyer_risk_tier || '')) || riskAdjustments.some((item) => item.factor === 'Buyer risk tier' && item.impact === 'NEGATIVE');
  const paymentTermRisk = getPaymentTermRisk(inputs.payment_terms);
  const riskyPayment = ['High', 'Critical'].includes(paymentTermRisk.risk);
  const status = restricted ? 'DO_NOT_QUOTE' : missingCriticalFields.length > 0 || highRisk || paymentTermRisk.risk === 'Critical' ? 'MANUAL_REVIEW' : 'READY';
  const confidence = restricted || missingCriticalFields.length > 0 || highRisk || paymentTermRisk.risk === 'Critical' ? 'LOW' : riskyPayment || !inputs.market_reference_price ? 'MEDIUM' : 'HIGH';
  const decision = restricted ? 'HOLD' : highRisk || riskyPayment || status === 'MANUAL_REVIEW' ? 'FOUNDER_REVIEW' : 'QUOTE';
  const reason = restricted
    ? 'Restricted or sanctioned destination detected. Do not quote.'
    : missingCriticalFields.length > 0
      ? `Missing critical pricing inputs: ${safeCfoJoin(missingCriticalFields, ', ')}.`
      : riskyPayment
        ? `${paymentTermRisk.risk} payment risk: ${paymentTermRisk.action}`
      : highRisk
        ? 'Buyer risk tier requires Founder review before pricing is used.'
        : 'Pricing is ready for Founder review and manual commercial decision.';
  return { status, confidence, decision, reason, risks: riskAdjustments, missingCriticalFields, paymentTermRisk };
}

function isSanctionedCountry(country) {
  return ['russia', 'belarus', 'iran', 'north korea', 'cuba', 'syria', 'venezuela'].includes(String(country || '').trim().toLowerCase());
}

function marketProductKey(productName) {
  const normalized = String(productName || '').toLowerCase();
  if (normalized.includes('chilli') || normalized.includes('chili') || normalized.includes('capsicum') || normalized.includes('paprika')) return 'chilli';
  if (normalized.includes('green pepper') || normalized.includes('long pepper') || normalized.includes('black pepper') || normalized === 'pepper' || normalized.includes('pepper in brine')) return 'pepper';
  if (normalized.includes('cardamom')) return 'cardamom';
  if (normalized.includes('cinnamon') || normalized.includes('cassia') || normalized.includes('tejpat') || normalized.includes('bay leaf')) return 'cinnamon';
  if (normalized.includes('clove')) return 'clove';
  if (normalized.includes('nutmeg') || normalized.includes('mace')) return 'nutmeg-mace';
  if (normalized.includes('cumin') || normalized.includes('cummin') || normalized.includes('jeera')) return 'cumin';
  if (normalized.includes('coriander') || normalized.includes('dhania')) return 'coriander';
  if (normalized.includes('mustard')) return 'mustard';
  if (normalized.includes('fenugreek')) return 'fenugreek';
  if (normalized.includes('anise') || normalized.includes('ajowan') || normalized.includes('bishop') || normalized.includes('caraway') || normalized.includes('fennel') || normalized.includes('juniper')) return 'seed-spice';
  if (normalized.includes('turmeric') || normalized.includes('basil') || normalized.includes('curry') || normalized.includes('dill') || normalized.includes('galanga') || normalized.includes('horse radish') || normalized.includes('hyssop') || normalized.includes('kokam') || normalized.includes('lovage') || normalized.includes('marjoram') || normalized.includes('mint') || normalized.includes('oregano') || normalized.includes('parsley') || normalized.includes('pomegranate') || normalized.includes('poppy') || normalized.includes('rosemary') || normalized.includes('sage') || normalized.includes('savory') || normalized.includes('star anise') || normalized.includes('sweet flag') || normalized.includes('tamarind') || normalized.includes('tarragon') || normalized.includes('thyme') || normalized.includes('allspice') || normalized.includes('asafoetida') || normalized.includes('camboge') || normalized.includes('caper') || normalized.includes('celery')) return 'turmeric';
  if (normalized.includes('garlic')) return 'garlic';
  if (normalized.includes('ginger')) return 'ginger';
  if (normalized.includes('vanilla')) return 'vanilla';
  if (normalized.includes('saffron')) return 'saffron';
  if (normalized.includes('basmati') || normalized.includes('rice') || normalized.includes('cereal')) return 'rice';
  if (normalized.includes('cashew') || normalized.includes('cardanol')) return 'cashew';
  if (normalized.includes('fruit')) return 'fruit';
  if (normalized.includes('vegetable')) return 'vegetable';
  if (normalized.includes('meat')) return 'meat';
  if (normalized.includes('poultry')) return 'poultry';
  if (normalized.includes('dairy')) return 'dairy';
  if (normalized.includes('honey')) return 'honey';
  if (normalized.includes('jaggery') || normalized.includes('sugar')) return 'sugar';
  if (normalized.includes('cocoa') || normalized.includes('chocolate')) return 'cocoa';
  if (normalized.includes('confectionery') || normalized.includes('biscuit') || normalized.includes('bakery')) return 'bakery';
  if (normalized.includes('beverage')) return 'beverage';
  if (normalized.includes('groundnut') || normalized.includes('peanut') || normalized.includes('walnut')) return 'nuts';
  if (normalized.includes('pickle') || normalized.includes('papad') || normalized.includes('chutney')) return 'prepared-food';
  if (normalized.includes('guar')) return 'guar-gum';
  if (normalized.includes('floriculture') || normalized === 'seeds') return 'floriculture';
  if (normalized.includes('herbal') || normalized.includes('medicinal')) return 'herbal';
  if (normalized.includes('organic')) return 'organic';
  return normalized.replace(/[^a-z0-9]+/g, '-');
}

function getAutoMarketSourcePrice(inputs) {
  const key = marketProductKey(getDisplayProduct(inputs));
  return pricingMarketFallbacks[key] || getCommercialPreset(getDisplayProduct(inputs)).baseInrPerKg || 0;
}

function getProductGradeSourceMatch(productName) {
  const key = marketProductKey(productName);
  const product = String(productName || '').trim();
  const gradeMap = {
    chilli: 'Red Chilli/Guntur Chilli',
    cumin: 'Cumin Seeds / Jeera export grade',
    coriander: 'Coriander Seeds / Dhania export grade',
    fenugreek: 'Fenugreek Seeds / Methi export grade',
    mustard: 'Mustard Seeds export grade',
    pepper: 'Black Pepper / export grade',
    turmeric: 'Turmeric / Curcuma export grade',
    cardamom: 'Cardamom / buyer-approved grade',
    'seed-spice': 'Whole seed spice / buyer-approved grade'
  };
  return gradeMap[key] || product || 'Manual product match';
}

const pricingChannelRequiredFields = [
  ['company_name', 'Buyer / company name'],
  ['product_name', 'Product'],
  ['quantity', 'Quantity'],
  ['unit_of_measure', 'Unit'],
  ['destination_country', 'Destination country'],
  ['destination_port', 'Destination port'],
  ['incoterm', 'Incoterm'],
  ['payment_terms', 'Payment terms'],
  ['market_reference_price', 'Market/product cost']
];

const pricingCountryAliases = {
  uae: 'United Arab Emirates',
  'u.a.e': 'United Arab Emirates',
  dubai: 'United Arab Emirates',
  oman: 'Oman',
  muscat: 'Oman',
  ksa: 'Saudi Arabia',
  saudi: 'Saudi Arabia',
  'saudi arabia': 'Saudi Arabia',
  qatar: 'Qatar',
  kuwait: 'Kuwait',
  bahrain: 'Bahrain',
  singapore: 'Singapore',
  malaysia: 'Malaysia',
  germany: 'Germany',
  uk: 'United Kingdom',
  usa: 'United States',
  us: 'United States',
  america: 'United States',
  australia: 'Australia'
};

function getPricingChannelMissingFields(inputs) {
  return pricingChannelRequiredFields
    .filter(([field]) => {
      if (field === 'destination_port' && inputs.destination_country && pricingPortsByCountry[inputs.destination_country]?.length) return false;
      return !String(inputs[field] || '').trim();
    })
    .map(([field, label]) => ({ field, label }));
}

function matchesPricingAlias(text, alias) {
  const escaped = String(alias).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

function matchPricingCountry(text) {
  const lower = String(text || '').toLowerCase();
  const alias = Object.entries(pricingCountryAliases).find(([key]) => matchesPricingAlias(lower, key));
  return alias?.[1] || pricingCountries
    .filter((country) => lower.includes(country.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0] || '';
}

function parsePricingChannelMessage(message) {
  const text = String(message || '');
  const lower = text.toLowerCase();
  const updates = {};
  const buyerMatch = text.match(/(?:company|buyer|importer|customer)\s*[:\-]\s*([^\n,;]+)/i);
  if (buyerMatch?.[1]) updates.company_name = buyerMatch[1].trim();

  const productMatch = pricingProducts
    .filter((product) => lower.includes(product.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  if (productMatch) updates.product_name = productMatch;
  else if (lower.includes('red chilli') || lower.includes('red chili')) updates.product_name = 'Red Chilli Powder';
  else if (lower.includes('cumin') || lower.includes('cummin') || lower.includes('jeera')) updates.product_name = 'Cumin Seeds';
  else if (lower.includes('coriander') || lower.includes('dhania')) updates.product_name = 'Coriander Seeds';
  else if (lower.includes('black pepper')) updates.product_name = 'Product pending';
  else if (lower.includes('turmeric')) updates.product_name = 'Turmeric Powder';
  else if (lower.includes('rice')) updates.product_name = 'Rice';

  const quantityMatch = text.match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|mt|metric tons?|tonnes?|tons?|bags?|cartons?|containers?|pounds?|lbs|liters?|litres?|units?)\b/i);
  if (quantityMatch) {
    const unitToken = quantityMatch[2].toLowerCase();
    updates.quantity = quantityMatch[1];
    updates.unit_of_measure = unitToken.includes('kg') || unitToken.includes('kilogram')
      ? 'kg'
      : unitToken.includes('mt') || unitToken.includes('metric')
        ? 'MT'
        : unitToken.includes('ton')
          ? 'Ton'
          : unitToken.includes('bag')
            ? 'Bags'
            : unitToken.includes('carton')
              ? 'Cartons'
              : unitToken.includes('container')
                ? 'Containers'
                : unitToken.includes('pound') || unitToken.includes('lb')
                  ? 'Pounds'
                  : unitToken.includes('liter') || unitToken.includes('litre')
                    ? 'Liters'
                    : 'Units';
  }

  const incotermMatch = text.match(/\b(EXW|FOB|CFR|CIF|DAP|DDP)\b/i);
  if (incotermMatch) updates.incoterm = incotermMatch[1].toUpperCase();

  const countryMatch = matchPricingCountry(text);
  if (countryMatch) {
    updates.destination_country = countryMatch;
    updates.destination_port = pricingPortsByCountry[countryMatch]?.[0] || 'Main Commercial Port';
  }

  const portMatch = text.match(/(?:port|destination port)\s*[:\-]\s*([^\n,;]+)/i);
  if (portMatch?.[1]) updates.destination_port = portMatch[1].trim();

  const paymentMatch = pricingPaymentTerms
    .filter((term) => lower.includes(term.toLowerCase()))
    .sort((a, b) => b.length - a.length)[0];
  if (paymentMatch) updates.payment_terms = paymentMatch;
  else if (lower.includes('advance')) updates.payment_terms = 'Advance';
  else if (lower.includes('lc at sight') || lower.includes('l/c at sight')) updates.payment_terms = 'LC at Sight';
  else if (lower.includes('open account')) updates.payment_terms = 'Open Account';
  else if (lower.includes('after delivery')) updates.payment_terms = 'Payment After Delivery';
  else if (lower.includes('cad')) updates.payment_terms = 'Cash Against Documents (CAD)';
  else if (lower.includes('dp')) updates.payment_terms = 'Documents Against Payment (DP at Sight)';

  const currencyMatch = text.match(/\b(INR|USD|AUD|EUR|GBP|AED|SAR|SGD)\b/i);
  if (currencyMatch) updates.currency = currencyMatch[1].toUpperCase();

  const priceMatch = text.match(/(?:price|rate|buyer price|target price|required price)\D{0,18}(?:inr|rs\.?|₹)?\s*(\d+(?:\.\d+)?)/i)
    || text.match(/(?:₹|inr|rs\.?)\s*(\d+(?:\.\d+)?)(?:\s*\/?\s*(?:kg|per kg))?/i);
  if (priceMatch?.[1]) updates.market_reference_price = priceMatch[1];
  return updates;
}

function normalizePricingChannelField(field, value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (field === 'destination_country') return matchPricingCountry(text) || text;
  if (field === 'destination_port') return text;
  if (field === 'product_name') return parsePricingChannelMessage(text).product_name || text;
  if (field === 'unit_of_measure') return parsePricingChannelMessage(`1 ${text}`).unit_of_measure || text;
  if (field === 'incoterm') {
    const match = text.match(/\b(EXW|FOB|CFR|CIF|DAP|DDP)\b/i);
    return match ? match[1].toUpperCase() : text.toUpperCase();
  }
  if (field === 'payment_terms') return parsePricingChannelMessage(text).payment_terms || text;
  if (field === 'currency') return text.toUpperCase();
  if (field === 'quantity' || field === 'market_reference_price') return text.replace(/[^\d.]/g, '');
  return text;
}

function normalizePricingChannelUpdates(updates) {
  return Object.fromEntries(Object.entries(updates || {}).map(([field, value]) => [field, normalizePricingChannelField(field, value)]));
}

function buildDirectorCommercialPosition(inputs, calc) {
  const currency = String(inputs.currency || 'USD').toUpperCase();
  const totalCost = roundMoney(calc.totalLandedCost || 0);
  const recommendedQuote = roundMoney(calc.recommendedOfferPrice || 0);
  const recommendedProfit = roundMoney(recommendedQuote - totalCost);
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const buyerPriceInrPerKg = moneyNumber(inputs.buyer_entered_price);
  const buyerOfferTotalInr = buyerPriceInrPerKg && quantity.kg ? roundMoney(buyerPriceInrPerKg * quantity.kg) : 0;
  const buyerOfferTotal = buyerOfferTotalInr ? roundMoney(convertCurrency(buyerOfferTotalInr, 'INR', currency, moneyNumber(inputs.exchange_rate))) : 0;
  const buyerProfit = buyerOfferTotal ? roundMoney(buyerOfferTotal - totalCost) : null;
  const activeProfit = buyerProfit ?? recommendedProfit;
  const breakEvenPricePerKg = calc.breakEvenPricePerKg || (quantity.kg ? roundMoney(convertCurrency(totalCost, currency, 'INR', moneyNumber(inputs.exchange_rate)) / quantity.kg) : 0);
  const recommendedPricePerKgInr = calc.recommendedPricePerKgInr || roundMoney(breakEvenPricePerKg * 1.2);
  const buyerPriceState = buyerProfit === null
    ? 'empty'
    : buyerPriceInrPerKg < breakEvenPricePerKg
      ? 'loss'
      : buyerPriceInrPerKg === breakEvenPricePerKg
        ? 'break-even'
        : buyerPriceInrPerKg < recommendedPricePerKgInr
          ? 'low-margin'
          : 'safe';
  const lossAmount = activeProfit < 0 ? Math.abs(activeProfit) : 0;
  return {
    currency,
    totalCost,
    recommendedQuote,
    recommendedProfit,
    buyerOfferTotal,
    buyerProfit,
    buyerPriceInrPerKg,
    buyerPriceState,
    breakEvenPricePerKg,
    recommendedPricePerKgInr,
    activeProfit,
    lossAmount,
    isLoss: buyerPriceState === 'loss',
    basis: buyerProfit === null ? 'recommended quote' : 'buyer-required price'
  };
}

function formatProfitLossLine(value, currency) {
  const amount = currency === 'INR' ? formatInrZero(Math.abs(value || 0)) : formatMoney(Math.abs(value || 0), currency);
  if (value < 0) return `LOSS ${amount}`;
  if (value > 0) return `PROFIT ${amount}`;
  return `BREAK EVEN ${amount}`;
}

function buildDirectorPricingReviewNote(inputs, calc, risk, approvalReasons, channel = 'Pricing page') {
  const paymentRisk = getPaymentTermRisk(inputs.payment_terms);
  const position = buildDirectorCommercialPosition(inputs, calc);
  const reviewNeeded = approvalReasons.length || risk.decision !== 'QUOTE' || position.isLoss;
  const lossLine = position.isLoss
    ? `BIG RED ALERT: Loss order detected on ${position.basis}. Do not allow buyer release. Director can approve final override only after reviewing the loss amount and reason.`
    : `Commercial result: ${formatProfitLossLine(position.activeProfit, position.currency)} on ${position.basis}.`;
  return [
    `Director pricing review: ${reviewNeeded ? 'Review needed' : 'No blocking review detected'}`,
    lossLine,
    `Source: ${channel}`,
    `Buyer: ${inputs.company_name || 'Missing'}`,
    `Product: ${getDisplayProduct(inputs) || 'Missing'}`,
    `Quantity: ${inputs.quantity || 'Missing'} ${inputs.unit_of_measure || ''}`,
    `Destination: ${inputs.destination_country || 'Missing'} / ${inputs.destination_port || 'Port missing'}`,
    `Incoterm: ${inputs.incoterm || 'Missing'}`,
    `Payment terms: ${inputs.payment_terms || 'Missing'} (${paymentRisk.risk} risk)`,
    `Market/product cost: ${formatInrFixed(inputs.market_reference_price)}/kg`,
    `Entered buyer price: ${inputs.buyer_entered_price ? `${formatInrFixed(inputs.buyer_entered_price)}/kg` : 'No buyer price entered. Use recommended export price.'}`,
    `Total landed cost: ${formatMoney(position.totalCost, position.currency)}`,
    `Recommended quote: ${formatMoney(calc.recommendedOfferPrice, inputs.currency)}`,
    `Recommended quote result: ${formatProfitLossLine(position.recommendedProfit, position.currency)}`,
    `Buyer-required price result: ${position.buyerProfit === null ? 'Buyer price missing' : formatProfitLossLine(position.buyerProfit, position.currency)}`,
    `Margin: ${calc.margin.toFixed(2)}%`,
    `Reason: ${approvalReasons[0] || risk.reason || 'Commercial validation required before buyer-facing release.'}`
  ].map((line) => safeCfoString(line)).join('\n');
}

function clampPercent(value) {
  return Math.min(99, Math.max(0, moneyNumber(value)));
}

function moneyNumber(value) {
  const parsed = typeof value === 'number' ? value : Number(String(value || '').trim());
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function roundMoney(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

function formatMoney(value, currency = 'USD') {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPricingValue(value, currency = 'USD') {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return 'Awaiting calculation';
  return formatMoney(value, currency);
}

function formatDualPricingMoney(value, currency, exchangeRate) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return { primary: 'Awaiting calculation', secondary: 'Missing input' };
  return {
    primary: formatPricingValue(value, currency),
    secondary: formatPricingInrLive(convertCurrency(value, currency, 'INR', moneyNumber(exchangeRate)))
  };
}

function pricingOptionLabel(value) {
  if (value === 'PER_TON') return 'Per ton';
  if (value === 'PER_MT') return 'Per MT';
  if (value === 'PER_KG') return 'Per kg';
  if (value === 'PER_BAG') return 'Per bag';
  if (value === 'PER_CARTON') return 'Per carton';
  if (value === 'PER_CONTAINER') return 'Per container';
  if (value === 'PER_UNIT') return 'Per unit';
  if (value === 'PER_ORDER') return 'Fixed per order';
  if (value === 'PERCENT_PRODUCT_VALUE') return 'Percentage of Product Value';
  if (value === 'PERCENT_INVOICE_VALUE') return 'Percentage of Invoice Value';
  if (value === 'PERCENT_SHIPMENT_VALUE') return 'Percentage of Shipment Value';
  if (value === 'MARGIN_ON_SELLING_PRICE') return 'Margin on selling price';
  if (value === 'MARKUP_ON_COST') return 'Markup on cost';
  return value;
}

const cfoWorkspaceTabs = ['Overview', 'Quotations', 'Market Prices', 'Cash', 'Receivables', 'Payables', 'Margins', 'Risks', 'Payment Vault', 'Reports'];

function normalizeCfoVault(vault = {}) {
  return {
    ...vault,
    metrics: safeCfoArray(vault.metrics),
    recentPayments: safeCfoArray(vault.recentPayments),
    workflowSteps: safeCfoArray(vault.workflowSteps),
    auditLog: safeCfoArray(vault.auditLog)
  };
}

function normalizeCfoMarginAnalytics(value = {}) {
  return {
    ...value,
    byProduct: safeCfoArray(value.byProduct),
    riskyQuotes: safeCfoArray(value.riskyQuotes),
    freightImpact: safeCfoArray(value.freightImpact)
  };
}

function cfoErrorText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || error.code || String(error || '');
}

function cfoValueForColumn(row, column) {
  const label = String(column || '').toLowerCase();
  if (!row || typeof row !== 'object') return String(row || '');
  if (label.includes('company') || label.includes('buyer')) return row.company || row.company_name || row.buyer || row.buyer_name || row.vendor || 'Pending';
  if (label.includes('vendor')) return row.vendor || row.company || row.company_name || 'Vendor pending';
  if (label.includes('invoice')) return row.invoice || row.invoice_number || row.reference || row.id || 'Invoice pending';
  if (label.includes('amount') || label.includes('inr')) return formatCfoInr(row.amount ?? row.amount_inr ?? row.estimated_value ?? row.value);
  if (label.includes('status') || label.includes('state')) return row.status || row.approval_state || row.receipt_status || 'Pending';
  if (label.includes('category') || label.includes('module')) return row.category || row.linked_module || row.source_module || 'CFO Command';
  if (label.includes('date') || label.includes('due')) return formatLearningDate(row.created_at || row.paid_at || row.due_date || row.date);
  if (label.includes('actor')) return row.actor || row.owner || 'CFO Command';
  if (label.includes('event')) return row.event_type || row.event || row.action_type || 'Vault update';
  if (label.includes('note')) return row.safe_notes || row.notes || row.description || 'Receipt pending';
  if (label.includes('risk')) return row.type || row.risk_type || row.risk_level || 'Financial Risk';
  if (label.includes('description') || label.includes('reason')) return row.description || row.reason || 'No description recorded.';
  if (label.includes('product')) return row.product || row.product_name || 'Product pending';
  if (label.includes('margin')) return row.margin_percent || row.margin || '0%';
  if (label.includes('target')) return row.target_margin || row.target || 'Target pending';
  return row[column] ?? row[label] ?? Object.values(row).find((value) => value !== undefined && value !== null) ?? '';
}

function cfoRowToArray(row, columns = []) {
  if (Array.isArray(row)) return row;
  if (!row || typeof row !== 'object') return [String(row || '')];
  const safeColumns = safeCfoArray(columns);
  if (safeColumns.length) return safeColumns.map((column) => cfoValueForColumn(row, column));
  return Object.values(row).map((value) => String(value ?? ''));
}

const productIntelligencePresets = {
  pepper: {
    hsn: '0904',
    packing: ['25 KG PP bag', '50 KG jute bag', 'custom export carton'],
    grades: ['Grade A', 'FAQ', 'ASTA-ready review'],
    preparation: '7-14 days after packing and document readiness',
    shipment: 'Sea freight: 12-24 days to GCC depending port/booking',
    documents: ['HSN review', 'origin declaration', 'packing list', 'LUT invoice'],
    risks: ['moisture/quality variation', 'freight volatility', 'HSN/legal review required']
  },
  turmeric: {
    hsn: '0910',
    packing: ['25 KG PP bag', 'retail pack master carton', 'bulk powder bag'],
    grades: ['Finger', 'Powder', 'Curcumin review required'],
    preparation: '6-12 days after quality and packing confirmation',
    shipment: 'Sea freight: 10-22 days to GCC depending cut-off',
    documents: ['FSSAI/APEDA check if applicable', 'HSN review', 'origin review'],
    risks: ['claim sensitivity', 'color/curcumin variance', 'certification wording review']
  },
  chilli: {
    hsn: '0904 / 0910',
    packing: ['10 KG carton', '25 KG PP bag', 'buyer label pack'],
    grades: ['Stemless', 'Powder', 'ASTA/color review'],
    preparation: '7-15 days after quality lock and packaging',
    shipment: 'Sea freight: 12-25 days depending destination',
    documents: ['HSN review', 'quality declaration', 'origin declaration'],
    risks: ['aflatoxin/quality sensitivity', 'label claim review', 'freight assumptions']
  },
  cardamom: {
    hsn: '0908',
    packing: ['vacuum pouch', 'premium carton', 'buyer-approved pack'],
    grades: ['Small cardamom', 'Large cardamom', 'Buyer-approved grade'],
    preparation: '7-14 days after quality, aroma, and packing confirmation',
    shipment: 'Sea/air estimate depends value, moisture, and buyer route',
    documents: ['Spice Board review', 'HSN review', 'origin declaration'],
    risks: ['high-value handling', 'quality grade variation', 'classification review']
  },
  mustard: {
    hsn: '1207 / 0910',
    packing: ['25 KG PP bag', '50 KG bulk bag', 'buyer-specific packaging'],
    grades: ['Seed', 'Powder', 'Buyer-approved grade'],
    preparation: '6-12 days after cleaning, grading, and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['seed vs prepared spice classification', 'cleaning/quality variation', 'classification review']
  },
  fenugreek: {
    hsn: '0910 / 1207',
    packing: ['25 KG PP bag', '50 KG bulk bag', 'buyer-specific packaging'],
    grades: ['Seed', 'Powder', 'Buyer-approved grade'],
    preparation: '6-12 days after cleaning, grading, and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['seed vs powder classification', 'quality variation', 'classification review']
  },
  saffron: {
    hsn: '0910',
    packing: ['sealed retail pack', 'premium carton', 'buyer-approved pack'],
    grades: ['Whole stigma', 'Retail pack', 'Buyer-approved grade'],
    preparation: 'Depends on grade, lab/claim review, and packing confirmation',
    shipment: 'Air or secured sea estimate depends value and destination',
    documents: ['HSN review', 'origin declaration', 'quality declaration'],
    risks: ['high-value handling', 'adulteration/quality sensitivity', 'classification review']
  },
  vanilla: {
    hsn: '0905',
    packing: ['vacuum pouch', 'export carton', 'buyer-approved pack'],
    grades: ['Whole bean', 'Extract / processed', 'Buyer-approved grade'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea/air estimate depends value, moisture, and buyer route',
    documents: ['HSN review', 'quality declaration', 'origin declaration'],
    risks: ['high-value handling', 'quality/claim sensitivity', 'classification review']
  },
  cinnamon: {
    hsn: '0906',
    packing: ['10 KG carton', '25 KG bag', 'buyer label pack'],
    grades: ['Quills', 'Powder', 'Broken / chips'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['quality grade variation', 'label claim review', 'classification review']
  },
  clove: {
    hsn: '0907',
    packing: ['10 KG carton', '25 KG bag', 'bulk export pack'],
    grades: ['Whole', 'Powder', 'Buyer-approved grade'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['moisture variation', 'volatile market price', 'classification review']
  },
  'nutmeg-mace': {
    hsn: '0908',
    packing: ['10 KG carton', '25 KG bag', 'premium export pack'],
    grades: ['Nutmeg', 'Mace', 'Buyer-approved grade'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['quality grade variation', 'restricted market checks', 'classification review']
  },
  'seed-spice': {
    hsn: '0909',
    packing: ['25 KG PP bag', '50 KG bulk bag', 'buyer-specific packaging'],
    grades: ['Whole seed', 'Powder', 'Buyer-approved grade'],
    preparation: '6-12 days after cleaning, grading, and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['cleaning/quality variation', 'residue/lab review if applicable', 'classification review']
  },
  ginger: {
    hsn: '0910',
    packing: ['25 KG PP bag', 'carton', 'buyer-specific packaging'],
    grades: ['Whole', 'Dry', 'Powder'],
    preparation: '6-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-25 days depending destination',
    documents: ['HSN review', 'origin declaration', 'packing list'],
    risks: ['quality/claim sensitivity', 'moisture review', 'classification review']
  },
  garlic: {
    hsn: '0703 / 0712',
    packing: ['mesh bag', 'carton', 'buyer-specific packaging'],
    grades: ['Fresh', 'Dried', 'Powder / flakes'],
    preparation: '6-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate depends fresh/dried status and route',
    documents: ['HSN review', 'phytosanitary check if applicable', 'origin declaration'],
    risks: ['fresh vs dried classification', 'shelf-life risk', 'market access review']
  },
  rice: {
    hsn: '1006',
    packing: ['25 KG woven bag', '50 KG woven bag', 'retail master carton'],
    grades: ['Basmati', 'Non-basmati', 'Buyer-approved grade'],
    preparation: '7-14 days after stock, packing, and document readiness',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA/Basmati review if applicable', 'HSN review', 'origin declaration'],
    risks: ['quality/specification variance', 'buyer grade confirmation', 'classification review']
  },
  cashew: {
    hsn: '0801',
    packing: ['vacuum tin/carton', 'bulk carton', 'buyer-specific packaging'],
    grades: ['Kernels', 'Shell liquid', 'Cardanol'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'HSN review', 'origin declaration'],
    risks: ['grade sensitivity', 'value/quality claim review', 'classification review']
  },
  fruit: {
    hsn: 'Chapter 08 / 20',
    packing: ['fresh produce carton', 'processed food carton', 'buyer-specific packaging'],
    grades: ['Fresh', 'Processed', 'Buyer-approved grade'],
    preparation: 'Depends on fresh/processed status, cold chain, and inspection readiness',
    shipment: 'Cold chain or dry shipment depends product form and destination',
    documents: ['APEDA category review', 'phytosanitary/MRL check if applicable', 'HSN review'],
    risks: ['shelf-life/cold-chain risk', 'MRL/import regulation review', 'classification review']
  },
  vegetable: {
    hsn: 'Chapter 07 / 20',
    packing: ['fresh produce carton', 'processed food carton', 'buyer-specific packaging'],
    grades: ['Fresh', 'Processed', 'Buyer-approved grade'],
    preparation: 'Depends on fresh/processed status, cold chain, and inspection readiness',
    shipment: 'Cold chain or dry shipment depends product form and destination',
    documents: ['APEDA category review', 'phytosanitary/MRL check if applicable', 'HSN review'],
    risks: ['shelf-life/cold-chain risk', 'MRL/import regulation review', 'classification review']
  },
  meat: {
    hsn: 'Chapter 02 / 16',
    packing: ['frozen carton', 'chilled carton', 'buyer-specific packaging'],
    grades: ['Frozen', 'Chilled', 'Processed'],
    preparation: 'Requires plant, inspection, cold-chain, and destination compliance readiness',
    shipment: 'Cold chain shipment depends route and destination approvals',
    documents: ['APEDA animal product review', 'health certificate check', 'HSN review'],
    risks: ['cold chain', 'country import regulation', 'certification review']
  },
  poultry: {
    hsn: 'Chapter 02 / 16',
    packing: ['frozen carton', 'chilled carton', 'buyer-specific packaging'],
    grades: ['Frozen', 'Chilled', 'Processed'],
    preparation: 'Requires plant, inspection, cold-chain, and destination compliance readiness',
    shipment: 'Cold chain shipment depends route and destination approvals',
    documents: ['APEDA animal product review', 'health certificate check', 'HSN review'],
    risks: ['cold chain', 'country import regulation', 'certification review']
  },
  dairy: {
    hsn: 'Chapter 04',
    packing: ['carton', 'bulk food-grade pack', 'buyer-specific packaging'],
    grades: ['Milk product', 'Powder', 'Processed dairy'],
    preparation: 'Depends on product form, shelf life, and destination regulation',
    shipment: 'Dry or cold chain shipment depends product form',
    documents: ['APEDA dairy product review', 'health/safety certificate check', 'HSN review'],
    risks: ['shelf-life', 'destination dairy regulation', 'classification review']
  },
  honey: {
    hsn: '0409',
    packing: ['jar carton', 'bulk food-grade drum', 'buyer-specific packaging'],
    grades: ['Natural honey', 'Processed honey', 'Buyer-approved grade'],
    preparation: 'Depends on lab, packing, and destination food-safety requirements',
    shipment: 'Sea/air estimate depends packaging, volume, and destination',
    documents: ['APEDA category review', 'food safety/lab check', 'HSN review'],
    risks: ['lab and residue sensitivity', 'label claim review', 'classification review']
  },
  sugar: {
    hsn: 'Chapter 17',
    packing: ['25 KG bag', '50 KG bag', 'buyer-specific packaging'],
    grades: ['Sugar', 'Jaggery', 'Sugar product'],
    preparation: '7-14 days after stock and packing confirmation',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'HSN review', 'origin declaration'],
    risks: ['commodity price volatility', 'country restrictions', 'classification review']
  },
  cocoa: {
    hsn: 'Chapter 18',
    packing: ['carton', 'bulk food-grade pack', 'buyer-specific packaging'],
    grades: ['Cocoa product', 'Chocolate', 'Buyer-approved grade'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'food safety check', 'HSN review'],
    risks: ['label/ingredient claim review', 'food safety review', 'classification review']
  },
  bakery: {
    hsn: 'Chapter 17 / 19 / 21',
    packing: ['retail carton', 'master carton', 'buyer-specific packaging'],
    grades: ['Confectionery', 'Biscuits', 'Bakery product'],
    preparation: 'Depends on recipe, label, shelf life, and food-safety readiness',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'label/ingredient review', 'HSN review'],
    risks: ['ingredient and label claims', 'destination food rules', 'classification review']
  },
  beverage: {
    hsn: 'Chapter 22',
    packing: ['bottle carton', 'bulk pack', 'buyer-specific packaging'],
    grades: ['Alcoholic', 'Non-alcoholic', 'Buyer-approved product'],
    preparation: 'Depends on product, labelling, and destination compliance readiness',
    shipment: 'Sea/air estimate depends product and destination regulation',
    documents: ['APEDA category review', 'label/compliance check', 'HSN review'],
    risks: ['licensing and destination regulation', 'label claim review', 'classification review']
  },
  nuts: {
    hsn: 'Chapter 08 / 12',
    packing: ['25 KG bag', 'carton', 'vacuum pack'],
    grades: ['Groundnut', 'Peanut', 'Walnut'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'aflatoxin/lab check if applicable', 'HSN review'],
    risks: ['aflatoxin/lab sensitivity', 'quality grade review', 'classification review']
  },
  'prepared-food': {
    hsn: 'Chapter 19 / 20 / 21',
    packing: ['retail carton', 'bulk carton', 'buyer-specific packaging'],
    grades: ['Pickle', 'Papad', 'Chutney', 'Prepared food'],
    preparation: 'Depends on recipe, packaging, label, and food safety readiness',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'label/ingredient review', 'HSN review'],
    risks: ['label and ingredient claims', 'destination food rules', 'classification review']
  },
  'guar-gum': {
    hsn: '1302',
    packing: ['25 KG bag', '50 KG bag', 'buyer-specific packaging'],
    grades: ['Food grade', 'Industrial grade', 'Buyer-approved grade'],
    preparation: '7-14 days after quality and packing confirmation',
    shipment: 'Sea freight estimate: 10-30 days depending destination',
    documents: ['APEDA category review', 'HSN review', 'origin declaration'],
    risks: ['grade/specification sensitivity', 'buyer application review', 'classification review']
  },
  floriculture: {
    hsn: 'Chapter 06 / 12',
    packing: ['fresh flower carton', 'seed pack', 'buyer-specific packaging'],
    grades: ['Floriculture product', 'Seeds', 'Buyer-approved grade'],
    preparation: 'Depends on product form, shelf life, and destination requirements',
    shipment: 'Cold chain/air freight may be required for fresh products',
    documents: ['APEDA category review', 'phytosanitary check if applicable', 'HSN review'],
    risks: ['shelf-life', 'phytosanitary requirements', 'classification review']
  },
  herbal: {
    hsn: 'Chapter 12 / 13',
    packing: ['25 KG bag', 'carton', 'buyer-specific packaging'],
    grades: ['Herbal plant', 'Medicinal plant', 'Processed extract'],
    preparation: 'Depends on botanical, claim language, and destination regulation',
    shipment: 'Sea/air estimate depends product form and destination',
    documents: ['APEDA category review', 'claim/compliance check', 'HSN review'],
    risks: ['medicinal claim sensitivity', 'destination regulation', 'classification review']
  },
  organic: {
    hsn: 'Product-specific',
    packing: ['certified organic pack', 'bulk carton', 'buyer-specific packaging'],
    grades: ['NPOP certified', 'Organic processed', 'Buyer-approved grade'],
    preparation: 'Depends on product and organic certification readiness',
    shipment: 'Shipment depends product form and destination requirements',
    documents: ['NPOP/organic certificate review', 'APEDA category review', 'HSN review'],
    risks: ['certificate validity', 'organic claim review', 'product-specific classification']
  },
  default: {
    hsn: 'Select product',
    packing: ['25 KG export bag', '50 KG bulk bag', 'buyer-specific packaging'],
    grades: ['Standard export grade', 'Premium grade', 'Buyer-approved grade'],
    preparation: '7-14 days after stock, packing, and document readiness',
    shipment: 'Sea freight estimate: 10-25 days depending port and carrier',
    documents: ['HSN review', 'origin review', 'commercial invoice', 'packing list', 'LUT invoice if applicable'],
    risks: ['missing product cost', 'freight confirmation', 'legal classification review']
  }
};

const incotermIntelligence = {
  EXW: {
    seller: 'Seller makes goods available at premises or agreed point.',
    buyer: 'Buyer handles inland movement, export clearance, freight, and insurance unless separately agreed.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Commission', 'Miscellaneous'],
    excluded: ['Inland Logistics', 'Export Clearance', 'Port Charges', 'Freight', 'Insurance'],
    invoice: 'Lower seller-side quote basis. Export execution responsibility must be clarified.',
    risk: 'High operational ambiguity if buyer is new or pickup/export clearance is unclear.'
  },
  FOB: {
    seller: 'Seller covers inland logistics until port/loading point and usually export clearance.',
    buyer: 'Buyer handles main international freight and insurance unless agreed.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Inland Logistics', 'Export Clearance', 'Port Charges', 'Commission', 'Miscellaneous'],
    excluded: ['Freight', 'Insurance'],
    invoice: 'Freight is generally excluded from quote value. Port/loading responsibilities must be clear.',
    risk: 'CFO should verify inland logistics, export clearance, and port charge assumptions.'
  },
  CFR: {
    seller: 'Seller includes freight to named destination port.',
    buyer: 'Buyer usually handles insurance and post-arrival costs.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Inland Logistics', 'Export Clearance', 'Port Charges', 'Freight', 'Commission', 'Miscellaneous'],
    excluded: ['Insurance'],
    invoice: 'Freight must be included in commercial quote value.',
    risk: 'Freight missing or volatile freight should trigger founder/CFO review.'
  },
  CIF: {
    seller: 'Seller includes freight and insurance to destination port.',
    buyer: 'Buyer handles destination clearance and onward delivery unless agreed.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Inland Logistics', 'Export Clearance', 'Port Charges', 'Freight', 'Insurance', 'Commission', 'Miscellaneous'],
    excluded: ['Destination customs/duties unless otherwise agreed'],
    invoice: 'Higher quote value expected because freight and insurance are included.',
    risk: 'CFO must verify freight and insurance assumptions before buyer-facing quotation.'
  },
  DAP: {
    seller: 'Seller carries logistics responsibility to named destination point.',
    buyer: 'Buyer usually handles import duties/taxes unless otherwise agreed.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Inland Logistics', 'Export Clearance', 'Port Charges', 'Freight', 'Insurance', 'Commission', 'Miscellaneous'],
    excluded: ['Import duties/taxes unless specified'],
    invoice: 'Operationally heavier quote. Delivery responsibility must be documented.',
    risk: 'High logistics exposure and destination-cost uncertainty.'
  },
  DDP: {
    seller: 'Seller carries maximum responsibility including destination delivery and duties if agreed.',
    buyer: 'Buyer receives goods at destination point.',
    included: ['Raw Material', 'Packaging', 'Processing', 'Labor', 'Overhead', 'Inland Logistics', 'Export Clearance', 'Port Charges', 'Freight', 'Insurance', 'Commission', 'Miscellaneous'],
    excluded: ['None by default; local taxes/duties must be validated manually'],
    invoice: 'Highest quote complexity. Do not release without founder/CFO review.',
    risk: 'Critical exposure for taxes, duties, and destination compliance.'
  }
};

function getProductIntelligence(productName) {
  const key = marketProductKey(productName);
  if (['cumin', 'coriander'].includes(key)) return productIntelligencePresets['seed-spice'];
  return productIntelligencePresets[key] || productIntelligencePresets.default;
}

function getAutoHsnLabel(productIntel, productName) {
  const hsn = productIntel?.hsn || 'Select product';
  if (!productName || hsn === 'Select product') return 'Select product';
  return hsn;
}

function getDisplayProduct(inputs) {
  return inputs.product_name === otherPricingOption ? inputs.custom_product_name : inputs.product_name;
}

function formatDualMoney(line, currency) {
  return `${formatPricingInr(line.line_total_inr)} / ${formatMoney(line.line_total, currency)}`;
}

function formatPricingInr(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatPricingInrLive(value) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) return 'Awaiting calculation';
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function getCfoApprovalReasons(inputs, calc, risk, costRows, productIntel) {
  const reasons = [];
  const targetMargin = moneyNumber(inputs.target_margin_percent);
  const quoteValueInr = convertCurrency(calc.recommendedOfferPrice, inputs.currency, 'INR', moneyNumber(inputs.exchange_rate));
  const commercialPosition = buildDirectorCommercialPosition(inputs, calc);
  const requiredRows = Object.fromEntries(costRows.map((row) => [row.key, row]));
  if (commercialPosition.isLoss) reasons.push(`BIG RED ALERT: Loss order detected. ${formatProfitLossLine(commercialPosition.activeProfit, commercialPosition.currency)} on ${commercialPosition.basis}. Do not release without Director final override.`);
  if (targetMargin < 20) reasons.push('Margin below 20% safe CFO threshold.');
  if (!moneyNumber(requiredRows.raw_material_cost?.amount)) reasons.push('Product cost missing.');
  if (criticalPricingFields(inputs.incoterm).includes('freight_cost') && !moneyNumber(requiredRows.freight_cost?.amount)) reasons.push('Freight missing for selected Incoterm.');
  if (criticalPricingFields(inputs.incoterm).includes('insurance_cost') && !moneyNumber(requiredRows.insurance_cost?.amount)) reasons.push('Insurance missing for selected Incoterm.');
  if (!productIntel.hsn || productIntel.hsn.includes('pending')) reasons.push('HSN is advisory/missing and requires founder/CA/export consultant review.');
  if (!String(inputs.destination_country || '').trim()) reasons.push('Destination/origin review incomplete.');
  if (quoteValueInr > 1500000) reasons.push('High value quote exceeds CFO founder-review threshold.');
  if (inputs.buyer_type === 'New') reasons.push('Unknown/new buyer requires founder visibility.');
  if (moneyNumber(inputs.exchange_rate) !== moneyNumber(defaultPricingInputs.exchange_rate)) reasons.push('Manual exchange rate override used.');
  if (risk.decision !== 'QUOTE') reasons.push(risk.reason);
  return [...new Set(reasons)];
}

function PricingEnginePage({ onBack, onOpenApprovalWall, onOpenTasks }) {
  const { rates, status: forexStatus } = useLiveForexRates();
  const [activeTab, setActiveTab] = useState('Quotations');
  const [inputs, setInputs] = useState(defaultPricingInputs);
  const [costRows, setCostRows] = useState(() => buildAiAssistedCostRows(defaultPricingInputs));
  const [errors, setErrors] = useState({});
  const [audit, setAudit] = useState(pricingAuditEvents);
  const [message, setMessage] = useState('CFO Pricing Engine ready.');
  const [liveMarketPrices, setLiveMarketPrices] = useState({});
  const [priceLoadStatus, setPriceLoadStatus] = useState('loading'); // loading | live | stale | reference
  const [cfoData, setCfoData] = useState(() => ({
    dashboard: null,
    weeklyPnl: null,
    monthlyPnl: null,
    recurringPayments: [],
    summary: null,
    marginAnalytics: null,
    receivables: cfoFinanceData.receivablesRows,
    payables: cfoFinanceData.payableRows,
    paymentVault: null,
    risks: cfoFinanceData.riskRows,
    renewals: cfoFinanceData.cashRows,
    loading: true,
    error: ''
  }));
  const [cfoOutput, setCfoOutput] = useState('');
  const calc = useMemo(() => calculatePricing(inputs, costRows), [inputs, costRows]);
  const risk = useMemo(() => getPricingRisk(inputs, calc, costRows), [inputs, calc, costRows]);
  const productIntel = useMemo(() => getProductIntelligence(getDisplayProduct(inputs)), [inputs.product_name, inputs.custom_product_name]);
  const approvalReasons = useMemo(() => getCfoApprovalReasons(inputs, calc, risk, costRows, productIntel), [inputs, calc, risk, costRows, productIntel]);
  const founderReviewStatus = approvalReasons.length ? 'Director Review Required' : 'CFO Review Ready';

  // Fetch live market prices from CFO Market Prices table
  useEffect(() => {
    fetch('/api/prices/market')
      .then(r => r.json())
      .then(d => {
        if (!d.ok) return;
        setLiveMarketPrices(d.prices || {});
        const hasLive = Object.values(d.prices || {}).some(p => !p.is_fallback && !p.stale);
        const hasStale = Object.values(d.prices || {}).some(p => !p.is_fallback && p.stale);
        setPriceLoadStatus(hasLive ? 'live' : hasStale ? 'stale' : 'reference');
      })
      .catch(() => setPriceLoadStatus('reference'));
  }, []);

  // When product changes, auto-fill raw material cost from live market price
  useEffect(() => {
    const pKey = marketProductKey(getDisplayProduct(inputs));
    const lp = liveMarketPrices[pKey];
    if (lp?.price_inr_per_kg) {
      const newPrice = String(lp.price_inr_per_kg);
      if (inputs.market_reference_price !== newPrice) {
        setInputs(prev => ({ ...prev, market_reference_price: newPrice }));
        setCostRows(prev => prev.map(r =>
          r.key === 'raw_material_cost'
            ? { ...r, amount: lp.price_inr_per_kg, notes: `Live: ${lp.source || 'CFO Market Prices'}${lp.stale ? ' (stale — update in Market Prices tab)' : ''}` }
            : r
        ));
      }
    }
  }, [inputs.product_name, inputs.custom_product_name, liveMarketPrices]);

  useEffect(() => {
    let active = true;
    async function loadCfoWorkspace() {
      try {
        const [dashboard, weeklyPnl, monthlyPnl, recurringPayments, summary, margins, receivables, payables, paymentVault, risks, renewals] = await Promise.all([
          getCFODashboard(demoTenantId),
          getWeeklyProfit(demoTenantId),
          getMonthlyProfit(demoTenantId),
          getRecurringPayments(demoTenantId),
          getCFOSummary(demoTenantId),
          getMarginAnalytics(demoTenantId),
          getReceivables(demoTenantId),
          getPayables(demoTenantId),
          getPaymentVaultSummary(demoTenantId),
          getFinancialRisks(demoTenantId),
          getRenewalForecast(demoTenantId)
        ]);
        if (!active) return;
        const marginData = margins.data || {};
        const paymentVaultData = paymentVault.data || {};
        const serviceErrors = [
          dashboard.error,
          weeklyPnl.error,
          monthlyPnl.error,
          recurringPayments.error,
          summary.error,
          margins.error,
          receivables.error,
          payables.error,
          paymentVault.error,
          risks.error,
          renewals.error
        ].filter(Boolean).map((error) => safeCfoString(error));
        setCfoData({
          dashboard: dashboard.data,
          weeklyPnl: weeklyPnl.data,
          monthlyPnl: monthlyPnl.data,
          recurringPayments: safeCfoArray(recurringPayments.data),
          summary: summary.data,
          marginAnalytics: {
            ...marginData,
            byProduct: safeCfoArray(marginData.byProduct),
            riskyQuotes: safeCfoArray(marginData.riskyQuotes),
            freightImpact: safeCfoArray(marginData.freightImpact)
          },
          receivables: safeCfoArray(receivables.data),
          payables: safeCfoArray(payables.data),
          paymentVault: {
            ...paymentVaultData,
            recentPayments: safeCfoArray(paymentVaultData.recentPayments),
            metrics: safeCfoArray(paymentVaultData.metrics),
            workflowSteps: safeCfoArray(paymentVaultData.workflowSteps),
            auditLog: safeCfoArray(paymentVaultData.auditLog)
          },
          risks: safeCfoArray(risks.data),
          renewals: safeCfoArray(renewals.data),
          loading: false,
          error: safeCfoJoin(serviceErrors, ' ')
        });
      } catch (error) {
        if (!active) return;
        setCfoData((current) => ({ ...current, loading: false, error: error.message || 'CFO service unavailable. Unavailable active.' }));
      }
    }
    loadCfoWorkspace();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setCostRows((rows) => mergeAiAssistedCostRows(rows, inputs));
  }, [
    inputs.product_name,
    inputs.custom_product_name,
    inputs.quantity,
    inputs.unit_of_measure,
    inputs.destination_country,
    inputs.shipping_mode,
    inputs.incoterm,
    inputs.cost_currency,
    inputs.exchange_rate,
    inputs.market_reference_price
  ]);

  function updateInput(field, value) {
    setInputs((current) => {
      const next = { ...current, [field]: value };
      if (field === 'destination_country') {
        const ports = pricingPortsByCountry[value] || ['Main Commercial Port'];
        next.destination_port = ports[0];
      }
      if (field === 'product_name') {
        const key = marketProductKey(value);
        if (pricingMarketFallbacks[key]) next.market_reference_price = String(pricingMarketFallbacks[key]);
        next.spice_grade_or_spec = getProductGradeSourceMatch(value);
      }
      if (['product_name', 'custom_product_name', 'market_reference_price'].includes(field)) {
        next.notes = buildMarketCheckNote(next);
      }
      return next;
    });
    if (field === 'incoterm') {
      const included = incotermIncludedCostKeys(value);
      setCostRows((rows) => rows.map((row) => ({ ...row, included: included.has(row.key) })));
    }
    if (field === 'cost_currency') {
      setCostRows((rows) => rows.map((row) => ({ ...row, currency: value })));
    }
    if (field === 'currency') {
      setErrors((current) => ({ ...current, currency: '' }));
    }
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function updateCostRow(key, patch) {
    setCostRows((rows) => rows.map((row) => row.key === key ? { ...row, ...patch } : row));
  }

  async function validateAndRun(action) {
    const required = {
      product_name: 'Product is required.',
      quantity: 'Quantity is required.',
      destination_country: 'Country is required.',
      destination_port: 'Destination port is required.',
      target_margin_percent: 'Target margin is required.',
      minimum_margin_percent: 'Minimum margin is required.'
    };
    const nextErrors = {};
    Object.entries(required).forEach(([field, error]) => {
      if (!String(inputs[field] || '').trim()) nextErrors[field] = error;
    });
    risk.missingCriticalFields.forEach((field) => {
      if (!nextErrors[field]) nextErrors[field] = `${field.replaceAll('_', ' ')} is required by old pricing logic.`;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      await createTaskFromWorkflow({
        tenant_id: demoTenantId,
        title: 'Complete missing pricing cost input',
        description: 'Pricing Engine detected missing required fields before quote can move forward.',
        workflow_source: 'Pricing Engine',
        linked_record_id: inputs.quote_number || 'Pricing draft',
        linked_label: getDisplayProduct(inputs) || 'Draft quote',
        linked_route: '/export-os/pricing-engine',
        department: 'Finance',
        owner_command: 'CFO Command',
        assigned_role: 'CFO',
        priority: 'High',
        status: 'Blocked',
        due_date: 'Today',
        blocking_reason: safeCfoJoin(Object.values(nextErrors), ' '),
        next_action: 'Complete cost input, freight/insurance requirements, and rerun pricing validation.',
        buyer: inputs.company_name || 'Draft buyer',
        product: getDisplayProduct(inputs)
      });
      return false;
    }
    if (approvalReasons.length) {
      await createTaskFromWorkflow({
        tenant_id: demoTenantId,
        title: approvalReasons.some((item) => item.toLowerCase().includes('margin')) ? 'Review low-margin quotation' : 'Review pricing approval trigger',
        description: 'Pricing Engine detected approval conditions that must be reviewed before buyer-facing quote output.',
        workflow_source: 'Pricing Engine',
        linked_record_id: inputs.quote_number || 'Pricing draft',
        linked_label: getDisplayProduct(inputs) || 'Draft quote',
        linked_route: '/export-os/pricing-engine',
        department: 'Finance',
        owner_command: 'CFO Command',
        assigned_role: 'CFO',
        priority: approvalReasons.some((item) => item.toLowerCase().includes('high value') || item.toLowerCase().includes('hold')) ? 'Critical' : 'High',
        status: 'Waiting Review',
        due_date: 'Today',
        blocking_reason: safeCfoJoin(approvalReasons, ' '),
        next_action: 'CFO must review margin, freight, buyer risk, and founder approval route.',
        buyer: inputs.company_name || 'Draft buyer',
        product: getDisplayProduct(inputs)
      });
    }
    setAudit((current) => [{ id: `pricing-audit-${Date.now()}`, time: 'Now', event: action, actor: 'Pricing Engine', status: 'Draft Prepared' }, ...current]);
    await createAuditLog({
      tenant_id: demoTenantId,
      action_type: action === 'Quote sent' ? 'Quote sent' : 'Quote created',
      module: 'Pricing Engine',
      related_table: 'quote_drafts',
      related_record_id: inputs.quote_number || null,
      actor: 'Pricing Engine',
      description: `${action} for ${inputs.company_name || 'draft buyer'} / ${getDisplayProduct(inputs) || 'draft product'}.`,
      new_value: {
        buyer: inputs.company_name,
        product: getDisplayProduct(inputs),
        recommended_offer_price: calc.recommendedOfferPrice,
        currency: inputs.currency,
        margin: calc.margin
      },
      risk_level: approvalReasons.length ? 'High' : 'Low'
    });
    await createAuditLog({
      tenant_id: demoTenantId,
      action_type: 'Price changed',
      module: 'Pricing Engine',
      related_table: 'quote_drafts',
      related_record_id: inputs.quote_number || null,
      actor: 'Pricing Engine',
      description: `Recommended quote recalculated at ${formatCurrencyZero(calc.recommendedOfferPrice, inputs.currency)}.`,
      new_value: {
        recommended_offer_price: calc.recommendedOfferPrice,
        safe_quote_price: calc.safeQuotePrice,
        aggressive_quote_price: calc.aggressiveQuotePrice,
        currency: inputs.currency
      },
      risk_level: approvalReasons.length ? 'High' : 'Low'
    });
    if (calc.margin < moneyNumber(inputs.minimum_margin_percent)) {
      await createAuditLog({
        tenant_id: demoTenantId,
        action_type: 'Discount requested',
        module: 'Pricing Engine',
        related_table: 'quote_drafts',
        related_record_id: inputs.quote_number || null,
        actor: 'CFO Command',
        description: `Margin ${calc.margin.toFixed(2)}% is below minimum ${inputs.minimum_margin_percent}%.`,
        new_value: { margin: calc.margin, minimum_margin_percent: inputs.minimum_margin_percent },
        risk_level: 'High'
      });
    }
    setMessage(action === 'Quote sent' ? 'Quote sent audit recorded. No external send was executed from this UI.' : `${action} completed in local UI. No quotation was released.`);
    return true;
  }

  function recordChannelPricingIntake(channel, missingFields, updates) {
    const updateLabels = safeCfoJoin(Object.keys(updates || {}).map((key) => key.replaceAll('_', ' ')), ', ') || 'no fields';
    setAudit((current) => [{ id: `pricing-channel-${Date.now()}`, time: 'Now', event: `${channel} pricing intake applied`, actor: channel, status: missingFields.length ? 'Clarification Needed' : 'Calculated' }, ...current]);
    setMessage(missingFields.length
      ? `${channel} intake checked. Missing fields: ${safeCfoJoin(safeCfoArray(missingFields).map((field) => field.label), ', ')}.`
      : `${channel} intake applied (${updateLabels}). Pricing recalculated immediately in the result panel.`);
  }

  async function routePricingApproval(reason = 'Director review required for pricing workflow.') {
    const ok = await validateAndRun('Director review request created');
    if (!ok) return;
    const productName = inputs.product_name === otherPricingOption ? inputs.custom_product_name : inputs.product_name;
    await createApprovalRequest({
      tenant_id: demoTenantId,
      request_type: 'Pricing Exception',
      title: `${productName || 'Quote'} pricing requires Director review`,
      department: 'Finance',
      executive_owner: 'CFO Command',
      buyer_name: inputs.company_name || 'Draft buyer',
      related_workflow_id: null,
      risk_level: risk.decision === 'HOLD' ? 'Critical' : risk.decision === 'FOUNDER_REVIEW' ? 'High' : 'Medium',
      priority: risk.decision === 'HOLD' ? 'Critical' : 'High',
      status: 'Director Review Required',
      summary: reason,
      source_module: 'pricing-engine',
      category: 'Financial',
      amount: formatMoney(calc.recommendedOfferPrice, inputs.currency),
      details: {
        workflow_source: 'Pricing Engine',
        product: productName,
        quantity: `${inputs.quantity} ${inputs.unit_of_measure}`,
        destination: `${inputs.destination_country} / ${inputs.destination_port}`,
        incoterm: inputs.incoterm,
        risk_reason: risk.reason,
        operational_impact: 'Quote cannot move to Draft Quote Ready until Director decision.',
        cfo_notes: `Margin ${calc.margin.toFixed(2)}% / minimum ${inputs.minimum_margin_percent}%.`,
        coo_notes: 'Operational availability and logistics assumptions remain advisory.'
      }
    });
    await createTaskFromWorkflow({
      tenant_id: demoTenantId,
      title: 'Director review required for pricing workflow',
      description: 'Pricing workflow created Director review request. Quote output remains blocked until decision.',
      workflow_source: 'Director Queue',
      linked_record_id: inputs.quote_number || 'Pricing approval',
      linked_label: getDisplayProduct(inputs) || 'Draft quote',
      linked_route: '/export-os/director',
      department: 'Director Office',
      owner_command: 'Director',
      assigned_role: 'Director',
      priority: risk.decision === 'HOLD' ? 'Critical' : 'High',
      status: 'Waiting Director Review',
      due_date: 'Today',
      blocking_reason: reason,
      next_action: 'Director must approve, reject, or request revision in Director Queue.',
      buyer: inputs.company_name || 'Draft buyer',
      product: productName
    });
    setMessage('Approval request created and routed to Director Command Center.');
    onOpenApprovalWall();
  }

  const handleCfoTabChange = React.useCallback((tab) => setActiveTab(tab), []);
  const handleOpenPricingTab = React.useCallback(() => setActiveTab('Quotations'), []);
  const handleOpenPaymentVaultTab = React.useCallback(() => setActiveTab('Payment Vault'), []);
  const handleGenerateCfoReport = React.useCallback(async () => {
    const response = await generateCFOReport(demoTenantId);
    setCfoOutput(response.data || 'CFO report could not be generated.');
  }, []);
  const handleGenerateFounderFinancialSummary = React.useCallback(async () => {
    const response = await generateFounderFinancialSummary(demoTenantId);
    setCfoOutput(response.data || 'Founder financial summary could not be generated.');
  }, []);
  const handleInitiateCfoPayment = React.useCallback(async (payload) => {
    const response = await initiatePayment(payload, demoTenantId);
    const status = response.data?.status || 'Payment request processed';
    const label = status === 'Auto-Paid'
      ? 'Auto-Paid Done'
      : status.includes('Director')
        ? 'Escalated to Director'
        : 'Sent to Slack for approval';
    setCfoOutput(`${label}\nVendor: ${response.data?.vendor || payload.vendor}\nAmount: ${formatInrValue(response.data?.amount ?? payload.amount)}\nStatus: ${status}`);
    return { ...response, label };
  }, []);
  const handleSendCfoReportSlack = React.useCallback(async () => {
    const report = cfoOutput || (await generateCFOReport(demoTenantId)).data;
    const response = await sendSlackNotification({
      type: 'High Priority Alert',
      priority: 'INFO',
      reference: 'CFO-REPORT',
      status: 'CFO report generated',
      actionRequired: report,
      source: 'CFO Command'
    });
    setCfoOutput(response.ok ? `${report}\n\nSlack: CFO report sent.` : `${report}\n\nSlack: report delivery failed safely.`);
  }, [cfoOutput]);

  return (
    <ExportOSShell className="operational-export-shell pricing-engine-shell cfo-grade-pricing-shell">
      <PricingEngineHeader onBack={onBack} rates={rates} onOpenTasks={onOpenTasks} />
      <section className="cfo-pricing-toolbar">
        {cfoWorkspaceTabs.map((tab) => <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => handleCfoTabChange(tab)}>{tab}</button>)}
      </section>
      {activeTab !== 'Quotations' && (
        <section className="cfo-pricing-controlbar">
          <div><span>Buyer</span><strong>{inputs.company_name || 'Draft buyer'}</strong></div>
          <div><span>Product</span><strong>{getDisplayProduct(inputs) || 'Select product'}</strong></div>
          <div><span>Destination</span><strong>{inputs.destination_country || 'Select'} / {inputs.destination_port || 'Port pending'}</strong></div>
          <div><span>Incoterm</span><strong>{inputs.incoterm}</strong></div>
          <div><span>Currency</span><strong>{inputs.currency}</strong></div>
          <StatusBadge label={founderReviewStatus} state={approvalReasons.length ? 'attention' : 'progress'} />
        </section>
      )}
      {activeTab === 'Quotations' ? (
        <>
          {priceLoadStatus === 'reference' && (
            <div style={{ margin: '0 0 4px 0', padding: '8px 16px', background: '#7f1d1d', color: '#fca5a5', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <span><strong>Using reference prices only</strong> — raw material costs are estimates. Go to <strong>Market Prices</strong> tab and enter today's actual purchase price for accurate quotes.</span>
            </div>
          )}
          {priceLoadStatus === 'stale' && (
            <div style={{ margin: '0 0 4px 0', padding: '8px 16px', background: '#78350f', color: '#fcd34d', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⚠️</span>
              <span><strong>Market prices are stale (&gt;7 days)</strong> — update in the <strong>Market Prices</strong> tab before quoting.</span>
            </div>
          )}
          {priceLoadStatus === 'live' && (
            <div style={{ margin: '0 0 4px 0', padding: '8px 16px', background: '#14532d', color: '#86efac', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>✅</span>
              <span><strong>Live market prices loaded</strong> — raw material cost is using your CFO-entered price.</span>
            </div>
          )}
          <QuotationSopPricingPage
            inputs={inputs}
            errors={errors}
            costRows={costRows}
            calc={calc}
            rates={rates}
            risk={risk}
            approvalReasons={approvalReasons}
            updateInput={updateInput}
            updateCostRow={updateCostRow}
            onRun={validateAndRun}
            onRouteDirectorReview={routePricingApproval}
            onChannelApplied={recordChannelPricingIntake}
          />
        </>
      ) : (
        <section className="cfo-command-workspace">
          <main>
            <CfoTabWorkspace
              tab={activeTab}
              data={cfoData}
              reportOutput={cfoOutput}
              onOpenPricing={handleOpenPricingTab}
              onOpenPaymentVault={handleOpenPaymentVaultTab}
              onGenerateReport={handleGenerateCfoReport}
              onGenerateFounderSummary={handleGenerateFounderFinancialSummary}
              onInitiatePayment={handleInitiateCfoPayment}
              onSendReportSlack={handleSendCfoReportSlack}
            />
          </main>
          <CfoIntelligencePanel data={cfoData} onOpenPricing={handleOpenPricingTab} onOpenPaymentVault={handleOpenPaymentVaultTab} />
        </section>
      )}
      <div className="vault-action-status pricing-status-line"><StatusPulse /><span>{message}</span></div>
    </ExportOSShell>
  );
}

function QuotationSopPricingPage({ inputs, errors, costRows, calc, rates, risk, approvalReasons, updateInput, updateCostRow, onRun, onRouteDirectorReview, onChannelApplied }) {
  const ports = inputs.destination_country && inputs.destination_country !== otherPricingOption ? pricingPortsByCountry[inputs.destination_country] || ['Main Commercial Port'] : [];
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const costContext = getCostLineContext(inputs, costRows);
  const enteredMarketPrice = moneyNumber(inputs.market_reference_price);
  const sourceMarketPrice = getAutoMarketSourcePrice(inputs);
  const rateUpdated = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const usdInrRate = rates.find((rate) => rate.pair === 'USD/INR')?.rate || inputs.exchange_rate;
  const visibleRows = costRows.filter((row) => row.key !== 'misc_cost');
  const productName = getDisplayProduct(inputs);
  const productIntel = getProductIntelligence(productName);
  const autoHsnCode = getAutoHsnLabel(productIntel, productName);
  const paymentRisk = getPaymentTermRisk(inputs.payment_terms);
  const [channel, setChannel] = useState('Slack');
  const [channelMessage, setChannelMessage] = useState('');
  const [channelAnalysis, setChannelAnalysis] = useState(null);
  const [clarificationValues, setClarificationValues] = useState({});
  const directorCommercialPosition = buildDirectorCommercialPosition(inputs, calc);
  const directorReviewNeeded = approvalReasons.length || risk.decision !== 'QUOTE';
  const directorReviewNote = buildDirectorPricingReviewNote(inputs, calc, risk, approvalReasons, channel);
  const pricingExplanation = buildPricingResultExplanation(inputs, calc, risk, directorCommercialPosition, approvalReasons);
  const runUsdMarketCheck = () => {
    updateInput('exchange_rate', String(usdInrRate));
    if (sourceMarketPrice) updateInput('market_reference_price', String(sourceMarketPrice));
  };
  const runDestinationMarketCheck = () => {
    const profile = getFreightProfile(inputs.destination_country);
    onChannelApplied?.('Destination market check', [], {
      destination_country: inputs.destination_country,
      destination_port: inputs.destination_port,
      shipping_mode: inputs.shipping_mode,
      lane_status: `${profile.zone} lane - ${profile.lead}`
    });
  };
  const liveSourceLabel = sourceMarketPrice ? `${formatInrFixed(sourceMarketPrice)}/kg` : 'Pending';
  const projectedIntakeInputs = channelAnalysis ? { ...inputs, ...(channelAnalysis.updates || {}), ...clarificationValues } : inputs;
  const currentMissingFields = channelAnalysis ? getPricingChannelMissingFields(projectedIntakeInputs) : [];
  const extractedFields = Object.entries(channelAnalysis?.updates || {}).filter(([, value]) => String(value || '').trim());

  function analyzeChannelIntake() {
    const updates = normalizePricingChannelUpdates(parsePricingChannelMessage(channelMessage));
    const projected = { ...inputs, ...updates };
    setClarificationValues({});
    setChannelAnalysis({
      channel,
      updates,
      missing: getPricingChannelMissingFields(projected),
      checkedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  function applyChannelIntake() {
    const updates = normalizePricingChannelUpdates({ ...(channelAnalysis?.updates || {}), ...clarificationValues });
    Object.entries(updates).forEach(([field, value]) => {
      if (String(value || '').trim()) updateInput(field, value);
    });
    const missing = getPricingChannelMissingFields({ ...inputs, ...updates });
    setChannelAnalysis((current) => current ? { ...current, updates, missing, appliedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } : current);
    onChannelApplied?.(channelAnalysis?.channel || channel, missing, updates);
  }
  const includedKeys = incotermIncludedCostKeys(inputs.incoterm);
  const incotermCostLogic = [
    ['Freight', includedKeys.has('freight_cost')],
    ['Insurance', includedKeys.has('insurance_cost')],
    ['Export clearance', includedKeys.has('export_clearance_cost')],
    ['Inland logistics', includedKeys.has('inland_logistics_cost')]
  ];
  const aiRecommendations = [
    ['Freight estimate', getFreightProfile(inputs.destination_country).complexity > 1.3 ? 'Moderate to high lane sensitivity' : 'Moderate and manageable'],
    ['Insurance', includedKeys.has('insurance_cost') ? 'Included for this Incoterm' : 'Not included unless buyer requests CIF/DAP/DDP'],
    ['Margin safety', moneyNumber(inputs.target_margin_percent) < 20 ? 'Below safe threshold' : 'Within CFO guardrail'],
    ['Buyer risk', `${inputs.destination_country || 'Destination pending'} / ${inputs.buyer_risk_tier}`],
    ['Shipment timeline', getFreightProfile(inputs.destination_country).lead]
  ];

  return (
    <main className="quotation-sop-page">
      <section className="quotation-sop-section">
        <div className="quotation-section-title">
          <h2>Section 1 -- Inquiry Basics</h2>
          <p>Core inquiry details. Pricing result does not create or send a quotation.</p>
        </div>
        <div className="quotation-basics-grid">
          <QuoteTextField label="Company Name" value={inputs.company_name} error={errors.company_name} onChange={(value) => updateInput('company_name', value)} />
          <QuoteSelectField label="Product" value={inputs.product_name} options={[...pricingProducts, otherPricingOption]} error={errors.product_name} onChange={(value) => updateInput('product_name', value)} />
          <QuoteTextField label="Quantity" value={inputs.quantity} error={errors.quantity} onChange={(value) => updateInput('quantity', value.replace(/[^\d.]/g, ''))} />
          <QuoteSelectField label="Unit" value={inputs.unit_of_measure} options={pricingUnitOptions} error={errors.unit_of_measure} onChange={(value) => updateInput('unit_of_measure', value)} />
          <QuoteSelectField label="Incoterm" value={inputs.incoterm} options={['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP']} onChange={(value) => updateInput('incoterm', value)} />
          <QuoteSelectField label="Country" value={inputs.destination_country} options={pricingCountries} error={errors.destination_country} onChange={(value) => updateInput('destination_country', value)} />
          <QuoteSelectField label="Destination Port" value={inputs.destination_port} options={ports} error={errors.destination_port} onChange={(value) => updateInput('destination_port', value)} />
          <QuoteSelectField label="Buyer Risk Tier" value={inputs.buyer_risk_tier} options={['LOW', 'MEDIUM', 'HIGH', 'BLOCKED']} onChange={(value) => updateInput('buyer_risk_tier', value)} />
          <QuoteSelectField label="Buyer Type" value={inputs.buyer_type} options={['New', 'Repeat', 'Preferred', 'High Risk']} onChange={(value) => updateInput('buyer_type', value)} />
          <QuoteSelectField label="Payment Terms" value={inputs.payment_terms} options={pricingPaymentTerms} onChange={(value) => updateInput('payment_terms', value)} />
          <div className={`quote-static-field payment-risk-${paymentRisk.risk.toLowerCase()}`}>
            <span>Payment Risk Type</span>
            <strong>{paymentRisk.risk}</strong>
            <small>{paymentRisk.action}</small>
          </div>
          <div className="quote-auto-hsn-card">
            <span>Auto HSN Code</span>
            <strong>{autoHsnCode}</strong>
            <small>Fetched from selected product</small>
          </div>
          <QuoteTextField label="Market / Product Cost (INR/KG)" type="number" inputMode="decimal" value={inputs.market_reference_price} onChange={(value) => updateInput('market_reference_price', value.replace(/[^\d.]/g, ''))} />
          <QuoteTextField label="Buyer Entered Price (INR/KG)" type="number" inputMode="decimal" value={inputs.buyer_entered_price} onChange={(value) => updateInput('buyer_entered_price', value.replace(/[^\d.]/g, ''))} />
          <div className="quote-static-field quote-live-price-field">
            <span>Market Source</span>
            <strong><i />Live <b>{liveSourceLabel}</b></strong>
            <small>Used only as product/raw material cost. Buyer price is checked separately.</small>
          </div>
        </div>
        <div className="quote-incoterm-logic">
          {incotermCostLogic.map(([label, included]) => (
            <span key={label} className={included ? 'included' : 'excluded'}>{included ? 'Included' : 'Excluded'}: {label}</span>
          ))}
        </div>
      </section>

      <section className="quotation-sop-section">
        <div className="quotation-section-title">
          <h2>Section 2 -- Cost Inputs</h2>
          <p>Each row shows its basis and calculated line total. Incoterm excluded rows are disabled by default.</p>
        </div>
        <div className="quote-cost-table">
          <div className="quote-cost-head"><span>Cost Item</span><span>Amount</span><span>Currency</span><span>Basis</span><span>Included?</span><span>Line Total INR / Quote</span><span>Reference / Guidance</span></div>
          {visibleRows.map((row) => {
            const incotermDefault = incotermIncludedCostKeys(inputs.incoterm).has(row.key);
            const disabled = !incotermDefault;
            const basis = normalizeCostBasis(row.basis);
            const lineContext = contextForCostCurrency(costContext, row.currency, moneyNumber(inputs.exchange_rate));
            const enteredTotal = row.included ? costLineTotal(moneyNumber(row.amount), basis, quantity, lineContext) : 0;
            const totalInr = convertCurrency(enteredTotal, row.currency, 'INR', moneyNumber(inputs.exchange_rate));
            const totalQuote = convertCurrency(enteredTotal, row.currency, inputs.currency, moneyNumber(inputs.exchange_rate));
            const referenceGuidance = buildPrivateAiQuoteReference(row, inputs, disabled);
            return (
              <div className={disabled ? 'quote-cost-row disabled' : 'quote-cost-row'} key={row.key}>
                <strong>{row.label}</strong>
                <input disabled={disabled} inputMode="decimal" value={row.amount} onChange={(event) => updateCostRow(row.key, { amount: event.target.value.replace(/[^\d.]/g, ''), estimated: false, source: 'Manual / CFO' })} />
                <select disabled={disabled} value={row.currency} onChange={(event) => updateCostRow(row.key, { currency: event.target.value })}>{pricingCurrencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select>
                <select disabled={disabled} value={row.basis} onChange={(event) => updateCostRow(row.key, { basis: event.target.value, estimated: false })}>{pricingBasisOptions.map((option) => <option key={option} value={option}>{pricingOptionLabel(option)}</option>)}</select>
                <label className="quote-checkbox-cell">
                  <input type="checkbox" disabled={disabled} checked={Boolean(row.included)} onChange={(event) => updateCostRow(row.key, { included: event.target.checked })} />
                </label>
                <span className="quote-line-total"><b>{row.included ? formatInrZero(totalInr) : 'Excluded'}</b><small>{row.included ? formatCurrencyZero(totalQuote, inputs.currency) : 'Excluded by selected Incoterm'}</small></span>
                <div className="quote-private-ai-note" aria-label={`Private AI quote reference for ${row.label}`}>
                  <span>Benchmark basis: {referenceGuidance.basis}</span>
                  <strong>Range: {referenceGuidance.range}</strong>
                  <small>Source: {referenceGuidance.source}</small>
                  <small>Last checked: {referenceGuidance.pricedAt}</small>
                  <small>{referenceGuidance.advisory}</small>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="quotation-sop-section">
        <div className="quotation-section-title">
          <h2>Section 3 -- Margin + Currency</h2>
          <p>Currency and margin assumptions used for the result.</p>
        </div>
        <div className="quotation-margin-grid">
          <QuoteSelectField label="Quote Currency" value={inputs.currency} options={pricingCurrencyOptions} onChange={(value) => updateInput('currency', value)} />
          <QuoteSelectField label="Cost Currency" value={inputs.cost_currency} options={pricingCurrencyOptions} onChange={(value) => updateInput('cost_currency', value)} />
          <QuoteTextField label="1 USD = INR" value={inputs.exchange_rate} onChange={(value) => updateInput('exchange_rate', value.replace(/[^\d.]/g, ''))} />
          <button className="quote-secondary-button" type="button" onClick={() => updateInput('exchange_rate', String(usdInrRate))}>Refresh Rate</button>
          <QuoteSelectField label="Margin Type" value={inputs.margin_type} options={['MARGIN_ON_SELLING_PRICE', 'MARKUP_ON_COST']} onChange={(value) => updateInput('margin_type', value)} />
          <QuoteTextField label="Target %" value={inputs.target_margin_percent} error={errors.target_margin_percent} onChange={(value) => updateInput('target_margin_percent', value.replace(/[^\d.]/g, ''))} />
          <QuoteTextField label="Minimum %" value={inputs.minimum_margin_percent} error={errors.minimum_margin_percent} onChange={(value) => updateInput('minimum_margin_percent', value.replace(/[^\d.]/g, ''))} />
          <div className="quote-static-field"><span>Previous Customer Price</span><strong>{inputs.buyer_type === 'New' ? 'Hidden for new buyers.' : inputs.previous_customer_price || 'Not available'}</strong></div>
          <div className="quote-static-field"><span>Quantity Normalized</span><strong>{roundMoney(quantity.tons)} tons / {roundMoney(quantity.kg)} kg</strong></div>
          <div className="quote-static-field"><span>Rate Updated</span><strong>{rateUpdated}</strong></div>
        </div>
      </section>

      <section className="quotation-sop-section">
        <div className="quotation-section-title">
          <h2>Section 4 -- Result</h2>
          <p>Live pricing preview. Results update from product, quantity, destination, Incoterm, freight, FX, and margin inputs.</p>
        </div>
        <div className="quotation-result-grid">
          <QuoteResultCard label="Product Cost" value={formatInrZero(calc.productBaseCost)} note={formatRupeesInWords(calc.productBaseCost)} />
          <QuoteResultCard label="Total Cost" value={formatInrZero(calc.totalCostInr)} note={formatRupeesInWords(calc.totalCostInr)} />
          <QuoteResultCard label="Break-even Price" value={`${formatInrFixed(calc.breakEvenPricePerKg)} / kg`} note="Minimum price before profit." />
          <QuoteResultCard label="Recommended Price" value={`${formatInrFixed(calc.recommendedPricePerKgInr)} / kg`} note="20% markup on break-even cost." />
          <QuoteResultCard label="Rounded Quote Price" value={`${formatInrFixed(calc.roundedRecommendedPricePerKgInr)} / kg`} note="Use this for buyer quote." />
          <QuoteResultCard label="Recommended Total" value={formatInrZero(calc.recommendedTotalInr)} note={formatRupeesInWords(calc.recommendedTotalInr)} />
          <QuoteResultCard label="Recommended Profit" value={formatInrZero(calc.recommendedTotalInr - calc.totalCostInr)} note={formatRupeesInWords(calc.recommendedTotalInr - calc.totalCostInr)} />
          <QuoteResultCard label="Buyer Price Check" value={directorCommercialPosition.buyerProfit === null ? 'No buyer price' : formatProfitLossLine(directorCommercialPosition.buyerProfit, 'INR')} note={directorCommercialPosition.buyerProfit === null ? 'No buyer price entered. Use recommended export price.' : formatRupeesInWords(Math.abs(directorCommercialPosition.buyerProfit))} />
        </div>
        <div className="quote-pricing-safety-row">
          <StatusBadge label={risk.missingCriticalFields.length ? 'Manual review required' : 'Estimated'} state={risk.missingCriticalFields.length ? 'attention' : 'progress'} />
          <StatusBadge label="Founder approval required for final quote" state="attention" />
          <StatusBadge label="No buyer-facing quote sent" state="progress" />
        </div>
        <PricingResultExplanation explanation={pricingExplanation} />
        <ChargeSummaryCards rows={visibleRows} calc={calc} inputs={inputs} />
        <div className="quote-market-result">
          <span>Market Lookup Result</span>
          <strong><i />Live {liveSourceLabel} / Product cost used: {formatInrFixed(enteredMarketPrice)}/kg / manual source check required</strong>
        </div>
        <div className="quote-ai-recommendation-card">
          <div className="quotation-section-title">
            <h2>AI Recommendation</h2>
            <p>Internal guidance only. Verify supplier, freight, insurance, and founder approval before buyer release.</p>
          </div>
          <div>
            {aiRecommendations.map(([label, value]) => <span key={label}><b>{label}</b>{value}</span>)}
          </div>
        </div>
        <div className="quote-result-actions">
          <button type="button" className="quote-link-card" onClick={runUsdMarketCheck}>Check present USD price <ArrowUpRight size={14} /><small>Refresh FX and product reference price.</small></button>
          <button type="button" className="quote-link-card" onClick={runDestinationMarketCheck}>Destination market check <ArrowUpRight size={14} /><small>Refresh lane, freight, and demand note.</small></button>
        </div>
        <label className="quote-notes-field">
          <span>Buyer Interest and Pricing Notes</span>
          <textarea value={inputs.notes || ''} onChange={(event) => updateInput('notes', event.target.value)} />
        </label>
        <div className="quote-director-intake-grid">
          <article className={`quote-director-review-card ${directorReviewNeeded ? 'needs-review' : ''}`}>
            <div className="quote-intake-heading">
              <div>
                <span>Director Review Notes</span>
                <h3>{directorCommercialPosition.isLoss ? 'Loss order blocked - Director override only' : directorReviewNeeded ? 'Review needed before buyer release' : 'No director blocker detected'}</h3>
              </div>
              <strong>{directorCommercialPosition.isLoss ? 'Loss Alert' : directorReviewNeeded ? 'Review Required' : 'Monitoring'}</strong>
            </div>
            <div className={`quote-director-profit-alert ${directorCommercialPosition.isLoss ? 'loss' : 'profit'}`}>
              <span>{directorCommercialPosition.isLoss ? 'Big Red Alert' : 'Commercial Position'}</span>
              <strong>{formatProfitLossLine(directorCommercialPosition.activeProfit, directorCommercialPosition.currency)}</strong>
              <small>{directorCommercialPosition.isLoss ? 'Never allow loss order for buyer release. Director can approve final override only.' : `Based on ${directorCommercialPosition.basis}.`}</small>
            </div>
            <textarea readOnly value={directorReviewNote} />
            <div className="quote-intake-actions">
              <button type="button" onClick={() => navigator.clipboard?.writeText(directorReviewNote)}>Copy review text</button>
              <button type="button" onClick={() => onRouteDirectorReview?.(approvalReasons[0] || risk.reason || 'Director review requested from pricing notes.')}>Send to Director</button>
            </div>
          </article>

          <article className="quote-channel-intake-card">
            <div className="quote-intake-heading">
              <div>
                <span>Slack / WhatsApp Pricing Intake</span>
                <h3>Paste buyer request, then fill missing fields</h3>
              </div>
              <select value={channel} onChange={(event) => setChannel(event.target.value)}>
                <option value="Slack">Slack</option>
                <option value="WhatsApp">WhatsApp</option>
              </select>
            </div>
            <p>Daily briefing/update can use WhatsApp. Pricing operations should sync through Slack unless manually pasted here.</p>
            <textarea
              value={channelMessage}
              onChange={(event) => setChannelMessage(event.target.value)}
              placeholder={`Example: Buyer: Gulf Foods LLC, ${productName || 'Cumin Seeds'} ${inputs.quantity || '20'} ${inputs.unit_of_measure || 'Ton'}, ${inputs.destination_country || 'Country pending'}, ${inputs.incoterm || 'FOB'}, ${inputs.payment_terms || 'Advance'}, price INR ${inputs.market_reference_price || '230'}/kg`}
            />
            <div className="quote-intake-actions">
              <button type="button" onClick={analyzeChannelIntake}>Check message</button>
              <button type="button" onClick={applyChannelIntake} disabled={!channelAnalysis}>Apply + calculate now</button>
            </div>
            {channelAnalysis && (
              <div className="quote-channel-analysis">
                <div>
                  <span>Detected fields</span>
                  {extractedFields.length
                    ? extractedFields.map(([field, value]) => <strong key={field}>{field.replaceAll('_', ' ')}: {value}</strong>)
                    : <strong>No pricing fields detected yet.</strong>}
                </div>
                <div>
                  <span>Required from you</span>
                  {currentMissingFields.length
                    ? currentMissingFields.map((field) => (
                      <label key={field.field}>
                        <small>{field.label}</small>
                        <input
                          value={clarificationValues[field.field] || ''}
                          onChange={(event) => setClarificationValues((current) => ({ ...current, [field.field]: event.target.value }))}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      </label>
                    ))
                    : <strong>All core fields available. Price will update immediately.</strong>}
                </div>
              </div>
            )}
          </article>
        </div>
        <div className="quote-result-actions">
          <button className="quote-calculate-button" type="button" onClick={() => onRun('Validate Pricing')}>Validate Pricing</button>
          <button className="quote-secondary-button" type="button" onClick={() => onRun('Quote sent')}>Record Quote Sent</button>
        </div>
      </section>
    </main>
  );
}

function QuoteTextField({ label, value, error, onChange, type = 'text', inputMode }) {
  return (
    <label className={`quote-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <input type={type} inputMode={inputMode} value={value || ''} onChange={(event) => onChange(event.target.value)} />
      {error && <small>{error}</small>}
    </label>
  );
}

function QuoteSelectField({ label, value, options, error, onChange }) {
  return (
    <label className={`quote-field ${error ? 'has-error' : ''}`}>
      <span>{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{pricingOptionLabel(option)}</option>)}
      </select>
      {error && <small>{error}</small>}
    </label>
  );
}

function QuoteResultCard({ label, value, note }) {
  return <div className="quote-result-card"><span>{label}</span><strong>{value}</strong>{note && <small>{note}</small>}</div>;
}

function buildPricingResultExplanation(inputs, calc, risk, position, approvalReasons = []) {
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const currency = String(inputs.currency || 'INR').toUpperCase();
  const unitLabel = inputs.unit_of_measure || 'unit';
  const buyerPriceInrPerKg = moneyNumber(inputs.buyer_entered_price);
  const kgPerSelectedUnit = quantity.value ? quantity.kg / quantity.value : 1;
  const buyerPricePerSelectedUnitInr = roundMoney(buyerPriceInrPerKg * kgPerSelectedUnit);
  const buyerTotal = position.buyerOfferTotal || 0;
  const buyerProfit = position.buyerProfit;
  const lossAmount = buyerProfit !== null && buyerProfit < 0 ? Math.abs(buyerProfit) : 0;
  const reviewReasons = [
    position.buyerPriceState === 'empty' ? 'No buyer price entered. Use recommended export price.' : '',
    position.isLoss ? `Buyer-entered total is ${formatInrZero(lossAmount)} below total landed cost.` : '',
    position.buyerPriceState === 'break-even' ? 'Buyer price equals break-even. This gives zero margin.' : '',
    position.buyerPriceState === 'low-margin' ? `Buyer price is above break-even ${formatInrFixed(position.breakEvenPricePerKg)}/kg but below safe recommended price ${formatInrFixed(position.recommendedPricePerKgInr)}/kg.` : '',
    risk.paymentTermRisk?.risk === 'Medium' ? risk.paymentTermRisk.action : '',
    ...approvalReasons.slice(0, 2)
  ].filter(Boolean);
  const state = position.buyerPriceState === 'empty'
    ? 'empty'
    : position.isLoss
    ? 'loss'
    : position.buyerPriceState === 'break-even' || position.buyerPriceState === 'low-margin' || risk.confidence === 'MEDIUM' || risk.decision !== 'QUOTE'
      ? 'moderate'
      : 'profit';
  const headline = state === 'empty'
    ? 'No buyer price entered'
    : position.isLoss
    ? 'Loss on buyer-entered price'
    : state === 'moderate'
      ? 'Moderate review before release'
      : 'Profit on recommended price';
  const summary = state === 'empty'
    ? 'No buyer price entered. Use recommended export price.'
    : position.isLoss
    ? `Do not release. Buyer price total ${formatInrZero(buyerTotal)} is lower than landed cost ${formatInrZero(position.totalCost)}.`
    : state === 'moderate'
      ? `Numbers are calculated, but ${reviewReasons[0] || risk.reason || 'commercial review is still required before buyer release.'}`
      : `Recommended quote gives ${formatInrZero(calc.recommendedTotalInr - calc.totalCostInr)} profit at the confirmed 20% markup.`;

  return {
    state,
    headline,
    summary,
    reviewReasons,
    rows: [
      ['Quantity', `${formatPlainNumber(quantity.value)} ${unitLabel} = ${formatPlainNumber(quantity.kg)} kg`],
      ['Product cost', `${formatInrZero(calc.productBaseCost)} (${formatPlainNumber(calc.productBaseCost)} INR)`],
      ['Total landed cost', `${formatInrZero(calc.totalCostInr)} (${formatPlainNumber(calc.totalCostInr)} INR)`],
      ['Break-even price', `${formatInrFixed(calc.breakEvenPricePerKg)}/kg`],
      ['Recommended price', `${formatInrFixed(calc.recommendedPricePerKgInr)}/kg`],
      ['Rounded quote price', `${formatInrFixed(calc.roundedRecommendedPricePerKgInr)}/kg`],
      ['Recommended total', `${formatInrZero(calc.recommendedTotalInr)} (${formatPlainNumber(calc.recommendedTotalInr)} INR)`],
      ['Buyer-entered rate', buyerPriceInrPerKg ? `${formatInrFixed(buyerPriceInrPerKg)}/kg = ${formatInrFixed(buyerPricePerSelectedUnitInr)} / ${unitLabel}` : 'No buyer price entered'],
      ['Buyer-entered result', buyerProfit === null ? 'No buyer price entered. Use recommended export price.' : `${formatProfitLossLine(buyerProfit, 'INR')} (${formatPlainNumber(buyerProfit)} INR)`]
    ],
    formula: `Market/product cost is raw material only. Break-even = total cost ${formatInrZero(calc.totalCostInr)} / ${formatPlainNumber(quantity.kg)} kg = ${formatInrFixed(calc.breakEvenPricePerKg)}/kg. Recommended = break-even x 1.20 = ${formatInrFixed(calc.recommendedPricePerKgInr)}/kg.`
  };
}

function formatPlainNumber(value) {
  return Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function PricingResultExplanation({ explanation }) {
  return (
    <section className={`quote-result-explanation ${explanation.state}`} aria-label="Pricing result explanation">
      <div className="quote-result-explanation-head">
        <div>
          <span>{explanation.state === 'empty' ? 'Buyer price check' : explanation.state === 'loss' ? 'Loss check' : explanation.state === 'moderate' ? 'Review check' : 'Profit check'}</span>
          <h3>{explanation.headline}</h3>
          <p>{explanation.summary}</p>
        </div>
        <strong>{explanation.state === 'empty' ? 'Use recommended' : explanation.state === 'loss' ? 'Block release' : explanation.state === 'moderate' ? 'Verify first' : 'Calculated'}</strong>
      </div>
      <div className="quote-result-explanation-grid">
        {explanation.rows.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="quote-result-formula">
        <span>How this is calculated</span>
        <strong>{explanation.formula}</strong>
      </div>
      {explanation.reviewReasons.length > 0 && (
        <div className="quote-result-reasons">
          <span>Why review is required</span>
          {explanation.reviewReasons.map((reason) => <strong key={reason}>{reason}</strong>)}
        </div>
      )}
    </section>
  );
}

function ChargeSummaryCards({ rows, calc, inputs }) {
  const lineByKey = Object.fromEntries((calc.lines || []).map((line) => [line.key, line]));
  return (
    <div className="quote-charge-card-grid">
      {rows.map((row) => {
        const line = lineByKey[row.key] || {};
        const reference = buildPrivateAiQuoteReference(row, inputs, !line.included);
        const range = splitPricingRange(reference.range);
        const basis = pricingOptionLabel(line.basis || row.basis);
        const statusLabel = row.estimated ? 'Estimated' : 'Confirmed';
        return (
          <article className="quote-charge-card" key={`charge-${row.key}`}>
            <div>
              <span>Charge name</span>
              <strong>{row.label}</strong>
              <StatusBadge label={line.included ? statusLabel : 'Excluded'} state={line.included ? (row.estimated ? 'progress' : 'online') : 'idle'} />
            </div>
            <div>
              <span>Actual calculated total</span>
              <strong>{line.included ? formatDualMoney(line, inputs.currency) : 'Excluded by Incoterm'}</strong>
            </div>
            <div>
              <span>Calculation basis</span>
              <strong>{basis}</strong>
              <small>{line.basis === 'PER_ORDER' ? 'Fixed per order; not divided into kg/unit display.' : getBasisDisplayHint(line.basis || row.basis)}</small>
            </div>
            <div className="quote-charge-minmax">
              <span>Min value</span>
              <strong>{range.min}</strong>
              <span>Max value</span>
              <strong>{range.max}</strong>
            </div>
            <small>Last updated: {reference.pricedAt}</small>
          </article>
        );
      })}
    </div>
  );
}

function getBasisDisplayHint(basis) {
  const normalized = normalizeCostBasis(basis);
  if (normalized === 'PER_KG') return 'Per kg variable cost.';
  if (['PER_BAG', 'PER_CARTON', 'PER_CONTAINER', 'PER_MT', 'PER_TON'].includes(normalized)) return `${pricingOptionLabel(normalized)} variable cost.`;
  if (isPercentageCostBasis(normalized)) return 'Percentage-based cost.';
  return 'Per unit cost.';
}

function splitPricingRange(range) {
  const text = String(range || '').trim();
  if (!text) return { min: 'Not set', max: 'Not set' };
  const separatorIndex = text.indexOf('-');
  if (separatorIndex === -1) return { min: text, max: text };
  return {
    min: text.slice(0, separatorIndex).trim(),
    max: text.slice(separatorIndex + 1).trim()
  };
}

function formatInrZero(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

function formatInrFixed(value) {
  return `₹${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRupeesInWords(value) {
  const amount = Math.round(Math.abs(Number(value || 0)));
  if (!amount) return '(Zero Rupees Only)';
  return `(${numberToIndianWords(amount)} Rupees Only)`;
}

function numberToIndianWords(value) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const underHundred = (num) => {
    if (num < 20) return ones[num];
    return [tens[Math.floor(num / 10)], ones[num % 10]].filter(Boolean).join(' ');
  };
  const underThousand = (num) => {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    return [hundred ? `${ones[hundred]} Hundred` : '', rest ? underHundred(rest) : ''].filter(Boolean).join(' ');
  };
  const parts = [
    [Math.floor(value / 10000000), 'Crore'],
    [Math.floor((value % 10000000) / 100000), 'Lakh'],
    [Math.floor((value % 100000) / 1000), 'Thousand'],
    [value % 1000, '']
  ];
  return parts
    .filter(([num]) => num > 0)
    .map(([num, label]) => `${underThousand(num)}${label ? ` ${label}` : ''}`)
    .join(' ');
}

function formatCurrencyZero(value, currency = 'USD') {
  return `${currencySymbol(currency)}${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function currencySymbol(currency) {
  if (currency === 'USD') return '$';
  if (currency === 'INR') return '₹';
  if (currency === 'AED') return 'AED ';
  if (currency === 'EUR') return 'EUR';
  if (currency === 'GBP') return 'GBP';
  if (currency === 'AUD') return 'A$';
  return `${currency} `;
}

function buildMarketCheckNote(inputs) {
  const product = getDisplayProduct(inputs) || 'Product pending';
  const sourcePrice = getAutoMarketSourcePrice(inputs);
  const enteredPrice = Number(inputs.market_reference_price || 0);
  const referencePrice = sourcePrice || enteredPrice;
  return [
    '----- MARKET PRICE AUTO CHECK START -----',
    'MARKET PRICE CHECK',
    'Status: REFERENCE ESTIMATE',
    `Product: ${product}`,
    `Grade/source match: ${getProductGradeSourceMatch(product)}`,
    `Auto/source reference price: ${formatInrFixed(referencePrice)}/kg | ${formatInrFixed(referencePrice * 1000)}/ton`,
    `Product/raw material cost used: ${formatInrFixed(enteredPrice)}/kg`,
    'Manual source check required before buyer-facing quote.'
  ].map((line) => safeCfoString(line)).join('\n');
}

const pricingReferenceCheckedAt = formatDisplayDate(new Date());

function getCostFallbackInrPerKg(row, inputs) {
  const preset = getCommercialPreset(getDisplayProduct(inputs));
  const profile = getFreightProfile(inputs.destination_country);
  const marketReference = getAutoMarketSourcePrice(inputs) || preset.baseInrPerKg;
  const fallbackMap = {
    raw_material_cost: marketReference,
    packaging_cost: preset.packagingInrPerKg,
    processing_cost: preset.processingInrPerKg,
    labor_cost: preset.laborInrPerKg,
    overhead_cost: preset.overheadInrPerKg,
    inland_logistics_cost: 1.65 * profile.complexity,
    export_clearance_cost: 0.9 * profile.complexity,
    cha_charges_cost: 0.7 * profile.complexity,
    documentation_charges_cost: 0.35 * profile.complexity,
    port_charges_cost: 36500 * profile.complexity,
    freight_cost: freightInrPerKg(inputs),
    insurance_cost: Math.max(0.45, marketReference * 0.0045),
    commission_cost: marketReference * 0.012,
    misc_cost: 0.75
  };
  return roundMoney(fallbackMap[row.key] || marketReference || 0);
}

function buildPrivateAiQuoteReference(row, inputs, excludedByIncoterm = false) {
  const preset = getCommercialPreset(getDisplayProduct(inputs));
  const profile = getFreightProfile(inputs.destination_country);
  const marketReference = getAutoMarketSourcePrice(inputs) || preset.baseInrPerKg;
  const perKg = getCostFallbackInrPerKg(row, inputs);
  const formatInrRange = (low, high, suffix = '') => `${formatInrFixed(low)}-${formatInrFixed(high)}${suffix}`;
  const references = {
    raw_material_cost: { basis: 'Per kg', range: formatInrRange(Math.min(marketReference, preset.baseInrPerKg), Math.max(320, marketReference * 1.78), '/kg'), source: 'Manual/live reference', advisory: 'Supplier quote required before buyer-facing release.' },
    packaging_cost: { basis: 'Per kg', range: formatInrRange(Math.max(4, preset.packagingInrPerKg * 0.75), preset.packagingInrPerKg * 1.45, '/kg'), source: 'OpenAI/manual packaging benchmark', advisory: `Suggested packing: ${preset.packing}.` },
    processing_cost: { basis: 'Per kg', range: formatInrRange(Math.max(5, preset.processingInrPerKg * 0.75), preset.processingInrPerKg * 1.55, '/kg'), source: 'OpenAI/manual processing benchmark', advisory: 'Verify with factory or supplier quote.' },
    labor_cost: { basis: 'Per kg', range: formatInrRange(Math.max(2, preset.laborInrPerKg * 0.72), preset.laborInrPerKg * 1.6, '/kg'), source: 'Manual operational benchmark', advisory: 'Packing and handling labor reference only.' },
    overhead_cost: { basis: 'Per kg', range: formatInrRange(Math.max(3, preset.overheadInrPerKg * 0.7), preset.overheadInrPerKg * 1.55, '/kg'), source: 'Internal overhead benchmark', advisory: 'Export overhead allocation guidance.' },
    inland_logistics_cost: { basis: 'Fixed per order', range: formatInrRange(52000 * profile.complexity, 75000 * profile.complexity), source: 'Lane estimate/manual reference', advisory: 'Total should remain amount-only when basis is fixed per order.' },
    export_clearance_cost: { basis: 'Fixed per order', range: formatInrRange(18500 * profile.complexity, 30000 * profile.complexity), source: 'Documentation/export clearance benchmark', advisory: 'Human review required before release.' },
    cha_charges_cost: { basis: 'Fixed per order', range: formatInrRange(12000 * profile.complexity, 28000 * profile.complexity), source: 'CHA coordination benchmark', advisory: 'External CHA quote not connected.' },
    documentation_charges_cost: { basis: 'Fixed per order', range: formatInrRange(4500 * profile.complexity, 12000 * profile.complexity), source: 'Document preparation benchmark', advisory: 'Certificate/lab charges may be additional.' },
    port_charges_cost: { basis: 'Fixed per order', range: formatInrRange(36500 * profile.complexity, 58000 * profile.complexity), source: 'Port/terminal handling benchmark', advisory: 'Port Charges / Order. Port tariff and carrier invoice must be verified.' },
    freight_cost: { basis: 'Per kg / Per MT / Per container / Fixed per order', range: formatInrRange(Math.max(1, perKg * 0.82), perKg * 1.35, '/kg'), source: 'Freight lane benchmark', advisory: excludedByIncoterm ? 'Excluded by selected Incoterm.' : 'Carrier freight quote required before CIF/CFR release.' },
    insurance_cost: { basis: 'Percentage of Invoice Value', range: '0.25%-0.55%', source: 'Insurance benchmark', advisory: 'Default uses invoice-value percentage, not per KG.' },
    commission_cost: { basis: 'Percentage of Invoice Value', range: '1.5%-3.0%', source: 'Commercial commission benchmark', advisory: 'Default uses invoice-value percentage unless manually changed.' },
    misc_cost: { basis: 'Per Order / Total', range: formatInrRange(8500, 25000), source: 'Operational buffer benchmark', advisory: 'Bank, communication, and contingency guidance.' }
  };
  const reference = references[row.key] || { basis: pricingOptionLabel(row.basis), range: formatInrRange(perKg * 0.85, perKg * 1.35, '/kg'), source: 'OpenAI/manual reference', advisory: 'Advisory benchmark only.' };
  return {
    ...reference,
    pricedAt: pricingReferenceCheckedAt
  };
}

function SmartQuoteSetup({ inputs, errors, updateInput, productIntel, approvalReasons }) {
  const ports = inputs.destination_country && inputs.destination_country !== otherPricingOption ? pricingPortsByCountry[inputs.destination_country] || ['Main Commercial Port'] : [];
  const margin = moneyNumber(inputs.target_margin_percent);
  const commercialPreset = getCommercialPreset(getDisplayProduct(inputs));
  const freightProfile = getFreightProfile(inputs.destination_country);
  return (
    <section className="pricing-panel cfo-smart-setup">
      <div className="approval-section-header"><div><span>Section A -- Product Inputs</span><h2>Live commercial pricing inputs</h2></div><SlidersHorizontal size={18} /></div>
      <div className="cfo-section-a-grid">
        <PricingSelect label="Product" value={inputs.product_name} options={[...pricingProducts, otherPricingOption]} error={errors.product_name} onChange={(value) => updateInput('product_name', value)} />
        <SecureInput label="Quantity" value={inputs.quantity} error={errors.quantity} onChange={(value) => updateInput('quantity', value.replace(/[^\d.]/g, ''))} />
        <PricingSelect label="Unit" value={inputs.unit_of_measure} options={pricingUnitOptions} error={errors.unit_of_measure} onChange={(value) => updateInput('unit_of_measure', value)} />
        <PricingSelect label="Destination Country" value={inputs.destination_country} options={[...pricingCountries, otherPricingOption]} error={errors.destination_country} onChange={(value) => updateInput('destination_country', value)} />
        <PricingSelect label="Incoterm" value={inputs.incoterm} options={['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP']} onChange={(value) => updateInput('incoterm', value)} />
        <PricingSelect label="Shipping Mode" value={inputs.shipping_mode} options={['Sea freight', 'Air freight', 'Courier', 'Road / multimodal']} onChange={(value) => updateInput('shipping_mode', value)} />
        <PricingSelect label="Currency" value={inputs.currency} options={['USD', 'AED', 'EUR', 'GBP', 'AUD', 'INR']} onChange={(value) => updateInput('currency', value)} />
      </div>
      {inputs.product_name === otherPricingOption && <SecureInput label="Other Product" value={inputs.custom_product_name} onChange={(value) => updateInput('custom_product_name', value)} />}
      <div className="cfo-setup-grid">
        <SecureInput label="Buyer" value={inputs.company_name} error={errors.company_name} onChange={(value) => updateInput('company_name', value)} />
        <PricingSelect label="Destination Port" value={inputs.destination_port} options={[...ports, otherPricingOption]} error={errors.destination_port} onChange={(value) => updateInput('destination_port', value)} />
        <SecureInput label="Target Margin %" value={inputs.target_margin_percent} error={margin < 20 ? 'Founder review required below 20%.' : ''} onChange={(value) => updateInput('target_margin_percent', value.replace(/[^\d.]/g, ''))} />
        <SecureInput label="Exchange Rate" value={inputs.exchange_rate} onChange={(value) => updateInput('exchange_rate', value.replace(/[^\d.]/g, ''))} />
      </div>
      <div className="pricing-live-estimate-note">
        <div><span>Base cost estimate</span><strong>{formatPricingInrLive(commercialPreset.baseInrPerKg)} / KG</strong><small>AI-assisted commercial estimate; verify supplier quote.</small></div>
        <div><span>Typical packing</span><strong>{commercialPreset.packing}</strong><small>{commercialPreset.category}</small></div>
        <div><span>Lane complexity</span><strong>{freightProfile.zone} / {commercialPreset.complexity}</strong><small>{freightProfile.lead}</small></div>
      </div>
      <div className={`margin-governance ${margin < 20 ? 'attention' : ''}`}>
        <strong>{margin < 20 ? 'Founder Review Required' : 'Default margin guardrail active'}</strong>
        <span>Target profit/margin defaults to 20%. Founder may override, but below-threshold margin routes to approval.</span>
      </div>
      <ProductIntelligenceSuggestions productIntel={productIntel} approvalReasons={approvalReasons} />
    </section>
  );
}

function ProductIntelligenceSuggestions({ productIntel, approvalReasons }) {
  return (
    <div className="product-intelligence-box">
      <div>
        <span>Product Intelligence Suggestions</span>
        <strong>AI suggestion -- founder/CA/export consultant review required.</strong>
      </div>
      <div className="product-intelligence-grid">
        <div><span>Probable HSN</span><strong>{productIntel.hsn}</strong></div>
        <div><span>Packing</span><strong>{safeCfoJoin(productIntel.packing, ', ')}</strong></div>
        <div><span>Grades</span><strong>{safeCfoJoin(productIntel.grades, ', ')}</strong></div>
        <div><span>Preparation</span><strong>{productIntel.preparation}</strong></div>
        <div><span>Shipment Timeframe</span><strong>{productIntel.shipment}</strong></div>
        <div><span>Documents</span><strong>{safeCfoJoin(productIntel.documents, ', ')}</strong></div>
      </div>
      <div className="cfo-chip-list">
        {[...safeCfoArray(productIntel.risks), ...safeCfoArray(approvalReasons).slice(0, 3)].map((item) => <span key={item}>{item}</span>)}
      </div>
    </div>
  );
}

function IncotermIntelligencePanel({ incoterm }) {
  const info = incotermIntelligence[incoterm] || incotermIntelligence.FOB;
  return (
    <section className="pricing-panel incoterm-intelligence-panel">
      <div className="approval-section-header"><div><span>Incoterm Intelligence</span><h2>{incoterm} commercial impact</h2></div><Workflow size={18} /></div>
      <div className="incoterm-explain-grid">
        <div><span>Seller pays</span><strong>{info.seller}</strong></div>
        <div><span>Buyer pays</span><strong>{info.buyer}</strong></div>
        <div><span>Invoice implication</span><strong>{info.invoice}</strong></div>
        <div><span>Risk note</span><strong>{info.risk}</strong></div>
      </div>
      <div className="incoterm-cost-map">
        <div><span>Included cost rows</span>{info.included.map((item) => <strong key={item}>{item}</strong>)}</div>
        <div><span>Excluded / manual rows</span>{info.excluded.map((item) => <strong key={item}>{item}</strong>)}</div>
      </div>
    </section>
  );
}

function PricingResultPanel({ calc, inputs, approvalReasons }) {
  const marginState = approvalReasons.length ? 'Founder Review Required' : 'CFO Review Ready';
  const metrics = [
    ['Base Cost', calc.productBaseCost],
    ['Total Landed Cost', calc.totalLandedCost],
    ['Safe Quote', calc.safeQuotePrice],
    ['Recommended Quote', calc.recommendedOfferPrice],
    ['Aggressive Quote', calc.aggressiveQuotePrice],
    ['Profit Amount', calc.profitAmount]
  ];
  return (
    <section className="pricing-panel cfo-result-panel">
      <div className="approval-section-header"><div><span>AI Recommended Quote</span><h2>{formatPricingValue(calc.recommendedOfferPrice, inputs.currency)}</h2></div><StatusBadge label={marginState} state={approvalReasons.length ? 'attention' : 'progress'} /></div>
      <div className="cfo-result-hero">
        <div><span>Margin</span><strong>{calc.margin.toFixed(2)}%</strong><small>Target: {inputs.target_margin_percent}%</small></div>
        <div><span>Unit Price</span><strong>{formatPricingValue(calc.recommendedUnitPrice, inputs.currency)}</strong><small>{formatPricingInrLive(convertCurrency(calc.recommendedUnitPrice, inputs.currency, 'INR', moneyNumber(inputs.exchange_rate)))}</small></div>
        <div><span>FX Basis</span><strong>1 USD = ₹{inputs.exchange_rate}</strong><small>Manual override allowed, approval tracked.</small></div>
      </div>
      <div className="ai-quote-grid">
        <div><span>Safe Quote</span><strong>{formatPricingValue(calc.safeQuotePrice, inputs.currency)}</strong><small>Conservative margin for freight/FX uncertainty.</small></div>
        <div><span>Recommended Quote</span><strong>{formatPricingValue(calc.recommendedOfferPrice, inputs.currency)}</strong><small>Default AI-assisted commercial quote.</small></div>
        <div><span>Aggressive Quote</span><strong>{formatPricingValue(calc.aggressiveQuotePrice, inputs.currency)}</strong><small>Use only after CFO review.</small></div>
      </div>
      <div className="cfo-metric-grid compact">
        {metrics.map(([label, value]) => {
          const dual = formatDualPricingMoney(value, inputs.currency, inputs.exchange_rate);
          return <div key={label}><span>{label}</span><strong>{dual.primary}</strong><small>{dual.secondary}</small></div>;
        })}
      </div>
    </section>
  );
}

function CfoAiSuggestions({ inputs, calc, risk, productIntel, approvalReasons }) {
  const freightMissing = approvalReasons.find((item) => item.toLowerCase().includes('freight'));
  const profile = getFreightProfile(inputs.destination_country);
  const preset = getCommercialPreset(getDisplayProduct(inputs));
  const safeMargin = Math.max(20, moneyNumber(inputs.target_margin_percent));
  const rows = [
    ['Suggested margin', `${safeMargin}-${Math.max(safeMargin + 4, 24)}% recommended range.`],
    ['Shipment timeline', profile.lead],
    ['Freight complexity', `${profile.zone} lane / ${inputs.shipping_mode} / ${preset.complexity} product complexity.`],
    ['Missing fields', approvalReasons.length ? safeCfoJoin(approvalReasons.slice(0, 4), ' ') : 'No critical missing fields detected in local setup.'],
    ['Pricing risk', risk.decision === 'QUOTE' ? 'CFO review ready.' : risk.reason],
    ['Freight risk', freightMissing || `${inputs.incoterm} freight estimate is advisory; carrier quote required before release.`],
    ['Insurance logic', incotermIncludedCostKeys(inputs.incoterm).has('insurance_cost') ? 'Insurance included because selected Incoterm carries seller-side exposure.' : 'Insurance not included for this Incoterm unless manually agreed.'],
    ['Payment terms', inputs.buyer_type === 'New' ? 'Advance or secured terms recommended for new buyer.' : 'Use approved buyer history before credit terms.'],
    ['Recommended next action', approvalReasons.length ? 'Send to Director queue before any buyer-facing quote.' : 'CFO can review quote draft and keep release approval-controlled.']
  ];
  return (
    <section className="pricing-panel cfo-ai-panel cfo-commercial-notes-panel">
      <div className="approval-section-header"><div><span>OpenAI Commercial Intelligence</span><h2>AI recommendation panel</h2></div><Sparkles size={18} /></div>
      <div className="cfo-ai-list">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <p className="pricing-note">AI suggestions are advisory only. They cannot finalize HSN, approve pricing, guarantee freight, or approve release.</p>
    </section>
  );
}

function CleanCostRowsPanel({ rows, updateCostRow, inputs }) {
  const quantity = pricingQuantities(inputs.quantity, inputs.unit_of_measure);
  const rate = moneyNumber(inputs.exchange_rate);
  const costContext = getCostLineContext(inputs, rows);
  return (
    <section className="pricing-panel cfo-cost-panel">
      <div className="approval-section-header"><div><span>Live Formula Inputs</span><h2>AI-assisted cost rows</h2></div><Calculator size={18} /></div>
      <div className="cfo-cost-table">
        <div className="cfo-cost-head"><span>Cost item</span><span>Amount INR</span><span>{inputs.currency}</span><span>Basis</span><span>Source</span></div>
        {rows.map((row) => {
          const rowCurrency = String(row.currency || inputs.cost_currency || 'INR').toUpperCase();
          const basis = normalizeCostBasis(row.basis);
          const lineContext = contextForCostCurrency(costContext, rowCurrency, rate);
          const enteredTotal = row.included ? costLineTotal(moneyNumber(row.amount), basis, quantity, lineContext) : 0;
          const totalInr = convertCurrency(enteredTotal, rowCurrency, 'INR', rate);
          const totalQuote = convertCurrency(enteredTotal, rowCurrency, inputs.currency, rate);
          const privateReference = buildPrivateAiQuoteReference(row, inputs);
          return (
            <div className={!row.included ? 'excluded' : ''} key={row.key}>
              <strong>{row.label}<small>{row.included ? 'Included' : 'Excluded by Incoterm'}</small></strong>
              <input inputMode="decimal" value={row.amount} placeholder="Estimate pending" onChange={(event) => updateCostRow(row.key, { amount: event.target.value.replace(/[^\d.]/g, ''), estimated: false, source: 'Manual / CFO' })} />
              <span>{row.included ? `${formatPricingInrLive(totalInr)} / ${formatPricingValue(totalQuote, inputs.currency)}` : 'Excluded by Incoterm'}</span>
              <select value={row.basis} onChange={(event) => updateCostRow(row.key, { basis: event.target.value, estimated: false })}>{pricingBasisOptions.map((option) => <option key={option} value={option}>{pricingOptionLabel(option)}</option>)}</select>
              <em>{row.source || (row.amount ? 'Manual / CFO' : 'Estimate pending')}<small>{row.estimated ? 'AI-assisted estimate' : row.amount ? 'Manual override' : 'Missing input'}</small><small>{privateReference.basis}: {privateReference.range}</small></em>
            </div>
          );
        })}
      </div>
      <p className="pricing-note">Use these as commercial estimates only. Connect internal pricing DB, freight APIs, and commodity feeds before treating values as live market data.</p>
    </section>
  );
}

function CleanFormulaPanel({ calc, inputs }) {
  const formulaRows = [
    ['Base Cost', calc.productBaseCost],
    ['+ Packaging', calc.packagingCost],
    ['+ Processing / Labor / Overhead / Clearance', calc.otherCosts],
    ['+ Freight if applicable', calc.freightCost],
    ['+ Insurance if applicable', calc.lines.find((line) => line.key === 'insurance_cost')?.line_total || 0],
    ['+ Commission', calc.commission],
    [`+ Margin ${inputs.target_margin_percent}%`, calc.profitAmount],
    ['= Recommended Quote', calc.recommendedOfferPrice]
  ];
  return (
    <section className="pricing-panel cfo-formula-panel">
      <div className="approval-section-header"><div><span>Formula</span><h2>Transparent CFO calculation</h2></div><SlidersHorizontal size={18} /></div>
      <div className="formula-breakdown-list">
        {formulaRows.map(([label, value], index) => (
          <div className={index === formulaRows.length - 1 ? 'final' : ''} key={label}>
            <span>{label}</span>
            <strong>{formatMoney(value, inputs.currency)}</strong>
            <small>{formatPricingInr(convertCurrency(value, inputs.currency, 'INR', moneyNumber(inputs.exchange_rate)))}</small>
          </div>
        ))}
      </div>
      <div className="estimate-strip">
        <span>Cost / unit <strong>{formatMoney(calc.recommendedUnitPrice, inputs.currency)}</strong></span>
        <span>Cost / MT <strong>{formatMoney(calc.quantity.tons ? calc.totalLandedCost / calc.quantity.tons : 0, inputs.currency)}</strong></span>
        <span>Margin <strong>{calc.margin.toFixed(2)}%</strong></span>
      </div>
    </section>
  );
}

function CfoRiskApprovalPanel({ calc, risk, inputs, approvalReasons, onOpenApprovalWall }) {
  return (
    <section className="pricing-panel cfo-risk-panel">
      <div className="approval-section-header"><div><span>CFO Risk + Approval</span><h2>{approvalReasons.length ? 'Founder approval required' : 'CFO review ready'}</h2></div><TriangleAlert size={18} /></div>
      <div className={`approval-clarity-banner ${approvalReasons.length ? 'founder_review' : 'quote'}`}>
        <strong>{approvalReasons.length ? 'Founder Review Required' : 'No critical approval trigger'}</strong>
        <span>{approvalReasons[0] || 'Review margin, FX, freight, and buyer terms before release.'}</span>
      </div>
      <div className="cfo-risk-list">
        {[
          ['Margin Risk', moneyNumber(inputs.target_margin_percent) < 20 ? 'High' : 'Monitoring'],
          ['FX Exposure', moneyNumber(inputs.exchange_rate) !== moneyNumber(defaultPricingInputs.exchange_rate) ? 'Manual Override' : 'Monitoring'],
          ['Freight Risk', risk.missingCriticalFields.includes('freight_cost') ? 'High' : 'Monitoring'],
          ['Payment Risk', inputs.buyer_type === 'New' ? 'Review Required' : 'Monitoring'],
          ['Quote Value', formatPricingInr(convertCurrency(calc.recommendedOfferPrice, inputs.currency, 'INR', moneyNumber(inputs.exchange_rate)))]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="approval-trigger-list">
        {(approvalReasons.length ? approvalReasons : ['Founder approval not triggered by current local inputs.']).map((reason) => <span key={reason}>{reason}</span>)}
      </div>
      <button className="tactical-button command-button" onClick={onOpenApprovalWall}>Send to Director Command Center <ChevronRight size={16} /></button>
    </section>
  );
}

function FinanceNotesPanel({ productIntel, forexStatus, rates }) {
  return (
    <section className="pricing-panel finance-notes-panel">
      <div className="approval-section-header"><div><span>Finance Notes</span><h2>CFO operating context</h2></div><FileText size={18} /></div>
      <div className="approval-memory-list">
        <span>Shipment timeframe: {productIntel.shipment}</span>
        <span>Packing: {safeCfoJoin(productIntel.packing, ', ')}</span>
        <span>Documents: {safeCfoJoin(productIntel.documents, ', ')}</span>
        <span>FX status: {forexStatus}. Manual rate override must be reviewed.</span>
        <span>USD/INR watch: {rates.find((rate) => rate.pair === 'USD/INR')?.rate || 'Manual'}</span>
        <span>Quote cannot be buyer-facing until approval gates are cleared.</span>
      </div>
    </section>
  );
}

const cfoFinanceData = {
  overviewMetrics: [
    ['Pending quote approvals', '4', 'Director review gate active -- no buyer release'],
    ['Margin risk alerts', '3', 'Black pepper 14.2% -- below 18% floor'],
    ['Invoice approval pending', '2', 'LUT gate + HSN verification active'],
    ['RoDTEP & Drawback receivable', '₹2.4L', 'Q1 claim filed, ICEGATE pending'],
    ['Receivables (LC/TT)', '5', 'USD 48,200 outstanding -- 30-90d aging'],
    ['Payables (supplier + freight)', '6', 'CFO controlled -- no auto-pay'],
    ['Monthly working capital (PCFC)', '₹18.5L', 'Packing credit utilised this cycle'],
    ['High-risk finance items', '5', 'Founder attention -- FEMA overdue watch']
  ],
  cashRows: [
    ['PCFC utilisation', '₹18.5L drawn', 'Packing credit against confirmed LC -- standard', 'Monitoring'],
    ['Forward cover open', 'USD 25,000 @ 83.40', 'Hedged against USD/INR volatility -- 90d', 'Covered'],
    ['RoDTEP credit ledger', '₹2.4L pending', 'ICEGATE claim filed -- awaiting credit', 'Review Required'],
    ['Duty drawback claim', '₹68,000', 'Filed with customs -- 45d expected realisation', 'Monitoring'],
    ['Overdue EDPMS entries', '2 shipments', 'BRC/FIRC not filed -- FEMA risk if >9 months', 'Attention']
  ],
  receivablesRows: [
    ['Khalid Trading LLC', 'CI-UAE-031', 'USD 18,500', '2026-06-05', 'LC Presented', 'CFO Command'],
    ['Oman Wholesale Foods', 'PI-OMN-022', 'USD 9,800', '2026-06-10', 'TT Due', 'COO Command'],
    ['Mueller Imports GmbH', 'PI-DEU-014', 'USD 12,200', '2026-06-18', 'LC Pending', 'Finance'],
    ['Singapore Spice House', 'CI-SGP-009', 'USD 4,950', '2026-07-01', 'DA 30 days', 'CFO Command']
  ],
  payableRows: [
    ['Rajkot Chilli Mandi', 'Raw material procurement', '₹4,20,000', 'COO confirmation required', 'Supplier Control'],
    ['Freight forwarder -- JNPT', 'Sea freight + THC charges', '₹85,000', 'COO + CFO approval', 'Shipment System'],
    ['CHA charges -- SB filing', 'Custom house agent fees', '₹12,500', 'COO controlled', 'Customs'],
    ['Fumigation agency', 'Methyl bromide treatment', '₹8,200', 'COO + quality clearance', 'Quality'],
    ['Insurance premium', 'Marine cargo insurance', '₹6,800', 'CFO auto-eligible', 'Payment Vault']
  ],
  marginRows: [
    ['Chilli Powder 100MT', 'Khalid Trading UAE', 'UAE', '14.2%', 'Low Margin -- Director Block'],
    ['Turmeric Finger 50MT', 'Oman Wholesale', 'Oman', '22.4%', 'CFO Review Ready'],
    ['Cumin Seeds 30MT', 'Mueller Imports', 'Germany', '20.1%', 'Monitoring'],
    ['Black Pepper 20MT', 'Singapore Spice House', 'Singapore', '18.8%', 'Approved -- Dispatch Ready']
  ],
  riskRows: [
    ['Low margin -- chilli', 'High', 'Chilli powder quote at 14.2% -- below 18% CFO floor. Director block active.'],
    ['FEMA overdue payments', 'High', '2 shipments without BRC/FIRC beyond 180 days. EDPMS filing required immediately.'],
    ['USD/INR open exposure', 'Medium', 'USD 44,950 unhedged receivables -- forward cover recommended at current 96.34 rate.'],
    ['DA payment term risk', 'High', 'Singapore buyer requesting DA 30 days -- first order, no credit history. Advance TT recommended.'],
    ['Freight cost volatility', 'Medium', 'CIF/CFR quotes need updated freight confirmation -- JNPT rates up 12% this month.'],
    ['LC discrepancy risk', 'Medium', 'UAE LC clause requires specific phyto certificate wording -- COO to verify before presentation.'],
    ['Missing cost inputs', 'Critical', 'Raw material mandi rate not updated since last week -- pricing engine using stale APMC data.']
  ],
  reportRows: [
    ['Monthly finance summary', 'Draft report', 'Cash, payables, approvals, spend'],
    ['Quotation report', 'Draft report', 'Quote value, margins, buyer risk'],
    ['Margin report', 'Draft report', 'Product/buyer/destination margin bands'],
    ['Payment report', 'Draft report', 'Payment Vault and renewal controls'],
    ['Approval report', 'Draft report', 'Founder approval history and blockers'],
    ['Export commercial summary', 'Draft report', 'Pricing, invoice, shipment dependency']
  ]
};

function safeCfoArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeCfoString(value) {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return safeCfoJoin(value, ' / ');
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toLocaleString();
    const objectLabel = value.message
      || value.label
      || value.title
      || value.name
      || value.vendor
      || value.company
      || value.company_name
      || value.status
      || value.description;
    if (objectLabel) return objectLabel;
    try {
      return JSON.stringify(value);
    } catch {
      return 'Object record';
    }
  }
  return String(value);
}

function safeCfoJoin(value, separator = ' ') {
  return Array.isArray(value)
    ? value.map((item) => safeCfoString(item)).join(separator)
    : safeCfoString(value);
}

function getCfoObjectColumnValue(row, column, index) {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return safeCfoString(row);
  const label = String(column || '').toLowerCase();
  if (label.includes('vendor')) return row.vendor || row.name;
  if (label.includes('company') || label.includes('buyer')) return row.company || row.company_name || row.buyer || row.buyer_name;
  if (label.includes('invoice')) return row.invoice || row.invoice_number || row.invoice_id || row.id;
  if (label.includes('quote')) return row.quote_id || row.quote || row.id;
  if (label.includes('product')) return row.product || row.product_name;
  if (label.includes('amount')) return formatCfoInr(row.amount ?? row.amount_inr ?? row.value);
  if (label.includes('date') || label.includes('due')) return formatLearningDate(row.due_date || row.paid_at || row.created_at || row.date);
  if (label.includes('receipt')) return row.receipt_status || row.receipt || row.status;
  if (label.includes('approval')) return row.approval_state || row.approval_status || row.status;
  if (label.includes('payment status')) return row.payment_status || row.status;
  if (label.includes('status')) return row.status || row.payment_status || row.approval_status || row.risk_level || row.severity;
  if (label.includes('category')) return row.category;
  if (label.includes('linked') || label.includes('module') || label.includes('owner')) return row.linked_module || row.source_module || row.module || row.owner || row.executive_owner || row.category;
  if (label.includes('risk type') || label === 'risk') return row.risk_type || row.type;
  if (label.includes('risk level') || label.includes('severity')) return row.risk_level || row.severity;
  if (label.includes('description') || label.includes('reason') || label.includes('coverage') || label.includes('notes')) return row.description || row.reason || row.summary || row.safe_notes || row.notes;
  if (label.includes('event')) return row.event_type || row.action_type || row.event;
  if (label.includes('actor')) return row.actor;
  if (label.includes('margin')) return row.margin_percent || row.margin;
  if (label.includes('target')) return row.target_margin;

  const normalizedKey = label.replace(/[^a-z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
  const snakeKey = label.replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  const fallbackValue = row[normalizedKey] ?? row[snakeKey] ?? Object.values(row)[index];
  return safeCfoString(fallbackValue);
}

function normalizeCfoTableRow(row, columns = []) {
  if (Array.isArray(row)) return row.map((cell) => safeCfoString(cell));
  if (row && typeof row === 'object') return columns.map((column, index) => getCfoObjectColumnValue(row, column, index) || 'Not set');
  return [safeCfoString(row)];
}

function normalizeCfoTableRows(rows, columns = []) {
  return safeCfoArray(rows).map((row) => normalizeCfoTableRow(row, columns));
}

const MARKET_PRICE_PRODUCTS = [
  { key: 'chilli',    label: 'Red Chilli',      unit: 'kg', hs: '09042110', reference: 120,  mandi: 'Guntur Mandi' },
  { key: 'turmeric',  label: 'Turmeric',         unit: 'kg', hs: '09103010', reference: 148,  mandi: 'Nizamabad Mandi' },
  { key: 'pepper',    label: 'Black Pepper',     unit: 'kg', hs: '09041100', reference: 680,  mandi: 'NCDEX / Kochi' },
  { key: 'cumin',     label: 'Cumin (Jeera)',    unit: 'kg', hs: '09093100', reference: 250,  mandi: 'Unjha Mandi' },
  { key: 'coriander', label: 'Coriander Seed',  unit: 'kg', hs: '09092100', reference: 90,   mandi: 'Rajkot Mandi' },
  { key: 'cardamom',  label: 'Cardamom',         unit: 'kg', hs: '09083110', reference: 2200, mandi: 'ICEX / Spice Board' },
  { key: 'fenugreek', label: 'Fenugreek (Methi)',unit: 'kg', hs: '12129200', reference: 75,   mandi: 'Rajkot Mandi' },
  { key: 'cinnamon',  label: 'Cinnamon',         unit: 'kg', hs: '09061000', reference: 320,  mandi: 'Kochi Market' },
  { key: 'clove',     label: 'Clove',            unit: 'kg', hs: '09072000', reference: 820,  mandi: 'Kochi Market' },
  { key: 'mustard',   label: 'Mustard Seed',     unit: 'kg', hs: '12074000', reference: 65,   mandi: 'Jaipur Mandi' },
  { key: 'rice',      label: 'Rice',             unit: 'kg', hs: '10063000', reference: 68,   mandi: 'APEDA rate' },
  { key: 'onion',     label: 'Onion',            unit: 'kg', hs: '07031000', reference: 20,   mandi: 'Lasalgaon Mandi' },
  { key: 'garlic',    label: 'Garlic',           unit: 'kg', hs: '07032000', reference: 32,   mandi: 'MP Mandi' },
];

function CfoMarketPricesWorkspace() {
  const [prices, setPrices] = React.useState({});
  const [editing, setEditing] = React.useState(null);
  const [editVal, setEditVal] = React.useState({ price: '', source: '', note: '' });
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('/api/prices/market')
      .then(r => r.json())
      .then(d => { if (d.ok) setPrices(d.prices || {}); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function startEdit(product) {
    const current = prices[product.key];
    setEditing(product.key);
    setEditVal({
      price: current?.price_inr_per_kg || product.reference,
      source: current?.source || product.mandi,
      note: current?.note || '',
    });
    setMsg('');
  }

  async function savePrice(product) {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/prices/market', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_key: product.key,
          product_label: product.label,
          price_inr_per_kg: Number(editVal.price),
          source: editVal.source,
          note: editVal.note,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setPrices(prev => ({
          ...prev,
          [product.key]: {
            ...prev[product.key],
            price_inr_per_kg: Number(editVal.price),
            source: editVal.source,
            note: editVal.note,
            updated_at: new Date().toISOString(),
            stale: false,
            is_fallback: false,
          },
        }));
        setMsg(`✅ ${product.label} updated to ₹${editVal.price}/kg`);
        setEditing(null);
      } else {
        setMsg(`❌ ${data.message}`);
      }
    } catch (e) {
      setMsg('❌ Could not save — check connection');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="cfo-market-prices-workspace" style={{ padding: '24px' }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Market Prices — Raw Material Cost</h2>
        <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 620 }}>
          These prices are used by the CFO pricing engine for every quote — from Slack leads, quotation page, and export pipeline.
          Update with your <strong>actual purchase price</strong> from today's mandi or supplier. Stale prices (&gt;7 days) are flagged in orange.
        </p>
      </div>
      {msg && <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#14532d' : '#7f1d1d', color: '#f1f5f9', fontSize: 13 }}>{msg}</div>}
      {loading ? (
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading prices…</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e293b', color: '#64748b', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Product</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>HS Code</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Price (₹/kg)</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Source</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Updated</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '8px 12px', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {MARKET_PRICE_PRODUCTS.map(product => {
              const p = prices[product.key] || {};
              const isStale = p.stale !== false;
              const isFallback = p.is_fallback !== false;
              const daysOld = p.days_old;
              const isEditing = editing === product.key;
              return (
                <tr key={product.key} style={{ borderBottom: '1px solid #0f172a', background: isEditing ? '#1e293b' : 'transparent' }}>
                  <td style={{ padding: '10px 12px', color: '#f1f5f9', fontWeight: 600 }}>{product.label}</td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontFamily: 'monospace' }}>{product.hs}</td>
                  <td style={{ padding: '10px 12px' }}>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editVal.price}
                        onChange={e => setEditVal(v => ({ ...v, price: e.target.value }))}
                        style={{ width: 90, padding: '4px 8px', borderRadius: 4, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13 }}
                      />
                    ) : (
                      <span style={{ color: isStale ? '#f59e0b' : '#22c55e', fontWeight: 700 }}>
                        ₹{p.price_inr_per_kg || product.reference}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94a3b8' }}>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editVal.source}
                        onChange={e => setEditVal(v => ({ ...v, source: e.target.value }))}
                        placeholder="e.g. Guntur Mandi today"
                        style={{ width: 180, padding: '4px 8px', borderRadius: 4, background: '#0f172a', border: '1px solid #334155', color: '#f1f5f9', fontSize: 13 }}
                      />
                    ) : (
                      p.source || product.mandi
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: '#64748b', fontSize: 12 }}>
                    {p.updated_at
                      ? `${daysOld === 0 ? 'Today' : daysOld === 1 ? 'Yesterday' : `${daysOld}d ago`}`
                      : <span style={{ color: '#ef4444' }}>Never set</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isFallback
                      ? <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 600 }}>⚠ REFERENCE ONLY</span>
                      : isStale
                        ? <span style={{ color: '#f59e0b', fontSize: 11, fontWeight: 600 }}>⚠ STALE ({daysOld}d)</span>
                        : <span style={{ color: '#22c55e', fontSize: 11, fontWeight: 600 }}>✓ LIVE</span>}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => savePrice(product)}
                          disabled={saving}
                          style={{ padding: '4px 12px', borderRadius: 4, background: '#22c55e', color: '#000', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}
                        >{saving ? '…' : 'Save'}</button>
                        <button
                          onClick={() => setEditing(null)}
                          style={{ padding: '4px 10px', borderRadius: 4, background: '#334155', color: '#f1f5f9', border: 'none', cursor: 'pointer', fontSize: 12 }}
                        >Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(product)}
                        style={{ padding: '4px 12px', borderRadius: 4, background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >Update Price</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b', fontSize: 12, color: '#64748b' }}>
        <strong style={{ color: '#94a3b8' }}>How to use:</strong> Enter today's actual purchase price from your mandi or supplier. Type the source (e.g. "Guntur Mandi 30-May", "Supplier ABC quote"). All quotes generated from Slack or the Quotations tab will use this price. Green = live (≤7 days). Orange = stale. Red = never set (using reference estimate).
      </div>
    </section>
  );
}

function CfoTabWorkspace({ tab, data, reportOutput, onOpenPricing, onOpenPaymentVault, onGenerateReport, onGenerateFounderSummary, onInitiatePayment, onSendReportSlack }) {
  if (data.loading) {
    return <section className="pricing-panel cfo-loading-panel"><MetricSkeletonGrid /></section>;
  }
  if (tab === 'Overview') return <CfoOverviewWorkspace data={data} onOpenPricing={onOpenPricing} onOpenPaymentVault={onOpenPaymentVault} onGenerateFounderSummary={onGenerateFounderSummary} />;
  if (tab === 'Market Prices') return <CfoMarketPricesWorkspace />;
  if (tab === 'Cash') return <CfoCashWorkspace data={data} />;
  if (tab === 'Receivables') return <CfoReceivablesWorkspace data={data} />;
  if (tab === 'Payables') return <CfoPayablesWorkspace data={data} onInitiatePayment={onInitiatePayment} />;
  if (tab === 'Margins') return <CfoMarginsWorkspace data={data} onOpenPricing={onOpenPricing} />;
  if (tab === 'Risks') return <CfoRisksWorkspace data={data} onOpenPricing={onOpenPricing} />;
  if (tab === 'Payment Vault') return <CfoPaymentVaultWorkspace data={data} onInitiatePayment={onInitiatePayment} />;
  return <CfoReportsWorkspace output={reportOutput} onGenerate={onGenerateReport} onFounderSummary={onGenerateFounderSummary} onSendReportSlack={onSendReportSlack} />;
}

function CfoOverviewTab({ onOpenPricing }) {
  return (
    <section className="cfo-finance-workspace">
      <div className="cfo-finance-grid metrics">
        {cfoFinanceData.overviewMetrics.map(([label, value, note], index) => {
          const metricValue = Number(String(value).replace(/[^0-9.-]/g, '')) || (index + 1) * 12;
          const mockTrend = [65, 70, 68, 74, 71, 78, metricValue].filter(Boolean);
          return <article key={label}><span>{label}</span><strong>{value}</strong><Sparkline data={mockTrend} /><small>{note}</small></article>;
        })}
      </div>
      <div className="cfo-finance-grid two">
        <CfoFinancePanel title="Approval Control" subtitle="Founder-sensitive finance queue" icon={FileCheck2} rows={['Low margin quotations require founder approval.', 'Invoice release remains blocked until approval.', 'Document release must route through Director Queue.', 'Payment caps remain INR-governed.']} />
        <CfoFinancePanel title="Payment Vault Summary" subtitle="Infrastructure spend and renewals" icon={CircleDollarSign} rows={['Auto-pay allowed only for trusted infrastructure vendors.', 'Above ₹1,500 requires founder approval.', 'OTP is never stored or logged.', 'Receipts remain audit-controlled.']} />
      </div>
      <button className="tactical-button" onClick={onOpenPricing}>Open Quotations Pricing Engine</button>
    </section>
  );
}

function CfoCashTab() {
  return (
    <section className="cfo-finance-workspace">
      <CfoFinanceTable title="Cash Control" subtitle="Bank balances are pendings until connected" columns={['Item', 'Amount / State', 'Finance note', 'Status']} rows={cfoFinanceData.cashRows} />
      <div className="cfo-finance-grid two">
        <CfoFinancePanel title="Infrastructure Payment Forecast" subtitle="Renewal watch" icon={TimerReset} rows={['OpenAI credits projected for review.', 'Supabase renewal stays under CFO-safe threshold.', 'Vercel renewal needs CFO + COO confirmation.', 'No supplier/freight/tax auto-payment allowed.']} />
        <CfoFinancePanel title="CFO Notes" subtitle="Cash governance" icon={FileText} rows={['Do not claim real bank balance until bank feed exists.', 'Manual payments require audit record.', 'Founder remains OTP owner.', 'CFO executes payment after approval path clears.']} />
      </div>
    </section>
  );
}

function CfoReceivablesTab() {
  return <section className="cfo-finance-workspace"><CfoFinanceTable title="Receivables" subtitle="Buyer invoice follow-up pendings" columns={['Buyer', 'Invoice', 'Amount', 'Due date', 'Status', 'Owner']} rows={cfoFinanceData.receivablesRows} /></section>;
}

function CfoPayablesTab() {
  return (
    <section className="cfo-finance-workspace">
      <CfoFinanceTable title="Payables" subtitle="Vendor, subscription, and supplier payable control" columns={['Vendor', 'Category', 'Amount', 'Approval state', 'Linked module']} rows={cfoFinanceData.payableRows} />
      <CfoFinancePanel title="Payment Vault Connection" subtitle="Conceptual link" icon={Database} rows={['Infrastructure renewals route to Payment Vault.', 'Supplier, freight, customs, tax, salaries, refunds are never auto-paid.', 'New vendors always require founder approval.', 'High-risk vendors always require founder approval.']} />
    </section>
  );
}

function CfoMarginsTab({ onOpenPricing }) {
  return (
    <section className="cfo-finance-workspace">
      <CfoFinanceTable title="Margin Intelligence" subtitle="Product, buyer, and destination margin review" columns={['Product', 'Buyer', 'Destination', 'Margin', 'Status']} rows={cfoFinanceData.marginRows} />
      <div className="cfo-margin-bars">{cfoFinanceData.marginRows.map(([product, , destination, margin, status]) => <div key={`${product}-${destination}`}><span>{product} / {destination}</span><i><b style={{ width: `${Math.min(100, Number(margin.replace('%', '')) * 3)}%` }} /></i><strong>{margin}</strong><small>{status}</small></div>)}</div>
      <button className="tactical-button" onClick={onOpenPricing}>Open Quotations</button>
    </section>
  );
}

function CfoRisksTab({ onOpenPricing }) {
  return (
    <section className="cfo-finance-workspace">
      <CfoFinanceTable title="Finance Risk Register" subtitle="Commercial approval and pricing risks" columns={['Risk', 'Severity', 'Reason']} rows={cfoFinanceData.riskRows} />
      <div className="cfo-finance-grid two">
        <CfoFinancePanel title="Approval Backlog" subtitle="Founder attention" icon={TriangleAlert} rows={['Low-margin quote waiting approval.', 'Invoice release blocked by LUT/HSN gates.', 'Payment renewal over cap needs founder approval.', 'Unknown buyer requires commercial review.']} />
        <CfoFinancePanel title="Recommended CFO Action" subtitle="Next decisions" icon={Workflow} rows={['Prioritize pricing and invoice approvals before buyer release.', 'Confirm freight/insurance for CIF quotes.', 'Keep manual FX overrides auditable.', 'Escalate critical missing cost inputs.']} />
      </div>
      <button className="tactical-button" onClick={onOpenPricing}>Review Pricing Risks</button>
    </section>
  );
}

function CfoReportsTab({ output, onGenerate }) {
  return (
    <section className="cfo-finance-workspace">
      <CfoFinanceTable title="Reports" subtitle="Draft CFO reporting center" columns={['Report', 'Status', 'Coverage']} rows={cfoFinanceData.reportRows} />
      <div className="cfo-report-actions">
        <button className="tactical-button" onClick={onGenerate}>Generate Report</button>
        <button className="ghost-button" onClick={onGenerate}>Export Draft Report</button>
      </div>
      {output && <pre className="cfo-report-output">{output}</pre>}
    </section>
  );
}

function formatCfoInr(value) {
  if (typeof value === 'string' && value.trim()) return value;
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

function hasCfoMoney(pnl = {}) {
  return ['revenue', 'cogs', 'infrastructure', 'gross_profit', 'net_profit'].some((key) => Number(pnl[key] || 0) !== 0);
}

function CfoEmptyState({ message }) {
  return <EmptyState icon={CircleDollarSign} title={message} />;
}

function CfoOverviewWorkspace({ data, onOpenPricing, onOpenPaymentVault, onGenerateFounderSummary }) {
  const dashboard = data.dashboard || {};
  const monthly = dashboard.monthly_pnl || data.monthlyPnl || {};
  const weekly = dashboard.weekly_pnl || data.weeklyPnl || {};
  const summary = dashboard.summary || {};
  const recurring = safeCfoArray(data.recurringPayments).length ? safeCfoArray(data.recurringPayments) : safeCfoArray(dashboard.recurring_payments);
  const metrics = [
    ['Monthly Revenue', monthly.revenue_formatted || formatCfoInr(monthly.revenue)],
    ['Monthly Net Profit', monthly.net_profit_formatted || formatCfoInr(monthly.net_profit)],
    ['Weekly Revenue', weekly.revenue_formatted || formatCfoInr(weekly.revenue)],
    ['Pending Payments', summary.pending_payments ?? 0]
  ];
  const hasLiveData = hasCfoMoney(monthly) || hasCfoMoney(weekly) || recurring.some((row) => row.last_paid || Number(row.amount || 0) > 0);
  return (
    <section className="cfo-finance-workspace">
      <div className="cfo-finance-grid metrics">
        {metrics.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}
      </div>
      {!hasLiveData ? <CfoEmptyState message="Connect Supabase payments table to see live data" /> : null}
      <CfoRecurringPaymentsList rows={recurring} />
      <div className="cfo-report-actions">
        <button className="tactical-button" onClick={onOpenPricing}>Open Quotations Pricing Engine</button>
        <button className="ghost-button" onClick={onOpenPaymentVault}>Open Payment Vault Summary</button>
        <button className="ghost-button" onClick={onGenerateFounderSummary}>Generate Founder Financial Summary</button>
      </div>
    </section>
  );
}

function CfoCashWorkspace({ data }) {
  const weekly = data.weeklyPnl || {};
  const monthly = data.monthlyPnl || {};
  const rows = [
    ['Revenue', 'revenue', 'revenue_formatted'],
    ['COGS', 'cogs', 'cogs_formatted'],
    ['Infrastructure cost', 'infrastructure', 'infrastructure_formatted'],
    ['Gross Profit', 'gross_profit', 'gross_profit_formatted'],
    ['Net Profit', 'net_profit', 'net_profit_formatted']
  ];
  const allZero = !hasCfoMoney(weekly) && !hasCfoMoney(monthly);
  return (
    <section className="cfo-finance-workspace">
      {allZero ? <CfoEmptyState message="No payments or invoices recorded yet. Data appears when leads are marked Won and payments are logged." /> : null}
      <CfoPnlTable title="Weekly P&L" pnl={weekly} rows={rows} />
      <CfoPnlTable title="Monthly P&L" pnl={monthly} rows={rows} />
    </section>
  );
}

function CfoPnlTable({ title, pnl, rows }) {
  return (
    <section className="pricing-panel cfo-finance-table-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>Revenue, costs, and profit</h2></div><FileText size={18} /></div>
      <div className="cfo-finance-table" style={{ '--cfo-cols': 2 }}>
        <div className="cfo-finance-table-head"><span>Line</span><span>INR Value</span></div>
        {rows.map(([label, key, formattedKey]) => (
          <div key={key}><strong>{label}</strong><span>{pnl?.[formattedKey] || formatCfoInr(pnl?.[key])}</span></div>
        ))}
      </div>
    </section>
  );
}

function CfoReceivablesWorkspace({ data }) {
  const rows = safeCfoArray(data.receivables);
  return (
    <section className="cfo-finance-workspace">
      {rows.length ? (
        <CfoFinanceTable title="Receivables" subtitle="Open buyer receivables from Supabase lead status" columns={['Company', 'Amount', 'Status', 'Date']} rows={rows.map((row) => {
          const item = row || {};
          return [item.company || item.company_name || 'Company pending', formatCfoInr(item.amount), item.status || 'Open', formatLearningDate(item.created_at || item.date)];
        })} />
      ) : <CfoEmptyState message="No open receivables. Receivables appear when leads are marked Active, Negotiation, Won, or Invoiced in Supabase." />}
    </section>
  );
}

function CfoPayablesWorkspace({ data, onInitiatePayment }) {
  const rows = safeCfoArray(data.payables);
  const [paymentResult, setPaymentResult] = useState('');
  async function makePayment(row) {
    const response = await onInitiatePayment({
      vendor: row.vendor,
      amount: row.amount,
      category: row.category || 'Other',
      description: `Payable payment for ${row.vendor}`
    });
    setPaymentResult(response.label || response.data?.status || response.error || 'Payment processed.');
  }
  return (
    <section className="cfo-finance-workspace">
      {rows.length ? (
        <section className="pricing-panel cfo-finance-table-panel">
          <div className="approval-section-header"><div><span>Payables</span><h2>Pending vendor payments</h2></div><Database size={18} /></div>
          <div className="cfo-finance-table" style={{ '--cfo-cols': 6 }}>
            <div className="cfo-finance-table-head">{['Vendor', 'Amount', 'Status', 'Category', 'Date', 'Action'].map((column) => <span key={column}>{column}</span>)}</div>
            {rows.map((row, index) => {
              const item = row || {};
              return (
              <div key={item.id || `${item.vendor || 'vendor'}-${item.created_at || index}`}>
                <strong>{item.vendor || 'Vendor pending'}</strong>
                <span>{formatCfoInr(item.amount)}</span>
                <span>{item.status || 'Pending'}</span>
                <span>{item.category || 'Other'}</span>
                <span>{formatLearningDate(item.created_at || item.paid_at)}</span>
                <span><button className="ghost-button" onClick={() => makePayment(item)}>Make Payment</button></span>
              </div>
              );
            })}
          </div>
        </section>
      ) : <CfoEmptyState message="No pending payables." />}
      {paymentResult ? <pre className="cfo-report-output">{paymentResult}</pre> : null}
    </section>
  );
}

function CfoMarginsWorkspace({ data, onOpenPricing }) {
  const productRows = safeCfoArray(data.marginAnalytics?.byProduct);
  const riskyQuotes = safeCfoArray(data.marginAnalytics?.riskyQuotes);
  return (
    <section className="cfo-finance-workspace">
      {productRows.length || riskyQuotes.length ? null : <CfoEmptyState message="Margin data appears when quotes are generated through the Pricing Engine." />}
      {productRows.length ? <CfoFinanceTable title="By Product" subtitle="Product margin analytics" columns={['Product', 'Margin %']} rows={productRows.map((row) => {
        const item = row || {};
        return [item.product || item[0] || 'Product pending', item.margin_percent || item.margin || item[1] || '0%'];
      })} /> : null}
      {riskyQuotes.length ? <CfoFinanceTable title="Risky Quotes" subtitle="Quotes below target margin" columns={['Quote', 'Product', 'Margin', 'Target']} rows={riskyQuotes.map((row) => {
        const item = row || {};
        return [item.quote_id || item.id || 'Quote pending', item.product || 'Product pending', item.margin_percent || item.margin || '0%', item.target_margin || 'Target pending'];
      })} /> : null}
      <button className="tactical-button" onClick={onOpenPricing}>Open Quotations</button>
    </section>
  );
}

function CfoRisksWorkspace({ data, onOpenPricing }) {
  const risks = safeCfoArray(data.risks);
  return (
    <section className="cfo-finance-workspace">
      {risks.length ? (
        <section className="pricing-panel cfo-finance-table-panel">
          <div className="approval-section-header"><div><span>Finance Risk Register</span><h2>Detected commercial and payment risks</h2></div><TriangleAlert size={18} /></div>
          <div className="cfo-finance-table" style={{ '--cfo-cols': 5 }}>
            <div className="cfo-finance-table-head">{['Risk type', 'Vendor', 'Amount', 'Risk level', 'Description'].map((column) => <span key={column}>{column}</span>)}</div>
            {risks.map((risk, index) => {
              const item = risk || {};
              return (
              <div key={item.id || `${item.type || 'risk'}-${item.vendor || index}`}>
                <strong>{item.type || 'Financial Risk'}</strong>
                <span>{item.vendor || 'Vendor pending'}</span>
                <span>{formatCfoInr(item.amount)}</span>
                <span><SeverityBadge severity={item.risk_level || 'Low'} /></span>
                <span>{item.description || 'No description recorded.'}</span>
              </div>
              );
            })}
          </div>
        </section>
      ) : <CfoEmptyState message="No financial risks detected." />}
      <button className="tactical-button" onClick={onOpenPricing}>Review Pricing Risks</button>
    </section>
  );
}

function CfoPaymentVaultWorkspace({ data, onInitiatePayment }) {
  const vault = data.paymentVault || {};
  const metrics = safeCfoArray(vault.metrics);
  const recentPayments = safeCfoArray(vault.recentPayments);
  const workflowSteps = safeCfoArray(vault.workflowSteps);
  const [form, setForm] = useState({ vendor: '', amount: '', category: 'Hosting', description: '' });
  const [result, setResult] = useState('');

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submitPayment() {
    const response = await onInitiatePayment({
      vendor: form.vendor,
      amount: form.amount,
      category: form.category,
      description: form.description
    });
    setResult(response.label || response.data?.status || response.error || 'Payment request processed.');
  }

  return (
    <section className="cfo-finance-workspace">
      <div className="cfo-finance-grid metrics">
        {metrics.map((metric, index) => {
          const item = metric || {};
          return <article key={`${item.label || item[0] || 'metric'}-${index}`}><span>{item.label || item[0] || `Metric ${index + 1}`}</span><strong>{item.value ?? item[1] ?? 'Not set'}</strong></article>;
        })}
      </div>
      <section className="pricing-panel cfo-finance-table-panel">
        <div className="approval-section-header"><div><span>Recent Payments</span><h2>Payment Vault records</h2></div><FileCheck2 size={18} /></div>
        {recentPayments.length ? (
          <div className="cfo-finance-table" style={{ '--cfo-cols': 4 }}>
            <div className="cfo-finance-table-head">{['Vendor', 'Amount', 'Status', 'Date'].map((column) => <span key={column}>{column}</span>)}</div>
            {recentPayments.map((row, index) => {
              const item = row || {};
              return (
              <div key={item.id || `${item.vendor || item[0] || 'payment'}-${item.created_at || index}`}>
                <strong>{item.vendor || item[0] || 'Vendor pending'}</strong>
                <span>{formatCfoInr(item.amount ?? item[1])}</span>
                <span>{item.status || item[2] || 'Pending'}</span>
                <span>{formatLearningDate(item.paid_at || item.created_at || item[3])}</span>
              </div>
              );
            })}
          </div>
        ) : <CfoEmptyState message="No recent payments recorded." />}
      </section>
      <section className="pricing-panel">
        <div className="approval-section-header"><div><span>Payment Workflow</span><h2>Approval and OTP-safe sequence</h2></div><Route size={18} /></div>
        <ol className="cfo-workflow-steps">{workflowSteps.map((step, index) => <li key={`${safeCfoString(step)}-${index}`}>{safeCfoString(step)}</li>)}</ol>
      </section>
      <section className="pricing-panel cfo-payment-form">
        <div className="approval-section-header"><div><span>Initiate Payment</span><h2>Submit INR payment request</h2></div><CircleDollarSign size={18} /></div>
        <label>Vendor<input value={form.vendor} onChange={(event) => update('vendor', event.target.value)} placeholder="Vendor name" /></label>
        <label>Amount in INR<input type="number" value={form.amount} onChange={(event) => update('amount', event.target.value)} placeholder="0" /></label>
        <label>Category<select value={form.category} onChange={(event) => update('category', event.target.value)}>{['Hosting', 'Database', 'AI Credits', 'Email API', 'Domain', 'Other'].map((item) => <option key={item}>{item}</option>)}</select></label>
        <label>Description<input value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Payment description" /></label>
        <button className="tactical-button" onClick={submitPayment}>Submit Payment</button>
        {result ? <pre className="cfo-report-output">{result}</pre> : null}
      </section>
    </section>
  );
}

function CfoPaymentVaultInteractiveTab({ data }) {
  const vault = data.paymentVault || {};
  const vaultMetrics = safeCfoArray(vault.metrics);
  const vaultRecentPayments = safeCfoArray(vault.recentPayments);
  const [activeVaultTab, setActiveVaultTab] = useState('Billing Methods');
  const [billingMethods, setBillingMethods] = useState([]);
  const [selectedBillingId, setSelectedBillingId] = useState('');
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [billingAudit, setBillingAudit] = useState(billingAuditSeed);
  const [notice, setNotice] = useState('Payment provider not connected. Add card/billing method through secure provider tokenization only.');
  const selectedBillingMethod = billingMethods.find((method) => method.id === selectedBillingId) || billingMethods[0] || null;

  function connectCfoBillingMethod(metadata = {}) {
    const amountInr = moneyNumber(metadata.amountInr) || 1000;
    const vendorName = metadata.vendorName || 'OpenAI';
    const tokenizedMethod = {
      ...(billingMethodConnectedSeed[0] || {}),
      id: `cfo-pay-method-${Date.now()}`,
      payment_token_reference: `pay_tok_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      provider: metadata.bankName || billingMethodConnectedSeed[0]?.provider || '',
      masked_reference: metadata.maskedReference || billingMethodConnectedSeed[0]?.masked_reference || '',
      billing_owner: metadata.cardName || 'Founder Office',
      expiry_month: metadata.expiryMonth || billingMethodConnectedSeed[0]?.expiry_month || '',
      expiry_year: metadata.expiryYear || billingMethodConnectedSeed[0]?.expiry_year || '',
      monthly_limit_inr: amountInr,
      transaction_limit_inr: amountInr,
      auto_renew_enabled: Boolean(metadata.autoRenewAllowed),
      linked_vendors: [vendorName],
      last_used: 'Not used in GOPU OS',
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    };
    setBillingMethods((current) => [tokenizedMethod, ...current]);
    setSelectedBillingId(tokenizedMethod.id);
    setBillingAudit((current) => [{
      id: `cfo-billing-audit-${Date.now()}`,
      billing_method_id: tokenizedMethod.id,
      event_type: 'billing_method_connected',
      actor: 'Payment Provider',
      safe_notes: `Token metadata stored for ${vendorName} with INR limit ${formatInr(amountInr)}. Raw card number, CVV, OTP, and banking credentials were not stored.`,
      created_at: new Date().toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    }, ...current]);
    setNotice(`Tokenized billing method added. Amount/limit in INR: ${formatInr(amountInr)}.`);
    setConnectModalOpen(false);
    setActiveVaultTab('Billing Methods');
  }

  return (
    <section className="cfo-finance-workspace">
      <section className="payment-security-notice cfo-payment-security-notice">
        <LockKeyhole size={18} />
        <strong>GOPU OS stores only tokenized payment references.</strong>
        <span>{notice}</span>
        <button className="tactical-button" onClick={() => setConnectModalOpen(true)}>Renewal Payment Method</button>
      </section>
      <nav className="payment-vault-tabs cfo-vault-tabs" aria-label="CFO Payment Vault sections">
        {paymentVaultTabs.map((tab) => <button key={tab} className={activeVaultTab === tab ? 'active' : ''} onClick={() => setActiveVaultTab(tab)}>{tab}</button>)}
      </nav>
      <div className="cfo-finance-grid metrics">
        {vaultMetrics.map((metric, index) => {
          const item = metric || {};
          const label = item.label || item[0] || `Metric ${index + 1}`;
          const value = item.value ?? item[1] ?? 'Not set';
          const status = item.status || item[2] || 'Monitoring';
          return <article key={`${label}-${index}`}><span>{label}</span><strong>{value}</strong><small>{status}</small></article>;
        })}
      </div>
      {activeVaultTab === 'Billing Methods' && (
        <section className="payment-vault-workspace payment-vault-workspace-two secure-billing-workspace cfo-inline-vault-workspace">
          <BillingMethodsPanel methods={billingMethods} selectedMethod={selectedBillingMethod} providerConnected={billingMethods.length > 0} onOpen={setSelectedBillingId} onConnect={() => setConnectModalOpen(true)} />
          <BillingMethodDetailPanel method={selectedBillingMethod} vendorRules={billingVendorRuleSeed} audit={billingAudit} />
          <BillingSecurityRulesPanel />
        </section>
      )}
      {activeVaultTab === 'Overview' && (
        <>
          <BillingVaultOverview billingMethods={billingMethods} providerConnected={billingMethods.length > 0} onConnect={() => setConnectModalOpen(true)} />
          <CfoFinanceTable title="Recent Payment Vault Records" subtitle="CFO-controlled infrastructure payment evidence" columns={['Vendor', 'Amount INR', 'Payment status', 'Receipt status']} rows={vaultRecentPayments.length ? vaultRecentPayments : [['OpenAI', '₹950', 'OTP Required', 'Receipt Pending']]} />
        </>
      )}
      {activeVaultTab === 'Payments' && <CfoFinanceTable title="Recent Payment Vault Records" subtitle="CFO-controlled infrastructure payment evidence" columns={['Vendor', 'Amount INR', 'Payment status', 'Receipt status']} rows={vaultRecentPayments.length ? vaultRecentPayments : [['OpenAI', '₹950', 'OTP Required', 'Receipt Pending']]} />}
      {activeVaultTab === 'Renewals' && <RenewalForecastPanel forecasts={paymentForecastSeed} expanded={paymentForecastSeed[0]?.id} onToggle={() => setNotice('Renewal forecast opened. Payment execution still requires token, INR limit, and approval rule.')} />}
      {activeVaultTab === 'Vendors' && <VendorTrustRegistry vendors={vendorTrustSeed} />}
      {activeVaultTab === 'Receipts' && <ReceiptRepository receipts={paymentReceiptsSeed} onMarkReviewed={(id) => setNotice(`Receipt ${id} marked reviewed locally.`)} />}
      {activeVaultTab === 'Audit' && <BillingAuditPanel audit={billingAudit} />}
      <div className="cfo-finance-grid two">
        <CfoFinancePanel title="Payment Governance Rules" subtitle="INR-capped and founder-controlled" icon={ShieldCheck} rows={['<= ₹1,000: CFO-controlled auto-renew only for trusted infrastructure vendors.', '₹1,001-₹1,500: CFO + COO confirmation required.', '> ₹1,500: Director review required.', 'Never auto-pay suppliers, freight, customs, tax, salaries, refunds, or arbitrary invoices.']} />
        <CfoFinancePanel title="OTP Security Rule" subtitle="CFO payment confirmation" icon={LockKeyhole} rows={['Founder receives OTP externally.', 'Founder securely shares OTP with CFO.', 'CFO enters OTP once in secure confirmation screen.', 'OTP is never stored, logged, reused, or included in AI memory.']} />
      </div>
      {connectModalOpen && <ConnectBillingMethodModal onCancel={() => setConnectModalOpen(false)} onTokenize={connectCfoBillingMethod} />}
    </section>
  );
}

function CfoPaymentVaultTab({ data }) {
  const vault = data.paymentVault || {};
  const vaultMetrics = safeCfoArray(vault.metrics);
  const vaultRecentPayments = safeCfoArray(vault.recentPayments);
  const vaultWorkflowSteps = safeCfoArray(vault.workflowSteps);
  const vaultAuditLog = safeCfoArray(vault.auditLog);
  return (
    <section className="cfo-finance-workspace">
      <div className="cfo-finance-grid metrics">
        {vaultMetrics.map((metric, index) => {
          const item = metric || {};
          const label = item.label || item[0] || `Metric ${index + 1}`;
          const value = item.value ?? item[1] ?? 'Not set';
          const status = item.status || item[2] || 'Monitoring';
          return <article key={`${label}-${index}`}><span>{label}</span><strong>{value}</strong><small>{status}</small></article>;
        })}
      </div>
      <CfoFinanceTable title="Recent Payment Vault Records" subtitle="CFO-controlled infrastructure payment evidence" columns={['Vendor', 'Amount INR', 'Payment status', 'Receipt status']} rows={vaultRecentPayments.length ? vaultRecentPayments : [['OpenAI', '₹950', 'OTP Required', 'Receipt Pending']]} />
      <div className="cfo-finance-grid two">
        <CfoFinancePanel title="Payment Governance Rules" subtitle="INR-capped and founder-controlled" icon={ShieldCheck} rows={['<= ₹1,000: CFO-controlled auto-renew only for trusted infrastructure vendors.', '₹1,001-₹1,500: CFO + COO confirmation required.', '> ₹1,500: Founder approval mandatory.', 'Never auto-pay suppliers, freight, customs, tax, salaries, refunds, or arbitrary invoices.']} />
        <CfoFinancePanel title="OTP Security Rule" subtitle="CFO payment confirmation" icon={LockKeyhole} rows={['Founder receives OTP externally.', 'Founder securely shares OTP with CFO.', 'CFO enters OTP once in secure confirmation screen.', 'OTP is never stored, logged, reused, or included in AI memory.']} />
      </div>
      <CfoFinancePanel title="Payment Workflow" subtitle="CTO detects, CFO executes" icon={Route} rows={vaultWorkflowSteps.length ? vaultWorkflowSteps : ['CTO detects renewal.', 'COO confirms need.', 'CFO validates and executes.', 'Founder approval/OTP if required.', 'CFO stores receipt in Payment Vault.']} />
      <CfoFinanceTable title="Payment Audit Visibility" subtitle="Audit records never contain OTP values" columns={['Actor', 'Event', 'Notes']} rows={vaultAuditLog.length ? vaultAuditLog : [['CFO Command', 'Vault update', 'Receipt pending']]} />
    </section>
  );
}

function CfoReportsWorkspace({ output, onGenerate, onFounderSummary, onSendReportSlack }) {
  return (
    <section className="cfo-finance-workspace">
      <div className="cfo-report-actions">
        <button className="tactical-button" onClick={onGenerate}>Generate Report</button>
        <button className="ghost-button" onClick={onSendReportSlack}>Send Report to Slack</button>
        <button className="ghost-button" onClick={onFounderSummary}>Founder Financial Summary</button>
      </div>
      {output ? <pre className="cfo-report-output">{output}</pre> : <CfoEmptyState message="Generate CFO report to view finance summary." />}
    </section>
  );
}

function CfoIntelligencePanel({ data, onOpenPricing, onOpenPaymentVault }) {
  const sourceRisks = safeCfoArray(data.risks).length ? safeCfoArray(data.risks) : cfoFinanceData.riskRows;
  const risks = safeCfoArray(sourceRisks).slice(0, 6).map((risk) => Array.isArray(risk)
    ? risk
    : (() => {
      const item = risk || {};
      return [
        item.type || item.risk_type || 'Financial Risk',
        item.risk_level || item.severity || 'Low',
        item.description || item.reason || item.vendor || 'No description recorded.'
      ];
    })());
  const renewals = safeCfoArray(data.renewals).slice(0, 4).map((row) => Array.isArray(row)
    ? row
    : (() => {
      const item = row || {};
      return [
        item.vendor || item.name || 'Renewal',
        item.due_date || item.created_at || item.frequency || 'Pending date',
        formatCfoInr(item.amount),
        item.status || item.category || 'Monitoring',
        item.category || item.frequency || ''
      ];
    })());
  const [openedItem, setOpenedItem] = useState('');
  return (
    <aside className="pricing-panel cfo-intelligence-panel">
      <div className="approval-section-header"><div><span>CFO Intelligence</span><h2>Finance risk watch</h2></div><BrainCircuit size={18} /></div>
      <div className="cfo-intelligence-list">
        {risks.map(([riskName, severity, reason]) => (
          <article key={`${riskName}-${severity}`} role="button" tabIndex={0} onClick={() => setOpenedItem(`${riskName}: ${reason}`)} onKeyDown={(event) => event.key === 'Enter' && setOpenedItem(`${riskName}: ${reason}`)}>
            <div><strong>{riskName}</strong><SeverityBadge severity={severity} /></div>
            <span>{reason}</span>
          </article>
        ))}
      </div>
      {openedItem && <div className="cfo-inline-detail"><strong>Risk opened</strong><span>{openedItem}</span><small>Route to pricing, Payment Vault, or Director approval if this risk blocks release.</small></div>}
      <div className="cfo-intelligence-subpanel">
        <strong>Renewal Risks</strong>
        {(renewals.length ? renewals : [['OpenAI credits', '2026-05-31', '₹950', 'Attention']]).map((row, index) => {
          const rowKey = safeCfoJoin(row, '-');
          const rowDetail = safeCfoJoin(row, ' / ');
          return <button type="button" key={`${rowKey}-${index}`} onClick={() => setOpenedItem(`Renewal: ${rowDetail}`)}>{row[0]} / {row[2]} / {row[4] || row[3]}</button>;
        })}
      </div>
      <div className="cfo-intelligence-subpanel">
        <strong>Approval Logic</strong>
        {['Margin < 20% requires founder approval.', 'Payment > ₹1,500 requires founder approval.', 'Unknown vendor or high-risk buyer requires founder approval.', 'Aggressive pricing or freight uncertainty requires review.'].map((item) => <button type="button" key={item} onClick={() => setOpenedItem(item)}>{item}</button>)}
      </div>
      <div className="cfo-report-actions">
        <button className="tactical-button" onClick={onOpenPricing}>Review Quotations</button>
        <button className="ghost-button" onClick={onOpenPaymentVault}>Payment Vault</button>
      </div>
    </aside>
  );
}

function CfoFinancePanel({ title, subtitle, icon: Icon, rows }) {
  const [selectedRow, setSelectedRow] = useState('');
  const safeRows = safeCfoArray(rows);
  return (
    <section className="pricing-panel cfo-finance-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>{subtitle}</h2></div><Icon size={18} /></div>
      <div className="approval-memory-list cfo-action-list">{safeRows.map((row, index) => {
        const label = safeCfoString(row);
        return <button type="button" key={`${label}-${index}`} onClick={() => setSelectedRow(label)}>{label}</button>;
      })}</div>
      {selectedRow && (
        <div className="cfo-inline-detail">
          <strong>{title}</strong>
          <span>{selectedRow}</span>
          <small>Action opened in CFO workspace. Use the connected workflow, approval, or Payment Vault controls where required before execution.</small>
        </div>
      )}
    </section>
  );
}

function CfoFinanceTable({ title, subtitle, columns, rows }) {
  const [selectedRow, setSelectedRow] = useState(null);
  const safeColumns = safeCfoArray(columns);
  const safeRows = normalizeCfoTableRows(rows, safeColumns);
  const selectedKey = selectedRow ? safeCfoJoin(selectedRow, '-') : '';
  return (
    <section className="pricing-panel cfo-finance-table-panel">
      <div className="approval-section-header"><div><span>{title}</span><h2>{subtitle}</h2></div><CircleDollarSign size={18} /></div>
      <div className="cfo-finance-table" style={{ '--cfo-cols': safeColumns.length || 1 }}>
        <div className="cfo-finance-table-head">{safeColumns.map((column) => <span key={column}>{column}</span>)}</div>
        {safeRows.map((row, rowIndex) => {
          const rowKey = safeCfoJoin(row, '-') || `row-${rowIndex}`;
          return (
            <button type="button" key={`${rowKey}-${rowIndex}`} className={selectedKey === rowKey ? 'selected' : ''} onClick={() => setSelectedRow(row)}>
              {row.map((cell, index) => index === 0 ? <strong key={`${rowKey}-${index}`}>{cell}</strong> : <span key={`${rowKey}-${index}`}>{cell}</span>)}
            </button>
          );
        })}
      </div>
      {selectedRow && (
        <div className="cfo-inline-detail">
          <strong>{selectedRow[0]}</strong>
          <span>{safeCfoJoin(safeColumns.map((column, index) => `${column}: ${selectedRow[index] || 'Not set'}`), ' / ')}</span>
          <small>Opened from {title}. Review status, owner, amount, and approval requirements before any payment or buyer-facing action.</small>
        </div>
      )}
    </section>
  );
}

function PricingEngineHeader({ onBack, rates, onOpenTasks }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const usd = rates.find((rate) => rate.pair === 'USD/INR')?.rate || 'Live';
  return (
    <header className="deck-header pricing-header">
      <div className="deck-header-copy">
        <span>GOPU Export OS</span>
        <h1>CFO Pricing Engine</h1>
        <p>Live commercial pricing workspace for product cost, FX, margins, and quotation decisions.</p>
      </div>
      <div className="deck-header-controls">
        <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
        <div className="coo-status"><StatusPulse /><strong>Pricing Engine Status: Monitoring</strong></div>
        <div className="coo-status"><FileCheck2 size={15} /><strong>Pending Quote Approvals: 4</strong></div>
        <div className="coo-status"><CircleDollarSign size={15} /><strong>USD/INR {usd}</strong></div>
        <div className="coo-time"><CalendarClock size={16} /><span>{now.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span></div>
        <button className="ghost-button deck-logout" onClick={onOpenTasks}><Workflow size={15} />Task Engine</button>
        <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
      </div>
    </header>
  );
}

function QuotationInputPanel({ inputs, errors, updateInput, onRun, onOpenApprovalWall }) {
  const selectedCountry = inputs.destination_country === otherPricingOption ? inputs.custom_destination_country : inputs.destination_country;
  const ports = inputs.destination_country && inputs.destination_country !== otherPricingOption ? pricingPortsByCountry[inputs.destination_country] || ['Main Commercial Port'] : [];
  const groups = [
    ['Controlled Smart Inputs', [
      ['company_name', 'Company Name', 'text'],
      ['product_name', 'Product', 'select', [...pricingProducts, otherPricingOption]],
      ...(inputs.product_name === otherPricingOption ? [['custom_product_name', 'Other Product', 'text']] : []),
      ['quantity', 'Quantity', 'number'],
      ['destination_country', 'Country', 'select', [...pricingCountries, otherPricingOption]],
      ...(inputs.destination_country === otherPricingOption ? [['custom_destination_country', 'Other Country', 'text']] : []),
      ['incoterm', 'Incoterm', 'select', ['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP']],
      ['shipping_mode', 'Shipping Mode', 'select', ['Sea freight', 'Air freight', 'Courier', 'Road / multimodal']]
    ]]
  ];
  return (
    <aside className="pricing-panel quotation-input-panel">
      <div className="approval-section-header"><div><span>Quotation Inputs</span><h2>Validated quote setup</h2></div><SlidersHorizontal size={18} /></div>
      <p className="pricing-note">Dropdowns, cost basis, incoterm inclusion, margin type, and approval states are reused from the old GOPU OS Pricing Engine.</p>
      {groups.map(([group, fields]) => (
        <div className="pricing-input-group" key={group}>
          <strong>{group}</strong>
          <div>
            {fields.map(([field, label, type, options]) => (
              type === 'select'
                ? <PricingSelect key={field} label={label} value={inputs[field]} options={options} error={errors[field]} onChange={(value) => updateInput(field, value)} />
                : <SecureInput key={field} label={label} value={inputs[field]} error={errors[field]} onChange={(value) => updateInput(field, value)} />
            ))}
          </div>
        </div>
      ))}
      <div className="pricing-source-box">
        <strong>Selected route basis</strong>
        <span>{selectedCountry || 'No country selected'} / {inputs.destination_port || ports[0] || 'No port selected'} / {inputs.incoterm}</span>
      </div>
      <div className="pricing-action-row">
        <button className="tactical-button" onClick={() => onRun('Pricing calculation generated')}>Calculate Price</button>
        <button className="ghost-button" onClick={() => onRun('Draft quote saved')}>Save Draft Quote</button>
        <button className="ghost-button" onClick={async () => { if (await onRun('CFO review requested')) onOpenApprovalWall(); }}>Request CFO Review</button>
      </div>
    </aside>
  );
}

function PricingSelect({ label, value, options, error, onChange }) {
  return (
    <label className="secure-input pricing-select-field">
      <span>{label}</span>
      <select value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select</option>
        {options.map((option) => <option key={option} value={option}>{pricingOptionLabel(option)}</option>)}
      </select>
      {error && <small>{error}</small>}
    </label>
  );
}

function CommercialAssumptionsPanel({ inputs, costRows, risk }) {
  const productKey = marketProductKey(inputs.product_name === otherPricingOption ? inputs.custom_product_name : inputs.product_name);
  const marketPrice = pricingMarketFallbacks[productKey];
  const included = safeCfoJoin(safeCfoArray(costRows).filter((row) => row.included).map((row) => row.label), ', ') || 'None';
  const missingOldLogic = ['HSN preset', 'MOQ preset', 'supplier cluster', 'product freight preset', 'country payment preset', 'country risk profile'];
  const assumptions = [
    ['Destination Port', inputs.destination_port || 'Auto-selected after country'],
    ['Payment Terms', inputs.payment_terms],
    ['Quote Currency', inputs.currency],
    ['Cost Currency', inputs.cost_currency],
    ['Exchange Rate', `1 ${inputs.currency} = ${inputs.cost_currency} ${inputs.exchange_rate}`],
    ['Margin Type', pricingOptionLabel(inputs.margin_type)],
    ['Target / Minimum', `${inputs.target_margin_percent}% / ${inputs.minimum_margin_percent}%`],
    ['Market Reference', marketPrice ? `INR ${marketPrice}/kg old fallback` : 'Manual source check required'],
    ['Incoterm Cost Rows', included],
    ['Approval State', `${risk.status} / ${risk.decision}`]
  ];
  return (
    <section className="pricing-panel commercial-assumptions-panel">
      <div className="approval-section-header"><div><span>Auto-loaded Commercial Logic</span><h2>Derived from old GOPU OS rules</h2></div><Database size={18} /></div>
      <div className="commercial-assumption-grid">
        {assumptions.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="missing-logic-box">
        <strong>Old logic not found for</strong>
        <p>{safeCfoJoin(missingOldLogic, ', ')}. These are not invented in the commercial core.</p>
      </div>
    </section>
  );
}

function CostRowsPanel({ rows, updateCostRow }) {
  return (
    <section className="pricing-panel cost-rows-panel">
      <div className="approval-section-header"><div><span>Advanced Cost Overrides</span><h2>Old GOPU OS cost rows</h2></div><Calculator size={18} /></div>
      <p className="pricing-note">These rows preserve the old calculation source of truth. Empty included rows intentionally trigger manual review instead of guessing costs.</p>
      <div className="pricing-cost-row-list">
        {rows.map((row) => (
          <article className={!row.included ? 'excluded' : ''} key={row.key}>
            <div>
              <strong>{row.label}</strong>
              <span>{row.included ? 'Included' : 'Excluded by Incoterm'}</span>
            </div>
            <input inputMode="decimal" value={row.amount} placeholder="Amount" onChange={(event) => updateCostRow(row.key, { amount: event.target.value.replace(/[^\d.]/g, '') })} />
            <select value={row.currency} onChange={(event) => updateCostRow(row.key, { currency: event.target.value })}>
              {pricingCurrencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
            <select value={row.basis} onChange={(event) => updateCostRow(row.key, { basis: event.target.value, estimated: false })}>
              {pricingBasisOptions.map((option) => <option key={option} value={option}>{pricingOptionLabel(option)}</option>)}
            </select>
            <label className="cost-include-toggle">
              <input type="checkbox" checked={row.included} onChange={(event) => updateCostRow(row.key, { included: event.target.checked })} />
              Use
            </label>
          </article>
        ))}
      </div>
    </section>
  );
}

function ForexSnapshot({ rates, status }) {
  return (
    <section className="pricing-panel forex-snapshot">
      <div className="approval-section-header"><div><span>Live Forex Snapshot</span><h2>Commercial currency watch</h2></div><small>{status}</small></div>
      <div className="forex-snapshot-grid">
        {rates.map((rate) => <div className={rate.direction} key={rate.pair}><strong>{rate.pair}</strong><span>{rate.rate}</span><small>{rate.change}</small></div>)}
      </div>
    </section>
  );
}

function PriceCalculationEngine({ calc, currency }) {
  const rows = [
    ['Raw Material Cost', calc.productBaseCost], ['Packaging Cost', calc.packagingCost], ['Freight Cost', calc.freightCost], ['Commission Cost', calc.commission], ['Other Included Costs', calc.otherCosts], ['Total Cost', calc.totalLandedCost], ['Achieved Margin %', `${calc.margin.toFixed(2)}%`], ['Target Quote', calc.suggestedQuotePrice], ['Minimum Quote', calc.minimumSafePrice], ['Range Low / Unit', calc.recommendedPriceRangeLow], ['Range High / Unit', calc.recommendedPriceRangeHigh], ['Recommended Final Quote', calc.recommendedOfferPrice]
  ];
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>Commercial Calculation Engine</span><h2>Pricing formula wrapper</h2></div><Gauge size={18} /></div>
      <div className="calculation-grid">
        {rows.map(([label, value], index) => <div key={label}><span>{label}</span><strong>{typeof value === 'number' ? formatMoney(value, currency) : value}</strong><i style={{ transitionDelay: `${index * 35}ms` }} /></div>)}
      </div>
      <div className="estimate-strip">
        <span>FOB estimate <strong>{formatMoney(calc.fobEstimate, currency)}</strong></span>
        <span>CIF estimate <strong>{formatMoney(calc.cifEstimate, currency)}</strong></span>
        <span>EXW estimate <strong>{formatMoney(calc.exwEstimate, currency)}</strong></span>
      </div>
    </section>
  );
}

function PricingFormulaBreakdown({ calc, inputs, currency }) {
  const rows = [
    ['Base Product Cost', calc.productBaseCost, 'old raw_material_cost line'],
    ['+ Packaging', calc.packagingCost, 'old packaging_cost line'],
    ['+ Freight', calc.freightCost, `${inputs.incoterm} inclusion rule`],
    ['+ Insurance', calc.lines.find((line) => line.key === 'insurance_cost')?.line_total || 0, `${inputs.incoterm} inclusion rule`],
    ['+ Commission', calc.commission, 'old commission_cost line'],
    ['+ Misc Charges', calc.otherCosts, 'processing, labor, overhead, inland, clearance, port'],
    ['+ Margin', calc.profitAmount, pricingOptionLabel(inputs.margin_type)],
    ['= Final Recommended Quote', calc.recommendedOfferPrice, `${inputs.target_margin_percent}% target / ${inputs.minimum_margin_percent}% minimum`]
  ];
  return (
    <section className="pricing-panel formula-breakdown-panel">
      <div className="approval-section-header"><div><span>Pricing Formula Breakdown</span><h2>Why this quote number exists</h2></div><SlidersHorizontal size={18} /></div>
      <div className="formula-breakdown-list">
        {rows.map(([label, value, note], index) => (
          <div className={index === rows.length - 1 ? 'final' : ''} key={label}>
            <span>{label}</span>
            <strong>{formatMoney(value, currency)}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <p className="pricing-note">Formula uses old GOPU OS commercial behavior. Overrides must go through CFO/founder review before quote release.</p>
    </section>
  );
}

function MarketValidationPanel({ calc, risk, currency }) {
  const comparison = risk.decision === 'HOLD' ? 'Do Not Quote' : risk.decision === 'FOUNDER_REVIEW' ? 'Approval Required' : 'Ready for review';
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>Market Price Intelligence</span><h2>Advisory comparison</h2></div><StatusBadge label={comparison} state={comparison === 'Approval Required' ? 'attention' : 'progress'} /></div>
      <div className="market-band">
        <div><span>Historical internal quote range</span><strong>{formatMoney(calc.minimumSafePrice * 0.96, currency)} - {formatMoney(calc.suggestedQuotePrice * 1.08, currency)}</strong></div>
        <div><span>Estimated market band</span><strong>{formatMoney(calc.aggressiveMarketPrice, currency)} - {formatMoney(calc.suggestedQuotePrice * 1.12, currency)}</strong></div>
        <div><span>Comparison status</span><strong>{comparison}</strong></div>
      </div>
      <p className="pricing-note">Advisory only. Connect approved internal history and market data before treating this as live market truth.</p>
    </section>
  );
}

function PricingWorkflowPanel({ risk }) {
  const steps = ['Lead Intake', 'Product Preset Loaded', 'Country Logic Loaded', 'Incoterm Applied', 'Freight Logic Applied', 'Commercial Formula Calculated', 'CFO Validation', 'Operational Check', 'Founder Approval', 'Draft Quote Generated'];
  return (
    <section className="pricing-panel pricing-workflow-panel">
      <div className="approval-section-header"><div><span>Pricing Workflow</span><h2>{risk.decision === 'QUOTE' ? 'Ready for draft quote control' : 'Approval gate active'}</h2></div><Workflow size={18} /></div>
      <div className="pricing-workflow-steps">
        {steps.map((step, index) => (
          <div key={step} className={index >= 6 && risk.decision !== 'QUOTE' ? 'attention' : ''}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function CFOReviewPanel({ calc, risk }) {
  const approvalReason = risk.decision === 'HOLD'
    ? risk.reason
    : risk.decision === 'FOUNDER_REVIEW'
      ? risk.reason
      : 'No founder approval trigger beyond standard manual commercial review.';
  const rows = [
    ['Margin Safety', calc.margin >= 12 ? 'Within old minimum margin guardrail.' : 'Margin risk detected.'],
    ['Cash Flow Impact', 'Advance payment recommended.'],
    ['FX Exposure', 'Uses old exchange-rate conversion field. Refresh or enter manually before quote use.'],
    ['Payment Risk', risk.risks.some((item) => item.factor === 'Payment terms' && item.impact === 'NEGATIVE') ? 'Risky payment terms require founder review.' : 'No automatic payment approval trigger.'],
    ['Freight Risk', risk.missingCriticalFields.includes('freight_cost') ? 'Freight cost is required by selected Incoterm.' : 'Freight follows selected Incoterm inclusion.'],
    ['Discount Impact', 'No discount approved in Connect Supabase to activate.'],
    ['Customer Risk', risk.decision === 'FOUNDER_REVIEW' ? 'Founder review required where buyer risk is high or blocked.' : 'Buyer risk does not block quote preview.'],
    ['Operational Risk', 'COO availability confirmation required before release.']
  ];
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>CFO Command Review</span><h2>Commercial safety read</h2></div><CircleDollarSign size={18} /></div>
      <div className={`approval-clarity-banner ${risk.decision.toLowerCase()}`}>
        <strong>{risk.decision === 'QUOTE' ? 'CFO Review Ready' : risk.decision === 'HOLD' ? 'Do Not Quote' : 'Founder Approval Required'}</strong>
        <span>{approvalReason}</span>
      </div>
      <div className="cfo-review-list">{rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
    </section>
  );
}

function FounderApprovalLogic({ risk, onOpenApprovalWall }) {
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>Founder Approval Logic</span><h2>{risk.status} / {risk.decision}</h2></div><TriangleAlert size={18} /></div>
      <div className="approval-trigger-list">
        {risk.missingCriticalFields.map((item) => <span key={item}>Missing: {item.replaceAll('_', ' ')}</span>)}
        {risk.risks.map((item) => <span key={`${item.factor}-${item.note}`}>{item.factor}: {item.note}</span>)}
        {!risk.missingCriticalFields.length && !risk.risks.length && <span>No approval trigger detected from old pricing rules.</span>}
      </div>
      <button className="tactical-button command-button" onClick={onOpenApprovalWall}>Send to Director Command Center <ChevronRight size={16} /></button>
    </section>
  );
}

function QuotationPreview({ inputs, calc, risk, onRun, onOpenApprovalWall }) {
  return (
    <section className="pricing-panel quotation-preview">
      <div className="approval-section-header"><div><span>Quotation Preview</span><h2>Draft quotation output</h2></div><FileText size={18} /></div>
      <div className="quote-preview-grid">
        {[
          ['Buyer', inputs.company_name || 'Draft buyer'],
          ['Product', inputs.product_name === otherPricingOption ? inputs.custom_product_name : inputs.product_name || 'Draft product'],
          ['Quantity', `${inputs.quantity} ${inputs.unit_of_measure}`],
          ['Incoterm', inputs.incoterm],
          ['Currency', inputs.currency],
          ['Quote Price', formatMoney(calc.recommendedOfferPrice, inputs.currency)],
          ['Unit Price', formatMoney(calc.recommendedUnitPrice, inputs.currency)],
          ['Payment Terms', inputs.payment_terms],
          ['Validity', '7 days unless founder changes'],
          ['Recommended Conditions', `${risk.status} / ${risk.decision}`]
        ].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>
      <div className="pricing-action-row">
        <button className="tactical-button" onClick={() => onRun('Draft quotation generated')}>Generate Draft Quotation</button>
        <button className="ghost-button" onClick={() => onRun('Draft quotation saved')}>Save Draft</button>
        <button className="ghost-button" onClick={async () => { if (await onRun('Founder approval routing prepared')) onOpenApprovalWall(); }}>Send for Founder Approval</button>
      </div>
    </section>
  );
}

function CFOIntelligencePanel() {
  const notes = ['Pricing risk notes: low-margin and freight variance watch', 'Overdue customer warning: local customer aging review needed', 'FX exposure: AED/INR and USD/INR watched', 'Cash-flow sensitivity: advance payment recommended', 'Repeat discount requests: 2 this month', 'Market comparison notes: advisory mode only'];
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>CFO Intelligence Layer</span><h2>Risk heatmap</h2></div><Database size={18} /></div>
      <div className="risk-heatmap">{['Low', 'Medium', 'High', 'Critical'].map((level) => <span className={`heat-${level.toLowerCase()}`} key={level}>{level}</span>)}</div>
      <div className="approval-memory-list">{notes.map((note) => <span key={note}>{note}</span>)}</div>
    </section>
  );
}

function PricingAuditTrail({ audit }) {
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>Pricing Audit Trail</span><h2>Commercial trace</h2></div><Activity size={18} /></div>
      <div className="approval-audit-list">{audit.map((event) => <div key={event.id}><time>{event.time}</time><strong>{event.event}</strong><span>{event.actor} - {event.status}</span></div>)}</div>
    </section>
  );
}

function SavedQuotesPanel({ quotes }) {
  return (
    <section className="pricing-panel">
      <div className="approval-section-header"><div><span>Draft Quotations</span><h2>Saved quote control</h2></div><ClipboardList size={18} /></div>
      <div className="saved-quote-grid">{quotes.map((quote) => <article key={quote.id}><strong>{quote.id}</strong><span>{quote.buyer}</span><p>{quote.product} - {quote.destination}</p><small>Margin {quote.margin} - {quote.status}</small><StatusBadge label={quote.approval} state={getApprovalState(quote.approval)} /></article>)}</div>
    </section>
  );
}

function CreativeWalletCard() {
  const [wallet, setWallet] = useState(null);
  const [topupAmount, setTopupAmount] = useState('500');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  async function load() {
    try {
      const res = await fetch('/api/cfo/wallet');
      const json = await res.json();
      if (json.ok) setWallet(json.wallet);
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function doTopup() {
    const amount = Number(topupAmount);
    if (!amount || amount <= 0) return setMsg('Enter a valid amount.');
    setLoading(true);
    try {
      const res = await fetch('/api/cfo/wallet/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, note: 'Founder top-up' }) });
      const json = await res.json();
      if (json.ok) { setMsg(`Topped up ₹${amount}. New balance: ₹${json.balance}`); await load(); }
      else setMsg(json.message || 'Top-up failed.');
    } catch { setMsg('Request failed.'); }
    setLoading(false);
  }

  const balance = Number(wallet?.balance ?? 0);
  const threshold = Number(wallet?.threshold ?? wallet?.auto_topup_threshold ?? 100);
  const tone = balance < threshold ? 'red' : balance < 300 ? 'amber' : 'green';
  const recent = (wallet?.transactions || []).slice(-5).reverse();

  return (
    <section className="pricing-panel cfo-creative-wallet">
      <div className="approval-section-header">
        <div><span>CFO Creative Wallet</span><h2>Marketing Campaign Budget</h2></div>
        <CircleDollarSign size={18} />
      </div>
      <div className="wallet-balance-row">
        <span className={`wallet-balance wallet-balance-${tone}`}>&#8377;{balance.toFixed(0)}</span>
        <span className="wallet-threshold">Auto top-up below &#8377;{threshold}</span>
      </div>
      <div className="wallet-topup-row">
        <input type="number" value={topupAmount} onChange={e => setTopupAmount(e.target.value)} className="wallet-topup-input" min="1" placeholder="Amount (INR)" />
        <button className="tactical-button" onClick={doTopup} disabled={loading}>{loading ? 'Processing...' : 'Top Up'}</button>
      </div>
      {msg && <p className="wallet-msg">{msg}</p>}
      {recent.length > 0 && (
        <div className="wallet-txns">
          <span className="wallet-txn-header">Recent transactions</span>
          {recent.map((tx, i) => (
            <div key={tx.id || i} className={`wallet-txn wallet-txn-${tx.type}`}>
              <span>{tx.description}</span>
              <strong>{tx.amount > 0 ? '+' : ''}&#8377;{Math.abs(tx.amount)}</strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function CFOCommandPage({ onBack, onOpenPricing, onOpenApprovalWall, onOpenPaymentVault }) {
  const { rates, status } = useLiveForexRates();
  return (
    <ExportOSShell className="operational-export-shell pricing-engine-shell">
      <header className="deck-header pricing-header">
        <div className="deck-header-copy">
          <span>GOPU Export OS</span>
          <Breadcrumb items={[{ label: 'Command Deck', onClick: onBack }, { label: 'CFO Finance' }]} />
          <h1>CFO Command</h1>
          <p>Chief Financial Officer - commercial discipline, margins, pricing safety, and approval control.</p>
        </div>
        <div className="deck-header-controls">
          <div className="coo-verified"><ShieldCheck size={16} /><span>Founder session verified</span></div>
          <div className="coo-status"><StatusPulse /><strong>Status: Margin Risk Monitoring</strong></div>
          <button className="ghost-button deck-logout" onClick={onOpenPricing}><CircleDollarSign size={15} />Pricing Engine</button>
          <button className="ghost-button deck-logout" onClick={onOpenPaymentVault}><FileCheck2 size={15} />Payment Vault</button>
          <button className="ghost-button deck-logout" onClick={onOpenApprovalWall}><FileCheck2 size={15} />Director Queue</button>
          <button className="ghost-button deck-logout" onClick={onBack}><ArrowLeft size={15} /> Command Deck</button>
        </div>
      </header>
      <section className="cfo-command-layout">
        <aside className="pricing-panel cfo-identity-panel">
          <div className="spine-module-icon"><CircleDollarSign size={28} /></div>
          <span className="coo-kicker">CFO Command</span>
          <h2>Commercial Intelligence Layer</h2>
          <p>Controls quote viability, margin discipline, cash safety, FX exposure, discount exceptions, and founder approval routing.</p>
          <button className="tactical-button command-button" onClick={onOpenPricing}>Open Pricing Engine <ChevronRight size={16} /></button>
        </aside>
        <main className="cfo-main-stack">
          <MarginHealthDashboard metrics={cfoMetrics} />
          <PendingQuoteApprovals onOpenApprovalWall={onOpenApprovalWall} />
          <PricingRiskAlerts alerts={cfoAlerts} />
          <div className="cfo-split-grid">
            <FXExposureMonitor rates={rates} status={status} />
            <CashFlowWatch />
            <DiscountExceptionPanel />
            <CFOIntelligenceMemory />
          </div>
          <CreativeWalletCard />
          <PaymentGovernancePanel />
          <PricingAuditTrail audit={pricingAuditEvents} />
        </main>
      </section>
    </ExportOSShell>
  );
}

function MarginHealthDashboard({ metrics }) {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>Margin Health Dashboard</span><h2>CFO operating picture</h2></div><Gauge size={18} /></div><div className="cfo-metric-grid">{metrics.map((metric) => {
    const metricValue = Number(String(metric.value).replace(/[^0-9.-]/g, '')) || 0;
    const mockTrend = [65, 70, 68, 74, 71, 78, metricValue].filter(Boolean);
    return <div key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong>{metric.change || metric.trend || metric.delta ? <TrendIndicator value={metric.change ?? metric.trend ?? metric.delta} /> : null}<Sparkline data={metric.history || metric.trendData || mockTrend} /><small>{metric.status}</small></div>;
  })}</div></section>;
}

function PendingQuoteApprovals({ onOpenApprovalWall }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let mounted = true;
    fetch('/api/director/approvals?status=Pending')
      .then((r) => r.ok ? r.json() : null)
      .then((json) => {
        if (!mounted) return;
        const list = json?.approvals || [];
        setApprovals(list.slice(0, 4));
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);
  return (
    <section className="pricing-panel">
      <div className="approval-section-header">
        <div><span>Pending Quote Approvals</span><h2>Director review queue {!loading && <span style={{ color: '#f59e0b', fontSize: '0.8rem' }}>({approvals.length})</span>}</h2></div>
        <FileCheck2 size={18} />
      </div>
      {loading ? (
        <div className="approval-memory-list"><span>Loading live approvals…</span></div>
      ) : approvals.length === 0 ? (
        <div className="approval-memory-list"><span style={{ color: '#22c55e' }}>No pending approvals. All quotes are cleared.</span></div>
      ) : (
        <div className="saved-quote-grid">
          {approvals.map((approval) => (
            <article key={approval.id}>
              <strong>{approval.buyer_name || approval.title || 'Pending'}</strong>
              <span>{approval.approval_type || approval.request_type || 'Quote Approval'}</span>
              <p>{approval.product || ''}{approval.quantity ? ` · ${approval.quantity}` : ''}{approval.quotation_amount ? ` · ₹${Number(approval.quotation_amount).toLocaleString('en-IN')}` : ''}</p>
              <small style={{ color: '#f59e0b' }}>{approval.status || approval.approval_status || 'Pending'}</small>
            </article>
          ))}
        </div>
      )}
      <button className="tactical-button command-button" onClick={onOpenApprovalWall}>Open Director Approval Queue <ChevronRight size={16} /></button>
    </section>
  );
}

function PricingRiskAlerts({ alerts }) {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>Pricing Risk Alerts</span><h2>Commercial exceptions</h2></div><TriangleAlert size={18} /></div>{alerts.map((alert) => <article className="executive-alert-row" key={alert.title}><strong>{alert.title}</strong><span>{alert.status} - {alert.risk}</span><p>{alert.detail}</p></article>)}</section>;
}

function FXExposureMonitor({ rates, status }) {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>FX Exposure Monitor</span><h2>{status}</h2></div><CircleDollarSign size={18} /></div><div className="forex-snapshot-grid">{rates.map((rate) => <div className={rate.direction} key={rate.pair}><strong>{rate.pair}</strong><span>{rate.rate}</span><small><TrendIndicator value={rate.change} suffix="" /></small></div>)}</div></section>;
}

function CashFlowWatch() {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>Cash Flow Watch</span><h2>Cash Attention</h2></div><Activity size={18} /></div><div className="approval-memory-list"><span>Advance payment recommended for unknown buyers.</span><span>Payment term exceptions require founder approval.</span><span>High-value quotes remain draft until approval.</span></div></section>;
}

function DiscountExceptionPanel() {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>Discount Exception Reviews</span><h2>Draft Prepared</h2></div><SlidersHorizontal size={18} /></div><div className="approval-memory-list"><span>Pacific Retail Group: above-threshold request.</span><span>Repeat discount pattern requires CFO note.</span><span>No discount can be released without founder approval.</span></div></section>;
}

function CFOIntelligenceMemory() {
  return <section className="pricing-panel"><div className="approval-section-header"><div><span>CFO Intelligence Memory</span><h2>Memory</h2></div><Database size={18} /></div><div className="approval-memory-list"><span>Common pricing exceptions</span><span>Margin threshold history</span><span>FX exposure lessons</span><span>Founder-approved commercial policies</span></div></section>;
}

function calculateInvoiceTotals(invoice) {
  const subtotal = invoice.items.reduce((sum, item) => {
    const taxable = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.discount) || 0);
    return sum + taxable;
  }, 0);
  const taxTotal = invoice.export_mode === 'LUT/Bond Without IGST' ? 0 : invoice.items.reduce((sum, item) => {
    const taxable = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0) - (Number(item.discount) || 0);
    return sum + (taxable * ((Number(item.tax_rate) || 0) / 100));
  }, 0);
  const grandTotal = subtotal + taxTotal + Number(invoice.freight || 0) + Number(invoice.insurance || 0) + Number(invoice.other_charges || 0);
  return { subtotal, taxTotal, grandTotal, amountInWords: `${invoice.currency} ${grandTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })} only` };
}

function buildInvoiceValidation(invoice) {
  const serviceChecks = validateInvoiceFromService(invoice);
  const c = invoice.company_snapshot;
  const totals = calculateInvoiceTotals(invoice);
  const item = invoice.items[0] || {};
  const isPacking = ['Packing List', 'Invoice-cum-Packing List', 'Commercial Invoice + Packing List Package'].includes(invoice.invoice_type);
  const isCommercial = ['Commercial Invoice', 'Invoice-cum-Packing List', 'Commercial Invoice + Packing List Package', 'Export Tax Invoice under LUT', 'Buyer Invoice Copy', 'Draft Invoice Copy', 'Revised Invoice'].includes(invoice.invoice_type);
  const isLut = invoice.invoice_type === 'Export Tax Invoice under LUT' || invoice.export_mode === 'LUT/Bond Without IGST';
  const checks = [
    ['invoice_type_supported', 'Document Type', 'document/invoice type exists', invoiceDocumentTypes.some((type) => type.name === invoice.invoice_type), 'System', 'critical'],
    ['buyer_name', 'Buyer', 'buyer name present', invoice.buyer_name, 'Sales', 'critical'],
    ['product_description', 'Product', 'product description present', item.product_description, 'Operations', 'critical'],
    ['quantity', 'Product', 'quantity present', Number(item.quantity) > 0, 'Operations', 'critical'],
    ['invoice_status_allowed', 'Invoice', 'uses controlled invoice status', ['Draft', 'Validation Failed', 'Validation Passed', 'COO Review Required', 'CFO Review Required', 'Founder Review Required', 'Approved for Release', 'PDF Draft Ready', 'Email Draft Prepared', 'Revision Required'].includes(invoice.status), 'System', 'critical'],
    ['audit_log', 'Approval', 'audit log created', true, 'System', 'info']
  ];
  if (invoice.invoice_type === 'Proforma Invoice') {
    checks.push(
      ['price', 'Commercial', 'price present', Number(item.unit_price) > 0, 'Finance', 'critical'],
      ['currency', 'Commercial', 'currency selected', invoice.currency, 'Finance', 'critical'],
      ['validity', 'Commercial', 'validity present', invoice.validity, 'Sales', 'critical'],
      ['payment_terms', 'Commercial', 'payment terms selected', invoice.payment_terms, 'Finance', 'critical'],
      ['founder_approval', 'Approval', 'founder approval before sending', false, 'Founder Office', 'critical']
    );
  }
  if (isCommercial) {
    checks.push(
      ['legal_company_name', 'Company', 'seller legal company name present', c.legal_company_name, 'Founder Office', 'critical'],
      ['registered_address', 'Company', 'registered address present', c.registered_address, 'Founder Office', 'critical'],
      ['gstin', 'Company', 'GSTIN present', c.gstin, 'Finance', 'critical'],
      ['iec', 'Company', 'IEC present', c.iec, 'Compliance', 'critical'],
      ['pan', 'Company', 'PAN present', c.pan, 'Finance', 'critical'],
      ['authorized_signatory', 'Company', 'authorized signatory present', c.authorized_signatory, 'Founder Office', 'critical'],
      ['buyer_address', 'Buyer', 'buyer address present', invoice.buyer_address, 'Sales', 'critical'],
      ['buyer_country', 'Buyer', 'buyer country present', invoice.buyer_country, 'Sales', 'critical'],
      ['destination_country', 'Buyer', 'destination country present', invoice.destination_country, 'Operations', 'critical'],
      ['invoice_number', 'Invoice', 'invoice number present', invoice.invoice_number, 'Finance', 'critical'],
      ['invoice_date', 'Invoice', 'invoice date present', invoice.invoice_date, 'Finance', 'critical'],
      ['financial_year', 'Invoice', 'financial year present', invoice.financial_year, 'Finance', 'critical'],
      ['hsn_code', 'Product', 'HSN code present', item.hsn_code, 'Compliance', 'critical'],
      ['unit_price', 'Product', 'unit price present', Number(item.unit_price) > 0, 'Finance', 'critical'],
      ['incoterm', 'Commercial', 'incoterm selected', invoice.incoterm, 'Operations', 'critical'],
      ['origin', 'Export', 'origin present', invoice.country_of_origin, 'Compliance', 'critical'],
      ['bank_terms', 'Bank', 'bank/payment terms present', c.default_bank_account_masked && invoice.payment_terms, 'Finance', 'critical'],
      ['declaration', 'Declaration', 'declaration present', LUT_EXPORT_ENDORSEMENT, 'Documentation', 'critical'],
      ['founder_approval', 'Approval', 'founder approval required', false, 'Founder Office', 'critical']
    );
  }
  if (isLut) {
    checks.push(
      ['lut_arn', 'LUT', 'LUT ARN/reference present', c.lut_arn, 'Founder Office', 'critical'],
      ['lut_financial_year', 'LUT', 'LUT financial year present', c.lut_financial_year, 'Founder Office', 'critical'],
      ['lut_validity', 'LUT', 'LUT validity present', c.lut_valid_from && c.lut_valid_to, 'Founder Office', 'critical'],
      ['lut_active', 'LUT', 'LUT status active/verified', ['Active', 'Verified'].includes(c.lut_status), 'Founder Office', 'critical'],
      ['lut_founder_verified', 'LUT', 'founder verified', c.lut_founder_verified_status === 'Verified', 'Founder Office', 'critical'],
      ['export_mode', 'Export', 'export mode selected as LUT/Bond Without IGST', invoice.export_mode === 'LUT/Bond Without IGST', 'Finance', 'critical'],
      ['endorsement', 'Export', 'LUT endorsement attached', LUT_EXPORT_ENDORSEMENT, 'Documentation', 'critical'],
      ['no_igst', 'Export', 'IGST is 0% / amount 0 under LUT', invoice.export_mode === 'LUT/Bond Without IGST' && totals.taxTotal === 0 && Number(item.tax_rate || 0) === 0, 'Finance', 'critical']
    );
  }
  if (isPacking) {
    checks.push(
      ['package_type', 'Packing', 'package type present', invoice.package_type || item.packing_type, 'Operations', 'critical'],
      ['package_count', 'Packing', 'number of bags/cartons present', invoice.package_count, 'Operations', 'critical'],
      ['net_weight', 'Packing', 'net weight present', invoice.net_weight, 'Operations', 'critical'],
      ['gross_weight', 'Packing', 'gross weight present', invoice.gross_weight, 'Operations', 'critical'],
      ['shipment_reference', 'Packing', 'shipment reference if available', true, 'Operations', 'info']
    );
  }
  if (invoice.invoice_type === 'Buyer Invoice Copy') {
    checks.push(
      ['validation_passed', 'Release', 'validation passed', invoice.status === 'Approved for Release', 'System', 'critical'],
      ['cfo_done', 'Release', 'CFO review done', false, 'CFO Command', 'critical'],
      ['coo_done', 'Release', 'COO review done', false, 'COO Command', 'critical'],
      ['founder_done', 'Release', 'founder approval done', false, 'Founder Office', 'critical']
    );
  }
  if (invoice.invoice_type === 'Revised Invoice') {
    checks.push(
      ['revision_number', 'Revision', 'revision number present', invoice.revision_number, 'Documentation', 'critical'],
      ['revision_reason', 'Revision', 'revision reason present', invoice.revision_reason, 'Documentation', 'critical'],
      ['revised_by', 'Revision', 'revised by present', invoice.revised_by, 'Documentation', 'critical'],
      ['revised_date', 'Revision', 'revised date present', invoice.revised_date, 'Documentation', 'critical']
    );
  }
  if (invoice.invoice_type === 'Cancelled/Void Invoice') {
    checks.push(
      ['cancellation_reason', 'Void Record', 'cancellation reason present', invoice.cancellation_reason, 'Founder Office', 'critical'],
      ['cancelled_by', 'Void Record', 'cancelled by present', invoice.cancelled_by, 'Founder Office', 'critical'],
      ['cancelled_at', 'Void Record', 'date/time present', invoice.cancelled_at, 'System', 'critical'],
      ['history_kept', 'Void Record', 'invoice history retained', true, 'System', 'critical']
    );
  }
  checks.push(
    ['coo_review', 'Approval', 'COO operations review required', false, 'COO Command', 'critical'],
    ['cfo_review', 'Approval', 'CFO commercial/pricing review required', false, 'CFO Command', 'critical'],
    ['hsn_review', 'Export', 'HSN review flagged', false, 'Founder Office', 'critical'],
    ['origin_review', 'Export', 'country of origin reviewed', false, 'Founder Office', 'critical'],
    ['amount_words', 'Commercial', 'amount in words generated', totals.amountInWords, 'System', 'critical']
  );
  return checks.map(([key, group, message, pass, owner, severity]) => ({
    key,
    group,
    message,
    owner,
    severity,
    status: pass ? 'Passed' : 'Failed'
  })).map((check) => {
    const serviceCheck = serviceChecks.find((item) => item.key === check.key);
    return serviceCheck || check;
  });
}

export { QuotationSopPricingPage };
export default PricingEnginePage;