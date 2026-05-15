import { useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  MiniMap,
} from "reactflow";
import type { Edge, Node, NodeMouseHandler } from "reactflow";
import "reactflow/dist/style.css";
import type { SkillNode } from "../types";

const statusColor = (status: SkillNode["status"]) => {
  if (status === "completed") {
    return "#3fd88b";
  }
  if (status === "unlocked") {
    return "#b38cff";
  }
  return "#4f566b";
};

const buildDepthMap = (nodes: SkillNode[]) => {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const memo = new Map<string, number>();

  const getDepth = (nodeId: string): number => {
    if (memo.has(nodeId)) {
      return memo.get(nodeId)!;
    }
    const node = byId.get(nodeId);
    if (!node || node.prerequisites.length === 0) {
      memo.set(nodeId, 0);
      return 0;
    }
    const depth = Math.max(...node.prerequisites.map((parentId) => getDepth(parentId))) + 1;
    memo.set(nodeId, depth);
    return depth;
  };

  nodes.forEach((node) => getDepth(node.id));
  return memo;
};

interface SkillTreeViewProps {
  nodes: SkillNode[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

export const SkillTreeView = ({ nodes, onSelectNode, selectedNodeId }: SkillTreeViewProps) => {
  const flowNodes = useMemo(() => {
    const depthMap = buildDepthMap(nodes);
    const groups = new Map<number, SkillNode[]>();

    for (const node of nodes) {
      const depth = depthMap.get(node.id) ?? 0;
      const group = groups.get(depth) ?? [];
      group.push(node);
      groups.set(depth, group);
    }

    const sortedDepths = [...groups.keys()].sort((a, b) => a - b);
    const result: Node[] = [];
    for (const depth of sortedDepths) {
      const group = groups.get(depth) ?? [];
      group.forEach((node, index) => {
        const y = index * 180 + 40;
        const x = depth * 280 + 40;
        result.push({
          id: node.id,
          position: { x, y },
          data: { label: node.title },
          draggable: false,
          selectable: true,
          style: {
            width: 220,
            borderRadius: 14,
            border:
              node.id === selectedNodeId
                ? "2px solid #f5f7ff"
                : `1px solid ${statusColor(node.status)}`,
            background:
              node.status === "completed"
                ? "linear-gradient(130deg, rgba(55, 224, 140, 0.18), rgba(20, 35, 29, 0.95))"
                : node.status === "unlocked"
                  ? "linear-gradient(130deg, rgba(181, 126, 255, 0.18), rgba(23, 23, 35, 0.95))"
                  : "linear-gradient(130deg, rgba(79, 86, 107, 0.16), rgba(23, 23, 35, 0.95))",
            color: "#f8f9ff",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.03), 0 12px 24px rgba(0,0,0,0.35)",
          },
        });
      });
    }
    return result;
  }, [nodes, selectedNodeId]);

  const flowEdges = useMemo(() => {
    const edges: Edge[] = [];
    for (const node of nodes) {
      for (const prerequisite of node.prerequisites) {
        edges.push({
          id: `${prerequisite}-${node.id}`,
          source: prerequisite,
          target: node.id,
          markerEnd: { type: MarkerType.ArrowClosed, width: 22, height: 22, color: "#8188a0" },
          animated: node.status !== "locked",
          style: { stroke: node.status === "locked" ? "#555d72" : "#a68fff", strokeWidth: 2 },
        });
      }
    }
    return edges;
  }, [nodes]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onSelectNode(node.id);
  };

  return (
    <div className="skill-tree-surface">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
      >
        <Background color="#2a2f40" gap={22} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => {
            const skill = nodes.find((candidate) => candidate.id === node.id);
            return skill ? statusColor(skill.status) : "#8790a6";
          }}
          style={{
            backgroundColor: "#131722",
          }}
        />
        <Controls />
      </ReactFlow>
    </div>
  );
};
