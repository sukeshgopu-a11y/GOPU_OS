import { createTableService } from './serviceHelpers.js';

export const pricingRequestService = createTableService('pricing_requests');
export const pricingCalculationService = createTableService('pricing_calculations');
export const marketValidationService = createTableService('market_validation');
export const quoteDraftService = createTableService('quote_drafts');

export async function loadPricingWorkspace() {
  const [requests, calculations, validations, quotes] = await Promise.all([
    pricingRequestService.list(),
    pricingCalculationService.list(),
    marketValidationService.list(),
    quoteDraftService.list()
  ]);

  return { requests, calculations, validations, quotes };
}
