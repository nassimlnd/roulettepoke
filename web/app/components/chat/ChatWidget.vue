<script setup lang="ts">
import { useChatStore, CHAT_MAX_LEN } from '~/stores/chat'

// Widget de tchat flottant global : bulle (FAB) → panneau ancré en bas à droite
// (desktop) ou feuille (mobile). Temps réel via le store. Monté dans le layout.
const chat = useChatStore()
const auth = useAuthStore()
const toast = useToast()

const draft = ref('')
const listEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
let nearBottom = true

const me = computed(() => auth.userId)

// Regroupe : on masque le pseudo pour les messages consécutifs d'un même auteur.
const rendered = computed(() => chat.messages.map((m, i) => {
  const prev = chat.messages[i - 1]
  return { m, mine: m.userId === me.value, showName: !prev || prev.userId !== m.userId }
}))

const statusLabel = computed(() => {
  switch (chat.status) {
    case 'open': return 'En ligne'
    case 'connecting': return 'Connexion…'
    case 'banned': return 'Banni du tchat'
    case 'expired': return 'Session expirée'
    default: return 'Hors ligne'
  }
})

function scrollToBottom(smooth = false) {
  nextTick(() => {
    const el = listEl.value
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}
function onScroll() {
  const el = listEl.value
  if (el) nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 90
}

function autogrow() {
  const t = inputEl.value
  if (!t) return
  t.style.height = 'auto'
  t.style.height = `${Math.min(t.scrollHeight, 96)}px`
}

function submit() {
  if (!draft.value.trim()) return
  if (chat.send(draft.value)) {
    draft.value = ''
    nearBottom = true
    nextTick(autogrow)
    scrollToBottom(true)
  } else if (chat.blocked) {
    toast.add({ title: chat.status === 'banned' ? 'Tu es banni du tchat.' : 'Session expirée, reconnecte-toi.', color: 'error' })
  }
}
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

async function banUser(userId: string, username: string) {
  try {
    await chat.ban(userId, 'Modération tchat')
    toast.add({ title: `${username} banni du tchat.`, color: 'success' })
  } catch (err) {
    toast.add({ title: humanizeError(err), color: 'error' })
  }
}

watch(() => chat.messages.length, () => {
  if (chat.open && nearBottom) scrollToBottom(true)
})
watch(() => chat.open, (v) => {
  if (v) {
    nearBottom = true
    scrollToBottom()
  }
})

onMounted(() => chat.start())
onBeforeUnmount(() => chat.stop())
</script>

<template>
  <div class="chat-widget">
    <Transition name="fab">
      <button
        v-if="!chat.open"
        class="fab"
        aria-label="Ouvrir le tchat"
        @click="chat.openPanel()"
      >
        <UIcon
          name="i-lucide-message-circle"
          class="size-6"
        />
        <span
          v-if="chat.unread > 0"
          class="fab__badge tabular"
        >{{ chat.unread > 99 ? '99+' : chat.unread }}</span>
      </button>
    </Transition>

    <Transition name="panel">
      <section
        v-if="chat.open"
        class="panel"
        role="dialog"
        aria-label="Tchat"
      >
        <header class="panel__head">
          <span
            class="dot"
            :class="`dot--${chat.status}`"
          />
          <h2 class="panel__h font-display">
            Tchat
          </h2>
          <span class="panel__status">{{ statusLabel }}</span>
          <button
            class="panel__close"
            aria-label="Fermer le tchat"
            @click="chat.closePanel()"
          >
            <UIcon
              name="i-lucide-x"
              class="size-5"
            />
          </button>
        </header>

        <div
          ref="listEl"
          class="panel__list"
          @scroll="onScroll"
        >
          <p
            v-if="!chat.messages.length"
            class="panel__empty"
          >
            <UIcon
              name="i-lucide-messages-square"
              class="size-8"
            />
            <span>Sois le premier à écrire dans le tchat !</span>
          </p>
          <ChatMessageBubble
            v-for="r in rendered"
            :key="r.m.id"
            :message="r.m"
            :mine="r.mine"
            :show-name="r.showName"
            :can-moderate="chat.isAdmin && !r.mine"
            @ban="banUser(r.m.userId, r.m.username)"
          />
        </div>

        <div
          v-if="chat.status === 'banned'"
          class="panel__blocked"
        >
          <UIcon
            name="i-lucide-shield-ban"
            class="size-4"
          /> Tu as été banni du tchat.
        </div>
        <form
          v-else
          class="panel__form"
          @submit.prevent="submit"
        >
          <textarea
            ref="inputEl"
            v-model="draft"
            class="panel__input"
            :maxlength="CHAT_MAX_LEN"
            rows="1"
            placeholder="Ton message…"
            @input="autogrow"
            @keydown="onKeydown"
          />
          <button
            type="submit"
            class="panel__send"
            :disabled="!draft.trim() || !chat.connected"
            aria-label="Envoyer"
          >
            <UIcon
              name="i-lucide-send"
              class="size-4"
            />
          </button>
        </form>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
/* Bulle flottante */
.fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 45;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 10px 24px -8px rgba(238, 90, 72, .65), 0 3px 0 var(--color-poke-700);
  transition: transform .18s var(--ease-pop);
}
.fab:hover { transform: translateY(-2px) scale(1.04); }
.fab:focus-visible { outline: 2px solid var(--color-poke-300); outline-offset: 3px; }
@media (max-width: 1023px) { .fab { bottom: calc(90px + env(safe-area-inset-bottom)); } }
.fab__badge {
  position: absolute;
  top: -3px;
  right: -3px;
  min-width: 21px;
  height: 21px;
  padding: 0 5px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  font-size: .68rem;
  font-weight: 800;
  color: var(--color-poke-700);
  background: #fff;
  box-shadow: 0 0 0 2px var(--color-poke-500), 0 2px 5px rgba(0, 0, 0, .2);
}

/* Panneau */
.panel {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 46;
  width: 372px;
  max-width: calc(100vw - 24px);
  height: min(560px, 74vh);
  display: flex;
  flex-direction: column;
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 20px;
  box-shadow: 0 26px 64px -18px rgba(40, 30, 30, .45);
  overflow: hidden;
}
@media (max-width: 640px) {
  .panel {
    right: 0;
    left: 0;
    bottom: 0;
    width: auto;
    max-width: none;
    height: 84vh;
    border-radius: 22px 22px 0 0;
  }
}
.panel__head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
.panel__h { font-weight: 700; font-size: 1.05rem; color: var(--ui-text-highlighted); }
.panel__status { font-size: .72rem; font-weight: 600; color: var(--ui-text-muted); }
.dot { width: 9px; height: 9px; border-radius: 50%; background: var(--ui-text-dimmed); flex: none; }
.dot--open { background: #5bbf82; box-shadow: 0 0 0 3px color-mix(in oklab, #5bbf82 26%, transparent); }
.dot--connecting { background: #e0a92e; }
.dot--closed, .dot--banned, .dot--expired { background: var(--color-poke-500); }
.panel__close {
  margin-left: auto;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  color: var(--ui-text-muted);
  transition: color .15s ease, background .15s ease;
}
.panel__close:hover { color: var(--ui-text); background: var(--ui-bg-muted); }

.panel__list {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  scroll-behavior: smooth;
}
.panel__empty {
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  color: var(--ui-text-dimmed);
  font-size: .88rem;
  padding: 20px;
}
.panel__empty :deep(svg) { color: var(--ui-border-accented); }

.panel__blocked {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px;
  border-top: 1px solid var(--ui-border);
  color: var(--color-poke-600);
  background: var(--color-poke-50);
  font-size: .86rem;
  font-weight: 700;
}
.panel__form {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 10px 12px;
  border-top: 1px solid var(--ui-border);
  background: var(--ui-bg-elevated);
}
.panel__input {
  flex: 1;
  resize: none;
  max-height: 96px;
  font-family: var(--font-body);
  font-size: .9rem;
  line-height: 1.4;
  color: var(--ui-text-highlighted);
  background: var(--ui-bg);
  border: 1px solid var(--ui-border);
  border-radius: 12px;
  padding: 9px 12px;
}
.panel__input:focus { outline: none; border-color: var(--color-poke-400); box-shadow: 0 0 0 3px var(--color-poke-100); }
.panel__send {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  color: #fff;
  background: linear-gradient(150deg, #ee5a48, var(--color-poke-500));
  box-shadow: 0 2px 0 var(--color-poke-700);
  transition: transform .12s var(--ease-pop), opacity .15s ease;
}
.panel__send:hover:not(:disabled) { transform: translateY(-1px); }
.panel__send:disabled { opacity: .4; box-shadow: none; cursor: default; }

/* Transitions */
.fab-enter-active, .fab-leave-active { transition: transform .2s var(--ease-pop), opacity .2s ease; }
.fab-enter-from, .fab-leave-to { transform: scale(.4); opacity: 0; }
.panel-enter-active, .panel-leave-active { transition: transform .24s var(--ease-glide), opacity .2s ease; }
.panel-enter-from, .panel-leave-to { transform: translateY(18px) scale(.97); opacity: 0; }
@media (max-width: 640px) {
  .panel-enter-from, .panel-leave-to { transform: translateY(100%); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .fab, .fab-enter-active, .fab-leave-active, .panel-enter-active, .panel-leave-active, .panel__send { transition: none; }
  .fab-enter-from, .fab-leave-to, .panel-enter-from, .panel-leave-to { transform: none; }
}
</style>
