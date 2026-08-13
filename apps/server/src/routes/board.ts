import { Hono } from 'hono';
import { currentCheckinDay } from '@healthy-life/shared';
import { getGroupById, listCheckinsForGroup, listMembers } from '@healthy-life/db';
import type { AppDeps, Env } from '../types';

/**
 * 今日打卡墙：按群 visibility 返回。
 * - presence：仅返回是否已打卡（不含时间）
 * - exact：已打卡者返回精确打卡时间
 */
export function boardRoutes(deps: AppDeps): Hono<Env> {
  const router = new Hono<Env>();

  router.get('/board', (c) => {
    const member = c.get('member');
    const group = getGroupById(deps.db, member.groupId);
    if (!group) return c.json({ error: 'group not found' }, 404);

    const date = currentCheckinDay(group.timezone);
    const members = listMembers(deps.db, group.id);
    const checkins = listCheckinsForGroup(deps.db, group.id, date, date);
    const checkinByMember = new Map(checkins.map((ci) => [ci.memberId, ci]));

    const entries = members.map((m) => {
      const ci = checkinByMember.get(m.id);
      if (group.visibility === 'exact' && ci) {
        return {
          memberId: m.id,
          nickname: m.nickname,
          emoji: m.emoji,
          checkedIn: true,
          checkedInAt: ci.checkedInAt,
        };
      }
      return {
        memberId: m.id,
        nickname: m.nickname,
        emoji: m.emoji,
        checkedIn: Boolean(ci),
      };
    });

    return c.json({ date, visibility: group.visibility, members: entries });
  });

  return router;
}
