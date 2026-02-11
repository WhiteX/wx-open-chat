import { requestUrl } from 'obsidian'
import { WXSettings } from './settings'

export interface WXMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendToBridge(params: {
  settings: WXSettings
  messages: WXMessage[]
  vaultName: string
  vaultPath?: string
  activeFilePath?: string
  selectedText?: string
  activeFileExcerpt?: string
}): Promise<string> {
  const { settings, messages, vaultName, vaultPath, activeFilePath, selectedText, activeFileExcerpt } = params

  const endpoint = settings.bridgeUrl.trim().replace(/\/$/, '')
  if (!endpoint) throw new Error('Bridge URL is not configured')

  const message = [...messages].reverse().find((m) => m.role === 'user')?.content || ''

  const route =
    settings.linkMode === 'telegram-topic'
      ? { type: 'topic', groupId: settings.groupId || undefined, topicId: settings.topicId || undefined }
      : { type: 'main' }

  const payload = {
    message,
    messages,
    route,
    context: {
      vaultName,
      vaultPath,
      activeFilePath,
      selectedText: selectedText || undefined,
      activeFileExcerpt: activeFileExcerpt || undefined,
    },
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.bridgeToken.trim()) headers.Authorization = `Bearer ${settings.bridgeToken.trim()}`

  const response = await requestUrl({
    url: endpoint,
    method: 'POST',
    headers,
    contentType: 'application/json',
    body: JSON.stringify(payload),
    throw: false,
  })

  if (response.status >= 400) throw new Error(`Bridge error ${response.status}`)

  const data = response.json as { reply?: string; text?: string; message?: string }
  const reply = data.reply || data.text || data.message || '[No response from bridge]'
  return normalizeEditAppliedPath(reply, vaultPath, vaultName)
}

function normalizeEditAppliedPath(text: string, vaultPath?: string, vaultName?: string): string {
  if (!vaultPath) return text

  return text.replace(/EDIT_APPLIED:([^\n\r]+)/g, (_match, rawPath: string) => {
    const trimmed = String(rawPath || '').trim()
    const normalizedVault = vaultPath.replace(/\\/g, '/').replace(/\/$/, '')
    const normalizedPath = trimmed.replace(/\\/g, '/')

    if (normalizedPath.startsWith(normalizedVault + '/')) {
      const rel = normalizedPath.slice(normalizedVault.length + 1)
      const prefixed = vaultName ? `${vaultName}/${rel}` : rel
      return `EDIT_APPLIED:${prefixed}`
    }

    const fallback = vaultName ? `${vaultName}/${trimmed}` : trimmed
    return `EDIT_APPLIED:${fallback}`
  })
}
