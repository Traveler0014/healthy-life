# 题目包契约与供应链（prompt bundle）

## 一、为什么是「题目包」

题库与代码分离：题目以 **JSON 题目包（PromptBundle）** 为单位交换，内置包随代码发布，外部包由 admin 导入（文件 / URL / 定时拉取）。任何来源的包导入前必须通过 `validateBundle`（`packages/prompts`）。

## 二、契约（schemaVersion = 1）

```jsonc
{
  "schemaVersion": 1,
  "id": "healthy-life-core",          // 包标识，导入时按 id upsert
  "name": "核心题库",
  "version": "1.0.0",                 // semver；同一 id 更高版本导入即更新
  "updatedAt": "2026-08-18T00:00:00.000Z",
  "status": "published",              // draft = 待审核 / published = 可发布
  "categories": [
    { "id": "cosmos", "label": "天文宇宙" }
  ],
  "prompts": [
    {
      "id": "cosmos-01",              // 包内唯一，跨包导入时作为 DB 主键
      "category": "cosmos",           // 须在 categories[] 中
      "question": "题目正文…",        // 现象入口 + 简单概念说明 + 引导思考（≤2000 字）
      "answer": "解答…",              // 先证否直觉答案，再给核心机制（≤4000 字）
      "source": "出处（必填）",        // 可信度锚点，如「费曼讲义 Vol I §32」
      "sourceUrl": "https://…",       // 可选
      "author": "可选",
      "difficulty": 2                 // 1 轻松 / 2 要想一阵 / 3 想不完正好睡着
    }
  ]
}
```

**写题风格契约**（内置包与 AI 提取共用，见 `packages/prompts/src/core.ts` 头注释）：
- 入口低：一句话能懂、来自日常现象，不要求背景知识
- 出口深：学过初中物理的人也不会秒解；答案多层推理、或反直觉需纠错、或开放无定论
- 题目内主动证否「最直觉但错误」的答案
- `source` 必填：无来源的题不导入

## 三、数据落库

题目导入 DB（`prompts` 表，V7 迁移），**抽题读库**——admin 上下线即时生效；历史抽题记录（`prompt_claims`）不随题目删除而消失，题目下线后历史只保留条目、不展示内容。

| 表 | 作用 |
|---|---|
| `prompts` | 题目本体：id / category / question / answer / source / difficulty / version / status(active\|disabled) |
| `prompt_categories` | 分类 label（随包导入，抽题面板/历史题库展示用） |
| `prompt_claims` | 抽题记录（category 为字符串，兼容旧分类数据） |

## 四、导入方式

1. **admin 后台**（`POST /api/v1/admin/prompts/import`）：粘贴 JSON（`bundleText`）或填发布产物 URL（`url`）。URL 仅限公网 http/https（SSRF 防护：拒绝内网/环回地址），大小 ≤5MB、超时 10s。
2. **jobs 定时**：配置 `PROMPT_BUNDLE_URL` 后，每天 03:10 自动拉取导入（幂等：内容不变跳过）。
3. **内置包 seed**：`prompts` 表为空时 server 启动自动导入 `CORE_BUNDLE`。

## 五、提取维护（不在本仓库）

**本仓库只定题目包规范与消费端导入能力；题目包的生成/审核/发布在独立的选题仓库或流程中维护**（例如：抓科普源 → AI 构造候选 → 人工审核 → 发布 release 产物）。产物只要符合本规范（`schemaVersion` 1 且通过 `validateBundle`），即可被本仓库导入：

1. **admin 后台**：粘贴 JSON（`bundleText`）或填发布产物 URL（`url`），手动导入
2. **jobs 定时**：配置 `PROMPT_BUNDLE_URL` 后每天 03:10 自动拉取导入（幂等：内容不变跳过）

外部仓库可参考的发布产物形态：单个 bundle JSON 文件（可置于任意静态托管 / GitHub Release），URL 供 admin 或 jobs 拉取。

> 独立题目仓库的具体落地（目录结构、单题 YAML 格式、构建/发布 CI、id 命名空间、契约 JSON Schema）见 [08-prompt-repo.md](./08-prompt-repo.md)。
