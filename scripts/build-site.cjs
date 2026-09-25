const { execFileSync } = require('node:child_process');
const { cpSync, rmSync, mkdirSync, existsSync, writeFileSync } = require('node:fs');
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

const staging = path.join(root, 'dist_staging');
rmSync(staging, { recursive: true, force: true });
mkdirSync(staging, { recursive: true });
cpSync(path.join(root, 'client/dist'), staging, { recursive: true });
mkdirSync(path.join(staging, 'admin'), { recursive: true });
cpSync(path.join(root, 'Bems-Farms-Admin-Front-end/dist'), path.join(staging, 'admin'), { recursive: true });

// 5. Generate .htaccess rules for SPA routing
const rootHtaccess = `Options -Indexes +FollowSymLinks
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /

  # 1. Admin SPA Routing (/admin/*)
  RewriteRule ^admin/index\\.html$ - [L]
  RewriteCond %{REQUEST_URI} ^/admin(/|$) [NC]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^admin/.*$ /admin/index.html [L]

  # 2. Main Storefront SPA Routing (/*)
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
`;

const adminHtaccess = `Options -Indexes +FollowSymLinks
DirectoryIndex index.html

<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /admin/
  RewriteRule ^index\\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /admin/index.html [L]
</IfModule>
`;

writeFileSync(path.join(staging, '.htaccess'), rootHtaccess, 'utf8');
writeFileSync(path.join(staging, 'admin', '.htaccess'), adminHtaccess, 'utf8');

// Copy atomically into dist without deleting folder first
const output = path.join(root, 'dist');
if (!existsSync(output)) {
  mkdirSync(output, { recursive: true });
}
cpSync(staging, output, { recursive: true });
rmSync(staging, { recursive: true, force: true });

console.log('✓ Successfully built unified site with zero-downtime SPA .htaccess rewrites: customer shop at / and admin at /admin/');

