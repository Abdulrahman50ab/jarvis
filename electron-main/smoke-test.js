const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const websiteOutDir = path.resolve(__dirname, '../website/out');
const indexPath = path.join(websiteOutDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.log('[SMOKE TEST] website/out is missing. Running build-website.js first...');
  const { spawnSync } = require('child_process');
  const buildResult = spawnSync('node', ['build-website.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (buildResult.status !== 0) {
    console.error('[SMOKE TEST ERROR] Failed to compile static website before testing.');
    process.exit(1);
  }
}

console.log('[SMOKE TEST] Launching Electron in automated verification mode...');
const electronBin = process.platform === 'win32'
  ? path.resolve(__dirname, 'node_modules/.bin/electron.cmd')
  : path.resolve(__dirname, 'node_modules/.bin/electron');

const child = spawn(electronBin, ['.', '--test-smoke', '--no-sandbox', '--disable-gpu'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

const timeout = setTimeout(() => {
  console.error('[SMOKE TEST ERROR] Test timed out after 35 seconds without clean exit.');
  child.kill();
  process.exit(1);
}, 35000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  if (code === 0) {
    console.log('[SMOKE TEST SUCCESS] Electron verified successfully with code 0.');
    process.exit(0);
  } else {
    console.error(`[SMOKE TEST ERROR] Electron exited with non-zero code ${code}.`);
    process.exit(code || 1);
  }
});
