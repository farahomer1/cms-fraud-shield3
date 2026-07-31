// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useMemo } from 'react';
import { Box, Typography, Grid, Paper, Chip } from '@mui/material';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditClaimDetailProps {
  claimId: string | null;
}

interface AgentResult {
  key: string;
  name: string;
  confidence: number;
  flagged: boolean;
}

interface TimelineStep {
  label: string;
  timestamp: string;
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AGENTS: { key: string; name: string }[] = [
  { key: 'rules_engine', name: 'Rules Engine' },
  { key: 'data_validation', name: 'Data Validation' },
  { key: 'pension_poaching', name: 'Pension Poaching' },
  { key: 'claim_sharking', name: 'Claim Sharking' },
  { key: 'dbq_fraud', name: 'DBQ Fraud' },
  { key: 'overlapping_claims', name: 'Overlapping Claims' },
  { key: 'medical_record', name: 'Medical Record' },
  { key: 'claim_discrepancy', name: 'Claim Discrepancy' },
];

const VA_COLORS = {
  darkBlue: '#003F72',
  navyBlue: '#112E51',
  red: '#E31C3D',
  green: '#2E8540',
  blue: '#0071BC',
  gray: '#5B616B',
  yellow: '#FDB81E',
};

const TIMELINE_STEPS = [
  'Data Ingestion',
  'Normalization',
  'Rules Engine',
  'Agent Army',
  'Decision Routing',
];

// ---------------------------------------------------------------------------
// Deterministic hash seeded from claimId
// ---------------------------------------------------------------------------

function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** Simple seeded PRNG (mulberry32). Returns a function that yields [0,1). */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Synthetic data generators
// ---------------------------------------------------------------------------

function generateAgentResults(claimId: string): AgentResult[] {
  const rand = seededRandom(hashString(claimId));
  return AGENTS.map((agent) => {
    const confidence = Math.round(rand() * 80 + 15); // 15 – 95
    const flagged = confidence > 60 ? rand() > 0.3 : rand() > 0.8;
    return { ...agent, confidence, flagged };
  });
}

function generateTimeline(claimId: string): TimelineStep[] {
  const rand = seededRandom(hashString(claimId + '_timeline'));
  const baseHour = 8 + Math.floor(rand() * 4); // 08:00 – 11:59
  const baseMinute = Math.floor(rand() * 60);
  let cumulativeMs = 0;

  return TIMELINE_STEPS.map((label) => {
    const durationMs = Math.round(rand() * 4500 + 500); // 500 – 5000 ms
    const offsetSec = Math.floor(cumulativeMs / 1000);
    const min = baseMinute + Math.floor(offsetSec / 60);
    const sec = offsetSec % 60;
    const h = baseHour + Math.floor(min / 60);
    const m = min % 60;
    const timestamp = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    cumulativeMs += durationMs;
    return { label, timestamp, durationMs };
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionPaper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Paper
    elevation={0}
    sx={{
      p: 2.5,
      borderRadius: 1,
      border: '1px solid #E0E0E0',
      backgroundColor: '#FFFFFF',
      height: '100%',
    }}
  >
    {children}
  </Paper>
);

// 1. Agent Performance Radar
const AgentPerformanceRadar: React.FC<{ agents: AgentResult[] }> = ({ agents }) => {
  const radarData = agents.map((a) => ({
    agent: a.name,
    confidence: a.confidence,
    fullMark: 100,
  }));

  return (
    <SectionPaper>
      <Typography variant="h6" fontWeight={600} sx={{ color: VA_COLORS.navyBlue, mb: 0.5 }}>
        Agent Performance Radar
      </Typography>
      <Typography variant="caption" sx={{ color: VA_COLORS.gray, mb: 1, display: 'block' }}>
        Confidence scores across all 8 fraud-detection agents for this claim
      </Typography>
      <ResponsiveContainer width="100%" height={320}>
        <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
          <PolarGrid stroke="#E0E0E0" />
          <PolarAngleAxis
            dataKey="agent"
            tick={{ fontSize: 10, fill: VA_COLORS.navyBlue }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: VA_COLORS.gray }}
            tickCount={5}
          />
          <Radar
            name="Confidence"
            dataKey="confidence"
            stroke={VA_COLORS.darkBlue}
            fill={VA_COLORS.blue}
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${VA_COLORS.darkBlue}`,
              borderRadius: 4,
              fontSize: 13,
            }}
            formatter={(value: number) => [`${value}%`, 'Confidence']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </SectionPaper>
  );
};

// 2. Audit Process Timeline
const AuditProcessTimeline: React.FC<{ steps: TimelineStep[] }> = ({ steps }) => {
  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);

  return (
    <SectionPaper>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: VA_COLORS.navyBlue }}>
          Audit Process Timeline
        </Typography>
        <Typography variant="body2" sx={{ color: VA_COLORS.gray }}>
          {(totalMs / 1000).toFixed(2)}s total
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: VA_COLORS.gray, mb: 2, display: 'block' }}>
        Sequential processing stages with timestamps and per-stage durations
      </Typography>

      <Box sx={{ position: 'relative', pl: 3, mt: 1 }}>
        {/* Vertical line */}
        <Box
          sx={{
            position: 'absolute',
            left: 10,
            top: 4,
            bottom: 4,
            width: 2,
            backgroundColor: VA_COLORS.blue,
            opacity: 0.35,
          }}
        />

        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const barWidthPct = totalMs > 0 ? (step.durationMs / totalMs) * 100 : 0;

          return (
            <Box key={step.label} sx={{ position: 'relative', mb: isLast ? 0 : 2.5, pl: 2 }}>
              {/* Dot */}
              <Box
                sx={{
                  position: 'absolute',
                  left: -16,
                  top: 4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  backgroundColor: isLast ? VA_COLORS.green : VA_COLORS.blue,
                  border: '2px solid #FFFFFF',
                  boxShadow: `0 0 0 2px ${isLast ? VA_COLORS.green : VA_COLORS.blue}`,
                }}
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: VA_COLORS.navyBlue }}>
                  {step.label}
                </Typography>
                <Typography variant="caption" sx={{ color: VA_COLORS.gray, fontFamily: 'monospace' }}>
                  {step.timestamp}
                </Typography>
              </Box>

              {/* Duration bar */}
              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isLast ? VA_COLORS.green : VA_COLORS.blue,
                    opacity: 0.6,
                    width: `${Math.max(barWidthPct, 5)}%`,
                    maxWidth: '80%',
                    transition: 'width 0.4s ease',
                  }}
                />
                <Typography variant="caption" sx={{ color: VA_COLORS.gray, whiteSpace: 'nowrap' }}>
                  {step.durationMs.toLocaleString()} ms
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </SectionPaper>
  );
};

// 3. Agent Findings Summary (horizontal bar)
const AgentFindingsSummary: React.FC<{ agents: AgentResult[] }> = ({ agents }) => {
  const barData = agents.map((a) => ({
    name: a.name,
    confidence: a.confidence,
    flagged: a.flagged,
  }));

  return (
    <SectionPaper>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 2, mb: 0.5 }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: VA_COLORS.navyBlue }}>
          Agent Findings Summary
        </Typography>
        <Typography variant="body2" sx={{ color: VA_COLORS.gray }}>
          {agents.filter((a) => a.flagged).length} of {agents.length} flagged
        </Typography>
      </Box>
      <Typography variant="caption" sx={{ color: VA_COLORS.gray, mb: 1, display: 'block' }}>
        Per-agent flag status and associated confidence scores
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          layout="vertical"
          data={barData}
          margin={{ top: 5, right: 30, left: 5, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: VA_COLORS.navyBlue }}
            tickFormatter={(v: number) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: VA_COLORS.navyBlue }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              border: `1px solid ${VA_COLORS.darkBlue}`,
              borderRadius: 4,
              fontSize: 13,
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, _name: any, props: any) => [
              `${value}% (${props?.payload?.flagged ? 'Flagged' : 'Passed'})`,
              'Confidence',
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            payload={[
              { value: 'Flagged', type: 'square', color: VA_COLORS.red },
              { value: 'Passed', type: 'square', color: VA_COLORS.green },
            ]}
          />
          <Bar dataKey="confidence" name="Confidence" radius={[0, 4, 4, 0]}>
            {barData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.flagged ? VA_COLORS.red : VA_COLORS.green}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </SectionPaper>
  );
};

// 4. Claim Risk Indicators
const ClaimRiskIndicators: React.FC<{
  agents: AgentResult[];
  timeline: TimelineStep[];
}> = ({ agents, timeline }) => {
  const totalMs = timeline.reduce((sum, s) => sum + s.durationMs, 0);
  const flaggedCount = agents.filter((a) => a.flagged).length;
  const highestConfidence = Math.max(...agents.map((a) => a.confidence));

  const riskLevel: { label: string; color: string } = (() => {
    if (flaggedCount >= 5) return { label: 'Critical', color: VA_COLORS.red };
    if (flaggedCount >= 3) return { label: 'High', color: '#D63E04' };
    if (flaggedCount >= 1) return { label: 'Medium', color: VA_COLORS.yellow };
    return { label: 'Low', color: VA_COLORS.green };
  })();

  const metrics: { label: string; value: string; subtitle: string; color: string }[] = [
    {
      label: 'Total Processing Time',
      value: `${(totalMs / 1000).toFixed(2)}s`,
      subtitle: `${timeline.length} stages completed`,
      color: VA_COLORS.blue,
    },
    {
      label: 'Agents That Flagged',
      value: `${flaggedCount} / ${agents.length}`,
      subtitle: flaggedCount === 0 ? 'No agents raised concerns' : `${flaggedCount} agent${flaggedCount > 1 ? 's' : ''} raised flag${flaggedCount > 1 ? 's' : ''}`,
      color: flaggedCount >= 3 ? VA_COLORS.red : flaggedCount >= 1 ? VA_COLORS.yellow : VA_COLORS.green,
    },
    {
      label: 'Highest Confidence',
      value: `${highestConfidence}%`,
      subtitle: agents.find((a) => a.confidence === highestConfidence)?.name || '',
      color: highestConfidence >= 75 ? VA_COLORS.red : highestConfidence >= 50 ? VA_COLORS.yellow : VA_COLORS.green,
    },
    {
      label: 'Risk Level',
      value: riskLevel.label,
      subtitle: `Based on ${flaggedCount} flag${flaggedCount !== 1 ? 's' : ''} & ${highestConfidence}% peak confidence`,
      color: riskLevel.color,
    },
  ];

  return (
    <SectionPaper>
      <Typography variant="h6" fontWeight={600} sx={{ color: VA_COLORS.navyBlue, mb: 0.5 }}>
        Claim Risk Indicators
      </Typography>
      <Typography variant="caption" sx={{ color: VA_COLORS.gray, mb: 2, display: 'block' }}>
        Key metrics summarizing the overall risk assessment for this claim
      </Typography>

      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid item xs={6} key={m.label}>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                border: '1px solid #E0E0E0',
                backgroundColor: '#FAFBFC',
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: VA_COLORS.gray, fontWeight: 500, textTransform: 'uppercase', letterSpacing: 0.5 }}
              >
                {m.label}
              </Typography>
              <Typography variant="h5" fontWeight={700} sx={{ color: m.color, mt: 0.5 }}>
                {m.value}
              </Typography>
              <Typography variant="caption" sx={{ color: VA_COLORS.gray }}>
                {m.subtitle}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </SectionPaper>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AuditClaimDetail: React.FC<AuditClaimDetailProps> = ({ claimId }) => {
  const agents = useMemo(() => (claimId ? generateAgentResults(claimId) : []), [claimId]);
  const timeline = useMemo(() => (claimId ? generateTimeline(claimId) : []), [claimId]);

  if (!claimId) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          px: 2,
          border: '1px dashed #CCC',
          borderRadius: 1,
          backgroundColor: '#FAFBFC',
        }}
      >
        <Typography variant="body1" sx={{ color: VA_COLORS.gray }}>
          Select a claim to view detailed audit information.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Typography variant="h6" fontWeight={700} sx={{ color: VA_COLORS.navyBlue }}>
          Claim Detail
        </Typography>
        <Chip
          label={claimId}
          size="small"
          sx={{
            backgroundColor: VA_COLORS.darkBlue,
            color: '#FFFFFF',
            fontWeight: 600,
            fontFamily: 'monospace',
            fontSize: 12,
          }}
        />
        <Chip
          label={`${agents.filter((a) => a.flagged).length} flags`}
          size="small"
          sx={{
            backgroundColor:
              agents.filter((a) => a.flagged).length >= 3
                ? VA_COLORS.red
                : agents.filter((a) => a.flagged).length >= 1
                ? VA_COLORS.yellow
                : VA_COLORS.green,
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: 12,
          }}
        />
      </Box>

      {/* 2x2 Grid */}
      <Grid container spacing={2.5}>
        {/* Top-left: Radar */}
        <Grid item xs={12} md={6}>
          <AgentPerformanceRadar agents={agents} />
        </Grid>

        {/* Top-right: Timeline */}
        <Grid item xs={12} md={6}>
          <AuditProcessTimeline steps={timeline} />
        </Grid>

        {/* Bottom-left: Bar chart */}
        <Grid item xs={12} md={6}>
          <AgentFindingsSummary agents={agents} />
        </Grid>

        {/* Bottom-right: Risk indicators */}
        <Grid item xs={12} md={6}>
          <ClaimRiskIndicators agents={agents} timeline={timeline} />
        </Grid>
      </Grid>
    </Box>
  );
};

export default AuditClaimDetail;
