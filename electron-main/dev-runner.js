const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const websiteOutDir = path.resolve(__dirname, '../website/out');
const indexPath = path.join(websiteOutDir, 'index.html');
const shouldRebuild = process.argv.includes('--rebuild') || !fs.existsSync(indexPath);

function runElectron() {
  console.log('\n========================================');
  console.log(' JARVIS Desktop — Development & Testing');
  console.log('========================================');
  console.log('Launching Electron desktop application in live test mode...');
  console.log('Press Ctrl+C in terminal or close window to exit.\n');

  const electronBin = process.platform === 'win32'
    ? path.resolve(__dirname, 'node_modules/.bin/electron.cmd')
    : path.resolve(__dirname, 'node_modules/.bin/electron');

  const extraArgs = process.argv.slice(2).filter((arg) => arg !== '--rebuild');

  const child = spawn(electronBin, ['.', ...extraArgs], {
    cwd: __dirname,
    stdio: 'inherit',
    env: {
      ...process.env,
    },
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}

if (shouldRebuild) {
  console.log('[DEV] Bundled website export missing or rebuild requested. Building website export...');
  const buildScript = path.resolve(__dirname, 'build-website.js');
  const buildProcess = spawn('node', [buildScript], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });

  buildProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error('[DEV ERROR] Failed to build website export.');
      process.exit(code || 1);
    }
    runElectron();
  });
} else {
  runElectron();
}
