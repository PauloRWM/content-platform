#!/usr/bin/env node
// Distribution automation: when a piece publishes, fan it out to distribution
// channels (newsletter draft + social cross-post draft) — one command.
//
//   node scripts/distribute.mjs [options]
//
// Options:
//   --feed <path|url>     Source of published pieces as a JSON Feed.
//                         Default: dist/feed.json (produced by `npm run build`).
//   --piece-file <path>   Distribute a single piece from a JSON file instead of
//                         a feed (handy for testing / manual one-offs).
//   --all                 Ignore the "already distributed" state; consider every
//                         piece in the feed as new.
//   --force               Distribute even pieces already in the state file.
//   --dry-run             Show what WOULD happen. No files written, no network,
//                         no state changes.
//   -h, --help            Print this help.
//
// SAFE BY DEFAULT: with no provider credentials set, this never sends anything
// live — it writes local draft files under .distribution/drafts/ that a human
// can review, and tells you how to turn on live channels. It only sends live
// when the relevant env var is present (see docs/DISTRIBUTION.md), and even then
// the newsletter is created as a *draft* for a human to approve and send.
//
// ADD A CHANNEL: append an object to the CHANNELS array below. Each channel is
// { name, run(piece, ctx) }. See docs/DISTRIBUTION.md § "Add a channel".

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
const STATE_DIR = join(ROOT, '.distribution');
const DRAFTS_DIR = join(STATE_DIR, 'drafts');
const STATE_FILE = join(STATE_DIR, 'state.json');

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = { feed: 'dist/feed.json', pieceFile: null, all: false, force: false, dryRun: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--feed') args.feed = argv[++i];
    else if (a === '--piece-file') args.pieceFile = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
    else if (a === '-h' || a === '--help') args.help = true;
    else console.warn(`⚠ ignoring unknown argument: ${a}`);
  }
  return args;
}

const HELP = readFileSync(new URL(import.meta.url)).toString().split('\n')
  .filter((l) => l.startsWith('//')).map((l) => l.replace(/^\/\/ ?/, '')).join('\n');

// ---------------------------------------------------------------------------
// Loading pieces
// ---------------------------------------------------------------------------
async function loadFeedItems({ feed, pieceFile }) {
  if (pieceFile) {
    const piece = JSON.parse(readFileSync(resolve(ROOT, pieceFile), 'utf8'));
    return [normalizePiece(piece)];
  }
  let raw;
  if (/^https?:\/\//i.test(feed)) {
    const res = await fetch(feed);
    if (!res.ok) throw new Error(`Failed to fetch feed ${feed}: ${res.status}`);
    raw = await res.json();
  } else {
    const path = resolve(ROOT, feed);
    if (!existsSync(path)) {
      console.log(`ℹ No feed at ${feed} yet — run \`npm run build\` first, or pass --feed/--piece-file.`);
      return [];
    }
    raw = JSON.parse(readFileSync(path, 'utf8'));
  }
  const items = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
  return items.map(normalizePiece);
}

function normalizePiece(p) {
  const url = p.url || p.id || p.permalink || '';
  return {
    id: p.id || url || p.title,
    url,
    title: p.title || 'Untitled',
    summary: p.summary || p.description || p.content_text || '',
    date_published: p.date_published || p.date || '',
    tags: Array.isArray(p.tags) ? p.tags : [],
  };
}

// ---------------------------------------------------------------------------
// State (which pieces have already been distributed)
// ---------------------------------------------------------------------------
function loadState() {
  if (!existsSync(STATE_FILE)) return { distributed: {} };
  try {
    return JSON.parse(readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return { distributed: {} };
  }
}
function saveState(state) {
  mkdirSync(STATE_DIR, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'piece';
}
function hashtags(tags, max = 3) {
  return (tags || []).slice(0, max).map((t) => '#' + String(t).replace(/[^a-zA-Z0-9]/g, '')).filter((t) => t.length > 1);
}
function truncate(s, n) {
  return s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…';
}
function writeDraft(name, contents, dryRun) {
  if (dryRun) return `(dry-run) would write .distribution/drafts/${name}`;
  mkdirSync(DRAFTS_DIR, { recursive: true });
  const path = join(DRAFTS_DIR, name);
  writeFileSync(path, contents);
  return `.distribution/drafts/${name}`;
}

// Compose platform-specific copy from a piece. Kept separate so it's easy to
// tune the voice or add a platform without touching channel plumbing.
function composeSocial(piece) {
  const tags = hashtags(piece.tags);
  const tagLine = tags.length ? '\n\n' + tags.join(' ') : '';
  // X/Twitter: hard 280-char budget. Reserve room for URL (~23 t.co) + tags.
  const reserve = 24 + (tagLine ? tagLine.length : 0) + 2;
  const x = `${truncate(piece.title, Math.max(20, 280 - reserve))}\n\n${piece.url}${tagLine}`;
  // LinkedIn: room to breathe.
  const linkedin = [piece.title, piece.summary, piece.url, tags.join(' ')].filter(Boolean).join('\n\n');
  return { x, linkedin };
}

function composeNewsletter(piece) {
  const subject = piece.title;
  const body = [
    `## ${piece.title}`,
    piece.summary || '',
    `[Read it →](${piece.url})`,
    '',
    '---',
    '*You are receiving this because you subscribed to the paulo testes newsletter.*',
  ].filter((l) => l !== undefined).join('\n\n');
  return { subject, body };
}

// ---------------------------------------------------------------------------
// Channels — add one by appending to this array. Each returns { status, detail }.
//   status: 'sent' | 'drafted' | 'skipped' | 'error'
// ---------------------------------------------------------------------------
const CHANNELS = [
  {
    name: 'social',
    async run(piece, { dryRun }) {
      const { x, linkedin } = composeSocial(piece);
      const md = [
        `# Social drafts — ${piece.title}`,
        `Piece: ${piece.url}`,
        '',
        `## X / Twitter (${x.length}/280)`,
        '```', x, '```',
        '',
        '## LinkedIn',
        '```', linkedin, '```',
        '',
        '_Review, tweak, and post — or wire a live channel (SOCIAL_WEBHOOK_URL). See docs/DISTRIBUTION.md._',
      ].join('\n');
      const where = writeDraft(`${slugify(piece.title)}.social.md`, md, dryRun);

      // Optional: route the draft to a human queue / automation (Buffer, Zapier,
      // Make, Slack, Discord…) via a single webhook. Still human-approved there.
      const webhook = process.env.SOCIAL_WEBHOOK_URL;
      if (webhook && !dryRun) {
        try {
          const res = await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: x, platforms: { x, linkedin }, piece }),
          });
          return { status: res.ok ? 'sent' : 'error', detail: `webhook ${res.status}; draft ${where}` };
        } catch (e) {
          return { status: 'error', detail: `webhook failed: ${e.message}; draft ${where}` };
        }
      }
      return { status: 'drafted', detail: where + (webhook ? ' (dry-run: webhook skipped)' : ' (set SOCIAL_WEBHOOK_URL to auto-queue)') };
    },
  },
  {
    name: 'newsletter',
    async run(piece, { dryRun }) {
      const { subject, body } = composeNewsletter(piece);
      const where = writeDraft(`${slugify(piece.title)}.newsletter.md`, `Subject: ${subject}\n\n${body}\n`, dryRun);

      const key = process.env.BUTTONDOWN_API_KEY;
      if (!key) {
        return { status: 'drafted', detail: where + ' (set BUTTONDOWN_API_KEY to auto-create a draft email)' };
      }
      if (dryRun) return { status: 'drafted', detail: `(dry-run) would create Buttondown draft "${subject}"` };
      try {
        const res = await fetch('https://api.buttondown.email/v1/emails', {
          method: 'POST',
          headers: { Authorization: `Token ${key}`, 'Content-Type': 'application/json' },
          // status:"draft" => sits in Buttondown for a human to review & send.
          body: JSON.stringify({ subject, body, status: 'draft' }),
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          return { status: 'sent', detail: `Buttondown draft created (id ${data.id || '?'}) — approve & send in dashboard` };
        }
        const text = await res.text().catch(() => '');
        return { status: 'error', detail: `Buttondown ${res.status}: ${truncate(text, 160)}; local draft ${where}` };
      } catch (e) {
        return { status: 'error', detail: `Buttondown request failed: ${e.message}; local draft ${where}` };
      }
    },
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }

  const pieces = await loadFeedItems(args);
  if (pieces.length === 0) {
    console.log('No pieces to consider. Nothing to distribute.');
    return;
  }

  const state = loadState();
  const toDistribute = pieces.filter((p) => args.all || args.force || !state.distributed[p.id]);

  console.log(`Distribution run${args.dryRun ? ' (dry-run)' : ''}: ${pieces.length} piece(s) in feed, ${toDistribute.length} new.`);
  if (toDistribute.length === 0) {
    console.log('Everything already distributed. Use --force or --all to re-run.');
    return;
  }

  let hadError = false;
  for (const piece of toDistribute) {
    console.log(`\n▶ ${piece.title}\n  ${piece.url}`);
    const results = [];
    for (const ch of CHANNELS) {
      let result;
      try {
        result = await ch.run(piece, { dryRun: args.dryRun });
      } catch (e) {
        result = { status: 'error', detail: e.message };
      }
      results.push({ channel: ch.name, ...result });
      const icon = { sent: '✅', drafted: '📝', skipped: '⏭️', error: '❌' }[result.status] || '•';
      console.log(`  ${icon} ${ch.name}: ${result.detail}`);
      if (result.status === 'error') hadError = true;
    }
    // Record success unless this was a dry-run or every channel errored.
    const anySuccess = results.some((r) => r.status === 'sent' || r.status === 'drafted');
    if (!args.dryRun && anySuccess) {
      state.distributed[piece.id] = { at: new Date().toISOString(), channels: results.map((r) => `${r.channel}:${r.status}`) };
    }
  }

  if (!args.dryRun) saveState(state);
  console.log(`\nDone. ${args.dryRun ? '(dry-run — no state written)' : 'State saved to .distribution/state.json'}`);
  // Missing optional credentials are not failures; real send errors are.
  process.exit(hadError ? 1 : 0);
}

main().catch((e) => {
  console.error('Distribution failed:', e.message);
  process.exit(1);
});
