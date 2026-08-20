// One-command publish: builds the site and pushes the static output to the
// `gh-pages` branch, which GitHub Pages then serves. Cross-platform (Win/mac/Linux).
//
// Usage:  npm run deploy
//
// This is the INTERIM publish path while GitHub Actions is unavailable
// (the account is billing-locked). Once Actions is restored, the workflow in
// .github/workflows/deploy.yml publishes automatically on every push to main
// and you no longer need to run this by hand.
import { execSync } from 'node:child_process';
import { writeFileSync, rmSync, existsSync } from 'node:fs';

const DIST = 'dist';
const sh = (cmd, cwd) => execSync(cmd, { stdio: 'inherit', cwd });
const out = (cmd, cwd) => execSync(cmd, { encoding: 'utf8', cwd }).trim();

console.log('▶ Building site...');
sh('npm run build');

// Tell GitHub Pages not to run Jekyll over our already-built output.
writeFileSync(`${DIST}/.nojekyll`, '');

const remote = out('git config --get remote.origin.url');
const rev = out('git rev-parse --short HEAD');

console.log('▶ Publishing dist/ to gh-pages...');
if (existsSync(`${DIST}/.git`)) rmSync(`${DIST}/.git`, { recursive: true, force: true });
sh('git init -q -b gh-pages', DIST);
sh('git add -A', DIST);
sh(`git -c user.name=deploy -c user.email=deploy@local commit -q -m "Deploy site (built from main @ ${rev})"`, DIST);
sh(`git push -f ${remote} HEAD:gh-pages`, DIST);
rmSync(`${DIST}/.git`, { recursive: true, force: true });

console.log('\n✔ Pushed to gh-pages. GitHub Pages will publish within ~1 minute at:');
console.log('  https://paulorwm.github.io/content-platform/');
