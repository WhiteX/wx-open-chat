# Distribution & Installation (Public Repo)

## Keep secrets out of git
- Never commit `.env` files
- Never commit real tokens, group IDs tied to private spaces, or production endpoints in docs/examples
- Use placeholders in screenshots and examples

## Plugin install (manual)
1. Build plugin:
   ```bash
   yarn build
   ```
2. Copy these files into vault:
   - `manifest.json`
   - `main.js`
   - `styles.css`
3. Destination:
   `YourVault/.obsidian/plugins/wx-open-chat/`
4. Enable Community Plugins + enable `WX Open Chat`

## Public release checklist
- [ ] Update `manifest.json` version
- [ ] Update `versions.json`
- [ ] Build and smoke test
- [ ] Create GitHub Release with:
  - `manifest.json`
  - `main.js`
  - `styles.css`
- [ ] Add short migration notes

## Privacy model
- Plugin stores settings in local Obsidian plugin data (`data.json`), not in notes.
- Bridge can run locally and does not persist chats by default.
- For production, use HTTPS + reverse proxy auth if exposed beyond localhost.
