import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type NodeMouseHandler,
  BackgroundVariant,
} from '@xyflow/react';
import type { SkillNode, SkillEdge } from '../lib/api';
import { SkillNodeCard } from './SkillNodeCard';

const nodeTypes = { skill: SkillNodeCard };

export function SkillTree({
  nodes,
  edges,
  newNodeIds,
  selectedId,
  onNodeClick,
}: {
  nodes: SkillNode[];
  edges: SkillEdge[];
  newNodeIds?: Set<string>;
  selectedId: string | null;
  onNodeClick: (n: SkillNode) => void;
}) {
  const byId = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes]);

  const rfNodes: Node[] = useMemo(() => nodes.map(n => ({
    id: n.id,
    type: 'skill',
    position: { x: n.position_x ?? 0, y: n.position_y ?? 0 },
    data: {
      title: n.title,
      description: n.description,
      branch: n.branch,
      status: n.status,
      rarity: n.rarity,
      xp_reward: n.xp_reward,
      tier: n.tier,
      is_hidden: n.is_hidden,
      isRoot: n.tier === 0 && n.branch === 'Core',
      isNew: newNodeIds?.has(n.id),
    },
    selected: selectedId === n.id,
    draggable: false,
    selectable: true,
  })), [nodes, newNodeIds, selectedId]);

  const rfEdges: Edge[] = useMemo(() => edges.map(e => {
    const tgt = byId.get(e.target);
    const src = byId.get(e.source);
    const completed = tgt?.status === 'completed' || src?.status === 'completed';
    const available = !completed && tgt?.status === 'available';
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      className: completed ? 'completed' : available ? 'available' : '',
      animated: false,
    };
  }), [edges, byId]);

  const handleClick: NodeMouseHandler = useCallback((_, n) => {
    const data = byId.get(n.id);
    if (data) onNodeClick(data);
  }, [byId, onNodeClick]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      onNodeClick={handleClick}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 600 }}
      minZoom={0.2}
      maxZoom={1.4}
      proOptions={{ hideAttribution: true }}
      panOnScroll
      selectionOnDrag={false}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable
    >
      <Background variant={BackgroundVariant.Dots} gap={28} size={1.2} color="rgba(255,255,255,0.06)" />
      <Controls position="bottom-right" showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeStrokeWidth={0}
        nodeColor={(n) => {
          const d = (n.data as any) || {};
          if (d.status === 'completed') return '#f5c042';
          if (d.status === 'available') return '#56b5ff';
          return '#3a3f6e';
        }}
        maskColor="rgba(7,8,17,0.7)"
        style={{ background: 'rgba(20,23,51,0.85)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12 }}
      />
    </ReactFlow>
  );
}
