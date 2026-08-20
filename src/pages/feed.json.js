// JSON Feed (https://jsonfeed.org) of published pieces.
//
// WHY THIS FILE EXISTS
// This feed is the *integration contract* between content and distribution.
// The publishing pipeline (T2) puts pieces into a `posts` content collection;
// this endpoint turns published pieces into a machine-readable feed; and the
// distribution engine (scripts/distribute.mjs) reads that feed to decide what
// to newsletter / cross-post. Nothing in distribution needs to know how posts
// are stored — it only reads this feed. Add a piece to `posts`, and it flows
// out to every distribution channel automatically.
//
// It is deliberately defensive: if the `posts` collection is empty this still
// returns an empty-but-valid feed instead of failing the build.
//
// NOTE: `getCollection` is imported statically at the top (like every page in
// this repo). An earlier version used a dynamic `await import('astro:content')`,
// which broke the static build of this endpoint ("Unexpected token '*'") — the
// static import is the supported, reliable pattern.
import { getCollection } from 'astro:content';

const SITE = 'paulo testes';

// Map a variety of reasonable frontmatter field names onto the feed's needs,
// so this keeps working regardless of the exact schema T2 settles on.
function pick(data, keys, fallback = undefined) {
  for (const k of keys) {
    if (data && data[k] != null && data[k] !== '') return data[k];
  }
  return fallback;
}

function isPublished(data) {
  // Treat a piece as published unless it's explicitly a draft / not-published.
  if (data.draft === true) return false;
  const status = pick(data, ['status', 'state']);
  if (status && !['published', 'live', 'public'].includes(String(status).toLowerCase())) {
    return false;
  }
  return true;
}

function toISO(value) {
  if (!value) return undefined;
  try {
    const d = value instanceof Date ? value : new Date(value);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch {
    return undefined;
  }
}

export async function GET(context) {
  const site = context.site?.href ?? 'https://paulorwm.github.io/';
  const base = import.meta.env.BASE_URL || '/';
  const feedUrl = new URL(`${base.replace(/\/$/, '')}/feed.json`, site).href;

  let entries = [];
  try {
    entries = await getCollection('posts');
  } catch {
    // An empty/absent collection yields an empty-but-valid feed, never a crash.
    entries = [];
  }

  const items = entries
    .map((entry) => {
      const data = entry.data || {};
      if (!isPublished(data)) return null;

      const slug = entry.slug || entry.id || pick(data, ['slug']) || '';
      // Prefer an explicit permalink; otherwise assume /blog/<slug>/.
      const explicit = pick(data, ['url', 'permalink', 'canonicalUrl']);
      const url = explicit
        ? new URL(explicit, site).href
        : new URL(`${base.replace(/\/$/, '')}/blog/${slug}/`, site).href;

      const title = pick(data, ['title', 'headline'], slug || 'Untitled');
      const summary = pick(data, ['description', 'summary', 'excerpt', 'subtitle'], '');
      const published = toISO(pick(data, ['pubDate', 'date', 'publishedAt', 'published', 'datePublished']));
      const tags = pick(data, ['tags', 'categories', 'keywords']);

      return {
        id: url, // stable, unique per piece
        url,
        title,
        summary,
        ...(published ? { date_published: published } : {}),
        ...(Array.isArray(tags) ? { tags } : {}),
      };
    })
    .filter(Boolean)
    // Newest first when we have dates.
    .sort((a, b) => String(b.date_published || '').localeCompare(String(a.date_published || '')));

  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${SITE} — content`,
    home_page_url: new URL(base, site).href,
    feed_url: feedUrl,
    description: 'Published pieces from the paulo testes content platform.',
    items,
  };

  return new Response(JSON.stringify(feed, null, 2), {
    headers: { 'Content-Type': 'application/feed+json; charset=utf-8' },
  });
}
