import { getProviderStatus } from './providerStatus.mjs';

export async function getOpenAIStatus() {
  return getProviderStatus('openai', { context: 'cmo_step_2' });
}
