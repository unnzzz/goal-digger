"use client";
import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const [generationState, setGenerationState] = useState<GenerationState>({
    isGenerating: false,
    progress: 0,
    statusMessage: null,
    data: null,
    error: null,
    goal: '',
    dailyMinutes: 30,
    totalDays: 10,
  });
  
  const [goalName, setGoalName] = useState('');

  const startGeneration = useCallback(async (goal: string, dailyMinutes: number, totalDays: number) => {
    setGenerationState(prev => ({
      ...prev,
      isGenerating: true,
      progress: 0,
      statusMessage: "Starting generation...",
      data: null,
      error: null,
      goal,
      dailyMinutes,
      totalDays,
    }));

    const requestData = {
      goal,
      daily_minutes: dailyMinutes,
      total_days: totalDays,
    };

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${res.statusText} - ${errorText}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

      let buffer = "";
      let result: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value);
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.type === "progress") {
              setGenerationState(prev => ({
                ...prev,
                progress: parsed.percent || 0,
                statusMessage: parsed.message || "Processing...",
              }));
            } else if (parsed.type === "result") {
              result = parsed.data;
            } else if (parsed.type === "error") {
              throw new Error(parsed.message);
            }
          } catch (e) {
            console.warn("Failed to parse line:", line, e);
          }
        }
      }

      setGenerationState(prev => ({
        ...prev,
        data: result,
        statusMessage: "Complete!",
        isGenerating: false,
      }));
      
      if (result?.title) {
        setGoalName(result.title);
      }
    } catch (e: any) {
      setGenerationState(prev => ({
        ...prev,
        error: e?.message || "Generation failed",
        isGenerating: false,
      }));
    }
  }, []);

  const stopGeneration = useCallback(() => {
    setGenerationState(prev => ({
      ...prev,
      isGenerating: false,
      statusMessage: "Generation stopped",
    }));
  }, []);

  const clearGeneration = useCallback(() => {
    setGenerationState({
      isGenerating: false,
      progress: 0,
      statusMessage: null,
      data: null,
      error: null,
      goal: '',
      dailyMinutes: 30,
      totalDays: 10,
    });
    setGoalName('');
  }, []);

  const setData = useCallback((data: any) => {
    setGenerationState(prev => ({
      ...prev,
      data,
      isGenerating: false,
      error: null,
    }));
  }, []);

  const value: RoadmapGenerationContextType = {
    generationState,
    startGeneration,
    stopGeneration,
    clearGeneration,
    setGoalName,
    setData,
    goalName,
  };

  return (
    <RoadmapGenerationContext.Provider value={value}>
      {children}
    </RoadmapGenerationContext.Provider>
  );
};
