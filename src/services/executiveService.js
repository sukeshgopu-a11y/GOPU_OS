import { createTableService } from './serviceHelpers.js';

export const executiveCommandService = createTableService('executive_commands');
export const executiveActivityTimelineService = createTableService('executive_activity_timeline');

export async function loadExecutiveCommandDeck() {
  const [commands, timeline] = await Promise.all([
    executiveCommandService.list(),
    executiveActivityTimelineService.list()
  ]);

  return { commands, timeline };
}
