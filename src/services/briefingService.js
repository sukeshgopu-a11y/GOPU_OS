import { createTableService } from './serviceHelpers.js';

export const founderBriefingService = createTableService('founder_briefings');
export const briefingSectionService = createTableService('briefing_sections');
export const briefingAlertService = createTableService('briefing_alerts');
export const founderActionItemService = createTableService('founder_action_items');

export async function loadFounderBriefings() {
  const [briefings, sections, alerts, actionItems] = await Promise.all([
    founderBriefingService.list(),
    briefingSectionService.list(),
    briefingAlertService.list(),
    founderActionItemService.list()
  ]);

  return { briefings, sections, alerts, actionItems };
}
