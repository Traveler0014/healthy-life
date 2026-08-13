"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromptSource = createPromptSource;
const SAMPLE_PROMPTS = [
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
function createPromptSource(prompts = SAMPLE_PROMPTS) {
    return {
        randomPrompt(excludeIds = []) {
            const pool = prompts.filter((p) => !excludeIds.includes(p.id));
            const src = pool.length > 0 ? pool : prompts;
            return src[Math.floor(Math.random() * src.length)];
        },
        list() {
            return [...prompts];
        },
    };
}
//# sourceMappingURL=index.js.map