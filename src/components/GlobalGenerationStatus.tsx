"use client";
import React, { useState, useEffect } from 'react';
import { useRoadmapGeneration } from '@/contexts/RoadmapGenerationContext';
import Image from 'next/image';

const GlobalGenerationStatus: React.FC = () => {
  const { generationState } = useRoadmapGeneration();
  const { isGenerating, progress, statusMessage } = generationState;

  // Don't show anything if not generating
  if (!isGenerating) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      minWidth: '300px',
      maxWidth: '400px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <Image 
          src="/icons/lightning.png" 
          alt="Generating" 
          width={20} 
          height={20} 
          style={{ marginRight: '8px' }}
        />
        <span style={{ fontWeight: '600', color: '#374151' }}>
          Generating Roadmap
        </span>
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <div style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '4px'
        }}>
          {statusMessage}
        </div>
        
        <div style={{
          width: '100%',
          height: '6px',
          backgroundColor: '#e5e7eb',
          borderRadius: '3px',
          overflow: 'hidden'
        }}>
          <div style={{
            width: `${progress}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            borderRadius: '3px',
            transition: 'width 0.3s ease'
          }} />
        </div>
        
        <div style={{
          fontSize: '12px',
          color: '#6b7280',
          textAlign: 'right',
          marginTop: '4px'
        }}>
          {progress}%
        </div>
      </div>
    </div>
  );
};

export default GlobalGenerationStatus;
