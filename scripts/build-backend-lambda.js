#!/usr/bin/env node
/**
 * Build the AWS Lambda deployment package for the Jouster backend.
 *
 * Produces `dist/backend/backend-lambda.zip` with `lambda.js` at the archive
 * root (handler `lambda.handler`), the runtime source, and production-only
 * node_modules. This is the artifact referenced by `lambda_zip_path` in the
 * Terraform env stacks (terraform/envs/{nonprod,prod}) and built by CI in P5.
 *
 * Usage:
 *   node scripts/build-backend-lambda.js [--skip-install]
 *
 * Flags:
 *   --skip-install   Reuse the staged node_modules (faster local rebuilds).
 *
 * ⚠️ Native modules: the backend depends on `bcrypt` (native bindings). The
 * deployable artifact MUST be built on Linux (e.g. GitHub Actions ubuntu) so the
 * binaries match the Lambda runtime. A Windows/macOS build is fine for local
 * inspection but will NOT run on Lambda.
 */

'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const backendDir = path.join(repoRoot, 'apps', 'backend');
const outDir = path.join(repoRoot, 'dist', 'backend');
const stageDir = path.join(outDir, 'lambda-build');
const zipPath = path.join(outDir, 'backend-lambda.zip');

// Runtime files/dirs to include in the package (everything the Express app
// requires at runtime). Tests, docs, dashboards, security reports, the
// conversation-history data, and the alternate server-*.js files are excluded.
const INCLUDE = [
  'server.js',
  'lambda.js',
  'credential-manager.js',
  'package.json',
  'package-lock.json',
  'config',
  'middleware',
  'routes',
  'services',
];

const skipInstall = process.argv.includes('--skip-install');
const isWindows = process.platform === 'win32';

function log(msg) {
  console.log(`[build-backend-lambda] ${msg}`);
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function bytesToMb(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

function run(cmd, args, cwd) {
  execFileSync(cmd, args, { cwd, stdio: 'inherit', shell: isWindows });
}

/**
 * Create a Lambda-safe zip on Windows.
 *
 * PowerShell 5.1's `Compress-Archive` writes entry names with backslashes, which
 * violates the ZIP spec and breaks directory traversal on the Lambda (Linux)
 * runtime. We build the archive with the .NET ZipArchive API and force
 * forward-slash entry names so `require()` resolves correctly.
 */
function createZipWindows(srcDir, outZip) {
  const ps = [
    "$ErrorActionPreference = 'Stop'",
    'Add-Type -AssemblyName System.IO.Compression | Out-Null',
    'Add-Type -AssemblyName System.IO.Compression.FileSystem | Out-Null',
    `$src = '${srcDir}'`,
    `$zip = '${outZip}'`,
    'if (Test-Path $zip) { Remove-Item $zip -Force }',
    '$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)',
    '$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)',
    'try {',
    '  Get-ChildItem -Path $src -Recurse -File | ForEach-Object {',
    "    $rel = $_.FullName.Substring($src.Length).TrimStart('\\','/').Replace('\\','/')",
    '    $entry = $archive.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)',
    '    $stream = $entry.Open()',
    '    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)',
    '    $stream.Write($bytes, 0, $bytes.Length)',
    '    $stream.Dispose()',
    '  }',
    '} finally {',
    '  $archive.Dispose()',
    '  $fs.Dispose()',
    '}',
  ].join('\n');

  const tmpPs = path.join(os.tmpdir(), `zip-backend-${Date.now()}.ps1`);
  fs.writeFileSync(tmpPs, ps, 'utf8');
  try {
    run('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', tmpPs], repoRoot);
  } finally {
    fs.rmSync(tmpPs, { force: true });
  }
}

function main() {
  if (!fs.existsSync(backendDir)) {
    throw new Error(`Backend directory not found: ${backendDir}`);
  }

  log(`Staging directory: ${stageDir}`);
  if (!skipInstall) {
    rmrf(stageDir);
  } else {
    // Keep node_modules; refresh source files only.
    for (const entry of INCLUDE) {
      rmrf(path.join(stageDir, entry));
    }
  }
  fs.mkdirSync(stageDir, { recursive: true });

  // 1. Copy runtime source into the staging directory.
  let copied = 0;
  for (const entry of INCLUDE) {
    const src = path.join(backendDir, entry);
    if (!fs.existsSync(src)) {
      log(`  skip (missing): ${entry}`);
      continue;
    }
    fs.cpSync(src, path.join(stageDir, entry), { recursive: true });
    copied += 1;
  }
  log(`Copied ${copied} source entries.`);

  // 2. Install production-only dependencies in the staging directory.
  if (skipInstall) {
    log('Skipping dependency install (--skip-install).');
  } else {
    const hasLock = fs.existsSync(path.join(stageDir, 'package-lock.json'));
    const installArgs = hasLock
      ? ['ci', '--omit=dev', '--no-audit', '--no-fund']
      : ['install', '--omit=dev', '--no-audit', '--no-fund'];
    log(`Running: npm ${installArgs.join(' ')}`);
    run('npm', installArgs, stageDir);
  }

  // 3. Create the zip with files at the archive root (handler at top level).
  rmrf(zipPath);
  log('Creating archive...');
  if (isWindows) {
    // .NET ZipArchive with forward-slash entry names (Compress-Archive is not Lambda-safe).
    createZipWindows(stageDir, zipPath);
  } else {
    // zip -r from inside the staging dir so paths are relative to the root.
    run('zip', ['-qr', zipPath, '.'], stageDir);
  }

  const size = fs.statSync(zipPath).size;
  log(`Built ${path.relative(repoRoot, zipPath)} (${bytesToMb(size)} MB)`);

  if (isWindows) {
    log('⚠️  Built on Windows — rebuild on Linux (CI) before deploying (bcrypt native bindings).');
  }
}

try {
  main();
} catch (err) {
  console.error(`[build-backend-lambda] FAILED: ${err.message}`);
  process.exit(1);
}




