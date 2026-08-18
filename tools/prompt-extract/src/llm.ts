/**
 * LLM 调用（OpenAI Chat Completions 兼容格式，可通过环境变量指向任意兼容端点）。
 *
 * 环境变量：
 * - OPENAI_BASE_URL   默认 https://api.openai.com/v1
 * - OPENAI_API_KEY    必填
 * - OPENAI_MODEL      默认 gpt-4o-mini
 */

export interface LlmOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function loadLlmOptions(): LlmOptions {
  const apiKey = process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('缺少 OPENAI_API_KEY（AI 提取工具需要配置 LLM 密钥）');
  }
  return {
    baseUrl: (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/+$/, ''),
    apiKey,
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  };
}

/** 调用 LLM 并返回文本。要求模型以 JSON 输出时在 system 里写明。 */
export async function chat(
  llm: LlmOptions,
  system: string,
  user: string,
  maxTokens = 4096,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    const res = await fetch(`${llm.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llm.apiKey}`,
      },
      body: JSON.stringify({
        model: llm.model,
        temperature: 0.7,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM 请求失败：HTTP ${res.status} ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('LLM 返回为空');
    return content;
  } finally {
    clearTimeout(timer);
  }
}
