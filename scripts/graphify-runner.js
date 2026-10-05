#!/usr/bin/env node
// =============================================================================
// Cross-platform npm runner for Graphify (Linux, macOS, Windows)
// Football Player Token Marketplace - Grupo Q
// =============================================================================

const { spawnSync } = require('child_process');
const path = require('path');

const scriptPath = path.join(__dirname, 'graphify.py');
const isWin = process.platform === 'win32';
const pyCandidates = isWin ? ['py', 'python', 'python3'] : ['python3', 'python'];

let executed = false;
for (const py of pyCandidates) {
  const result = spawnSync(py, [scriptPath, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: isWin,
  });
  if (result.error && result.error.code === 'ENOENT') {
    continue;
  }
  executed = true;
  process.exit(result.status ?? 0);
}

if (!executed) {
  console.error('[ERROR] No se encontró Python 3 instalado en el sistema (py, python, python3).');
  process.exit(1);
}
