const { execFileSync } = require('node:child_process');
const { cpSync, rmSync, mkdirSync, existsSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// 1. Ensure client dependencies are installed
if (!existsSync(path.join(root, 'client', 'node_modules'))) {
  console.log('Installing client dependencies...');
  execFileSync(npm, ['install'], { cwd: path.join(root, 'client'), stdio: 'inherit' });
}

// 2. Ensure admin dependencies are installed
if (!existsSync(path.join(root, 'Bems-Farms-Admin-Front-end', 'node_modules'))) {
  console.log('Installing admin dependencies...');
  execFileSync(npm, ['install'], { cwd: path.join(root, 'Bems-Farms-Admin-Front-end'), stdio: 'inherit' });
}

// 3. Build client (storefront)
console.log('Building customer storefront...');
execFileSync(npm, ['run', 'build'], {
  cwd: path.join(root, 'client'),
  stdio: 'inherit',
  env: { ...process.env },
});

// 4. Build admin with /admin/ base path for unified site
console.log('Building admin and POS portal...');
execFileSync(npm, ['run', 'build'], {
  cwd: path.join(root, 'Bems-Farms-Admin-Front-end'),
  stdio: 'inherit',
  env: { ...process.env, VITE_BASE_PATH: '/admin/' },
});

const output = path.join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(root, 'client/dist'), output, { recursive: true });
cpSync(path.join(root, 'Bems-Farms-Admin-Front-end/dist'), path.join(output, 'admin'), { recursive: true });
console.log('✓ Successfully built unified site: customer shop at / and admin at /admin/');

