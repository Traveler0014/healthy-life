# 08 · 独立题目仓库（prompt-repo）设计

> 上一节：[07-prompt-bundle.md](./07-prompt-bundle.md) 定义了「题目包」契约与消费端能力。
> 本节细化：**题目内容如何在一个独立的 git 仓库里维护、审核、发布，并被本仓库消费。**

## 0. 定位与边界

- **本仓库（healthy-life）**：只负责「消费」题目包 —— 契约 + 校验 + 导入 + 落库 + 抽题。见 07。
- **独立题目仓库（建议命名 `healthy-life-prompts`）**：只负责「生产」题目包 —— 写题、审核、构建、发布。**不含任何业务代码**。

两者唯一的接口是 **一个 JSON 文件（`bundle.json`）**，通过 URL 交换。任何一方改动都不要求同步发版另一方。

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  healthy-life-prompts 仓库   │  bundle │        healthy-life 主仓库     │
│  写题 YAML → build → bundle  │ ──────► │  validate → import → DB → 抽题 │
│  → GitHub Release 产物       │  (URL)  │  (jobs 03:10 / admin 手动)    │
└─────────────────────────────┘        └──────────────────────────────┘
```

## 1. 仓库目录结构

```
healthy-life-prompts/
├── README.md                  # 写题契约 + 投稿流程（给题目贡献者看）
├── bundle.schema.json         # 契约 JSON Schema（从主仓库 docs/ 同步，见 §3）
├── bundle.yaml                # 包元信息：id / name / version / status / updatedAt
├── categories.yaml            # 分类定义（id → label）
├── prompts/                   # 单题一个文件（YAML），方便 diff / 审阅 / 讨论
│   ├── cosmos-01.yaml
│   ├── cosmos-02.yaml
│   └── ...
├── scripts/
│   ├── build.mjs              # 聚合 bundle.yaml + categories.yaml + prompts/*.yaml → dist/bundle.json
│   └── validate.mjs           # 用 JSON Schema + 跨字段规则校验（build 前调用）
├── dist/
│   └── bundle.json            # 构建产物（发布用，可 gitignore）
├── .github/workflows/
│   └── release.yml            # push tag v* 时：校验 → build → 发布 GitHub Release
└── CHANGELOG.md               # 每个版本新增/修改了哪些题
```

## 2. 题目源文件格式（单题一个 YAML）

用 YAML 而非 JSON：`|` 块标量让长文本（题目/解答）免转义、可读性好；单题单文件让 PR diff 干净、便于单题讨论。

`prompts/cosmos-01.yaml` 示例：

```yaml
id: cosmos-01              # 包内唯一；发布后不可改（是 DB 主键）
category: cosmos           # 必须出现在 categories.yaml
difficulty: 3              # 1 轻松 / 2 要想一阵 / 3 想不完正好睡着
source: 奥伯斯佯谬（Olbers' Paradox）；费曼《QED》
sourceUrl: https://en.wikipedia.org/wiki/Olbers%27_paradox   # 可选
author: 张三                # 可选，贡献者昵称
status: published          # 仓库内部流程字段：draft = 待审核，published = 可发布
question: |
  满天都是星星，每一颗都像太阳一样在发光。如果宇宙无限大、星星无限多，
  那么无论朝哪个方向看，视线迟早会碰到一颗星星，夜空应该亮得晃眼——可它偏偏是黑的。
  问题出在哪？先别急着说"夜晚地球背对太阳"，把"星星=太阳"这个设定放进去，再想一层。
answer: |
  三层递进：① 宇宙年龄有限，远处星光"还没到"……（后略）
```

`bundle.yaml` 示例：

```yaml
schemaVersion: 1
id: hl-community              # 包标识（≠ 内置包 healthy-life-core，见 §7）
name: 社区题库
version: 1.2.0                # semver，改动后 bump
updatedAt: 2026-08-20T00:00:00.000Z
status: published             # draft 包不应发布
```

`categories.yaml` 示例：

```yaml
- id: cosmos
  label: 天文宇宙
- id: thermal
  label: 冷与热
```

> **注意**：`prompts/*.yaml` 里的 `status` 是**仓库内部流程字段**，不出现在发布产物里。
> `build.mjs` 只把 `status: published` 的题聚合进 `bundle.prompts`；`draft` 题留在仓库里等待审核。

## 3. 契约对齐（如何避免两份校验漂移）

契约的机器可读真相是 **JSON Schema**（`docs/prompt-bundle.schema.json`，本仓库维护），
题目仓库把它复制进自己的 `bundle.schema.json` 用于 CI 校验。

对齐规则：

1. **本仓库**：`packages/prompts/src/types.ts` 的 `validateBundle()` 是运行时校验，
   其规则与 `docs/prompt-bundle.schema.json` **一一对应**（长度限制、必填、枚举一致）。
   改契约时两处一起改，并在 `packages/prompts` 加单测兜底。
2. **题目仓库**：CI 用 `ajv` 加载 `bundle.schema.json` 校验构建产物，
   再补 JSON Schema 表达不了的**跨字段规则**（见下）。

JSON Schema 表达不了、需脚本额外校验的规则：

- `prompt.category` 必须存在于 `categories[].id`；
- `prompts[].id` 与 `categories[].id` 无重复；
- `version` 符合 semver。

> 演进路径：若日后题目仓库和主仓库都想复用同一份「契约 + 校验」，
> 可把 `types.ts` 的校验抽成独立 npm 包（如 `@healthy-life/prompt-bundle`），两边都依赖。
> 现阶段不引入 npm 发布成本，用「JSON Schema 单一真相 + 复制」足够。

## 4. 出题流水线（draft → 审核 → published → release）

```
投稿 PR（status: draft）
   │
   ▼ CI：validate.mjs 校验契约 + 风格（source 必填、长度、category 引用存在）
   │    ├─ 通过 → 等待人工审核
   │    └─ 失败 → 评论区反馈，打回
   ▼
人工审核（按写题风格契约，见 07 §二 / packages/prompts/core.ts 头注释）：
   ├─ 入口低 / 出口深 / 证否直觉 / source 可信
   ▼
审核通过 → 把 status 改为 published，合并 PR
   ▼
bump bundle.yaml 的 version → 打 tag v1.2.0
   ▼
release.yml：build → 校验 → 发布 GitHub Release（附 dist/bundle.json）
   ▼
主仓库 jobs 次日 03:10 拉取（或 admin 手动导入），幂等 upsert 到 DB
```

## 5. 构建与发布（脚本 + CI 骨架）

`scripts/build.mjs`（Node ≥18，依赖 `js-yaml`）：

```js
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import yaml from 'js-yaml';

const root = resolve(import.meta.dirname, '..');
const meta = yaml.load(readFileSync(resolve(root, 'bundle.yaml'), 'utf8'));
const categories = yaml.load(readFileSync(resolve(root, 'categories.yaml'), 'utf8'));

const prompts = readdirSync(resolve(root, 'prompts'))
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => yaml.load(readFileSync(resolve(root, 'prompts', f), 'utf8')))
  .filter((p) => p.status === 'published')      // draft 不入产物
  .map(({ status, ...p }) => p);                 // 去掉内部流程字段

const bundle = { ...meta, categories, prompts };
mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/bundle.json'), JSON.stringify(bundle, null, 2) + '\n');
console.log(`built dist/bundle.json: ${prompts.length} prompts`);
```

`.github/workflows/release.yml`（骨架）：

```yaml
name: release-bundle
on:
  push:
    tags: ['v*']
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: node scripts/validate.mjs dist/bundle.json   # 先 build 后校验，或脚本内联
      - uses: softprops/action-gh-release@v2
        with:
          files: dist/bundle.json
```

## 6. 与主仓库的衔接（消费侧，已就绪）

主仓库消费题目包的三条路径均已实现（见 07）：

1. **jobs 定时**：设 `PROMPT_BUNDLE_URL=<release 的 bundle.json 下载 URL>`，每天 03:10 自动拉取。
   - 例如 GitHub Release 的固定最新地址：`https://github.com/<owner>/healthy-life-prompts/releases/latest/download/bundle.json`
2. **admin 手动**：后台「题库管理」粘贴 JSON 或填 URL 导入。
3. **内置 seed**：`prompts` 表为空时自动导入 `CORE_BUNDLE`（保证零配置也能用）。

导入是**按题目 id 幂等 upsert**：同 id 内容+version 不变则跳过；变了则更新。因此题目仓库发新版后，主仓库每天自动收敛到最新。

## 7. id 命名空间约定（防跨包冲突）

导入时 DB 主键是 `prompt.id`（题目 id），`bundle_id` 只是记录来源字段。若两个包出现相同 `prompt.id`，后导入者覆盖先导入者。因此约定：

- 内置包 `healthy-life-core` 的题目使用短 id（`cosmos-01`、`thermal-01`…），**保留给主仓库独占**。
- 社区包**必须使用带前缀的题目 id**，例如 `hlx-cosmos-01`（`<包前缀>-<分类>-<序号>`），
  且**不得**以 `cosmos-`、`thermal-` 等内置包前缀开头，也不得使用 `healthy-life-core` 作为 bundle id。

## 8. 内置包处置（现有 15 题是否迁移）

主仓库目前内置 `CORE_BUNDLE`（`healthy-life-core`，15 题）作为「出厂种子」：`prompts` 表为空时自动导入，保证零配置可用。

两种处置，二选一：

- **方案 A（推荐）：内置包保留，独立仓库从社区题开始**。内置 15 题继续随主仓库发布、作为兜底种子；独立仓库专注「持续新增 + 社区投稿」，用 `hlx-` 前缀 id 发布社区包。优点：主仓库零配置依旧可用，迁移成本为零。
- **方案 B：全部迁移，主仓库只留最小兜底**。把 15 题迁到独立仓库（改 bundle id 与题目 id 前缀），主仓库 `CORE_BUNDLE` 清空或只留 1-2 题兜底。优点：题目单一来源；缺点：首次部署需配 `PROMPT_BUNDLE_URL` 才有题。

无论选哪种，**契约、消费端、导入逻辑都无需改动**，只有「题目数据放在哪个仓库」不同。

## 9. 演进路径（暂不实现，按需再上）

- **多主题多包**：当前消费端是「单 URL、单 bundle」。若题目仓库按主题拆多个包，
  可把 `PROMPT_BUNDLE_URL` 改为逗号分隔多 URL（jobs 逐个拉取），或让题目仓库产出一个**聚合 bundle.json**（初期建议）。
- **契约 npm 包**：把 `types.ts` + `validateBundle` 抽成 `@healthy-life/prompt-bundle`，主仓库与题目仓库都依赖，彻底消除契约漂移。
- **作者署名展示**：`author` 字段已入库，前端可在历史题库展示贡献者（Phase 4 可做）。
