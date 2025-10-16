import React from 'react';

interface EstimateDisplayProps {
  text: string;
}

export function EstimateDisplay({ text }: EstimateDisplayProps) {
  return (
    <div 
      style={{
        color: '#ffffff',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        lineHeight: '1.4',
        padding: '8px 12px',
        backgroundColor: 'transparent',
        border: 'none',
        outline: 'none',
        WebkitTextFillColor: '#ffffff',
        display: 'block'
      } as React.CSSProperties}
      className="estimate-display"
    >
      {text}
    </div>
  );
}
