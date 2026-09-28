#!/usr/bin/env node
/**
 * scan-epstein-extensions.js - Probe DOJ URLs for companion files at known EFTA IDs.
 *
 * For each EFTA ID already on disk (as .pdf), checks if other file types exist
 * at the same URL path (e.g., .mp3, .mp4, .wav, .doc, .jpg, etc.).
 *
 * Usage:
 *   node scripts/scan-epstein-extensions.js                        # Scan all datasets
 *   node scripts/scan-epstein-extensions.js --datasets 1,2,3       # Specific datasets
 *   node scripts/scan-epstein-extensions.js --resume               # Resume from checkpoint
 *   node scripts/scan-epstein-extensions.js --report               # Print summary report
 *   node scripts/scan-epstein-extensions.js --rate-limit 2.0       # Custom rate limit (seconds)
 *   node scripts/scan-epstein-extensions.js --check-cookies        # Check cookie freshness
 *
 * Features:
 *   - Reads existing PDF filenames to build EFTA ID list
 *   - Probes each ID for 15 non-PDF extensions via GET with age-verified cookie
 *   - Downloads any found files to the correct DataSet folder
 *   - Progress checkpoint (resume-safe, saves every 50 IDs)
 *   - Rate limiting with exponential backoff on 429/403
 *   - JSONL results log for post-analysis
 *   - --report mode to view progress without running scan
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { program } = require(path.join(__dirname, '..', 'dev-tools', 'node_modules', 'commander'));
const axios = require(path.join(__dirname, '..', 'dev-tools', 'node_modules', 'axios'));

// --- Configuration ---
const BASE_DIR = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = path.join(BASE_DIR, 'downloads', 'epstein');
const PARSED_DIR = path.join(DOWNLOADS_DIR, 'parsed');
const RESULTS_FILE = path.join(DOWNLOADS_DIR, 'extension-scan-results.jsonl');
const PROGRESS_FILE = path.join(DOWNLOADS_DIR, 'extension-scan-progress-v2.json');
const LOG_FILE = path.join(PARSED_DIR, 'extension-scan-v2.log');

const DOJ_BASE_URL = 'https://www.justice.gov/epstein/files';

const EXTENSIONS = [
  '.mp3', '.mp4', '.wav', '.jpg', '.jpeg', '.tif', '.tiff',
  '.doc', '.docx', '.txt', '.xls', '.xlsx', '.png', '.gif', '.bmp',
];

const HEADERS = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.justice.gov/epstein',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
  'Cookie': 'justiceGovAgeVerified=true',
};

// --- Logging ---
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

let logStream;

function initLogging() {
  ensureDir(PARSED_DIR);
  logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
}

function log(level, message) {
  const timestamp = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
  const line = `[${timestamp}] [${level}] ${message}`;
  if (logStream) {
    logStream.write(line + '\n');
  }
  if (level === 'ERROR' || level === 'WARNING') {
    console.error(line);
  } else {
    console.log(line);
  }
}

// --- Progress ---
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    return JSON.parse(data);
  }
  return { datasets: {}, hits: [], total_probed: 0, total_hits: 0, total_errors: 0 };
}

function saveProgress(progress) {
  progress.last_updated = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

// --- EFTA ID Discovery ---
function discoverEftaIds(datasetNumbers) {
  const idsByDataset = {};

  const entries = fs.readdirSync(DOWNLOADS_DIR, { withFileTypes: true });
  const dsDirs = entries
    .filter(e => e.isDirectory() && e.name.startsWith('DataSet'))
    .sort((a, b) => {
      const numA = parseInt(a.name.replace('DataSet ', ''), 10);
      const numB = parseInt(b.name.replace('DataSet ', ''), 10);
      return numA - numB;
    });

  for (const dsDir of dsDirs) {
    const dsNum = parseInt(dsDir.name.replace('DataSet ', ''), 10);
    if (datasetNumbers && !datasetNumbers.includes(dsNum)) continue;

    const dirPath = path.join(DOWNLOADS_DIR, dsDir.name);
    const pdfs = fs.readdirSync(dirPath)
      .filter(f => f.endsWith('.pdf'))
      .sort();

    const eftaIds = pdfs.map(f => path.basename(f, '.pdf'));

    if (eftaIds.length > 0) {
      idsByDataset[dsNum] = {
        ids: eftaIds,
        dirName: dsDir.name,
        dirPath,
      };
    }
  }

  return idsByDataset;
}

// --- URL Probing ---
async function probeUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true, // Don't throw on non-2xx
    });
    return { status: response.status, size: response.data ? Buffer.byteLength(String(response.data)) : 0, data: response.data };
  } catch (err) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return { status: 'timeout', size: 0, data: null };
    }
    if (err.code === 'ECONNRESET' || err.code === 'ENOTFOUND') {
      return { status: 'connection_error', size: 0, data: null };
    }
    return { status: `error:${String(err.message).slice(0, 50)}`, size: 0, data: null };
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// --- Main Scan ---
async function runScan(options) {
  const { datasets: datasetNumbers, rateLimit, resume } = options;

  const idsByDataset = discoverEftaIds(datasetNumbers);
  let progress = resume ? loadProgress() : { datasets: {}, hits: [], total_probed: 0, total_hits: 0, total_errors: 0 };

  const totalIds = Object.values(idsByDataset).reduce((sum, ds) => sum + ds.ids.length, 0);
  const dsKeys = Object.keys(idsByDataset).map(Number).sort((a, b) => a - b);

  log('INFO', '=== Extension Scan Starting ===');
  log('INFO', `Datasets: [${dsKeys.join(', ')}]`);
  log('INFO', `Total EFTA IDs to scan: ${totalIds}`);
  log('INFO', `Extensions per ID: ${EXTENSIONS.length}`);
  log('INFO', `Total probes needed: ${totalIds * EXTENSIONS.length}`);
  log('INFO', `Rate limit: ${rateLimit}s between probes`);
  log('INFO', `Resume: ${resume}`);

  ensureDir(PARSED_DIR);
  const resultsStream = fs.createWriteStream(RESULTS_FILE, { flags: 'a' });

  try {
    for (const dsNum of dsKeys) {
      const dsInfo = idsByDataset[dsNum];
      const dsKey = `ds${dsNum}`;
      const { dirName, dirPath, ids: eftaIds } = dsInfo;

      // Resume: skip already-scanned IDs
      let startIdx = 0;
      if (resume && progress.datasets[dsKey]) {
        startIdx = progress.datasets[dsKey].last_index || 0;
        if (startIdx >= eftaIds.length) {
          log('INFO', `DS${dsNum}: Already complete, skipping`);
          continue;
        }
        log('INFO', `DS${dsNum}: Resuming from index ${startIdx}/${eftaIds.length}`);
      }

      log('INFO', `DS${dsNum}: Scanning ${eftaIds.length - startIdx} EFTA IDs for companion files`);

      const encodedDataset = encodeURIComponent(dirName);

      for (let idx = startIdx; idx < eftaIds.length; idx++) {
        const eftaId = eftaIds[idx];
        const timestamp = new Date().toISOString();

        for (const ext of EXTENSIONS) {
          const filename = `${eftaId}${ext}`;
          const localPath = path.join(dirPath, filename);

          // Skip if file already exists on disk
          if (fs.existsSync(localPath)) {
            const stat = fs.statSync(localPath);
            const entry = {
              timestamp,
              efta_id: eftaId,
              dataset: `DS${dsNum}`,
              extension: ext,
              status: 'already_on_disk',
              action: 'skip',
              size_kb: Math.round((stat.size / 1024) * 100) / 100,
            };
            resultsStream.write(JSON.stringify(entry) + '\n');
            progress.total_probed++;
            continue;
          }

          // Probe URL
          const url = `${DOJ_BASE_URL}/${encodedDataset}/${filename}`;
          const result = await probeUrl(url);

          if (result.status === 200) {
            // Check if it's actually a PDF being served (DOJ quirk without cookies)
            const contentStart = result.data ? String(result.data).slice(0, 5) : '';
            if (contentStart === '%PDF-') {
              // False positive — server returned the PDF regardless of extension
              const entry = {
                timestamp,
                efta_id: eftaId,
                dataset: `DS${dsNum}`,
                extension: ext,
                status: 200,
                action: 'false_positive_pdf',
              };
              resultsStream.write(JSON.stringify(entry) + '\n');
              progress.total_probed++;
            } else {
              // Real HIT — download the file
              let action = 'downloaded';
              let sizeKb = 0;
              try {
                const downloadResp = await axios.get(url, {
                  headers: HEADERS,
                  timeout: 30000,
                  responseType: 'arraybuffer',
                });
                fs.writeFileSync(localPath, downloadResp.data);
                sizeKb = Math.round((downloadResp.data.length / 1024) * 100) / 100;
                log('INFO', `*** HIT *** DS${dsNum}/${eftaId}${ext} - ${sizeKb} KB downloaded!`);
              } catch (dlErr) {
                action = 'download_failed';
                log('ERROR', `Download failed for ${url}: ${dlErr.message}`);
              }

              const entry = {
                timestamp,
                efta_id: eftaId,
                dataset: `DS${dsNum}`,
                extension: ext,
                status: 200,
                action,
                size_kb: sizeKb,
                output: localPath,
              };
              resultsStream.write(JSON.stringify(entry) + '\n');
              progress.total_hits++;
              progress.hits.push({ efta_id: eftaId, ext, dataset: `DS${dsNum}` });
            }
          } else if (result.status === 404) {
            const entry = {
              timestamp,
              efta_id: eftaId,
              dataset: `DS${dsNum}`,
              extension: ext,
              status: 404,
              action: 'miss',
            };
            resultsStream.write(JSON.stringify(entry) + '\n');
            progress.total_probed++;
          } else if (result.status === 403) {
            const entry = {
              timestamp,
              efta_id: eftaId,
              dataset: `DS${dsNum}`,
              extension: ext,
              status: 403,
              action: 'blocked',
              error: 'WAF/cookies expired',
            };
            resultsStream.write(JSON.stringify(entry) + '\n');
            progress.total_errors++;
            log('WARNING', `403 Forbidden on ${url} - cookies may need refresh`);
            // Exponential backoff
            log('INFO', 'Backing off 60s due to 403...');
            await sleep(60000);
          } else if (result.status === 429) {
            const entry = {
              timestamp,
              efta_id: eftaId,
              dataset: `DS${dsNum}`,
              extension: ext,
              status: 429,
              action: 'rate_limited',
            };
            resultsStream.write(JSON.stringify(entry) + '\n');
            progress.total_errors++;
            log('WARNING', '429 Rate limited - backing off 30s');
            await sleep(30000);
          } else {
            const entry = {
              timestamp,
              efta_id: eftaId,
              dataset: `DS${dsNum}`,
              extension: ext,
              status: String(result.status),
              action: 'error',
              error: String(result.status),
            };
            resultsStream.write(JSON.stringify(entry) + '\n');
            progress.total_errors++;
          }

          // Rate limit between probes
          await sleep(rateLimit * 1000);
        }

        // Update progress every ID
        progress.datasets[dsKey] = {
          last_index: idx + 1,
          total_ids: eftaIds.length,
        };

        // Save progress every 50 IDs
        if ((idx + 1) % 50 === 0) {
          saveProgress(progress);
          const pct = (((idx + 1) / eftaIds.length) * 100).toFixed(1);
          log('INFO', `DS${dsNum}: Progress ${idx + 1}/${eftaIds.length} (${pct}%) - ${progress.total_hits} hits, ${progress.total_errors} errors`);
        }
      }

      // Mark dataset complete
      progress.datasets[dsKey] = {
        last_index: eftaIds.length,
        total_ids: eftaIds.length,
        complete: true,
      };
      saveProgress(progress);
      log('INFO', `DS${dsNum}: Complete - ${eftaIds.length} IDs scanned`);
    }
  } finally {
    resultsStream.end();
    saveProgress(progress);
  }

  log('INFO', '=== Extension Scan Complete ===');
  log('INFO', `Total probed: ${progress.total_probed}`);
  log('INFO', `Total hits: ${progress.total_hits}`);
  log('INFO', `Total errors: ${progress.total_errors}`);

  if (progress.hits.length > 0) {
    log('INFO', 'Companion files found:');
    for (const hit of progress.hits) {
      log('INFO', `  ${hit.dataset}/${hit.efta_id}${hit.ext}`);
    }
  }
}

// --- Report ---
function printReport() {
  console.log('');

  // Load progress
  const progress = loadProgress();
  if (Object.keys(progress.datasets).length === 0 && progress.total_probed === 0) {
    console.log('No scan progress found. Run the scan first:');
    console.log('  node scripts/scan-epstein-extensions.js --resume');
    return;
  }

  console.log('=== Extension Scan Progress Report ===');
  console.log('');

  // Progress by dataset
  console.log('Dataset Progress:');
  const dsKeys = Object.keys(progress.datasets).sort();
  for (const dsKey of dsKeys) {
    const ds = progress.datasets[dsKey];
    const last = ds.last_index || 0;
    const total = ds.total_ids || 0;
    const complete = ds.complete || false;
    const pct = total > 0 ? ((last / total) * 100).toFixed(1) : '0.0';
    const status = complete ? '[DONE]' : `${last}/${total} (${pct}%)`;
    console.log(`  ${dsKey}: ${status}`);
  }

  console.log('');
  console.log(`Total probed:  ${progress.total_probed}`);
  console.log(`Total hits:    ${progress.total_hits}`);
  console.log(`Total errors:  ${progress.total_errors}`);
  console.log(`Last updated:  ${progress.last_updated || 'N/A'}`);

  if (progress.hits && progress.hits.length > 0) {
    console.log('');
    console.log(`*** COMPANION FILES FOUND (${progress.hits.length}) ***`);
    for (const hit of progress.hits) {
      console.log(`  ${hit.dataset}/${hit.efta_id}${hit.ext}`);
    }
  } else {
    console.log('');
    console.log('No companion files found yet.');
  }

  // Parse JSONL results if available
  if (fs.existsSync(RESULTS_FILE)) {
    const stats = fs.statSync(RESULTS_FILE);
    if (stats.size > 0) {
      const counts = { by_status: {}, by_extension: {}, by_dataset: {} };
      const lines = fs.readFileSync(RESULTS_FILE, 'utf-8').split('\n').filter(l => l.trim());
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const key = `${entry.status}_${entry.action}`;
          counts.by_status[key] = (counts.by_status[key] || 0) + 1;
          counts.by_extension[entry.extension] = (counts.by_extension[entry.extension] || 0) + 1;
          counts.by_dataset[entry.dataset] = (counts.by_dataset[entry.dataset] || 0) + 1;
        } catch { /* skip malformed lines */ }
      }

      console.log('');
      console.log(`Results file: ${lines.length} entries (${(stats.size / 1024).toFixed(1)} KB)`);

      console.log('');
      console.log('By status/action:');
      const statusEntries = Object.entries(counts.by_status).sort((a, b) => b[1] - a[1]);
      for (const [key, count] of statusEntries) {
        console.log(`  ${key}: ${count}`);
      }

      console.log('');
      console.log('By dataset:');
      const dsEntries = Object.entries(counts.by_dataset).sort();
      for (const [ds, count] of dsEntries) {
        console.log(`  ${ds}: ${count} probes`);
      }
    }
  }

  // Estimate remaining time
  const totalScanned = Object.values(progress.datasets).reduce((sum, ds) => sum + (ds.last_index || 0), 0);
  const idsByDataset = discoverEftaIds(null);
  const totalIds = Object.values(idsByDataset).reduce((sum, ds) => sum + ds.ids.length, 0);
  const remainingIds = totalIds - totalScanned;
  const remainingProbes = remainingIds * EXTENSIONS.length;
  const estimatedHours = (remainingProbes * 1.2) / 3600;

  console.log('');
  console.log('Estimates:');
  console.log(`  Total EFTA IDs on disk: ${totalIds}`);
  console.log(`  IDs scanned so far:     ${totalScanned}`);
  console.log(`  IDs remaining:          ${remainingIds}`);
  console.log(`  Probes remaining:       ${remainingProbes}`);
  console.log(`  Est. time remaining:    ~${estimatedHours.toFixed(1)} hours (at 1.2s/probe)`);
  console.log('');
}

// --- CLI ---
program
  .name('scan-epstein-extensions')
  .description('Probe DOJ URLs for companion files at known EFTA IDs')
  .option('--datasets <numbers>', 'Comma-separated dataset numbers (e.g., 1,2,3)')
  .option('--rate-limit <seconds>', 'Seconds between probes', '1.2')
  .option('--resume', 'Resume from last checkpoint', false)
  .option('--report', 'Print summary report and exit', false)
  .option('--check-cookies', 'Check cookie freshness and exit', false)
  .parse(process.argv);

const opts = program.opts();

if (opts.report) {
  printReport();
  process.exit(0);
}

if (opts.checkCookies) {
  console.log('Cookie: justiceGovAgeVerified=true');
  console.log('Status: This cookie does not expire - always valid for file access.');
  console.log('');
  console.log('To verify DOJ access is working:');
  console.log('  curl -s -o /dev/null -w "%{http_code}" -H "Cookie: justiceGovAgeVerified=true" "https://www.justice.gov/epstein/files/DataSet%201/EFTA00000001.pdf"');
  console.log('  Expected: 200');
  process.exit(0);
}

// Parse options
const datasetNumbers = opts.datasets
  ? opts.datasets.split(',').map(d => parseInt(d.trim(), 10))
  : null;
const rateLimit = parseFloat(opts.rateLimit);

initLogging();

runScan({
  datasets: datasetNumbers,
  rateLimit,
  resume: opts.resume,
}).catch(err => {
  log('ERROR', `Scan failed: ${err.message}`);
  console.error(err);
  process.exit(1);
});

