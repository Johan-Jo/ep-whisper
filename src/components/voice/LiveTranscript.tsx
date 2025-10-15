'use client';

import { useState, useEffect, useRef } from 'react';
import { extractPaintingKeywords } from '@/lib/openai';

interface LiveTranscriptProps {
  transcript: string;
  confidence?: number;
  isActive?: boolean;
  onKeywordClick?: (keyword: string, type: 'task' | 'surface' | 'quantity' | 'modifier') => void;
  className?: string;
}

interface HighlightedSegment {
  text: string;
  type: 'task' | 'surface' | 'quantity' | 'modifier' | 'normal';
  startIndex: number;
  endIndex: number;
}

export function LiveTranscript({
  transcript,
  confidence = 0,
  isActive = false,
  onKeywordClick,
  className = '',
}: LiveTranscriptProps) {
  const [highlightedSegments, setHighlightedSegments] = useState<HighlightedSegment[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Extract keywords and create highlighted segments
  useEffect(() => {
    if (!transcript.trim()) {
      setHighlightedSegments([]);
      return;
    }

    const keywords = extractPaintingKeywords(transcript);
    const segments: HighlightedSegment[] = [];
    let lastIndex = 0;

    // Combine all keywords with their types
    const allKeywords = [
      ...keywords.tasks.map(k => ({ keyword: k, type: 'task' as const })),
      ...keywords.surfaces.map(k => ({ keyword: k, type: 'surface' as const })),
      ...keywords.quantities.map(k => ({ keyword: k, type: 'quantity' as const })),
      ...keywords.modifiers.map(k => ({ keyword: k, type: 'modifier' as const })),
    ];

    // Sort keywords by position in text (longest first to avoid partial matches)
    allKeywords.sort((a, b) => b.keyword.length - a.keyword.length);

    // Find and highlight keywords
    allKeywords.forEach(({ keyword, type }) => {
      const lowerTranscript = transcript.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      let searchIndex = 0;

      while (searchIndex < lowerTranscript.length) {
        const index = lowerTranscript.indexOf(lowerKeyword, searchIndex);
        if (index === -1) break;

        const endIndex = index + keyword.length;

        // Check if this keyword is already highlighted
        const isAlreadyHighlighted = segments.some(segment => 
          (index >= segment.startIndex && index < segment.endIndex) ||
          (endIndex > segment.startIndex && endIndex <= segment.endIndex)
        );

        if (!isAlreadyHighlighted) {
          // Add normal text before keyword if needed
          if (index > lastIndex) {
            segments.push({
              text: transcript.slice(lastIndex, index),
              type: 'normal',
              startIndex: lastIndex,
              endIndex: index,
            });
          }

          // Add highlighted keyword
          segments.push({
            text: transcript.slice(index, endIndex),
            type,
            startIndex: index,
            endIndex,
          });

          lastIndex = endIndex;
        }

        searchIndex = index + 1;
      }
    });

    // Add remaining normal text
    if (lastIndex < transcript.length) {
      segments.push({
        text: transcript.slice(lastIndex),
        type: 'normal',
        startIndex: lastIndex,
        endIndex: transcript.length,
      });
    }

    setHighlightedSegments(segments);
  }, [transcript]);

  // Auto-scroll to bottom when new content is added
  useEffect(() => {
    if (transcriptRef.current && isActive) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript, isActive]);

  const getSegmentClassName = (type: HighlightedSegment['type']): string => {
    const baseClasses = 'px-1 py-0.5 rounded cursor-pointer transition-colors';
    
    switch (type) {
      case 'task':
        return `${baseClasses} bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800`;
      case 'surface':
        return `${baseClasses} bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800`;
      case 'quantity':
        return `${baseClasses} bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:hover:bg-purple-800`;
      case 'modifier':
        return `${baseClasses} bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:hover:bg-yellow-800`;
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };

  const handleKeywordClick = (segment: HighlightedSegment) => {
    if (segment.type !== 'normal' && onKeywordClick) {
      onKeywordClick(segment.text, segment.type);
    }
  };

  const getConfidenceColor = (): string => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceText = (): string => {
    if (confidence >= 0.8) return 'Hög';
    if (confidence >= 0.6) return 'Medel';
    return 'Låg';
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Live Transkript
        </h3>
        {transcript && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Förtroende:</span>
            <span className={`text-sm font-medium ${getConfidenceColor()}`}>
              {getConfidenceText()} ({(confidence * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* Transcript Content */}
      <div
        ref={transcriptRef}
        className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[120px] max-h-[300px] overflow-y-auto"
      >
        {transcript ? (
          <div className="space-y-1">
            {highlightedSegments.map((segment, index) => (
              <span
                key={index}
                className={getSegmentClassName(segment.type)}
                onClick={() => handleKeywordClick(segment)}
                title={
                  segment.type !== 'normal' 
                    ? `Klicka för mer information om ${segment.type}` 
                    : undefined
                }
              >
                {segment.text}
              </span>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            {isActive ? (
              <div>
                <div className="text-lg mb-2">🎤</div>
                <div>Lyssnar efter röst...</div>
                <div className="text-sm mt-1">
                  Prata tydligt på svenska om målning och spackling
                </div>
              </div>
            ) : (
              <div>
                <div className="text-lg mb-2">💬</div>
                <div>Ingen transkript tillgänglig</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Keyword Legend */}
      {transcript && (
        <div className="flex flex-wrap gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-blue-100 dark:bg-blue-900 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Uppgifter</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-100 dark:bg-green-900 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Ytor</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-purple-100 dark:bg-purple-900 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Kvantiteter</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-yellow-100 dark:bg-yellow-900 rounded"></div>
            <span className="text-gray-600 dark:text-gray-400">Modifierare</span>
          </div>
        </div>
      )}
    </div>
  );
}
