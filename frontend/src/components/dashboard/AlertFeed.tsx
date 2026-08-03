// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItemButton,
  ListItemText,
  Skeleton,
  Typography,
} from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import RiskBadge from '../common/RiskBadge';
import AgentBadge from '../common/AgentBadge';
import { getRecentAlerts, type Alert } from '../../services/alertService';
import { useUIContext } from '../../contexts/UIContext';
import { formatCurrency, formatTimestamp } from '../../utils/formatters';

const AlertFeed: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const { openDeepDive } = useUIContext();

  useEffect(() => {
    let cancelled = false;

    getRecentAlerts(20)
      .then((data) => {
        if (!cancelled) {
          setAlerts(data);
        }
      })
      .catch((err) => {
        console.error('Failed to load alerts:', err);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        avatar={<NotificationsActiveIcon sx={{ color: '#E31C3D' }} />}
        title={
          <Typography variant="subtitle1" fontWeight={600} color="primary.dark">
            Recent Alerts
          </Typography>
        }
        subheader={
          <Typography variant="caption" color="text.secondary">
            Flagged claims requiring review
          </Typography>
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ flex: 1, overflow: 'auto', pt: 1, px: 0 }}>
        {loading ? (
          <Box sx={{ px: 2 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={60}
                sx={{ mb: 1, borderRadius: 1 }}
              />
            ))}
          </Box>
        ) : alerts.length === 0 ? (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No recent alerts
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {alerts.map((alert) => (
              <ListItemButton
                key={alert.claim_id}
                onClick={() => openDeepDive(alert.claim_id)}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 63, 114, 0.04)',
                  },
                }}
              >
                <ListItemText
                  disableTypography
                  primary={
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        mb: 0.5,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={600} color="primary.dark">
                          {alert.claim_number}
                        </Typography>
                        {alert.risk_level && (
                          <RiskBadge level={alert.risk_level} />
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {formatTimestamp(alert.timestamp)}
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {alert.beneficiary_name ?? alert.veteran_name} &middot; {alert.provider_name} &middot;{' '}
                          {formatCurrency(alert.billing_amount)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {alert.flagging_agents.map((agent) => (
                          <AgentBadge key={agent} agentName={agent} />
                        ))}
                      </Box>
                    </Box>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
};

export default AlertFeed;
