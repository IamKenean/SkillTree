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
import { NodePopover } from './NodePopover.js';
import { XpFloat } from './XpFloat.js';

type SkillTreeCanvasProps = {
  tree: SkillTree;
  selectedNodeId?: string;
  expandedNodeId?: string;
  completingNodeId?: string;
  xpBurst?: number;
  disabled?: boolean;
  onSelectNode: (node: SkillNode) => void;
  onExpandNode: (node: SkillNode) => void;
  onClosePopover: () => void;
  onComplete: (body: { nodeId: string; note: string; focusTags: string[]; proofUrl?: string }) => void;
  onXpBurstDone: () => void;
};

type SkillNodeData = {
  skill: SkillNode;
  isCompleting: boolean;
};

function SkillNodeCard({ data }: NodeProps<Node<SkillNodeData>>) {
  const { skill, isCompleting } = data;
  const isLocked = skill.status === 'locked';
  const isComplete = skill.status === 'complete';

  return (
    <button
      className={`skill-node ${skill.status} ${skill.rarity}${isCompleting ? ' completing' : ''}`}
      type="button"
      disabled={isLocked}
    >
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

export function SkillTreeCanvas({
  tree,
  selectedNodeId,
  expandedNodeId,
  completingNodeId,
  xpBurst,
  disabled,
  onSelectNode,
  onExpandNode,
  onClosePopover,
  onComplete,
  onXpBurstDone,
}: SkillTreeCanvasProps) {
  const expandedNode = expandedNodeId ? tree.nodes.find((node) => node.id === expandedNodeId) : undefined;

  const nodes = useMemo<Node<SkillNodeData>[]>(
    () =>
      tree.nodes
        .filter((skill) => !skill.hidden || skill.status !== 'locked')
        .map((skill) => ({
          id: skill.id,
          type: 'skill',
          position: skill.position,
          data: { skill, isCompleting: skill.id === completingNodeId },
          selected: skill.id === selectedNodeId,
          draggable: false,
        })),
    [completingNodeId, selectedNodeId, tree.nodes],
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
      <p className="tree-hint">Double-click a node to open details</p>
      <ReactFlow
        key={`${tree.id}-${tree.nodes.length}-${tree.updatedAt}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.25}
        maxZoom={1.5}
        onNodeClick={(_, node) => onSelectNode(node.data.skill)}
        onNodeDoubleClick={(_, node) => onExpandNode(node.data.skill)}
      >
        <Background color="#284164" gap={28} />
        <Controls />
      </ReactFlow>

      {expandedNode && (
        <NodePopover
          tree={tree}
          node={expandedNode}
          disabled={!!disabled}
          onClose={onClosePopover}
          onComplete={onComplete}
        />
      )}

      {xpBurst !== undefined && <XpFloat xp={xpBurst} onDone={onXpBurstDone} />}
    </div>
  );
}
