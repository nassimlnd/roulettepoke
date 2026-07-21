<script setup lang="ts">
// Carte « anecdote » : petit intitulé + vedette (nom) + détail, pastille d'icône
// teintée selon le ton (bon / mauvais / neutre / doré).
withDefaults(defineProps<{
  icon: string
  label: string
  name: string
  detail: string
  tone?: 'good' | 'bad' | 'gold' | 'neutral'
}>(), { tone: 'neutral' })
</script>

<template>
  <div
    class="anec"
    :class="`anec--${tone}`"
  >
    <span class="anec__ico">
      <UIcon
        :name="icon"
        class="size-5"
      />
    </span>
    <div class="anec__body">
      <p class="anec__label">
        {{ label }}
      </p>
      <p class="anec__name font-display">
        {{ name }}
      </p>
      <p class="anec__detail">
        {{ detail }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.anec {
  --accent: var(--ui-text-muted);
  --wash: var(--ui-bg-muted);
  display: flex;
  gap: 12px;
  padding: 15px 16px;
  border-radius: 16px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  box-shadow: 0 6px 18px -14px rgba(60, 40, 40, .2);
}
.anec--good { --accent: #3f9e66; --wash: color-mix(in oklab, #5bbf82 20%, transparent); }
.anec--bad { --accent: var(--color-poke-600); --wash: var(--color-poke-50); }
.anec--gold { --accent: #c98a1a; --wash: color-mix(in oklab, #f6c453 24%, transparent); }
.anec--neutral { --accent: #7c73e8; --wash: color-mix(in oklab, #c9b3ff 22%, transparent); }
.anec__ico {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  flex: none;
  border-radius: 11px;
  color: var(--accent);
  background: var(--wash);
}
.anec__body { min-width: 0; }
.anec__label { font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .04em; color: var(--ui-text-dimmed); }
.anec__name { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); line-height: 1.15; margin: 1px 0; overflow-wrap: anywhere; }
.anec__detail { font-size: .82rem; color: var(--ui-text-muted); line-height: 1.3; }
</style>
