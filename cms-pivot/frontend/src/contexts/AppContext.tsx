// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Batch, SSEEvent } from '../types';

interface ProcessingStatus {
  isProcessing: boolean;
  currentClaim: string | null;
  currentAgent: string | null;
  progress: number;
  events: SSEEvent[];
}

interface AppState {
  activeBatch: Batch | null;
  processingStatus: ProcessingStatus;
  setActiveBatch: (batch: Batch | null) => void;
  updateProcessingStatus: (status: Partial<ProcessingStatus>) => void;
  addProcessingEvent: (event: SSEEvent) => void;
  clearProcessingStatus: () => void;
}

const defaultProcessing: ProcessingStatus = {
  isProcessing: false,
  currentClaim: null,
  currentAgent: null,
  progress: 0,
  events: [],
};

const AppContext = createContext<AppState>({
  activeBatch: null,
  processingStatus: defaultProcessing,
  setActiveBatch: () => {},
  updateProcessingStatus: () => {},
  addProcessingEvent: () => {},
  clearProcessingStatus: () => {},
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(defaultProcessing);

  const updateProcessingStatus = useCallback((status: Partial<ProcessingStatus>) => {
    setProcessingStatus((prev) => ({ ...prev, ...status }));
  }, []);

  const addProcessingEvent = useCallback((event: SSEEvent) => {
    setProcessingStatus((prev) => ({ ...prev, events: [...prev.events, event] }));
  }, []);

  const clearProcessingStatus = useCallback(() => {
    setProcessingStatus(defaultProcessing);
  }, []);

  return (
    <AppContext.Provider
      value={{ activeBatch, processingStatus, setActiveBatch, updateProcessingStatus, addProcessingEvent, clearProcessingStatus }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => useContext(AppContext);
