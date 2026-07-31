// Copyright 2026 Google. Google provides these Materials as “Free Evaluation Services” subject to the terms, restrictions and limitations at https://cloud.google.com/terms/service-terms.

import React, { useCallback, useMemo, useState } from 'react';
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import HistoryIcon from '@mui/icons-material/History';
import SecurityIcon from '@mui/icons-material/Security';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BusinessIcon from '@mui/icons-material/Business';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import RefreshIcon from '@mui/icons-material/Refresh';
import { PageContainer } from '../components/layout/PageContainer';
import { formatTimestamp } from '../utils/formatters';
import type { SystemUser, UserRole, UserStatus } from '../types';

/* ─── Role & Status config ─── */

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: 'MCR', label: 'MCR', color: '#112E51' },
  { value: 'Supervisor', label: 'Supervisor', color: '#0071BC' },
  { value: 'Auditor', label: 'Auditor', color: '#8B6914' },
  { value: 'Administrator', label: 'Administrator', color: '#E31C3D' },
  { value: 'Organization Admin', label: 'Organization Admin', color: '#2E8540' },
];

const STATUS_CONFIG: Record<UserStatus, { label: string; bg: string; text: string; icon: React.ReactElement }> = {
  active: { label: 'Active', bg: '#E8F5E9', text: '#2E7D32', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  inactive: { label: 'Inactive', bg: '#E0E0E0', text: '#616161', icon: <BlockIcon sx={{ fontSize: 14 }} /> },
  locked: { label: 'Locked', bg: '#FFEBEE', text: '#C62828', icon: <LockIcon sx={{ fontSize: 14 }} /> },
};

const VA_OFFICES = [
  'VBA Central Office',
  'St. Petersburg RO',
  'Philadelphia RO',
  'Oakland RO',
  'Winston-Salem RO',
  'Nashville RO',
  'Cleveland RO',
  'Seattle RO',
  'Denver RO',
  'Atlanta RO',
  'Houston RO',
  'Milwaukee RO',
  'Indianapolis RO',
  'Phoenix RO',
  'Portland RO',
];

/* ─── Seed data ─── */

const now = new Date().toISOString();
const minutesAgo = (m: number) => new Date(Date.now() - m * 60000).toISOString();
const daysAgo = (d: number) => new Date(Date.now() - d * 86400000).toISOString();

const SEED_USERS: SystemUser[] = [
  {
    id: 'u-001',
    firstName: 'Stone',
    lastName: 'Jiang',
    email: 'stone.jiang@va.gov',
    role: 'MCR',
    status: 'active',
    phone: '(202) 555-0147',
    office: 'VBA Central Office',
    lastLogin: minutesAgo(12),
    createdAt: daysAgo(180),
    updatedAt: daysAgo(2),
    mfaEnabled: true,
    notes: 'Lead case officer — PIVOT system administrator.',
  },
  {
    id: 'u-002',
    firstName: 'Maria',
    lastName: 'Rodriguez',
    email: 'maria.rodriguez@va.gov',
    role: 'Supervisor',
    status: 'active',
    phone: '(202) 555-0198',
    office: 'VBA Central Office',
    lastLogin: minutesAgo(45),
    createdAt: daysAgo(365),
    updatedAt: daysAgo(10),
    mfaEnabled: true,
    notes: 'Payment integrity division supervisor.',
  },
  {
    id: 'u-003',
    firstName: 'James',
    lastName: 'Patterson',
    email: 'james.patterson@va.gov',
    role: 'MCR',
    status: 'active',
    phone: '(727) 555-0234',
    office: 'St. Petersburg RO',
    lastLogin: daysAgo(1),
    createdAt: daysAgo(120),
    updatedAt: daysAgo(5),
    mfaEnabled: true,
    notes: '',
  },
  {
    id: 'u-004',
    firstName: 'Sarah',
    lastName: 'Chen',
    email: 'sarah.chen@va.gov',
    role: 'Auditor',
    status: 'active',
    phone: '(215) 555-0312',
    office: 'Philadelphia RO',
    lastLogin: daysAgo(2),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(15),
    mfaEnabled: true,
    notes: 'OIG liaison for quarterly audits.',
  },
  {
    id: 'u-005',
    firstName: 'Robert',
    lastName: 'Kim',
    email: 'robert.kim@va.gov',
    role: 'Administrator',
    status: 'active',
    phone: '(202) 555-0401',
    office: 'VBA Central Office',
    lastLogin: minutesAgo(120),
    createdAt: daysAgo(400),
    updatedAt: daysAgo(1),
    mfaEnabled: true,
    notes: 'System administrator — manages access control and integrations.',
  },
  {
    id: 'u-006',
    firstName: 'Linda',
    lastName: 'Okafor',
    email: 'linda.okafor@va.gov',
    role: 'MCR',
    status: 'inactive',
    phone: '(510) 555-0189',
    office: 'Oakland RO',
    lastLogin: daysAgo(45),
    createdAt: daysAgo(200),
    updatedAt: daysAgo(30),
    mfaEnabled: false,
    notes: 'On extended leave — account deactivated per policy.',
  },
  {
    id: 'u-007',
    firstName: 'Thomas',
    lastName: 'Baker',
    email: 'thomas.baker@va.gov',
    role: 'Supervisor',
    status: 'locked',
    phone: '(336) 555-0276',
    office: 'Winston-Salem RO',
    lastLogin: daysAgo(14),
    createdAt: daysAgo(300),
    updatedAt: daysAgo(3),
    mfaEnabled: true,
    notes: 'Account locked — exceeded max login attempts.',
  },
  {
    id: 'u-008',
    firstName: 'Angela',
    lastName: 'Davis',
    email: 'angela.davis@va.gov',
    role: 'Auditor',
    status: 'active',
    phone: '(615) 555-0143',
    office: 'Nashville RO',
    lastLogin: daysAgo(3),
    createdAt: daysAgo(150),
    updatedAt: daysAgo(20),
    mfaEnabled: true,
    notes: '',
  },
  {
    id: 'u-009',
    firstName: 'Michael',
    lastName: 'Torres',
    email: 'michael.torres@va.gov',
    role: 'MCR',
    status: 'active',
    phone: '(216) 555-0388',
    office: 'Cleveland RO',
    lastLogin: minutesAgo(300),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(8),
    mfaEnabled: true,
    notes: 'Recently onboarded — completing training modules.',
  },
  {
    id: 'u-010',
    firstName: 'Patricia',
    lastName: 'Nguyen',
    email: 'patricia.nguyen@va.gov',
    role: 'Administrator',
    status: 'active',
    phone: '(206) 555-0422',
    office: 'Seattle RO',
    lastLogin: daysAgo(1),
    createdAt: daysAgo(250),
    updatedAt: daysAgo(7),
    mfaEnabled: true,
    notes: 'Regional IT administrator.',
  },
];

/* ─── Form state ─── */

interface UserForm {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phone: string;
  office: string;
  mfaEnabled: boolean;
  notes: string;
}

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  role: 'MCR',
  status: 'active',
  phone: '',
  office: '',
  mfaEnabled: true,
  notes: '',
};

/* ─── Sorting ─── */
type SortField = 'lastName' | 'email' | 'role' | 'status' | 'office' | 'lastLogin';

function getInitials(first: string, last: string): string {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function roleColor(role: UserRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.color ?? '#5B616B';
}

/* ─── Component ─── */

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<SystemUser[]>(SEED_USERS);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Detail view
  const [detailUser, setDetailUser] = useState<SystemUser | null>(null);

  // Activity log dialog
  const [activityDialogUser, setActivityDialogUser] = useState<SystemUser | null>(null);

  // Search & filter
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lastName');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  /* ─── Filtering & sorting ─── */
  const filteredUsers = useMemo(() => {
    let result = [...users];
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.office.toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q),
      );
    }
    if (roleFilter !== 'all') result = result.filter((u) => u.role === roleFilter);
    if (statusFilter !== 'all') result = result.filter((u) => u.status === statusFilter);

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'lastLogin') {
        cmp = (a.lastLogin ?? '').localeCompare(b.lastLogin ?? '');
      } else {
        cmp = (a[sortField] ?? '').localeCompare(b[sortField] ?? '');
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [users, search, roleFilter, statusFilter, sortField, sortDir]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [filteredUsers, page, rowsPerPage],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  /* ─── CRUD handlers ─── */
  const updateForm = useCallback(<K extends keyof UserForm>(key: K, value: UserForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const handleOpenEdit = (user: SystemUser) => {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      office: user.office,
      mfaEnabled: user.mfaEnabled,
      notes: user.notes,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = () => {
    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()) return;
    const email = form.email.includes('@') ? form.email : `${form.email}@va.gov`;
    const ts = new Date().toISOString();

    if (editingId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? { ...u, ...form, email, updatedAt: ts }
            : u,
        ),
      );
    } else {
      const newUser: SystemUser = {
        id: `u-${Date.now()}`,
        ...form,
        email,
        lastLogin: null,
        createdAt: ts,
        updatedAt: ts,
      };
      setUsers((prev) => [newUser, ...prev]);
    }
    handleCloseDialog();
  };

  const handleDelete = () => {
    if (deleteConfirmId) {
      setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    }
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const nextStatus: UserStatus = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: nextStatus, updatedAt: new Date().toISOString() };
      }),
    );
  };

  const handleUnlock = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId ? { ...u, status: 'active' as UserStatus, updatedAt: new Date().toISOString() } : u,
      ),
    );
  };

  const handleResetPassword = (user: SystemUser) => {
    alert(`Password reset email sent to ${user.email}`);
  };

  const handleExportCSV = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Role', 'Status', 'Office', 'Phone', 'MFA', 'Last Login'];
    const rows = filteredUsers.map((u) => [
      u.firstName,
      u.lastName,
      u.email,
      u.role,
      u.status,
      u.office,
      u.phone,
      u.mfaEnabled ? 'Yes' : 'No',
      u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pivot_users.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter((u) => u.status === 'active').length,
    inactive: users.filter((u) => u.status === 'inactive').length,
    locked: users.filter((u) => u.status === 'locked').length,
  }), [users]);

  /* ─── Fake activity log ─── */
  const fakeActivityLog = (user: SystemUser) => [
    { action: 'Logged in via PIV/CAC', timestamp: user.lastLogin ?? user.updatedAt, ip: '10.48.22.15' },
    { action: 'Reviewed claim VA-2025-88421', timestamp: daysAgo(1), ip: '10.48.22.15' },
    { action: 'Approved claim VA-2025-87102', timestamp: daysAgo(2), ip: '10.48.22.15' },
    { action: 'Password changed', timestamp: daysAgo(30), ip: '10.48.22.15' },
    { action: 'MFA enrollment completed', timestamp: daysAgo(60), ip: '10.48.22.15' },
    { action: 'Account created', timestamp: user.createdAt, ip: 'system' },
  ];

  /* ─── Render ─── */
  return (
    <PageContainer
      title="User Management"
      subtitle="Manage system users, roles, and access controls"
      action={
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
            sx={{ textTransform: 'none', fontWeight: 600, borderColor: '#112E51', color: '#112E51' }}
          >
            Export CSV
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
            sx={{
              backgroundColor: '#112E51',
              '&:hover': { backgroundColor: '#1A4480' },
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Add User
          </Button>
        </Stack>
      }
    >
      {/* ─── Summary Stats ─── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={`${stats.total} Total`} size="small" sx={{ fontWeight: 600 }} />
        <Chip
          icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
          label={`${stats.active} Active`}
          size="small"
          sx={{ backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }}
        />
        <Chip
          icon={<BlockIcon sx={{ fontSize: 14 }} />}
          label={`${stats.inactive} Inactive`}
          size="small"
          sx={{ backgroundColor: '#E0E0E0', color: '#616161', fontWeight: 600 }}
        />
        {stats.locked > 0 && (
          <Chip
            icon={<LockIcon sx={{ fontSize: 14 }} />}
            label={`${stats.locked} Locked`}
            size="small"
            sx={{ backgroundColor: '#FFEBEE', color: '#C62828', fontWeight: 600 }}
          />
        )}
      </Stack>

      {/* ─── Search & Filters ─── */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by name, email, office, or role..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 320 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#9E9E9E' }} />
              </InputAdornment>
            ),
          }}
        />
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Role</InputLabel>
          <Select value={roleFilter} label="Role" onChange={(e: SelectChangeEvent) => { setRoleFilter(e.target.value); setPage(0); }}>
            <MenuItem value="all">All Roles</MenuItem>
            {ROLE_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e: SelectChangeEvent) => { setStatusFilter(e.target.value); setPage(0); }}>
            <MenuItem value="all">All Statuses</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
            <MenuItem value="locked">Locked</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* ─── Users Table ─── */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'lastName'} direction={sortField === 'lastName' ? sortDir : 'asc'} onClick={() => handleSort('lastName')}>
                  User
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'email'} direction={sortField === 'email' ? sortDir : 'asc'} onClick={() => handleSort('email')}>
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'role'} direction={sortField === 'role' ? sortDir : 'asc'} onClick={() => handleSort('role')}>
                  Role
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'status'} direction={sortField === 'status' ? sortDir : 'asc'} onClick={() => handleSort('status')}>
                  Status
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'office'} direction={sortField === 'office' ? sortDir : 'asc'} onClick={() => handleSort('office')}>
                  Office
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>
                <TableSortLabel active={sortField === 'lastLogin'} direction={sortField === 'lastLogin' ? sortDir : 'asc'} onClick={() => handleSort('lastLogin')}>
                  Last Login
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>MFA</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No users match the current filters.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedUsers.map((user) => (
                <TableRow
                  key={user.id}
                  hover
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: alpha('#112E51', 0.02) } }}
                  onClick={() => setDetailUser(user)}
                >
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: roleColor(user.role),
                        }}
                      >
                        {getInitials(user.firstName, user.lastName)}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {user.lastName}, {user.firstName}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.role}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: alpha(roleColor(user.role), 0.1),
                        color: roleColor(user.role),
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      icon={STATUS_CONFIG[user.status].icon}
                      label={STATUS_CONFIG[user.status].label}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: STATUS_CONFIG[user.status].bg,
                        color: STATUS_CONFIG[user.status].text,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">{user.office}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {user.lastLogin ? formatTimestamp(user.lastLogin) : 'Never'}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {user.mfaEnabled ? (
                      <Chip label="On" size="small" sx={{ fontSize: '0.7rem', height: 20, backgroundColor: '#E8F5E9', color: '#2E7D32', fontWeight: 600 }} />
                    ) : (
                      <Chip label="Off" size="small" sx={{ fontSize: '0.7rem', height: 20, backgroundColor: '#FFF3E0', color: '#E65100', fontWeight: 600 }} />
                    )}
                  </TableCell>
                  <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleOpenEdit(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {user.status === 'locked' ? (
                        <Tooltip title="Unlock Account">
                          <IconButton size="small" onClick={() => handleUnlock(user.id)} sx={{ color: '#2E8540' }}>
                            <LockOpenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip title={user.status === 'active' ? 'Deactivate' : 'Activate'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(user.id)}
                            sx={{ color: user.status === 'active' ? '#E65100' : '#2E7D32' }}
                          >
                            {user.status === 'active' ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Activity Log">
                        <IconButton size="small" onClick={() => setActivityDialogUser(user)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton size="small" onClick={() => setDeleteConfirmId(user.id)} color="error">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredUsers.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25]}
        />
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
        Showing {paginatedUsers.length} of {filteredUsers.length} users
      </Typography>

      {/* ═══════════ Add / Edit User Dialog ═══════════ */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: '#112E51', pb: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon />
            <span>{editingId ? 'Edit User' : 'Add New User'}</span>
          </Stack>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2.5}>
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="First Name"
                value={form.firstName}
                onChange={(e) => updateForm('firstName', e.target.value)}
                required
                InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon sx={{ fontSize: 18, color: '#9E9E9E' }} /></InputAdornment> }}
              />
              <TextField
                fullWidth
                label="Last Name"
                value={form.lastName}
                onChange={(e) => updateForm('lastName', e.target.value)}
                required
              />
            </Stack>

            <TextField
              fullWidth
              label="Email Address"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              required
              placeholder="firstname.lastname@va.gov"
              helperText="Must be a @va.gov email address"
              InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: 18, color: '#9E9E9E' }} /></InputAdornment> }}
            />

            <Stack direction="row" spacing={2}>
              <FormControl fullWidth required>
                <InputLabel>Role</InputLabel>
                <Select
                  value={form.role}
                  label="Role"
                  onChange={(e: SelectChangeEvent) => updateForm('role', e.target.value as UserRole)}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: r.color }} />
                        <span>{r.label}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={form.status}
                  label="Status"
                  onChange={(e: SelectChangeEvent) => updateForm('status', e.target.value as UserStatus)}
                >
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="locked">Locked</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                label="Phone"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                placeholder="(XXX) XXX-XXXX"
                InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ fontSize: 18, color: '#9E9E9E' }} /></InputAdornment> }}
              />
              <FormControl fullWidth>
                <InputLabel>Office</InputLabel>
                <Select
                  value={form.office}
                  label="Office"
                  onChange={(e: SelectChangeEvent) => updateForm('office', e.target.value)}
                  startAdornment={<InputAdornment position="start"><BusinessIcon sx={{ fontSize: 18, color: '#9E9E9E' }} /></InputAdornment>}
                >
                  {VA_OFFICES.map((o) => (
                    <MenuItem key={o} value={o}>{o}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={1} alignItems="center">
                <SecurityIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                <Typography variant="body2" fontWeight={600}>Multi-Factor Authentication</Typography>
              </Stack>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.mfaEnabled}
                    onChange={(e) => updateForm('mfaEnabled', e.target.checked)}
                    size="small"
                  />
                }
                label={<Typography variant="caption">{form.mfaEnabled ? 'Enabled' : 'Disabled'}</Typography>}
              />
            </Stack>

            <TextField
              fullWidth
              label="Notes"
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              multiline
              rows={2}
              placeholder="Optional notes about this user..."
            />
          </Stack>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
          <Button onClick={handleCloseDialog} variant="outlined" color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={!form.firstName.trim() || !form.lastName.trim() || !form.email.trim()}
            startIcon={editingId ? <CheckCircleIcon /> : <AddIcon />}
            sx={{ backgroundColor: '#112E51', '&:hover': { backgroundColor: '#1A4480' } }}
          >
            {editingId ? 'Save Changes' : 'Add User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ Delete Confirmation Dialog ═══════════ */}
      <Dialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} PaperProps={{ sx: { borderRadius: 2 } }}>
        <DialogTitle sx={{ fontWeight: 600, color: '#E31C3D' }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <WarningAmberIcon />
            <span>Delete User</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to remove this user from the system? This action cannot be undone.
            The user will lose all access to PIVOT immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirmId(null)} variant="outlined" color="inherit">Cancel</Button>
          <Button onClick={handleDelete} variant="contained" sx={{ backgroundColor: '#E31C3D', '&:hover': { backgroundColor: '#C4192F' } }}>
            Delete User
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════════ User Detail Dialog ═══════════ */}
      <Dialog
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {detailUser && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    fontSize: '1rem',
                    fontWeight: 700,
                    backgroundColor: roleColor(detailUser.role),
                  }}
                >
                  {getInitials(detailUser.firstName, detailUser.lastName)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="primary.dark">
                    {detailUser.firstName} {detailUser.lastName}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip
                      label={detailUser.role}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: alpha(roleColor(detailUser.role), 0.1),
                        color: roleColor(detailUser.role),
                      }}
                    />
                    <Chip
                      icon={STATUS_CONFIG[detailUser.status].icon}
                      label={STATUS_CONFIG[detailUser.status].label}
                      size="small"
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        backgroundColor: STATUS_CONFIG[detailUser.status].bg,
                        color: STATUS_CONFIG[detailUser.status].text,
                      }}
                    />
                  </Stack>
                </Box>
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent>
              <Stack spacing={2} sx={{ mt: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                  <Typography variant="body2">{detailUser.email}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <PhoneIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                  <Typography variant="body2">{detailUser.phone || 'Not provided'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BusinessIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                  <Typography variant="body2">{detailUser.office || 'Not assigned'}</Typography>
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center">
                  <SecurityIcon sx={{ fontSize: 18, color: '#5B616B' }} />
                  <Typography variant="body2">
                    MFA: {detailUser.mfaEnabled ? 'Enabled' : 'Disabled'}
                  </Typography>
                </Stack>

                <Divider />

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Created</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatTimestamp(detailUser.createdAt)}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Last Updated</Typography>
                    <Typography variant="body2" fontWeight={600}>{formatTimestamp(detailUser.updatedAt)}</Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">Last Login</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {detailUser.lastLogin ? formatTimestamp(detailUser.lastLogin) : 'Never'}
                    </Typography>
                  </Paper>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary">User ID</Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{detailUser.id}</Typography>
                  </Paper>
                </Box>

                {detailUser.notes && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>Notes</Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>{detailUser.notes}</Typography>
                    </Box>
                  </>
                )}
              </Stack>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2, justifyContent: 'space-between' }}>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => handleResetPassword(detailUser)}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Reset Password
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<HistoryIcon />}
                  onClick={() => { setDetailUser(null); setActivityDialogUser(detailUser); }}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Activity Log
                </Button>
              </Stack>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => { setDetailUser(null); handleOpenEdit(detailUser); }}
                  sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                >
                  Edit
                </Button>
                <Button onClick={() => setDetailUser(null)} variant="outlined" color="inherit" sx={{ textTransform: 'none', fontSize: '0.8rem' }}>
                  Close
                </Button>
              </Stack>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ═══════════ Activity Log Dialog ═══════════ */}
      <Dialog
        open={!!activityDialogUser}
        onClose={() => setActivityDialogUser(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2 } }}
      >
        {activityDialogUser && (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: '#112E51' }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <HistoryIcon />
                <span>Activity Log — {activityDialogUser.firstName} {activityDialogUser.lastName}</span>
              </Stack>
            </DialogTitle>
            <Divider />
            <DialogContent>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>IP Address</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fakeActivityLog(activityDialogUser).map((entry, idx) => (
                      <TableRow key={idx}>
                        <TableCell><Typography variant="body2">{entry.action}</Typography></TableCell>
                        <TableCell><Typography variant="caption" color="text.secondary">{formatTimestamp(entry.timestamp)}</Typography></TableCell>
                        <TableCell><Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{entry.ip}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setActivityDialogUser(null)} variant="outlined" color="inherit">Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </PageContainer>
  );
};

export default UserManagementPage;
