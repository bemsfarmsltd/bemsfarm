const { execFileSync } = require('node:child_process');
const { cpSync, rmSync, mkdirSync } = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const app of ['client', 'Bems-Farms-Admin-Front-end']) {
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], {
    cwd: path.join(root, app), stdio: 'inherit',
  });
}
const output = path.join(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(path.join(root, 'client/dist'), output, { recursive: true });
cpSync(path.join(root, 'Bems-Farms-Admin-Front-end/dist'), path.join(output, 'admin'), { recursive: true });
console.log('Built one site: customer shop at / and admin at /admin/');
