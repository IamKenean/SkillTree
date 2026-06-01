import { useEffect } from 'react';

type XpFloatProps = {
  xp: number;
  onDone: () => void;
};

export function XpFloat({ xp, onDone }: XpFloatProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 1400);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="xp-float" aria-live="polite">
      +{xp} XP
    </div>
  );
}
