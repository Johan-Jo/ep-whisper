import React from 'react';

interface EstimateDisplayProps {
  text: string;
}

export function EstimateDisplay({ text }: EstimateDisplayProps) {
  return (
    <div 
      style={{
        color: '#ffffff !important',
        fontSize: '12px !important',
        fontFamily: 'monospace !important',
        whiteSpace: 'pre-wrap !important',
        lineHeight: '1.4 !important',
        padding: '8px 12px !important',
        backgroundColor: 'transparent !important',
        border: 'none !important',
        outline: 'none !important',
        WebkitTextFillColor: '#ffffff !important',
        textFillColor: '#ffffff !important',
        // Nuclear option - reset all inherited styles
        all: 'unset',
        display: 'block !important',
        color: '#ffffff !important'
      }}
      className="estimate-display"
    >
      {text}
    </div>
  );
}
