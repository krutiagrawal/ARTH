// Fails the build when `npm audit` reports a NEW high/critical vulnerability in production dependencies.
// Known ones that need a major-version upgrade are listed in .github/audit-baseline.json with a reason;
// when one is fixed, delete it from that file so it can't silently come back.
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const baseline = JSON.parse(readFileSync(new URL('../audit-baseline.json', import.meta.url), 'utf8'));
const accepted = new Set(Object.keys(baseline.accepted));

let raw;
try {
  raw = execSync('npm audit --omit=dev --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
} catch (err) {
  // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
  raw = err.stdout;
}

const report = JSON.parse(raw);
const serious = Object.values(report.vulnerabilities ?? {}).filter((v) => ['high', 'critical'].includes(v.severity));
const fresh = serious.filter((v) => !accepted.has(v.name));
const fixedButListed = [...accepted].filter((name) => !serious.some((v) => v.name === name));

console.log(`High/critical vulnerabilities: ${serious.length} (${serious.length - fresh.length} already accepted)`);
for (const name of fixedButListed) console.log(`::notice::${name} is no longer vulnerable - remove it from .github/audit-baseline.json`);

if (fresh.length > 0) {
  for (const v of fresh) console.log(`::error::New ${v.severity} vulnerability in "${v.name}" (${v.range}). Run: npm audit --omit=dev`);
  process.exit(1);
}
