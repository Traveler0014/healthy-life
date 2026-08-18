import type { Db } from '../client';
import { randomUUID } from 'node:crypto';

export interface PromptClaim {
  id: string;
  memberId: string;
  promptId: string;
  category: string;
  date: string;
  claimedAt: string;
  createdAt: string;
}

interface PromptClaimRow {
  id: string;
  member_id: string;
  prompt_id: string;
  category: string;
  date: string;
  claimed_at: string;
  created_at: string;
}

function toClaim(r: PromptClaimRow): PromptClaim {
  return {
    id: r.id,
    memberId: r.member_id,
    promptId: r.prompt_id,
    category: r.category,
    date: r.date,
    claimedAt: r.claimed_at,
    createdAt: r.created_at,
  };
}

/** 记录一次抽题（不排重——同一题可被多次抽到，历史按时间展示）。 */
export function claimPrompt(
  db: Db,
  input: { memberId: string; promptId: string; category: string; date: string; claimedAt: string },
): PromptClaim {
  const claim: PromptClaim = {
    id: randomUUID(),
    memberId: input.memberId,
    promptId: input.promptId,
    category: input.category,
    date: input.date,
    claimedAt: input.claimedAt,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    `INSERT INTO prompt_claims (id, member_id, prompt_id, category, date, claimed_at, created_at)
     VALUES (@id, @memberId, @promptId, @category, @date, @claimedAt, @createdAt)`,
  ).run(claim);
  return claim;
}

export function listPromptClaimsForMember(db: Db, memberId: string): PromptClaim[] {
  const rows = db
    .prepare(`SELECT * FROM prompt_claims WHERE member_id = ? ORDER BY claimed_at`)
    .all(memberId) as PromptClaimRow[];
  return rows.map(toClaim);
}
