#!/usr/bin/env node

/**
 * download-gutenberg.js
 * Downloads plain-text files from Project Gutenberg and converts them to
 * Obsidian-compatible markdown, splitting content into per-chapter files.
 *
 * Usage:
 *   node download-gutenberg.js --id <gutenberg_id> --author <slug> --title <slug>
 *   node download-gutenberg.js --batch <path/to/README.md>
 *   node download-gutenberg.js --id 1342 --dry-run
 *
 * Examples:
 *   node download-gutenberg.js --id 36 --author "hg-wells" --title "war-of-the-worlds"
 *   node download-gutenberg.js --batch dev-journal/references/literature/README.md
 */

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { program } = require('commander');

// ---------------------------------------------------------------------------
// CLI Setup
// ---------------------------------------------------------------------------

program
  .name('download-gutenberg')
  .description('Download Project Gutenberg works and convert to Obsidian markdown')
  .option('-i, --id <number>', 'Gutenberg project ID (e.g. 36)')
  .option('-a, --author <slug>', 'Author folder slug (e.g. hg-wells)')
  .option('-t, --title <slug>', 'Title folder slug (e.g. war-of-the-worlds)')
  .option('-b, --batch <file>', 'Path to README.md to batch-process all "Want More?" entries')
  .option('-o, --output <dir>', 'Base output directory', path.join(__dirname, '../../dev-journal/references/literature'))
  .option('--dry-run', 'Preview actions without writing files', false)
  .option('--verbose', 'Verbose output', false)
  .parse(process.argv);

const opts = program.opts();

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

const log = {
  info: (...a) => console.log('ℹ', ...a),
  ok: (...a) => console.log('✓', ...a),
  warn: (...a) => console.warn('⚠', ...a),
  error: (...a) => console.error('✗', ...a),
  debug: (...a) => { if (opts.verbose) console.log('🐛', ...a); },
  header: (t) => console.log(`\n━━━ ${t} ━━━\n`),
};

// ---------------------------------------------------------------------------
// Gutenberg URL helpers
// ---------------------------------------------------------------------------

/**
 * Returns the primary plain-text URL for a Gutenberg book ID.
 * Format 1: cache/epub/{id}/pg{id}.txt  (preferred — no rate-limit issues)
 * Format 2: files/{id}/{id}-0.txt       (UTF-8 fallback)
 */
function gutenbergUrls(id) {
  return [
    `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
    `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
    `https://www.gutenberg.org/files/${id}/${id}.txt`,
  ];
}

// ---------------------------------------------------------------------------
// HTTP fetch helper
// ---------------------------------------------------------------------------

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'dev-tools/download-gutenberg (personal use)' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error(`Timeout: ${url}`)); });
  });
}

async function fetchWithFallback(urls) {
  for (const url of urls) {
    try {
      log.debug(`Trying: ${url}`);
      const text = await fetchUrl(url);
      log.debug(`Success: ${url} (${text.length} bytes)`);
      return text;
    } catch (err) {
      log.debug(`Failed: ${url} — ${err.message}`);
    }
  }
  throw new Error(`All URL attempts failed for IDs: ${urls.join(', ')}`);
}

// ---------------------------------------------------------------------------
// Gutenberg boilerplate stripping
// ---------------------------------------------------------------------------

/**
 * Removes the Project Gutenberg header and footer from raw text.
 */
function stripBoilerplate(text) {
  // Start markers
  const startPatterns = [
    /\*{3}\s*START OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*\n/i,
    /\*{3}\s*START OF (?:THE |THIS )?PROJECT GUTENBERG EBOOK[^\n]*\n/i,
  ];
  // End markers
  const endPatterns = [
    /\*{3}\s*END OF (?:THE |THIS )?PROJECT GUTENBERG[^\n]*/i,
    /End of (?:the )?Project Gutenberg[^\n]*/i,
  ];

  let start = 0;
  for (const pat of startPatterns) {
    const m = text.match(pat);
    if (m) { start = (m.index ?? 0) + m[0].length; break; }
  }

  let end = text.length;
  for (const pat of endPatterns) {
    const m = text.match(pat);
    if (m) { end = m.index ?? text.length; break; }
  }

  return text.slice(start, end).trim();
}

// ---------------------------------------------------------------------------
// Chapter splitting
// ---------------------------------------------------------------------------

/**
 * Splits the cleaned text into chapters.
 * Returns an array of { title, body } objects.
 */
function splitChapters(text) {
  // Match common chapter/part heading patterns
  const headingPattern = /^(?:CHAPTER|Chapter|PART|Part|BOOK|Book|SECTION|Section|ACT|Act|CANTO|Canto)\s+(?:[IVXLCDM]+|[0-9]+)(?:[.\s—\-–][^\n]*)?\s*$/m;

  const parts = text.split(headingPattern);
  const headings = [];
  let m;
  const re = new RegExp(headingPattern.source, 'gm');
  while ((m = re.exec(text)) !== null) {
    headings.push(m[0].trim());
  }

  if (headings.length === 0) {
    // No detectable chapters — treat as single document
    return [{ title: 'Full Text', body: text.trim() }];
  }

  const chapters = [];

  // Text before first heading (preamble / table of contents)
  const preamble = parts[0].trim();
  if (preamble.length > 200) {
    chapters.push({ title: 'Preface', body: preamble });
  }

  // Pair each heading with its body
  headings.forEach((heading, i) => {
    const body = (parts[i + 1] || '').trim();
    chapters.push({ title: heading, body });
  });

  return chapters;
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------------------------------------------------------------------------
// Markdown chapter formatter
// ---------------------------------------------------------------------------

function chapterToMarkdown(chapter, meta) {
  const lines = [
    `# ${chapter.title}`,
    '',
    `> **Work:** ${meta.displayTitle}  `,
    `> **Author:** ${meta.displayAuthor}  `,
    `> **Source:** [Project Gutenberg #${meta.id}](https://www.gutenberg.org/ebooks/${meta.id})`,
    '',
    '---',
    '',
    chapter.body,
    '',
  ];
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Index generator
// ---------------------------------------------------------------------------

function buildIndex(meta, chapters) {
  const lines = [
    `# ${meta.displayTitle}`,
    '',
    `**Author:** ${meta.displayAuthor}  `,
    `**Source:** [Project Gutenberg #${meta.id}](https://www.gutenberg.org/ebooks/${meta.id})  `,
    `**Downloaded:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '---',
    '',
    '## Chapters',
    '',
  ];

  chapters.forEach((ch, i) => {
    const num = String(i + 1).padStart(2, '0');
    const slug = slugify(ch.title);
    lines.push(`- [[${num}-${slug}|${ch.title}]]`);
  });

  lines.push('', '---', '', `*Downloaded with \`dev-tools/scripts/download-gutenberg.js\`*`, '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Core download + convert function
// ---------------------------------------------------------------------------

async function processBook(id, authorSlug, titleSlug, outputBase, meta = {}) {
  log.header(`Gutenberg #${id} → ${authorSlug}/${titleSlug}`);

  const urls = gutenbergUrls(id);
  log.info(`Fetching from Project Gutenberg (ID: ${id})...`);

  let raw;
  if (!opts.dryRun) {
    raw = await fetchWithFallback(urls);
  } else {
    log.warn('[DRY RUN] Would fetch:', urls[0]);
    raw = `*** START OF THIS PROJECT GUTENBERG EBOOK SAMPLE ***\n\nChapter I\n\nSample content.\n\n*** END OF THIS PROJECT GUTENBERG EBOOK SAMPLE ***`;
  }

  log.info(`Stripping Gutenberg boilerplate...`);
  const clean = stripBoilerplate(raw);
  log.debug(`Cleaned text: ${clean.length} chars`);

  log.info(`Splitting into chapters...`);
  const chapters = splitChapters(clean);
  log.info(`Found ${chapters.length} chapter(s)`);

  const bookMeta = {
    id,
    displayAuthor: meta.displayAuthor || authorSlug,
    displayTitle: meta.displayTitle || titleSlug,
  };

  const bookDir = path.join(outputBase, authorSlug, titleSlug);

  if (opts.dryRun) {
    log.warn(`[DRY RUN] Would create directory: ${bookDir}`);
    chapters.forEach((ch, i) => {
      const num = String(i + 1).padStart(2, '0');
      log.warn(`[DRY RUN]   ${bookDir}/${num}-${slugify(ch.title)}.md`);
    });
    log.warn(`[DRY RUN]   ${bookDir}/_index.md`);
    return;
  }

  fs.mkdirSync(bookDir, { recursive: true });
  log.ok(`Created: ${bookDir}`);

  chapters.forEach((ch, i) => {
    const num = String(i + 1).padStart(2, '0');
    const slug = slugify(ch.title);
    const filename = `${num}-${slug}.md`;
    const filePath = path.join(bookDir, filename);
    fs.writeFileSync(filePath, chapterToMarkdown(ch, bookMeta), 'utf8');
    log.debug(`  Written: ${filename}`);
  });

  const indexPath = path.join(bookDir, '_index.md');
  fs.writeFileSync(indexPath, buildIndex(bookMeta, chapters), 'utf8');
  log.ok(`Index written: ${indexPath}`);
  log.ok(`Done — ${chapters.length} file(s) written to ${bookDir}`);
}

// ---------------------------------------------------------------------------
// Batch processing (parse README.md "Want More?" table)
// ---------------------------------------------------------------------------

function parseBatchFromReadme(readmePath) {
  const content = fs.readFileSync(readmePath, 'utf8');

  // Match table rows like:  | Author | Title | [#ID](url) |
  const rowPattern = /^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*\[#(\d+)\]/gm;
  const entries = [];
  let m;
  while ((m = rowPattern.exec(content)) !== null) {
    const author = m[1].trim();
    const title = m[2].trim();
    const id = parseInt(m[3], 10);
    if (isNaN(id) || author === 'Author') continue; // skip header row
    entries.push({ id, authorSlug: slugify(author), titleSlug: slugify(title), displayAuthor: author, displayTitle: title });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const outputBase = path.resolve(opts.output);
  log.info(`Output directory: ${outputBase}`);

  if (opts.dryRun) {
    log.warn('DRY RUN MODE — no files will be written');
  }

  if (opts.batch) {
    // Batch mode
    const readmePath = path.resolve(opts.batch);
    if (!fs.existsSync(readmePath)) {
      log.error(`README not found: ${readmePath}`);
      process.exit(1);
    }
    const entries = parseBatchFromReadme(readmePath);
    log.info(`Found ${entries.length} entries in ${readmePath}`);

    let success = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        await processBook(entry.id, entry.authorSlug, entry.titleSlug, outputBase, {
          displayAuthor: entry.displayAuthor,
          displayTitle: entry.displayTitle,
        });
        success++;
        // Polite delay between requests
        if (!opts.dryRun) await new Promise(r => setTimeout(r, 2000));
      } catch (err) {
        log.error(`Failed [#${entry.id}] ${entry.displayTitle}: ${err.message}`);
        failed++;
      }
    }
    log.header('Batch Complete');
    log.ok(`Success: ${success}`);
    if (failed > 0) log.warn(`Failed: ${failed}`);

  } else if (opts.id) {
    // Single book mode
    if (!opts.author || !opts.title) {
      log.error('--author and --title are required when using --id');
      program.help();
      process.exit(1);
    }
    try {
      await processBook(
        parseInt(opts.id, 10),
        slugify(opts.author),
        slugify(opts.title),
        outputBase,
      );
    } catch (err) {
      log.error(err.message);
      process.exit(1);
    }

  } else {
    log.error('Either --id or --batch must be provided');
    program.help();
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch((err) => {
    log.error('Unexpected error:', err.message);
    process.exit(1);
  });
}

module.exports = { processBook, splitChapters, stripBoilerplate, slugify };
