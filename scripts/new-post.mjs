// Scaffold a new draft post from the command line.
//
// Usage:  npm run new:post "My Post Title"
//
// Creates src/content/posts/<slug>.md with today's date and draft: true, then
// prints the next steps. (Non-engineers can instead copy _TEMPLATE.md in the
// GitHub browser editor — see the README.)
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run new:post "My Post Title"');
  process.exit(1);
}

const slug = title
  .toLowerCase()
  .normalize('NFKD')
  .replace(/\p{Diacritic}/gu, '') // strip accents
  .replace(/[^a-z0-9]+/g, '-') // non-alphanumerics -> hyphen
  .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
  .slice(0, 60);

if (!slug) {
  console.error('Could not derive a filename from that title. Try plain letters and numbers.');
  process.exit(1);
}

const dir = join('src', 'content', 'posts');
mkdirSync(dir, { recursive: true });
const file = join(dir, `${slug}.md`);

if (existsSync(file)) {
  console.error(`A post already exists at ${file} — pick a different title or edit that file.`);
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
const escaped = title.replace(/"/g, '\\"');

const body = `---
title: "${escaped}"
description: "One or two sentences summarizing the post (used for SEO + previews)."
pubDate: ${today}
tags: []
# Keep draft: true while writing and during review. Set to false to publish.
draft: true
---

Write your post here in Markdown.
`;

writeFileSync(file, body);

console.log(`\n✔ Created ${file}`);
console.log('\nNext:');
console.log('  1. Open the file and write your post.');
console.log('  2. Preview it locally:  npm run dev   then visit /drafts');
console.log('  3. Open a pull request and follow the review steps in the README.');
