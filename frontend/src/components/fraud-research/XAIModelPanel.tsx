// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  ComposedChart,
  Area,
  Line,
} from 'recharts';

// --- Synthetic data for SHAP feature importance ---
const featureImportanceData = [
  { feature: 'Billing Amount', shap_value: 0.42, direction: 'fraud' as const },
  { feature: 'Provider Risk Score', shap_value: 0.38, direction: 'fraud' as const },
  { feature: 'Service Frequency', shap_value: 0.31, direction: 'fraud' as const },
  { feature: 'Member Deceased Status', shap_value: 0.28, direction: 'fraud' as const },
  { feature: 'Diagnosis Code Rarity', shap_value: 0.24, direction: 'fraud' as const },
  { feature: 'Geographic Distance', shap_value: 0.19, direction: 'fraud' as const },
  { feature: 'Temporal Clustering', shap_value: 0.15, direction: 'fraud' as const },
  { feature: 'Cross-Provider Overlap', shap_value: 0.12, direction: 'fraud' as const },
  { feature: 'Claim Type Match', shap_value: -0.08, direction: 'legitimate' as const },
  { feature: 'Provider Accreditation', shap_value: -0.15, direction: 'legitimate' as const },
  { feature: 'Historical Approval Rate', shap_value: -0.18, direction: 'legitimate' as const },
  { feature: 'Member Service History', shap_value: -0.22, direction: 'legitimate' as const },
];

// --- Model confidence distribution data ---
const confidenceDistribution = [
  { range: '0-10%', count: 245, fill: '#2E8540' },
  { range: '10-20%', count: 189, fill: '#2E8540' },
  { range: '20-30%', count: 134, fill: '#2E8540' },
  { range: '30-40%', count: 98, fill: '#FDB81E' },
  { range: '40-50%', count: 76, fill: '#FDB81E' },
  { range: '50-60%', count: 64, fill: '#FDB81E' },
  { range: '60-70%', count: 52, fill: '#E31C3D' },
  { range: '70-80%', count: 41, fill: '#E31C3D' },
  { range: '80-90%', count: 28, fill: '#E31C3D' },
  { range: '90-100%', count: 18, fill: '#E31C3D' },
];

// --- Predicted fraudulent but not flagged claims ---
interface UnflaggedPrediction {
  claim_id: string;
  beneficiary_name: string;
  provider_name: string;
  billing_amount: number;
  predicted_probability: number;
  top_contributing_feature: string;
  feature_contribution: number;
  current_status: 'approved' | 'pending';
  model: string;
}

const unflaggedPredictions: UnflaggedPrediction[] = [
  {
    claim_id: 'CLM-2024-08847',
    beneficiary_name: 'James R. Wilson',
    provider_name: 'Tampa Bay Members Services',
    billing_amount: 14250,
    predicted_probability: 0.94,
    top_contributing_feature: 'Billing Amount Anomaly',
    feature_contribution: 0.38,
    current_status: 'approved',
    model: 'XGBoost Ensemble',
  },
  {
    claim_id: 'CLM-2024-09123',
    beneficiary_name: 'Maria T. Gonzalez',
    provider_name: 'Sunshine State Health Partners',
    billing_amount: 8900,
    predicted_probability: 0.91,
    top_contributing_feature: 'Service Frequency',
    feature_contribution: 0.35,
    current_status: 'approved',
    model: 'XGBoost Ensemble',
  },
  {
    claim_id: 'CLM-2024-09456',
    beneficiary_name: 'Robert L. Chen',
    provider_name: 'Orlando Member Care LLC',
    billing_amount: 22100,
    predicted_probability: 0.88,
    top_contributing_feature: 'Provider Risk Pattern',
    feature_contribution: 0.42,
    current_status: 'approved',
    model: 'Neural Network',
  },
  {
    claim_id: 'CLM-2024-09501',
    beneficiary_name: 'Patricia A. Davis',
    provider_name: 'Gulf Coast Medical Associates',
    billing_amount: 6750,
    predicted_probability: 0.87,
    top_contributing_feature: 'Temporal Clustering',
    feature_contribution: 0.29,
    current_status: 'pending',
    model: 'Random Forest',
  },
  {
    claim_id: 'CLM-2024-09678',
    beneficiary_name: 'William K. Thompson',
    provider_name: 'Pensacola Members Aid Group',
    billing_amount: 31400,
    predicted_probability: 0.85,
    top_contributing_feature: 'Billing Amount Anomaly',
    feature_contribution: 0.51,
    current_status: 'approved',
    model: 'XGBoost Ensemble',
  },
  {
    claim_id: 'CLM-2024-09812',
    beneficiary_name: 'Dorothy M. Brown',
    provider_name: 'Bayfront Disability Services',
    billing_amount: 11200,
    predicted_probability: 0.83,
    top_contributing_feature: 'Diagnosis Code Rarity',
    feature_contribution: 0.33,
    current_status: 'approved',
    model: 'Neural Network',
  },
  {
    claim_id: 'CLM-2024-09945',
    beneficiary_name: 'Michael J. Anderson',
    provider_name: 'Emerald Coast Claims Corp',
    billing_amount: 18600,
    predicted_probability: 0.81,
    top_contributing_feature: 'Cross-Provider Overlap',
    feature_contribution: 0.27,
    current_status: 'pending',
    model: 'Random Forest',
  },
  {
    claim_id: 'CLM-2024-10023',
    beneficiary_name: 'Susan E. Martinez',
    provider_name: 'Tampa Bay Members Services',
    billing_amount: 9400,
    predicted_probability: 0.79,
    top_contributing_feature: 'Geographic Distance',
    feature_contribution: 0.24,
    current_status: 'approved',
    model: 'XGBoost Ensemble',
  },
];

// --- Individual prediction explanation (waterfall) ---
const waterfallData = [
  { feature: 'Base Rate', value: 0.12, cumulative: 0.12, fill: '#8D9297' },
  { feature: 'Billing Amount', value: 0.22, cumulative: 0.34, fill: '#E31C3D' },
  { feature: 'Provider Risk', value: 0.18, cumulative: 0.52, fill: '#E31C3D' },
  { feature: 'Service Freq.', value: 0.14, cumulative: 0.66, fill: '#E31C3D' },
  { feature: 'Diagnosis Rarity', value: 0.09, cumulative: 0.75, fill: '#E31C3D' },
  { feature: 'Geo. Distance', value: 0.06, cumulative: 0.81, fill: '#FDB81E' },
  { feature: 'Member History', value: -0.04, cumulative: 0.77, fill: '#2E8540' },
  { feature: 'Accreditation', value: -0.03, cumulative: 0.74, fill: '#2E8540' },
  { feature: 'Time Pattern', value: 0.08, cumulative: 0.82, fill: '#E31C3D' },
  { feature: 'Final Score', value: 0, cumulative: 0.82, fill: '#003F72' },
];

// --- Model performance over time ---
const modelPerformanceData = [
  { week: 'W1', precision: 0.89, recall: 0.72, f1: 0.80, falseNegRate: 0.28 },
  { week: 'W2', precision: 0.90, recall: 0.74, f1: 0.81, falseNegRate: 0.26 },
  { week: 'W3', precision: 0.88, recall: 0.76, f1: 0.82, falseNegRate: 0.24 },
  { week: 'W4', precision: 0.91, recall: 0.78, f1: 0.84, falseNegRate: 0.22 },
  { week: 'W5', precision: 0.90, recall: 0.80, f1: 0.85, falseNegRate: 0.20 },
  { week: 'W6', precision: 0.92, recall: 0.81, f1: 0.86, falseNegRate: 0.19 },
  { week: 'W7', precision: 0.91, recall: 0.83, f1: 0.87, falseNegRate: 0.17 },
  { week: 'W8', precision: 0.93, recall: 0.85, f1: 0.89, falseNegRate: 0.15 },
];

type ViewMode = 'importance' | 'distribution' | 'performance';

const XAIModelPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('importance');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const sortedFeatures = [...featureImportanceData].sort(
    (a, b) => Math.abs(b.shap_value) - Math.abs(a.shap_value)
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* XAI Methodology Info */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          borderRadius: 2,
          backgroundColor: '#F0F6FC',
          borderColor: '#003F72',
          borderWidth: 1,
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <InfoOutlinedIcon sx={{ color: '#003F72', fontSize: 20, mt: 0.25 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51' }}>
              Explainable AI for Fraud Detection
            </Typography>
            <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5, lineHeight: 1.6 }}>
              This panel uses SHAP (SHapley Additive exPlanations) values to explain model predictions.
              Each feature&apos;s contribution to the fraud prediction is quantified, enabling analysts to understand
              <strong> why</strong> a claim is predicted as fraudulent. Focus is on identifying <strong>false negatives</strong> &mdash;
              fraudulent claims that the rules engine and anomaly detection failed to catch.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Chart Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Model Analysis
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
          <ToggleButton value="importance">Feature Importance</ToggleButton>
          <ToggleButton value="distribution">Score Distribution</ToggleButton>
          <ToggleButton value="performance">Model Performance</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* SHAP Feature Importance Chart */}
      {viewMode === 'importance' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            SHAP Feature Importance
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Positive values push prediction toward fraud; negative values push toward legitimate
          </Typography>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart
              data={sortedFeatures}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 140, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis
                type="number"
                domain={[-0.3, 0.5]}
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'SHAP Value (impact on model output)',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <YAxis
                type="category"
                dataKey="feature"
                tick={{ fontSize: 12, fill: '#112E51' }}
                width={135}
              />
              <ReferenceLine x={0} stroke="#112E51" strokeWidth={1.5} />
              <RechartsTooltip
                formatter={(value: number) => [
                  `${value > 0 ? '+' : ''}${value.toFixed(3)}`,
                  'SHAP Value',
                ]}
                contentStyle={{
                  border: '1px solid #003F72',
                  borderRadius: 4,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="shap_value" radius={[0, 4, 4, 0]}>
                {sortedFeatures.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.shap_value >= 0 ? '#E31C3D' : '#2E8540'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Confidence Distribution */}
      {viewMode === 'distribution' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            Model Confidence Score Distribution
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Distribution of fraud probability scores across all analyzed claims (n=945)
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={confidenceDistribution} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#5B616B' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'Number of Claims',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <RechartsTooltip
                contentStyle={{ border: '1px solid #003F72', borderRadius: 4, fontSize: 12 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {confidenceDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#2E8540' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Low Risk (&lt;30%)</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#FDB81E' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Medium Risk (30-60%)</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#E31C3D' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>High Risk (&gt;60%)</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Model Performance Over Time */}
      {viewMode === 'performance' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            Model Performance Trends (Last 8 Weeks)
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Tracking precision, recall, F1-score, and false negative rate over time
          </Typography>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={modelPerformanceData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#5B616B' }} />
              <YAxis
                domain={[0, 1]}
                tick={{ fontSize: 11, fill: '#5B616B' }}
                tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [
                  `${(value * 100).toFixed(1)}%`,
                  name === 'falseNegRate' ? 'False Negative Rate' : name.charAt(0).toUpperCase() + name.slice(1),
                ]}
                contentStyle={{ border: '1px solid #003F72', borderRadius: 4, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="falseNegRate"
                fill="#E31C3D"
                fillOpacity={0.1}
                stroke="#E31C3D"
                strokeDasharray="5 5"
                name="falseNegRate"
              />
              <Line type="monotone" dataKey="precision" stroke="#003F72" strokeWidth={2} dot={{ r: 3 }} name="Precision" />
              <Line type="monotone" dataKey="recall" stroke="#2E8540" strokeWidth={2} dot={{ r: 3 }} name="Recall" />
              <Line type="monotone" dataKey="f1" stroke="#02BFE7" strokeWidth={2} dot={{ r: 3 }} name="F1" />
            </ComposedChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={3} justifyContent="center" sx={{ mt: 1 }}>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#003F72' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Precision</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#2E8540' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>Recall</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#02BFE7' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>F1 Score</Typography>
            </Stack>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 16, height: 3, backgroundColor: '#E31C3D', borderStyle: 'dashed' }} />
              <Typography variant="caption" sx={{ color: '#5B616B' }}>False Negative Rate</Typography>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Prediction Explanation Waterfall */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
          Individual Prediction Explanation &mdash; CLM-2024-08847
        </Typography>
        <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
          SHAP waterfall showing how each feature contributes to the final fraud score of 82%
        </Typography>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={waterfallData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
            <XAxis
              type="number"
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: '#5B616B' }}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
            />
            <YAxis type="category" dataKey="feature" tick={{ fontSize: 12, fill: '#112E51' }} width={95} />
            <RechartsTooltip
              formatter={(value: number, name: string) => {
                if (name === 'cumulative') return [`${(value * 100).toFixed(1)}%`, 'Cumulative Score'];
                return [`${value > 0 ? '+' : ''}${(value * 100).toFixed(1)}%`, 'Contribution'];
              }}
              contentStyle={{ border: '1px solid #003F72', borderRadius: 4, fontSize: 12 }}
            />
            <Bar dataKey="cumulative" radius={[0, 4, 4, 0]}>
              {waterfallData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>

      {/* Unflagged Predictions Table */}
      <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51' }}>
              Predicted Fraudulent &mdash; Not Flagged by Rules Engine
            </Typography>
            <Typography variant="caption" sx={{ color: '#5B616B' }}>
              Claims with high model fraud probability that were not caught by the existing detection pipeline
            </Typography>
          </Box>
          <Chip
            label={`${unflaggedPredictions.length} Claims`}
            size="small"
            sx={{ backgroundColor: '#FDE0DB', color: '#E31C3D', fontWeight: 700 }}
          />
        </Box>

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, color: '#112E51', fontSize: '0.75rem', borderBottom: '2px solid #003F72' } }}>
                <TableCell>Claim ID</TableCell>
                <TableCell>Member</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell align="center">Fraud Prob.</TableCell>
                <TableCell>Top Feature</TableCell>
                <TableCell>Model</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {unflaggedPredictions.map((row) => (
                <React.Fragment key={row.claim_id}>
                  <TableRow
                    hover
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#F0F6FC' },
                    }}
                    onClick={() => setExpandedRow(expandedRow === row.claim_id ? null : row.claim_id)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#003F72', fontSize: '0.8rem' }}>
                        {row.claim_id}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{row.beneficiary_name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{row.provider_name}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                        ${row.billing_amount.toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinearProgress
                          variant="determinate"
                          value={row.predicted_probability * 100}
                          sx={{
                            flex: 1,
                            height: 8,
                            borderRadius: 4,
                            backgroundColor: '#E0E0E0',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor:
                                row.predicted_probability >= 0.85 ? '#E31C3D' :
                                row.predicted_probability >= 0.7 ? '#FDB81E' : '#2E8540',
                              borderRadius: 4,
                            },
                          }}
                        />
                        <Typography variant="caption" fontWeight={700} sx={{ minWidth: 36, color: '#E31C3D' }}>
                          {(row.predicted_probability * 100).toFixed(0)}%
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Tooltip title={`Contribution: +${(row.feature_contribution * 100).toFixed(0)}%`} arrow>
                        <Chip
                          label={row.top_contributing_feature}
                          size="small"
                          sx={{
                            fontSize: '0.7rem',
                            backgroundColor: '#FFF3CD',
                            color: '#856404',
                            fontWeight: 600,
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ color: '#5B616B' }}>{row.model}</Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.current_status}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: row.current_status === 'approved' ? '#E7F4E4' : '#FFF3CD',
                          color: row.current_status === 'approved' ? '#2E8540' : '#856404',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small">
                        {expandedRow === row.claim_id ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={9} sx={{ py: 0, borderBottom: expandedRow === row.claim_id ? undefined : 'none' }}>
                      <Collapse in={expandedRow === row.claim_id}>
                        <Card
                          variant="outlined"
                          sx={{
                            my: 1.5,
                            borderColor: '#003F72',
                            borderRadius: 2,
                          }}
                        >
                          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mb: 1 }}>
                              Feature Contribution Breakdown
                            </Typography>
                            <Stack spacing={0.75}>
                              {[
                                { feature: row.top_contributing_feature, value: row.feature_contribution, color: '#E31C3D' },
                                { feature: 'Provider Risk Score', value: row.feature_contribution * 0.8, color: '#E31C3D' },
                                { feature: 'Service Frequency', value: row.feature_contribution * 0.6, color: '#FDB81E' },
                                { feature: 'Geographic Distance', value: row.feature_contribution * 0.4, color: '#FDB81E' },
                                { feature: 'Member History', value: -(row.feature_contribution * 0.2), color: '#2E8540' },
                              ].map((item) => (
                                <Box key={item.feature} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Typography variant="caption" sx={{ width: 160, color: '#5B616B', flexShrink: 0 }}>
                                    {item.feature}
                                  </Typography>
                                  <Box sx={{ flex: 1, position: 'relative', height: 16 }}>
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        left: item.value >= 0 ? '50%' : `${50 + item.value * 100}%`,
                                        width: `${Math.abs(item.value) * 100}%`,
                                        height: '100%',
                                        backgroundColor: item.color,
                                        borderRadius: 1,
                                        opacity: 0.75,
                                      }}
                                    />
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        left: '50%',
                                        top: 0,
                                        bottom: 0,
                                        width: 1,
                                        backgroundColor: '#112E51',
                                      }}
                                    />
                                  </Box>
                                  <Typography variant="caption" fontWeight={600} sx={{ width: 45, textAlign: 'right', color: item.color }}>
                                    {item.value > 0 ? '+' : ''}{(item.value * 100).toFixed(1)}%
                                  </Typography>
                                </Box>
                              ))}
                            </Stack>
                            <Typography variant="caption" sx={{ color: '#8D9297', display: 'block', mt: 1 }}>
                              Model: {row.model} | Prediction generated from ensemble of 3 models with agreement threshold 0.75
                            </Typography>
                          </CardContent>
                        </Card>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default XAIModelPanel;
