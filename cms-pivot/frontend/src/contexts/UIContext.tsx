// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useState } from 'react';
import type { Toast } from '../types';

type ActiveModal =
  | { type: 'deepDive'; claimId: string }
  | { type: 'deniedDeepDive'; claimId: string }
  | null;

interface UIState {
  activeModal: ActiveModal;
  toastQueue: Toast[];
  openDeepDive: (claimId: string) => void;
  openDeniedDeepDive: (claimId: string) => void;
  closeModal: () => void;
  showToast: (message: string, severity: Toast['severity']) => void;
  dismissToast: (id: string) => void;
}

const UIContext = createContext<UIState>({
  activeModal: null,
  toastQueue: [],
  openDeepDive: () => {},
  openDeniedDeepDive: () => {},
  closeModal: () => {},
  showToast: () => {},
  dismissToast: () => {},
});

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [toastQueue, setToastQueue] = useState<Toast[]>([]);

  const openDeepDive = useCallback((claimId: string) => {
    setActiveModal({ type: 'deepDive', claimId });
  }, []);

  const openDeniedDeepDive = useCallback((claimId: string) => {
    setActiveModal({ type: 'deniedDeepDive', claimId });
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  const showToast = useCallback((message: string, severity: Toast['severity']) => {
    const id = Date.now().toString();
    setToastQueue((prev) => [...prev, { id, message, severity }]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToastQueue((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <UIContext.Provider value={{ activeModal, toastQueue, openDeepDive, openDeniedDeepDive, closeModal, showToast, dismissToast }}>
      {children}
    </UIContext.Provider>
  );
};

export const useUIContext = () => useContext(UIContext);
