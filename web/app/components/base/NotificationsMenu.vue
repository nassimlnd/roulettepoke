<script setup lang="ts">
// Cloche de notifications : la liste, enfin. Depuis le premier audit, le store
// chargeait les notifications, la cloche les comptait et un clic les effaçait
// sans jamais les montrer. Les liens arrivent avec les ancres du front
// d'origine (« #suggestions ») : traduits, ou sans lien si nous n'avons pas la
// page — jamais un lien mort.
import { hashToRoute } from '~/utils/links'
import { timeAgo } from '~/utils/time'

const hub = useHubStore()
const open = ref(false)

const items = computed(() =>
  (hub.notifications?.notifications ?? []).map(n => ({ ...n, to: hashToRoute(n.link) })))

// Ouvrir la liste = les avoir vues : le serveur est prévenu et la pastille
// s'éteint. Le style « non lu » reste sur les lignes jusqu'au prochain
// rafraîchissement, pour qu'on repère les nouvelles d'un coup d'œil.
watch(open, (v) => {
  if (v && hub.unreadNotifications > 0) hub.markNotificationsRead()
})
</script>

<template>
  <UPopover
    v-model:open="open"
    :content="{ align: 'end', sideOffset: 6 }"
  >
    <UChip
      :show="hub.unreadNotifications > 0"
      :text="hub.unreadNotifications"
      size="2xl"
      color="error"
    >
      <button
        type="button"
        class="icon-btn"
        aria-label="Notifications"
        :aria-expanded="open"
      >
        <UIcon
          name="i-lucide-bell"
          class="size-5"
        />
      </button>
    </UChip>

    <template #content>
      <div class="nm">
        <p class="nm__head">
          Notifications
        </p>
        <p
          v-if="!items.length"
          class="nm__empty"
        >
          Rien de nouveau pour le moment.
        </p>
        <ul
          v-else
          class="nm__list"
        >
          <li
            v-for="n in items"
            :key="n.id"
            class="nm__item"
            :class="{ 'nm__item--unread': !n.read }"
          >
            <NuxtLink
              v-if="n.to"
              :to="n.to"
              class="nm__row"
              @click="open = false"
            >
              <span class="nm__msg">{{ n.message }}</span>
              <span class="nm__when">{{ timeAgo(n.created_at) }}</span>
            </NuxtLink>
            <div
              v-else
              class="nm__row"
            >
              <span class="nm__msg">{{ n.message }}</span>
              <span class="nm__when">{{ timeAgo(n.created_at) }}</span>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </UPopover>
</template>

<style scoped>
.icon-btn {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 11px;
  color: var(--ui-text-muted);
  cursor: pointer;
  transition: color .15s ease, background .15s ease;
}
.icon-btn:hover { color: var(--ui-text); background: var(--ui-bg-muted); }
.icon-btn:focus-visible { outline: 2px solid var(--color-poke-400); outline-offset: 2px; }

.nm { padding: 6px; width: min(22rem, calc(100vw - 32px)); }
.nm__head {
  font-size: .68rem;
  text-transform: uppercase;
  letter-spacing: .05em;
  font-weight: 700;
  color: var(--ui-text-dimmed);
  padding: 4px 8px 6px;
  margin: 0;
}
.nm__empty { font-size: .86rem; color: var(--ui-text-muted); padding: 8px 8px 10px; margin: 0; }
.nm__list { list-style: none; margin: 0; padding: 0; max-height: 60vh; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
.nm__row {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px;
  border-radius: 10px;
  color: var(--ui-text);
  transition: background .15s ease;
}
a.nm__row:hover { background: var(--ui-bg-muted); }
.nm__msg { font-size: .86rem; line-height: 1.35; overflow-wrap: anywhere; }
.nm__when { font-size: .72rem; color: var(--ui-text-dimmed); }
.nm__item--unread .nm__row { background: color-mix(in oklab, var(--color-poke-500) 7%, transparent); }
.nm__item--unread .nm__msg { font-weight: 600; }
</style>
