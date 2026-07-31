// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Chip,
  CircularProgress,
} from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CodeIcon from '@mui/icons-material/Code';
import { Document } from '../../types';
import { listBatchDocuments } from '../../services/batchService';

interface FileListProps {
  batchId: string | null;
  onFileSelect: (document: Document) => void;
  selectedDocumentId?: string;
}

const fileTypeLabels: Record<Document['file_type'], string> = {
  pdf: 'PDF',
  edi_837p: 'EDI 837P',
  edi_837i: 'EDI 837I',
  ehr: 'EHR',
};

const parseStatusColorMap: Record<Document['parse_status'], 'default' | 'warning' | 'info' | 'success' | 'error'> = {
  raw: 'default',
  parsing: 'info',
  parsed: 'success',
  error: 'error',
};

const parseStatusLabelMap: Record<Document['parse_status'], string> = {
  raw: 'NOT PROCESSED',
  parsing: 'PROCESSING',
  parsed: 'COMPLETED',
  error: 'ERROR',
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${size} ${units[i]}`;
}

function getFileIcon(fileType: Document['file_type']) {
  switch (fileType) {
    case 'pdf':
      return <PictureAsPdfIcon fontSize="small" sx={{ color: '#E31C3D' }} />;
    case 'edi_837p':
    case 'edi_837i':
      return <CodeIcon fontSize="small" sx={{ color: '#003F72' }} />;
    case 'ehr':
      return <InsertDriveFileIcon fontSize="small" sx={{ color: '#2E8540' }} />;
    default:
      return <InsertDriveFileIcon fontSize="small" />;
  }
}

const FileList: React.FC<FileListProps> = ({ batchId, onFileSelect, selectedDocumentId }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!batchId) {
      setDocuments([]);
      return;
    }

    let cancelled = false;

    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await listBatchDocuments(batchId);
        if (!cancelled) {
          setDocuments(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError('Failed to load documents. Please try again.');
          console.error('Error fetching documents:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDocuments();

    return () => {
      cancelled = true;
    };
  }, [batchId]);

  if (!batchId) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Select a batch to view its files.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 3 }}>
        <CircularProgress size={24} />
        <Typography variant="body2" color="text.secondary">
          Loading files...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Typography variant="body2" color="error">
          {error}
        </Typography>
      </Box>
    );
  }

  if (documents.length === 0) {
    return (
      <Box sx={{ py: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          No files found in this batch.
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer
      component={Paper}
      sx={{
        maxHeight: 260,
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700, backgroundColor: '#003F72', color: '#FFFFFF' }}>
              Filename
            </TableCell>
            <TableCell sx={{ fontWeight: 700, backgroundColor: '#003F72', color: '#FFFFFF' }}>
              File Type
            </TableCell>
            <TableCell sx={{ fontWeight: 700, backgroundColor: '#003F72', color: '#FFFFFF' }}>
              Size
            </TableCell>
            <TableCell sx={{ fontWeight: 700, backgroundColor: '#003F72', color: '#FFFFFF' }}>
              Status
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {documents.map((doc) => {
            const isSelected = doc.id === selectedDocumentId;
            return (
              <TableRow
                key={doc.id}
                hover
                onClick={() => onFileSelect(doc)}
                selected={isSelected}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'rgba(0, 63, 114, 0.08)' : 'inherit',
                  '&:hover': {
                    backgroundColor: isSelected
                      ? 'rgba(0, 63, 114, 0.12)'
                      : 'rgba(0, 63, 114, 0.04)',
                  },
                  '& td': {
                    borderLeft: isSelected ? '3px solid #003F72' : '3px solid transparent',
                  },
                  '& td:first-of-type': {
                    borderLeft: isSelected ? '3px solid #003F72' : '3px solid transparent',
                  },
                }}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getFileIcon(doc.file_type)}
                    <Typography variant="body2" fontWeight={isSelected ? 600 : 400}>
                      {doc.filename}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{fileTypeLabels[doc.file_type]}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatFileSize(doc.file_size)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={parseStatusLabelMap[doc.parse_status]}
                    color={parseStatusColorMap[doc.parse_status]}
                    size="small"
                    sx={{ fontWeight: 600, minWidth: 70 }}
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default FileList;
