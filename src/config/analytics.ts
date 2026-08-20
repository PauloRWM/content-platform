// Analytics configuration — privacy-first, cookieless, one value to fill in.
//
// This is the ONLY file you edit to turn analytics on. Paste the single value
// your provider gives you and deploy — every page starts reporting automatically
// (the snippet lives in the shared layout, so new content needs no tagging).
//
// None of these values are secrets: they appear in the page source of every
// visitor's browser, so it is safe to commit them here.
//
// How to get a value (pick ONE provider — see ANALYTICS.md for the walkthrough):
//   • Cloudflare Web Analytics (recommended) → paste the beacon "token".
//   • GoatCounter                            → paste your site "code" (the
//                                              subdomain you chose at signup).
//
// Leave both blank to keep analytics OFF (a safe no-op — nothing is injected).

export type AnalyticsProvider = 'cloudflare' | 'goatcounter' | 'none';

// ── Fill in exactly one of these ────────────────────────────────────────────
// Paste directly here (easiest — works when editing on GitHub in the browser)…
const CLOUDFLARE_TOKEN_FROM_FILE = ''; // e.g. 'a1b2c3d4e5f6...'
const GOATCOUNTER_CODE_FROM_FILE = ''; // e.g. 'paulotestes'

// …or supply it via an environment variable at build time (handy for CI / staging).
const cloudflareToken =
  CLOUDFLARE_TOKEN_FROM_FILE || (import.meta.env.PUBLIC_CF_BEACON_TOKEN ?? '').trim();
const goatCounterCode =
  GOATCOUNTER_CODE_FROM_FILE || (import.meta.env.PUBLIC_GOATCOUNTER_CODE ?? '').trim();

// Provider is auto-selected from whichever value is set. Cloudflare wins if both
// are filled. If neither is set, analytics stays off.
const provider: AnalyticsProvider = cloudflareToken
  ? 'cloudflare'
  : goatCounterCode
    ? 'goatcounter'
    : 'none';

export const analytics = { provider, cloudflareToken, goatCounterCode };
export const analyticsEnabled = provider !== 'none';
