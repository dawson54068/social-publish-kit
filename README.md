# Social Publish Kit

Social Publish Kit 是一個可攜式社群寫作外掛。它把通用的寫作技能和受保護的本機瀏覽器工作流程包在一起，用來替 Threads、Facebook、LinkedIn 產生草稿、驗證內容，並在你明確確認後才選擇性發佈。

English version: [README.en.md](README.en.md)

這個專案不包含帳號 token、私人分析資料、個人品牌檔案、本機絕對路徑，或特定發佈者的個人檔案名稱。

## 外掛結構

這個 repository 是一個可分享的外掛：

- `.codex-plugin/plugin.json`：給相容 Codex 的執行環境使用。
- `.claude-plugin/plugin.json`：給相容 Claude Code 的執行環境使用。
- `skills/`：可攜式技能資料夾。
- `workflow/`：選用的本機 Node/Playwright 執行器。

## 內含技能

- `platform-adapter`：把單一 `source.md` 轉成不同平台的草稿，並保留原始事實。
- `threads-optimizer`、`facebook-optimizer`、`linkedin-optimizer`：依平台改寫社群貼文。
- `source-crosscheck`：在審稿或發佈前，檢查草稿是否忠於原始內容。
- `proofreading`：進行臺灣繁體中文的用字、術語與格式校對。
- `image-prompt`、`image-slides`：產生文字精準的社群圖片或輪播圖提示詞。
- `social-browser-publisher`：引導本機預覽、登入設定，以及瀏覽器發佈流程。

## 安全模型

`node workflow/run.mjs --content-dir content/<id>` 只會驗證與預覽。只有在以下條件全部成立時，才會發佈內容：

1. 平台草稿檔案存在，而且通過長度檢查。
2. `config.json` 將 `publishers_enabled` 設為 `true`，或你明確使用 `--force`。
3. 指令同時包含 `--publish` 和 `--yes`。

這個工作流程會使用專用的 Playwright 持久化瀏覽器設定檔，不會附掛、複製或關閉你平常使用的 Chrome 設定檔。第一次使用時，請在這個專用設定檔中登入各平台，之後即可重複使用。平台介面可能改版；如果選擇器發生錯誤，請先手動檢查瀏覽器畫面。

## 設定

需要 Node.js 20+、Playwright，以及選用 TypeScript 輔助工具所需的 `tsx`。在專案根目錄執行：

```text
corepack yarn install
corepack yarn playwright install chromium
```

第一次設定瀏覽器登入時，執行：

```text
corepack yarn setup-browser --platforms threads,facebook,linkedin
```

它會開啟一個獨立的持久化瀏覽器設定檔，讓你手動登入。這是給初次使用者的安全設定路徑；不要重用或複製你日常使用的瀏覽器設定檔。

將 `config.example.json` 複製成 `config.json` 後再調整內容。如果 `config.json` 裡包含帳號名稱或內部網址，請把它留在本機，不要提交到 Git。

設定合約寫在 `docs/config-contract.md`。它取代原本專案裡硬編碼的網域、作者、內容 ID、分析資料、語氣設定與瀏覽器設定。即使完全沒有設定檔，這些技能仍可運作；缺少的選用行為會直接省略。

相容性差異請看 `docs/compatibility.md`，其中說明 ChatGPT、Claude、Gemini CLI、Antigravity 等環境在「能否讀取技能指令」與「能否執行本機瀏覽器自動化」上的差別。

## 作為外掛安裝

分享或 clone 這個 repository 後，請用你的 agent runtime 支援的外掛機制安裝專案根目錄。外掛根目錄就是同時包含 `.codex-plugin/plugin.json`、`.claude-plugin/plugin.json` 和 `skills/` 的資料夾。

如果你的執行環境只支援鬆散的技能資料夾，請把 `skills/` 底下的個別資料夾複製或連結到該 runtime 的專案或全域技能目錄。

## 內容資料夾

```text
content/<id>/
  source.md
  threads.md
  facebook.md
  linkedin.md
  slides/                # 選用的 PNG/JPEG/WebP 檔案
```

先用內建技能建立草稿，再執行：

```text
corepack yarn workflow --content-dir content/example
corepack yarn workflow --content-dir content/example --publish --yes
```

Windows 使用者可以改用 `workflow\\run.cmd` 或 `workflow\\run.ps1`，參數相同。如果想指定瀏覽器設定檔位置，可以設定 `SOCIAL_BROWSER_PROFILE_DIR` 或傳入 `--profile-dir`。

## 隱私邊界

不要提交 `config.json`、真實內容資料夾、瀏覽器設定檔、截圖、分析資料、token 或發佈結果。內建 `.gitignore` 是基準防線，不是取代你在分享前檢查 `git diff` 的理由。

## 貢獻

請先閱讀 [CONTRIBUTING.md](CONTRIBUTING.md)。所有變更都應保持通用：不要加入私人帳號資料、分析資料、瀏覽器設定檔、本機使用者名稱、硬編碼網域，或尚未公開的內容。

## 安全性

安全性問題請透過 repository 的安全通報管道私下回報，詳見 [SECURITY.md](SECURITY.md)。不要在公開 issue 中貼上憑證、cookies、瀏覽器設定檔內容或私人內容。

## 授權

本專案採用 MIT License。詳見 [LICENSE](LICENSE)。
