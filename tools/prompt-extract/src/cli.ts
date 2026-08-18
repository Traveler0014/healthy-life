/**
 * CLI 入口：pnpm --filter @healthy-life/prompt-extract extract --source <源> [--limit N] [--out <目录>]
 *
 * 用法示例：
 *   pnpm --filter @healthy-life/prompt-extract extract --source arxiv-math --limit 5
 *   pnpm --filter @healthy-life/prompt-extract extract --source rss:https://example.com/feed.xml --limit 8 --out content/prompts/drafts
 *
 * 产出：一个 draft 题目包 JSON（status: draft, version: 0.x），供人工审核后发布。
 * 环境变量：OPENAI_API_KEY（必填）、OPENAI_BASE_URL、OPENAI_MODEL。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { BUILTIN_SOURCES, fetchRss } from './adapters';
import { buildDraftBundle } from './builder';
import { loadLlmOptions } from './llm';

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : 'true';
      out[key.slice(2)] = value;
      if (value !== 'true') i += 1;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const source = args.source ?? 'arxiv-math';
  const limit = Number(args.limit ?? 5);
  const outDir = args.out ?? 'content/prompts/drafts';

  const rssUrl = source.startsWith('rss:') ? source.slice(4) : BUILTIN_SOURCES[source];
  if (!rssUrl) {
    throw new Error(`未知源：${source}。可用：${Object.keys(BUILTIN_SOURCES).join(', ')} 或 rss:<url>`);
  }

  const llm = loadLlmOptions();
  console.log(`[extract] 抓取源 ${rssUrl} ...`);
  const items = await fetchRss(rssUrl);
  console.log(`[extract] 得到 ${items.length} 条素材，取前 ${limit} 条交给 LLM 构造...`);

  const date = new Date().toISOString().slice(0, 10);
  const bundleId = `extracted-${source.replace(/[^a-z0-9]/gi, '-')}-${date}`;
  const { bundle, errors } = await buildDraftBundle(llm, bundleId, `AI 提取（${source} ${date}）`, items, limit);

  for (const err of errors) console.warn(`[extract] 跳过：${err}`);
  if (!bundle) {
    console.error('[extract] 没有成功构造任何题目');
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  const file = join(outDir, `${bundleId}.json`);
  writeFileSync(file, JSON.stringify(bundle, null, 2) + '\n');
  console.log(
    `[extract] 完成：${bundle.prompts.length} 题 draft 包已写入 ${resolve(file)}（分类：${bundle.categories.map((c) => c.id).join(', ')}）`,
  );
}

main().catch((err) => {
  console.error(`[extract] 失败：${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
