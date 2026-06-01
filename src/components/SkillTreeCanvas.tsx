import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Lock, Sparkles, Star } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import type { SkillNode, SkillTree } from '../shared/types.js';

type SkillTreeCanvasProps = {
  tree: SkillTree;
  selectedNodeId?: string;
  onSelectNode: (node: SkillNode) => void;
  onOpenNode: (node: SkillNode) => void;
};

type SkillNodeData = {
  skill: SkillNode;
  onSelect: (node: SkillNode) => void;
  onOpen: (node: SkillNode) => void;
};

function SkillNodeCard({ data, selected }: NodeProps<Node<SkillNodeData>>) {
  const { skill, onSelect, onOpen } = data;
  const isLocked = skill.status === 'locked';
  const isComplete = skill.status === 'complete';

  return (
    <div
      className={`skill-node nodrag nopan ${skill.status} ${skill.rarity}${selected ? ' selected' : ''}`}
      role="button"
      tabIndex={0}
      aria-disabled={isLocked}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(skill);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        onOpen(skill);
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(skill);
        }
      }}
    >
      <Handle type="target" position={Position.Left} />
      <div className="node-glow" aria-hidden="true" />
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
    </div>
  );
}

const nodeTypes = {
  skill: SkillNodeCard,
};

export function SkillTreeCanvas({ tree, selectedNodeId, onSelectNode, onOpenNode }: SkillTreeCanvasProps) {
  const graphNodes = useMemo(
    () =>
      tree.nodes
        .filter((skill) => !skill.hidden || skill.status !== 'locked')
        .map((skill) => ({
          id: skill.id,
          type: 'skill' as const,
          position: skill.position,
          data: {
            skill,
            onSelect: onSelectNode,
            onOpen: onOpenNode,
          },
          selected: skill.id === selectedNodeId,
          draggable: false,
          selectable: true,
        })),
    [onOpenNode, onSelectNode, selectedNodeId, tree.nodes],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(graphNodes);

  useEffect(() => {
    setNodes(graphNodes);
  }, [graphNodes, setNodes]);

  const visible = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes]);
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
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.25}
        maxZoom={1.5}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnScroll
        zoomOnDoubleClick={false}
        selectNodesOnDrag={false}
        noDragClassName="nodrag"
        noPanClassName="nopan"
      >
        <Background color="#284164" gap={28} />
        <Controls />
      </ReactFlow>
      <p className="tree-hint">Click a node to select it. Double-click (or press Enter) to open the quest menu.</p>
    </div>
  );
}
