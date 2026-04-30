# Literature References

> A personal library of public domain literary works sourced from [Project Gutenberg](https://www.gutenberg.org/).  
> All texts are downloaded in plain-text format and converted to Obsidian-compatible markdown, split by chapter where applicable.

---

## 📚 Current Collection

| Author | Works |
|--------|-------|
| Edgar Allan Poe | Short stories, poetry |
| Arthur Conan Doyle | Sherlock Holmes stories |
| Lewis Carroll | Alice in Wonderland, Through the Looking-Glass |
| Fyodor Dostoevsky | Crime and Punishment, The Brothers Karamazov |
| D'Arcy Wentworth Thompson | On Growth and Form |
| L. Frank Baum | The Wonderful Wizard of Oz |

---

## 🗂️ Collection Structure

```
references/literature/
├── README.md                     # This file
├── _index.md                     # Master MOC (Map of Content)
├── edgar-allan-poe/
│   └── _index.md
├── arthur-conan-doyle/
│   └── _index.md
├── lewis-carroll/
│   └── _index.md
├── fyodor-dostoevsky/
│   └── _index.md
├── darcy-wentworth-thompson/
│   └── _index.md
└── l-frank-baum/
    └── _index.md
```

---

## ➕ Want More?

The following public domain works are queued for download from Project Gutenberg.  
Use `dev-tools/scripts/download-gutenberg.js` to fetch and convert them.

### 🎭 Classics & Literature

| Author | Title | Gutenberg ID |
|--------|-------|:------------:|
| William Shakespeare | Complete Works | [#100](https://www.gutenberg.org/ebooks/100) |
| Mark Twain | Adventures of Huckleberry Finn | [#76](https://www.gutenberg.org/ebooks/76) |
| Mark Twain | Adventures of Tom Sawyer | [#74](https://www.gutenberg.org/ebooks/74) |
| Jane Austen | Pride and Prejudice | [#1342](https://www.gutenberg.org/ebooks/1342) |
| Jane Austen | Sense and Sensibility | [#161](https://www.gutenberg.org/ebooks/161) |
| Mary Shelley | Frankenstein | [#84](https://www.gutenberg.org/ebooks/84) |
| Bram Stoker | Dracula | [#345](https://www.gutenberg.org/ebooks/345) |
| Homer | The Iliad | [#6130](https://www.gutenberg.org/ebooks/6130) |
| Homer | The Odyssey | [#1727](https://www.gutenberg.org/ebooks/1727) |

### 🚀 Science Fiction & Space Opera

| Author | Title | Gutenberg ID |
|--------|-------|:------------:|
| H.G. Wells | The Time Machine | [#35](https://www.gutenberg.org/ebooks/35) |
| H.G. Wells | The War of the Worlds | [#36](https://www.gutenberg.org/ebooks/36) |
| H.G. Wells | The Invisible Man | [#5230](https://www.gutenberg.org/ebooks/5230) |
| H.G. Wells | The Island of Doctor Moreau | [#159](https://www.gutenberg.org/ebooks/159) |
| H.G. Wells | The First Men in the Moon | [#1013](https://www.gutenberg.org/ebooks/1013) |
| Jules Verne | Twenty Thousand Leagues Under the Sea | [#164](https://www.gutenberg.org/ebooks/164) |
| Jules Verne | Around the World in Eighty Days | [#103](https://www.gutenberg.org/ebooks/103) |
| Jules Verne | Journey to the Centre of the Earth | [#18857](https://www.gutenberg.org/ebooks/18857) |
| Edgar Rice Burroughs | A Princess of Mars (Barsoom #1) | [#62](https://www.gutenberg.org/ebooks/62) |
| Edgar Rice Burroughs | The Gods of Mars (Barsoom #2) | [#64](https://www.gutenberg.org/ebooks/64) |
| Edgar Rice Burroughs | The Warlord of Mars (Barsoom #3) | [#68](https://www.gutenberg.org/ebooks/68) |
| E.E. "Doc" Smith | Triplanetary (Lensman) | [#20869](https://www.gutenberg.org/ebooks/20869) |
| David Lindsay | A Voyage to Arcturus | [#1329](https://www.gutenberg.org/ebooks/1329) |

### 🧠 Philosophy & Strategy

| Author | Title | Gutenberg ID |
|--------|-------|:------------:|
| Friedrich Nietzsche | Thus Spoke Zarathustra | [#1998](https://www.gutenberg.org/ebooks/1998) |
| Friedrich Nietzsche | Beyond Good and Evil | [#4363](https://www.gutenberg.org/ebooks/4363) |
| Friedrich Nietzsche | The Birth of Tragedy | [#19322](https://www.gutenberg.org/ebooks/19322) |
| Plato | The Republic | [#1497](https://www.gutenberg.org/ebooks/1497) |
| Sun Tzu | The Art of War | [#132](https://www.gutenberg.org/ebooks/132) |
| Niccolò Machiavelli | The Prince | [#1232](https://www.gutenberg.org/ebooks/1232) |
| Marcus Aurelius | Meditations | [#2680](https://www.gutenberg.org/ebooks/2680) |

---

## 🛠️ Download & Conversion

Use the provided script to download and convert any work:

```bash
# Download a single work by Gutenberg ID
node dev-tools/scripts/download-gutenberg.js --id 100 --author "shakespeare" --title "complete-works"

# Batch download from this README (all "Want More?" items)
node dev-tools/scripts/download-gutenberg.js --batch dev-journal/references/literature/README.md

# Dry run to preview what would be downloaded
node dev-tools/scripts/download-gutenberg.js --id 1342 --dry-run
```

The script will:
1. Fetch the plain-text file from `https://www.gutenberg.org/cache/epub/{ID}/pg{ID}.txt`
2. Strip the Gutenberg header/footer boilerplate
3. Split the text into chapters based on chapter headings
4. Write one `.md` file per chapter to `dev-journal/references/literature/{author-slug}/{title-slug}/`
5. Generate an `_index.md` MOC for the work

---

## 📌 Notes

- All works are sourced from [Project Gutenberg](https://www.gutenberg.org/) — public domain, free to use
- Markdown chapters are formatted for [Obsidian](https://obsidian.md/) vault compatibility
- Chapter splits use regex patterns to detect common heading styles (`CHAPTER I`, `Chapter 1`, `PART ONE`, etc.)
- Works without clear chapter breaks are saved as a single markdown file

---

*Last Updated: 2026-04-30*
