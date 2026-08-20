# Content Platform

The website and publishing foundation for **paulo testes**. This is where our content
lives, gets published, and goes out to the world.

**Live site:** https://paulorwm.github.io/content-platform

---

## The 30-second version (for everyone)

- The website is **built from this repository**. Nothing is edited on a live server.
- When a change lands on the **`main`** branch, the site **rebuilds and republishes itself
  automatically** — usually within a couple of minutes. This is called "push to publish."
  *(Temporary: automatic deploys are paused by a GitHub billing lock — an engineer runs
  `npm run deploy` to publish until it's cleared. See "How deploys work".)*
- Posts are written in plain text (Markdown), so you don't need to be an engineer to add or
  edit content. Every post moves through three clear states — **draft → in review →
  published** — with a teammate's approval required before anything goes live. The full
  step-by-step is in **"The publishing workflow"** below.

You do **not** need to install anything to publish a change if you edit files directly on
GitHub in the browser — see "The publishing workflow" below.

---

## The publishing workflow

Every post travels through three states, and **nothing reaches the live site without a
second person approving it**. That review gate is the whole point of this workflow.

| State          | What it means                                   | Where it lives                          |
| -------------- | ----------------------------------------------- | --------------------------------------- |
| 📝 **Draft**    | A work in progress. Never shown on the live site. | `draft: true` in the post's frontmatter |
| 👀 **In review**| Finished and waiting for a teammate to approve. | An open **pull request**                |
| ✅ **Published**| Approved, merged, and live for the world.        | `draft: false`, merged to `main`        |

The state is controlled by one line at the top of each post — `draft: true` or
`draft: false` — plus whether the change has been merged. A brand-new post always starts
as `draft: true`, so **nothing can go live by accident**: a human has to deliberately flip
the switch *and* get the change approved and merged.

### The three steps

**1. Draft** — create the post.

- *In the browser (no software needed):* open `src/content/posts/_TEMPLATE.md` on GitHub,
  click **Copy raw file**, then create a new file at
  `src/content/posts/your-post-title.md` and paste. Fill in the title/description/date and
  write your article in Markdown. Leave `draft: true`.
- *On a computer:* run `npm run new:post "Your Post Title"`. It scaffolds the file for you
  with today's date and `draft: true`, then prints the next steps.

**2. Review** — open a pull request (PR).

- When you commit your new file on GitHub, choose **"Create a new branch and start a pull
  request"** instead of committing straight to `main`.
- The PR opens with a built-in checklist (`.github/pull_request_template.md`) — **that
  checklist is the review gate.** The author ticks their boxes; a teammate reads the post
  and ticks the reviewer boxes to approve.
- Want to *see* how it will look first? Drafts render locally: run `npm run dev` and open
  **`/drafts`** to preview any in-progress post exactly as it will appear. Drafts are
  invisible on the live site and hidden from search engines, so this preview is safe.

**3. Publish** — approve, flip the switch, merge.

- Once the reviewer approves, set `draft: false` in the post's frontmatter (you can do this
  in the same PR).
- Merge the PR into `main`. The site rebuilds and the post is **live within a couple of
  minutes** (see "How deploys work" — during the current billing lock an engineer runs
  `npm run deploy`).
- Changed your mind? Leave `draft: true` and merge — the change is saved but the post stays
  off the live site until you set it to `false` in a later change.

### Why it's safe

- **Drafts never leak.** A `draft: true` post has no page on the live site and never
  appears in the blog list, the sitemap, or search results. It only shows in the local
  `/drafts` preview.
- **Two sets of eyes.** Publishing *is* merging a pull request, and a PR can require a
  reviewer's approval — so no single person can push content live alone.
- **A bad change never takes the site down.** If a build fails, the live site simply stays
  on its last good version.

---

## How it's built (the stack)

| Piece            | What we use                     | Why                                              |
| ---------------- | ------------------------------- | ------------------------------------------------ |
| Site generator   | [Astro](https://astro.build)    | Markdown-first, fast, zero JS by default, great SEO |
| Hosting          | GitHub Pages                    | Free, reliable, no server to maintain            |
| Deploys (CI/CD)  | GitHub Actions                  | Rebuilds + publishes on every push to `main`     |

It's a **static site**: every page is pre-built into plain HTML, so there's no database or
server to keep running, patch, or pay for. That keeps it cheap, fast, and secure.

---

## Editing content in the browser (no tools needed)

1. Open this repo on GitHub.
2. Find the file you want to change (site pages live in `src/pages/`).
3. Click the ✏️ pencil icon, make your edit, and click **Commit changes** to `main`.
4. Wait ~2 minutes. The **Actions** tab shows the deploy running; when it's green, the change
   is live at the URL above.

To add a brand-new page, create a file like `src/pages/about.astro` — it becomes
`/about` on the site automatically.

---

## Running it on your computer (for engineers)

Requires [Node.js](https://nodejs.org) 20+ (this repo is pinned to Node 22 via `.nvmrc`).

```bash
npm install                 # one-time: install dependencies
npm run dev                 # start a local preview at http://localhost:4321/content-platform
npm run build               # produce the production site into ./dist
npm run preview             # preview the built ./dist locally
npm run new:post "A Title"  # scaffold a new draft post in src/content/posts/
```

### Project layout

```
src/
  content/posts/             # ← the posts. One Markdown file = one article.
    _TEMPLATE.md             #   copy-me starter (files starting with _ are ignored)
  content.config.ts          # post frontmatter schema + the draft/publish switch
  layouts/
    BaseLayout.astro         # shared <head> / SEO for every page
    PostLayout.astro         # single-article layout (title, byline, draft banner)
  pages/                     # each file here becomes a URL (index.astro = home)
    blog/                    #   /blog list + /blog/<slug> article pages
    drafts.astro             #   local-only preview of in-progress drafts
scripts/new-post.mjs         # `npm run new:post` — scaffolds a draft
public/                      # static files served as-is (styles, robots.txt, favicon)
astro.config.mjs             # site URL, base path, integrations (sitemap)
.github/pull_request_template.md  # the review-gate checklist on every PR
.github/workflows/deploy.yml # the push-to-publish pipeline
```

---

## How deploys work

There are two publish paths. The first is the intended long-term one; the second is what
we're using **right now** while GitHub Actions is unavailable (see the note below).

### 1. Automatic (intended path) — push to `main`

`.github/workflows/deploy.yml` runs on every push to `main`:

1. **Build** — the official `withastro/action` installs dependencies and runs `astro build`,
   producing static files in `dist/`.
2. **Deploy** — `actions/deploy-pages` publishes `dist/` to GitHub Pages.

Watch a deploy (or trigger one manually) from the repo's **Actions** tab. If a build fails,
the site stays on the last good version — a broken change never takes the site down.

### 2. Interim (one command) — `npm run deploy`

> ⚠️ **Heads up:** GitHub Actions is currently **paused because the GitHub account is
> billing-locked**, so path #1 above can't run yet. Until the account owner clears that
> lock, publish with one command instead:
>
> ```bash
> npm run deploy
> ```
>
> This builds the site and pushes the output to the `gh-pages` branch, which GitHub Pages
> serves (this managed Pages pipeline is **not** affected by the Actions lock). The change
> is live within about a minute. The moment billing is fixed, path #1 takes over
> automatically and this step is no longer needed.

---

## Custom domain (later)

When we're ready to use our own domain instead of `paulorwm.github.io/content-platform`:

1. In `astro.config.mjs`, set `site` to the new domain and change `base` to `'/'`.
2. Add the domain under **Settings → Pages** and update DNS.
3. Update the `Sitemap:` line in `public/robots.txt`.

---

## SEO & performance foundations already in place

- Canonical URLs and Open Graph tags on every page (`src/layouts/BaseLayout.astro`).
- Auto-generated `sitemap-index.xml` (via `@astrojs/sitemap`).
- `robots.txt` pointing crawlers at the sitemap.
- Static HTML with near-zero JavaScript for fast page loads.

*Deeper SEO, analytics, and distribution automation are the follow-up tasks T3–T5.*
