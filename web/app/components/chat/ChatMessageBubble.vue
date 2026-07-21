<script setup lang="ts">
import type { ChatMessage } from '~/types/domain'

// Bulle de message : la mienne à droite (rouge), les autres à gauche (gris) avec
// pseudo coloré. Le pseudo est masqué pour les messages consécutifs d'un même
// auteur (`showName=false`).
const props = defineProps<{
  message: ChatMessage
  mine: boolean
  showName: boolean
  canModerate?: boolean
}>()
const emit = defineEmits<{ ban: [] }>()

const NAME_COLORS = ['#d9614f', '#4e8fd0', '#8b6fc4', '#3f9e66', '#c98a1a', '#c85b8f', '#3aa8a0']
const nameColor = computed(() => {
  let h = 0
  const name = props.message.username
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return NAME_COLORS[h % NAME_COLORS.length] ?? '#7c73e8'
})

const time = computed(() => {
  const d = new Date(props.message.createdAt)
  const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const sameDay = d.toDateString() === new Date().toDateString()
  return sameDay ? hm : `${d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${hm}`
})
</script>

<template>
  <div
    class="msg"
    :class="{ 'msg--mine': mine, 'msg--tight': !showName }"
  >
    <div
      v-if="showName && !mine"
      class="msg__head"
    >
      <span
        class="msg__name"
        :style="{ color: nameColor }"
      >{{ message.username }}</span>
      <span class="msg__time">{{ time }}</span>
      <button
        v-if="canModerate"
        class="msg__ban"
        title="Bannir ce joueur"
        @click="emit('ban')"
      >
        <UIcon
          name="i-lucide-shield-ban"
          class="size-3.5"
        />
      </button>
    </div>
    <div class="msg__row">
      <span class="msg__bubble">{{ message.message }}</span>
      <span
        v-if="mine || !showName"
        class="msg__time msg__time--inline"
      >{{ time }}</span>
    </div>
  </div>
</template>

<style scoped>
.msg { display: flex; flex-direction: column; gap: 3px; max-width: 100%; }
.msg--mine { align-items: flex-end; }
.msg--tight { margin-top: -4px; }
.msg__head { display: flex; align-items: center; gap: 7px; padding: 0 2px; }
.msg__name { font-family: var(--font-display); font-weight: 700; font-size: .78rem; }
.msg__time { font-size: .64rem; color: var(--ui-text-dimmed); font-weight: 600; }
.msg__ban {
  display: inline-grid;
  place-items: center;
  color: var(--ui-text-dimmed);
  opacity: 0;
  transition: opacity .15s ease, color .15s ease;
}
.msg:hover .msg__ban { opacity: 1; }
.msg__ban:hover { color: var(--color-poke-600); }
.msg__row { display: flex; align-items: flex-end; gap: 6px; max-width: 100%; }
.msg--mine .msg__row { flex-direction: row-reverse; }
.msg__bubble {
  font-size: .88rem;
  line-height: 1.35;
  padding: 7px 12px;
  border-radius: 14px;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  background: var(--ui-bg-muted);
  color: var(--ui-text-highlighted);
  border-bottom-left-radius: 5px;
}
.msg--mine .msg__bubble {
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  border-bottom-left-radius: 14px;
  border-bottom-right-radius: 5px;
}
.msg__time--inline { flex: none; padding-bottom: 2px; }
</style>
