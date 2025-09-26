"use client";
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { generationService } from '../services/generationService';

interface GenerationState {
  isGenerating: boolean;
  progress: number;
  statusMessage: string | null;
  data: any;
  error: string | null;
  goal: string;
  dailyMinutes: number;
  totalDays: number;
}

interface RoadmapGenerationContextType {
  generationState: GenerationState;
  startGeneration: (goal: string, dailyMinutes: number, totalDays: number) => Promise<void>;
  stopGeneration: () => void;
  clearGeneration: () => void;
  setGoalName: (name: string) => void;
  setData: (data: any) => void;
  goalName: string;
}

const RoadmapGenerationContext = createContext<RoadmapGenerationContextType | undefined>(undefined);

export const useRoadmapGeneration = () => {
  const context = useContext(RoadmapGenerationContext);
  if (!context) {
    throw new Error('useRoadmapGeneration must be used within a RoadmapGenerationProvider');
  }
  return context;
};

interface RoadmapGenerationProviderProps {
  children: ReactNode;
}

export const RoadmapGenerationProvider: React.FC<RoadmapGenerationProviderProps> = ({ children }) => {
  const [generationState, setGenerationState] = useState<GenerationState>(() => {
    // Initialize with current state, but don't trigger re-renders
    const state = generationService.getState();
    return state;
  });
  const [goalName, setGoalName] = useState(() => {
    const state = generationService.getState();
    return state.goalName;
  });

  // Subscribe to service updates
  useEffect(() => {
    // Use a small delay to ensure the service has had time to restore from localStorage
    const syncWithService = () => {
      const currentState = generationService.getState();
      setGenerationState(currentState);
      setGoalName(currentState.goalName);
    };
    
    // Sync immediately
    syncWithService();
    
    // Also sync after a small delay to catch any state restoration
    const timeoutId = setTimeout(syncWithService, 100);
    
    const unsubscribe = generationService.subscribe(() => {
      const state = generationService.getState();
      setGenerationState(state);
      setGoalName(state.goalName);
    });

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  const startGeneration = useCallback(async (goal: string, dailyMinutes: number, totalDays: number) => {
    await generationService.startGeneration(goal, dailyMinutes, totalDays);
  }, []);

  const stopGeneration = useCallback(() => {
    generationService.stopGeneration();
  }, []);

  const clearGeneration = useCallback(() => {
    generationService.clearGeneration();
  }, []);

  const setData = useCallback((data: any) => {
    generationService.setData(data);
  }, []);

  const setGoalNameCallback = useCallback((name: string) => {
    generationService.setGoalName(name);
  }, []);

  const value: RoadmapGenerationContextType = {
    generationState,
    startGeneration,
    stopGeneration,
    clearGeneration,
    setGoalName: setGoalNameCallback,
    setData,
    goalName,
  };

  return (
    <RoadmapGenerationContext.Provider value={value}>
      {children}
    </RoadmapGenerationContext.Provider>
  );
};
