import { ItemView, MarkdownRenderer, MarkdownView, Notice, WorkspaceLeaf } from 'obsidian'
import { sendToBridge, WXMessage } from './openclawBridge'
import WXOpenChatPlugin from './main'

export const WX_CHAT_VIEW_TYPE = 'wx-open-chat-view'

export class WXChatView extends ItemView {
  private messages: WXMessage[] = []
  private messagesEl!: HTMLElement
  private inputEl!: HTMLTextAreaElement
  private statusEl!: HTMLElement

  constructor(leaf: WorkspaceLeaf, private plugin: WXOpenChatPlugin) {
    super(leaf)
  }

  getViewType(): string {
    return WX_CHAT_VIEW_TYPE
  }

  getDisplayText(): string {
    return 'WX Open Chat'
  }

  getIcon(): string {
    return 'message-circle'
  }

  async onOpen(): Promise<void> {
    const { contentEl } = this
    contentEl.empty()
    contentEl.addClass('wx-open-chat-view')

    const wrap = contentEl.createDiv({ cls: 'wx-chat-wrap' })
    const top = wrap.createDiv({ cls: 'wx-chat-topbar' })
    top.createDiv({ text: 'WX Open Chat', cls: 'wx-chat-title' })

    const topActions = top.createDiv({ cls: 'wx-chat-top-actions' })
    const toggleNote = topActions.createEl('button', { text: 'Note ctx', cls: 'wx-chip-btn' })
    const toggleSel = topActions.createEl('button', { text: 'Selection', cls: 'wx-chip-btn' })

    toggleNote.addEventListener('click', async () => {
      this.plugin.settings.includeActiveNoteContext = !this.plugin.settings.includeActiveNoteContext
      await this.plugin.saveSettings()
      this.render()
    })

    toggleSel.addEventListener('click', async () => {
      this.plugin.settings.includeSelectionContext = !this.plugin.settings.includeSelectionContext
      await this.plugin.saveSettings()
      this.render()
    })

    this.statusEl = top.createDiv({ cls: 'wx-chat-context-state' })

    this.messagesEl = wrap.createDiv({ cls: 'wx-chat-messages' })

    const composer = wrap.createDiv({ cls: 'wx-chat-composer' })
    this.inputEl = composer.createEl('textarea', {
      cls: 'wx-chat-input',
      attr: { placeholder: 'Ask WX to edit files, summarize, or answer…' },
    })

    const actions = composer.createDiv({ cls: 'wx-chat-actions' })
    const sendBtn = actions.createEl('button', { text: 'Send', cls: 'mod-cta' })
    sendBtn.addEventListener('click', () => void this.handleSend())

    this.inputEl.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'Enter' && !ev.shiftKey) {
        ev.preventDefault()
        void this.handleSend()
      }
    })

    this.render()
  }

  private render(): void {
    const s = this.plugin.settings
    this.statusEl.setText(
      `Vault: ${this.app.vault.getName()} • Link: ${
        s.linkMode === 'telegram-topic' ? 'Telegram' : 'Standalone'
      } • Context: ${s.includeActiveNoteContext || s.includeSelectionContext ? 'ON' : 'OFF'}`
    )

    const chips = this.contentEl.querySelectorAll('.wx-chip-btn')
    if (chips.length >= 2) {
      chips[0].classList.toggle('is-active', s.includeActiveNoteContext)
      chips[1].classList.toggle('is-active', s.includeSelectionContext)
    }

    this.messagesEl.empty()
    if (!this.messages.length) {
      this.messagesEl.createDiv({
        cls: 'wx-chat-empty',
        text: 'No messages yet. Ask directly for edits in your current note.',
      })
      return
    }

    for (const m of this.messages) {
      const row = this.messagesEl.createDiv({ cls: `wx-chat-msg wx-chat-msg-${m.role}` })
      const head = row.createDiv({ cls: 'wx-chat-msg-head' })
      head.createDiv({ cls: 'wx-chat-msg-role', text: m.role === 'user' ? 'You' : 'WX' })
      head.createDiv({ cls: 'wx-chat-msg-dot', text: '•' })
      head.createDiv({ cls: 'wx-chat-msg-time', text: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) })

      const { visibleText, systemText } = splitSystemLines(m.content)
      const copySource = visibleText || m.content

      if (m.role === 'assistant') {
        const copyBtn = head.createEl('button', { text: 'Copy', cls: 'wx-chat-copy-btn' })
        copyBtn.addEventListener('click', () => void this.copyMessage(copySource))
      }

      const body = row.createDiv({ cls: 'wx-chat-msg-content' })
      void MarkdownRenderer.renderMarkdown(copySource, body, '', this.plugin)

      if (systemText) {
        const details = row.createEl('details', { cls: 'wx-chat-system-details' })
        details.createEl('summary', { text: 'System details' })
        const pre = details.createEl('pre', { cls: 'wx-chat-system-pre' })
        pre.setText(systemText)
      }
    }

    this.messagesEl.scrollTop = this.messagesEl.scrollHeight
  }

  private async handleSend(): Promise<void> {
    const text = this.inputEl.value.trim()
    if (!text) return

    this.messages.push({ role: 'user', content: text })
    this.inputEl.value = ''
    this.render()

    try {
      const activeFile = this.app.workspace.getActiveFile()
      const activeFilePath = activeFile?.path
      const adapter = (this.app.vault as unknown as { adapter?: { basePath?: string } }).adapter

      let selectedText = ''
      let activeFileExcerpt = ''

      const activeView = this.app.workspace.getActiveViewOfType(MarkdownView)
      if (this.plugin.settings.includeSelectionContext && activeView?.editor) {
        selectedText = activeView.editor.getSelection().trim()
      }

      if (this.plugin.settings.includeActiveNoteContext && activeFile) {
        const content = await this.app.vault.cachedRead(activeFile)
        activeFileExcerpt = content.slice(0, 4000)
      }

      const reply = await sendToBridge({
        settings: this.plugin.settings,
        messages: this.messages,
        vaultName: this.app.vault.getName(),
        vaultPath: adapter?.basePath,
        activeFilePath,
        selectedText,
        activeFileExcerpt,
      })

      this.messages.push({ role: 'assistant', content: reply })
      this.render()
    } catch (err) {
      const msg = String(err || '')
      this.messages.push({ role: 'assistant', content: `Error: ${msg}` })
      this.render()
      new Notice(`WX Open Chat error: ${msg}`)
    }
  }

  private async copyMessage(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      new Notice('Copied message')
    } catch {
      new Notice('Copy failed (clipboard unavailable)')
    }
  }
}

function splitSystemLines(text: string): { visibleText: string; systemText: string } {
  const lines = text.split(/\r?\n/)
  const system: string[] = []
  const visible: string[] = []

  for (const line of lines) {
    if (/^(EDIT_APPLIED:|NO_EDIT\b|SYSTEM:)/.test(line.trim())) {
      system.push(line)
    } else {
      visible.push(line)
    }
  }

  return {
    visibleText: visible.join('\n').trim(),
    systemText: system.join('\n').trim(),
  }
}
