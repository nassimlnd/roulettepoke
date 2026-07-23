<script setup lang="ts">
// Sac à dos du joueur (port de inventoryModal.js du jeu original) : Charme Chroma
// + tickets biome/type. Les tickets filtrent le PROCHAIN tirage (usage unique) et
// un seul peut être actif à la fois (biome OU type).
const open = defineModel<boolean>('open', { default: false })

const inv = useInventoryStore()
const toast = useToast()

const loading = ref(false)
const busy = ref<string | null>(null) // clé de l'item en cours de mutation

interface Row { kind: 'biome' | 'type', slug: string, name: string, quantity: number, active: boolean, blocked: boolean }

const biomeRows = computed<Row[]>(() => {
  const rows: Row[] = inv.biomeTickets.map(t => ({
    kind: 'biome', slug: t.slug, name: t.name, quantity: t.quantity,
    active: inv.activeBiomeTicket === t.slug,
    blocked: !!inv.activeTypeTicket
  }))
  if (inv.activeBiomeTicket && !rows.some(r => r.slug === inv.activeBiomeTicket)) {
    rows.unshift({ kind: 'biome', slug: inv.activeBiomeTicket, name: inv.activeBiomeName ?? inv.activeBiomeTicket, quantity: 0, active: true, blocked: false })
  }
  return rows
})

const typeRows = computed<Row[]>(() => {
  const rows: Row[] = inv.typeTickets.map(t => ({
    kind: 'type', slug: t.slug, name: t.name, quantity: t.quantity,
    active: inv.activeTypeTicket === t.slug,
    blocked: !!inv.activeBiomeTicket
  }))
  if (inv.activeTypeTicket && !rows.some(r => r.slug === inv.activeTypeTicket)) {
    rows.unshift({ kind: 'type', slug: inv.activeTypeTicket, name: inv.activeTypeName ?? inv.activeTypeTicket, quantity: 0, active: true, blocked: false })
  }
  return rows
})

// Le slug du ticket (ex. « foret », « eau ») correspond déjà au token CSS
// --color-biome-* / --color-type-* ; fallback neutre si un slug est inconnu.
const biomeTint = (slug: string) => `var(--color-biome-${slug}, #6d7280)`
const typeTint = (slug: string) => `var(--color-type-${slug}, #a8a77a)`

watch(open, async (v) => {
  if (!v) return
  loading.value = inv.isEmpty
  try {
    await inv.refresh()
  } catch {
    // garde l'état courant si le rafraîchissement échoue
  } finally {
    loading.value = false
  }
})

async function activateCharme() {
  busy.value = 'charme'
  try {
    const rolls = await inv.activateCharme()
    toast.add({ title: 'Charme Chroma activé !', description: `${rolls} tirage${rolls > 1 ? 's' : ''} boosté${rolls > 1 ? 's' : ''} (shiny ×2).`, color: 'success', icon: 'i-lucide-sparkles' })
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    busy.value = null
  }
}

async function toggleTicket(row: Row) {
  busy.value = `${row.kind}-${row.slug}`
  try {
    if (row.active) {
      if (row.kind === 'biome') await inv.deactivateBiomeTicket()
      else await inv.deactivateTypeTicket()
    } else {
      if (row.kind === 'biome') await inv.activateBiomeTicket(row.slug)
      else await inv.activateTypeTicket(row.slug)
      toast.add({ title: `Ticket ${row.name} activé`, description: 'Ton prochain tirage sera filtré.', color: 'success', icon: 'i-lucide-ticket' })
    }
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  } finally {
    busy.value = null
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Sac à dos"
    description="Charme Chroma et tickets de tirage. Les tickets filtrent ton prochain tirage."
  >
    <template #body>
      <div class="bag">
        <div
          v-if="loading"
          class="bag__load"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-6 animate-spin"
          />
        </div>

        <p
          v-else-if="inv.isEmpty"
          class="bag__empty"
        >
          <UIcon
            name="i-lucide-backpack"
            class="size-8"
          />
          Ton sac est vide. Gagne des Charmes et des tickets au Jackpot, ou en
          vendant des cartes shiny.
        </p>

        <template v-else>
          <!-- Charme Chroma -->
          <section
            v-if="inv.charmeCount > 0"
            class="bag__sec"
          >
            <h3 class="bag__h font-display">
              <UIcon
                name="i-lucide-sparkles"
                class="size-4"
              /> Charme Chroma
            </h3>
            <div class="row">
              <span class="row__ico row__ico--charme">
                <UIcon
                  name="i-lucide-sparkles"
                  class="size-5"
                />
              </span>
              <div class="row__info">
                <span class="row__name">Charme Chroma <span class="row__qty">×{{ inv.charmeCount }}</span></span>
                <span class="row__desc">Booste les chances shiny ×2 pendant 10 tirages.</span>
              </div>
              <PButton
                size="sm"
                color="primary"
                :loading="busy === 'charme'"
                :disabled="!!busy"
                @click="activateCharme"
              >
                Activer
              </PButton>
            </div>
          </section>

          <!-- Tickets Biome -->
          <section
            v-if="biomeRows.length"
            class="bag__sec"
          >
            <h3 class="bag__h font-display">
              <UIcon
                name="i-lucide-map"
                class="size-4"
              /> Tickets Biome
            </h3>
            <div
              v-for="row in biomeRows"
              :key="row.slug"
              class="row"
              :class="{ 'row--active': row.active }"
            >
              <span
                class="row__ico"
                :style="{ background: biomeTint(row.slug) }"
              >
                <UIcon
                  name="i-lucide-map-pin"
                  class="size-5"
                />
              </span>
              <div class="row__info">
                <span class="row__name">
                  {{ row.name }}
                  <span
                    v-if="row.quantity"
                    class="row__qty"
                  >×{{ row.quantity }}</span>
                  <span
                    v-if="row.active"
                    class="row__badge"
                  >Actif ✓</span>
                </span>
                <span class="row__desc">{{ row.active ? 'Prochain tirage filtré' : 'Filtre ton prochain tirage' }}</span>
              </div>
              <PButton
                size="sm"
                :color="row.active ? 'neutral' : 'primary'"
                :loading="busy === `biome-${row.slug}`"
                :disabled="!!busy || (!row.active && row.blocked)"
                :title="!row.active && row.blocked ? 'Désactive l\'autre ticket d\'abord' : undefined"
                @click="toggleTicket(row)"
              >
                {{ row.active ? 'Désactiver' : 'Activer' }}
              </PButton>
            </div>
          </section>

          <!-- Tickets Type -->
          <section
            v-if="typeRows.length"
            class="bag__sec"
          >
            <h3 class="bag__h font-display">
              <UIcon
                name="i-lucide-zap"
                class="size-4"
              /> Tickets Type
            </h3>
            <div
              v-for="row in typeRows"
              :key="row.slug"
              class="row"
              :class="{ 'row--active': row.active }"
            >
              <span
                class="row__ico"
                :style="{ background: typeTint(row.slug) }"
              >
                <UIcon
                  name="i-lucide-tag"
                  class="size-5"
                />
              </span>
              <div class="row__info">
                <span class="row__name">
                  {{ row.name }}
                  <span
                    v-if="row.quantity"
                    class="row__qty"
                  >×{{ row.quantity }}</span>
                  <span
                    v-if="row.active"
                    class="row__badge"
                  >Actif ✓</span>
                </span>
                <span class="row__desc">{{ row.active ? 'Prochain tirage filtré' : 'Filtre ton prochain tirage' }}</span>
              </div>
              <PButton
                size="sm"
                :color="row.active ? 'neutral' : 'primary'"
                :loading="busy === `type-${row.slug}`"
                :disabled="!!busy || (!row.active && row.blocked)"
                :title="!row.active && row.blocked ? 'Désactive l\'autre ticket d\'abord' : undefined"
                @click="toggleTicket(row)"
              >
                {{ row.active ? 'Désactiver' : 'Activer' }}
              </PButton>
            </div>
          </section>
        </template>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.bag { display: flex; flex-direction: column; gap: 18px; }
.bag__load { display: grid; place-items: center; padding: 40px; color: var(--color-poke-500); }
.bag__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  padding: 30px 20px;
  color: var(--ui-text-muted);
  font-weight: 600;
}
.bag__empty :deep(svg) { color: var(--ui-text-dimmed); }

.bag__sec { display: flex; flex-direction: column; gap: 8px; }
.bag__h {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 700;
  font-size: .78rem;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  background: var(--ui-bg-muted);
  border: 1px solid var(--ui-border);
}
.row--active {
  background: color-mix(in oklab, var(--color-poke-500) 8%, var(--ui-bg-elevated));
  border-color: color-mix(in oklab, var(--color-poke-500) 40%, transparent);
}
.row__ico {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 11px;
  color: #fff;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .3), 0 2px 6px rgba(0, 0, 0, .12);
}
.row__ico--charme { background: radial-gradient(circle at 36% 30%, #e9d5ff, #a06cc4 60%, #7a49a8); }
.row__info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.row__name {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: .96rem;
  color: var(--ui-text-highlighted);
}
.row__qty { font-weight: 700; font-size: .8rem; color: var(--ui-text-muted); }
.row__badge {
  font-family: var(--font-sans);
  font-weight: 800;
  font-size: .68rem;
  color: #fff;
  background: linear-gradient(150deg, #5bbf82, #45a86c);
  padding: 2px 8px;
  border-radius: 999px;
}
.row__desc { font-size: .8rem; color: var(--ui-text-muted); }
</style>
