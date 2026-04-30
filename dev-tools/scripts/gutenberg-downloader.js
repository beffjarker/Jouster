#!/usr/bin/env node

/**
 * Gutenberg Downloader & Markdown Converter
 *
 * Downloads public-domain works from Project Gutenberg and converts them to
 * Obsidian-compatible Markdown files, split by chapter.
 *
 * Output structure:
 *   dev-journal/references/literature/{author-slug}/{title-slug}/
 *     _index.md     — Book overview with chapter links
 *     ch-01.md      — Chapter 1
 *     ch-02.md      — Chapter 2
 *     ...
 *
 * Usage:
 *   node gutenberg-downloader.js --id 11
 *   node gutenberg-downloader.js --author "lewis-carroll"
 *   node gutenberg-downloader.js --all
 *   node gutenberg-downloader.js --list
 *   node gutenberg-downloader.js --all --dry-run
 *   node gutenberg-downloader.js --help
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { program } = require('commander');
const Logger = require('../utils/logger');

// ─── Catalog ────────────────────────────────────────────────────────────────
// All works are in the format:
// { id, author, authorSlug, title, titleSlug, year, tags }

const CATALOG = [
  // ── Lewis Carroll ──────────────────────────────────────────────────────────
  { id: 11,    author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: "Alice's Adventures in Wonderland",    titleSlug: 'alices-adventures-in-wonderland',    year: 1865, tags: ['fiction', 'fantasy', 'childrens', '19th-century', 'english'] },
  { id: 12,    author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: 'Through the Looking-Glass',            titleSlug: 'through-the-looking-glass',          year: 1871, tags: ['fiction', 'fantasy', 'childrens', '19th-century', 'english'] },
  { id: 13,    author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: 'The Hunting of the Snark',             titleSlug: 'the-hunting-of-the-snark',           year: 1876, tags: ['poetry', 'nonsense', '19th-century', 'english'] },
  { id: 620,   author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: 'Sylvie and Bruno',                     titleSlug: 'sylvie-and-bruno',                   year: 1889, tags: ['fiction', 'fantasy', '19th-century', 'english'] },
  { id: 621,   author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: 'Sylvie and Bruno Concluded',           titleSlug: 'sylvie-and-bruno-concluded',         year: 1893, tags: ['fiction', 'fantasy', '19th-century', 'english'] },
  { id: 29042, author: 'Lewis Carroll',             authorSlug: 'lewis-carroll',             title: "Alice's Adventures Underground",       titleSlug: 'alices-adventures-underground',      year: 1864, tags: ['fiction', 'fantasy', '19th-century', 'english'] },

  // ── Edgar Allan Poe ────────────────────────────────────────────────────────
  { id: 2148,  author: 'Edgar Allan Poe',           authorSlug: 'edgar-allan-poe',           title: 'The Works of Edgar Allan Poe, Vol. 1', titleSlug: 'works-vol-1',                        year: 1840, tags: ['fiction', 'horror', 'mystery', 'short-stories', '19th-century', 'american'] },
  { id: 2149,  author: 'Edgar Allan Poe',           authorSlug: 'edgar-allan-poe',           title: 'The Works of Edgar Allan Poe, Vol. 2', titleSlug: 'works-vol-2',                        year: 1840, tags: ['fiction', 'horror', 'mystery', 'short-stories', '19th-century', 'american'] },
  { id: 2150,  author: 'Edgar Allan Poe',           authorSlug: 'edgar-allan-poe',           title: 'The Works of Edgar Allan Poe, Vol. 3', titleSlug: 'works-vol-3',                        year: 1840, tags: ['fiction', 'horror', 'mystery', 'short-stories', '19th-century', 'american'] },

  // ── Fyodor Dostoevsky ──────────────────────────────────────────────────────
  { id: 2554,  author: 'Fyodor Dostoevsky',         authorSlug: 'fyodor-dostoevsky',         title: 'The Brothers Karamazov',               titleSlug: 'the-brothers-karamazov',             year: 1880, tags: ['fiction', 'philosophy', '19th-century', 'russian'] },
  { id: 28054, author: 'Fyodor Dostoevsky',         authorSlug: 'fyodor-dostoevsky',         title: 'Crime and Punishment',                 titleSlug: 'crime-and-punishment',               year: 1866, tags: ['fiction', 'philosophy', '19th-century', 'russian'] },
  { id: 2638,  author: 'Fyodor Dostoevsky',         authorSlug: 'fyodor-dostoevsky',         title: 'The Idiot',                            titleSlug: 'the-idiot',                          year: 1869, tags: ['fiction', 'philosophy', '19th-century', 'russian'] },
  { id: 600,   author: 'Fyodor Dostoevsky',         authorSlug: 'fyodor-dostoevsky',         title: 'Notes from the Underground',           titleSlug: 'notes-from-the-underground',         year: 1864, tags: ['fiction', 'philosophy', '19th-century', 'russian'] },

  // ── Arthur Conan Doyle ─────────────────────────────────────────────────────
  { id: 244,   author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'A Study in Scarlet',                   titleSlug: 'a-study-in-scarlet',                 year: 1887, tags: ['fiction', 'mystery', 'detective', '19th-century', 'english'] },
  { id: 2097,  author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Sign of the Four',                 titleSlug: 'the-sign-of-the-four',               year: 1890, tags: ['fiction', 'mystery', 'detective', '19th-century', 'english'] },
  { id: 1661,  author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Adventures of Sherlock Holmes',    titleSlug: 'adventures-of-sherlock-holmes',      year: 1892, tags: ['fiction', 'mystery', 'detective', 'short-stories', '19th-century', 'english'] },
  { id: 834,   author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Memoirs of Sherlock Holmes',       titleSlug: 'memoirs-of-sherlock-holmes',         year: 1893, tags: ['fiction', 'mystery', 'detective', 'short-stories', '19th-century', 'english'] },
  { id: 2852,  author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Return of Sherlock Holmes',        titleSlug: 'return-of-sherlock-holmes',          year: 1905, tags: ['fiction', 'mystery', 'detective', 'short-stories', 'early-20th-century', 'english'] },
  { id: 108,   author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Hound of the Baskervilles',        titleSlug: 'the-hound-of-the-baskervilles',      year: 1902, tags: ['fiction', 'mystery', 'detective', 'early-20th-century', 'english'] },
  { id: 3289,  author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'His Last Bow',                         titleSlug: 'his-last-bow',                       year: 1917, tags: ['fiction', 'mystery', 'detective', 'short-stories', 'early-20th-century', 'english'] },
  { id: 2350,  author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Valley of Fear',                   titleSlug: 'the-valley-of-fear',                 year: 1915, tags: ['fiction', 'mystery', 'detective', 'early-20th-century', 'english'] },
  { id: 139,   author: 'Arthur Conan Doyle',        authorSlug: 'arthur-conan-doyle',        title: 'The Case-Book of Sherlock Holmes',     titleSlug: 'the-case-book-of-sherlock-holmes',   year: 1927, tags: ['fiction', 'mystery', 'detective', 'short-stories', 'early-20th-century', 'english'] },

  // ── L. Frank Baum ──────────────────────────────────────────────────────────
  { id: 55,    author: 'L. Frank Baum',             authorSlug: 'l-frank-baum',              title: 'The Wonderful Wizard of Oz',           titleSlug: 'wonderful-wizard-of-oz',             year: 1900, tags: ['fiction', 'fantasy', 'childrens', 'early-20th-century', 'american'] },

  // ── D'Arcy Wentworth Thompson ──────────────────────────────────────────────
  { id: 55264, author: "D'Arcy Wentworth Thompson", authorSlug: 'darcy-wentworth-thompson',  title: 'On Growth and Form',                   titleSlug: 'on-growth-and-form',                 year: 1917, tags: ['non-fiction', 'science', 'mathematics', 'early-20th-century', 'english'] },

  // ── William Shakespeare ────────────────────────────────────────────────────
  { id: 100,   author: 'William Shakespeare',       authorSlug: 'william-shakespeare',       title: 'The Complete Works of Shakespeare',    titleSlug: 'complete-works',                     year: 1600, tags: ['drama', 'poetry', 'classics', 'renaissance', 'english'] },

  // ── Mark Twain ─────────────────────────────────────────────────────────────
  { id: 76,    author: 'Mark Twain',                authorSlug: 'mark-twain',                title: 'Adventures of Huckleberry Finn',       titleSlug: 'adventures-of-huckleberry-finn',     year: 1884, tags: ['fiction', 'adventure', '19th-century', 'american'] },
  { id: 74,    author: 'Mark Twain',                authorSlug: 'mark-twain',                title: 'The Adventures of Tom Sawyer',         titleSlug: 'adventures-of-tom-sawyer',           year: 1876, tags: ['fiction', 'adventure', '19th-century', 'american'] },

  // ── Jane Austen ────────────────────────────────────────────────────────────
  { id: 1342,  author: 'Jane Austen',               authorSlug: 'jane-austen',               title: 'Pride and Prejudice',                  titleSlug: 'pride-and-prejudice',                year: 1813, tags: ['fiction', 'romance', '19th-century', 'english'] },
  { id: 161,   author: 'Jane Austen',               authorSlug: 'jane-austen',               title: 'Sense and Sensibility',                titleSlug: 'sense-and-sensibility',              year: 1811, tags: ['fiction', 'romance', '19th-century', 'english'] },

  // ── Mary Shelley ───────────────────────────────────────────────────────────
  { id: 84,    author: 'Mary Shelley',              authorSlug: 'mary-shelley',              title: 'Frankenstein',                         titleSlug: 'frankenstein',                       year: 1818, tags: ['fiction', 'horror', 'sci-fi', '19th-century', 'english'] },

  // ── Bram Stoker ────────────────────────────────────────────────────────────
  { id: 345,   author: 'Bram Stoker',               authorSlug: 'bram-stoker',               title: 'Dracula',                              titleSlug: 'dracula',                            year: 1897, tags: ['fiction', 'horror', '19th-century', 'english'] },

  // ── Homer ──────────────────────────────────────────────────────────────────
  { id: 6130,  author: 'Homer',                     authorSlug: 'homer',                     title: 'The Iliad',                            titleSlug: 'the-iliad',                          year: -800, tags: ['poetry', 'epic', 'mythology', 'ancient', 'greek'] },
  { id: 1727,  author: 'Homer',                     authorSlug: 'homer',                     title: 'The Odyssey',                          titleSlug: 'the-odyssey',                        year: -800, tags: ['poetry', 'epic', 'mythology', 'ancient', 'greek'] },

  // ── H.G. Wells ─────────────────────────────────────────────────────────────
  { id: 36,    author: 'H.G. Wells',                authorSlug: 'hg-wells',                  title: 'The War of the Worlds',                titleSlug: 'the-war-of-the-worlds',              year: 1898, tags: ['fiction', 'sci-fi', '19th-century', 'english'] },
  { id: 35,    author: 'H.G. Wells',                authorSlug: 'hg-wells',                  title: 'The Time Machine',                     titleSlug: 'the-time-machine',                   year: 1895, tags: ['fiction', 'sci-fi', '19th-century', 'english'] },
  { id: 1013,  author: 'H.G. Wells',                authorSlug: 'hg-wells',                  title: 'The Invisible Man',                    titleSlug: 'the-invisible-man',                  year: 1897, tags: ['fiction', 'sci-fi', '19th-century', 'english'] },
  { id: 5230,  author: 'H.G. Wells',                authorSlug: 'hg-wells',                  title: 'The Island of Doctor Moreau',          titleSlug: 'the-island-of-doctor-moreau',        year: 1896, tags: ['fiction', 'sci-fi', '19th-century', 'english'] },
  { id: 159,   author: 'H.G. Wells',                authorSlug: 'hg-wells',                  title: 'The First Men in the Moon',            titleSlug: 'the-first-men-in-the-moon',          year: 1901, tags: ['fiction', 'sci-fi', 'early-20th-century', 'english'] },

  // ── Jules Verne ────────────────────────────────────────────────────────────
  { id: 164,   author: 'Jules Verne',               authorSlug: 'jules-verne',               title: 'Twenty Thousand Leagues Under the Sea', titleSlug: 'twenty-thousand-leagues',            year: 1870, tags: ['fiction', 'sci-fi', 'adventure', '19th-century', 'french'] },
  { id: 83,    author: 'Jules Verne',               authorSlug: 'jules-verne',               title: 'Around the World in Eighty Days',      titleSlug: 'around-the-world-in-eighty-days',    year: 1872, tags: ['fiction', 'adventure', '19th-century', 'french'] },
  { id: 18857, author: 'Jules Verne',               authorSlug: 'jules-verne',               title: 'Journey to the Centre of the Earth',   titleSlug: 'journey-to-the-centre-of-the-earth', year: 1864, tags: ['fiction', 'sci-fi', 'adventure', '19th-century', 'french'] },

  // ── Edgar Rice Burroughs ───────────────────────────────────────────────────
  { id: 62,    author: 'Edgar Rice Burroughs',      authorSlug: 'edgar-rice-burroughs',      title: 'Tarzan of the Apes',                   titleSlug: 'tarzan-of-the-apes',                 year: 1912, tags: ['fiction', 'adventure', 'early-20th-century', 'american'] },
  { id: 64,    author: 'Edgar Rice Burroughs',      authorSlug: 'edgar-rice-burroughs',      title: 'The Return of Tarzan',                 titleSlug: 'the-return-of-tarzan',               year: 1913, tags: ['fiction', 'adventure', 'early-20th-century', 'american'] },
  { id: 68,    author: 'Edgar Rice Burroughs',      authorSlug: 'edgar-rice-burroughs',      title: 'A Princess of Mars',                   titleSlug: 'a-princess-of-mars',                 year: 1912, tags: ['fiction', 'sci-fi', 'adventure', 'early-20th-century', 'american'] },

  // ── E.E. "Doc" Smith ───────────────────────────────────────────────────────
  { id: 20869, author: 'E.E. "Doc" Smith',          authorSlug: 'ee-smith',                  title: 'Triplanetary',                         titleSlug: 'triplanetary',                       year: 1934, tags: ['fiction', 'sci-fi', 'space-opera', 'early-20th-century', 'american'] },

  // ── David Lindsay ──────────────────────────────────────────────────────────
  { id: 1329,  author: 'David Lindsay',             authorSlug: 'david-lindsay',             title: 'A Voyage to Arcturus',                 titleSlug: 'a-voyage-to-arcturus',               year: 1920, tags: ['fiction', 'sci-fi', 'fantasy', 'early-20th-century', 'english'] },

  // ── Friedrich Nietzsche ────────────────────────────────────────────────────
  { id: 1998,  author: 'Friedrich Nietzsche',       authorSlug: 'friedrich-nietzsche',       title: 'Thus Spoke Zarathustra',               titleSlug: 'thus-spoke-zarathustra',             year: 1883, tags: ['philosophy', 'non-fiction', '19th-century', 'german'] },
  { id: 4363,  author: 'Friedrich Nietzsche',       authorSlug: 'friedrich-nietzsche',       title: 'Beyond Good and Evil',                 titleSlug: 'beyond-good-and-evil',               year: 1886, tags: ['philosophy', 'non-fiction', '19th-century', 'german'] },
  { id: 19322, author: 'Friedrich Nietzsche',       authorSlug: 'friedrich-nietzsche',       title: 'The Birth of Tragedy',                 titleSlug: 'the-birth-of-tragedy',               year: 1872, tags: ['philosophy', 'non-fiction', '19th-century', 'german'] },

  // ── Plato ──────────────────────────────────────────────────────────────────
  { id: 1497,  author: 'Plato',                     authorSlug: 'plato',                     title: 'The Republic',                         titleSlug: 'the-republic',                       year: -380, tags: ['philosophy', 'non-fiction', 'ancient', 'greek'] },

  // ── Sun Tzu ────────────────────────────────────────────────────────────────
  { id: 132,   author: 'Sun Tzu',                   authorSlug: 'sun-tzu',                   title: 'The Art of War',                       titleSlug: 'the-art-of-war',                     year: -500, tags: ['philosophy', 'strategy', 'non-fiction', 'ancient', 'chinese'] },

  // ── Niccolò Machiavelli ────────────────────────────────────────────────────
  { id: 1232,  author: 'Niccolò Machiavelli',       authorSlug: 'niccolo-machiavelli',       title: 'The Prince',                           titleSlug: 'the-prince',                         year: 1532, tags: ['philosophy', 'politics', 'non-fiction', 'renaissance', 'italian'] },

  // ── Marcus Aurelius ────────────────────────────────────────────────────────
  { id: 2680,  author: 'Marcus Aurelius',           authorSlug: 'marcus-aurelius',           title: 'Meditations',                          titleSlug: 'meditations',                        year: 170,  tags: ['philosophy', 'stoicism', 'non-fiction', 'ancient', 'roman'] },
];

// ─── Gutenberg URL Patterns (tried in order) ────────────────────────────────
const URL_PATTERNS = [
  (id) => `https://www.gutenberg.org/files/${id}/${id}-0.txt`,
  (id) => `https://www.gutenberg.org/files/${id}/${id}.txt`,
  (id) => `https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`,
];

// Mirrors to try if the primary fails
const MIRROR_PATTERNS = [
  (id) => `https://gutenberg.pglaf.org/files/${id}/${id}-0.txt`,
  (id) => `https://aleph.gutenberg.org/files/${id}/${id}-0.txt`,
];

// ─── HTTP Utilities ──────────────────────────────────────────────────────────

/**
 * Fetch a URL and return the text body. Follows redirects.
 * @param {string} url
 * @param {number} maxRedirects
 * @returns {Promise<string>}
 */
function fetchUrl(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        if (maxRedirects <= 0) {
          reject(new Error(`Too many redirects for ${url}`));
          return;
        }
        resolve(fetchUrl(res.headers.location, maxRedirects - 1));
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Request timeout for ${url}`));
    });
  });
}

/**
 * Download the plain text for a given Gutenberg ID, trying multiple URL patterns.
 * @param {number} id
 * @returns {Promise<string>}
 */
async function downloadGutenbergText(id) {
  const patterns = [...URL_PATTERNS, ...MIRROR_PATTERNS];
  const errors = [];

  for (const pattern of patterns) {
    const url = pattern(id);
    try {
      Logger.debug(`  Trying: ${url}`);
      const text = await fetchUrl(url);
      if (text && text.length > 500) {
        Logger.debug(`  ✓ Downloaded ${text.length} bytes from ${url}`);
        return text;
      }
    } catch (err) {
      errors.push(`${url}: ${err.message}`);
    }
  }

  throw new Error(`Failed to download Gutenberg #${id}. Tried:\n  ${errors.join('\n  ')}`);
}

// ─── Text Processing ─────────────────────────────────────────────────────────

/**
 * Remove the Gutenberg legal header and footer from the raw text.
 * @param {string} text
 * @returns {string}
 */
function stripGutenbergBoilerplate(text) {
  // Remove UTF-8 BOM if present
  text = text.replace(/^\uFEFF/, '');

  // Standard modern markers
  const startMarkers = [
    /\*{3}\s*START OF THE PROJECT GUTENBERG EBOOK[^\n]*\n/i,
    /\*{3}\s*START OF THIS PROJECT GUTENBERG EBOOK[^\n]*\n/i,
    /\*{3}\s*START: FULL LICENSE[^\n]*\n/i,
  ];
  const endMarkers = [
    /\*{3}\s*END OF THE PROJECT GUTENBERG EBOOK[^\n]*/i,
    /\*{3}\s*END OF THIS PROJECT GUTENBERG EBOOK[^\n]*/i,
    /End of the Project Gutenberg EBook/i,
    /End of Project Gutenberg's/i,
  ];

  for (const re of startMarkers) {
    const m = text.search(re);
    if (m !== -1) {
      const end = text.indexOf('\n', m);
      text = text.slice(end + 1);
      break;
    }
  }

  for (const re of endMarkers) {
    const m = text.search(re);
    if (m !== -1) {
      text = text.slice(0, m);
      break;
    }
  }

  return text.trim();
}

/**
 * Normalise line endings and remove excessive blank lines.
 * @param {string} text
 * @returns {string}
 */
function normaliseWhitespace(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/**
 * Split a Gutenberg plain-text body into chapter objects.
 * Each returned object has { heading, title, content }.
 *
 * Detection strategy (tried in order of specificity):
 *   1. Lines that are a standalone heading on their own line, all-caps or
 *      following common chapter-heading patterns, preceded by a blank line
 *      and followed by another blank line.
 *   2. Numbered sections with roman or arabic numerals.
 *   3. Fallback: entire text as one item.
 *
 * @param {string} text
 * @returns {Array<{heading: string, title: string, content: string}>}
 */
function splitIntoChapters(text) {
  const lines = text.split('\n');

  // Chapter/section heading patterns (match against trimmed line)
  const HEADING_PATTERNS = [
    // CHAPTER I / CHAPTER 1 / CHAPTER THE FIRST
    /^CHAPTER\s+([IVXLCDM]+|\d+|THE\s+\w+)(\s*[.:\-—]?\s*.*)$/i,
    // PART I / PART ONE / PART 1
    /^PART\s+([IVXLCDM]+|\d+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)(\s*[.:\-—]?\s*.*)$/i,
    // BOOK I / BOOK FIRST
    /^BOOK\s+([IVXLCDM]+|\d+|FIRST|SECOND|THIRD|FOURTH|FIFTH)(\s*[.:\-—]?\s*.*)$/i,
    // ACT I / ACT 1 (plays)
    /^ACT\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
    // SCENE I / SCENE 1
    /^SCENE\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
    // CANTO I (epics)
    /^CANTO\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
    // Standalone roman numerals: I. / II. / III. etc.
    /^([IVXLCDM]{1,6})\.\s*(.*)$/,
    // Section 1 / Section I
    /^SECTION\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
    // Letter headings for epistolary novels (e.g. "Letter I", "Letter the First")
    /^LETTER\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
    // Story/tale headings
    /^(STORY|TALE|EPISODE)\s+([IVXLCDM]+|\d+)(\s*[.:\-—]?\s*.*)$/i,
  ];

  /**
   * Return true if the trimmed line matches a chapter heading.
   */
  function isHeading(line) {
    const t = line.trim();
    if (!t || t.length > 120) return false;
    return HEADING_PATTERNS.some((re) => re.test(t));
  }

  /**
   * Find all heading line indices, requiring a blank line before (or at start)
   * and a blank line after.
   */
  const headingIndices = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!isHeading(line)) continue;
    const prevBlank = i === 0 || lines[i - 1].trim() === '';
    const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === '';
    if (prevBlank && nextBlank) {
      headingIndices.push(i);
    }
  }

  // If fewer than 2 headings found, return the entire text as a single section
  if (headingIndices.length < 2) {
    return [{ heading: '', title: 'Full Text', content: text }];
  }

  const chapters = [];

  // Text before the first heading becomes a "Preface / Front Matter" chapter
  const preamble = lines.slice(0, headingIndices[0]).join('\n').trim();
  if (preamble.length > 100) {
    chapters.push({ heading: '', title: 'Front Matter', content: preamble });
  }

  for (let ci = 0; ci < headingIndices.length; ci++) {
    const headingLine = headingIndices[ci];
    const nextHeadingLine = headingIndices[ci + 1] || lines.length;

    const rawHeading = lines[headingLine].trim();
    // Optional subtitle on the lines immediately following the heading
    const subtitleLines = [];
    for (let k = headingLine + 1; k < Math.min(headingLine + 4, nextHeadingLine); k++) {
      const t = lines[k].trim();
      if (t === '') break;
      subtitleLines.push(t);
    }
    const subtitle = subtitleLines.join(' — ');
    const title = subtitle ? `${rawHeading} — ${subtitle}` : rawHeading;

    const contentLines = lines.slice(headingLine + 1, nextHeadingLine);
    const content = contentLines.join('\n').trim();

    chapters.push({ heading: rawHeading, title, content });
  }

  return chapters;
}

// ─── Markdown Generation ─────────────────────────────────────────────────────

/**
 * Format a year for display (handles negative / BCE years).
 * @param {number} year
 * @returns {string}
 */
function formatYear(year) {
  if (year < 0) return `${Math.abs(year)} BCE`;
  return String(year);
}

/**
 * Build YAML frontmatter for a chapter file.
 * @param {object} book  — Catalog entry
 * @param {object} chapter — { heading, title, content }
 * @param {number} chapterIndex — 0-based index
 * @returns {string}
 */
function buildChapterFrontmatter(book, chapter, chapterIndex) {
  const tags = book.tags.map((t) => `  - ${t}`).join('\n');
  return [
    '---',
    `title: "${chapter.title.replace(/"/g, "'")}"`,
    `book: "${book.title.replace(/"/g, "'")}"`,
    `author: "${book.author}"`,
    `year: ${formatYear(book.year)}`,
    `chapter: ${chapterIndex + 1}`,
    `gutenberg_id: ${book.id}`,
    `source: "https://www.gutenberg.org/ebooks/${book.id}"`,
    'tags:',
    `  - literature`,
    tags,
    '---',
    '',
  ].join('\n');
}

/**
 * Build the full Markdown content for a single chapter file.
 * @param {object} book
 * @param {object} chapter
 * @param {number} chapterIndex
 * @param {number} totalChapters
 * @returns {string}
 */
function buildChapterMarkdown(book, chapter, chapterIndex, totalChapters) {
  const fm = buildChapterFrontmatter(book, chapter, chapterIndex);

  // Navigation links
  const bookPath = `${book.authorSlug}/${book.titleSlug}`;
  const prevNum = chapterIndex > 0 ? String(chapterIndex).padStart(2, '0') : null;
  const nextNum = chapterIndex < totalChapters - 1 ? String(chapterIndex + 2).padStart(2, '0') : null;
  const prevLink = prevNum ? `← [[ch-${prevNum}|Previous]]` : '← (start)';
  const nextLink = nextNum ? `[[ch-${nextNum}|Next]] →` : '(end) →';

  const nav = `> [[${bookPath}/_index|↑ ${book.title}]] | ${prevLink} | ${nextLink}`;

  // Chapter body: convert the plain text content to Markdown.
  // Main paragraph breaks are preserved; lines are joined within paragraphs.
  const body = chapter.content
    .split(/\n{2,}/)
    .map((para) => para.replace(/\n/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');

  const heading = chapter.heading ? `# ${chapter.heading}\n\n` : '';

  return [fm, nav, '', heading, body, '', '---', '', nav, ''].join('\n');
}

/**
 * Build the _index.md for a book (overview + chapter list).
 * @param {object} book
 * @param {Array} chapters
 * @returns {string}
 */
function buildBookIndex(book, chapters) {
  const tags = book.tags.map((t) => `  - ${t}`).join('\n');
  const fm = [
    '---',
    `title: "${book.title.replace(/"/g, "'")}"`,
    `author: "${book.author}"`,
    `year: ${formatYear(book.year)}`,
    `gutenberg_id: ${book.id}`,
    `source: "https://www.gutenberg.org/ebooks/${book.id}"`,
    'tags:',
    '  - literature',
    tags,
    '---',
    '',
  ].join('\n');

  const chapterList = chapters
    .map((ch, i) => {
      const num = String(i + 1).padStart(2, '0');
      return `- [[ch-${num}|${ch.title}]]`;
    })
    .join('\n');

  return [
    fm,
    `# ${book.title}`,
    '',
    `**Author:** ${book.author}  `,
    `**Year:** ${formatYear(book.year)}  `,
    `**Source:** [Project Gutenberg #${book.id}](https://www.gutenberg.org/ebooks/${book.id})  `,
    `**Tags:** ${book.tags.join(', ')}`,
    '',
    '---',
    '',
    '## Chapters',
    '',
    chapterList,
    '',
    '---',
    '',
    `[[${book.authorSlug}/_index|← Back to ${book.author}]]`,
    '',
  ].join('\n');
}

/**
 * Build or update the _index.md for an author directory.
 * @param {string} author
 * @param {string} authorSlug
 * @param {Array<object>} books — All catalog entries for this author
 * @returns {string}
 */
function buildAuthorIndex(author, authorSlug, books) {
  const allTags = [...new Set(books.flatMap((b) => b.tags))];
  const tags = allTags.map((t) => `  - ${t}`).join('\n');
  const fm = [
    '---',
    `title: "${author}"`,
    `author: "${author}"`,
    'tags:',
    '  - literature',
    '  - author-index',
    tags,
    '---',
    '',
  ].join('\n');

  const bookList = books
    .map((b) => `- [[${b.titleSlug}/_index|${b.title}]] (${formatYear(b.year)})`)
    .join('\n');

  return [
    fm,
    `# ${author}`,
    '',
    '---',
    '',
    '## Works',
    '',
    bookList,
    '',
    '---',
    '',
    '[[_index|← Literature Collection]]',
    '',
  ].join('\n');
}

// ─── File System Helpers ─────────────────────────────────────────────────────

/**
 * Write a file, creating directories as needed.
 * @param {string} filePath
 * @param {string} content
 * @param {boolean} dryRun
 */
function writeFile(filePath, content, dryRun = false) {
  if (dryRun) {
    Logger.warn(`[DRY RUN] Would write: ${filePath} (${content.length} bytes)`);
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Check whether a book directory already exists.
 * @param {string} outputDir
 * @param {object} book
 * @returns {boolean}
 */
function bookExists(outputDir, book) {
  const bookDir = path.join(outputDir, book.authorSlug, book.titleSlug);
  return fs.existsSync(bookDir) && fs.readdirSync(bookDir).some((f) => f.startsWith('ch-'));
}

// ─── Core Processing ─────────────────────────────────────────────────────────

/**
 * Full pipeline for a single book: download → strip → split → write.
 * @param {object} book
 * @param {string} outputDir
 * @param {object} opts — { dryRun, skipExisting }
 */
async function processBook(book, outputDir, opts = {}) {
  const { dryRun = false, skipExisting = false } = opts;
  const label = `[${book.id}] ${book.author} — ${book.title}`;

  if (skipExisting && bookExists(outputDir, book)) {
    Logger.warn(`Skipping (already exists): ${label}`);
    return { skipped: true };
  }

  Logger.info(`Processing: ${label}`);

  // In dry-run mode show expected output structure without downloading
  if (dryRun) {
    const bookDir = path.join(outputDir, book.authorSlug, book.titleSlug);
    const authorDir = path.join(outputDir, book.authorSlug);
    Logger.warn(`[DRY RUN] Would create directory  : ${path.relative(process.cwd(), bookDir)}`);
    Logger.warn(`[DRY RUN] Would write              : ${path.relative(process.cwd(), path.join(authorDir, '_index.md'))}`);
    Logger.warn(`[DRY RUN] Would write              : ${path.relative(process.cwd(), path.join(bookDir, '_index.md'))}`);
    Logger.warn(`[DRY RUN] Would write (N chapters) : ${path.relative(process.cwd(), path.join(bookDir, 'ch-01.md'))} … ch-NN.md`);
    Logger.warn(`[DRY RUN] Source URL               : https://www.gutenberg.org/ebooks/${book.id}`);
    return { dryRun: true };
  }

  // 1. Download
  let rawText;
  try {
    rawText = await downloadGutenbergText(book.id);
  } catch (err) {
    Logger.error(`Download failed: ${label}`);
    Logger.error(err.message);
    return { error: err.message };
  }

  // 2. Strip boilerplate & normalise
  const cleaned = normaliseWhitespace(stripGutenbergBoilerplate(rawText));

  // 3. Split into chapters
  const chapters = splitIntoChapters(cleaned);
  Logger.info(`  Found ${chapters.length} chapter(s)`);

  const bookDir = path.join(outputDir, book.authorSlug, book.titleSlug);

  // 4. Write chapter files
  for (let i = 0; i < chapters.length; i++) {
    const num = String(i + 1).padStart(2, '0');
    const filePath = path.join(bookDir, `ch-${num}.md`);
    const content = buildChapterMarkdown(book, chapters[i], i, chapters.length);
    writeFile(filePath, content, false);
    Logger.debug(`  Wrote: ch-${num}.md`);
  }

  // 5. Write book _index.md
  const bookIndexPath = path.join(bookDir, '_index.md');
  const bookIndexContent = buildBookIndex(book, chapters);
  writeFile(bookIndexPath, bookIndexContent, false);

  // 6. Write / update author _index.md
  const authorDir = path.join(outputDir, book.authorSlug);
  const authorIndexPath = path.join(authorDir, '_index.md');
  const authorBooks = CATALOG.filter((b) => b.authorSlug === book.authorSlug);
  const authorIndexContent = buildAuthorIndex(book.author, book.authorSlug, authorBooks);
  writeFile(authorIndexPath, authorIndexContent, false);

  Logger.success(`  Done: ${label} (${chapters.length} files → ${path.relative(process.cwd(), bookDir)})`);
  return { chapters: chapters.length };
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

program
  .name('gutenberg-downloader')
  .description('Download Project Gutenberg works and convert to Obsidian Markdown')
  .option('--id <id>', 'Download a single book by Gutenberg ID')
  .option('--author <slug>', 'Download all works for an author slug (e.g. lewis-carroll)')
  .option('--all', 'Download the entire catalog')
  .option('--list', 'List all catalog works without downloading')
  .option(
    '--output <path>',
    'Output directory',
    path.join(__dirname, '..', '..', 'dev-journal', 'references', 'literature'),
  )
  .option('--dry-run', 'Preview actions without downloading or writing files', false)
  .option('--skip-existing', 'Skip books already present in the output directory', false)
  .option('--delay <ms>', 'Politeness delay between downloads in milliseconds', '2000')
  .option('--verbose', 'Show detailed output', false)
  .parse(process.argv);

const options = program.opts();

// Enable verbose logging
if (options.verbose) {
  process.env.VERBOSE = 'true';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  Logger.header('Gutenberg Downloader');

  const delay = parseInt(options.delay, 10) || 2000;
  const outputDir = path.resolve(options.output);
  const dryRun = options.dryRun || false;
  const skipExisting = options.skipExisting || false;

  Logger.info(`Output directory : ${outputDir}`);
  Logger.info(`Dry run          : ${dryRun}`);
  Logger.info(`Skip existing    : ${skipExisting}`);
  Logger.info(`Request delay    : ${delay}ms`);
  Logger.divider();

  // ── --list ──────────────────────────────────────────────────────────────────
  if (options.list) {
    Logger.header(`Catalog — ${CATALOG.length} works`);
    const byAuthor = {};
    CATALOG.forEach((b) => {
      if (!byAuthor[b.author]) byAuthor[b.author] = [];
      byAuthor[b.author].push(b);
    });
    for (const [author, books] of Object.entries(byAuthor)) {
      console.log(`\n${author}:`);
      books.forEach((b) => console.log(`  #${b.id}  ${b.title} (${formatYear(b.year)})`));
    }
    return;
  }

  // ── Determine which books to process ────────────────────────────────────────
  let queue = [];

  if (options.id) {
    const id = parseInt(options.id, 10);
    const book = CATALOG.find((b) => b.id === id);
    if (!book) {
      Logger.error(`Gutenberg ID ${id} not found in catalog. Use --list to see all entries.`);
      process.exit(1);
    }
    queue = [book];
  } else if (options.author) {
    queue = CATALOG.filter((b) => b.authorSlug === options.author);
    if (queue.length === 0) {
      Logger.error(`No books found for author slug "${options.author}". Use --list to see slugs.`);
      process.exit(1);
    }
  } else if (options.all) {
    queue = [...CATALOG];
  } else {
    Logger.error('Please specify --id <id>, --author <slug>, --all, or --list');
    program.help();
    process.exit(1);
  }

  Logger.info(`Processing ${queue.length} book(s)…`);
  Logger.divider();

  // ── Process queue ────────────────────────────────────────────────────────────
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < queue.length; i++) {
    const book = queue[i];
    if (i > 0 && !dryRun) {
      Logger.debug(`Waiting ${delay}ms before next request…`);
      await sleep(delay);
    }
    const result = await processBook(book, outputDir, { dryRun, skipExisting });
    if (result.error) {
      failed++;
    } else if (result.skipped) {
      skipped++;
    } else {
      succeeded++;
    }  }

  Logger.divider();
  Logger.header('Summary');
  Logger.success(`Succeeded : ${succeeded}`);
  if (skipped > 0) Logger.warn(`Skipped   : ${skipped}`);
  if (failed > 0) Logger.error(`Failed    : ${failed}`);
  Logger.info(`Output    : ${outputDir}`);

  if (failed > 0) process.exit(1);
}

if (require.main === module) {
  main().catch((err) => {
    Logger.error('Unexpected error:', err.message);
    if (process.env.VERBOSE) console.error(err);
    process.exit(1);
  });
}

module.exports = {
  CATALOG,
  downloadGutenbergText,
  stripGutenbergBoilerplate,
  normaliseWhitespace,
  splitIntoChapters,
  buildChapterMarkdown,
  buildBookIndex,
  buildAuthorIndex,
  processBook,
};
