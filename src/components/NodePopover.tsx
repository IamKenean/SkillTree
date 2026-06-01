import { Check, Sparkles, X } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { SkillNode, SkillTree } from '../shared/types.js';

type NodePopoverProps = {
  tree: SkillTree;
  node: SkillNode;
  disabled: boolean;
  onClose: () => void;
  onComplete: (body: { nodeId: string; note: string; focusTags: string[]; proofUrl?: string }) => void;
};

export function NodePopover({ tree, node, disabled, onClose, onComplete }: NodePopoverProps) {
  const [note, setNote] = useState('');

  function submit(event: FormEvent) {
    event.preventDefault();
    onComplete({
      nodeId: node.id,
      note: note.trim() || `Completed ${node.title}`,
      focusTags: tree.interests.slice(0, 3),
    });
  }

  return (
    <div className="node-popover" role="dialog" aria-label={`${node.title} details`}>
      <button className="popover-close" type="button" onClick={onClose} aria-label="Close">
        <X size={16} />
      </button>

      <div className="popover-header">
        <span className={`status-pill ${node.status}`}>{node.status}</span>
        <strong className="popover-xp">+{node.xp} XP</strong>
      </div>

      <h3>{node.title}</h3>
      <p className="popover-desc">{node.description}</p>

      <div className="popover-meta">
        <span>{node.difficulty}</span>
        <span>{node.estimatedHours}h</span>
      </div>

      {node.status === 'unlocked' && (
        <form className="popover-form" onSubmit={submit}>
          <input
            placeholder="Quick note (optional)"
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <button className="primary-button popover-complete" disabled={disabled} type="submit">
            <Check size={16} /> Complete
          </button>
        </form>
      )}

      {node.status === 'complete' && (
        <div className="popover-done">
          <Sparkles size={16} />
          <span>Completed</span>
        </div>
      )}

      {node.status === 'locked' && (
        <p className="popover-locked muted">Complete prerequisite nodes to unlock.</p>
      )}
    </div>
  );
}
