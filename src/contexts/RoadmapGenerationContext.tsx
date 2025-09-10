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
  const [generationState, setGenerationState] = useState<GenerationState>(generationService.getState());
  const [goalName, setGoalName] = useState(generationService.getState().goalName);

  // Subscribe to service updates
  useEffect(() => {
    const unsubscribe = generationService.subscribe(() => {
      const state = generationService.getState();
      setGenerationState(state);
      setGoalName(state.goalName);
    });

    return () => {
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
