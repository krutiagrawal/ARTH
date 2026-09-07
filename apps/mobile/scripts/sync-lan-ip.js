// Keeps EXPO_PUBLIC_API_URL in .env pointed at this machine's current LAN IP, so switching
// wifi networks or laptops doesn't require manually editing .env before every dev session.
// Runs automatically before `start`/`start:dev-client`/`android`/`ios` (see package.json).
const fs = require('fs');
const os = require('os');
const path = require('path');

const API_PORT = 4000;
const ENV_PATH = path.join(__dirname, '..', '.env');
const ENV_EXAMPLE_PATH = path.join(__dirname, '..', '.env.example');

// Adapter names that are virtual/VPN/tunnel interfaces rather than a real wifi/ethernet link —
// their IPs won't be reachable from a phone on the same physical network.
const IGNORE_NAME_PATTERN = /vmware|virtualbox|hyper-v|vethernet|loopback|tailscale|wsl|vpn|bluetooth|npcap/i;

function findLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (IGNORE_NAME_PATTERN.test(name)) continue;
    for (const addr of addresses ?? []) {
      if (addr.family === 'IPv4' && !addr.internal) {
        candidates.push({ name, address: addr.address });
      }
    }
  }

  // Prefer an adapter that's obviously wifi/ethernet by name (most reliable signal on
  // Windows, where a stray VPN/virtual adapter can otherwise look identical to a real one).
  const preferred = candidates.find((c) => /wi-?fi|wlan|ethernet/i.test(c.name));
  return { chosen: preferred ?? candidates[0], candidates };
}

function main() {
  const { chosen, candidates } = findLanIp();

  if (!chosen) {
    console.warn('[sync-lan-ip] No LAN IPv4 address found — leaving .env untouched. Are you connected to a network?');
    return;
  }

  const envPath = fs.existsSync(ENV_PATH) ? ENV_PATH : ENV_EXAMPLE_PATH;
  let contents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const line = `EXPO_PUBLIC_API_URL=http://${chosen.address}:${API_PORT}`;

  contents = contents.includes('EXPO_PUBLIC_API_URL=')
    ? contents.replace(/^EXPO_PUBLIC_API_URL=.*$/m, line)
    : `${line}\n${contents}`;

  fs.writeFileSync(ENV_PATH, contents);
  console.log(`[sync-lan-ip] EXPO_PUBLIC_API_URL -> http://${chosen.address}:${API_PORT} (adapter: ${chosen.name})`);

  if (candidates.length > 1) {
    console.log('[sync-lan-ip] Other candidates found (edit .env manually if the wrong one was picked):');
    for (const c of candidates) {
      if (c !== chosen) console.log(`  - ${c.name}: ${c.address}`);
    }
  }
}

main();
