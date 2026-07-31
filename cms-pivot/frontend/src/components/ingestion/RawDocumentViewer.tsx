// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Chip,
} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import { Document } from '../../types';
import apiClient from '../../services/apiClient';

interface RawDocumentViewerProps {
  document: Document | null;
  batchName?: string;
  highlightText?: string | null;
}

const EDI_SEGMENT_COLORS: Record<string, string> = {
  ISA: '#E31C3D',
  GS: '#FDB81E',
  ST: '#02BFE7',
  CLM: '#2E8540',
  SE: '#02BFE7',
  GE: '#FDB81E',
  IEA: '#E31C3D',
};

function highlightMatchInLine(
  line: string,
  searchText: string | null | undefined,
): React.ReactNode {
  if (!searchText || searchText.length < 2) return line;

  const lowerLine = line.toLowerCase();
  const lowerSearch = searchText.toLowerCase();
  const idx = lowerLine.indexOf(lowerSearch);

  if (idx === -1) return line;

  const before = line.slice(0, idx);
  const match = line.slice(idx, idx + searchText.length);
  const after = line.slice(idx + searchText.length);

  return (
    <>
      {before}
      <Box
        component="span"
        sx={{
          backgroundColor: 'rgba(255, 235, 59, 0.85)',
          color: '#000',
          borderRadius: '2px',
          px: '2px',
        }}
      >
        {match}
      </Box>
      {after}
    </>
  );
}

function lineContainsHighlight(
  line: string,
  searchText: string | null | undefined,
): boolean {
  if (!searchText || searchText.length < 2) return false;
  return line.toLowerCase().includes(searchText.toLowerCase());
}

function highlightEdiContent(
  rawText: string,
  highlightText?: string | null,
): React.ReactNode[] {
  const lines = rawText.split('\n');
  return lines.map((line, index) => {
    const trimmedLine = line.trim();
    const segmentId = trimmedLine.split(/[*|~]/)[0];
    const color = EDI_SEGMENT_COLORS[segmentId];
    const isHighlighted = lineContainsHighlight(line, highlightText);

    if (color) {
      return (
        <Box
          key={index}
          component="span"
          sx={{
            display: 'block',
            color: color,
            fontWeight: 600,
            backgroundColor: isHighlighted
              ? 'rgba(255, 235, 59, 0.15)'
              : 'transparent',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: isHighlighted
                ? 'rgba(255, 235, 59, 0.2)'
                : 'rgba(255,255,255,0.05)',
            },
          }}
        >
          {highlightMatchInLine(line, highlightText)}
          {'\n'}
        </Box>
      );
    }

    return (
      <Box
        key={index}
        component="span"
        sx={{
          display: 'block',
          color: '#D4D4D4',
          backgroundColor: isHighlighted
            ? 'rgba(255, 235, 59, 0.15)'
            : 'transparent',
          transition: 'background-color 0.2s ease',
          '&:hover': {
            backgroundColor: isHighlighted
              ? 'rgba(255, 235, 59, 0.2)'
              : 'rgba(255,255,255,0.05)',
          },
        }}
      >
        {highlightMatchInLine(line, highlightText)}
        {'\n'}
      </Box>
    );
  });
}

function getFileTypeIcon(fileType: Document['file_type']) {
  switch (fileType) {
    case 'pdf':
      return <PictureAsPdfIcon sx={{ color: '#E31C3D' }} />;
    case 'edi_837p':
    case 'edi_837i':
      return <CodeIcon sx={{ color: '#003F72' }} />;
    default:
      return <DescriptionIcon sx={{ color: '#2E8540' }} />;
  }
}

function getFileTypeLabel(fileType: Document['file_type']): string {
  const labels: Record<Document['file_type'], string> = {
    pdf: 'PDF',
    edi_837p: 'EDI 837P',
    edi_837i: 'EDI 837I',
    ehr: 'EHR',
  };
  return labels[fileType];
}

const RawDocumentViewer: React.FC<RawDocumentViewerProps> = ({ document, batchName, highlightText }) => {
  const [rawContent, setRawContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!document) {
      setRawContent(null);
      return;
    }

    if (document.file_type === 'pdf') {
      setRawContent(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchRawContent = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get(`/documents/${document.id}/raw`, {
          responseType: 'text',
        });
        if (!cancelled) {
          setRawContent(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load document content.');
          console.error('Error fetching raw document:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchRawContent();

    return () => {
      cancelled = true;
    };
  }, [document]);

  if (!document) {
    return (
      <Paper
        sx={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAFAFA',
          border: '2px dashed #CCC',
        }}
      >
        <Typography variant="body1" color="text.secondary">
          Select a file to view its raw content.
        </Typography>
      </Paper>
    );
  }

  const isPdf = document.file_type === 'pdf';
  const isEdi = document.file_type === 'edi_837p' || document.file_type === 'edi_837i';

  // Memoize expensive highlighting computation
  const highlightedContent = useMemo(() => {
    if (!rawContent || isPdf) return null;
    if (isEdi) return highlightEdiContent(rawContent, highlightText);
    if (highlightText && highlightText.length >= 2) {
      return rawContent.split('\n').map((line, i) => (
        <Box
          key={i}
          component="span"
          sx={{
            display: 'block',
            backgroundColor: lineContainsHighlight(line, highlightText)
              ? 'rgba(255, 235, 59, 0.15)'
              : 'transparent',
            transition: 'background-color 0.2s ease',
          }}
        >
          {highlightMatchInLine(line, highlightText)}
          {'\n'}
        </Box>
      ));
    }
    return null;
  }, [rawContent, highlightText, isEdi, isPdf]);

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Panel Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          backgroundColor: '#003F72',
          color: '#FFFFFF',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {getFileTypeIcon(document.file_type)}
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#FFFFFF' }}>
              {document.filename}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {getFileTypeLabel(document.file_type)}
              {batchName ? ` | ${batchName}` : ''}
            </Typography>
          </Box>
        </Box>
        <Chip
          label="RAW"
          size="small"
          sx={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: '#FFFFFF',
            fontWeight: 700,
            letterSpacing: 1,
          }}
        />
      </Box>

      {/* Content Area */}
      <Box
        sx={{
          flexGrow: 1,
          overflow: 'auto',
          position: 'relative',
        }}
      >
        {loading && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <CircularProgress size={28} />
            <Typography variant="body2" color="text.secondary">
              Loading document content...
            </Typography>
          </Box>
        )}

        {error && !loading && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </Box>
        )}

        {isPdf && !loading && !error && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              border: '3px solid #1a1a2e',
              borderRadius: 1,
              m: 2,
              backgroundColor: '#F5F5F5',
              gap: 2,
            }}
          >
            <PictureAsPdfIcon sx={{ fontSize: 64, color: '#E31C3D', opacity: 0.6 }} />
            <Typography variant="h6" color="text.secondary" fontWeight={600}>
              PDF Viewer: {document.filename}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PDF rendering is available in the production environment.
            </Typography>
          </Box>
        )}

        {!isPdf && !loading && !error && rawContent !== null && (
          <Box
            sx={{
              p: 2,
              backgroundColor: '#1E1E1E',
              minHeight: '100%',
              fontFamily: '"Fira Code", "Consolas", "Monaco", monospace',
              fontSize: '0.8rem',
              lineHeight: 1.6,
              whiteSpace: 'pre',
              overflowX: 'auto',
            }}
          >
            {highlightedContent ? (
              isEdi ? highlightedContent : (
                <Box component="span" sx={{ color: '#D4D4D4' }}>
                  {highlightedContent}
                </Box>
              )
            ) : (
              <Box component="span" sx={{ color: '#D4D4D4' }}>
                {rawContent}
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default RawDocumentViewer;
