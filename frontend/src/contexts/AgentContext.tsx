// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PipelineAgent, AgentFlag } from '../types';
import apiClient from '../services/apiClient';

/**
 * Fuzzy-match a SEED agent name against an agent_findings / agent_flags name.
 * Handles differences like "Pension Poaching" vs "Pension Poaching Agent",
 * "Overlapping Claims" vs "Overlapping Claim Agent", etc.
 */
function matchesAgentName(seedName: string, flagName: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/\bagent\b/g, '').trim();
  const a = normalize(seedName);
  const b = normalize(flagName);
  if (a === b) return true;
  const aWords = a.split(/\s+/).filter(Boolean);
  const bWords = b.split(/\s+/).filter(Boolean);
  const [shorter, longer] =
    aWords.length <= bWords.length ? [aWords, bWords] : [bWords, aWords];
  return shorter.every((word) =>
    longer.some((w) => w === word || w.startsWith(word) || word.startsWith(w))
  );
}

const SEED_AGENTS: PipelineAgent[] = [
  {
    id: 'agent-rules-engine',
    name: 'Rules Engine',
    description: 'Validates claims against VA policy rules and billing thresholds.',
    type: 'rule-based',
    definition: 'Flag any claim where the billing amount exceeds $50,000 or the service date is more than 365 days before the submission date.',
    status: 'production',
    createdAt: '2025-08-15T10:00:00Z',
    updatedAt: '2025-12-01T14:30:00Z',
    flags: [],
  },
  {
    id: 'agent-pension-poaching',
    name: 'Pension Poaching',
    description: 'Detects patterns where providers exploit veteran pension benefits.',
    type: 'ai-based',
    definition: 'Analyze the claim and related veteran data to determine if the provider is engaging in pension poaching tactics, such as unnecessary services billed to pension-eligible veterans with high disability ratings.',
    status: 'production',
    createdAt: '2025-09-01T08:00:00Z',
    updatedAt: '2025-11-20T16:00:00Z',
    flags: [],
  },
  {
    id: 'agent-claim-sharking',
    name: 'Claim Sharking',
    description: 'Identifies coordinated claim filing patterns across multiple veterans.',
    type: 'ai-based',
    definition: 'Examine provider claim submission patterns to detect claim sharking — look for suspiciously similar diagnosis/procedure combinations filed in batches across multiple veterans by the same provider.',
    status: 'production',
    createdAt: '2025-09-10T12:00:00Z',
    updatedAt: '2025-11-15T09:00:00Z',
    flags: [],
  },
  {
    id: 'agent-dbq-fraud',
    name: 'CMN Fraud',
    description: 'Detects fraudulent Certificate of Medical Necessity submissions.',
    type: 'rule-based',
    definition: 'Flag claims where the Certificate of Medical Necessity (CMN) was completed by a provider who is not accredited or where the order date does not match PECOS enrollment records.',
    status: 'testing',
    createdAt: '2025-10-05T10:00:00Z',
    updatedAt: '2025-12-10T11:00:00Z',
    flags: [],
  },
  {
    id: 'agent-overlapping-claims',
    name: 'Overlapping Claims',
    description: 'Detects duplicate or overlapping service dates across claims.',
    type: 'rule-based',
    definition: 'Flag any claim where the veteran has another claim with overlapping service dates and matching procedure codes from a different provider.',
    status: 'production',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-11-30T10:00:00Z',
    flags: [],
  },
  {
    id: 'agent-medical-record',
    name: 'Medical Record',
    description: 'Cross-references claims against medical record documentation.',
    type: 'ai-based',
    definition: 'Compare the claim diagnosis and procedure codes against the available medical records to verify that the claimed services are supported by clinical documentation.',
    status: 'production',
    createdAt: '2025-09-15T14:00:00Z',
    updatedAt: '2025-12-05T08:00:00Z',
    flags: [],
  },
  {
    id: 'agent-data-validation',
    name: 'Data Validation',
    description: 'Validates data integrity and format compliance of claim fields.',
    type: 'rule-based',
    definition: 'Flag claims with invalid NPI numbers, missing required diagnosis codes, or billing amounts that do not match the fee schedule for the stated procedure codes.',
    status: 'production',
    createdAt: '2025-08-10T07:00:00Z',
    updatedAt: '2025-11-25T13:00:00Z',
    flags: [],
  },
  {
    id: 'agent-claim-discrepancy',
    name: 'Claim Discrepancy',
    description: 'Identifies discrepancies between claim data and supporting documents.',
    type: 'ai-based',
    definition: 'Analyze claim data against supporting documents to identify any discrepancies in dates, amounts, codes, or provider information that may indicate errors or fraud.',
    status: 'testing',
    createdAt: '2025-10-20T11:00:00Z',
    updatedAt: '2025-12-08T15:00:00Z',
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
