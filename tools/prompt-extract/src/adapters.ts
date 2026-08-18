/**
 * 题目来源适配器：把「原始内容」（科普文章 / RSS 条目）喂给 LLM 构造谜题。
 *
 * 设计：原始形态不必是题目——可以是科普、论文摘要、播客文字稿。
 * 由 LLM 分析后重构成「现象入口 + 引导思考」的睡前思考题，
 * 并锚定来源（source / sourceUrl），供人工审核时回溯原文。
 */

export interface SourceItem {
  title: string;
  /** 正文/摘要（去掉 HTML 标签） */
  text: string;
  url?: string;
  publishedAt?: string;
}

/** 解析 RSS/Atom XML 的最简实现（不引入 XML 库）。 */
export function parseRss(xml: string): SourceItem[] {
  const items: SourceItem[] = [];
  const itemRe = /<(item|entry)[^>]*>([\s\S]*?)<\/(item|entry)>/g;
  const textOf = (block: string, tag: string): string => {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
    return m ? stripHtml(m[1]) : '';
  };
  const stripHtml = (s: string): string =>
    s
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();

  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const block = m[2];
    const title = textOf(block, 'title');
    const text = textOf(block, 'description') || textOf(block, 'summary') || textOf(block, 'content');
    const link = textOf(block, 'link') || textOf(block, 'guid');
    const publishedAt = textOf(block, 'pubDate') || textOf(block, 'updated') || textOf(block, 'published');
    if (!title && !text) continue;
    items.push({ title, text, url: link || undefined, publishedAt: publishedAt || undefined });
  }
  return items;
}

/** 抓取一个 RSS/Atom 源。 */
export async function fetchRss(url: string): Promise<SourceItem[]> {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`抓取 ${url} 失败：HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseRss(xml);
  if (items.length === 0) throw new Error(`源 ${url} 没有解析到条目`);
  return items;
}

/** 内置源清单：可直接使用的稳定公开源（均可匿名访问）。 */
export const BUILTIN_SOURCES: Record<string, string> = {
  'arxiv-math': 'http://export.arxiv.org/rss/math',
  'arxiv-physics': 'http://export.arxiv.org/rss/physics',
  'arxiv-hep': 'http://export.arxiv.org/rss/hep-th',
  // 例：中科院物理所类中文源的 RSS 镜像可自行添加（如 RSSHub 实例）
  // 'cas-iop-rsshub': 'https://rsshub.app/...',
};
