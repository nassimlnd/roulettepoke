<script setup lang="ts">
// Vente intelligente : règles → aperçu du plan → exécution séquentielle.
// L'API ne vend qu'un exemplaire par appel (~1 s mesurée) : un lot se joue donc
// en trois actes — configurer, regarder la jauge avancer (avec un vrai bouton
// Stop), lire le bilan. Le plan est recalculé en direct par buildSellPlan (pur,
// testé) ; ce composant ne décide de rien, il montre et exécute.
import type { DomainOwnedCard } from '~/types/domain'
import type { SellPlan, SellRule } from '~/utils/sellPlan'
import { buildSellPlan, DEFAULT_SELL_OPTIONS } from '~/utils/sellPlan'
import { styledSpriteUrl } from '~/utils/sprite'
import { spriteStyleByKey } from '~/constants/sprite-styles'
import { MERGE_COST } from '~/constants/game'

const open = defineModel<boolean>('open', { default: false })

const collection = useCollectionStore()
const prefs = usePreferencesStore()
const toast = useToast()

const opts = reactive({ ...DEFAULT_SELL_OPTIONS })
// PSegmented ne connaît que des chaînes ; le plan veut un nombre.
const keepChoice = computed({
  get: () => String(opts.keep),
  set: (v: string) => { opts.keep = Number(v) }
})
const KEEP_OPTIONS = [
  { value: '1', label: '1' },
  { value: '3', label: '3' },
  { value: '5', label: '5' }
] as const

const plan = computed<SellPlan>(() => buildSellPlan(collection.cards, opts))

const RULE_META: Record<SellRule, { label: string, icon: string }> = {
  shinyOwned: { label: 'Chasse shiny terminée', icon: 'i-lucide-sparkles' },
  shinyDupes: { label: 'Doublons shiny → Charmes', icon: 'i-lucide-wand-sparkles' },
  otherDupes: { label: 'Autres doublons', icon: 'i-lucide-layers' }
}
const groups = computed(() =>
  (Object.keys(RULE_META) as SellRule[])
    .map(rule => ({ rule, ...RULE_META[rule], lines: plan.value.lines.filter(l => l.rule === rule) }))
    .filter(g => g.lines.length))

// Vignette de 30 px : le style du joueur s'il est embarqué, sinon le pixel
// Cristal local (~300 o) — le sprite animé du backend pèse jusqu'à 200 Ko,
// trop lourd pour une liste. L'onerror bascule sur l'image du jeu.
function sprite(card: DomainOwnedCard): string {
  const styled = styledSpriteUrl(prefs.spriteStyle, card.num, card.isShiny)
  if (styled && spriteStyleByKey(prefs.spriteStyle).local) return styled
  return styledSpriteUrl('gen2', card.num, card.isShiny) ?? card.imageUrl
}
function fallbackSprite(e: Event, card: DomainOwnedCard) {
  const img = e.target as HTMLImageElement
  if (img.src !== card.imageUrl) img.src = card.imageUrl
}

// ─── Exécution ────────────────────────────────────────────────────────────────
const phase = ref<'plan' | 'run' | 'done'>('plan')
const progress = reactive({ done: 0, total: 0, name: '', coins: 0, charms: 0 })
const result = ref<Awaited<ReturnType<typeof collection.sellBulk>> | null>(null)
const stopAsked = ref(false)

watch(open, (v) => {
  if (v) {
    phase.value = 'plan'
    result.value = null
    stopAsked.value = false
  } else if (phase.value === 'run') {
    // Fermer la modale pendant la vente = demander l'arrêt. L'exécuteur finit
    // l'appel en cours puis resynchronise ; le bilan arrive alors en toast.
    stopAsked.value = true
  }
})

function gainText(r: { coins: number, charms: number }): string {
  const parts = []
  if (r.coins) parts.push(`+${r.coins} 🪙`)
  if (r.charms) parts.push(`+${r.charms} Charme${r.charms > 1 ? 's' : ''} Chroma`)
  return parts.length ? parts.join(' · ') : 'aucun gain'
}

async function execute() {
  if (phase.value !== 'plan' || !plan.value.lines.length) return
  phase.value = 'run'
  stopAsked.value = false
  progress.done = 0
  progress.total = plan.value.copies
  progress.name = ''
  progress.coins = 0
  progress.charms = 0
  let res: Awaited<ReturnType<typeof collection.sellBulk>>
  try {
    res = await collection.sellBulk(
      plan.value.lines,
      (done, total, name, coins, charms) => {
        progress.done = done
        progress.total = total
        progress.name = name
        progress.coins = coins
        progress.charms = charms
      },
      () => stopAsked.value
    )
  } catch {
    // sellBulk encaisse déjà ses échecs ; ce filet garantit qu'AUCUNE surprise
    // ne laisse la modale figée sur la jauge. Le bilan repart du progrès connu.
    res = { done: progress.done, total: progress.total, coins: progress.coins, charms: progress.charms, failed: null, stopped: true }
  }
  result.value = res
  if (!open.value) {
    toast.add({
      title: `Vente interrompue — ${res.done} exemplaire${res.done > 1 ? 's' : ''} vendu${res.done > 1 ? 's' : ''}`,
      description: gainText(res),
      icon: 'i-lucide-hand-coins',
      color: 'warning'
    })
    return
  }
  phase.value = 'done'
}

const resultSub = computed(() => {
  const r = result.value
  if (!r) return ''
  const sold = `${r.done} exemplaire${r.done > 1 ? 's' : ''} vendu${r.done > 1 ? 's' : ''} sur ${r.total}`
  if (r.failed) return `${sold} — arrêt sur ${r.failed} (le serveur a refusé), le reste n'a pas bougé.`
  if (r.stopped) return `${sold} — interrompu à ta demande, le reste n'a pas bougé.`
  return `${r.done} exemplaire${r.done > 1 ? 's' : ''} vendu${r.done > 1 ? 's' : ''}. Le classeur garde le reste.`
})
</script>

<template>
  <UModal
    v-model:open="open"
    title="Vente intelligente"
    :dismissible="phase !== 'run'"
    :close="phase !== 'run'"
  >
    <template #body>
      <!-- Acte 1 : règles + aperçu -->
      <div
        v-if="phase === 'plan'"
        class="ss"
      >
        <p class="ss__intro">
          Revends ce qui ne sert plus ta chasse, garde tout ce qui compte.
        </p>

        <div class="ss__rules">
          <label class="rule">
            <USwitch v-model="opts.shinyOwned" />
            <span class="rule__text">
              <span class="rule__title">{{ RULE_META.shinyOwned.label }}</span>
              <span class="rule__sub">Doublons des cartes dont tu possèdes déjà la ✦ shiny : leurs
                exemplaires ne servaient qu'à la chance shiny. Garde 1, encaisse le reste.</span>
            </span>
          </label>
          <label class="rule">
            <USwitch v-model="opts.shinyDupes" />
            <span class="rule__text">
              <span class="rule__title">{{ RULE_META.shinyDupes.label }}</span>
              <span class="rule__sub">Chaque shiny vendue rapporte un Charme Chroma (chance ✦ ×2
                pendant 10 tirages). Garde 1 exemplaire au classeur.</span>
            </span>
          </label>
          <label class="rule">
            <USwitch v-model="opts.otherDupes" />
            <span class="rule__text">
              <span class="rule__title">{{ RULE_META.otherDupes.label }}</span>
              <span class="rule__sub rule__sub--warn">Chaque exemplaire vendu fait reculer ta chance
                shiny (+1/500 par doublon possédé).</span>
              <span
                v-if="opts.otherDupes"
                class="rule__keep"
              >
                Garder
                <PSegmented
                  v-model="keepChoice"
                  :options="KEEP_OPTIONS"
                  size="sm"
                  a11y="radio"
                  aria-label="Exemplaires à garder"
                />
                exemplaire{{ opts.keep > 1 ? 's' : '' }} par carte
              </span>
            </span>
          </label>
        </div>

        <p class="ss__guard">
          <UIcon
            name="i-lucide-shield-check"
            class="size-4 shrink-0"
          />
          <span>Jamais le dernier exemplaire : Pokédex et éligibilité aux échanges intacts.
            Les cartes qui peuvent fusionner gardent leurs {{ MERGE_COST }} exemplaires{{
              plan.mergeProtected ? ` (${plan.mergeProtected} carte${plan.mergeProtected > 1 ? 's' : ''} protégée${plan.mergeProtected > 1 ? 's' : ''} ici)` : '' }}.</span>
        </p>

        <!-- Aperçu du plan -->
        <div
          v-if="groups.length"
          class="ss__preview"
        >
          <section
            v-for="g in groups"
            :key="g.rule"
            class="grp"
          >
            <h3 class="grp__head">
              <UIcon
                :name="g.icon"
                class="size-4"
              />
              {{ g.label }}
            </h3>
            <ul class="grp__lines">
              <li
                v-for="l in g.lines"
                :key="l.card.id"
                class="line"
              >
                <img
                  :src="sprite(l.card)"
                  :alt="''"
                  class="line__img"
                  loading="lazy"
                  @error="fallbackSprite($event, l.card)"
                >
                <span class="line__name">{{ l.card.name }}</span>
                <span class="line__count tabular">×{{ l.count }}</span>
                <span class="line__gain tabular">{{ l.charms ? `${l.charms} ✦` : `+${l.coins} 🪙` }}</span>
              </li>
            </ul>
          </section>
        </div>
        <p
          v-else
          class="ss__empty"
        >
          Rien à vendre avec ces règles — ton classeur est déjà net.
        </p>

        <footer class="ss__foot">
          <p
            v-if="plan.copies"
            class="ss__total"
          >
            <strong class="tabular">{{ plan.copies }}</strong> exemplaire{{ plan.copies > 1 ? 's' : '' }}
            → <strong>{{ gainText(plan) }}</strong>
          </p>
          <PButton
            icon="i-lucide-hand-coins"
            :disabled="!plan.copies"
            @click="execute"
          >
            Vendre{{ plan.copies ? ` ${plan.copies} exemplaire${plan.copies > 1 ? 's' : ''}` : '' }}
          </PButton>
        </footer>
      </div>

      <!-- Acte 2 : la jauge -->
      <div
        v-else-if="phase === 'run'"
        class="ss ss--run"
      >
        <p class="run__label">
          Vente en cours — le solde suit en direct.
        </p>
        <div
          class="run__bar"
          role="progressbar"
          :aria-valuemin="0"
          :aria-valuemax="progress.total"
          :aria-valuenow="progress.done"
        >
          <i :style="{ width: progress.total ? `${(progress.done / progress.total) * 100}%` : '0%' }" />
        </div>
        <p class="run__count tabular">
          {{ progress.done }} / {{ progress.total }}<template v-if="progress.name">
            — {{ progress.name }}
          </template>
        </p>
        <p
          v-if="progress.coins || progress.charms"
          class="run__gain"
        >
          {{ gainText(progress) }}
        </p>
        <PButton
          color="neutral"
          icon="i-lucide-octagon-x"
          @click="stopAsked = true"
        >
          {{ stopAsked ? 'Arrêt en cours…' : 'Stop' }}
        </PButton>
      </div>

      <!-- Acte 3 : le bilan -->
      <div
        v-else
        class="ss ss--done"
      >
        <span
          class="done__badge"
          :class="{ 'done__badge--warn': result?.failed || result?.stopped }"
        >
          <UIcon
            :name="result?.failed ? 'i-lucide-octagon-alert' : 'i-lucide-badge-check'"
            class="size-7"
          />
        </span>
        <p class="done__gain font-display">
          {{ result ? gainText(result) : '' }}
        </p>
        <p class="done__sub">
          {{ resultSub }}
        </p>
        <PButton
          color="neutral"
          @click="open = false"
        >
          Fermer
        </PButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.ss { display: flex; flex-direction: column; gap: 14px; }
.ss__intro { color: var(--ui-text-muted); font-size: .9rem; margin: 0; }

.ss__rules { display: flex; flex-direction: column; gap: 10px; }
.rule {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 11px 13px;
  border-radius: 13px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  cursor: pointer;
}
.rule__text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.rule__title { font-family: var(--font-display); font-weight: 600; font-size: .92rem; }
.rule__sub { font-size: .8rem; color: var(--ui-text-muted); line-height: 1.35; }
.rule__sub--warn { color: var(--color-poke-600); }
.rule__keep {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: .82rem;
  color: var(--ui-text);
}

.ss__guard {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  font-size: .78rem;
  color: var(--ui-text-dimmed);
  margin: 0;
  line-height: 1.4;
}

.ss__preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}
.grp__head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-display);
  font-weight: 600;
  font-size: .8rem;
  text-transform: uppercase;
  letter-spacing: .04em;
  color: var(--ui-text-muted);
  margin: 0 0 6px;
}
.grp__lines { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
.line {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 5px 8px;
  border-radius: 9px;
  background: var(--ui-bg-muted);
  font-size: .86rem;
}
.line__img { width: 30px; height: 30px; object-fit: contain; flex: none; image-rendering: pixelated; }
.line__name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.line__count { color: var(--ui-text-muted); margin-left: auto; }
.line__gain { font-weight: 700; color: var(--ui-text-highlighted); flex: none; }

.ss__empty {
  text-align: center;
  color: var(--ui-text-muted);
  font-size: .9rem;
  padding: 18px 0;
  margin: 0;
}

.ss__foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  flex-wrap: wrap;
  border-top: 1px solid var(--ui-border);
  padding-top: 14px;
}
.ss__total { margin: 0 auto 0 0; font-size: .9rem; color: var(--ui-text-muted); }
.ss__total strong { color: var(--ui-text-highlighted); }

/* Acte 2 */
.ss--run { align-items: center; text-align: center; padding: 10px 0 4px; }
.run__label { margin: 0; color: var(--ui-text-muted); font-size: .9rem; }
.run__bar {
  width: 100%;
  height: 12px;
  border-radius: 99px;
  background: var(--ui-bg-accented);
  overflow: hidden;
}
.run__bar > i {
  display: block;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #ffd67f, var(--color-poke-500));
  transition: width .4s var(--ease-glide);
}
.run__count { margin: 0; font-size: .88rem; color: var(--ui-text); }
.run__gain { margin: 0; font-family: var(--font-display); font-weight: 700; color: var(--ui-text-highlighted); }

/* Acte 3 */
.ss--done { align-items: center; text-align: center; padding: 8px 0 4px; }
.done__badge {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  color: #3f9e66;
  background: color-mix(in oklab, #5bbf82 20%, transparent);
}
.done__badge--warn {
  color: #c98a1a;
  background: color-mix(in oklab, #f6c453 24%, transparent);
}
.done__gain { font-size: 1.35rem; font-weight: 700; margin: 0; }
.done__sub { margin: 0; color: var(--ui-text-muted); font-size: .9rem; max-width: 34ch; }
</style>
