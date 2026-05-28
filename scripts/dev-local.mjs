import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const viteArgs = ['--host', '127.0.0.1', ...process.argv.slice(2)];

function startProcess(name, command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
    windowsHide: true
  });

  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[dev] ${name} exited${signal ? ` with signal ${signal}` : ` with code ${code}`}.`);
    shutdown(code || 1);
  });

  return child;
}

let shuttingDown = false;
let apiServer;
let viteServer;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of [apiServer, viteServer]) {
    if (child && !child.killed) child.kill();
  }
  setTimeout(() => process.exit(code), 250);
}

apiServer = startProcess('local API bridge', process.execPath, ['server/slackServer.mjs']);
viteServer = startProcess('Vite', process.execPath, [viteBin, ...viteArgs]);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
