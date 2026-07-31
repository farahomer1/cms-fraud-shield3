// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import PivotTableChartIcon from '@mui/icons-material/PivotTableChart';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import BarChartIcon from '@mui/icons-material/BarChart';
import PieChartIcon from '@mui/icons-material/PieChart';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  getOverpaymentPivot,
  type PivotDimension,
  type PivotGroup,
  type PivotInsight,
  type PivotResult,
} from '../../services/overpaymentService';
import { formatCurrency } from '../../utils/formatters';

// --- Constants ---

const DIMENSIONS: { value: PivotDimension; label: string; description: string }[] = [
  { value: 'provider', label: 'By Provider', description: 'Which providers have the most outstanding recoupment?' },
  { value: 'provider_npi', label: 'By Provider NPI', description: 'Provider-level analysis including NPI for unique identification' },
  { value: 'status', label: 'By Status', description: 'How are overpayments distributed across pipeline stages?' },
  { value: 'analyst', label: 'By Analyst', description: 'Workload and recovery rates by assigned analyst' },
  { value: 'month', label: 'By Month', description: 'Monthly trends in overpayment identification' },
  { value: 'risk_level', label: 'By Risk Level', description: 'Fraud risk distribution — which risk levels have most exposure?' },
  { value: 'claim_type', label: 'By Claim Type', description: 'Which claim types generate the most overpayments?' },
  { value: 'fraud_type', label: 'By Fraud Type', description: 'Which fraud patterns are most prevalent and costly?' },
];

const QUICK_QUESTIONS: { question: string; dimension: PivotDimension; sortKey: SortKey; sortDir: 'asc' | 'desc' }[] = [
  { question: 'Which provider has the most outstanding recoupment?', dimension: 'provider', sortKey: 'total_amount', sortDir: 'desc' },
  { question: 'What types of fraud are most common?', dimension: 'fraud_type', sortKey: 'record_count', sortDir: 'desc' },
  { question: 'Which analyst has the best recovery rate?', dimension: 'analyst', sortKey: 'recovery_rate', sortDir: 'desc' },
  { question: 'Which claim types cost us the most?', dimension: 'claim_type', sortKey: 'total_amount', sortDir: 'desc' },
  { question: 'How has recoupment trended month-over-month?', dimension: 'month', sortKey: 'dimension', sortDir: 'asc' },
  { question: 'Where are the highest-risk overpayments?', dimension: 'risk_level', sortKey: 'total_amount', sortDir: 'desc' },
];

const CHART_COLORS = [
  '#003F72', '#2E8540', '#E31C3D', '#FDB81E', '#02BFE7',
  '#4C2C92', '#1A4480', '#B50909', '#8168B3', '#0071BC',
  '#E59393', '#94BFA2', '#FFD57E', '#7FB3D0', '#C4A3D1',
];

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  high: { color: '#E31C3D', bg: '#FFF0F0', icon: <ErrorOutlineIcon sx={{ fontSize: 18, color: '#E31C3D' }} /> },
  medium: { color: '#FDB81E', bg: '#FFF8E1', icon: <WarningAmberIcon sx={{ fontSize: 18, color: '#8B6914' }} /> },
  warning: { color: '#8B6914', bg: '#FFF8E1', icon: <WarningAmberIcon sx={{ fontSize: 18, color: '#8B6914' }} /> },
  info: { color: '#0071BC', bg: '#E8F5FD', icon: <InfoOutlinedIcon sx={{ fontSize: 18, color: '#0071BC' }} /> },
};

type SortKey = 'dimension' | 'record_count' | 'total_amount' | 'avg_amount' | 'recovery_rate' | 'pct_of_total';
type ChartView = 'bar' | 'pie';

// --- Sub-components ---

const PivotSummaryCards: React.FC<{ totals: PivotResult['totals'] }> = ({ totals }) => (
  <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
    {[
      { label: 'Total Groups', value: totals.group_count.toString() },
      { label: 'Total Records', value: totals.record_count.toLocaleString() },
      { label: 'Total Amount', value: formatCurrency(totals.total_amount) },
      { label: 'Recouped', value: formatCurrency(totals.recouped_amount) },
      { label: 'Recovery Rate', value: `${totals.recovery_rate}%` },
    ].map((card) => (
      <Paper
        key={card.label}
        variant="outlined"
        sx={{
          px: 2.5,
          py: 1.5,
          borderRadius: 2,
          minWidth: 140,
          textAlign: 'center',
          borderColor: '#E0E0E0',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
          {card.label}
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ color: '#112E51' }}>
          {card.value}
        </Typography>
      </Paper>
    ))}
  </Stack>
);

const PivotBarChart: React.FC<{ groups: PivotGroup[]; groupBy: string }> = ({ groups }) => {
  const chartData = groups.slice(0, 15).map((g) => ({
    name: g.dimension.length > 20 ? g.dimension.substring(0, 18) + '...' : g.dimension,
    fullName: g.dimension,
    total: g.total_amount,
    recouped: g.recouped_amount,
    outstanding: g.total_amount - g.recouped_amount,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 60 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: '#112E51' }}
          angle={-35}
          textAnchor="end"
          height={80}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#112E51' }}
          tickFormatter={(v: number) => {
            if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
            if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
            return `$${v}`;
          }}
        />
        <RechartsTooltip
          contentStyle={{ backgroundColor: '#FFF', border: '1px solid #003F72', borderRadius: 4, fontSize: 13 }}
          formatter={(value: number, name: string) => [formatCurrency(value), name === 'recouped' ? 'Recouped' : 'Outstanding']}
          labelFormatter={(label: string) => {
            const item = chartData.find((d) => d.name === label);
            return item?.fullName || label;
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 4 }} />
        <Bar dataKey="recouped" name="Recouped" stackId="a" fill="#2E8540" radius={[0, 0, 0, 0]} />
        <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#E31C3D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

const PivotPieChart: React.FC<{ groups: PivotGroup[] }> = ({ groups }) => {
  const chartData = groups.slice(0, 10).map((g, i) => ({
    name: g.dimension,
    value: g.total_amount,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const rest = groups.slice(10);
  if (rest.length > 0) {
    chartData.push({
      name: `Other (${rest.length})`,
      value: rest.reduce((s, g) => s + g.total_amount, 0),
      color: '#AEB0B5',
    });
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={130}
          paddingAngle={2}
          dataKey="value"
          label={({ name, percent }) => `${name.length > 15 ? name.substring(0, 13) + '...' : name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ stroke: '#5B616B', strokeWidth: 1 }}
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip
          contentStyle={{ backgroundColor: '#FFF', border: '1px solid #003F72', borderRadius: 4, fontSize: 13 }}
          formatter={(value: number) => [formatCurrency(value), 'Amount']}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

const InsightPanel: React.FC<{ insights: PivotInsight[] }> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <Box sx={{ px: 2.5, py: 1.5, backgroundColor: '#F9FAFB', borderBottom: '1px solid #E0E0E0' }}>
        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#112E51' }}>
          Automated Insights
        </Typography>
      </Box>
      <Stack spacing={0} divider={<Box sx={{ borderBottom: '1px solid #F0F0F0' }} />}>
        {insights.map((insight, i) => {
          const cfg = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
          return (
            <Box key={i} sx={{ px: 2.5, py: 2, display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
              <Box sx={{ mt: 0.3 }}>{cfg.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: '#112E51', mb: 0.3 }}>
                  {insight.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5B616B', lineHeight: 1.6 }}>
                  {insight.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Paper>
  );
};

const PivotTable: React.FC<{ groups: PivotGroup[]; sortKey: SortKey; sortDir: 'asc' | 'desc'; onSort: (key: SortKey) => void }> = ({
  groups,
  sortKey,
  sortDir,
  onSort,
}) => {
  const columns: { key: SortKey; label: string; align?: 'left' | 'right' | 'center'; width?: number }[] = [
    { key: 'dimension', label: 'Dimension', align: 'left' },
    { key: 'record_count', label: 'Count', align: 'right', width: 80 },
    { key: 'total_amount', label: 'Total Amount', align: 'right' },
    { key: 'avg_amount', label: 'Avg Amount', align: 'right' },
    { key: 'recovery_rate', label: 'Recovery %', align: 'right', width: 100 },
    { key: 'pct_of_total', label: '% of Total', align: 'right', width: 100 },
  ];

  return (
    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ backgroundColor: 'grey.50' }}>
            {columns.map((col) => (
              <TableCell key={col.key} align={col.align} sx={{ fontWeight: 700, width: col.width }}>
                <TableSortLabel active={sortKey === col.key} direction={sortKey === col.key ? sortDir : 'asc'} onClick={() => onSort(col.key)}>
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell align="right" sx={{ fontWeight: 700 }}>Recouped</TableCell>
            <TableCell align="right" sx={{ fontWeight: 700 }}>Outstanding</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {groups.map((g, idx) => {
            const outstanding = g.total_amount - g.recouped_amount;
            return (
              <TableRow key={g.dimension} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <Tooltip title={g.dimension} placement="top-start">
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 220 }}>
                        {g.dimension}
                      </Typography>
                    </Tooltip>
                  </Box>
                </TableCell>
                <TableCell align="right">{g.record_count.toLocaleString()}</TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={600}>{formatCurrency(g.total_amount)}</Typography>
                </TableCell>
                <TableCell align="right">{formatCurrency(g.avg_amount)}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={`${g.recovery_rate}%`}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      backgroundColor: g.recovery_rate >= 75 ? '#E7F4E4' : g.recovery_rate >= 40 ? '#FFF8E1' : '#FFF0F0',
                      color: g.recovery_rate >= 75 ? '#2E8540' : g.recovery_rate >= 40 ? '#8B6914' : '#E31C3D',
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                    <Box
                      sx={{
                        width: 50,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: '#E0E0E0',
                        overflow: 'hidden',
                      }}
                    >
                      <Box
                        sx={{
                          width: `${Math.min(g.pct_of_total, 100)}%`,
                          height: '100%',
                          backgroundColor: '#003F72',
                          borderRadius: 3,
                        }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                      {g.pct_of_total}%
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="success.main" fontWeight={500}>
                    {formatCurrency(g.recouped_amount)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" color="error.main" fontWeight={500}>
                    {formatCurrency(outstanding)}
                  </Typography>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// --- Main Component ---

interface RecoupmentAnalyticsProps {
  statusFilter: string;
}

const RecoupmentAnalytics: React.FC<RecoupmentAnalyticsProps> = ({ statusFilter }) => {
  const [dimension, setDimension] = useState<PivotDimension>('provider');
  const [data, setData] = useState<PivotResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartView, setChartView] = useState<ChartView>('bar');
  const [sortKey, setSortKey] = useState<SortKey>('total_amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showQuestions, setShowQuestions] = useState(false);

  const fetchPivot = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getOverpaymentPivot(dimension, statusFilter !== 'all' ? statusFilter : undefined);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch pivot data:', err);
    } finally {
      setLoading(false);
    }
  }, [dimension, statusFilter]);

  useEffect(() => {
    fetchPivot();
  }, [fetchPivot]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const handleQuickQuestion = (q: typeof QUICK_QUESTIONS[number]) => {
    setDimension(q.dimension);
    setSortKey(q.sortKey);
    setSortDir(q.sortDir);
    setShowQuestions(false);
  };

  const handleExportPivot = () => {
    if (!data) return;
    const header = ['Dimension', 'Count', 'Total Amount', 'Avg Amount', 'Recovery Rate %', '% of Total', 'Recouped', 'Outstanding'];
    const rows = data.groups.map((g) => [
      g.dimension,
      g.record_count,
      g.total_amount.toFixed(2),
      g.avg_amount.toFixed(2),
      g.recovery_rate,
      g.pct_of_total,
      g.recouped_amount.toFixed(2),
      (g.total_amount - g.recouped_amount).toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recoupment_pivot_${dimension}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const sortedGroups = useMemo(() => {
    if (!data) return [];
    const sorted = [...data.groups];
    sorted.sort((a, b) => {
      let cmp = 0;
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        cmp = aVal.localeCompare(bVal);
      } else {
        cmp = (aVal as number) - (bVal as number);
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return sorted;
  }, [data, sortKey, sortDir]);

  const activeDimension = DIMENSIONS.find((d) => d.value === dimension);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress sx={{ color: '#003F72' }} />
      </Box>
    );
  }

  if (!data || data.groups.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Typography color="text.secondary">No data available for the selected pivot and filters.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Quick Questions */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          borderColor: '#D6E8F5',
          backgroundColor: '#F9FBFD',
        }}
      >
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          onClick={() => setShowQuestions(!showQuestions)}
        >
          <HelpOutlineIcon sx={{ color: '#003F72', fontSize: 20 }} />
          <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#003F72', flex: 1 }}>
            Quick Questions — Click to explore common analytics queries
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {showQuestions ? 'Hide' : 'Show'}
          </Typography>
        </Box>
        {showQuestions && (
          <Stack spacing={0.5} sx={{ mt: 1.5 }}>
            {QUICK_QUESTIONS.map((q, i) => (
              <Box
                key={i}
                onClick={() => handleQuickQuestion(q)}
                sx={{
                  px: 2,
                  py: 1,
                  borderRadius: 1,
                  cursor: 'pointer',
                  backgroundColor: dimension === q.dimension ? '#E8F0FE' : 'transparent',
                  '&:hover': { backgroundColor: '#E8F0FE' },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Typography variant="body2" sx={{ color: '#112E51' }}>
                  {q.question}
                </Typography>
                <Chip label={DIMENSIONS.find((d) => d.value === q.dimension)?.label || q.dimension} size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
              </Box>
            ))}
          </Stack>
        )}
      </Paper>

      {/* Dimension Selector */}
      <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <PivotTableChartIcon sx={{ color: '#003F72', fontSize: 22 }} />
            <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#112E51' }}>
              Data Pivot
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
            onClick={handleExportPivot}
            sx={{ textTransform: 'none', fontSize: '0.8rem' }}
          >
            Export Pivot
          </Button>
        </Box>

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {DIMENSIONS.map((dim) => (
            <Tooltip key={dim.value} title={dim.description} placement="top">
              <Chip
                label={dim.label}
                onClick={() => {
                  setDimension(dim.value);
                  setSortKey('total_amount');
                  setSortDir('desc');
                }}
                variant={dimension === dim.value ? 'filled' : 'outlined'}
                color={dimension === dim.value ? 'primary' : 'default'}
                sx={{ fontWeight: dimension === dim.value ? 700 : 500, cursor: 'pointer' }}
              />
            </Tooltip>
          ))}
        </Stack>

        {activeDimension && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {activeDimension.description}
          </Typography>
        )}
      </Paper>

      {/* Summary Cards */}
      <PivotSummaryCards totals={data.totals} />

      <Grid container spacing={3}>
        {/* Visualization */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ color: '#112E51' }}>
                Overpayments by {activeDimension?.label.replace('By ', '')}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Chip
                  icon={<BarChartIcon sx={{ fontSize: 16 }} />}
                  label="Bar"
                  size="small"
                  onClick={() => setChartView('bar')}
                  variant={chartView === 'bar' ? 'filled' : 'outlined'}
                  color={chartView === 'bar' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                />
                <Chip
                  icon={<PieChartIcon sx={{ fontSize: 16 }} />}
                  label="Pie"
                  size="small"
                  onClick={() => setChartView('pie')}
                  variant={chartView === 'pie' ? 'filled' : 'outlined'}
                  color={chartView === 'pie' ? 'primary' : 'default'}
                  sx={{ cursor: 'pointer', fontSize: '0.75rem' }}
                />
              </Stack>
            </Box>

            {chartView === 'bar' ? (
              <PivotBarChart groups={data.groups} groupBy={dimension} />
            ) : (
              <PivotPieChart groups={data.groups} />
            )}
          </Paper>
        </Grid>

        {/* Insights */}
        <Grid item xs={12}>
          <InsightPanel insights={data.insights} />
        </Grid>

        {/* Pivot Table */}
        <Grid item xs={12}>
          <PivotTable groups={sortedGroups} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Showing {sortedGroups.length} group(s) | Total: {formatCurrency(data.totals.total_amount)}
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
};

export default RecoupmentAnalytics;
