import { fetchBundleText, parseBundleText } from '@healthy-life/prompts';
import { importBundle } from '@healthy-life/db';
import type { JobDeps } from '../types';

/**
 * 题库自动更新（每日 03:10）：
 * - 从 config.promptBundleUrl（如 GitHub Release 上的 bundle.json）拉取题目包
 * - 校验后按 id upsert 导入 DB（幂等：内容不变则跳过）
 * - 未配置 URL 时静默跳过
 */
export async function runPromptBundleUpdate(deps: JobDeps): Promise<void> {
  const { config, db } = deps;
  if (!config.promptBundleUrl || config.promptBundleUrl.trim() === '') {
    console.log('[jobs] prompt bundle update skipped (PROMPT_BUNDLE_URL not set)');
    return;
  }

  const started = Date.now();
  try {
    const text = await fetchBundleText(config.promptBundleUrl.trim());
    const bundle = parseBundleText(text);
    const result = importBundle(db, bundle);
    if (result.errors.length > 0) {
      console.error(`[jobs] prompt bundle import has errors: ${result.errors.join('；')}`);
    }
    console.log(
      `[jobs] prompt bundle updated: ${result.bundleName} v${result.version} ` +
        `(imported=${result.imported} updated=${result.updated} skipped=${result.skipped} errors=${result.errors.length}, ${Date.now() - started}ms)`,
    );
  } catch (err) {
    console.error(`[jobs] prompt bundle update failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
