function wait() {
  return Promise.resolve();
}

function inr(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN')}`;
}

const cfoSummary = {
  pendingQuoteApprovals: 0,
  marginRiskAlerts: 0,
  invoiceReleaseApprovals: 0,
  paymentVaultSummary: inr(0),
  renewalPaymentAlerts: 0,
  openaiCreditRenewalStatus: 'No live renewal data connected',
  highRiskWorkflows: 0,
  recommendations: []
};

const marginAnalytics = {
  byProduct: [],
  riskyQuotes: [],
  freightImpact: []
};

const receivables = [];
const payables = [];

const paymentVaultSummary = {
  metrics: [],
  recentPayments: [],
  auditLog: [],
  workflowSteps: [
    'CTO detects renewal or credit requirement',
    'COO confirms operational necessity',
    'CFO validates budget, vendor, category, and risk',
    'Founder approval is triggered if required',
    'CFO executes payment after approval path clears',
    'Founder receives OTP externally and shares it securely with CFO',
    'CFO enters OTP once; OTP is cleared immediately',
    'CTO captures receipt; CFO stores record in Payment Vault'
  ]
};

const financialRisks = [];
const renewalForecast = [];

export async function getCFOSummary() {
  await wait();
  return { data: cfoSummary, error: null };
}

export async function getMarginAnalytics() {
  await wait();
  return { data: marginAnalytics, error: null };
}

export async function getReceivables() {
  await wait();
  return { data: receivables, error: null };
}

export async function getPayables() {
  await wait();
  return { data: payables, error: null };
}

export async function getPaymentVaultSummary() {
  await wait();
  return { data: paymentVaultSummary, error: null };
}

export async function getFinancialRisks() {
  await wait();
  return { data: financialRisks, error: null };
}

export async function getRenewalForecast() {
  await wait();
  return { data: renewalForecast, error: null };
}

export async function generateCFOReport() {
  await wait();
  return {
    data: [
      'CFO report prepared from connected finance data.',
      'No finance records are available until live backend data is connected.',
      'No bank balance, payment receipt, or buyer payment is confirmed without backend evidence.'
    ].join('\n'),
    error: null
  };
}

export async function generateFounderFinancialSummary() {
  await wait();
  return {
    data: [
      'Founder financial summary:',
      '1. No connected finance records are available yet.',
      '2. Invoice release remains approval-controlled.',
      '3. Infrastructure payments are INR-capped and CFO-controlled.',
      '4. OTP values are never stored, logged, reused, or handled by AI.',
      '5. Supplier, freight, customs, taxes, salaries, refunds, and unknown invoices are never auto-paid.'
    ].join('\n'),
    error: null
  };
}
