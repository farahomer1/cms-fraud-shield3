// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AccessibilityState {
  fontSize: number; // percentage: 100 = default
  highContrast: boolean;
}

interface AccessibilityContextValue extends AccessibilityState {
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
  toggleHighContrast: () => void;
}

const STORAGE_KEY = 'pivot-accessibility';
const MIN_FONT = 80;
const MAX_FONT = 150;
const STEP = 10;

const defaults: AccessibilityState = { fontSize: 100, highContrast: false };

const AccessibilityContext = createContext<AccessibilityContextValue>({
  ...defaults,
  increaseFontSize: () => {},
  decreaseFontSize: () => {},
  resetFontSize: () => {},
  toggleHighContrast: () => {},
});

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Apply font-size to <html> element so rem-based sizing scales everywhere
  useEffect(() => {
    document.documentElement.style.fontSize = `${state.fontSize}%`;
  }, [state.fontSize]);

  // Apply high-contrast class to <html>
  useEffect(() => {
    document.documentElement.classList.toggle('high-contrast', state.highContrast);
  }, [state.highContrast]);

  const increaseFontSize = useCallback(() => {
    setState((s) => ({ ...s, fontSize: Math.min(s.fontSize + STEP, MAX_FONT) }));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setState((s) => ({ ...s, fontSize: Math.max(s.fontSize - STEP, MIN_FONT) }));
  }, []);

  const resetFontSize = useCallback(() => {
    setState((s) => ({ ...s, fontSize: 100 }));
  }, []);

  const toggleHighContrast = useCallback(() => {
    setState((s) => ({ ...s, highContrast: !s.highContrast }));
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ ...state, increaseFontSize, decreaseFontSize, resetFontSize, toggleHighContrast }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};
