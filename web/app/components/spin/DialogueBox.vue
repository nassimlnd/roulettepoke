<script setup lang="ts">
// Boîte de dialogue façon Pokémon : machine à écrire, clic pour compléter la
// ligne / passer à la suivante ; émet `done` après la dernière réplique.
const props = defineProps<{ speaker?: string, lines: string[] }>()
const emit = defineEmits<{ done: [] }>()
const reduced = usePreferredReducedMotion()

const lineIdx = ref(0)
const shown = ref('')
const typing = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const line = computed(() => props.lines[lineIdx.value] ?? '')
const isLast = computed(() => lineIdx.value >= props.lines.length - 1)

function clear() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
function typeLine() {
  clear()
  const full = line.value
  if (reduced.value === 'reduce') {
    shown.value = full
    typing.value = false
    return
  }
  shown.value = ''
  typing.value = true
  let i = 0
  timer = setInterval(() => {
    i++
    shown.value = full.slice(0, i)
    if (i >= full.length) {
      typing.value = false
      clear()
    }
  }, 24)
}

// Clic : complète la ligne si en cours, sinon suivante / termine.
function tap() {
  if (typing.value) {
    clear()
    shown.value = line.value
    typing.value = false
    return
  }
  if (isLast.value) {
    emit('done')
    return
  }
  lineIdx.value++
  typeLine()
}

watch(() => props.lines, () => {
  lineIdx.value = 0
  typeLine()
})
onMounted(typeLine)
onBeforeUnmount(clear)
</script>

<template>
  <button
    class="dbox"
    :aria-label="typing ? 'Compléter le texte' : (isLast ? 'Continuer' : 'Réplique suivante')"
    @click="tap"
  >
    <span
      v-if="speaker"
      class="dbox__name font-display"
    >{{ speaker }}</span>
    <p class="dbox__text">
      {{ shown }}<span
        v-if="!typing"
        class="dbox__more"
        aria-hidden="true"
      >▼</span>
    </p>
  </button>
</template>

<style scoped>
.dbox {
  position: relative;
  display: block;
  width: 100%;
  text-align: left;
  background: var(--ui-bg-elevated);
  border: 3px solid color-mix(in oklab, #3a2f2a 60%, var(--tc, #8b5cc4));
  border-radius: 16px;
  padding: 16px 18px 18px;
  box-shadow: 0 5px 0 rgba(58, 47, 42, .18);
  min-height: 84px;
  cursor: pointer;
}
.dbox__name {
  position: absolute;
  top: -13px;
  left: 14px;
  font-weight: 800;
  font-size: .82rem;
  color: #fff;
  background: color-mix(in oklab, #3a2f2a 45%, var(--tc, #8b5cc4));
  padding: 3px 14px;
  border-radius: 999px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, .2);
}
.dbox__text {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.5;
  color: var(--ui-text-highlighted);
  min-height: 1.5em;
}
.dbox__more {
  display: inline-block;
  margin-left: 6px;
  color: var(--color-poke-500);
  animation: bob 1s ease-in-out infinite;
}
@keyframes bob {
  0%, 100% { transform: translateY(0); opacity: .5; }
  50% { transform: translateY(3px); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .dbox__more { animation: none; }
}
</style>
