// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { AGENT_NAMES } from '../../utils/constants';

export interface ChartFilterValues {
  dateRange: string;
  agentType: string;
  riskLevel: string;
  provider: string;
}

interface ChartFiltersProps {
  onFilterChange: (filters: ChartFilterValues) => void;
}

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_6_months', label: 'Last 6 Months' },
];

const RISK_LEVEL_OPTIONS = [
  { value: '', label: 'All Risk Levels' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const PROVIDER_OPTIONS = [
  { value: '', label: 'All Providers' },
  { value: 'provider_1', label: 'Provider Group A' },
  { value: 'provider_2', label: 'Provider Group B' },
  { value: 'provider_3', label: 'Provider Group C' },
];

const ChartFilters: React.FC<ChartFiltersProps> = ({ onFilterChange }) => {
  const [filters, setFilters] = useState<ChartFilterValues>({
    dateRange: 'this_month',
    agentType: '',
    riskLevel: '',
    provider: '',
  });

  const handleChange = (field: keyof ChartFilterValues) => (event: SelectChangeEvent<string>) => {
    const updated = { ...filters, [field]: event.target.value };
    setFilters(updated);
    onFilterChange(updated);
  };

  const agentEntries = Object.entries(AGENT_NAMES);

  return (
    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="date-range-label">Date Range</InputLabel>
        <Select
          labelId="date-range-label"
          value={filters.dateRange}
          label="Date Range"
          onChange={handleChange('dateRange')}
        >
          {DATE_RANGE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="agent-type-label">Agent Type</InputLabel>
        <Select
          labelId="agent-type-label"
          value={filters.agentType}
          label="Agent Type"
          onChange={handleChange('agentType')}
        >
          <MenuItem value="">All Agents</MenuItem>
          {agentEntries.map(([key, label]) => (
            <MenuItem key={key} value={key}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="risk-level-label">Risk Level</InputLabel>
        <Select
          labelId="risk-level-label"
          value={filters.riskLevel}
          label="Risk Level"
          onChange={handleChange('riskLevel')}
        >
          {RISK_LEVEL_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 160 }}>
        <InputLabel id="provider-label">Provider</InputLabel>
        <Select
          labelId="provider-label"
          value={filters.provider}
          label="Provider"
          onChange={handleChange('provider')}
        >
          {PROVIDER_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Stack>
  );
};

export default ChartFilters;
