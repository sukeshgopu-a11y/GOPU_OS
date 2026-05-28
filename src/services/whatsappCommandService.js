import { createTableService } from './serviceHelpers.js';

export const whatsappCommandService = createTableService('whatsapp_commands');
export const parsedCommandService = createTableService('parsed_commands');
export const commandWorkflowRouteService = createTableService('command_workflow_routes');
export const whatsappResponseDraftService = createTableService('whatsapp_response_drafts');

export async function loadWhatsAppCommandLayer() {
  const [commands, parsedCommands, routes, drafts] = await Promise.all([
    whatsappCommandService.list(),
    parsedCommandService.list(),
    commandWorkflowRouteService.list(),
    whatsappResponseDraftService.list()
  ]);

  return { commands, parsedCommands, routes, drafts };
}
