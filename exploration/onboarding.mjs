// Parcours « nouveau joueur » sur un compte de test dédié à l'audit.
//
// Objectifs : capturer l'onboarding réel (modales d'introduction, patch notes),
// les états vides (collection, équipe, inventaire, historiques), les états
// verrouillés (Spin sans starter, échanges < 120 cartes, ligue sans badges),
// et l'animation complète de la roulette (le compte principal n'a plus assez
// de coins ni de quotas quotidiens disponibles).
//
// Le compte de test s'appelle POKEROULETTE_TEST_USERNAME et utilise un alias
// e-mail du propriétaire (+audit) — clairement identifiable comme compte d'audit.

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS_DIR = path.join(ROOT, 'artifacts', 'screenshots');
const NET_DIR = path.join(ROOT, 'artifacts', 'network');

const BASE = process.env.POKEROULETTE_BASE_URL;
const USERNAME = process.env.POKEROULETTE_TEST_USERNAME;
const EMAIL = process.env.POKEROULETTE_TEST_EMAIL;
const PASSWORD = process.env.POKEROULETTE_TEST_PASSWORD;
if (!BASE || !USERNAME || !EMAIL || !PASSWORD) {
  console.error('Variables POKEROULETTE_TEST_* manquantes.');
  process.exit(1);
}

const manifestPath = path.join(SHOTS_DIR, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const apiLogPath = path.join(NET_DIR, 'api-log-onboarding.json');
const apiLog = [];

const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const redact = (s) => typeof s === 'string'
  ? s.replaceAll(/"token"\s*:\s*"[^"]+"/g, '"token":"[REDACTED]"').replaceAll(JWT_RE, '[REDACTED_JWT]').replaceAll(PASSWORD, '[REDACTED]').replaceAll(EMAIL, '[TEST_EMAIL]')
  : s;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let shotCount = 0;

async function shot(page, cat, name, meta = {}) {
  const dir = path.join(SHOTS_DIR, cat);
  fs.mkdirSync(dir, { recursive: true });
  try {
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: meta.fullPage ?? false, timeout: 15000 });
    shotCount++;
    manifest.push({
      file: `${cat}/${name}.png`,
      route: meta.route ?? page.url().replace(BASE + '/', ''),
      viewport: `${page.viewportSize()?.width}x${page.viewportSize()?.height}`,
      state: meta.state ?? '',
      action: meta.action ?? '',
      notes: meta.notes ?? 'compte de test (nouveau joueur)',
    });
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`  📸 ${cat}/${name}.png`);
  } catch (e) {
    console.log(`  ⚠️ ${name}: ${e.message.split('\n')[0]}`);
  }
}

async function gotoHash(page, hash, settle = 1200) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await sleep(settle);
}

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  proxy: { server: 'http://127.0.0.1:4400' },
  args: ['--ignore-certificate-errors', '--no-sandbox'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
const page = await context.newPage();
page.on('response', async (resp) => {
  if (!resp.url().includes('/api/')) return;
  let body = null;
  try { if ((resp.headers()['content-type'] ?? '').includes('json')) body = (await resp.text()).slice(0, 4000); } catch {}
  apiLog.push({ method: resp.request().method(), url: redact(resp.url().replace(BASE, '')), status: resp.status(), responseBody: redact(body) });
});

// ── 1. Inscription ───────────────────────────────────────────────────────────
console.log('▶ Inscription du compte de test');
await gotoHash(page, '#register');

// Erreur de validation (mot de passe trop court)
await page.fill('input[name="username"]', USERNAME);
await page.fill('input[name="email"]', EMAIL);
await page.fill('input[name="password"]', 'court');
await page.click('button[type="submit"]');
await sleep(800);
await shot(page, 'errors', 'register-password-too-short', { route: '#register', state: 'validation navigateur : mot de passe < 8 caractères', action: 'soumission invalide' });

await page.fill('input[name="password"]', PASSWORD);
await page.click('button[type="submit"]');
await page.waitForFunction(() => location.hash === '#home', { timeout: 20000 }).catch(() => {});
await sleep(2000);

let hash = await page.evaluate(() => location.hash);
if (hash !== '#home') {
  // Compte déjà existant (relance du script) → connexion
  console.log('  compte déjà créé, connexion…');
  await gotoHash(page, '#login');
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.hash === '#home', { timeout: 20000 }).catch(() => {});
  await sleep(2000);
}

const me = await page.evaluate(async () => {
  const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('gacha_token')}` } });
  return r.json();
}).catch(() => null);
console.log(`  ✅ compte de test connecté — coins: ${me?.user?.coins}`);

// Modale patch notes éventuelle à la première visite
const pnVisible = await page.locator('.modal-overlay, .replay-overlay, .pn-overlay').first().isVisible().catch(() => false);
if (pnVisible) {
  await shot(page, 'onboarding', 'first-visit-patchnotes-modal', { route: '#home', state: 'modale patch notes affichée à la première connexion' });
  await page.keyboard.press('Escape').catch(() => {});
  await page.locator('button:has-text("Fermer"), button:has-text("OK"), .pn-close, .modal-btn').first().click().catch(() => {});
  await sleep(600);
}

await shot(page, 'onboarding', 'first-visit-home', { route: '#home', state: 'home juste après inscription (solde initial, roulette)' });

// ── 2. États vides ───────────────────────────────────────────────────────────
console.log('▶ États vides');
await gotoHash(page, '#collection', 1500);
await shot(page, 'empty-states', 'collection-empty', { route: '#collection', state: 'collection vide — toutes les cartes en « ??? », compteur 0/N' });
await shot(page, 'empty-states', 'collection-empty-full', { route: '#collection', state: 'collection vide (pleine page)', fullPage: true });

// Inventaire vide
await page.click('#inv-open-btn').catch(() => {});
await sleep(900);
await shot(page, 'empty-states', 'inventory-empty', { route: '#collection', state: 'inventaire sans aucun objet', action: 'clic sur 🎒 Inventaire' });
await page.mouse.click(10, 400);
await sleep(400);

// Équipe : modale d'introduction + slots vides
await gotoHash(page, '#team', 1500);
const teamIntro = await page.locator('.modal-overlay').isVisible().catch(() => false);
if (teamIntro) {
  await shot(page, 'onboarding', 'team-intro-modal', { route: '#team', state: 'modale d’introduction « Mon équipe » (roulette destructive expliquée)' });
  await page.locator('.modal-btn').first().click().catch(() => {});
  await sleep(500);
}
await shot(page, 'empty-states', 'team-empty', { route: '#team', state: 'équipe vide — 6 slots, 0 badge' });

// Arènes : modale d'introduction + état sans équipe
await gotoHash(page, '#gyms', 1800);
const gymsIntro = await page.locator('.modal-overlay').isVisible().catch(() => false);
if (gymsIntro) {
  await shot(page, 'onboarding', 'gyms-intro-modal', { route: '#gyms', state: 'modale d’introduction des arènes (première visite, 0 badge)' });
  await page.locator('.modal-btn').first().click().catch(() => {});
  await sleep(500);
}
await shot(page, 'gyms', 'gyms-first-gym-no-team', { route: '#gyms', state: 'première arène, joueur sans équipe (estimation 0 % ?)' });

// Spin verrouillé (aucun Pokémon de base)
await gotoHash(page, '#spin', 1500);
await shot(page, 'empty-states', 'spin-locked-no-starter', { route: '#spin', state: 'Spin verrouillé — aucun Pokémon de base dans la collection' });

// Échanges verrouillés (< 120 cartes uniques)
await gotoHash(page, '#trades', 1500);
await shot(page, 'empty-states', 'trades-locked-progress', { route: '#trades', state: 'échanges verrouillés — progression 0/120 cartes standards uniques' });

// Ligue verrouillée (0 badge)
await gotoHash(page, '#league', 1500);
await shot(page, 'empty-states', 'league-locked-no-badges', { route: '#league', state: 'Ligue des 4 verrouillée sans les 8 badges' });

// Stats d'un compte vierge
await gotoHash(page, '#stats', 2000);
await shot(page, 'empty-states', 'stats-fresh-account', { route: '#stats', state: 'statistiques d’un compte sans historique' });

// ── 3. Tirages roulette ─────────────────────────────────────────────────────
console.log('▶ Tirages roulette (compte de test)');
await gotoHash(page, '#home', 1500);
let coins = me?.user?.coins ?? 0;

if (coins >= 10) {
  await shot(page, 'home', 'roll-before-fresh', { route: '#home', state: `avant premier tirage (solde ${coins} 🪙)` });
  await page.click('#btn-spin');
  await sleep(600);
  await shot(page, 'home', 'roll-during-early', { route: '#home', state: 'défilement rapide (0,6 s après le clic)', action: 'clic sur 🎰 Lancer' });
  await sleep(1600);
  await shot(page, 'home', 'roll-during-mid', { route: '#home', state: 'défilement en décélération (2,2 s)' });
  await sleep(1600);
  await shot(page, 'home', 'roll-during-landing', { route: '#home', state: 'approche de la carte finale (3,8 s)' });
  await sleep(1400);
  await shot(page, 'home', 'roll-result-new-card', { route: '#home', state: 'résultat — première carte (badge « nouvelle découverte » attendu)' });
  coins -= 10;
}

// Tirage en mode masqué (flip de révélation)
if (coins >= 10) {
  await page.click('.reveal-mode-btn[data-mode="hidden"]').catch(() => {});
  await sleep(500);
  await shot(page, 'home', 'roll-hidden-strip', { route: '#home', state: 'bande entièrement masquée (mode « Masquées »)' });
  await page.click('#btn-spin');
  await sleep(4200);
  await shot(page, 'home', 'roll-hidden-flip-reveal', { route: '#home', state: 'flip de révélation des cartes après l’arrêt' });
  await sleep(1300);
  await shot(page, 'home', 'roll-hidden-result', { route: '#home', state: 'résultat en mode masqué' });
  await page.click('.reveal-mode-btn[data-mode="visible"]').catch(() => {});
  coins -= 10;
}

// Multi-roll ×5 si le solde le permet
if (coins >= 50) {
  await page.click('.roll-mode-compact-btn[data-multi="1"]').catch(() => {});
  await sleep(700);
  await shot(page, 'home', 'multi-roll-before', { route: '#home', state: '5 roulettes empilées, bouton série' });
  await page.click('#btn-multi-spin');
  await sleep(2200);
  await shot(page, 'home', 'multi-roll-cascade', { route: '#home', state: 'lancements en cascade (décalage 550 ms)' });
  await sleep(4500);
  await shot(page, 'home', 'multi-roll-finishing', { route: '#home', state: 'dernières roulettes en cours, premiers résultats affichés' });
  await page.waitForSelector('#btn-multi-spin:not([disabled])', { timeout: 40000 }).catch(() => {});
  const choice = await page.locator('.card-choice-overlay').isVisible().catch(() => false);
  if (choice) {
    await shot(page, 'home', 'card-choice-event-modal', { route: '#home', state: 'événement spécial « choix de carte » gauche/droite' });
    await page.locator('.card-choice-item').first().click().catch(() => {});
    await sleep(1000);
  }
  await shot(page, 'home', 'multi-roll-all-results', { route: '#home', state: 'rangée finale des 5 cartes obtenues' });
  await page.click('.roll-mode-compact-btn[data-multi="0"]').catch(() => {});
  coins -= 50;
}

// ── 4. Jackpot quotidien du compte de test ──────────────────────────────────
console.log('▶ Jackpot (compte de test)');
await gotoHash(page, '#slot-machine', 1500);
const canSpin = await page.locator('#spin-btn:not([disabled])').count();
if (canSpin) {
  await shot(page, 'slot-machine', 'slot-fresh-before', { route: '#slot-machine', state: 'jackpot disponible (1 ligne gratuite)' });
  await page.click('#spin-btn');
  await sleep(1200);
  await shot(page, 'slot-machine', 'slot-fresh-spinning', { route: '#slot-machine', state: 'les 3 rouleaux défilent', action: 'clic sur LANCER !' });
  await sleep(1800);
  await shot(page, 'slot-machine', 'slot-fresh-stopping', { route: '#slot-machine', state: 'arrêts décalés (rouleau 1 immobile, 3 en course)' });
  await sleep(3200);
  await shot(page, 'slot-machine', 'slot-fresh-result', { route: '#slot-machine', state: 'résultat du spin gratuit + état du bouton « Revenez demain »' });
}

// ── 5. Collection après tirages (cartes possédées + badge nouveau) ──────────
await gotoHash(page, '#collection', 1600);
await shot(page, 'collection', 'collection-after-first-rolls', { route: '#collection', state: 'collection après les premiers tirages (quelques cartes révélées)' });

// Leaderboard avec contexte du nouveau joueur (dernier rang)
await gotoHash(page, '#leaderboard', 1600);
await shot(page, 'social', 'leaderboard-new-player-context', { route: '#leaderboard', state: 'classement vu par un nouveau joueur (bloc « Votre position » en bas)' });

fs.mkdirSync(NET_DIR, { recursive: true });
fs.writeFileSync(apiLogPath, JSON.stringify(apiLog, null, 2));
await browser.close();
console.log(`\n✅ Onboarding terminé — ${shotCount} captures`);
