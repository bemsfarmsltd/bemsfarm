const { execFileSync } = require('node:child_process');
const { cpSync, rmSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

// 1. Build client (storefront)
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env: { ...process.env },
});

// 2. Build admin with /admin/ base path for unified site
execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
  cwd: path.join(root, 'Bems-Farms-Admin-Front-end'),
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/admin/' },
});

const output = path.join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(root, 'client/dist'), output, { recursive: true });
cpSync(path.join(root, 'Bems-Farms-Admin-Front-end/dist'), path.join(output, 'admin'), { recursive: true });
console.log('Built one site: customer shop at / and admin at /admin/');
