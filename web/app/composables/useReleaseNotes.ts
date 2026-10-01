import { useStorage } from '@vueuse/core'
import { RELEASE_NOTES, LATEST_VERSION } from '~/config/release-notes'
import { STORAGE_KEYS } from '~/constants/storage-keys'

// Pastille « nouveautés » dans la navigation : tant que la dernière version
// des notes n'a pas été ouverte. Partagé entre la navbar et la page.
export function useReleaseNotes() {
  const seen = useStorage<string>(STORAGE_KEYS.notesSeen, '')
  const unseen = computed(() => seen.value !== LATEST_VERSION)
  function markSeen() {
    seen.value = LATEST_VERSION
  }
  return { notes: RELEASE_NOTES, latest: LATEST_VERSION, unseen, markSeen }
}
