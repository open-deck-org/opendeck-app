// Dev server for the web/PWA path: serves the shell and the deck runtime on TWO
// distinct origins so a deck is cross-origin to the shell (docs/DECISIONS.md D22).
//
//   shell        -> http://localhost:5173   (www/)
//   deck runtime -> http://localhost:5174   (www-deck/)   <- B, its own origin
//
// localhost:5173 and :5174 are different origins (port differs), which is all we
// need for SOP isolation in dev. In prod, host www-deck/ on a `decks.` subdomain
// and point the shell at it via <meta name="opendeck-deck-origin">.

import { spawn } from 'node:child_process';

const targets = [
  { dir: 'www', port: 5173, label: 'shell' },
  { dir: 'www-deck', port: 5174, label: 'deck-runtime' },
];

const children = targets.map(({ dir, port, label }) => {
  // `serve` sends permissive CORS + no-cache; fine for local dev.
  const child = spawn('npx', ['--yes', 'serve', dir, '-l', String(port), '--no-clipboard'], {
    stdio: 'inherit',
    env: process.env,
  });
  console.log(`[dev] ${label}: http://localhost:${port}  (${dir}/)`);
  return child;
});

const stop = () => { for (const c of children) c.kill('SIGTERM'); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const c of children) {
  c.on('exit', (code) => { if (code) { console.error('[dev] a server exited; shutting down'); stop(); } });
}
