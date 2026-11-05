const { spawnSync } = require('child_process');
const path = require('path');

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const result = spawnSync(npmCommand, ['run', 'build'], {
  cwd: path.resolve(__dirname, '../website'),
  env: {
    ...process.env,
    DESKTOP_BUILD: 'true',
  },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  console.error(`Could not build the JARVIS website: ${result.error.message}`);
  process.exit(1);
}

process.exit(result.status ?? 1);
