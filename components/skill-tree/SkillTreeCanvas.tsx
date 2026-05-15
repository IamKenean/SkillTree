"use client";

import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { SkillNode } from "./SkillNode";
import type { SkillTreeSnapshot } from "@/lib/skill-tree-types";

const nodeTypes = { skill: SkillNode };

type Props = {
  tree: SkillTreeSnapshot;
  onSelect: (nodeId: string | null) => void;
  selectedId: string | null;
};

function SkillTreeCanvasInner({ tree, onSelect, selectedId }: Props) {
  const initialNodes: Node[] = useMemo(
    () =>
      tree.nodes.map((n) => ({
        id: n.id,
        type: "skill",
        position: n.position,
        data: n.data,
        selected: n.id === selectedId,
      })),
    [tree.nodes, selectedId],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      tree.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: false,
        style: { stroke: "rgba(148,163,184,0.35)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(148,163,184,0.45)" },
      })),
    [tree.edges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      tree.nodes.map((n) => ({
        id: n.id,
        type: "skill",
        position: n.position,
        data: n.data,
        selected: n.id === selectedId,
      })),
    );
    setEdges(
      tree.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        style: { stroke: "rgba(148,163,184,0.35)", strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(148,163,184,0.45)" },
      })),
    );
  }, [tree, selectedId, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelect(node.id);
    },
    [onSelect],
  );

  const onPaneClick = useCallback(() => {
    onSelect(null);
  }, [onSelect]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      fitView
      minZoom={0.35}
      maxZoom={1.4}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(148,163,184,0.12)" />
      <Controls className="!bg-slate-900/90 !border-slate-700 !shadow-lg" />
      <MiniMap
        className="!bg-slate-900/90 !border-slate-700"
        nodeColor={(n) => {
          const s = (n.data as { status?: string })?.status;
          if (s === "completed") return "#34d399";
          if (s === "available") return "#22d3ee";
          return "#475569";
        }}
      />
    </ReactFlow>
  );
}

export function SkillTreeCanvas(props: Props) {
  return (
    <div className="h-[min(78vh,720px)] w-full rounded-2xl border border-slate-800/80 bg-slate-950/40">
      <ReactFlowProvider>
        <SkillTreeCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
