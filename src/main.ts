import { Plugin, WorkspaceLeaf } from 'obsidian'
import { WXChatView, WX_CHAT_VIEW_TYPE } from './chatView'
import { DEFAULT_SETTINGS, WXSettings } from './settings'
import { WXSettingsTab } from './settingsTab'

export default class WXOpenChatPlugin extends Plugin {
  settings: WXSettings = { ...DEFAULT_SETTINGS }

  async onload() {
    await this.loadSettings()

    this.registerView(WX_CHAT_VIEW_TYPE, (leaf) => new WXChatView(leaf, this))

    this.addRibbonIcon('message-circle', 'Open WX Chat', () => {
      void this.activateChatView()
    })

    this.addCommand({
      id: 'open-wx-chat',
      name: 'Open WX Chat',
      callback: () => void this.activateChatView(),
    })

    this.addSettingTab(new WXSettingsTab(this.app, this, this.settings, () => this.saveSettings()))
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(WX_CHAT_VIEW_TYPE)
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
  }

  async saveSettings() {
    await this.saveData(this.settings)
  }

  private async activateChatView(): Promise<void> {
    const { workspace } = this.app
    let leaf: WorkspaceLeaf | null = workspace.getLeavesOfType(WX_CHAT_VIEW_TYPE)[0] ?? null

    if (!leaf) {
      leaf = workspace.getRightLeaf(false)
      if (!leaf) return
      await leaf.setViewState({ type: WX_CHAT_VIEW_TYPE, active: true })
    }

    workspace.revealLeaf(leaf)
  }
}
