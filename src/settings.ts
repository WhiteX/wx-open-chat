export type LinkMode = 'standalone' | 'telegram-topic'

export interface WXSettings {
  bridgeUrl: string
  bridgeToken: string
  linkMode: LinkMode
  channel: 'telegram'
  groupId: string
  topicId: string
  includeActiveNoteContext: boolean
  includeSelectionContext: boolean
}

export const DEFAULT_SETTINGS: WXSettings = {
  bridgeUrl: 'http://127.0.0.1:8787/v1/chat',
  bridgeToken: '',
  linkMode: 'standalone',
  channel: 'telegram',
  groupId: '',
  topicId: '',
  includeActiveNoteContext: true,
  includeSelectionContext: true,
}
