// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import StorageIcon from '@mui/icons-material/Storage';
import { PageContainer } from '../components/layout/PageContainer';
import BatchSelector from '../components/ingestion/BatchSelector';
import FileList from '../components/ingestion/FileList';
import BigQueryTableViewer from '../components/ingestion/BigQueryTableViewer';
import ProcessingOverlay from '../components/processing/ProcessingOverlay';
import { useBatchProcessing } from '../hooks/useBatchProcessing';
import { Batch, Document } from '../types';
import { ROUTES } from '../utils/constants';

const BIGQUERY_TABLE_OPTIONS = [
  { value: 'claims', label: 'Claims' },
  { value: 'agent_findings', label: 'Agent Findings' },
  { value: 'decisions', label: 'Decisions' },
  { value: 'documents', label: 'Documents' },
  { value: "members", label: 'Members' },
  { value: 'providers', label: 'Providers' },
  { value: 'audit_log', label: 'Audit Log' },
] as const;

const IngestionPage: React.FC = () => {
  const navigate = useNavigate();

  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>('claims');
  const [showOverlay, setShowOverlay] = useState<boolean>(false);

  const {
    events,
    isProcessing,
    progress,
    pipelineNodes,
    isComplete,
    claimsProcessed,
    totalClaims,
    startProcessing,
  } = useBatchProcessing();

  const handleBatchSelect = useCallback((batch: Batch) => {
    setSelectedBatch(batch);
    setSelectedDocument(null);
  }, []);

  const handleFileSelect = useCallback((document: Document) => {
    setSelectedDocument(document);
  }, []);

  const handleTableChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedTable(event.target.value);
  }, []);

  const handleProcessBatch = useCallback(() => {
    if (!selectedBatch) return;
    setShowOverlay(true);
    startProcessing(selectedBatch.id, selectedBatch.file_count);
  }, [selectedBatch, startProcessing]);

  const handleProcessingComplete = useCallback(() => {
    setShowOverlay(false);
    navigate(ROUTES.VALIDATION);
  }, [navigate]);

  const handleExitProcessing = useCallback(() => {
    setShowOverlay(false);
  }, []);

  const processBatchButton = (
    <motion.div
      animate={
        selectedBatch && !isProcessing
          ? {
              boxShadow: [
                '0 0 0 0 rgba(0, 63, 114, 0.4)',
                '0 0 0 10px rgba(0, 63, 114, 0)',
                '0 0 0 0 rgba(0, 63, 114, 0)',
              ],
            }
          : {}
      }
      transition={
        selectedBatch && !isProcessing
          ? {
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : {}
      }
      style={{ borderRadius: 4 }}
    >
      <Button
        variant="contained"
        size="large"
        disabled={!selectedBatch || isProcessing}
        startIcon={<RocketLaunchIcon />}
        onClick={handleProcessBatch}
        sx={{
          backgroundColor: '#003F72',
          '&:hover': {
            backgroundColor: '#112E51',
          },
          '&.Mui-disabled': {
            backgroundColor: '#CCC',
            color: '#FFF',
          },
          px: 3,
          py: 1.25,
          fontWeight: 700,
          fontSize: '0.95rem',
          letterSpacing: 0.5,
        }}
      >
        PROCESS BATCH
      </Button>
    </motion.div>
  );

  return (
    <>
      <PageContainer
        title="Data Ingestion"
        subtitle="Workspace for batch document processing"
        action={processBatchButton}
      >
        {/* Batch Selector */}
        <Box sx={{ mb: 3 }}>
          <BatchSelector
            onBatchSelect={handleBatchSelect}
            selectedBatchId={selectedBatch?.id}
          />
        </Box>

        {/* File List */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#003F72',
              fontWeight: 700,
              mb: 1,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
            }}
          >
            Batch Files
          </Typography>
          <FileList
            batchId={selectedBatch?.id || null}
            onFileSelect={handleFileSelect}
            selectedDocumentId={selectedDocument?.id}
          />
        </Box>

        {/* BigQuery Table Viewer */}
        <Box
          sx={{
            height: 'calc(100vh - 460px)',
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Table Selector Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <StorageIcon sx={{ color: '#003F72', fontSize: 20 }} />
              <Typography
                variant="subtitle2"
                sx={{
                  color: '#003F72',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}
              >
                BigQuery Table Data
              </Typography>
            </Box>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="bq-table-selector-label">Table</InputLabel>
              <Select
                labelId="bq-table-selector-label"
                id="bq-table-selector"
                value={selectedTable}
                label="Table"
                onChange={handleTableChange}
                sx={{
                  backgroundColor: 'background.paper',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#B0BEC5',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#003F72',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#003F72',
                  },
                }}
              >
                {BIGQUERY_TABLE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Table Content */}
          <Box sx={{ flex: 1, minHeight: 0 }}>
            {selectedBatch ? (
              <BigQueryTableViewer
                batchId={selectedBatch.id}
                tableName={selectedTable}
              />
            ) : (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  height: '100%',
                  backgroundColor: '#FAFBFC',
                  borderRadius: 1,
                  border: '1px solid #E0E0E0',
                }}
              >
                <StorageIcon sx={{ fontSize: 48, color: '#B0BEC5' }} />
                <Typography variant="body1" color="text.secondary">
                  Select a batch to view BigQuery table data
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </PageContainer>

      {/* Processing Overlay */}
      <ProcessingOverlay
        open={showOverlay}
        progress={progress}
        events={events}
        pipelineNodes={pipelineNodes}
        isComplete={isComplete}
        claimsProcessed={claimsProcessed}
        totalClaims={totalClaims}
        onComplete={handleProcessingComplete}
        onExit={handleExitProcessing}
      />
    </>
  );
};

export default IngestionPage;
