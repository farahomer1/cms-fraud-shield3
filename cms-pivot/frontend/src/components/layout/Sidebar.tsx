// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import BarChartIcon from '@mui/icons-material/BarChart';
import SearchIcon from '@mui/icons-material/Search';
import HistoryIcon from '@mui/icons-material/History';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PeopleIcon from '@mui/icons-material/People';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { ROUTES, ROLE_ROUTES } from '../../utils/constants';
import { useAuth } from '../../contexts/AuthContext';

const DRAWER_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Mission Control', icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
  { label: 'Data Ingestion', icon: <CloudUploadIcon />, path: ROUTES.INGESTION },
  { label: 'Validation Queue', icon: <FactCheckIcon />, path: ROUTES.VALIDATION },
  { label: 'Analytics', icon: <BarChartIcon />, path: ROUTES.ANALYTICS },
  { label: 'Fraud Research', icon: <SearchIcon />, path: ROUTES.FRAUD_RESEARCH },
  { label: 'Recoupment', icon: <AccountBalanceIcon />, path: ROUTES.RECOUPMENT },
  { label: 'Audit Log', icon: <HistoryIcon />, path: ROUTES.AUDIT_LOG },
  { label: 'Agent Management', icon: <SmartToyIcon />, path: ROUTES.AGENT_MANAGEMENT },
  { label: 'Auditor Workflows', icon: <AssignmentIcon />, path: ROUTES.AUDITOR_WORKFLOWS },
  { label: 'User Management', icon: <PeopleIcon />, path: ROUTES.USER_MANAGEMENT },
  { label: 'System Monitoring', icon: <MonitorHeartIcon />, path: ROUTES.MONITORING },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const visibleItems = useMemo(() => {
    const role = user?.role ?? '';
    const allowed = ROLE_ROUTES[role];
    if (!allowed) return NAV_ITEMS; // fallback: show all
    return NAV_ITEMS.filter((item) => allowed.includes(item.path));
  }, [user?.role]);

  return (
    <Drawer
      variant="permanent"
      component="aside"
      aria-label="Main navigation"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#112E51', color: 'white' },
      }}
    >
      <Toolbar />
      <nav aria-label="Primary navigation">
        <List sx={{ pt: 1 }} role="menubar" aria-label="Navigation menu">
          {visibleItems.map((item) => {
            const isSelected = location.pathname === item.path;
            return (
              <ListItemButton
                key={item.path}
                role="menuitem"
                selected={isSelected}
                onClick={() => navigate(item.path)}
                aria-current={isSelected ? 'page' : undefined}
                aria-label={item.label}
                sx={{
                  mx: 1,
                  borderRadius: 1,
                  mb: 0.5,
                  '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.12)' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                  '&:focus-visible': {
                    outline: '2px solid #FFD700',
                    outlineOffset: '-2px',
                  },
                }}
              >
                <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }} aria-hidden="true">
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.9rem' }} />
              </ListItemButton>
            );
          })}
        </List>
      </nav>
    </Drawer>
  );
};

export { DRAWER_WIDTH };
