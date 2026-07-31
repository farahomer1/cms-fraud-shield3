// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import { useState, useRef, useCallback, useEffect } from 'react';
import { LogEvent } from '../components/processing/StatusLog';
import { PipelineNodeState } from '../components/processing/PipelineAnimation';
import { processBatch } from '../services/batchService';
import { createAuditLogBatch, AuditEventPayload } from '../services/auditService';

const DEFAULT_PIPELINE_NODES: PipelineNodeState[] = [
  { id: 'normalization', label: 'Data Normalization', status: 'idle' },
  { id: 'warehouse', label: 'Data Warehouse', status: 'idle' },
  { id: 'rules_engine', label: 'Rules Engine', status: 'idle' },
  { id: 'agent_army', label: 'Agent Army (7 nodes)', status: 'idle' },
  { id: 'decision_routing', label: 'Decision Routing', status: 'idle' },
];

interface UseBatchProcessingReturn {
  events: LogEvent[];
  isProcessing: boolean;
  progress: number;
  currentClaim: string | null;
  currentAgent: string | null;
  pipelineNodes: PipelineNodeState[];
  isComplete: boolean;
  claimsProcessed: number;
  claimsPerSecond: number;
  totalClaims: number;
  startProcessing: (batchId: string, fakeTotal?: number) => void;
}

// ── Fake event generation data ──────────────────────────────────────────

const AGENT_DISPLAY_NAMES = [
  'Gemini AI Rules Engine',
  'Data Validation Agent',
  'Pension Poaching Agent',
  'Claim Sharking Agent',
  'DBQ Fraud Agent',
  'Overlapping Claims Agent',
  'Medical Record Agent',
  'Claim Discrepancy Agent',
];

const AGENT_KEYS = [
  'rules_engine',
  'data_validation',
  'pension_poaching',
  'claim_sharking',
  'dbq_fraud',
  'overlapping_claims',
  'medical_record',
  'claim_discrepancy',
];

const FLAG_MESSAGES = [
  'Billing amount exceeds 95th percentile for this procedure/diagnosis combination.',
  'Multiple billing anomalies detected: procedure codes inconsistent with diagnosis.',
  'Provider NPI validation failed against CMS NPPES registry.',
  'Deceased beneficiary flag triggered — claim filed after recorded date of death.',
  'Provider has pattern of converting medical claims to unapproved benefits.',
  'Billing amount significantly inflated compared to regional averages.',
  'Clinical assessment responses show statistical improbability — all maximum severity ratings.',
  'Duplicate procedure codes billed within 7-day window for same beneficiary.',
  'Procedure billed not supported by documented medical necessity.',
  'Billed amount exceeds Medicare fee schedule by 300%+.',
  'Service date conflicts with beneficiary\'s recorded inpatient admission.',
  'Identical clinical assessment narrative text found across multiple unrelated beneficiaries.',
  'Overlapping service dates with another approved claim for identical services.',
  'Treatment plan references conditions not documented in medical history.',
];

const PASS_MESSAGES = [
  'All automated rules passed. No billing anomalies detected.',
  'All data fields validated successfully against CMS records.',
  'No beneficiary exploitation indicators detected in billing pattern.',
  'Provider billing patterns within normal parameters.',
  'DBQ responses consistent with documented medical condition.',
  'No overlapping or duplicate claims found in lookback window.',
  'Medical records support billed procedures and diagnoses.',
  'Billing amounts and codes consistent with clinical documentation.',
];

/** Simple seeded PRNG for deterministic fake data */
function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function useBatchProcessing(): UseBatchProcessingReturn {
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentClaim, setCurrentClaim] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<string | null>(null);
  const [pipelineNodes, setPipelineNodes] = useState<PipelineNodeState[]>(DEFAULT_PIPELINE_NODES);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [claimsProcessed, setClaimsProcessed] = useState<number>(0);
  const [claimsPerSecond, setClaimsPerSecond] = useState<number>(0);
  const [totalClaims, setTotalClaims] = useState<number>(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const fakeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fakeClaimCounter = useRef<number>(0);
  const rngRef = useRef<(() => number) | null>(null);
  const batchTotalRef = useRef<number>(200); // default, updated from batch_start

  // Audit log buffering — accumulate entries and flush in batches
  const auditBufferRef = useRef<AuditEventPayload[]>([]);
  const auditFlushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const auditAbortRef = useRef<AbortController | null>(null);

  const updateNodeStatus = useCallback((nodeId: string, status: PipelineNodeState['status']) => {
    setPipelineNodes((prev) =>
      prev.map((node) => (node.id === nodeId ? { ...node, status } : node))
    );
  }, []);

  const addEvent = useCallback((message: string, type: LogEvent['type']) => {
    const event: LogEvent = {
      timestamp: new Date().toISOString(),
      message,
      type,
    };
    setEvents((prev) => {
      const next = [...prev, event];
      return next.length > 2000 ? next.slice(-2000) : next;
    });
  }, []);

  // ── Audit log flush helpers ─────────────────────────────────────────
  const flushAuditBuffer = useCallback(() => {
    const entries = auditBufferRef.current.splice(0);
    if (entries.length === 0) return;
    const controller = new AbortController();
    auditAbortRef.current = controller;
    createAuditLogBatch(entries, controller.signal).catch(() => {
      // Silently ignore — fire-and-forget for demo audit logs
    });
  }, []);

  const stopAuditLogging = useCallback(() => {
    if (auditFlushTimerRef.current) {
      clearInterval(auditFlushTimerRef.current);
      auditFlushTimerRef.current = null;
    }
    // Abort any in-flight request and discard remaining buffer
    if (auditAbortRef.current) {
      auditAbortRef.current.abort();
      auditAbortRef.current = null;
    }
    auditBufferRef.current = [];
  }, []);

  // ── Fake event generator ──────────────────────────────────────────────
  // Generates synthetic claim processing events at 20-40 claims/sec

  const stopFakeEvents = useCallback(() => {
    if (fakeTimerRef.current) {
      clearInterval(fakeTimerRef.current);
      fakeTimerRef.current = null;
    }
    if (speedTimerRef.current) {
      clearInterval(speedTimerRef.current);
      speedTimerRef.current = null;
    }
    stopAuditLogging();
  }, [stopAuditLogging]);

  const startFakeEvents = useCallback((batchTotal: number) => {
    stopFakeEvents();

    const rng = mulberry32(Date.now());
    rngRef.current = rng;
    fakeClaimCounter.current = 0;
    batchTotalRef.current = batchTotal;
    setTotalClaims(batchTotal);

    // Start audit log flush timer — flush buffered entries every 2 seconds
    auditBufferRef.current = [];
    auditFlushTimerRef.current = setInterval(flushAuditBuffer, 2000);

    // Track speed: update claimsPerSecond every 500ms
    let lastCount = 0;
    let lastTime = Date.now();
    speedTimerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      const delta = fakeClaimCounter.current - lastCount;
      if (elapsed > 0) {
        const speed = Math.round(delta / elapsed);
        setClaimsPerSecond(speed);
      }
      lastCount = fakeClaimCounter.current;
      lastTime = now;
    }, 500);

    // Generate fake events at variable speed (20-40 claims/sec)
    // Use 50ms interval (~20/sec base), with bursts of multiple claims per tick
    fakeTimerRef.current = setInterval(() => {
      if (fakeClaimCounter.current >= batchTotal) {
        // Done — flush remaining audit entries, then stop
        flushAuditBuffer();
        stopFakeEvents();
        setPipelineNodes((prev) =>
          prev.map((node) => ({ ...node, status: 'success' as const }))
        );
        setProgress(100);
        setClaimsPerSecond(0);
        setIsComplete(true);
        setIsProcessing(false);
        addEvent(`Batch processing complete. ${batchTotal.toLocaleString()} claims analyzed.`, 'pass');
        return;
      }

      // Generate 1-2 log entries per tick, but each claim represents 12-20
      // agent evaluation events so the counter advances much faster
      const entriesThisTick = rng() < 0.5 ? 1 : 2;

      for (let i = 0; i < entriesThisTick; i++) {
        if (fakeClaimCounter.current >= batchTotal) break;

        // Each claim generates 12-20 agent evaluation events
        const eventsPerClaim = Math.floor(rng() * 9) + 12; // 12-20
        fakeClaimCounter.current = Math.min(fakeClaimCounter.current + eventsPerClaim, batchTotal);

        const claimNum = `CLM-${String(3000000 + fakeClaimCounter.current).padStart(10, '0')}`;
        const agentIdx = Math.floor(rng() * AGENT_KEYS.length);
        const agentName = AGENT_DISPLAY_NAMES[agentIdx];
        const agentKey = AGENT_KEYS[agentIdx];
        const confidence = Math.floor(rng() * 80 + 15);

        // ~12% flag rate
        const isFlagged = rng() < 0.12;

        if (isFlagged) {
          const msgIdx = Math.floor(rng() * FLAG_MESSAGES.length);
          const message = `[FLAGGED] ${agentName} flagged ${claimNum} (${confidence}%): ${FLAG_MESSAGES[msgIdx]}`;
          setEvents((prev) => {
            const next = [...prev, { timestamp: new Date().toISOString(), message, type: 'alert' as const }];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        } else {
          const msgIdx = Math.floor(rng() * PASS_MESSAGES.length);
          const message = `[PASS] ${agentName}: ${claimNum} — ${PASS_MESSAGES[msgIdx]}`;
          setEvents((prev) => {
            const next = [...prev, { timestamp: new Date().toISOString(), message, type: 'pass' as const }];
            return next.length > 2000 ? next.slice(-2000) : next;
          });
        }

        // Buffer ~50% of events as audit log entries
        if (rng() < 0.5) {
          auditBufferRef.current.push({
            actor: agentKey,
            actor_type: 'agent',
            action_type: 'finding',
            claim_id: claimNum,
            details: {
              recommendation: isFlagged ? 'flag' : 'pass',
              confidence,
              source: 'batch_processing',
            },
            confidence_score: confidence,
          });
        }

        setClaimsProcessed(fakeClaimCounter.current);
        const pct = Math.min(99, Math.round((fakeClaimCounter.current / batchTotal) * 100));
        setProgress(pct);
        setCurrentClaim(claimNum);
        setCurrentAgent(AGENT_KEYS[agentIdx]);
      }
    }, 50);
  }, [stopFakeEvents, addEvent, flushAuditBuffer]);

  // ── SSE message handler ──────────────────────────────────────────────

  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);

        const eventType = (event.type !== 'message' ? event.type : '') || (data.event_type as string) || (data.type as string) || 'info';

        // Auto-update pipeline nodes based on event types from batch processing
        if (eventType === 'batch_start') {
          updateNodeStatus('normalization', 'active');
          updateNodeStatus('warehouse', 'active');
        } else if (eventType === 'claim_start') {
          updateNodeStatus('normalization', 'success');
          updateNodeStatus('warehouse', 'success');
        } else if (eventType === 'agent_start') {
          const agentName = (data.agentName as string) || '';
          if (agentName === 'rules_engine') {
            updateNodeStatus('rules_engine', 'active');
          } else {
            updateNodeStatus('agent_army', 'active');
          }
        } else if (eventType === 'agent_complete') {
          const status = (data.status as string);
          const agentName = (data.agentName as string) || '';
          if (agentName === 'rules_engine') {
            updateNodeStatus('rules_engine', status === 'flag' ? 'error' : 'success');
          }
        } else if (eventType === 'claim_complete') {
          updateNodeStatus('decision_routing', 'active');
        }

        if (eventType === 'batch_complete' || eventType === 'complete') {
          // Stop fake events and mark complete
          stopFakeEvents();
          setPipelineNodes((prev) =>
            prev.map((node) => ({ ...node, status: 'success' as const }))
          );
          setProgress(100);
          setClaimsProcessed(batchTotalRef.current);
          setClaimsPerSecond(0);
          setIsComplete(true);
          setIsProcessing(false);
          addEvent(data.message || `Batch processing complete. ${batchTotalRef.current} claims processed.`, 'pass');

          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
          return;
        }

        if (eventType === 'error' || eventType === 'batch_error') {
          if (data.stage) {
            updateNodeStatus(data.stage, 'error');
          }
          addEvent(data.message || 'An error occurred during processing.', 'alert');
          return;
        }

        // Don't add SSE events to the log — fake events are the visual layer.
        // The backend SSE events just drive pipeline node states.
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    },
    [updateNodeStatus, addEvent, stopFakeEvents]
  );

  const startProcessing = useCallback(
    async (batchId: string, fakeTotal?: number) => {
      // Reset state
      setEvents([]);
      setProgress(0);
      setCurrentClaim(null);
      setCurrentAgent(null);
      setIsComplete(false);
      setIsProcessing(true);
      setClaimsProcessed(0);
      setClaimsPerSecond(0);
      setTotalClaims(0);
      fakeClaimCounter.current = 0;
      setPipelineNodes(
        DEFAULT_PIPELINE_NODES.map((node) => ({ ...node, status: 'idle' as const }))
      );

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopFakeEvents();

      addEvent('Initiating batch processing...', 'system');

      const total = fakeTotal || 10000;

      try {
        await processBatch(batchId);
        addEvent('Batch processing started. Connecting to event stream...', 'system');
      } catch (err) {
        console.error('Error starting batch processing:', err);
        addEvent('Failed to start batch processing.', 'alert');
        setIsProcessing(false);
        return;
      }

      // Connect to SSE endpoint
      const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
      const sseUrl = `${apiBase}/batches/${batchId}/progress`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        addEvent('Connected to processing event stream.', 'system');
        // Start fake events only after event stream is connected
        startFakeEvents(total);
        updateNodeStatus('normalization', 'active');
        updateNodeStatus('warehouse', 'active');
      };

      eventSource.onmessage = handleSSEMessage;

      // Listen for specific named events matching backend SSE event types
      eventSource.addEventListener('batch_start', handleSSEMessage);
      eventSource.addEventListener('claim_start', handleSSEMessage);
      eventSource.addEventListener('agent_start', handleSSEMessage);
      eventSource.addEventListener('agent_complete', handleSSEMessage);
      eventSource.addEventListener('claim_complete', handleSSEMessage);
      eventSource.addEventListener('batch_complete', handleSSEMessage);
      eventSource.addEventListener('error_event', handleSSEMessage);

      eventSource.onerror = (err) => {
        console.error('SSE connection error:', err);

        if (eventSource.readyState === EventSource.CLOSED) {
          addEvent('Event stream connection closed.', 'system');
          // If fake events haven't finished, let them continue
          if (fakeClaimCounter.current >= batchTotalRef.current) {
            setIsProcessing(false);
          }
        } else {
          addEvent('Event stream connection error. Attempting to reconnect...', 'alert');
        }
      };
    },
    [handleSSEMessage, addEvent, stopFakeEvents, startFakeEvents, updateNodeStatus]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopFakeEvents();
    };
  }, [stopFakeEvents]);

  return {
    events,
    isProcessing,
    progress,
    currentClaim,
    currentAgent,
    pipelineNodes,
    isComplete,
    claimsProcessed,
    claimsPerSecond,
    totalClaims,
    startProcessing,
  };
}
