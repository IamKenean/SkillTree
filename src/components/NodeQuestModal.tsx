import { Medal, Sparkles, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import type { SkillNode, SkillTree } from '../shared/types.js';

type NodeQuestModalProps = {
  tree: SkillTree;
  node: SkillNode;
  disabled: boolean;
  onClose: () => void;
  onFinish: (payload: {
    nodeId: string;
    note: string;
    focusTags: string[];
    proofUrl?: string;
    growBranch: boolean;
    signals: string[];
  }) => Promise<void>;
};

export function NodeQuestModal({ tree, node, disabled, onClose, onFinish }: NodeQuestModalProps) {
  const defaultNote = node.proof?.prompt ?? 'Finished a focused practice rep and logged what improved.';
  const [note, setNote] = useState(defaultNote);
  const [tags, setTags] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [signals, setSignals] = useState('');
  const [growAfterComplete, setGrowAfterComplete] = useState(true);

  const prerequisites = useMemo(
    () => node.prerequisites.map((id) => tree.nodes.find((candidate) => candidate.id === id)?.title ?? id),
    [node.prerequisites, tree.nodes],
  );

  function growthSignals() {
    const parsed = signals
      .split(',')
      .map((signal) => signal.trim())
      .filter(Boolean);
    return parsed.length ? parsed : [note.slice(0, 80) || node.title];
  }

  async function submitComplete(event: FormEvent, withGrowth: boolean) {
    event.preventDefault();
    if (node.status !== 'unlocked') return;

    await onFinish({
      nodeId: node.id,
      note,
      focusTags: tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      proofUrl: proofUrl || undefined,
      growBranch: withGrowth,
      signals: growthSignals(),
    });
    onClose();
  }

  async function growOnly() {
    await onFinish({
      nodeId: node.id,
      note: node.proof?.prompt ?? node.title,
      focusTags: [],
      growBranch: true,
      signals: growthSignals(),
    });
    onClose();
  }

  return (
    <div className="quest-popover-layer" onClick={onClose} role="presentation">
      <div
        className="quest-popover"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-modal-title"
      >
        <header className="quest-popover-header">
          <div>
            <h2 id="quest-modal-title" className="quest-title">{node.title}</h2>
            <p className="quest-subtitle">{node.description}</p>
          </div>
          <button className="ghost-button quest-popover-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="quest-badges">
          <span className={`status-pill ${node.status}`}>{node.status}</span>
          <span className="quest-pill">{node.difficulty}</span>
          <span className="quest-pill">{node.xp} XP</span>
          {node.identity && <span className="quest-pill">{node.identity}</span>}
        </div>

        {node.proof && (
          <div className="quest-section">
            <strong>Proof prompt</strong>
            <p className="quest-text">{node.proof.prompt}</p>
          </div>
        )}

        {node.tips && node.tips.length > 0 && (
          <details className="quest-details">
            <summary>Tips</summary>
            <ul>
              {node.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </details>
        )}

        <details className="quest-details">
          <summary>More details</summary>
          {node.tradeoff && (
            <p className="quest-text">
              <strong>Tradeoff:</strong> {node.tradeoff}
            </p>
          )}
          <p className="quest-text">
            <strong>Prereqs:</strong> {prerequisites.length ? prerequisites.join(', ') : 'None'}
          </p>
        </details>

        <form className="quest-form" onSubmit={(event) => void submitComplete(event, growAfterComplete)}>
          {node.status === 'unlocked' && (
            <>
              <label className="quest-label">
                Journal
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} />
              </label>
              <div className="quest-grid">
                <label className="quest-label">
                  Tags
                  <input value={tags} placeholder="Optional" onChange={(event) => setTags(event.target.value)} />
                </label>
                <label className="quest-label">
                  Proof URL
                  <input placeholder="Optional" value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} />
                </label>
              </div>
            </>
          )}

          <label className="quest-label">
            Grow branch (optional)
            <input
              value={signals}
              placeholder="Signals for AI"
              onChange={(event) => setSignals(event.target.value)}
            />
          </label>

          {node.status === 'unlocked' && (
            <label className="quest-checkbox">
              <input
                checked={growAfterComplete}
                type="checkbox"
                onChange={(event) => setGrowAfterComplete(event.target.checked)}
              />
              Grow after complete
            </label>
          )}

          <div className="quest-actions">
            <button className="ghost-button" disabled={disabled} type="button" onClick={onClose}>
              Close
            </button>
            {(node.status === 'locked' || node.status === 'complete') && (
              <button className="secondary-button" disabled={disabled} type="button" onClick={() => void growOnly()}>
                <Sparkles size={16} /> Grow
              </button>
            )}
            {node.status === 'unlocked' && (
              <>
                <button
                  className="secondary-button"
                  disabled={disabled}
                  type="button"
                  onClick={(event) => void submitComplete(event, false)}
                >
                  Complete
                </button>
                <button className="primary-button" disabled={disabled} type="submit">
                  Complete{growAfterComplete ? ' + grow' : ''}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}