import { App, Plugin, PluginSettingTab, Setting } from 'obsidian'
import { WXSettings } from './settings'

export class WXSettingsTab extends PluginSettingTab {
  constructor(
    app: App,
    plugin: Plugin,
    private settings: WXSettings,
    private saveSettings: () => Promise<void>
  ) {
    super(app, plugin)
  }

  display(): void {
    const { containerEl } = this
    containerEl.empty()

    containerEl.createEl('h2', { text: 'WX Open Chat' })

    new Setting(containerEl)
      .setName('Bridge URL')
      .setDesc('Use WSL IP when Obsidian runs on Windows and bridge runs in WSL.')
      .addText((text) =>
        text.setValue(this.settings.bridgeUrl).onChange(async (v) => {
          this.settings.bridgeUrl = v.trim()
          await this.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Bridge token')
      .setDesc('Bearer token used by the bridge.')
      .addText((text) =>
        text.setValue(this.settings.bridgeToken).onChange(async (v) => {
          this.settings.bridgeToken = v.trim()
          await this.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Session linking mode')
      .setDesc('Standalone (default) or linked Telegram topic.')
      .addDropdown((dd) =>
        dd
          .addOption('standalone', 'Standalone')
          .addOption('telegram-topic', 'Telegram topic')
          .setValue(this.settings.linkMode)
          .onChange(async (v: 'standalone' | 'telegram-topic') => {
            this.settings.linkMode = v
            await this.saveSettings()
            this.display()
          })
      )

    if (this.settings.linkMode === 'telegram-topic') {
      new Setting(containerEl)
        .setName('Telegram group ID')
        .addText((text) =>
          text.setValue(this.settings.groupId).onChange(async (v) => {
            this.settings.groupId = v.trim()
            await this.saveSettings()
          })
        )

      new Setting(containerEl)
        .setName('Telegram topic ID')
        .addText((text) =>
          text.setValue(this.settings.topicId).onChange(async (v) => {
            this.settings.topicId = v.trim()
            await this.saveSettings()
          })
        )
    }

    containerEl.createEl('h3', { text: 'Context' })

    new Setting(containerEl)
      .setName('Include active note context')
      .addToggle((t) =>
        t.setValue(this.settings.includeActiveNoteContext).onChange(async (v) => {
          this.settings.includeActiveNoteContext = v
          await this.saveSettings()
        })
      )

    new Setting(containerEl)
      .setName('Include current selection context')
      .addToggle((t) =>
        t.setValue(this.settings.includeSelectionContext).onChange(async (v) => {
          this.settings.includeSelectionContext = v
          await this.saveSettings()
        })
      )
  }
}
