// Exploration Playwright de PokeRoulette (production) — audit avant refonte.
//
// Prérequis :
//   - tls-bridge.mjs lancé sur 127.0.0.1:4400 (cf. README de ce dossier)
//   - variables d'env : POKEROULETTE_BASE_URL, POKEROULETTE_EMAIL, POKEROULETTE_PASSWORD
//     (chargées via `node --env-file=<fichier> explore.mjs` — jamais commitées)
//
// Sorties :
//   - ../artifacts/screenshots/<categorie>/<nom>.png
//   - ../artifacts/screenshots/manifest.json   (méta de chaque capture)
//   - ../artifacts/network/api-log.json        (requêtes API redactées)
//   - ../artifacts/network/websocket-log.json  (frames WS redactées)
//
// Règles de conduite : interactions normales d'un joueur uniquement.
// Aucune action destructive (roulette d'équipe, vente, retrait d'équipe),
// aucune action à quota hebdomadaire (combat d'arène, ligue), aucune
// création visible par d'autres joueurs (trade, message de chat, suggestion).

import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS_DIR = path.join(ROOT, 'artifacts', 'screenshots');
const NET_DIR = path.join(ROOT, 'artifacts', 'network');

const BASE = process.env.POKEROULETTE_BASE_URL;
const EMAIL = process.env.POKEROULETTE_EMAIL;
const PASSWORD = process.env.POKEROULETTE_PASSWORD;
if (!BASE || !EMAIL || !PASSWORD) {
  console.error('Variables POKEROULETTE_* manquantes (utiliser --env-file).');
  process.exit(1);
}

const VIEWPORTS = {
  'mobile-compact': { width: 375, height: 812 },
  'mobile-large': { width: 430, height: 932 },
  'tablet': { width: 768, height: 1024 },
  'desktop': { width: 1440, height: 900 },
  'desktop-xl': { width: 1920, height: 1080 },
};

const ROUTES = [
  { hash: '#home', cat: 'home', name: 'home' },
  { hash: '#collection', cat: 'collection', name: 'collection' },
  { hash: '#rules', cat: 'misc', name: 'rules' },
  { hash: '#leaderboard', cat: 'social', name: 'leaderboard' },
  { hash: '#team', cat: 'team', name: 'team' },
  { hash: '#gyms', cat: 'gyms', name: 'gyms' },
  { hash: '#stats', cat: 'stats', name: 'stats' },
  { hash: '#slot-machine', cat: 'slot-machine', name: 'slot-machine' },
  { hash: '#tournament', cat: 'tournament', name: 'tournament' },
  { hash: '#patchnotes', cat: 'misc', name: 'patchnotes' },
  { hash: '#spin', cat: 'spin', name: 'spin' },
  { hash: '#suggestions', cat: 'social', name: 'suggestions' },
  { hash: '#chat', cat: 'social', name: 'chat' },
  { hash: '#league', cat: 'league', name: 'league' },
  { hash: '#trades', cat: 'trades', name: 'trades' },
];

// ─── Manifest & logs ─────────────────────────────────────────────────────────

// Manifest cumulatif entre les exécutions (chaque run ajoute ses captures)
const manifestPath = path.join(SHOTS_DIR, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
const apiLog = [];
const wsLog = [];

function saveManifest() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  // Dédoublonne par fichier (la dernière capture d'un même nom gagne)
  const byFile = new Map(manifest.map((e) => [e.file, e]));
  fs.writeFileSync(manifestPath, JSON.stringify([...byFile.values()], null, 2));
}
function saveNetLogs() {
  fs.mkdirSync(NET_DIR, { recursive: true });
  fs.writeFileSync(path.join(NET_DIR, 'api-log.json'), JSON.stringify(apiLog, null, 2));
  fs.writeFileSync(path.join(NET_DIR, 'websocket-log.json'), JSON.stringify(wsLog, null, 2));
}

const TOKEN_RE = /"token"\s*:\s*"[^"]+"/g;
const JWT_RE = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
function redact(str) {
  if (typeof str !== 'string') return str;
  return str
    .replaceAll(TOKEN_RE, '"token":"[REDACTED]"')
    .replaceAll(JWT_RE, '[REDACTED_JWT]')
    .replaceAll(PASSWORD, '[REDACTED]')
    .replaceAll(EMAIL, '[EMAIL]');
}

function attachNetworkRecorder(page, label) {
  page.on('response', async (resp) => {
    const url = resp.url();
    if (!url.includes('/api/')) return;
    const req = resp.request();
    let reqBody = null;
    try { reqBody = req.postData() ?? null; } catch { /* binaire */ }
    let respBody = null;
    try {
      const ct = resp.headers()['content-type'] ?? '';
      if (ct.includes('json')) {
        respBody = await resp.text();
        if (respBody.length > 6000) respBody = respBody.slice(0, 6000) + `…[tronqué, ${respBody.length} car.]`;
      }
    } catch { /* stream fermé */ }
    apiLog.push({
      ts: new Date().toISOString(),
      page: label,
      method: req.method(),
      url: redact(url.replace(BASE, '')),
      status: resp.status(),
      requestBody: redact(reqBody),
      responseBody: redact(respBody),
    });
  });
  page.on('websocket', (ws) => {
    const entry = { ts: new Date().toISOString(), url: redact(ws.url()), framesSent: [], framesReceived: [] };
    wsLog.push(entry);
    ws.on('framesent', (f) => { if (entry.framesSent.length < 20) entry.framesSent.push(redact(String(f.payload).slice(0, 500))); });
    ws.on('framereceived', (f) => { if (entry.framesReceived.length < 30) entry.framesReceived.push(redact(String(f.payload).slice(0, 500))); });
  });
}

let shotCount = 0;
async function shot(page, cat, name, meta = {}) {
  const dir = path.join(SHOTS_DIR, cat);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}.png`);
  try {
    await page.screenshot({ path: file, fullPage: meta.fullPage ?? false, timeout: 15000 });
    shotCount++;
    manifest.push({
      file: `${cat}/${name}.png`,
      route: meta.route ?? page.url().replace(BASE + '/', ''),
      viewport: meta.viewport ?? `${page.viewportSize()?.width}x${page.viewportSize()?.height}`,
      state: meta.state ?? '',
      action: meta.action ?? '',
      notes: meta.notes ?? '',
    });
    saveManifest();
    console.log(`  📸 ${cat}/${name}.png`);
  } catch (e) {
    console.log(`  ⚠️ screenshot raté ${cat}/${name}: ${e.message.split('\n')[0]}`);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gotoHash(page, hash, settle = 900) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await sleep(settle);
}

// ─── Lancement navigateur ────────────────────────────────────────────────────

async function launch() {
  return chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    proxy: { server: 'http://127.0.0.1:4400' },
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });
}

async function newPage(browser, viewportName, { authed = true, label = '' } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORTS[viewportName],
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  });
  const page = await context.newPage();
  attachNetworkRecorder(page, label || viewportName);
  if (authed && authToken) {
    await page.addInitScript((token) => {
      localStorage.setItem('gacha_token', token);
      // Neutralise les modales d'intro pour les captures « standard »
      localStorage.setItem('tourn_intro_seen', '1');
      localStorage.setItem('gacha_gyms_intro_seen', '1');
      localStorage.setItem('gacha_team_intro_seen', '1');
      localStorage.setItem('pn_last_seen_version', '9.9.9');
      localStorage.setItem('patchnotes_seen_version', '9.9.9');
    }, authToken);
  }
  return { context, page };
}

let authToken = null;
let userInfo = null;

// ─── Phase 1 : authentification ──────────────────────────────────────────────

async function phaseAuth(browser) {
  console.log('▶ Phase 1 — Authentification');
  // Écrans publics, toutes résolutions
  for (const [vpName] of Object.entries(VIEWPORTS)) {
    const { context, page } = await newPage(browser, vpName, { authed: false, label: `auth-${vpName}` });
    await gotoHash(page, '#login');
    await shot(page, 'authentication', `login-${vpName}`, { route: '#login', state: 'formulaire vide', action: 'arrivée directe' });
    if (vpName === 'desktop' || vpName === 'mobile-compact') {
      await gotoHash(page, '#register');
      await shot(page, 'authentication', `register-${vpName}`, { route: '#register', state: 'formulaire vide' });
      await gotoHash(page, '#forgot-password');
      await shot(page, 'authentication', `forgot-password-${vpName}`, { route: '#forgot-password', state: 'formulaire vide' });
      await gotoHash(page, '#rules');
      await shot(page, 'authentication', `rules-public-${vpName}`, { route: '#rules', state: 'guide accessible sans connexion' });
    }
    await context.close();
  }

  // Erreur de connexion (mauvais mot de passe)
  {
    const { context, page } = await newPage(browser, 'desktop', { authed: false, label: 'auth-error' });
    await gotoHash(page, '#login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', 'mauvais-mot-de-passe');
    await page.click('button[type="submit"]');
    await sleep(1500);
    await shot(page, 'errors', 'login-wrong-password-desktop', { route: '#login', state: 'erreur identifiants invalides', action: 'soumission mauvais mot de passe' });
    await context.close();
  }

  // Connexion réelle → récupère le token pour les autres contextes
  {
    const { context, page } = await newPage(browser, 'desktop', { authed: false, label: 'auth-login' });
    await gotoHash(page, '#login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => location.hash === '#home', { timeout: 20000 }).catch(() => {});
    await sleep(2500);
    authToken = await page.evaluate(() => localStorage.getItem('gacha_token'));
    if (!authToken) throw new Error('Échec de connexion — pas de token');
    userInfo = await page.evaluate(async () => {
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('gacha_token')}` } });
      return r.json();
    });
    console.log(`  ✅ connecté — ${userInfo?.user?.username}, ${userInfo?.user?.coins} coins`);
    await shot(page, 'authentication', 'login-success-redirect-home', { route: '#home', state: 'connexion réussie, arrivée sur la roulette', action: 'soumission identifiants valides' });
    await context.close();
  }
}

// ─── Phase 2 : tour statique de toutes les routes × résolutions ──────────────

async function phaseStaticTour(browser) {
  console.log('▶ Phase 2 — Tour statique des routes');
  for (const [vpName] of Object.entries(VIEWPORTS)) {
    const { context, page } = await newPage(browser, vpName, { label: `tour-${vpName}` });
    for (const r of ROUTES) {
      await gotoHash(page, r.hash, 1400);
      await shot(page, r.cat, `${r.name}-${vpName}`, { route: r.hash, state: 'état par défaut après chargement' });
      // Version pleine page sur desktop pour les pages longues
      if (vpName === 'desktop') {
        await shot(page, r.cat, `${r.name}-desktop-fullpage`, { route: r.hash, state: 'page complète (scroll)', fullPage: true });
      }
    }
    await context.close();
  }
}

// ─── Phase 3 : interactions Home / roulette ──────────────────────────────────

async function phaseHome(browser) {
  console.log('▶ Phase 3 — Home & roulette');
  const { context, page } = await newPage(browser, 'desktop', { label: 'home-desktop' });
  await gotoHash(page, '#home', 1500);

  // Solde à jour (l'entraînement/jackpot ont pu créditer des coins depuis le login)
  const freshCoins = await page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('gacha_token')}` } });
    return (await r.json())?.user?.coins ?? 0;
  }).catch(() => 0);
  if (userInfo?.user) userInfo.user.coins = freshCoins;
  console.log(`  💰 solde actuel : ${freshCoins} coins`);

  // Modes de révélation
  for (const mode of ['smart', 'hidden', 'visible']) {
    await page.click(`.reveal-mode-btn[data-mode="${mode}"]`).catch(() => {});
    await sleep(600);
    await shot(page, 'home', `home-reveal-mode-${mode}`, { route: '#home', state: `mode de révélation « ${mode} »`, action: 'clic sur le sélecteur de mode' });
  }

  // Accordéon biomes
  await page.click('#biome-toggle').catch(() => {});
  await sleep(500);
  await shot(page, 'home', 'home-biome-panel-open', { route: '#home', state: 'panneau des biomes ouvert', action: 'clic sur « Filtrer par biome »' });
  await page.click('.biome-btn[data-biome="Forêt"]').catch(() => {});
  await sleep(700);
  await shot(page, 'home', 'home-biome-foret-selected', { route: '#home', state: 'biome Forêt sélectionné, coût mis à jour', action: 'clic sur le biome Forêt' });
  // Retour à « Tous »
  await page.click('#biome-toggle').catch(() => {});
  await sleep(300);
  await page.click('.biome-btn[data-biome=""]').catch(() => {});
  await sleep(500);

  // Mode multi
  await page.click('.roll-mode-compact-btn[data-multi="1"]').catch(() => {});
  await sleep(600);
  await shot(page, 'home', 'home-multi-roll-mode', { route: '#home', state: 'mode multi-roll ×5 activé', action: 'clic sur 🎰 x5' });
  await page.click('.roll-mode-compact-btn[data-multi="0"]').catch(() => {});
  await sleep(400);

  // Modale inventaire
  await page.click('#home-inventory-btn').catch(() => {});
  await sleep(900);
  await shot(page, 'home', 'home-inventory-modal', { route: '#home', state: 'modale inventaire ouverte (charme/tickets ou vide)', action: 'clic sur 🎒 Inventaire' });
  await page.keyboard.press('Escape').catch(() => {});
  await page.click('.inv-close-btn, .modal-btn.btn-cancel', { timeout: 2000 }).catch(() => {});
  await page.mouse.click(10, 300); // clic overlay
  await sleep(400);

  // Modale avatar
  await page.click('#avatar-btn').catch(() => {});
  await sleep(1200);
  await shot(page, 'home', 'home-avatar-modal-standard', { route: '#home', state: 'sélecteur d’avatar, onglet Standards', action: 'clic sur l’avatar' });
  await page.click('.avatar-tab[data-tab="shiny"]').catch(() => {});
  await sleep(600);
  await shot(page, 'home', 'home-avatar-modal-shiny', { route: '#home', state: 'sélecteur d’avatar, onglet Shiny (souvent vide)', action: 'clic sur l’onglet Shiny' });
  await page.click('#avatar-cancel').catch(() => {});
  await sleep(400);

  // Roll solo — avant / pendant / après
  const coins = userInfo?.user?.coins ?? 0;
  if (coins >= 10) {
    await shot(page, 'home', 'roll-before-desktop', { route: '#home', state: 'avant tirage — bouton Lancer visible', action: '' });
    await page.click('#btn-spin').catch(() => {});
    await sleep(1500);
    await shot(page, 'home', 'roll-during-desktop', { route: '#home', state: 'bande en défilement (2s après le clic)', action: 'clic sur 🎰 Lancer' });
    await sleep(3600); // fin d'animation (4s) + reveal
    await shot(page, 'home', 'roll-result-desktop', { route: '#home', state: 'résultat du tirage affiché sous la roulette', action: 'fin de l’animation' });
  } else {
    console.log('  ⚠️ coins insuffisants pour un roll solo');
  }

  // Roll en mode masqué (révélation flip) si budget
  if (coins >= 20) {
    await page.click('.reveal-mode-btn[data-mode="hidden"]').catch(() => {});
    await sleep(500);
    await page.click('#btn-spin').catch(() => {});
    await sleep(4300);
    await shot(page, 'home', 'roll-hidden-reveal-desktop', { route: '#home', state: 'révélation des cartes masquées (flip) après le spin', action: 'tirage en mode Masquées' });
    await sleep(1500);
    await page.click('.reveal-mode-btn[data-mode="visible"]').catch(() => {});
  }

  // Multi-roll si budget confortable
  if (coins >= 100) {
    await page.click('.roll-mode-compact-btn[data-multi="1"]').catch(() => {});
    await sleep(700);
    await page.click('#btn-multi-spin').catch(() => {});
    await sleep(2500);
    await shot(page, 'home', 'multi-roll-during-desktop', { route: '#home', state: '5 roulettes lancées en cascade', action: 'clic sur Lancer 5 fois' });
    await sleep(5500);
    await shot(page, 'home', 'multi-roll-results-desktop', { route: '#home', state: 'rangée des 5 résultats alignés', action: 'fin de la série' });
    // Attendre la fin complète (bouton réactivé) — un choix de carte peut être en attente
    await page.waitForSelector('#btn-multi-spin:not([disabled])', { timeout: 30000 }).catch(() => {});
    const choiceVisible = await page.locator('.card-choice-overlay').isVisible().catch(() => false);
    if (choiceVisible) {
      await shot(page, 'home', 'multi-roll-card-choice-modal', { route: '#home', state: 'événement spécial : choix entre 2 cartes', action: 'événement card_choice pendant la série' });
      await page.locator('.card-choice-item').first().click().catch(() => {});
      await sleep(1200);
      await shot(page, 'home', 'multi-roll-card-choice-result', { route: '#home', state: 'carte choisie ajoutée au résultat', action: 'clic sur la carte de gauche' });
    }
    await page.click('.roll-mode-compact-btn[data-multi="0"]').catch(() => {});
  }

  await context.close();

  // Même parcours clé sur mobile
  const m = await newPage(browser, 'mobile-compact', { label: 'home-mobile' });
  await gotoHash(m.page, '#home', 1500);
  await shot(m.page, 'home', 'roll-before-mobile', { route: '#home', state: 'avant tirage (mobile)' });
  const coinsNow = await m.page.evaluate(async () => {
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('gacha_token')}` } });
    return (await r.json())?.user?.coins ?? 0;
  }).catch(() => 0);
  if (coinsNow >= 10) {
    await m.page.click('#btn-spin').catch(() => {});
    await sleep(1500);
    await shot(m.page, 'home', 'roll-during-mobile', { route: '#home', state: 'bande en défilement (mobile)', action: 'clic sur 🎰 Lancer' });
    await sleep(3600);
    await shot(m.page, 'home', 'roll-result-mobile', { route: '#home', state: 'résultat du tirage (mobile)' });
  }
  // Menu hamburger
  await m.page.click('.nav-hamburger').catch(() => {});
  await sleep(500);
  await shot(m.page, 'responsive', 'nav-hamburger-open-mobile', { route: '#home', state: 'menu hamburger ouvert', action: 'clic sur ☰' });
  await m.page.click('.nav-dropdown-btn >> nth=0').catch(() => {});
  await sleep(400);
  await shot(m.page, 'responsive', 'nav-hamburger-dropdown-mobile', { route: '#home', state: 'sous-menu « Jeux » déplié dans le menu mobile', action: 'clic sur Jeux' });
  await m.context.close();
}

// ─── Phase 4 : collection ────────────────────────────────────────────────────

async function phaseCollection(browser) {
  console.log('▶ Phase 4 — Collection');
  const { context, page } = await newPage(browser, 'desktop', { label: 'collection' });
  await gotoHash(page, '#collection', 1600);

  await page.click('#filters-toggle').catch(() => {});
  await sleep(500);
  await shot(page, 'collection', 'collection-filters-open', { route: '#collection', state: 'filtres biome/type/tri dépliés', action: 'clic sur Filtres' });

  await page.click('.biome-filter-btn[data-biome="Forêt"]').catch(() => {});
  await sleep(600);
  await shot(page, 'collection', 'collection-filter-biome-foret', { route: '#collection', state: 'filtre biome Forêt actif', action: 'clic sur Forêt' });

  await page.click('.type-filter-btn[data-poketype="Feu"]').catch(() => {});
  await sleep(600);
  await shot(page, 'collection', 'collection-filter-biome-type-combo', { route: '#collection', state: 'combinaison Forêt + Feu (peut être vide)', action: 'ajout du filtre type Feu' });

  await page.click('.biome-filter-btn[data-biome=""]').catch(() => {});
  await page.click('.type-filter-btn[data-poketype=""]').catch(() => {});
  await sleep(400);

  // Onglet Shiny
  await page.click('.filter-btn[data-type="alternative"]').catch(() => {});
  await sleep(700);
  await shot(page, 'collection', 'collection-shiny-tab', { route: '#collection', state: 'onglet Shiny (cartes masquées « ??? » si non possédées)', action: 'clic sur ✨ Shiny' });
  await page.click('.filter-btn[data-type="standard"]').catch(() => {});
  await sleep(500);

  // Tri par quantité
  await page.click('#sort-qty-btn').catch(() => {});
  await sleep(500);
  await shot(page, 'collection', 'collection-sort-by-qty', { route: '#collection', state: 'tri par quantité décroissante', action: 'clic sur Trier par quantité' });
  await page.click('#sort-qty-btn').catch(() => {});

  // Modale de vente (ouverte puis annulée — aucune vente réelle)
  const sellBtn = page.locator('.sell-btn').first();
  if (await sellBtn.count()) {
    await sellBtn.click().catch(() => {});
    await sleep(600);
    await shot(page, 'collection', 'collection-sell-modal', { route: '#collection', state: 'modale de confirmation de vente', action: 'clic sur 💰 d’une carte (annulé ensuite)' });
    await page.click('.btn-cancel').catch(() => {});
    await sleep(300);
  }

  // Survol d'une carte (hover state)
  await page.locator('.card').first().hover().catch(() => {});
  await sleep(400);
  await shot(page, 'collection', 'collection-card-hover', { route: '#collection', state: 'survol d’une carte (actions visibles)', action: 'hover' });

  await context.close();
}

// ─── Phase 5 : jackpot (machine à sous) ──────────────────────────────────────

async function phaseSlotMachine(browser) {
  console.log('▶ Phase 5 — Jackpot');
  const { context, page } = await newPage(browser, 'desktop', { label: 'slot' });
  await gotoHash(page, '#slot-machine', 1500);

  for (const lines of ['2', '3', '1']) {
    await page.click(`.line-btn[data-lines="${lines}"]`).catch(() => {});
    await sleep(400);
    if (lines !== '1') {
      await shot(page, 'slot-machine', `slot-lines-${lines}-selected`, { route: '#slot-machine', state: `sélection ${lines === '2' ? '3 lignes' : '3 lignes + diagonales'}`, action: 'clic sur le sélecteur de lignes' });
    }
  }

  await page.click('#prize-table summary').catch(() => {});
  await sleep(500);
  await shot(page, 'slot-machine', 'slot-prize-table-open', { route: '#slot-machine', state: 'table des récompenses dépliée avec probabilités', action: 'clic sur 📋 Table des récompenses' });

  // Tour gratuit (1 ligne) si disponible — c'est le quota quotidien du compte
  const canSpin = await page.locator('#spin-btn:not([disabled])').count();
  if (canSpin) {
    await shot(page, 'slot-machine', 'slot-before-spin', { route: '#slot-machine', state: 'prêt à lancer (1 ligne gratuite)' });
    await page.click('#spin-btn').catch(() => {});
    await sleep(1800);
    await shot(page, 'slot-machine', 'slot-during-spin', { route: '#slot-machine', state: 'rouleaux en rotation', action: 'clic sur LANCER !' });
    await sleep(1200);
    await shot(page, 'slot-machine', 'slot-reels-stopping', { route: '#slot-machine', state: 'arrêts décalés des rouleaux' });
    await sleep(3500);
    await shot(page, 'slot-machine', 'slot-result', { route: '#slot-machine', state: 'résultat ligne par ligne + solde', action: 'fin du spin quotidien' });
  } else {
    await shot(page, 'slot-machine', 'slot-already-played', { route: '#slot-machine', state: 'quota quotidien épuisé — bouton « Revenez demain »' });
  }

  await context.close();
}

// ─── Phase 6 : arènes & entraînement ─────────────────────────────────────────

async function phaseGyms(browser) {
  console.log('▶ Phase 6 — Arènes & entraînement');
  const { context, page } = await newPage(browser, 'desktop', { label: 'gyms' });
  await gotoHash(page, '#gyms', 1800);

  const estimateDetails = page.locator('.win-estimate__details summary');
  if (await estimateDetails.count()) {
    await estimateDetails.click().catch(() => {});
    await sleep(500);
    await shot(page, 'gyms', 'gyms-estimate-matchups-open', { route: '#gyms', state: 'détail des matchups positionnels déplié', action: 'clic sur « Voir les matchups »' });
  }

  // Entraînement quotidien (1/jour, gratuit, +2% de bonus en cas de victoire)
  const trainingBtn = page.locator('#training-battle-btn');
  if (await trainingBtn.count()) {
    await trainingBtn.click().catch(() => {});
    await sleep(1600);
    await shot(page, 'gyms', 'training-duel-gauge-mid', { route: '#gyms', state: 'duel en cours — jauge tachymètre animée', action: 'lancement de l’entraînement quotidien' });
    await sleep(2500);
    await shot(page, 'gyms', 'training-duel-gauge-2', { route: '#gyms', state: 'duel suivant / franchissement du seuil' });
    // attendre la fin (combats ~6 rounds × ~5s max)
    await page.waitForSelector('.training-result', { timeout: 90000 }).catch(() => {});
    await sleep(800);
    await shot(page, 'gyms', 'training-result', { route: '#gyms', state: 'résultat de l’entraînement (victoire/défaite + bonus)', action: 'fin de l’animation' });
    const logDetails = page.locator('.training-log-details summary');
    if (await logDetails.count()) {
      await logDetails.click().catch(() => {});
      await sleep(500);
      await shot(page, 'gyms', 'training-log-open', { route: '#gyms', state: 'détail du combat d’entraînement round par round', action: 'clic sur 📋 Voir le détail' });
    }
  } else {
    await shot(page, 'gyms', 'training-already-done', { route: '#gyms', state: 'entraînement quotidien déjà effectué (bouton désactivé)' });
  }

  // NOTE: le combat d'arène hebdomadaire n'est PAS lancé (quota 1/semaine du compte).
  await context.close();
}

// ─── Phase 7 : équipe ────────────────────────────────────────────────────────

async function phaseTeam(browser) {
  console.log('▶ Phase 7 — Équipe');
  const { context, page } = await newPage(browser, 'desktop', { label: 'team' });
  await gotoHash(page, '#team', 1600);

  // Mode réorganiser (si ≥ 2 membres)
  const reorderBtn = page.locator('.team-reorder-btn');
  if (await reorderBtn.count()) {
    await reorderBtn.click().catch(() => {});
    await sleep(500);
    await shot(page, 'team', 'team-reorder-mode', { route: '#team', state: 'mode réorganisation actif avec bandeau explicatif', action: 'clic sur ↕ Réorganiser' });
    await page.locator('.team-slot--reorder').first().click().catch(() => {});
    await sleep(400);
    await shot(page, 'team', 'team-reorder-first-selected', { route: '#team', state: 'premier Pokémon sélectionné pour l’échange', action: 'clic sur un slot' });
    // On désélectionne (re-clic) puis on quitte le mode — aucun échange effectué
    await page.locator('.team-slot--selected').first().click().catch(() => {});
    await sleep(300);
    await page.locator('.team-reorder-btn').click().catch(() => {});
  }

  // Modale de retrait (ouverte puis annulée)
  const removeBtn = page.locator('.team-slot__remove-btn').first();
  if (await removeBtn.count()) {
    await removeBtn.click().catch(() => {});
    await sleep(600);
    await shot(page, 'team', 'team-remove-confirm-modal', { route: '#team', state: 'confirmation de retrait (−10 🪙, définitif)', action: 'clic sur Retirer (annulé ensuite)' });
    await page.click('.btn-cancel').catch(() => {});
  }

  // Tooltip badge (hover)
  const badgeSlot = page.locator('.badge-slot--obtained').first();
  if (await badgeSlot.count()) {
    await badgeSlot.hover().catch(() => {});
    await sleep(500);
    await shot(page, 'team', 'team-badge-tooltip', { route: '#team', state: 'tooltip du badge (nom + date d’obtention)', action: 'hover sur un badge' });
  }

  // NOTE: la roulette d'équipe n'est PAS lancée (retire définitivement une carte de la collection).
  await context.close();
}

// ─── Phase 8 : tournoi, ligue, échanges ──────────────────────────────────────

async function phaseSocial(browser) {
  console.log('▶ Phase 8 — Tournoi / Ligue / Échanges');

  // Modale d'introduction du tournoi (en nettoyant le flag localStorage)
  {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop, locale: 'fr-FR' });
    const page = await context.newPage();
    attachNetworkRecorder(page, 'tournament-intro');
    await page.addInitScript((token) => {
      localStorage.setItem('gacha_token', token);
      localStorage.removeItem('tourn_intro_seen');
    }, authToken);
    await gotoHash(page, '#tournament', 1500);
    await shot(page, 'tournament', 'tournament-intro-modal', { route: '#tournament', state: 'modale d’introduction (calendrier, mise, gains)', action: 'première visite (flag localStorage nettoyé)' });
    await page.click('#tourn-intro-close').catch(() => {});
    await sleep(800);

    // Historique des tournois
    await page.click('#tourn-history-btn').catch(() => {});
    await sleep(1200);
    await shot(page, 'tournament', 'tournament-history-modal', { route: '#tournament', state: 'liste des tournois passés', action: 'clic sur 📅 Tournois passés' });
    const viewBtn = page.locator('.hist-view-btn').first();
    if (await viewBtn.count()) {
      await viewBtn.click().catch(() => {});
      await sleep(1600);
      await shot(page, 'tournament', 'tournament-past-detail', { route: '#tournament', state: 'détail d’un tournoi passé (podium, bracket, participants)', action: 'clic sur Voir →' });
      await shot(page, 'tournament', 'tournament-past-detail-full', { route: '#tournament', state: 'détail complet (pleine page)', fullPage: true });
      // Replay d'un match si disponible
      const replayBtn = page.locator('.tourn-replay-btn').first();
      if (await replayBtn.count()) {
        await replayBtn.click().catch(() => {});
        await sleep(2500);
        await shot(page, 'tournament', 'tournament-battle-replay', { route: '#tournament', state: 'replay animé d’un combat (jauge + mini-log)', action: 'clic sur ▶ Rejouer' });
        await page.click('.replay-close').catch(() => {});
      }
      const summaryBtn = page.locator('.tourn-summary-btn').first();
      if (await summaryBtn.count()) {
        await summaryBtn.click().catch(() => {});
        await sleep(800);
        await shot(page, 'tournament', 'tournament-match-summary', { route: '#tournament', state: 'résumé d’un match (équipes, K.O., log)', action: 'clic sur 📋 Résumé' });
        await page.click('#summary-close').catch(() => {});
      }
    }
    await context.close();
  }

  // Ligue
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'league' });
    await gotoHash(page, '#league', 1500);
    await shot(page, 'league', 'league-status', { route: '#league', state: 'statut ligue (verrouillée sans les 8 badges / estimation sinon)' });
    await context.close();
  }

  // Échanges
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'trades' });
    await gotoHash(page, '#trades', 1500);
    await shot(page, 'trades', 'trades-page', { route: '#trades', state: 'page échanges (éligibilité, joueurs, demandes)' });
    const player = page.locator('.trades-player:not(.trades-player--disabled)').first();
    if (await player.count()) {
      await player.click().catch(() => {});
      await sleep(1500);
      await shot(page, 'trades', 'trades-card-picker', { route: '#trades', state: 'sélecteur de carte à demander (fermé sans choisir)', action: 'clic sur un joueur' });
      await page.click('.btn-cancel').catch(() => {});
    }
    await context.close();
  }
}

// ─── Phase 9 : chat, notifications, navigation ───────────────────────────────

async function phaseChatAndNav(browser) {
  console.log('▶ Phase 9 — Chat, notifications, navigation');
  const { context, page } = await newPage(browser, 'desktop', { label: 'chat-nav' });
  await gotoHash(page, '#leaderboard', 1500);

  // Widget de chat flottant
  await page.click('#chat-bubble-btn').catch(() => {});
  await sleep(1200);
  await shot(page, 'social', 'chat-widget-open', { route: '#leaderboard', state: 'panneau du widget de chat flottant ouvert', action: 'clic sur la bulle 💬' });
  await page.click('#chat-panel-close').catch(() => {});
  await sleep(300);

  // Cloche notifications
  await page.click('#nav-bell-btn').catch(() => {});
  await sleep(900);
  await shot(page, 'social', 'notifications-dropdown', { route: '#leaderboard', state: 'centre de notifications déplié', action: 'clic sur 🔔' });
  await page.mouse.click(400, 500);
  await sleep(300);

  // Menus déroulants desktop
  const dropdowns = ['Jeux', 'Ma progression', 'Défis', 'Social', 'Infos'];
  for (let i = 0; i < dropdowns.length; i++) {
    const btn = page.locator('.nav-dropdown-btn', { hasText: dropdowns[i] }).first();
    if (await btn.count()) {
      await btn.click().catch(() => {});
      await sleep(350);
      await shot(page, 'misc', `nav-dropdown-${i}-${dropdowns[i].toLowerCase().replaceAll(' ', '-')}`, { route: '#leaderboard', state: `menu « ${dropdowns[i]} » ouvert`, action: 'clic sur le menu' });
    }
  }
  await page.mouse.click(400, 500);

  // Classement des tricheurs
  await page.click('#btn-cheater-board').catch(() => {});
  await sleep(1000);
  await shot(page, 'social', 'leaderboard-cheaters', { route: '#leaderboard', state: 'classement des tricheurs', action: 'clic sur « Voir le classement des tricheurs »' });

  await context.close();

  // Page chat dédiée + envoi désactivé (on n'envoie aucun message)
  const c = await newPage(browser, 'mobile-compact', { label: 'chat-mobile' });
  await gotoHash(c.page, '#chat', 1500);
  await shot(c.page, 'social', 'chat-page-mobile', { route: '#chat', state: 'page chat dédiée (mobile)' });
  await c.context.close();
}

// ─── Phase 10 : stats & spin ─────────────────────────────────────────────────

async function phaseStatsAndSpin(browser) {
  console.log('▶ Phase 10 — Stats & Spin');
  const { context, page } = await newPage(browser, 'desktop', { label: 'stats' });
  await gotoHash(page, '#stats', 2200);

  // Sélecteur de joueur
  const select = page.locator('.stats-section select').first();
  if (await select.count()) {
    const options = await select.locator('option').allTextContents().catch(() => []);
    if (options.length > 1) {
      await select.selectOption({ index: 1 }).catch(() => {});
      await sleep(900);
      await shot(page, 'stats', 'stats-player-selected', { route: '#stats', state: 'statistiques d’un joueur sélectionné', action: 'choix dans le sélecteur de dresseur' });
    }
  }

  // Spin : ouverture de l'overlay du jeu embarqué
  await gotoHash(page, '#spin', 1500);
  await page.click('#spin-launch-btn').catch(() => {});
  await sleep(5000);
  await shot(page, 'spin', 'spin-overlay-iframe', { route: '#spin', state: 'jeu d’aventure Spin embarqué en iframe plein écran', action: 'clic sur 🌀 Lancer l’aventure' });
  await sleep(3000);
  await shot(page, 'spin', 'spin-overlay-iframe-loaded', { route: '#spin', state: 'contenu de l’iframe après chargement' });
  await page.click('#spin-overlay-close').catch(() => {});

  await context.close();
}

// ─── Phase 11 : états d'erreur / chargement / edge cases ─────────────────────

async function phaseEdgeCases(browser) {
  console.log('▶ Phase 11 — Erreurs, chargements, edge cases');

  // État de chargement (réseau ralenti via CDP)
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'loading' });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false, latency: 1200, downloadThroughput: 40000, uploadThroughput: 20000,
    });
    page.goto(`${BASE}/#collection`, { waitUntil: 'commit', timeout: 60000 }).catch(() => {});
    await sleep(3500);
    await shot(page, 'loading', 'collection-loading-slow-network', { route: '#collection', state: 'état de chargement (« Chargement... ») sur réseau lent', action: 'navigation avec réseau throttlé' });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await context.close();
  }

  // Hors ligne après chargement
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'offline' });
    await gotoHash(page, '#home', 1200);
    await context.setOffline(true);
    await page.evaluate(() => { location.hash = '#leaderboard'; });
    await sleep(2500);
    await shot(page, 'errors', 'leaderboard-offline', { route: '#leaderboard', state: 'navigation hors ligne — messages d’erreur', action: 'coupure réseau puis navigation' });
    // Tentative de roll hors ligne
    await page.evaluate(() => { location.hash = '#home'; });
    await sleep(1500);
    await page.click('#btn-spin').catch(() => {});
    await sleep(1500);
    await shot(page, 'errors', 'roll-offline-error', { route: '#home', state: 'échec du tirage hors ligne (message d’erreur roulette)', action: 'clic sur Lancer hors ligne' });
    await context.setOffline(false);
    await context.close();
  }

  // Token invalide (session « expirée »)
  {
    const context = await browser.newContext({ viewport: VIEWPORTS.desktop, locale: 'fr-FR' });
    const page = await context.newPage();
    attachNetworkRecorder(page, 'expired');
    await page.addInitScript(() => {
      localStorage.setItem('gacha_token', 'eyJhbGciOiJIUzI1NiJ9.invalide.invalide');
    });
    await gotoHash(page, '#collection', 2000);
    await shot(page, 'errors', 'invalid-token-collection', { route: '#collection', state: 'comportement avec token invalide (erreur ou redirection)', action: 'token corrompu en localStorage' });
    await gotoHash(page, '#home', 2000);
    await shot(page, 'errors', 'invalid-token-home', { route: '#home', state: 'home avec token invalide → redirection #login attendue' });
    await context.close();
  }

  // Route inconnue
  {
    const { context, page } = await newPage(browser, 'desktop', { label: '404' });
    await gotoHash(page, '#route-inexistante', 1200);
    await shot(page, 'edge-cases', 'unknown-route', { route: '#route-inexistante', state: 'hash inconnu → fallback (page login rendue)', action: 'navigation vers un hash invalide' });
    await context.close();
  }

  // Rafraîchissement en cours de page + navigation arrière
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'refresh' });
    await gotoHash(page, '#gyms', 1500);
    await page.reload({ waitUntil: 'networkidle' }).catch(() => {});
    await sleep(1500);
    await shot(page, 'edge-cases', 'gyms-after-refresh', { route: '#gyms', state: 'état après F5 (persistance de session OK ?)', action: 'rechargement de la page' });
    await gotoHash(page, '#collection', 1200);
    await page.goBack().catch(() => {});
    await sleep(1200);
    await shot(page, 'edge-cases', 'back-navigation', { route: '#gyms', state: 'retour arrière navigateur (#collection → #gyms)', action: 'bouton Précédent' });
    await context.close();
  }

  // Déconnexion
  {
    const { context, page } = await newPage(browser, 'desktop', { label: 'logout' });
    await gotoHash(page, '#home', 1500);
    await page.click('#logout-btn').catch(() => {});
    await sleep(1200);
    await shot(page, 'authentication', 'after-logout', { route: '#login', state: 'retour à la connexion après déconnexion', action: 'clic sur Déconnexion' });
    await context.close();
  }
}

// ─── Orchestration ───────────────────────────────────────────────────────────

const PHASES = {
  auth: phaseAuth,
  tour: phaseStaticTour,
  home: phaseHome,
  collection: phaseCollection,
  slot: phaseSlotMachine,
  gyms: phaseGyms,
  team: phaseTeam,
  social: phaseSocial,
  chatnav: phaseChatAndNav,
  stats: phaseStatsAndSpin,
  edge: phaseEdgeCases,
};

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const toRun = only.length ? only : Object.keys(PHASES);

const browser = await launch();
const t0 = Date.now();
for (const name of toRun) {
  const fn = PHASES[name];
  if (!fn) { console.log(`Phase inconnue: ${name}`); continue; }
  if (name !== 'auth' && !authToken) {
    // Connexion silencieuse si on saute la phase auth
    const { context, page } = await newPage(browser, 'desktop', { authed: false, label: 'silent-login' });
    await gotoHash(page, '#login');
    await page.fill('input[name="email"]', EMAIL);
    await page.fill('input[name="password"]', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => location.hash === '#home', { timeout: 20000 }).catch(() => {});
    await sleep(1500);
    authToken = await page.evaluate(() => localStorage.getItem('gacha_token'));
    userInfo = await page.evaluate(async () => {
      const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${localStorage.getItem('gacha_token')}` } });
      return r.json();
    }).catch(() => null);
    await context.close();
    if (!authToken) { console.error('Connexion impossible'); process.exit(1); }
  }
  try {
    await fn(browser);
  } catch (e) {
    console.error(`❌ Phase ${name} en erreur: ${e.message.split('\n')[0]}`);
  }
  saveManifest();
  saveNetLogs();
}

await browser.close();
saveManifest();
saveNetLogs();
console.log(`\n✅ Terminé — ${shotCount} captures, ${apiLog.length} appels API journalisés, en ${Math.round((Date.now() - t0) / 1000)}s`);
