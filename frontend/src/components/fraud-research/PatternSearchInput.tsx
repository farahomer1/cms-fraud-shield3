// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import apiClient from '../../services/apiClient';

interface SearchResult {
  summary: string;
  matches: Array<{
    provider_name?: string;
    claim_id?: string;
    description?: string;
    confidence?: number;
  }>;
}

const PatternSearchInput: React.FC = () => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await apiClient.post('/fraud-research/search', { query: query.trim() });
      const raw = response.data;

      if (raw && typeof raw === 'object') {
        setResult({
          summary: raw.summary || raw.text || JSON.stringify(raw),
          matches: Array.isArray(raw.matches) ? raw.matches : [],
        });
      } else if (typeof raw === 'string') {
        setResult({ summary: raw, matches: [] });
      }
    } catch {
      setError('Search failed. Please try again or refine your query.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight={600} sx={{ color: '#112E51', mb: 2 }}>
        Pattern Search
      </Typography>

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Describe a suspected pattern (e.g., 'providers billing for deceased members in Tampa')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&.Mui-focused fieldset': {
                borderColor: '#003F72',
              },
            },
          }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
          sx={{
            textTransform: 'none',
            backgroundColor: '#003F72',
            '&:hover': { backgroundColor: '#112E51' },
            minWidth: 120,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Searching...' : 'Search'}
        </Button>
      </Box>

      {error && (
        <Typography variant="body2" color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {result && (
        <Card
          variant="outlined"
          sx={{
            borderColor: '#003F72',
            borderRadius: 2,
          }}
        >
          <CardContent>
            <Typography
              variant="subtitle2"
              fontWeight={600}
              sx={{ color: '#112E51', mb: 1.5 }}
            >
              Search Results
            </Typography>

            <Typography
              variant="body2"
              sx={{
                color: '#212121',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                mb: result.matches.length > 0 ? 2 : 0,
              }}
            >
              {result.summary}
            </Typography>

            {result.matches.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: '#5B616B', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Matching Records ({result.matches.length})
                </Typography>
                {result.matches.map((match, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      mt: 1,
                      p: 1.5,
                      backgroundColor: '#F9FAFB',
                      borderRadius: 1,
                      borderLeft: '3px solid #003F72',
                    }}
                  >
                    {match.provider_name && (
                      <Typography variant="body2" fontWeight={600}>
                        {match.provider_name}
                      </Typography>
                    )}
                    {match.claim_id && (
                      <Typography variant="caption" sx={{ color: '#5B616B' }}>
                        Claim: {match.claim_id}
                      </Typography>
                    )}
                    {match.description && (
                      <Typography variant="body2" sx={{ mt: 0.5, color: '#333' }}>
                        {match.description}
                      </Typography>
                    )}
                    {match.confidence !== undefined && (
                      <Typography variant="caption" sx={{ color: '#2E8540', fontWeight: 600 }}>
                        Confidence: {match.confidence}%
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default PatternSearchInput;
