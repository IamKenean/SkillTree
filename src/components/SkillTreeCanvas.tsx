import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Lock, Sparkles, Star } from 'lucide-react';
import { useMemo } from 'react';
import type { SkillNode, SkillTree } from '../shared/types.js';

type SkillTreeCanvasProps = {
  tree: SkillTree;
  selectedNodeId?: string;
  onSelectNode: (node: SkillNode) => void;
};

type SkillNodeData = {
  skill: SkillNode;
};

function SkillNodeCard({ data }: NodeProps<Node<SkillNodeData>>) {
  const { skill } = data;
  const isLocked = skill.status === 'locked';
  const isComplete = skill.status === 'complete';

  return (
<<<<<<< HEAD
    <button className={`skill-node ${skill.status} ${skill.rarity}`} type="button" aria-disabled={isLocked}>
=======
    <button className={`skill-node ${skill.status} ${skill.rarity}`} type="button" disabled={isLocked}>
>>>>>>> origin/main
      <Handle type="target" position={Position.Left} />
      <div className="node-glow" />
      <div className="node-topline">
        <span>{skill.branch}</span>
        <strong>{skill.xp} XP</strong>
      </div>
      <div className="node-icon">
        {isLocked ? <Lock size={18} /> : isComplete ? <Star size={18} /> : <Sparkles size={18} />}
      </div>
      <h3>{skill.title}</h3>
      <p>{skill.difficulty}</p>
      <Handle type="source" position={Position.Right} />
    </button>
  );
}

const nodeTypes = {
  skill: SkillNodeCard,
};

export function SkillTreeCanvas({ tree, selectedNodeId, onSelectNode }: SkillTreeCanvasProps) {
  const nodes = useMemo<Node<SkillNodeData>[]>(
    () =>
      tree.nodes
        .filter((skill) => !skill.hidden || skill.status !== 'locked')
        .map((skill) => ({
          id: skill.id,
          type: 'skill',
          position: skill.position,
          data: { skill },
          selected: skill.id === selectedNodeId,
          draggable: false,
        })),
    [selectedNodeId, tree.nodes],
  );

  const visible = new Set(nodes.map((node) => node.id));
  const edges = useMemo<Edge[]>(
    () =>
      tree.edges
        .filter((edge) => visible.has(edge.source) && visible.has(edge.target))
        .map((edge) => ({
          ...edge,
          animated: tree.nodes.find((node) => node.id === edge.target)?.status === 'unlocked',
          className: 'skill-edge',
        })),
    [tree.edges, tree.nodes, visible],
  );

  return (
    <div className="tree-shell">
      <ReactFlow
        key={`${tree.id}-${tree.nodes.length}-${tree.updatedAt}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.25}
        maxZoom={1.5}
        onNodeClick={(_, node) => onSelectNode(node.data.skill)}
      >
        <Background color="#284164" gap={28} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
