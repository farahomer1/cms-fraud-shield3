// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PipelineAgent, AgentFlag } from '../types';
import apiClient from '../services/apiClient';

/**
 * Fuzzy-match a SEED agent name against an agent_findings / agent_flags name.
 * Handles differences like "Pre-Payment Claims Hold "Crush Fraud"" vs "crush_fraud",
 * "Rules Engine" vs "rules_engine", etc.
 */
function matchesAgentName(seedName: string, flagName: string): boolean {
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/["']/g, '')         // remove quotes
      .replace(/_/g, ' ')           // replace underscores with spaces
      .replace(/\bagent\b/g, '')    // remove standalone word "agent"
      .replace(/[^a-z0-9\s]/g, '')  // strip special characters like hyphens/slashes
      .replace(/\s+/g, ' ')         // normalize whitespace
      .trim();
  };

  const a = normalize(seedName);
  const b = normalize(flagName);
  if (a === b) return true;

  // Check if one contains the other
  if (a.includes(b) || b.includes(a)) return true;

  const aWords = a.split(/\s+/).filter(Boolean);
  const bWords = b.split(/\s+/).filter(Boolean);
  const [shorter, longer] =
    aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords];
  return shorter.every((word) =>
    longer.some((w) => w === word || w.startsWith(word) || word.startsWith(word))
  );
}

const SEED_AGENTS: PipelineAgent[] = [
  {
    id: 'agent-rules-engine',
    name: 'Rules Engine',
    description: 'Enforces statutory limits (LCD L33803) and billing integrity rules.',
    type: 'rule-based',
    definition: 'Flag any claim violating standard quantity caps (30-150 rolling window), dormant supplier spikes, or multi-provider velocity bounds.',
    status: 'production',
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2026-01-10T14:30:00Z',
    flags: [],
  },
  {
    id: 'agent-trust-defender',
    name: 'Threat Simulation "Trust Defender"',
    description: 'Monitors early-stage risk signals and anomalies in enrollment records.',
    type: 'ai-based',
    definition: 'Analyze PECOS ownership transfers, practice-address changes to CMRA mail-drops, and early-warning transaction spikes.',
    status: 'production',
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2026-01-15T16:00:00Z',
    flags: [],
  },
  {
    id: 'agent-crush-fraud',
    name: 'Pre-Payment Claims Hold "Crush Fraud"',
    description: 'Intercepts high-risk billing and coordinates immediate prepay holds.',
    type: 'ai-based',
    definition: 'Execute sub-second prepayment holding and triage suspect transactions to priority investigator review.',
    status: 'production',
    createdAt: '2025-09-10T12:00:00Z',
    updatedAt: '2026-01-20T09:00:00Z',
    flags: [],
  },
  {
    id: 'agent-system-resilience',
    name: 'Enrollment Audit & Unmasking "System Resilience"',
    description: 'Uncovers complex shell company structures and shared address links.',
    type: 'ai-based',
    definition: 'Unmask multi-provider shell networks utilizing common Authorized Officials, lock compromised MBIs, and trigger prior-auth bounds.',
    status: 'production',
    createdAt: '2025-10-05T10:00:00Z',
    updatedAt: '2026-01-25T11:00:00Z',
    flags: [],
  },
  {
    id: 'agent-program-integrity-ops',
    name: 'Policy & Referral "Program Integrity Ops"',
    description: 'Compiles formal OIG/DOJ evidence packages and policy adjustment notes.',
    type: 'ai-based',
    definition: 'Generate standard referral dossiers for federal prosecutors and recommend systemic policy adaptations to prevent recurring schemes.',
    status: 'production',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2026-01-28T10:00:00Z',
    flags: [],
  },
  {
    id: 'agent-overlapping-claims',
    name: 'Overlapping Claims Check',
    description: 'Flags overlapping service dates or duplicate procedures.',
    type: 'rule-based',
    definition: 'Detect overlapping service dates and diagnostic procedure code duplicates filed by multiple suppliers.',
    status: 'production',
    createdAt: '2025-09-15T14:00:00Z',
    updatedAt: '2026-01-30T08:00:00Z',
    flags: [],
  },
  {
    id: 'agent-data-validation',
    name: 'Data Validation Integrity',
    description: 'Ensures NPI format compliance and diagnostic logic validation.',
    type: 'rule-based',
    definition: 'Verify inbound data formatting, check NPI structure, and validate diagnostic-code compatibility with billing fee schedules.',
    status: 'production',
    createdAt: '2025-08-10T07:00:00Z',
    updatedAt: '2026-01-31T13:00:00Z',
    flags: [],
  },
];

interface AgentContextState {
  agents: PipelineAgent[];
  addAgent: (agent: Omit<PipelineAgent, 'id' | 'createdAt' | 'updatedAt' | 'flags'>) => void;
  updateAgent: (id: string, updates: Partial<Omit<PipelineAgent, 'id' | 'createdAt' | 'flags'>>) => void;
  deleteAgent: (id: string) => void;
  flagAgent: (agentId: string, flag: Omit<AgentFlag, 'id' | 'timestamp'>) => void;
  removeFlag: (agentId: string, flagId: string) => Promise<boolean>;
  getAgentById: (id: string) => PipelineAgent | undefined;
  refreshFlags: () => void;
}

const AgentContext = createContext<AgentContextState>({
  agents: [],
  addAgent: () => {},
  updateAgent: () => {},
  deleteAgent: () => {},
  flagAgent: () => {},
  removeFlag: async () => false,
  getAgentById: () => undefined,
  refreshFlags: () => {},
});

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [agents, setAgents] = useState<PipelineAgent[]>(SEED_AGENTS);

  // Fetch agent flags from backend and merge into agent state
  const refreshFlags = useCallback(async () => {
    try {
      const res = await apiClient.get<Array<{
        id: string;
        agentName: string;
        claimId: string;
        claimNumber: string;
        flaggedBy: string;
        notes: string;
        timestamp: string;
      }>>('/claims/agent-flags');

      setAgents((prev) =>
        prev.map((a) => {
          const matched = res.data.filter((f) => matchesAgentName(a.name, f.agentName));
          return {
            ...a,
            flags: matched.map((f) => ({
              id: f.id,
              claimId: f.claimId,
              claimNumber: f.claimNumber,
              flaggedBy: f.flaggedBy,
              notes: f.notes,
              timestamp: f.timestamp,
            })),
          };
        })
      );
    } catch {
      // Backend may not have agent_flags table yet — keep seed defaults
    }
  }, []);

  // Load persisted agent flags from the backend on mount
  useEffect(() => {
    refreshFlags();
  }, [refreshFlags]);

  const addAgent = useCallback((agent: Omit<PipelineAgent, 'id' | 'createdAt' | 'updatedAt' | 'flags'>) => {
    const now = new Date().toISOString();
    const newAgent: PipelineAgent = {
      ...agent,
      id: `agent-${Date.now()}`,
      createdAt: now,
      updatedAt: now,
      flags: [],
    };
    setAgents((prev) => [...prev, newAgent]);
  }, []);

  const updateAgent = useCallback((id: string, updates: Partial<Omit<PipelineAgent, 'id' | 'createdAt' | 'flags'>>) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, ...updates, updatedAt: new Date().toISOString() }
          : a
      )
    );
  }, []);

  const deleteAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const flagAgent = useCallback((agentId: string, flag: Omit<AgentFlag, 'id' | 'timestamp'>) => {
    const newFlag: AgentFlag = {
      ...flag,
      id: `flag-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, flags: [...a.flags, newFlag] }
          : a
      )
    );
  }, []);

  const removeFlag = useCallback(async (agentId: string, flagId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/claims/agent-flags/${flagId}`);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId
            ? { ...a, flags: a.flags.filter((f) => f.id !== flagId) }
            : a
        )
      );
      return true;
    } catch {
      return false;
    }
  }, []);

  const getAgentById = useCallback(
    (id: string) => agents.find((a) => a.id === id),
    [agents]
  );

  return (
    <AgentContext.Provider value={{ agents, addAgent, updateAgent, deleteAgent, flagAgent, removeFlag, getAgentById, refreshFlags }}>
      {children}
    </AgentContext.Provider>
  );
};

export const useAgentContext = () => useContext(AgentContext);
