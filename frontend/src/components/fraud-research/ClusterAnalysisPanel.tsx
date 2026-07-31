// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  Stack,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ZAxis,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';

// --- Cluster definitions ---
interface ClusterDef {
  id: string;
  label: string;
  color: string;
  member_count: number;
  avg_risk: number;
  dominant_fraud_type: string;
  description: string;
  silhouette_score: number;
}

const clusters: ClusterDef[] = [
  {
    id: 'C1',
    label: 'High-Value Billing Ring',
    color: '#E31C3D',
    member_count: 34,
    avg_risk: 87,
    dominant_fraud_type: 'Billing Fraud',
    description: 'Providers with abnormally high billing amounts concentrated in Tampa/Orlando area, many sharing the same beneficiaries.',
    silhouette_score: 0.82,
  },
  {
    id: 'C2',
    label: 'Deceased Member Claims',
    color: '#9C27B0',
    member_count: 18,
    avg_risk: 92,
    dominant_fraud_type: 'Identity Fraud',
    description: 'Claims filed for beneficiaries with confirmed deceased status, originating from 3 provider organizations.',
    silhouette_score: 0.91,
  },
  {
    id: 'C3',
    label: 'Rapid Claim Submitters',
    color: '#FF5722',
    member_count: 45,
    avg_risk: 71,
    dominant_fraud_type: 'Claim Sharking',
    description: 'Providers submitting an unusually high volume of claims in short time windows with similar diagnosis patterns.',
    silhouette_score: 0.76,
  },
  {
    id: 'C4',
    label: 'Geographic Outliers',
    color: '#FDB81E',
    member_count: 22,
    avg_risk: 58,
    dominant_fraud_type: 'Service Location Fraud',
    description: 'Claims where the provider location is far from the beneficiary\'s residence, suggesting potential kickback schemes.',
    silhouette_score: 0.68,
  },
  {
    id: 'C5',
    label: 'Clinical Assessment Pattern Cluster',
    color: '#2196F3',
    member_count: 29,
    avg_risk: 76,
    dominant_fraud_type: 'Clinical Assessment Integrity Check',
    description: 'Clinical assessments with suspicious similarity scores, suggesting template-based fraud.',
    silhouette_score: 0.79,
  },
  {
    id: 'C6',
    label: 'Low-Risk Legitimate',
    color: '#2E8540',
    member_count: 312,
    avg_risk: 12,
    dominant_fraud_type: 'N/A',
    description: 'Standard claims from accredited providers with consistent patterns and reasonable billing amounts.',
    silhouette_score: 0.88,
  },
];

// --- Scatter data points for each cluster ---
function generateClusterPoints() {
  const points: Array<{
    x: number;
    y: number;
    z: number;
    cluster: string;
    color: string;
    provider: string;
  }> = [];

  const clusterCentroids: Record<string, { cx: number; cy: number }> = {
    C1: { cx: 82, cy: 72 },
    C2: { cx: 90, cy: 55 },
    C3: { cx: 68, cy: 85 },
    C4: { cx: 55, cy: 40 },
    C5: { cx: 73, cy: 60 },
    C6: { cx: 15, cy: 20 },
  };

  const providerPrefixes = ['Tampa', 'Orlando', 'Miami', 'Jacksonville', 'Pensacola', 'Gainesville', 'St. Pete', 'Sarasota'];

  // Use deterministic pseudo-random
  let seed = 42;
  const rand = () => {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  clusters.forEach((cluster) => {
    const centroid = clusterCentroids[cluster.id];
    const count = Math.min(cluster.member_count, 25); // cap for visual clarity
    for (let i = 0; i < count; i++) {
      const spread = cluster.id === 'C6' ? 15 : 10;
      points.push({
        x: Math.max(0, Math.min(100, centroid.cx + (rand() - 0.5) * spread * 2)),
        y: Math.max(0, Math.min(100, centroid.cy + (rand() - 0.5) * spread * 2)),
        z: 30 + rand() * 70,
        cluster: cluster.id,
        color: cluster.color,
        provider: `${providerPrefixes[Math.floor(rand() * providerPrefixes.length)]} Provider ${Math.floor(rand() * 100)}`,
      });
    }
  });

  return points;
}

const clusterPoints = generateClusterPoints();

// --- Radar data for cluster comparison ---
const radarData = [
  { metric: 'Billing Amount', C1: 92, C2: 45, C3: 78, C5: 55 },
  { metric: 'Claim Volume', C1: 68, C2: 32, C3: 95, C5: 72 },
  { metric: 'Provider Risk', C1: 88, C2: 90, C3: 65, C5: 70 },
  { metric: 'Temporal Pattern', C1: 55, C2: 75, C3: 88, C5: 42 },
  { metric: 'Geographic Anomaly', C1: 42, C2: 38, C3: 35, C5: 28 },
  { metric: 'Code Similarity', C1: 35, C2: 28, C3: 45, C5: 92 },
];

type ViewMode = 'scatter' | 'radar';

interface ScatterTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      provider: string;
      cluster: string;
      x: number;
      y: number;
      z: number;
    };
  }>;
}

const ScatterTooltipContent: React.FC<ScatterTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0].payload;
  const cluster = clusters.find((c) => c.id === item.cluster);
  return (
    <Box
      sx={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #003F72',
        borderRadius: 1,
        px: 2,
        py: 1.5,
        boxShadow: 2,
        maxWidth: 220,
      }}
    >
      <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51' }}>
        {item.provider}
      </Typography>
      <Typography variant="caption" display="block" sx={{ color: cluster?.color, fontWeight: 600, mt: 0.5 }}>
        {cluster?.label}
      </Typography>
      <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>
        Risk Score: {item.x.toFixed(0)} | Anomaly: {item.y.toFixed(0)}
      </Typography>
    </Box>
  );
};

const ClusterAnalysisPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('scatter');

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
              Unsupervised Clustering for Fraud Discovery
            </Typography>
            <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5, lineHeight: 1.6 }}>
              DBSCAN and K-Means clustering algorithms identify natural groupings of claims based on
              multiple features. Unlike the rules engine, clustering discovers <strong>unknown fraud patterns</strong> by
              finding claims that behave similarly along multiple dimensions without predefined rules.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Chart Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Cluster Visualization
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
          <ToggleButton value="scatter">Scatter Plot</ToggleButton>
          <ToggleButton value="radar">Radar Comparison</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Scatter Plot */}
      {viewMode === 'scatter' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            Provider Risk Clusters (DBSCAN)
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Each point represents a provider. Color indicates cluster assignment. Size indicates confidence.
          </Typography>
          <ResponsiveContainer width="100%" height={420}>
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis
                type="number"
                dataKey="x"
                name="Risk Score"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'Composite Risk Score',
                  position: 'insideBottom',
                  offset: -5,
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Anomaly Score"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#5B616B' }}
                label={{
                  value: 'Anomaly Score',
                  angle: -90,
                  position: 'insideLeft',
                  style: { fontSize: 11, fill: '#5B616B' },
                }}
              />
              <ZAxis type="number" dataKey="z" range={[40, 300]} />
              <Tooltip content={<ScatterTooltipContent />} />
              {clusters.map((cluster) => (
                <Scatter
                  key={cluster.id}
                  name={cluster.label}
                  data={clusterPoints.filter((p) => p.cluster === cluster.id)}
                >
                  {clusterPoints
                    .filter((p) => p.cluster === cluster.id)
                    .map((_, index) => (
                      <Cell key={index} fill={cluster.color} fillOpacity={0.65} stroke={cluster.color} strokeWidth={1} />
                    ))}
                </Scatter>
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 1 }}>
            {clusters.map((c) => (
              <Stack key={c.id} direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: c.color }} />
                <Typography variant="caption" sx={{ color: '#5B616B', fontSize: '0.7rem' }}>
                  {c.label}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Paper>
      )}

      {/* Radar Chart */}
      {viewMode === 'radar' && (
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
            High-Risk Cluster Feature Comparison
          </Typography>
          <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
            Comparing feature profiles across the 4 high-risk clusters to understand their unique characteristics
          </Typography>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E0E0E0" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#112E51' }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Radar name="High-Value Billing" dataKey="C1" stroke="#E31C3D" fill="#E31C3D" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Deceased Members" dataKey="C2" stroke="#9C27B0" fill="#9C27B0" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="Rapid Submitters" dataKey="C3" stroke="#FF5722" fill="#FF5722" fillOpacity={0.1} strokeWidth={2} />
              <Radar name="Clinical Assessment Pattern" dataKey="C5" stroke="#2196F3" fill="#2196F3" fillOpacity={0.1} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </RadarChart>
          </ResponsiveContainer>
        </Paper>
      )}

      {/* Cluster Summary Cards */}
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
        Cluster Details
      </Typography>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: '#112E51', fontSize: '0.75rem', borderBottom: '2px solid #003F72' } }}>
              <TableCell>Cluster</TableCell>
              <TableCell>Label</TableCell>
              <TableCell align="center">Members</TableCell>
              <TableCell align="center">Avg Risk</TableCell>
              <TableCell>Fraud Type</TableCell>
              <TableCell align="center">Silhouette</TableCell>
              <TableCell>Description</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {clusters.filter((c) => c.id !== 'C6').map((cluster) => (
              <TableRow key={cluster.id} hover>
                <TableCell>
                  <Chip
                    label={cluster.id}
                    size="small"
                    sx={{
                      backgroundColor: cluster.color,
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: '0.7rem',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                    {cluster.label}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={600}>{cluster.member_count}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center' }}>
                    <LinearProgress
                      variant="determinate"
                      value={cluster.avg_risk}
                      sx={{
                        width: 60,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#E0E0E0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor:
                            cluster.avg_risk >= 70 ? '#E31C3D' :
                            cluster.avg_risk >= 40 ? '#FDB81E' : '#2E8540',
                          borderRadius: 3,
                        },
                      }}
                    />
                    <Typography variant="caption" fontWeight={600}>{cluster.avg_risk}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={cluster.dominant_fraud_type}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                      color: cluster.silhouette_score >= 0.8 ? '#2E8540' :
                        cluster.silhouette_score >= 0.7 ? '#FDB81E' : '#E31C3D',
                    }}
                  >
                    {cluster.silhouette_score.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" sx={{ color: '#5B616B', lineHeight: 1.4 }}>
                    {cluster.description}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ClusterAnalysisPanel;
