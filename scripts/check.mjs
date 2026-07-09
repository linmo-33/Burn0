import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'wrangler.jsonc',
  'migrations/0001_init.sql',
  'migrations/0002_image_content.sql',
  'src/worker/index.js',
  'public/index.html',
  'public/styles.css',
  'public/app.js',
  'public/admin.js'
];

let failed = false;

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`Missing required file: ${file}`);
    failed = true;
  }
}

for (const file of ['src/worker/index.js', 'public/app.js', 'public/admin.js', 'scripts/check.mjs']) {
  const result = spawnSync('node', ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    failed = true;
  }
}

const migration = readFileSync('migrations/0001_init.sql', 'utf8');
const imageMigration = readFileSync('migrations/0002_image_content.sql', 'utf8');
const worker = readFileSync('src/worker/index.js', 'utf8');
const requiredTables = [
  'messages',
  'message_events',
  'reports',
  'admin_users',
  'app_settings',
  'blocked_sources',
  'rate_limit_events'
];

for (const table of requiredTables) {
  if (!migration.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    console.error(`Migration does not define table: ${table}`);
    failed = true;
  }
  if (!worker.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
    console.error(`Worker auto schema does not define table: ${table}`);
    failed = true;
  }
}

const imageColumns = [
  'content_type',
  'image_object_key',
  'image_mime_type',
  'image_size',
  'image_encryption_iv',
  'image_encryption_key_id',
  'image_deleted_at'
];

for (const column of imageColumns) {
  if (!imageMigration.includes(`ADD COLUMN ${column}`)) {
    console.error(`Image migration does not add column: ${column}`);
    failed = true;
  }
  if (!worker.includes(column)) {
    console.error(`Worker schema does not reference image column: ${column}`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('Burn0 static checks passed.');
