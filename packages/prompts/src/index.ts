/**
 * 睡前思考题（助眠工具）。
 *
 * 定位：用户已打卡、躺下却睡不着时，再次打开链接即可领取一道
 * 「闭眼可思考」的题目，帮助清空杂念、放慢大脑。睡着了 = 成功。
 *
 * 因此它**不是测验**：无判题、无对错压力、可随时中断。少数题目带答案，
 * 也只用于「次日清晨好奇时查看」，绝不要求睡前作答。
 */
export type PromptCategory =
  | 'visualization' // 想象/可视化
  | 'counting' // 数数
  | 'serial' // 序列心算
  | 'category' // 分类列举
  | 'spatial' // 空间/路线回忆
  | 'scenario'; // 情景放松

export interface SleepPrompt {
  id: string;
  category: PromptCategory;
  prompt: string;
  hasAnswer: boolean;
  answer?: string;
}

const SAMPLE_PROMPTS: SleepPrompt[] = [
  {
    id: 'vis-01',
    category: 'visualization',
    prompt: '闭上眼睛，想象你走进一间非常熟悉的老房子。从门口开始，尽量回忆每个房间的细节：门把手的样子、地板的颜色、家具的摆放……慢慢走，直到睡着。',
    hasAnswer: false,
  },
  {
    id: 'ser-01',
    category: 'serial',
    prompt: '从 1000 开始，每次减 7：1000、993、986……心算，保持缓慢稳定的节奏，算错了也没关系，重新开始。',
    hasAnswer: false,
  },
  {
    id: 'cat-01',
    category: 'category',
    prompt: '想一个类别，比如「水果」，然后按拼音首字母 A→Z 各想一个：苹果、菠萝、橙子……卡住就跳过，别着急。',
    hasAnswer: false,
  },
  {
    id: 'spa-01',
    category: 'spatial',
    prompt: '在脑海中重走你今天上下班（学）的路线，回忆每个路口、每栋楼、每棵树、每个红绿灯。走到哪算哪。',
    hasAnswer: false,
  },
  {
    id: 'cou-01',
    category: 'counting',
    prompt: '在心里从 1 数到 100，但每到 3 的倍数、或含数字 3 的数，就轻轻在心里说一声「跳过」。',
    hasAnswer: false,
  },
  {
    id: 'sce-01',
    category: 'scenario',
    prompt: '想象你躺在一片安静的海滩上，潮水有节奏地涨落。每次「退潮」，就放松身体的一个部位：脚趾、脚踝、小腿……一路向上到头顶。',
    hasAnswer: false,
  },
];

export interface PromptSource {
  randomPrompt(excludeIds?: string[]): SleepPrompt;
  list(): SleepPrompt[];
}

export function createPromptSource(prompts: SleepPrompt[] = SAMPLE_PROMPTS): PromptSource {
  return {
    randomPrompt(excludeIds: string[] = []) {
      const pool = prompts.filter((p) => !excludeIds.includes(p.id));
      const src = pool.length > 0 ? pool : prompts;
      return src[Math.floor(Math.random() * src.length)];
    },
    list() {
      return [...prompts];
    },
  };
}
