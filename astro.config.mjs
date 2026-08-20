// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Site + base power SEO (canonical URLs, sitemap) and correct links on GitHub Pages.
// GitHub Pages project site is served at:  https://paulorwm.github.io/content-platform
// If you later attach a custom domain, set `site` to it and clear `base` (set to '/').
export default defineConfig({
  site: 'https://paulorwm.github.io',
  base: '/content-platform',
  trailingSlash: 'ignore',
  integrations: [
    // Keep the drafts-preview route out of the public sitemap.
    sitemap({ filter: (page) => !page.includes('/drafts') }),
  ],
});
