/**
 * 睡前趣味思考题（哄睡工具）。
 *
 * 定位：用户已打卡、躺下却睡不着时，抽一道「闭眼可思考」的趣味题，
 * 帮助转移注意力、放慢大脑。题目**带答案**，但抽题接口睡前不返回答案——
 * 答案只在次日（该打卡日结束后）通过「历史题库」查看，绝不给睡前压力。
 *
 * 选题标准：直观有趣、有挑战，但不需要大量背景知识，闭眼就能想。
 */

export type PromptCategory = 'physics' | 'math' | 'algorithm' | 'game-theory';

export const PROMPT_CATEGORIES: PromptCategory[] = ['physics', 'math', 'algorithm', 'game-theory'];

export const CATEGORY_LABELS: Record<PromptCategory, string> = {
  physics: '物理',
  math: '数学',
  algorithm: '算法',
  'game-theory': '博弈论',
};

export interface ThinkPrompt {
  id: string;
  category: PromptCategory;
  question: string;
  answer: string;
}

const PROMPTS: ThinkPrompt[] = [
  {
    id: 'phy-01',
    category: 'physics',
    question:
      '你站在体重秤上坐电梯，电梯从静止开始加速上升的那一瞬间，体重秤的读数会变大、变小，还是不变？',
    answer:
      '变大。加速上升时，秤需要提供额外向上的力来改变你的运动状态（超重），所以读数大于真实体重；反过来，加速下降时读数会变小（失重）。',
  },
  {
    id: 'phy-02',
    category: 'physics',
    question: '一杯水里浮着一块冰，等冰完全融化后，水面会比原来上升、下降，还是不变？',
    answer:
      '不变。冰块排开的水的重量恰好等于冰自身的重量（浮力原理），冰融化成水后，体积正好填补了原来被排开的那部分，所以水位不变。',
  },
  {
    id: 'phy-03',
    category: 'physics',
    question: '在真空中，从同一高度同时释放一根羽毛和一个铁球，谁先落地？',
    answer:
      '同时落地。没有空气阻力时，所有物体下落的加速度都相同（自由落体），与质量、形状无关。伽利略正是靠这个思想实验推翻了「重的先落地」的直觉。',
  },
  {
    id: 'math-01',
    category: 'math',
    question:
      '游戏有三扇门，一扇后面有奖品，另两扇是空的。你先选一扇，主持人（知道答案）随后打开一扇你未选的空门，问你要不要换到剩下的那扇门。换门中奖的概率是多少？',
    answer:
      '2/3。你最初选对的概率是 1/3，选错的概率是 2/3；当你选错时，主持人打开空门后剩下的那扇一定是奖品，所以换门中奖的概率 = 你最初选错的概率 = 2/3。换门更好。',
  },
  {
    id: 'math-02',
    category: 'math',
    question: '0.999…（9 无限循环下去）等于 1 吗？',
    answer:
      '等于 1。设 x = 0.999…，则 10x = 9.999…，相减得 9x = 9，所以 x = 1。它只是 1 的另一种写法。',
  },
  {
    id: 'math-03',
    category: 'math',
    question:
      '一张纸约 0.1 毫米厚，每对折一次厚度翻倍。对折 42 次后，厚度能超过地球到月亮的距离（约 38 万公里）吗？',
    answer:
      '能，而且远超。0.1mm × 2^42 ≈ 0.1mm × 4.4 万亿 ≈ 44 万公里，已经超过地月距离。指数增长的威力远超直觉。',
  },
  {
    id: 'alg-01',
    category: 'algorithm',
    question:
      '有 8 枚外观完全相同的金币，其中 1 枚更重一点。用一台无砝码的天平，最少称几次一定能找出这枚重币？',
    answer:
      '2 次。第一次称 3 枚对 3 枚：若平衡，重币在剩下 2 枚里，再称 1 次即可；若不平衡，重币在较重那 3 枚里，取其中 2 枚再称 1 次即可确定。',
  },
  {
    id: 'alg-02',
    category: 'algorithm',
    question:
      '有 100 层楼和 2 个鸡蛋。鸡蛋从某层楼及以上丢下会碎，以下不会碎。最少丢几次，能确定这个「临界层」？',
    answer:
      '14 次。从 14 层开始，每次把跨度减 1（14、27、39、50…），第一个鸡蛋碎了就用第二个从上一个安全层逐层试。14+13+12+…+1 = 105 ≥ 100，保证 14 次内确定。',
  },
  {
    id: 'alg-03',
    category: 'algorithm',
    question:
      '农夫要带狼、羊、一筐白菜过河，船一次只能载农夫加一样东西。狼会吃羊、羊会吃白菜，但农夫在场时不会。怎么安全过河？',
    answer:
      '先带羊过去；空船回来，带狼过去；再把羊带回来；带白菜过去；最后空船回来，把羊带过去。',
  },
  {
    id: 'game-01',
    category: 'game-theory',
    question:
      '两个同伙被抓，分开审讯。都沉默各判 1 年；一人坦白则坦白者释放、另一人判 10 年；都坦白各判 5 年。两人都只想让自己坐牢最短，会怎样？',
    answer:
      '都坦白，各判 5 年。无论对方选什么，「坦白」对自己都更优（对方沉默则 0 年 < 1 年，对方坦白则 5 年 < 10 年），所以坦白是双方的主导策略——尽管合作沉默对整体更好。',
  },
  {
    id: 'game-02',
    category: 'game-theory',
    question:
      '桌上有 N 枚硬币，两人轮流取，每次可取 1、2 或 3 枚，取走最后一枚的人获胜。先手有必胜策略吗？',
    answer:
      '只要 N 不是 4 的倍数，先手必胜：先取到让剩余硬币数成为 4 的倍数（如 N=10 先取 2 剩 8），之后每次对方取 x 枚，你就取 4-x 枚，始终保持剩余是 4 的倍数，最后必能取到最后一枚。N 是 4 的倍数则后手用同样策略获胜。',
  },
  {
    id: 'game-03',
    category: 'game-theory',
    question:
      '两人分 100 元：A 提出分配方案，B 只能接受或拒绝——接受则按方案分，拒绝则两人都拿 0。若两人都只关心自己拿多少，A 该提什么方案？',
    answer:
      '理论上 A 给 B 1 元（自己 99）：对 B 来说 1 元 > 0 元，理性会接受。但行为实验发现，分得太少（如低于 30%）时 B 常因「不公平」而拒绝，宁可同归于尽。',
  },
];

export function listPrompts(): ThinkPrompt[] {
  return [...PROMPTS];
}

export function getPromptById(id: string): ThinkPrompt | undefined {
  return PROMPTS.find((p) => p.id === id);
}

/**
 * 随机抽一道题。
 * @param categories 限定的领域；空 / undefined 表示全部领域。
 * @param excludeIds 要排除的题（已抽过的题，尽量给新题）。
 */
export function randomPrompt(
  categories?: PromptCategory[],
  excludeIds: string[] = [],
): ThinkPrompt {
  const pool = PROMPTS.filter(
    (p) =>
      (!categories || categories.length === 0 || categories.includes(p.category)) &&
      !excludeIds.includes(p.id),
  );
  const src = pool.length > 0 ? pool : PROMPTS;
  return src[Math.floor(Math.random() * src.length)];
}
