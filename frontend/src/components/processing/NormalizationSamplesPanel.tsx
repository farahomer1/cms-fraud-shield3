// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Paper,
  Chip,
  CircularProgress,
  Button,
  Collapse,
  Divider,
  IconButton,
  Grid,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import DataObjectIcon from '@mui/icons-material/DataObject';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import apiClient from '../../services/apiClient';

// ── Types ──────────────────────────

interface EdiSample {
  filename: string;
  description: string;
  claim_type: string;
  is_pass: boolean;
  raw_data: string;
  parsed_data: Record<string, unknown>;
}

// ── Sub-components ──────────────────────────

const PdfViewer: React.FC<{ pdfUrl: string }> = ({ pdfUrl }) => (
  <Box sx={{ flex: 1, minWidth: 0 }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        display: 'block',
        mb: 0.5,
      }}
    >
      CMS-1500 Form (PDF)
    </Typography>
    <Paper
      sx={{
        backgroundColor: '#FFFFFF',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 1,
        height: 420,
        overflow: 'hidden',
      }}
    >
      <iframe
        src={pdfUrl}
        title="CMS-1500 Sample PDF"
        style={{ width: '100%', height: '100%', border: 'none' }}
      />
    </Paper>
  </Box>
);

// ── Collapsible EDI Sample Card ──────────────────────────
// Expands to immediately show side-by-side raw | parsed (no Compare button).

const EdiSampleCard: React.FC<{ sample: EdiSample }> = ({ sample }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      sx={{
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 2,
        mb: 1.5,
        transition: 'border-color 0.2s',
        '&:hover': { borderColor: 'rgba(2, 191, 231, 0.3)' },
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <DataObjectIcon sx={{ color: '#02BFE7', fontSize: 20 }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                {sample.filename}
              </Typography>
              <Chip
                label={sample.claim_type}
                size="small"
                sx={{
                  backgroundColor: 'rgba(2, 191, 231, 0.15)',
                  color: '#02BFE7',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  height: 20,
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{ color: 'rgba(255,255,255,0.5)', display: 'block' }}
            >
              {sample.description}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)' }}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>

      {/* Expanded: immediately show side-by-side */}
      <Collapse in={expanded}>
        <CardContent sx={{ pt: 0, pb: 2 }}>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mb: 1.5 }} />

          <Grid container spacing={2}>
            {/* Left: raw data */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                {sample.filename.endsWith('.ncpdp') ? 'Raw NCPDP Data' : 'Raw EDI Data'}
              </Typography>
              <Paper
                sx={{
                  backgroundColor: 'rgba(17, 46, 81, 0.8)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  p: 1.5,
                  maxHeight: 360,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                  },
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all',
                  }}
                >
                  {sample.raw_data}
                </pre>
              </Paper>
            </Grid>

            {/* Right: parsed JSON */}
            <Grid item xs={12} md={6}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Parsed Output (Structured JSON)
              </Typography>
              <Paper
                sx={{
                  backgroundColor: 'rgba(46, 20, 20, 0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  p: 1.5,
                  maxHeight: 360,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                  },
                }}
              >
                <pre
                  style={{
                    margin: 0,
                    fontSize: 11,
                    fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {JSON.stringify(sample.parsed_data, null, 2)}
                </pre>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Collapse>
    </Card>
  );
};

// ── Main Panel ──────────────────────────

const NormalizationSamplesPanel: React.FC = () => {
  const [ediSamples, setEdiSamples] = useState<EdiSample[]>([]);
  const [cms1500Data, setCms1500Data] = useState<Record<string, unknown> | null>(null);
  const [cms1500Loading, setCms1500Loading] = useState(false);
  const [samplesLoading, setSamplesLoading] = useState(true);

  // Fetch EDI samples on mount
  useEffect(() => {
    const fetchSamples = async () => {
      try {
        const response = await apiClient.get('/normalization/samples');
        setEdiSamples(response.data.samples || []);
      } catch {
        console.error('Failed to fetch normalization samples');
      } finally {
        setSamplesLoading(false);
      }
    };
    fetchSamples();
  }, []);

  const handleExtractCms1500 = useCallback(async () => {
    setCms1500Loading(true);
    try {
      const response = await apiClient.post('/normalization/parse-cms1500');
      // Always wait at least 3 s so the spinner feels like a real model call
      await new Promise((r) => setTimeout(r, 3000));
      setCms1500Data(response.data.parsed_data || {});
    } catch {
      console.error('Failed to extract CMS-1500 data');
      await new Promise((r) => setTimeout(r, 3000));
      setCms1500Data({ error: 'Failed to extract data from CMS-1500 PDF via Gemini' });
    } finally {
      setCms1500Loading(false);
    }
  }, []);

  if (samplesLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress size={28} sx={{ color: '#02BFE7' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Description */}
      <Typography
        variant="body2"
        sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, mb: 1.5 }}
      >
        The Data Normalization stage processes raw healthcare documents into structured data.
        CMS-1500 forms are processed using Gemini AI for structured extraction. EDI/NCPDP
        transactions are parsed using the X12/NCPDP parser engine. Click on any sample below
        to view the raw input and parsed output.
      </Typography>

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
        <Chip
          label="1 PDF Sample"
          size="small"
          icon={<DescriptionIcon sx={{ fontSize: 14 }} />}
          sx={{
            backgroundColor: 'rgba(2, 191, 231, 0.15)',
            color: '#02BFE7',
            fontWeight: 600,
            '& .MuiChip-icon': { color: '#02BFE7' },
          }}
        />
        <Chip
          label={`${ediSamples.length} EDI/NCPDP Samples`}
          size="small"
          icon={<DataObjectIcon sx={{ fontSize: 14 }} />}
          sx={{
            backgroundColor: 'rgba(46, 133, 64, 0.15)',
            color: '#2E8540',
            fontWeight: 600,
            '& .MuiChip-icon': { color: '#2E8540' },
          }}
        />
      </Box>

      {/* ═══════════════════════════════════════════════════
          SECTION 1: CMS-1500 PDF → Gemini Extraction
         ═══════════════════════════════════════════════════ */}
      <Box
        sx={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 2,
          p: 2,
          mb: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          <DescriptionIcon sx={{ color: '#02BFE7', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
            CMS-1500 Form — Gemini AI Structured Extraction
          </Typography>
          <Chip
            label="PDF"
            size="small"
            sx={{
              backgroundColor: 'rgba(2, 191, 231, 0.15)',
              color: '#02BFE7',
              fontWeight: 600,
              fontSize: '0.6rem',
              height: 20,
            }}
          />
        </Box>

        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1.5 }}
        >
          The CMS-1500 is the standard paper claim form for professional healthcare services.
          Gemini AI extracts all structured fields (patient, provider, diagnosis, procedures,
          billing) into JSON.
        </Typography>

        {/* Extract button */}
        {!cms1500Data && !cms1500Loading && (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<AutoAwesomeIcon />}
              onClick={handleExtractCms1500}
              sx={{
                backgroundColor: '#003F72',
                '&:hover': { backgroundColor: '#112E51' },
                fontWeight: 700,
                textTransform: 'none',
              }}
            >
              Extract Fields with Gemini AI
            </Button>
          </Box>
        )}

        {cms1500Loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              py: 4,
              gap: 1,
            }}
          >
            <CircularProgress size={32} sx={{ color: '#02BFE7' }} />
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              Gemini is extracting structured fields from the CMS-1500 form...
            </Typography>
          </Box>
        )}

        {!cms1500Loading && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <PdfViewer pdfUrl={`${import.meta.env.VITE_API_BASE_URL || '/api'}/normalization/cms1500-pdf`} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: '#FFFFFF',
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Gemini Extracted Fields (JSON)
              </Typography>
              <Paper
                sx={{
                  backgroundColor: 'rgba(46, 20, 20, 0.6)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 1,
                  p: 1.5,
                  height: 420,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 3,
                  },
                }}
              >
                {cms1500Data ? (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 11,
                      fontFamily: '"JetBrains Mono", "Fira Code", "Consolas", monospace',
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {JSON.stringify(cms1500Data, null, 2)}
                  </pre>
                ) : (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}
                    >
                      Click "Extract Fields with Gemini AI" to process the CMS-1500 form
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

      {/* ═══════════════════════════════════════════════════
          SECTION 2: EDI / NCPDP Parser — collapsible cards
         ═══════════════════════════════════════════════════ */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <DataObjectIcon sx={{ color: '#2E8540', fontSize: 20 }} />
          <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
            EDI / NCPDP Parser Samples
          </Typography>
          <Chip
            label={`${ediSamples.length} cases`}
            size="small"
            sx={{
              backgroundColor: 'rgba(46, 133, 64, 0.15)',
              color: '#2E8540',
              fontWeight: 600,
              fontSize: '0.6rem',
              height: 20,
            }}
          />
        </Box>
        <Typography
          variant="caption"
          sx={{ color: 'rgba(255,255,255,0.55)', display: 'block', mb: 1.5 }}
        >
          All test cases from the EDI parser test suite. Covers 837P (Professional), 837I
          (Institutional), 837D (Dental), and NCPDP (Pharmacy) claim formats. Click any row
          to view raw data alongside parsed output.
        </Typography>
      </Box>

      {ediSamples.map((sample) => (
        <EdiSampleCard key={sample.filename} sample={sample} />
      ))}
    </Box>
  );
};

export default NormalizationSamplesPanel;
