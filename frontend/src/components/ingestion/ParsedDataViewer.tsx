// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Divider,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DataObjectIcon from '@mui/icons-material/DataObject';
import { Document } from '../../types';
import { parseDocument, getParsedData, ParsedDataResponse } from '../../services/documentService';

interface ParsedDataViewerProps {
  document: Document | null;
  onFieldHover?: (value: string) => void;
  onFieldLeave?: () => void;
}

interface FieldRowProps {
  label: string;
  value: string | string[] | number | boolean | null | undefined;
  onHover?: (value: string) => void;
  onLeave?: () => void;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, value, onHover, onLeave }) => {
  const [hovered, setHovered] = useState(false);

  const displayValue = (() => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  })();

  const searchableValue = (() => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value[0] || '';
    if (typeof value === 'boolean') return '';
    return String(value);
  })();

  return (
    <Box
      onMouseEnter={() => {
        setHovered(true);
        if (onHover && searchableValue.length >= 2) {
          onHover(searchableValue);
        }
      }}
      onMouseLeave={() => {
        setHovered(false);
        if (onLeave) onLeave();
      }}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        px: 2,
        py: 1.25,
        borderRadius: 1,
        backgroundColor: hovered ? 'rgba(0, 63, 114, 0.06)' : 'transparent',
        transition: 'background-color 0.15s ease',
        cursor: 'default',
        '&:hover': {
          boxShadow: '0 0 0 1px rgba(0, 63, 114, 0.15)',
        },
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 600,
          color: '#003F72',
          minWidth: 160,
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          textAlign: 'right',
          color: 'text.primary',
          wordBreak: 'break-word',
          ml: 2,
        }}
      >
        {displayValue}
      </Typography>
    </Box>
  );
};

const FIELD_LABELS: Record<string, string> = {
  patient_name: 'Patient Name',
  patient_dob: 'Date of Birth',
  patient_ssn_last4: 'SSN (Last 4)',
  provider_npi: 'Provider NPI',
  provider_name: 'Provider Name',
  provider_specialty: 'Provider Specialty',
  facility_name: 'Facility Name',
  facility_address: 'Facility Address',
  diagnosis_codes: 'Diagnosis Codes',
  procedure_codes: 'Procedure Codes',
  billing_amount: 'Billing Amount',
  service_date: 'Service Date',
  service_date_start: 'Service Start Date',
  service_date_end: 'Service End Date',
  claim_type: 'Claim Type',
  claim_number: 'Claim Number',
  place_of_service: 'Place of Service',
  referring_provider: 'Referring Provider',
  authorization_number: 'Authorization Number',
  insurance_id: 'Insurance ID',
  group_number: 'Group Number',
  subscriber_id: 'Subscriber ID',
  relationship_to_subscriber: 'Relationship to Subscriber',
  total_charges: 'Total Charges',
  amount_paid: 'Amount Paid',
  units: 'Units',
  modifier_codes: 'Modifier Codes',
  rendering_provider: 'Rendering Provider',
  admission_date: 'Admission Date',
  discharge_date: 'Discharge Date',
  discharge_status: 'Discharge Status',
  drg_code: 'DRG Code',
  revenue_codes: 'Revenue Codes',
};

function formatFieldLabel(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Array<{ key: string; label: string; value: unknown }> {
  const result: Array<{ key: string; label: string; value: unknown }> = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result.push(...flattenObject(value as Record<string, unknown>, fullKey));
    } else {
      result.push({
        key: fullKey,
        label: formatFieldLabel(key),
        value,
      });
    }
  }

  return result;
}

const ParsedDataViewer: React.FC<ParsedDataViewerProps> = ({ document, onFieldHover, onFieldLeave }) => {
  const [parsedData, setParsedData] = useState<ParsedDataResponse | null>(null);
  const [parsing, setParsing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isParsed, setIsParsed] = useState<boolean>(false);

  // Reset state when document changes
  useEffect(() => {
    setParsedData(null);
    setIsParsed(false);
    setError(null);
    setParsing(false);
  }, [document?.id]);

  const handleParse = async () => {
    if (!document) return;

    try {
      setParsing(true);
      setError(null);

      await parseDocument(document.id);

      const data = await getParsedData(document.id);
      setParsedData(data);
      setIsParsed(true);
    } catch (err) {
      setError('Failed to parse document. Please try again.');
      console.error('Error parsing document:', err);
    } finally {
      setParsing(false);
    }
  };

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
          Select a file to view its parsed data.
        </Typography>
      </Paper>
    );
  }

  const normalizedData = parsedData?.normalized_data;
  const fields = useMemo(
    () => (normalizedData ? flattenObject(normalizedData) : []),
    [normalizedData]
  );

  const PATIENT_KEYS = useMemo(() => new Set(['patient_name', 'patient_dob', 'patient_ssn_last4', 'subscriber_id', 'insurance_id', 'group_number', 'relationship_to_subscriber']), []);
  const PROVIDER_KEYS = useMemo(() => new Set(['provider_npi', 'provider_name', 'provider_specialty', 'facility_name', 'facility_address', 'referring_provider', 'rendering_provider']), []);
  const CLAIM_KEYS = useMemo(() => new Set(['claim_number', 'claim_type', 'service_date', 'service_date_start', 'service_date_end', 'place_of_service', 'authorization_number', 'admission_date', 'discharge_date', 'discharge_status', 'drg_code']), []);
  const BILLING_KEYS = useMemo(() => new Set(['diagnosis_codes', 'procedure_codes', 'billing_amount', 'total_charges', 'amount_paid', 'units', 'modifier_codes', 'revenue_codes']), []);
  const ALL_CATEGORIZED = useMemo(() => new Set([...PATIENT_KEYS, ...PROVIDER_KEYS, ...CLAIM_KEYS, ...BILLING_KEYS]), [PATIENT_KEYS, PROVIDER_KEYS, CLAIM_KEYS, BILLING_KEYS]);

  const { patientFields, providerFields, claimFields, billingFields, uncategorizedFields } = useMemo(() => ({
    patientFields: fields.filter((f) => PATIENT_KEYS.has(f.key)),
    providerFields: fields.filter((f) => PROVIDER_KEYS.has(f.key)),
    claimFields: fields.filter((f) => CLAIM_KEYS.has(f.key)),
    billingFields: fields.filter((f) => BILLING_KEYS.has(f.key)),
    uncategorizedFields: fields.filter((f) => !ALL_CATEGORIZED.has(f.key)),
  }), [fields, PATIENT_KEYS, PROVIDER_KEYS, CLAIM_KEYS, BILLING_KEYS, ALL_CATEGORIZED]);

  return (
    <Paper
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: '#FFFFFF',
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
          <DataObjectIcon sx={{ color: '#FFFFFF' }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={600} sx={{ color: '#FFFFFF' }}>
              Parsed Data
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
              {document.filename}
            </Typography>
          </Box>
        </Box>
        <Chip
          label={isParsed ? 'PARSED' : 'RAW'}
          size="small"
          sx={{
            backgroundColor: isParsed ? '#2E8540' : 'rgba(255,255,255,0.2)',
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
          p: 2,
        }}
      >
        {/* Parse Button */}
        {!isParsed && !parsing && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 3,
            }}
          >
            <DataObjectIcon sx={{ fontSize: 48, color: '#CCC' }} />
            <Typography variant="body1" color="text.secondary" textAlign="center">
              Parse this document to extract structured data fields.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleParse}
              sx={{
                backgroundColor: '#003F72',
                '&:hover': { backgroundColor: '#112E51' },
                px: 4,
                py: 1.5,
                fontWeight: 700,
                fontSize: '1rem',
              }}
            >
              Parse Document
            </Button>
            {error && (
              <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </Box>
        )}

        {/* Loading Spinner */}
        {parsing && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <CircularProgress size={48} sx={{ color: '#003F72' }} />
            <Typography variant="body1" color="text.secondary" fontWeight={600}>
              Parsing document...
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Extracting fields from {document.filename}
            </Typography>
          </Box>
        )}

        {/* Parsed Data Display */}
        {isParsed && !parsing && normalizedData && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Success Banner */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                p: 1.5,
                backgroundColor: 'rgba(46, 133, 64, 0.08)',
                borderRadius: 1,
                border: '1px solid rgba(46, 133, 64, 0.2)',
              }}
            >
              <CheckCircleIcon sx={{ color: '#2E8540' }} />
              <Typography variant="body2" fontWeight={600} sx={{ color: '#2E8540' }}>
                Document parsed successfully - {fields.length} fields extracted
              </Typography>
            </Box>

            {/* Patient Information */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: '#003F72',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                    Patient Information
                  </Typography>
                </Box>
                <Divider />
                {patientFields.map((field) => (
                    <FieldRow
                      key={field.key}
                      label={field.label}
                      value={field.value as string | string[] | number | boolean | null | undefined}
                      onHover={onFieldHover}
                      onLeave={onFieldLeave}
                    />
                  ))}
                {patientFields.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No patient information found.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Provider Information */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: '#003F72',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                    Provider Information
                  </Typography>
                </Box>
                <Divider />
                {providerFields.map((field) => (
                    <FieldRow
                      key={field.key}
                      label={field.label}
                      value={field.value as string | string[] | number | boolean | null | undefined}
                      onHover={onFieldHover}
                      onLeave={onFieldLeave}
                    />
                  ))}
                {providerFields.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No provider information found.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Claim Details */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: '#003F72',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                    Claim Details
                  </Typography>
                </Box>
                <Divider />
                {claimFields.map((field) => (
                    <FieldRow
                      key={field.key}
                      label={field.label}
                      value={field.value as string | string[] | number | boolean | null | undefined}
                      onHover={onFieldHover}
                      onLeave={onFieldLeave}
                    />
                  ))}
                {claimFields.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No claim details found.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Billing and Codes */}
            <Card variant="outlined">
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    backgroundColor: '#003F72',
                  }}
                >
                  <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                    Billing &amp; Codes
                  </Typography>
                </Box>
                <Divider />
                {billingFields.map((field) => (
                    <FieldRow
                      key={field.key}
                      label={field.label}
                      value={field.value as string | string[] | number | boolean | null | undefined}
                      onHover={onFieldHover}
                      onLeave={onFieldLeave}
                    />
                  ))}
                {billingFields.length === 0 && (
                  <Box sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      No billing information found.
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Additional Fields (anything not categorized above) */}
            {uncategorizedFields.length > 0 && (
                <Card variant="outlined">
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box
                      sx={{
                        px: 2,
                        py: 1,
                        backgroundColor: '#003F72',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ color: '#FFFFFF', fontWeight: 700 }}>
                        Additional Fields
                      </Typography>
                    </Box>
                    <Divider />
                    {uncategorizedFields.map((field) => (
                      <FieldRow
                        key={field.key}
                        label={field.label}
                        value={field.value as string | string[] | number | boolean | null | undefined}
                        onHover={onFieldHover}
                        onLeave={onFieldLeave}
                      />
                    ))}
                  </CardContent>
                </Card>
            )}
          </Box>
        )}

        {/* Parsed but no data */}
        {isParsed && !parsing && !normalizedData && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2,
            }}
          >
            <Typography variant="body1" color="text.secondary">
              Document was parsed but no structured data was extracted.
            </Typography>
            <Button
              variant="outlined"
              onClick={handleParse}
              startIcon={<PlayArrowIcon />}
              sx={{ color: '#003F72', borderColor: '#003F72' }}
            >
              Retry Parse
            </Button>
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default ParsedDataViewer;
