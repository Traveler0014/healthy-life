import type { Db } from '../client';
import { randomUUID } from 'node:crypto';
import type { Prompt, PromptBundle } from '@healthy-life/prompts';

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

// ---------------------------------------------------------------------------
// prompts 题库表（V7）：题目存 DB，admin 在线导入/编辑/上下线，抽题读 DB
// ---------------------------------------------------------------------------

export type PromptStatus = 'active' | 'disabled';

export interface PromptRecord extends Prompt {
  bundleId: string;
  version: string;
  status: PromptStatus;
  createdAt: string;
  updatedAt: string;
}

interface PromptRow {
  id: string;
  bundle_id: string;
  category: string;
  question: string;
  answer: string;
  source: string;
  source_url: string;
  author: string;
  difficulty: number;
  version: string;
  status: string;
  created_at: string;
  updated_at: string;
}

function toPromptRecord(r: PromptRow): PromptRecord {
  return {
    id: r.id,
    bundleId: r.bundle_id,
    category: r.category,
    question: r.question,
    answer: r.answer,
    source: r.source,
    sourceUrl: r.source_url || undefined,
    author: r.author || undefined,
    difficulty: (r.difficulty as Prompt['difficulty']) ?? 2,
    version: r.version,
    status: r.status as PromptStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function getPrompt(db: Db, id: string): PromptRecord | undefined {
  const row = db.prepare(`SELECT * FROM prompts WHERE id = ?`).get(id) as PromptRow | undefined;
  return row ? toPromptRecord(row) : undefined;
}

export interface PromptCategoryRow {
  id: string;
  label: string;
  bundleId: string;
}

/** 题库分类（label 随包导入，供前端抽题面板/历史题库展示） */
export function listPromptCategories(db: Db): PromptCategoryRow[] {
  const rows = db.prepare(`SELECT * FROM prompt_categories ORDER BY id`).all() as Array<{
    id: string;
    label: string;
    bundle_id: string;
  }>;
  return rows.map((r) => ({ id: r.id, label: r.label, bundleId: r.bundle_id }));
}

function upsertPromptCategories(db: Db, bundle: PromptBundle): void {
  const now = new Date().toISOString();
  const stmt = db.prepare(
    `INSERT INTO prompt_categories (id, label, bundle_id, updated_at) VALUES (@id, @label, @bundleId, @now)
     ON CONFLICT(id) DO UPDATE SET label = @label, bundle_id = @bundleId, updated_at = @now`,
  );
  for (const cat of bundle.categories) {
    stmt.run({ id: cat.id, label: cat.label, bundleId: bundle.id, now });
  }
}

/** 上架题目池（抽题用） */
export function listActivePrompts(db: Db): PromptRecord[] {
  const rows = db.prepare(`SELECT * FROM prompts WHERE status = 'active'`).all() as PromptRow[];
  return rows.map(toPromptRecord);
}

/** 全部题目（admin 管理用） */
export function listPrompts(db: Db, status?: PromptStatus | 'all'): PromptRecord[] {
  const rows =
    status && status !== 'all'
      ? (db.prepare(`SELECT * FROM prompts WHERE status = ? ORDER BY category, id`).all(status) as PromptRow[])
      : (db.prepare(`SELECT * FROM prompts ORDER BY category, id`).all() as PromptRow[]);
  return rows.map(toPromptRecord);
}

export function promptCount(db: Db): number {
  const r = db.prepare(`SELECT count(*) AS c FROM prompts`).get() as { c: number };
  return r.c;
}

function upsertPromptRow(db: Db, b: PromptBundle, p: Prompt): 'inserted' | 'updated' | 'skipped' {
  const existing = db.prepare(`SELECT question, answer, source, version FROM prompts WHERE id = ?`).get(p.id) as
    | { question: string; answer: string; source: string; version: string }
    | undefined;
  const now = new Date().toISOString();
  const fields = {
    id: p.id,
    bundleId: b.id,
    category: p.category,
    question: p.question,
    answer: p.answer,
    source: p.source,
    sourceUrl: p.sourceUrl ?? '',
    author: p.author ?? '',
    difficulty: p.difficulty ?? 2,
    version: b.version,
    now,
  };
  if (!existing) {
    db.prepare(
      `INSERT INTO prompts (id, bundle_id, category, question, answer, source, source_url, author, difficulty, version, status, created_at, updated_at)
       VALUES (@id, @bundleId, @category, @question, @answer, @source, @sourceUrl, @author, @difficulty, @version, 'active', @now, @now)`,
    ).run(fields);
    return 'inserted';
  }
  const unchanged =
    existing.question === p.question && existing.answer === p.answer && existing.source === p.source;
  if (unchanged && existing.version === b.version) return 'skipped';
  db.prepare(
    `UPDATE prompts SET bundle_id=@bundleId, category=@category, question=@question, answer=@answer,
     source=@source, source_url=@sourceUrl, author=@author, difficulty=@difficulty, version=@version, updated_at=@now
     WHERE id=@id`,
  ).run(fields);
  return 'updated';
}

export interface BundleImportResult {
  bundleId: string;
  bundleName: string;
  version: string;
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/** 导入一个题目包（按 id upsert，幂等）。外部包需要已通过 validateBundle。 */
export function importBundle(db: Db, bundle: PromptBundle): BundleImportResult {
  const result: BundleImportResult = {
    bundleId: bundle.id,
    bundleName: bundle.name,
    version: bundle.version,
    imported: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };
  const tx = db.transaction(() => {
    upsertPromptCategories(db, bundle);
    for (const p of bundle.prompts) {
      try {
        const outcome = upsertPromptRow(db, bundle, p);
        if (outcome === 'inserted') result.imported += 1;
        else if (outcome === 'updated') result.updated += 1;
        else result.skipped += 1;
      } catch (err) {
        result.errors.push(`${p.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  });
  tx();
  return result;
}

/** 首次启动 seed：prompts 表为空时导入内置包 */
export function seedPromptsFromBundle(db: Db, bundle: PromptBundle): BundleImportResult | null {
  if (promptCount(db) > 0) return null;
  return importBundle(db, bundle);
}

export function updatePrompt(
  db: Db,
  id: string,
  patch: Partial<Pick<Prompt, 'category' | 'question' | 'answer' | 'source' | 'sourceUrl' | 'author' | 'difficulty'>> & {
    status?: PromptStatus;
  },
): PromptRecord | undefined {
  const fields: string[] = [];
  const params: Record<string, unknown> = { id };
  if (patch.category !== undefined) {
    fields.push('category = @category');
    params.category = patch.category;
  }
  if (patch.question !== undefined) {
    fields.push('question = @question');
    params.question = patch.question;
  }
  if (patch.answer !== undefined) {
    fields.push('answer = @answer');
    params.answer = patch.answer;
  }
  if (patch.source !== undefined) {
    fields.push('source = @source');
    params.source = patch.source;
  }
  if (patch.sourceUrl !== undefined) {
    fields.push('source_url = @sourceUrl');
    params.sourceUrl = patch.sourceUrl;
  }
  if (patch.author !== undefined) {
    fields.push('author = @author');
    params.author = patch.author;
  }
  if (patch.difficulty !== undefined) {
    fields.push('difficulty = @difficulty');
    params.difficulty = patch.difficulty;
  }
  if (patch.status !== undefined) {
    fields.push('status = @status');
    params.status = patch.status;
  }
  if (fields.length === 0) return getPrompt(db, id);
  fields.push('updated_at = @now');
  params.now = new Date().toISOString();
  db.prepare(`UPDATE prompts SET ${fields.join(', ')} WHERE id = @id`).run(params);
  return getPrompt(db, id);
}

export function deletePrompt(db: Db, id: string): void {
  db.prepare(`DELETE FROM prompts WHERE id = ?`).run(id);
}
