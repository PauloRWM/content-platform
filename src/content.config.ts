// Content collections power the draft -> review -> publish pipeline.
//
// Every article is a Markdown file in `src/content/posts/`. The frontmatter at
// the top of each file carries its state. The single most important field is
// `draft`:
//
//   draft: true   -> a work in progress. NEVER shown on the live site.
//   draft: false  -> published. Appears on the live site once merged to `main`.
//
// New posts default to `draft: true`, so nothing can go live by accident — a
// human has to deliberately flip the flag to publish. See README ("The
// publishing workflow") for the full draft -> review -> publish steps.
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
  // Load every .md file in the posts folder EXCEPT files starting with `_`
  // (so `_TEMPLATE.md` is a copy-me template, not a real post).
  loader: glob({ pattern: ['**/*.md', '!**/_*.md'], base: './src/content/posts' }),
  schema: z.object({
    // Required — the reviewer checks these are filled in.
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    // Optional niceties.
    updatedDate: z.coerce.date().optional(),
    author: z.string().default('paulo testes'),
    tags: z.array(z.string()).default([]),
    // The publish switch. Default true = safe: a new post is a draft until
    // someone explicitly sets this to false.
    draft: z.boolean().default(true),
  }),
});

export const collections = { posts };
