function wait() {
  return Promise.resolve();
}

const importerSignals = [];
const countryDemand = [];
const competitorMovement = [];
const productTrends = [];
const opportunityAlerts = [];
const sourceReadiness = [];

export async function getMarketIntelligenceDashboard() {
  await wait();
  return {
    data: {
      importerSignals,
      countryDemand,
      competitorMovement,
      productTrends,
      opportunityAlerts,
      sourceReadiness,
      summary: {
        activeSignals: 0,
        highOpportunityAlerts: 0,
        risingCountries: 0,
        competitorMoves: 0,
        topCountry: 'No live data',
        topProduct: 'No live data',
        nextAction: 'Connect live market intelligence sources.'
      }
    },
    error: null
  };
}

export async function generateMarketOpportunitySummary() {
  await wait();
  return {
    data: [
      'Market Opportunity Summary',
      'No connected market intelligence records are available yet.',
      'No private search tracking, individual buyer surveillance, or identity tracking is claimed.'
    ].join('\n'),
    error: null
  };
}
