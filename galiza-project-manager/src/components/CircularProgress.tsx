/* src/components/CircularProgress.tsx */
import React from 'react';

interface CircularProgressProps {
  current: number;
  total: number;
  color?: string;
  size?: number;
}

export const CircularProgress = ({ current, total, color, size = 80 }: CircularProgressProps) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = size / 2;

  const isSuccess = color === 'var(--success)';
  const strokeColor = isSuccess ? 'rgba(52, 211, 153, 0.6)' : (color || 'var(--accent)');
  const glowAlpha = isSuccess ? '20' : '80'; // Hex 20 is ~12% alpha

  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          className="circular-progress-bg"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.02)"
          strokeWidth={strokeWidth}
        />
        <circle
          className="circular-progress-fill"
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            filter: `drop-shadow(0 0 1px ${strokeColor}${glowAlpha})`
          }}
        />
      </svg>
      <div className="circular-progress-label" style={{ color: isSuccess ? 'var(--success)' : strokeColor }}>
        <strong>{Math.round(percentage)}%</strong>
        <span>Concluído</span>
      </div>
    </div>
  );
};
