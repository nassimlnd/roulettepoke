<script setup lang="ts">
// Zarbi s'échange FORME par forme : une fois la carte choisie, on précise
// laquelle (A, B… !, ?). Sert au create (formes du partenaire) comme au
// respond (les miennes, en double).
import type { ZarbiForm } from '~/types/domain'

const open = defineModel<boolean>('open', { required: true })
defineProps<{ title: string, forms: ZarbiForm[], loading?: boolean, busy?: boolean }>()
const emit = defineEmits<{ pick: [form: ZarbiForm] }>()
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
  >
    <template #body>
      <div
        v-if="loading"
        class="zp__load"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-6 animate-spin"
        />
      </div>
      <div
        v-else-if="forms.length"
        class="zp__grid"
      >
        <button
          v-for="f in forms"
          :key="f.id"
          type="button"
          class="zf"
          :disabled="busy"
          @click="emit('pick', f)"
        >
          <img
            :src="f.imageUrl"
            :alt="`Zarbi ${f.form}`"
            loading="lazy"
          >
          <span class="zf__name">Zarbi {{ f.form }}{{ f.isShiny ? ' ☆' : '' }}</span>
          <span class="zf__qty tabular">×{{ f.quantity }}</span>
        </button>
      </div>
      <p
        v-else
        class="zp__empty"
      >
        Aucune forme de Zarbi disponible.
      </p>
    </template>
  </UModal>
</template>

<style scoped>
.zp__load { display: grid; place-items: center; padding: 40px; color: var(--color-poke-500); }
.zp__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; max-height: 52vh; overflow-y: auto; }
.zf {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  border-radius: 12px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  cursor: pointer;
  transition: transform .15s var(--ease-pop);
}
.zf:hover:not(:disabled) { transform: translateY(-3px); }
.zf:disabled { opacity: .5; cursor: default; }
.zf img { width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated; }
.zf__name { font-weight: 700; font-size: .72rem; }
.zf__qty { font-size: .66rem; font-weight: 800; color: var(--ui-text-dimmed); }
.zp__empty { text-align: center; color: var(--ui-text-dimmed); font-size: .88rem; padding: 26px 0; }
</style>
