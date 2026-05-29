const products = ['Onion', 'Garlic', 'Rice', 'Pepper', 'Cardamom', 'Turmeric', 'Chilli', 'Spices'];
const importerTypes = ['Distributor', 'Retailer', 'Wholesaler', 'Food Processor', 'Restaurant Chain'];
const sources = ['APEDA', 'Spice Board', 'Trade Directory', 'LinkedIn', 'Public Registry'];
const payments = ['LC', 'TT', 'Advance'];
const volumes = ['10-50 MT', '50-200 MT', '200-500 MT', '500+ MT'];

const marketProfiles = [
  {
    country: 'Australia',
    count: 200,
    cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'],
    names: ['Indian Grocery', 'Spice N Rice', 'Apna Bazar', 'Asian Food Import', 'Subcontinental Foods', 'Curry Pantry', 'Masala Market', 'Fresh Produce Supply'],
    notes: 'Sample prospect based on public importer/distributor market type in Australia.'
  },
  {
    country: 'UAE',
    count: 150,
    cities: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman'],
    names: ['Gulf Food Trading', 'Lulu Supplier Desk', 'Union Coop Supplier', 'Al Safeer Distribution', 'Dubai Commodity Foods', 'Emirates Spice Trading', 'Al Madina Foodstuff'],
    notes: 'Sample prospect based on public Dubai and Abu Dhabi food trading market type.'
  },
  {
    country: 'Saudi Arabia',
    count: 100,
    cities: ['Riyadh', 'Jeddah', 'Dammam', 'Mecca'],
    names: ['Riyadh Food Distribution', 'Jeddah Spice Import', 'Gulf Commodity Supply', 'Saudi HORECA Foods', 'Red Sea Food Trading', 'Arabian Retail Supply'],
    notes: 'Sample prospect based on public Saudi food distributor and spice importer market type.'
  },
  {
    country: 'Singapore',
    count: 80,
    cities: ['Singapore'],
    names: ['Little India Food Supply', 'Singapore Commodity Traders', 'Asian Grocery Wholesale', 'Mustafa Supplier Type', 'Foodservice Ingredient Import', 'Jurong Food Trading'],
    notes: 'Sample prospect based on public Singapore food distributor and commodity trader market type.'
  },
  {
    country: 'United Kingdom',
    count: 120,
    cities: ['London', 'Birmingham', 'Leicester', 'Manchester', 'Southall'],
    names: ['Asian Food Wholesale', 'Natco Foods Distributor Type', 'TRS Foods Distributor Type', 'London Spice Import', 'Birmingham Cash & Carry', 'Ethnic Grocery Supply'],
    notes: 'Sample prospect based on public UK Asian food wholesale and grocery distribution market type.'
  },
  {
    country: 'United States',
    count: 150,
    cities: ['New Jersey', 'New York', 'Chicago', 'Houston', 'Los Angeles', 'Dallas'],
    names: ['Patel Grocery Supply', 'Indian Grocery Chain Buyer', 'US Spice Import', 'South Asian Foods Wholesale', 'HORECA Ingredient Supply', 'Ethnic Foods Distribution'],
    notes: 'Sample prospect based on public US Indian grocery, spice, and ethnic food distribution market type.'
  },
  {
    country: 'Germany',
    count: 80,
    cities: ['Frankfurt', 'Hamburg', 'Berlin', 'Munich', 'Dusseldorf'],
    names: ['Organic Spice Import', 'Hamburg Commodity Traders', 'Frankfurt Food Ingredients', 'EU Asian Foods Wholesale', 'Bio Gewurz Import', 'German Retail Supply'],
    notes: 'Sample prospect based on public German organic food importer and spice trader market type.'
  },
  {
    country: 'Canada',
    count: 30,
    cities: ['Toronto', 'Vancouver', 'Brampton', 'Calgary'],
    names: ['Canadian Indian Grocery Supply', 'Toronto Spice Import', 'Brampton Food Wholesale', 'Pacific Asian Foods'],
    notes: 'Sample prospect based on public Canadian South Asian grocery and spice importer market type.'
  },
  {
    country: 'Japan',
    count: 20,
    cities: ['Tokyo', 'Osaka', 'Yokohama'],
    names: ['Tokyo Spice Ingredient Import', 'Japan Curry Ingredient Supply', 'Osaka Food Trading', 'Asian Ingredient Distributor'],
    notes: 'Sample prospect based on public Japanese specialty ingredient importer market type.'
  },
  {
    country: 'Netherlands',
    count: 25,
    cities: ['Rotterdam', 'Amsterdam', 'The Hague'],
    names: ['Rotterdam Spice Traders', 'Dutch Organic Food Import', 'EU Commodity Gateway', 'Amsterdam Asian Foods'],
    notes: 'Sample prospect based on public Dutch food import and re-export market type.'
  },
  {
    country: 'France',
    count: 25,
    cities: ['Paris', 'Marseille', 'Lyon'],
    names: ['French Spice Import', 'Paris Asian Grocery Supply', 'Marseille Food Trading', 'EU Ethnic Foods'],
    notes: 'Sample prospect based on public French ethnic grocery and spice import market type.'
  },
  {
    country: 'New Zealand',
    count: 20,
    cities: ['Auckland', 'Wellington', 'Christchurch'],
    names: ['Auckland Indian Grocery Supply', 'NZ Spice Import', 'Pacific Food Distribution', 'Wellington Asian Foods'],
    notes: 'Sample prospect based on public New Zealand grocery and ingredient distribution market type.'
  }
];

function pad(value) {
  return String(value).padStart(3, '0');
}

function pick(list, index, offset = 0) {
  return list[(index + offset) % list.length];
}

function productSet(index) {
  const first = pick(products, index);
  const second = pick(products, index, 3);
  const third = pick(products, index, 5);
  return Array.from(new Set([first, second, third])).slice(0, index % 4 === 0 ? 3 : 2);
}

function makeRecord(profile, localIndex, globalIndex) {
  const product_interest = productSet(globalIndex);
  const importer_type = pick(importerTypes, globalIndex);
  const source = pick(sources, globalIndex);
  const city = pick(profile.cities, localIndex);
  const nameRoot = pick(profile.names, localIndex);
  const confidence = 62 + (globalIndex % 34);
  return {
    id: `imp-${pad(globalIndex + 1)}`,
    company_name: `${nameRoot} ${city} ${pad(localIndex + 1)}`,
    country: profile.country,
    city,
    product_interest,
    products: product_interest,
    preferred_products: product_interest,
    importer_type,
    confidence,
    confidence_score: confidence,
    source,
    source_platform: source,
    status: 'Active',
    verification_status: confidence >= 82 ? 'High Confidence' : confidence >= 70 ? 'Review Required' : 'Manual Verification Required',
    outreach_status: 'Not Contacted',
    email: '',
    phone: '',
    linkedin: '',
    website: '',
    notes: profile.notes,
    company_description: profile.notes,
    annual_import_volume: pick(volumes, globalIndex),
    preferred_payment: pick(payments, globalIndex),
    preferred_payment_terms: pick(payments, globalIndex),
    preferred_shipment_type: globalIndex % 3 === 0 ? 'FCL sea freight' : 'LCL / trial shipment',
    last_active: '2025',
    recent_activity: 'Public market type identified; verify before outreach.',
    buyer_risk: confidence >= 82 ? 'Low' : confidence >= 70 ? 'Medium' : 'High',
    apeda_relevance: product_interest.filter((item) => ['Onion', 'Garlic', 'Rice'].includes(item)),
    spice_board_relevance: product_interest.filter((item) => ['Pepper', 'Cardamom', 'Turmeric', 'Chilli', 'Spices'].includes(item)),
    tags: ['Sample Data', 'Verify before outreach', importer_type],
    assigned_owner: 'CIO Command',
    source_url: '',
    last_synced_at: null
  };
}

export const importerSeedData = marketProfiles.flatMap((profile, profileIndex) => {
  const previous = marketProfiles.slice(0, profileIndex).reduce((sum, item) => sum + item.count, 0);
  return Array.from({ length: profile.count }, (_, index) => makeRecord(profile, index, previous + index));
});

export default importerSeedData;
