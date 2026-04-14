/* src/components/CircularProgress.tsx */
import React from 'react';

interface CircularProgressProps {
  current: number;
  total: number;
  color?: string;
}

export const CircularProgress = ({ current, total, color }: CircularProgressProps) => {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const percentage = total > 0 ? (current / total) * 100 : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="circular-progress">
      <svg>
        <circle className="bg" cx="40" cy="40" r={radius} />
        <circle 
           className="fill" 
           cx="40" cy="40" r={radius} 
           strokeDasharray={circumference}
           strokeDashoffset={strokeDashoffset}
           style={color ? { stroke: color } : undefined}
        />
      </svg>
      <div className="text" style={color ? { color } : undefined}>
        <strong>{Math.round(percentage)}%</strong>
        <span>Concluído</span>
      </div>
    </div>
  );
};
