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
    <div className="quest-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="quest-modal panel stack"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quest-modal-title"
      >
        <div className="quest-modal-header">
          <div className="panel-title">
            <Medal size={18} />
            Quest node
          </div>
          <button className="ghost-button quest-modal-close" type="button" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <span className={`status-pill ${node.status}`}>{node.status}</span>
        <h2 id="quest-modal-title">{node.title}</h2>
        <p>{node.description}</p>

        <dl className="node-meta">
          <div>
            <dt>Difficulty</dt>
            <dd>{node.difficulty}</dd>
          </div>
          <div>
            <dt>Reward</dt>
            <dd>{node.xp} XP</dd>
          </div>
          <div>
            <dt>Estimate</dt>
            <dd>{node.estimatedHours}h</dd>
          </div>
        </dl>

        {(node.identity || node.tradeoff) && (
          <div className="identity-grid">
            {node.identity && (
              <div>
                <strong>Identity path</strong>
                <p>{node.identity}</p>
              </div>
            )}
            {node.tradeoff && (
              <div>
                <strong>Tradeoff</strong>
                <p>{node.tradeoff}</p>
              </div>
            )}
          </div>
        )}

        <div>
          <strong>Prerequisites</strong>
          <p className="muted">{prerequisites.length ? prerequisites.join(', ') : 'None'}</p>
        </div>

        {node.proof && (
          <div className="proof-box">
            <strong>Proof prompt</strong>
            <p>{node.proof.prompt}</p>
          </div>
        )}

        {node.tips && node.tips.length > 0 && (
          <div className="proof-box tips-box">
            <strong>Tips</strong>
            <ul>
              {node.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <form className="stack quest-modal-form" onSubmit={(event) => void submitComplete(event, growAfterComplete)}>
          {node.status === 'unlocked' && (
            <>
              <label>
                Quest journal
                <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} />
              </label>
              <label>
                Focus tags
                <input
                  value={tags}
                  placeholder="Optional: comma-separated focus areas"
                  onChange={(event) => setTags(event.target.value)}
                />
              </label>
              <label>
                Proof URL
                <input placeholder="https://..." value={proofUrl} onChange={(event) => setProofUrl(event.target.value)} />
              </label>
            </>
          )}

          <div className="adapt-box">
            <strong>Grow this branch</strong>
            <p className="muted">Optional signals for AI to add deeper child nodes with XP rewards.</p>
            <input
              value={signals}
              placeholder="What happened, what you want next, or your preferred style"
              onChange={(event) => setSignals(event.target.value)}
            />
            {node.status === 'unlocked' && (
              <label className="quest-checkbox">
                <input
                  checked={growAfterComplete}
                  type="checkbox"
                  onChange={(event) => setGrowAfterComplete(event.target.checked)}
                />
                Grow branch after completing this quest
              </label>
            )}
          </div>

          <div className="quest-modal-actions">
            <button className="ghost-button" disabled={disabled} type="button" onClick={onClose}>
              Close
            </button>
            {(node.status === 'locked' || node.status === 'complete') && (
              <button className="secondary-button" disabled={disabled} type="button" onClick={() => void growOnly()}>
                <Sparkles size={16} /> Grow branch
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
                  Complete & close
                </button>
                <button className="primary-button" disabled={disabled} type="submit">
                  Complete {growAfterComplete ? '& grow branch' : '& close'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
