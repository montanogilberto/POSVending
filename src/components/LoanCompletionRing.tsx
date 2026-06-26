import React from 'react';

export interface LoanStep {
  label: string;
  done: boolean;
}

interface Props {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  steps?: LoanStep[];
  showSteps?: boolean;
}

const color = (pct: number) =>
  pct === 100 ? '#059669' : pct >= 66 ? '#2563eb' : pct >= 33 ? '#f59e0b' : '#9ca3af';

const LoanCompletionRing: React.FC<Props> = ({
  percentage,
  size = 56,
  strokeWidth = 5,
  steps,
  showSteps = false,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const c = color(percentage);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg
          width={size}
          height={size}
          style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}
        >
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={c} strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute', top: 0, left: 0, width: size, height: size,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: size * 0.22, fontWeight: 700, color: c, lineHeight: 1 }}>
            {percentage}%
          </span>
          {size >= 80 && (
            <span style={{ fontSize: size * 0.12, color: '#9ca3af', lineHeight: 1.2, marginTop: 2 }}>
              listo
            </span>
          )}
        </div>
      </div>

      {showSteps && steps && steps.length > 0 && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.done ? '#d1fae5' : '#f3f4f6',
                  border: `2px solid ${s.done ? '#059669' : '#d1d5db'}`,
                }}
              >
                {s.done && (
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: 13, color: s.done ? '#111827' : '#9ca3af', fontWeight: s.done ? 600 : 400 }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LoanCompletionRing;
