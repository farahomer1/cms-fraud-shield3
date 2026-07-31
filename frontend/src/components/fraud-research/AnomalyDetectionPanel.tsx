// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

// --- Time series anomaly scores (30 days) ---
const timeSeriesData = [
  { day: 'Jan 1', score: 0.12, claims: 42, threshold: 0.65 },
  { day: 'Jan 2', score: 0.15, claims: 38, threshold: 0.65 },
  { day: 'Jan 3', score: 0.22, claims: 45, threshold: 0.65 },
  { day: 'Jan 4', score: 0.18, claims: 41, threshold: 0.65 },
  { day: 'Jan 5', score: 0.31, claims: 52, threshold: 0.65 },
  { day: 'Jan 6', score: 0.14, claims: 28, threshold: 0.65 },
  { day: 'Jan 7', score: 0.11, claims: 22, threshold: 0.65 },
  { day: 'Jan 8', score: 0.25, claims: 47, threshold: 0.65 },
  { day: 'Jan 9', score: 0.19, claims: 39, threshold: 0.65 },
  { day: 'Jan 10', score: 0.72, claims: 68, threshold: 0.65 },
  { day: 'Jan 11', score: 0.81, claims: 74, threshold: 0.65 },
  { day: 'Jan 12', score: 0.45, claims: 55, threshold: 0.65 },
  { day: 'Jan 13', score: 0.28, claims: 43, threshold: 0.65 },
  { day: 'Jan 14', score: 0.16, claims: 31, threshold: 0.65 },
  { day: 'Jan 15', score: 0.21, claims: 44, threshold: 0.65 },
  { day: 'Jan 16', score: 0.33, claims: 49, threshold: 0.65 },
  { day: 'Jan 17', score: 0.88, claims: 82, threshold: 0.65 },
  { day: 'Jan 18', score: 0.76, claims: 71, threshold: 0.65 },
  { day: 'Jan 19', score: 0.42, claims: 53, threshold: 0.65 },
  { day: 'Jan 20', score: 0.19, claims: 36, threshold: 0.65 },
  { day: 'Jan 21', score: 0.13, claims: 25, threshold: 0.65 },
  { day: 'Jan 22', score: 0.24, claims: 46, threshold: 0.65 },
  { day: 'Jan 23', score: 0.29, claims: 48, threshold: 0.65 },
  { day: 'Jan 24', score: 0.67, claims: 62, threshold: 0.65 },
  { day: 'Jan 25', score: 0.91, claims: 89, threshold: 0.65 },
  { day: 'Jan 26', score: 0.85, claims: 78, threshold: 0.65 },
  { day: 'Jan 27', score: 0.54, claims: 58, threshold: 0.65 },
  { day: 'Jan 28', score: 0.32, claims: 44, threshold: 0.65 },
  { day: 'Jan 29', score: 0.17, claims: 37, threshold: 0.65 },
  { day: 'Jan 30', score: 0.21, claims: 40, threshold: 0.65 },
];

// --- Statistical outlier claims ---
interface OutlierClaim {
  claim_id: string;
  provider_name: string;
  beneficiary_name: string;
  billing_amount: number;
  isolation_score: number;
  z_score: number;
  anomaly_type: string;
  detected_date: string;
  method: string;
}

const outlierClaims: OutlierClaim[] = [
  {
    claim_id: 'CLM-2024-10501',
    provider_name: 'Tampa Bay Members Services',
    beneficiary_name: 'Harold P. Stevens',
    billing_amount: 47800,
    isolation_score: 0.96,
    z_score: 4.2,
    anomaly_type: 'Billing Amount',
    detected_date: 'Jan 25',
    method: 'Isolation Forest',
  },
  {
    claim_id: 'CLM-2024-10234',
    provider_name: 'Sunshine State Health Partners',
    beneficiary_name: 'Margaret L. Kim',
    billing_amount: 33500,
    isolation_score: 0.93,
    z_score: 3.8,
    anomaly_type: 'Service Frequency',
    detected_date: 'Jan 17',
    method: 'Isolation Forest',
  },
  {
    claim_id: 'CLM-2024-10678',
    provider_name: 'Gulf Coast Medical Associates',
    beneficiary_name: 'Thomas R. Garcia',
    billing_amount: 28900,
    isolation_score: 0.91,
    z_score: 3.5,
    anomaly_type: 'Temporal Pattern',
    detected_date: 'Jan 25',
    method: 'LOF',
  },
  {
    claim_id: 'CLM-2024-10112',
    provider_name: 'Orlando Member Care LLC',
    beneficiary_name: 'Karen D. Williams',
    billing_amount: 21400,
    isolation_score: 0.89,
    z_score: 3.3,
    anomaly_type: 'Code Combination',
    detected_date: 'Jan 11',
    method: 'Isolation Forest',
  },
  {
    claim_id: 'CLM-2024-10789',
    provider_name: 'Emerald Coast Claims Corp',
    beneficiary_name: 'David W. Johnson',
    billing_amount: 19200,
    isolation_score: 0.87,
    z_score: 3.1,
    anomaly_type: 'Provider Behavior',
    detected_date: 'Jan 26',
    method: 'Autoencoder',
  },
  {
    claim_id: 'CLM-2024-10345',
    provider_name: 'Pensacola Members Aid Group',
    beneficiary_name: 'Lisa M. Taylor',
    billing_amount: 15800,
    isolation_score: 0.85,
    z_score: 2.9,
    anomaly_type: 'Geographic Anomaly',
    detected_date: 'Jan 18',
    method: 'LOF',
  },
  {
    claim_id: 'CLM-2024-10567',
    provider_name: 'Bay Pines Health Network',
    beneficiary_name: 'Charles E. Robinson',
    billing_amount: 12300,
    isolation_score: 0.82,
    z_score: 2.7,
    anomaly_type: 'Billing Pattern',
    detected_date: 'Jan 10',
    method: 'Autoencoder',
  },
  {
    claim_id: 'CLM-2024-10890',
    provider_name: 'Bayfront Disability Services',
    beneficiary_name: 'Nancy A. Clark',
    billing_amount: 9600,
    isolation_score: 0.80,
    z_score: 2.5,
    anomaly_type: 'Diagnosis Rarity',
    detected_date: 'Jan 24',
    method: 'Isolation Forest',
  },
];

// --- Distribution comparison data ---
const distributionData = [
  { range: '$0-2K', normal: 180, anomalous: 2 },
  { range: '$2K-5K', normal: 245, anomalous: 5 },
  { range: '$5K-10K', normal: 198, anomalous: 8 },
  { range: '$10K-15K', normal: 120, anomalous: 12 },
  { range: '$15K-20K', normal: 65, anomalous: 18 },
  { range: '$20K-30K', normal: 28, anomalous: 22 },
  { range: '$30K-50K', normal: 8, anomalous: 15 },
  { range: '$50K+', normal: 2, anomalous: 8 },
];

type ViewMode = 'timeseries' | 'distribution';

const AnomalyDetectionPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('timeseries');

  const anomalyDays = timeSeriesData.filter((d) => d.score > d.threshold).length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Info Banner */}
      <Paper
        variant="outlined"
        sx={{ p: 2, borderRadius: 2, backgroundColor: '#F0F6FC', borderColor: '#003F72' }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <InfoOutlinedIcon sx={{ color: '#003F72', fontSize: 20, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51' }}>
              Statistical Anomaly Detection
            </Typography>
            <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5, lineHeight: 1.6 }}>
              Multiple anomaly detection algorithms run in parallel: <strong>Isolation Forest</strong> for
              high-dimensional outlier detection, <strong>Local Outlier Factor (LOF)</strong> for density-based
              anomalies, and <strong>Autoencoders</strong> for reconstruction-error-based detection. These methods
              find claims that deviate significantly from normal patterns without requiring labeled fraud examples.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Anomaly Summary Chips */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Chip
          icon={<WarningAmberIcon />}
          label={`${anomalyDays} Anomaly Days Detected`}
          sx={{ backgroundColor: '#FDE0DB', color: '#E31C3D', fontWeight: 600 }}
        />
        <Chip
          label={`${outlierClaims.length} Outlier Claims Identified`}
          sx={{ backgroundColor: '#FFF3CD', color: '#856404', fontWeight: 600 }}
        />
        <Chip
          label="3 Detection Methods Active"
          sx={{ backgroundColor: '#E7F4E4', color: '#2E8540', fontWeight: 600 }}
        />
        <Chip
          label="Threshold: 0.65"
          variant="outlined"
          sx={{ fontWeight: 600, borderColor: '#003F72', color: '#003F72' }}
        />
      </Stack>

      {/* Chart Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Anomaly Signals
        </Typography>
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, v) => v && setViewMode(v)}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              px: 2,
              '&.Mui-selected': { backgroundColor: '#003F72', color: '#fff' },
              '&.Mui-selected:hover': { backgroundColor: '#112E51' },
            },
          }}
        >
          <ToggleButton value="timeseries">Time Series</ToggleButton>
          <ToggleButton value="distribution">Distribution</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Time Series Anomaly Chart */}
      {viewMode === 'timeseries' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            Anomaly Score Over Time (30-Day Window)
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Daily aggregate anomaly score across all claims. Spikes above the threshold indicate periods of elevated fraudulent activity.
          </Typography>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={timeSeriesData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#5B616B' }} interval={2} />
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'Anomaly Score',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'Claim Volume',
                  angle: 90,
                  position: 'insideRight',
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <Tooltip
                contentStyle={{ border: '1px solid #003F72', borderRadius: 4, fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  if (name === 'score') return [value.toFixed(2), 'Anomaly Score'];
                  if (name === 'claims') return [value, 'Claim Volume'];
                  return [value, name];
                }}
              />
              <ReferenceLine
                yAxisId="left"
                y={0.65}
                stroke="#E31C3D"
                strokeDasharray="8 4"
                strokeWidth={2}
                label={{
                  value: 'Threshold (0.65)',
                  position: 'right',
                  style: { fontSize: 10, fill: '#E31C3D' },
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="score"
                fill="#E31C3D"
                fillOpacity={0.08}
                stroke="none"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="score"
                stroke="#003F72"
                strokeWidth={2.5}
                dot={(props: { cx: number; cy: number; payload: { score: number; threshold: number } }) => {
                  const { cx, cy, payload } = props;
                  const isAnomaly = payload.score > payload.threshold;
                  return (
                    <circle
                      key={`dot-${cx}-${cy}`}
                      cx={cx}
                      cy={cy}
                      r={isAnomaly ? 6 : 3}
                      fill={isAnomaly ? '#E31C3D' : '#003F72'}
                      stroke={isAnomaly ? '#E31C3D' : '#003F72'}
                      strokeWidth={isAnomaly ? 2 : 0}
                      fillOpacity={isAnomaly ? 1 : 0.8}
                    />
                  );
                }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="claims"
                stroke="#02BFE7"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#003F72' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Anomaly Score</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#02BFE7', borderStyle: 'dashed' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Claim Volume</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#E31C3D' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Above Threshold</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Distribution Comparison */}
      {viewMode === 'distribution' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            Billing Amount Distribution: Normal vs. Anomalous Claims
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Comparison of billing amount distributions between normal claims and those flagged by anomaly detection
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={distributionData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#5B616B' }} />
              <YAxis tick={{ fontSize: 11, fill: '#5B616B' }} />
              <Tooltip contentStyle={{ border: '1px solid #003F72', borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="normal" name="Normal Claims" fill="#003F72" fillOpacity={0.6} radius={[4, 4, 0, 0]} />
              <Bar dataKey="anomalous" name="Anomalous Claims" fill="#E31C3D" fillOpacity={0.75} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#003F72', opacity: 0.6 }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Normal Claims (n=846)</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: 1, backgroundColor: '#E31C3D', opacity: 0.75 }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Anomalous Claims (n=90)</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Outlier Claims Table */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51' }}>
              Top Statistical Outliers
            </Typography>
            <Typography variant="caption" sx={{ color: '#5B616B' }}>
              Claims with the highest anomaly scores across all detection methods
            </Typography>
          </Box>
          <Chip
            label={`${outlierClaims.length} Outliers`}
            size="small"
            sx={{ backgroundColor: '#FDE0DB', color: '#E31C3D', fontWeight: 700 }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: '#112E51', fontSize: '0.75rem', borderBottom: '2px solid #003F72' } }}>
                <TableCell>Claim ID</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Member</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Isolation Score</TableCell>
                <TableCell align="center">Z-Score</TableCell>
                <TableCell>Anomaly Type</TableCell>
                <TableCell>Method</TableCell>
                <TableCell>Detected</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {outlierClaims.map((row) => (
                <TableRow key={row.claim_id} hover sx={{ '&:hover': { backgroundColor: '#F0F6FC' } }}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#003F72', fontSize: '0.8rem' }}>
                      {row.claim_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{row.provider_name}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{row.beneficiary_name}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                      ${row.billing_amount.toLocaleString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                      <LinearProgress
                        variant="determinate"
                        value={row.isolation_score * 100}
                        sx={{
                          width: 50,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: '#E0E0E0',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: row.isolation_score >= 0.9 ? '#E31C3D' : '#FDB81E',
                            borderRadius: 3,
                          },
                        }}
                      />
                      <Typography variant="caption" fontWeight={600}>
                        {row.isolation_score.toFixed(2)}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={`${row.z_score.toFixed(1)}σ`}
                      size="small"
                      sx={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        backgroundColor: row.z_score >= 3.5 ? '#FDE0DB' : '#FFF3CD',
                        color: row.z_score >= 3.5 ? '#E31C3D' : '#856404',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={row.anomaly_type}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#5B616B' }}>{row.method}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#5B616B' }}>{row.detected_date}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default AnomalyDetectionPanel;
