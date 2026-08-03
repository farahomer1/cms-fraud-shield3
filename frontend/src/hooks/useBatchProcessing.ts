// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import { useState, useRef, useCallback, useEffect } from 'react';
import { LogEvent } from '../components/processing/StatusLog';
import { PipelineNodeState } from '../components/processing/PipelineAnimation';
import { processBatch } from '../services/batchService';

const DEFAULT_PIPELINE_NODES: PipelineNodeState[] = [
  { id: 'normalization', label: 'Data Normalization', status: 'idle' },
  { id: 'warehouse', label: 'Data Warehouse', status: 'idle' },
  { id: 'rules_engine', label: 'Rules Engine', status: 'idle' },
  { id: 'agent_army', label: 'Agent Army (4 concurrent nodes)', status: 'idle' },
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
  const startTimeRef = useRef<number | null>(null);
  const processedCountRef = useRef<number>(0);
  const totalClaimsRef = useRef<number>(0);

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

  // ── SSE message handler ──────────────────────────────────────────────

  const handleSSEMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        const eventType = (event.type !== 'message' ? event.type : '') || (data.event_type as string) || (data.type as string) || 'info';

        // Auto-update pipeline nodes and logs based on event types from real batch processing
        if (eventType === 'batch_start') {
          startTimeRef.current = performance.now();
          processedCountRef.current = 0;
          const total = data.data?.totalClaims || data.totalClaims || 0;
          totalClaimsRef.current = total;
          setTotalClaims(total);
          setClaimsProcessed(0);
          setProgress(0);
          updateNodeStatus('normalization', 'active');
          updateNodeStatus('warehouse', 'active');
          addEvent(`[SYSTEM] Batch processing initiated: Analyzing ${total} claims with CMS Federated AI Agents.`, 'system');
        } else if (eventType === 'claim_start') {
          const claimNumber = data.data?.claimNumber || data.claimNumber || '';
          setCurrentClaim(claimNumber);
          updateNodeStatus('normalization', 'success');
          updateNodeStatus('warehouse', 'success');
          addEvent(`[SYSTEM] Starting multi-agent analysis of ${claimNumber}`, 'system');
        } else if (eventType === 'agent_start') {
          const agentName = data.data?.agentName || data.agentName || '';
          const agentDisplayName = data.data?.agentDisplayName || data.agentDisplayName || agentName;
          setCurrentAgent(agentName);
          if (agentName === 'rules_service' || agentName === 'rules_engine') {
            updateNodeStatus('rules_engine', 'active');
          } else {
            updateNodeStatus('agent_army', 'active');
          }
          addEvent(`[SYSTEM] ${agentDisplayName} analyzing claim...`, 'system');
        } else if (eventType === 'agent_complete') {
          const agentName = data.data?.agentName || data.agentName || '';
          const agentDisplayName = data.data?.agentDisplayName || data.agentDisplayName || agentName;
          const status = data.data?.status || data.status || 'pass';
          const recommendation = data.data?.recommendation || data.recommendation || 'pass';
          const confidenceScore = data.data?.confidenceScore || data.confidenceScore || 0;
          const msg = data.data?.message || data.message || '';

          if (agentName === 'rules_service' || agentName === 'rules_engine') {
            updateNodeStatus('rules_engine', status === 'flag' || status === 'error' ? 'error' : 'success');
          } else {
            updateNodeStatus('agent_army', 'active');
          }

          if (status === 'flag' || recommendation === 'flag' || status === 'error') {
            addEvent(`[ALERT] ${agentDisplayName} flagged claim (${confidenceScore}%): ${msg}`, 'alert');
          } else {
            addEvent(`[PASS] ${agentDisplayName}: ${msg || 'Claim within normal compliance bounds.'}`, 'pass');
          }
        } else if (eventType === 'claim_complete') {
          updateNodeStatus('decision_routing', 'active');
          processedCountRef.current += 1;
          setClaimsProcessed(processedCountRef.current);
          
          const total = totalClaimsRef.current || 1;
          const pct = Math.min(99, Math.round((processedCountRef.current / total) * 100));
          setProgress(pct);

          // Calculate current speed
          if (startTimeRef.current !== null) {
            const elapsedSeconds = (performance.now() - startTimeRef.current) / 1000;
            if (elapsedSeconds > 0) {
              const speed = Math.round(processedCountRef.current / elapsedSeconds);
              setClaimsPerSecond(speed);
            }
          }
        } else if (eventType === 'batch_complete' || eventType === 'complete') {
          setPipelineNodes((prev) =>
            prev.map((node) => ({ ...node, status: 'success' as const }))
          );
          setProgress(100);
          const total = data.data?.totalClaims || data.totalClaims || processedCountRef.current;
          setClaimsProcessed(total);
          setClaimsPerSecond(0);
          setIsComplete(true);
          setIsProcessing(false);
          const msg = data.data?.message || data.message || `Batch processing complete. ${total} claims processed.`;
          addEvent(`[SYSTEM] ${msg}`, 'pass');

          if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
          }
        } else if (eventType === 'error' || eventType === 'batch_error' || eventType === 'error_event') {
          const stage = data.data?.stage || data.stage;
          if (stage) {
            updateNodeStatus(stage, 'error');
          }
          const msg = data.data?.message || data.message || 'An error occurred during processing.';
          addEvent(`[ALERT] ${msg}`, 'alert');
          setIsProcessing(false);
        }
      } catch (err) {
        console.error('Error parsing SSE event:', err);
      }
    },
    [updateNodeStatus, addEvent]
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
      processedCountRef.current = 0;
      startTimeRef.current = null;
      setPipelineNodes(
        DEFAULT_PIPELINE_NODES.map((node) => ({ ...node, status: 'idle' as const }))
      );

      // Close existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      addEvent('[SYSTEM] Initiating real-time batch processing...', 'system');

      try {
        await processBatch(batchId);
        addEvent('[SYSTEM] Batch processing initiated. Subscribing to CMS live agent EventStream...', 'system');
      } catch (err) {
        console.error('Error starting batch processing:', err);
        addEvent('[ALERT] Failed to start batch processing.', 'alert');
        setIsProcessing(false);
        return;
      }

      // Connect to SSE endpoint
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const sseUrl = `${apiBase}/api/batches/${batchId}/progress`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        addEvent('[SYSTEM] Successfully connected to processing event stream.', 'system');
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
          addEvent('[SYSTEM] Event stream connection closed.', 'system');
          setIsProcessing(false);
        } else {
          addEvent('[ALERT] Event stream connection error. Attempting automatic reconnection...', 'alert');
        }
      };
    },
    [handleSSEMessage, addEvent, updateNodeStatus]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, []);

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
