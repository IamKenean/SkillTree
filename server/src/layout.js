// Compute (x,y) layout for the skill tree.
// Group nodes by branch (column groups), and by tier (row).
// Result aims to roughly resemble a Path-of-Exile-style passive tree without overlap.

export function computeLayout(nodes, edges) {
  const byBranch = {};
  for (const n of nodes) (byBranch[n.branch || 'Core'] ||= []).push(n);

  const branches = Object.keys(byBranch);
  // Move "Core" branch to the center if present
  const orderedBranches = branches.slice().sort((a, b) => {
    if (a === 'Core') return -1;
    if (b === 'Core') return 1;
    return a.localeCompare(b);
  });

  const BRANCH_GAP = 360;
  const TIER_GAP = 170;
  const HORIZONTAL_JITTER = 130;

  const positions = {};

  // root node centered
  const root = nodes.find(n => n.tier === 0 && n.branch === 'Core');
  const centerX = ((orderedBranches.length - 1) * BRANCH_GAP) / 2;

  for (let i = 0; i < orderedBranches.length; i++) {
    const b = orderedBranches[i];
    const branchNodes = byBranch[b].slice().sort((a, x) => (a.tier - x.tier));
    const tierBuckets = {};
    for (const n of branchNodes) (tierBuckets[n.tier] ||= []).push(n);

    const baseX = i * BRANCH_GAP;
    for (const tier of Object.keys(tierBuckets)) {
      const list = tierBuckets[tier];
      const t = Number(tier);
      list.forEach((n, idx) => {
        const offset = (idx - (list.length - 1) / 2) * HORIZONTAL_JITTER;
        positions[n.id] = {
          x: baseX + offset,
          y: t * TIER_GAP,
        };
      });
    }
  }

  if (root) {
    positions[root.id] = { x: centerX, y: -TIER_GAP * 0.6 };
  }

  for (const n of nodes) {
    if (!positions[n.id]) {
      positions[n.id] = { x: 0, y: (n.tier || 0) * TIER_GAP };
    }
    n.position_x = positions[n.id].x;
    n.position_y = positions[n.id].y;
  }

  return nodes;
}
