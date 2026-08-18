# 题目包内容目录

- `drafts/`：AI 提取工具产出的草稿包（`status: "draft"`，version 0.x），由 `.github/workflows/prompt-extract.yml` 定时生成并开 PR。
- `published/`：人工审核通过的题目包（`status: "published"`），由 `.github/workflows/prompt-release.yml` 手动触发发布为 GitHub Release 产物。

## 发布流程（完整闭环）

1. **提取**：`prompt-extract` workflow 每周一跑 AI，从公开源（arXiv RSS 等）抓素材 → LLM 构造谜题 → 产出 draft 包 → 开 PR
2. **审核**：人工 review PR——核对答案准确性、来源可溯、风格符合「现象入口 + 证否直觉 + 深度答案」；把 `status` 改为 `published`、`version` 改为正式版（如 1.0.0）后合并
3. **发布**：手动触发 `prompt-release` workflow → 校验 → 打 tag → GitHub Release 附带各 bundle.json
4. **消费**：服务端配置 `PROMPT_BUNDLE_URL` 指向 release 上的 bundle.json（jobs 每天 03:10 自动拉取导入）；或 admin 后台手动导入

## 题目包契约

见 `docs/07-prompt-bundle.md`。任何包（内置/外部/AI 提取）导入前都会过 `validateBundle`。
