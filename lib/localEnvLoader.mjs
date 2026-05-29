import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

function parseEnvValue(rawValue = '') {
  const value = String(rawValue).trim();
  if (!value) return '';
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  const hashIndex = value.indexOf('#');
  return (hashIndex === -1 ? value : value.slice(0, hashIndex)).trim();
}

function loadFile(filePath, loadedKeys) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  const isLocal = path.basename(filePath) === '.env.local';

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const canSet = !process.env[key] || (isLocal && loadedKeys.has(key));
    if (!canSet) continue;

    const value = parseEnvValue(rawValue);
    if (!value) continue;
    process.env[key] = value;
    loadedKeys.add(key);
  }
}

export function loadLocalEnvFiles() {
  if (loaded || process.env.VERCEL) return;
  loaded = true;

  const loadedKeys = new Set();
  for (const file of ['.env', '.env.local']) {
    loadFile(path.join(process.cwd(), file), loadedKeys);
  }
}
