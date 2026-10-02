import type { NotificationsResponse } from '~/types/api'
import type { Api } from './_client'

export const notificationsRepo = {
  list: (api: Api) => api<NotificationsResponse>('/notifications'),
  readAll: (api: Api) => api('/notifications/read-all', { method: 'POST' })
}
