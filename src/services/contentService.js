import { createTableService } from './serviceHelpers.js';

export const contentItemService = createTableService('content_items');
export const contentCalendarService = createTableService('content_calendar');
export const marketingCampaignService = createTableService('marketing_campaigns');
export const competitorReviewService = createTableService('competitor_reviews');
export const brandApprovalRequestService = createTableService('brand_approval_requests');

export async function loadContentEngine() {
  const [items, calendar, campaigns, competitors, approvals] = await Promise.all([
    contentItemService.list(),
    contentCalendarService.list(),
    marketingCampaignService.list(),
    competitorReviewService.list(),
    brandApprovalRequestService.list()
  ]);

  return { items, calendar, campaigns, competitors, approvals };
}
