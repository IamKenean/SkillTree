import type { SkillTreeSnapshot } from "./skill-tree-types";

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function nextStreak(
  lastProgressDate: Date | null,
  streakDays: number,
  now: Date = new Date(),
): { streakDays: number; lastProgressDate: Date } {
  const today = dayKey(now);
  if (!lastProgressDate) {
    return { streakDays: 1, lastProgressDate: now };
  }
  const last = dayKey(lastProgressDate);
  if (last === today) {
    return { streakDays: Math.max(1, streakDays), lastProgressDate: lastProgressDate };
  }
  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yKey = dayKey(yesterday);
  if (last === yKey) {
    return { streakDays: streakDays + 1, lastProgressDate: now };
  }
  return { streakDays: 1, lastProgressDate: now };
}

/** Layered layout for a directed tree toward children (root top). */
export function layoutSkillTree(snapshot: SkillTreeSnapshot): SkillTreeSnapshot {
  const { rootId, edges } = snapshot;
  const children = new Map<string, string[]>();
  for (const e of edges) {
    if (!children.has(e.source)) children.set(e.source, []);
    children.get(e.source)!.push(e.target);
  }
  const layers: string[][] = [];
  let frontier = [rootId];
  const seen = new Set<string>([rootId]);
  while (frontier.length) {
    layers.push(frontier);
    const next: string[] = [];
    for (const id of frontier) {
      for (const c of children.get(id) ?? []) {
        if (!seen.has(c)) {
          seen.add(c);
          next.push(c);
        }
      }
    }
    frontier = next;
  }
  const xGap = 260;
  const yGap = 150;
  const pos = new Map<string, { x: number; y: number }>();
  layers.forEach((layer, depth) => {
    const width = (layer.length - 1) * xGap;
    layer.forEach((id, i) => {
      pos.set(id, { x: i * xGap - width / 2, y: depth * yGap });
    });
  });
  for (const n of snapshot.nodes) {
    const p = pos.get(n.id);
    if (p) {
      n.position = p;
    }
  }
  return snapshot;
}

export function applyCompletionStatuses(
  snapshot: SkillTreeSnapshot,
  completedIds: Set<string>,
): SkillTreeSnapshot {
  const { rootId, nodes } = snapshot;
  for (const n of nodes) {
    const prereqs = n.data.prerequisiteIds ?? [];
    const allDone = prereqs.every((id) => completedIds.has(id));
    if (completedIds.has(n.id)) {
      n.data.status = "completed";
    } else if (n.id === rootId || allDone) {
      n.data.status = "available";
    } else {
      n.data.status = "locked";
    }
  }
  return snapshot;
}

export function parseTreeJson(raw: string): SkillTreeSnapshot {
  const parsed = JSON.parse(raw) as SkillTreeSnapshot;
  return parsed;
}

export function serializeTree(snapshot: SkillTreeSnapshot): string {
  return JSON.stringify(snapshot);
}
