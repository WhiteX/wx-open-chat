import { ItemView, MarkdownView, Notice, WorkspaceLeaf } from 'obsidian'
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
      `Link: ${s.linkMode === 'telegram-topic' ? 'Telegram' : 'Standalone'} • Context: ${
        s.includeActiveNoteContext || s.includeSelectionContext ? 'ON' : 'OFF'
      }`
    )

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
      row.createDiv({ cls: 'wx-chat-msg-role', text: m.role === 'user' ? 'You' : 'WX' })
      row.createDiv({ cls: 'wx-chat-msg-content', text: m.content })
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
}
