import { getCtoProviderEnvConfig } from './ctoEnvKeys.mjs';
import { loadLocalEnvFiles } from './localEnvLoader.mjs';

const providerAliasMap = {
  openai: [
    'openai',
    'OpenAI',
    'OPENAI',
    'openai_api_key',
    'OPENAI_API_KEY',
    'cto.openai',
    'provider.openai',
    'ai.openai',
    'CTO_PROVIDER_OPENAI_API_KEY',
    'CTO_OPENAI_API_KEY',
    'GOPU_CTO_OPENAI_API_KEY'
  ],
  heygen: [
    'heygen',
    'HeyGen',
    'HEYGEN',
    'heygen_api_key',
    'HEYGEN_API_KEY',
    'cto.heygen',
    'provider.heygen',
    'video.heygen',
    'CTO_PROVIDER_HEYGEN_API_KEY',
    'CTO_HEYGEN_API_KEY',
    'GOPU_CTO_HEYGEN_API_KEY'
  ],
  linkedin: [
    'linkedin',
    'LinkedIn',
    'LINKEDIN',
    'LINKEDIN_ACCESS_TOKEN',
    'CTO_PROVIDER_LINKEDIN_ACCESS_TOKEN',
    'CTO_LINKEDIN_ACCESS_TOKEN'
  ],
  meta: [
    'meta',
    'Meta',
    'META',
    'META_PAGE_ACCESS_TOKEN',
    'META_ACCESS_TOKEN',
    'CTO_PROVIDER_META_ACCESS_TOKEN',
    'CTO_META_ACCESS_TOKEN'
  ],
  instagram: [
    'instagram',
    'Instagram',
    'INSTAGRAM',
    'META_PAGE_ACCESS_TOKEN',
    'META_ACCESS_TOKEN',
    'INSTAGRAM_ACCESS_TOKEN'
  ],
  facebook: [
    'facebook',
    'Facebook',
    'FACEBOOK',
    'META_PAGE_ACCESS_TOKEN',
    'META_ACCESS_TOKEN',
    'FACEBOOK_ACCESS_TOKEN'
  ]
};

const missingMessages = {
  openai: 'OpenAI key missing in CTO provider vault.',
  heygen: 'HeyGen key missing in CTO provider vault.',
  linkedin: 'LinkedIn access token missing in CTO provider vault.',
  meta: 'Meta access token missing in CTO provider vault.',
  instagram: 'Meta access token missing in CTO provider vault.',
  facebook: 'Meta access token missing in CTO provider vault.'
};

function parseVaultJson() {
  const raw = process.env.CTO_PROVIDER_VAULT_JSON?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function readSecretValue(value) {
  if (typeof value === 'string') return value.trim();
  if (value && typeof value === 'object') {
    return String(value.apiKey || value.api_key || value.key || value.secret || value.value || '').trim();
  }
  return '';
}

function getCaseInsensitiveOwnValue(object, key) {
  if (!object || typeof object !== 'object') return undefined;
  if (Object.prototype.hasOwnProperty.call(object, key)) return object[key];
  const foundKey = Object.keys(object).find((item) => item.toLowerCase() === String(key).toLowerCase());
  return foundKey ? object[foundKey] : undefined;
}

function getPathValue(object, alias) {
  const parts = String(alias).split('.');
  if (parts.length === 1) return getCaseInsensitiveOwnValue(object, alias);
  let current = object;
  for (const part of parts) {
    current = getCaseInsensitiveOwnValue(current, part);
    if (current === undefined || current === null) return undefined;
  }
  return current;
}

function secretFromVaultJson(providerKey, vault) {
  const aliases = providerAliasMap[providerKey] || [providerKey];
  for (const alias of aliases) {
    const direct = getCaseInsensitiveOwnValue(vault, alias);
    const directSecret = readSecretValue(direct);
    if (directSecret) return { secret: directSecret, alias };

    const pathValue = getPathValue(vault, alias);
    const pathSecret = readSecretValue(pathValue);
    if (pathSecret) return { secret: pathSecret, alias };
  }

  const direct = getCaseInsensitiveOwnValue(vault, providerKey);
  const directSecret = readSecretValue(direct);
  return directSecret ? { secret: directSecret, alias: providerKey } : { secret: '', alias: '' };
}

function readEnvAlias(alias) {
  const direct = process.env[alias]?.trim();
  if (direct) return direct;
  const foundName = Object.keys(process.env).find((name) => name.toLowerCase() === String(alias).toLowerCase());
  return foundName ? process.env[foundName]?.trim() || '' : '';
}

function logResolution(providerKey, resolved, source = '', alias = '') {
  const event = resolved ? 'resolved' : 'not_resolved';
  console.log('[cto-provider-vault]', JSON.stringify({
    provider: providerKey,
    event,
    source: resolved ? source : undefined,
    alias: resolved ? alias : undefined
  }));
}

export function getCtoProviderSecret(providerKey) {
  loadLocalEnvFiles();

  const key = String(providerKey || '').trim().toLowerCase();
  const vault = parseVaultJson();
  const vaultSecret = secretFromVaultJson(key, vault);
  if (vaultSecret.secret) {
    logResolution(key, true, 'CTO_PROVIDER_VAULT_JSON', vaultSecret.alias);
    return { ok: true, secret: vaultSecret.secret, source: 'CTO_PROVIDER_VAULT_JSON', alias: vaultSecret.alias };
  }

  const envNames = providerAliasMap[key] || [key];
  const envConfig = getCtoProviderEnvConfig(key);
  const configuredAliases = envConfig?.aliases || [];
  for (const envName of [...envNames, ...configuredAliases]) {
    const value = readEnvAlias(envName);
    if (value) {
      logResolution(key, true, 'env', envName);
      return { ok: true, secret: value, source: envName, alias: envName };
    }
  }

  logResolution(key, false);
  return { ok: false, secret: '', source: '', alias: '', error: missingMessages[key] || `${key} key missing in CTO provider vault.` };
}
