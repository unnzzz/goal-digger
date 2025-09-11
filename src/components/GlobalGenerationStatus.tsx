"use client";
import React from 'react';
import { useRoadmapGeneration } from '@/contexts/RoadmapGenerationContext';
import Image from 'next/image';

const GlobalGenerationStatus: React.FC = () => {
  const { generationState, stopGeneration } = useRoadmapGeneration();

  if (!generationState.isGenerating) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'linear-gradient(135deg, #6A3EE8 0%, #8B5CF6 100%)',
      color: 'white',
      padding: '16px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(106, 62, 232, 0.3)',
      zIndex: 1000,
      minWidth: '280px',
      maxWidth: '400px',
      border: '2px solid rgba(255, 255, 255, 0.2)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Image 
            src="/icons/trophy.png" 
            alt="Generating" 
            width={24} 
            height={24} 
          />
          <span style={{
            fontWeight: '600',
            fontSize: '14px',
          }}>
            Generating Roadmap
          </span>
        </div>
        <button
          onClick={stopGeneration}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '6px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '500',
          }}
        >
          Stop
        </button>
      </div>
      
      <div style={{
        marginBottom: '8px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '4px',
        }}>
          <span style={{
            fontSize: '12px',
            opacity: 0.9,
          }}>
            {generationState.statusMessage || 'Processing...'}
          </span>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
          }}>
            {generationState.progress}%
          </span>
        </div>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '3px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${generationState.progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
            borderRadius: '3px',
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
      
      <div style={{
        fontSize: '11px',
        opacity: 0.8,
        lineHeight: '1.3',
      }}>
        <div><strong>Goal:</strong> {generationState.goal}</div>
        <div><strong>Duration:</strong> {generationState.dailyMinutes} min/day for {generationState.totalDays} days</div>
      </div>
    </div>
  );
};

export default GlobalGenerationStatus;
