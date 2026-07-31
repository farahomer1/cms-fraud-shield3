// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HubIcon from '@mui/icons-material/Hub';
import GroupWorkIcon from '@mui/icons-material/GroupWork';
import LinkIcon from '@mui/icons-material/Link';
import {
  Treemap,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

// --- Suspected Fraud Rings ---
interface FraudRing {
  id: string;
  name: string;
  risk_score: number;
  members: Array<{
    name: string;
    type: 'provider' | 'veteran' | 'representative';
    role: string;
    connections: number;
  }>;
  total_claims: number;
  total_amount: number;
  shared_veterans: number;
  pattern_description: string;
  confidence: number;
}

const fraudRings: FraudRing[] = [
  {
    id: 'RING-001',
    name: 'Tampa Bay Billing Network',
    risk_score: 94,
    members: [
      { name: 'Tampa Bay Veterans Services', type: 'provider', role: 'Hub Provider', connections: 12 },
      { name: 'Bay Area Claims Group', type: 'provider', role: 'Spoke Provider', connections: 8 },
      { name: 'Coastal Benefits LLC', type: 'provider', role: 'Spoke Provider', connections: 6 },
      { name: 'J. Martinez (Rep)', type: 'representative', role: 'Shared Representative', connections: 15 },
      { name: '14 shared veterans', type: 'veteran', role: 'Shared Claimants', connections: 14 },
    ],
    total_claims: 287,
    total_amount: 842000,
    shared_veterans: 14,
    pattern_description: 'Three providers sharing the same veteran pool and claims representative. Coordinated billing patterns with staggered submission dates. Same diagnosis codes used across providers.',
    confidence: 0.91,
  },
  {
    id: 'RING-002',
    name: 'Orlando Disability Mill',
    risk_score: 89,
    members: [
      { name: 'Orlando Veteran Care LLC', type: 'provider', role: 'Primary Provider', connections: 9 },
      { name: 'Central FL Benefits Corp', type: 'provider', role: 'DBQ Provider', connections: 7 },
      { name: 'R. Thompson (Rep)', type: 'representative', role: 'Claims Agent', connections: 22 },
      { name: '22 shared veterans', type: 'veteran', role: 'Recruited Claimants', connections: 22 },
    ],
    total_claims: 198,
    total_amount: 634000,
    shared_veterans: 22,
    pattern_description: 'Single claims agent recruiting veterans and routing through two coordinated providers. DBQ forms show template-like similarity (98.7% structural match). Veteran addresses cluster in 3-mile radius.',
    confidence: 0.87,
  },
  {
    id: 'RING-003',
    name: 'Panhandle Pension Scheme',
    risk_score: 82,
    members: [
      { name: 'Pensacola Veterans Aid Group', type: 'provider', role: 'Lead Provider', connections: 6 },
      { name: 'Emerald Coast Claims Corp', type: 'provider', role: 'Billing Partner', connections: 5 },
      { name: 'S. Davis (Rep)', type: 'representative', role: 'Claims Facilitator', connections: 11 },
      { name: '11 shared veterans', type: 'veteran', role: 'Pension Claimants', connections: 11 },
    ],
    total_claims: 145,
    total_amount: 398000,
    shared_veterans: 11,
    pattern_description: 'Providers targeting elderly veterans for pension poaching. Claims submitted within days of initial contact. Billing amounts consistently at maximum allowed thresholds.',
    confidence: 0.83,
  },
];

// --- Connection heatmap data (provider-to-provider shared veterans) ---
const providers = [
  'Tampa Bay VS',
  'Bay Area CG',
  'Coastal Ben.',
  'Orlando VC',
  'Central FL',
  'Pensacola VA',
  'Emerald Coast',
  'Gulf Coast',
];

const connectionMatrix = [
  [0, 14, 12, 2, 1, 0, 1, 3],
  [14, 0, 9, 1, 0, 0, 0, 2],
  [12, 9, 0, 0, 1, 0, 0, 1],
  [2, 1, 0, 0, 22, 1, 0, 4],
  [1, 0, 1, 22, 0, 0, 1, 2],
  [0, 0, 0, 1, 0, 0, 11, 3],
  [1, 0, 0, 0, 1, 11, 0, 2],
  [3, 2, 1, 4, 2, 3, 2, 0],
];

// --- Treemap data for relationship density ---
const treemapData = [
  {
    name: 'Provider Networks',
    children: [
      { name: 'Tampa Bay VS', size: 287, connections: 12, risk: 94 },
      { name: 'Orlando VC', size: 198, connections: 9, risk: 89 },
      { name: 'Pensacola VA', size: 145, connections: 6, risk: 82 },
      { name: 'Bay Area CG', size: 156, connections: 8, risk: 78 },
      { name: 'Central FL', size: 134, connections: 7, risk: 75 },
      { name: 'Emerald Coast', size: 112, connections: 5, risk: 71 },
      { name: 'Coastal Ben.', size: 98, connections: 6, risk: 68 },
      { name: 'Gulf Coast', size: 89, connections: 4, risk: 45 },
      { name: 'Bay Pines', size: 67, connections: 2, risk: 22 },
      { name: 'Daytona VA', size: 54, connections: 1, risk: 15 },
      { name: 'Fort Lauderdale', size: 48, connections: 1, risk: 12 },
      { name: 'West Palm', size: 42, connections: 1, risk: 10 },
    ],
  },
];

type ViewMode = 'rings' | 'connections';

const COLORS_BY_RISK = (risk: number) => {
  if (risk >= 80) return '#E31C3D';
  if (risk >= 60) return '#FF5722';
  if (risk >= 40) return '#FDB81E';
  return '#2E8540';
};

interface TreemapContentProps {
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
  risk: number;
}

const CustomTreemapContent: React.FC<TreemapContentProps> = ({ x, y, width, height, name, risk }) => {
  if (width < 40 || height < 30) return null;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={COLORS_BY_RISK(risk)}
        fillOpacity={0.7}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {width > 60 && height > 35 && (
        <>
          <text
            x={x + width / 2}
            y={y + height / 2 - 6}
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight={600}
          >
            {name}
          </text>
          <text
            x={x + width / 2}
            y={y + height / 2 + 10}
            textAnchor="middle"
            fill="#fff"
            fontSize={10}
            opacity={0.9}
          >
            Risk: {risk}
          </text>
        </>
      )}
    </g>
  );
};

const NetworkAnalysisPanel: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('rings');
  const [selectedRing, setSelectedRing] = useState<string | null>(fraudRings[0].id);

  const activeRing = useMemo(
    () => fraudRings.find((r) => r.id === selectedRing),
    [selectedRing]
  );

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
              Network & Relationship Analysis
            </Typography>
            <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5, lineHeight: 1.6 }}>
              Graph-based analysis identifies fraud <strong>rings</strong> &mdash; networks of providers, representatives, and
              veterans with suspicious interconnections. Community detection algorithms (Louvain, Label Propagation) find
              densely connected subgraphs that may indicate coordinated fraud schemes invisible to individual claim analysis.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* Summary Chips */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Chip
          icon={<HubIcon />}
          label={`${fraudRings.length} Suspected Rings`}
          sx={{ backgroundColor: '#FDE0DB', color: '#E31C3D', fontWeight: 600 }}
        />
        <Chip
          icon={<GroupWorkIcon />}
          label={`${fraudRings.reduce((sum, r) => sum + r.shared_veterans, 0)} Shared Veterans`}
          sx={{ backgroundColor: '#FFF3CD', color: '#856404', fontWeight: 600 }}
        />
        <Chip
          icon={<LinkIcon />}
          label={`$${(fraudRings.reduce((sum, r) => sum + r.total_amount, 0) / 1000000).toFixed(1)}M Total Exposure`}
          sx={{ backgroundColor: '#E8EAF6', color: '#3F51B5', fontWeight: 600 }}
        />
      </Stack>

      {/* View Toggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51' }}>
          Network Visualization
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
          <ToggleButton value="rings">Fraud Rings</ToggleButton>
          <ToggleButton value="connections">Connection Map</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Fraud Rings View */}
      {viewMode === 'rings' && (
        <>
          {/* Ring Selector Cards */}
          <Stack direction="row" spacing={2}>
            {fraudRings.map((ring) => (
              <Card
                key={ring.id}
                variant="outlined"
                onClick={() => setSelectedRing(ring.id)}
                sx={{
                  flex: 1,
                  cursor: 'pointer',
                  borderColor: selectedRing === ring.id ? '#003F72' : 'divider',
                  borderWidth: selectedRing === ring.id ? 2 : 1,
                  backgroundColor: selectedRing === ring.id ? '#F0F6FC' : '#fff',
                  transition: 'all 0.15s',
                  '&:hover': { borderColor: '#003F72', backgroundColor: '#F0F6FC' },
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" fontWeight={600} sx={{ color: '#5B616B' }}>
                      {ring.id}
                    </Typography>
                    <Chip
                      label={`${ring.risk_score}`}
                      size="small"
                      sx={{
                        backgroundColor: ring.risk_score >= 90 ? '#FDE0DB' : '#FFF3CD',
                        color: ring.risk_score >= 90 ? '#E31C3D' : '#856404',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        height: 20,
                      }}
                    />
                  </Stack>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51', mt: 0.5, fontSize: '0.8rem' }}>
                    {ring.name}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#5B616B' }}>
                    {ring.members.length} entities | ${(ring.total_amount / 1000).toFixed(0)}K
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {/* Selected Ring Detail */}
          {activeRing && (
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700} sx={{ color: '#112E51' }}>
                    {activeRing.name}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#5B616B', mt: 0.5, maxWidth: 600, lineHeight: 1.6 }}>
                    {activeRing.pattern_description}
                  </Typography>
                </Box>
                <Stack alignItems="flex-end" spacing={0.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#5B616B' }}>Confidence:</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={activeRing.confidence * 100}
                      sx={{
                        width: 80,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: '#E0E0E0',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: activeRing.confidence >= 0.85 ? '#E31C3D' : '#FDB81E',
                          borderRadius: 4,
                        },
                      }}
                    />
                    <Typography variant="caption" fontWeight={700}>
                      {(activeRing.confidence * 100).toFixed(0)}%
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Chip label={`${activeRing.total_claims} Claims`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                    <Chip
                      label={`$${(activeRing.total_amount / 1000).toFixed(0)}K`}
                      size="small"
                      sx={{ fontSize: '0.7rem', backgroundColor: '#FDE0DB', color: '#E31C3D', fontWeight: 700 }}
                    />
                  </Stack>
                </Stack>
              </Stack>

              <Divider sx={{ mb: 2 }} />

              {/* Ring Network Visualization (simplified node display) */}
              <Box
                sx={{
                  position: 'relative',
                  height: 260,
                  backgroundColor: '#FAFBFC',
                  borderRadius: 2,
                  border: '1px solid #E0E0E0',
                  mb: 2,
                  overflow: 'hidden',
                }}
              >
                {/* Central hub */}
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: '#E31C3D',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                    boxShadow: '0 4px 12px rgba(227,28,61,0.3)',
                  }}
                >
                  <Typography variant="caption" fontWeight={700} sx={{ color: '#fff', textAlign: 'center', fontSize: '0.65rem', px: 0.5 }}>
                    {activeRing.members[0]?.name.split(' ').slice(0, 2).join(' ')}
                  </Typography>
                </Box>

                {/* Connected nodes */}
                {activeRing.members.slice(1).map((member, idx) => {
                  const angle = (idx / (activeRing.members.length - 1)) * Math.PI * 2 - Math.PI / 2;
                  const radius = 100;
                  const cx = 50 + Math.cos(angle) * (radius / 3.2);
                  const cy = 50 + Math.sin(angle) * (radius / 3);

                  const nodeColor =
                    member.type === 'provider' ? '#003F72' :
                    member.type === 'representative' ? '#9C27B0' : '#FDB81E';

                  return (
                    <React.Fragment key={idx}>
                      {/* Connection line */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          top: '50%',
                          width: radius,
                          height: 2,
                          backgroundColor: nodeColor,
                          opacity: 0.3,
                          transformOrigin: '0 50%',
                          transform: `rotate(${(angle * 180) / Math.PI}deg)`,
                          zIndex: 1,
                        }}
                      />
                      {/* Node */}
                      <Box
                        sx={{
                          position: 'absolute',
                          left: `${cx}%`,
                          top: `${cy}%`,
                          transform: 'translate(-50%, -50%)',
                          width: 64,
                          height: 64,
                          borderRadius: '50%',
                          backgroundColor: nodeColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 2,
                          boxShadow: `0 2px 8px ${nodeColor}40`,
                        }}
                      >
                        <Typography variant="caption" fontWeight={600} sx={{ color: '#fff', textAlign: 'center', fontSize: '0.6rem', px: 0.5 }}>
                          {member.name.length > 16 ? member.name.substring(0, 14) + '...' : member.name}
                        </Typography>
                      </Box>
                    </React.Fragment>
                  );
                })}
              </Box>

              {/* Legend */}
              <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 2 }}>
                {[
                  { label: 'Hub Provider', color: '#E31C3D' },
                  { label: 'Provider', color: '#003F72' },
                  { label: 'Representative', color: '#9C27B0' },
                  { label: 'Veterans', color: '#FDB81E' },
                ].map((item) => (
                  <Stack key={item.label} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: item.color }} />
                    <Typography variant="caption" sx={{ color: '#5B616B' }}>{item.label}</Typography>
                  </Stack>
                ))}
              </Stack>

              {/* Members table */}
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 700, color: '#112E51', fontSize: '0.75rem', borderBottom: '2px solid #003F72' } }}>
                      <TableCell>Entity</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Role</TableCell>
                      <TableCell align="center">Connections</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {activeRing.members.map((member, idx) => (
                      <TableRow key={idx} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.8rem' }}>
                            {member.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={member.type}
                            size="small"
                            sx={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                              backgroundColor:
                                member.type === 'provider' ? '#E8EAF6' :
                                member.type === 'representative' ? '#F3E5F5' : '#FFF3E0',
                              color:
                                member.type === 'provider' ? '#3F51B5' :
                                member.type === 'representative' ? '#9C27B0' : '#E65100',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: '0.8rem', color: '#5B616B' }}>
                            {member.role}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" fontWeight={600}>{member.connections}</Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}
        </>
      )}

      {/* Connection Map View */}
      {viewMode === 'connections' && (
        <>
          {/* Provider Relationship Treemap */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
              Provider Network Density Map
            </Typography>
            <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
              Size represents claim volume. Color intensity represents risk score. Larger, redder blocks indicate higher-risk high-volume providers.
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={treemapData}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<CustomTreemapContent x={0} y={0} width={0} height={0} name="" risk={0} />}
              >
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const item = payload[0]?.payload;
                    if (!item || !item.name) return null;
                    return (
                      <Box sx={{ backgroundColor: '#fff', border: '1px solid #003F72', borderRadius: 1, px: 2, py: 1.5, boxShadow: 2 }}>
                        <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51' }}>{item.name}</Typography>
                        <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>Claims: {item.size}</Typography>
                        <Typography variant="caption" display="block" sx={{ color: '#5B616B' }}>Connections: {item.connections}</Typography>
                        <Typography variant="caption" display="block" sx={{ color: COLORS_BY_RISK(item.risk), fontWeight: 600 }}>
                          Risk Score: {item.risk}
                        </Typography>
                      </Box>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </Paper>

          {/* Connection Matrix */}
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#112E51', mb: 0.5 }}>
              Provider-to-Provider Shared Veteran Matrix
            </Typography>
            <Typography variant="caption" sx={{ color: '#5B616B', display: 'block', mb: 2 }}>
              Numbers indicate shared veterans between providers. High values suggest coordinated fraud activity.
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#112E51', borderBottom: '2px solid #003F72' }} />
                    {providers.map((p) => (
                      <TableCell
                        key={p}
                        align="center"
                        sx={{
                          fontWeight: 700,
                          fontSize: '0.65rem',
                          color: '#112E51',
                          borderBottom: '2px solid #003F72',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {p}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {providers.map((provider, rowIdx) => (
                    <TableRow key={provider}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: '#112E51', whiteSpace: 'nowrap' }}>
                        {provider}
                      </TableCell>
                      {connectionMatrix[rowIdx].map((value, colIdx) => {
                        const bgOpacity = value === 0 ? 0 : Math.min(value / 22, 1);
                        const isHigh = value >= 10;
                        return (
                          <TableCell
                            key={colIdx}
                            align="center"
                            sx={{
                              fontSize: '0.75rem',
                              fontWeight: value > 0 ? 700 : 400,
                              color: rowIdx === colIdx ? '#8D9297' : isHigh ? '#E31C3D' : value > 0 ? '#112E51' : '#CCC',
                              backgroundColor: rowIdx === colIdx
                                ? '#F5F5F5'
                                : `rgba(227, 28, 61, ${bgOpacity * 0.2})`,
                              borderRight: '1px solid #E0E0E0',
                            }}
                          >
                            {rowIdx === colIdx ? '-' : value}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default NetworkAnalysisPanel;
