import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api/client';
import { soundFX } from '../utils/audio';
import { sanitizeImageUrl } from '../utils/imageUrl';
import {
  Users,
  ShieldCheck,
  KeyRound,
  UserPlus,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  User,
  Shield,
  Save,
  X,
  Sparkles,
  Layers,
  Check,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Camera,
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
  Eye,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
  CheckSquare,
  Square,
} from 'lucide-react';
import { CustomSelect } from '../components/common/CustomSelect';
import { CustomCheckbox } from '../components/common/CustomCheckbox';
import { AnimatedConfirmModal } from '../components/common/AnimatedConfirmModal';

interface UserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  roleId: string;
  roleName: string;
  phone?: string;
  pinCode?: string;
  isActive: boolean;
  language?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description?: string;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissionIds: string[];
  permissionCodes: string[];
}

export type UserSortField = 'NAME' | 'ROLE' | 'PIN' | 'STATUS' | 'LAST_ACTIVE';

export const EmployeesPage: React.FC = () => {
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState<'STAFF' | 'ROLES'>('STAFF');
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [rolesList, setRolesList] = useState<RoleItem[]>([]);
  const [permissionsList, setPermissionsList] = useState<PermissionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Enterprise Multi-Facet Filters & Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [pinFilter, setPinFilter] = useState<'ALL' | 'HAS_PIN' | 'NO_PIN'>('ALL');
  const [sortField, setSortField] = useState<UserSortField>('NAME');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Enterprise Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Bulk Selection State
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modals & form state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; username: string } | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Avatar Upload & Lightbox States (matching CRM page logic)
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMode, setAvatarMode] = useState<'upload' | 'url'>('upload');
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox Viewer
  const [lightboxUrl, setLightboxUrl] = useState<{ url: string; title: string; role?: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  const [userForm, setUserForm] = useState({
    fullName: '',
    username: '',
    email: '',
    phone: '',
    password: '',
    pinCode: '',
    roleId: '',
    avatarUrl: '',
    language: 'en',
    isActive: true,
  });

  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissionIds: [] as string[],
  });

  // Selected Role for Permission Matrix
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState<string>('');
  const [matrixPermissions, setMatrixPermissions] = useState<string[]>([]);
  const [isSavingMatrix, setIsSavingMatrix] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes, permsRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles'),
        api.get('/users/permissions'),
      ]);

      const fetchedUsers = usersRes.data.users || [];
      const fetchedRoles = rolesRes.data.roles || [];
      const fetchedPerms = permsRes.data.permissions || [];

      setUsersList(fetchedUsers);
      setRolesList(fetchedRoles);
      setPermissionsList(fetchedPerms);

      if (fetchedRoles.length > 0 && !selectedRoleForMatrix) {
        setSelectedRoleForMatrix(fetchedRoles[0].id);
        setMatrixPermissions(fetchedRoles[0].permissionIds || []);
      }
    } catch (err) {
      console.error('Failed to load user management data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRoleForMatrix) {
      const currentRole = rolesList.find((r) => r.id === selectedRoleForMatrix);
      if (currentRole) {
        setMatrixPermissions(currentRole.permissionIds || []);
      }
    }
  }, [selectedRoleForMatrix, rolesList]);

  // Open User Modal for Create
  const handleOpenCreateUser = () => {
    setEditingUser(null);
    setUploadError('');
    setAvatarMode('upload');
    setUserForm({
      fullName: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      pinCode: '0000',
      roleId: rolesList[0]?.id || 'role-staff',
      avatarUrl: '',
      language: 'en',
      isActive: true,
    });
    setUserModalOpen(true);
  };

  // Open User Modal for Edit
  const handleOpenEditUser = (user: UserItem) => {
    setEditingUser(user);
    setUploadError('');
    setAvatarMode(user.avatarUrl && user.avatarUrl.startsWith('http') ? 'url' : 'upload');
    setUserForm({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      pinCode: user.pinCode || '0000',
      roleId: user.roleId || rolesList[0]?.id || '',
      avatarUrl: user.avatarUrl || '',
      language: user.language || 'en',
      isActive: Boolean(user.isActive),
    });
    setUserModalOpen(true);
  };

  // Handle Avatar Image File Upload via multipart API (same logic as CRM page)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (JPG, PNG, WEBP, GIF, SVG)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Avatar file size must be less than 5MB');
      return;
    }

    try {
      setUploadError('');
      setAvatarUploading(true);
      const data = new FormData();
      data.append('avatar', file);

      const res = await api.post('/users/upload-avatar', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.avatarUrl) {
        setUserForm((prev) => ({ ...prev, avatarUrl: res.data.avatarUrl }));
        soundFX.playCashSuccess();
      }
    } catch (err: any) {
      // Fallback to FileReader DataURL if multipart fails
      try {
        const reader = new FileReader();
        reader.onloadend = () => {
          setUserForm((prev) => ({ ...prev, avatarUrl: reader.result as string }));
          soundFX.playCashSuccess();
        };
        reader.readAsDataURL(file);
      } catch {
        setUploadError(err.response?.data?.message || err.message || 'Avatar upload failed');
      }
    } finally {
      setAvatarUploading(false);
    }
  };

  // Drag & Drop Handler (same as CRM)
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle Remove Avatar Image (same as CRM)
  const handleRemoveAvatar = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setUserForm((prev) => ({ ...prev, avatarUrl: '' }));
    setUploadError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Submit User Form
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...userForm,
        avatarUrl: sanitizeImageUrl(userForm.avatarUrl),
      };
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        soundFX.playCashSuccess();
        setStatusMsg(t('employeeMgr.userUpdated', 'Staff profile updated successfully'));
      } else {
        await api.post('/users', payload);
        soundFX.playCashSuccess();
        setStatusMsg(t('employeeMgr.userCreated', 'Staff member added successfully'));
      }
      setUserModalOpen(false);
      fetchData();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      soundFX.playError();
      alert(err.response?.data?.message || err.message || 'Error saving user');
    }
  };

  // Delete User
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      soundFX.playCashSuccess();
      setStatusMsg(t('employeeMgr.userDeleted', 'Staff account deleted'));
      setDeleteConfirm(null);
      fetchData();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      soundFX.playError();
      alert(err.response?.data?.message || err.message || 'Failed to delete user');
    }
  };

  // Toggle User Active Status Quick Action
  const handleToggleUserActive = async (user: UserItem) => {
    try {
      await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      soundFX.playCashSuccess();
      fetchData();
    } catch (err) {
      soundFX.playError();
    }
  };

  // Create Role Submit
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users/roles', roleForm);
      soundFX.playCashSuccess();
      setStatusMsg(t('employeeMgr.roleCreated', 'Role created successfully'));
      setRoleModalOpen(false);
      setRoleForm({ name: '', description: '', permissionIds: [] });
      fetchData();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      soundFX.playError();
      alert(err.response?.data?.message || err.message || 'Failed to create role');
    }
  };

  // Toggle Permission in Matrix
  const handleTogglePermission = (permId: string) => {
    setMatrixPermissions((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  // Grant Full Access (Select All)
  const handleSelectAllFullAccess = () => {
    const allIds = permissionsList.map((p) => p.id);
    setMatrixPermissions(allIds);
    soundFX.playCashSuccess();
  };

  // Clear All Permissions
  const handleDeselectAll = () => {
    setMatrixPermissions([]);
  };

  // Toggle All Permissions in a Module Group
  const handleToggleModuleAll = (modulePerms: PermissionItem[]) => {
    const moduleIds = modulePerms.map((p) => p.id);
    const allSelected = moduleIds.every((id) => matrixPermissions.includes(id));
    if (allSelected) {
      setMatrixPermissions((prev) => prev.filter((id) => !moduleIds.includes(id)));
    } else {
      setMatrixPermissions((prev) => Array.from(new Set([...prev, ...moduleIds])));
      soundFX.playCashSuccess();
    }
  };

  // Save Role Permission Matrix
  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForMatrix) return;
    setIsSavingMatrix(true);
    try {
      const activeRole = rolesList.find((r) => r.id === selectedRoleForMatrix);
      await api.put(`/users/roles/${selectedRoleForMatrix}`, {
        name: activeRole?.name,
        description: activeRole?.description,
        permissionIds: matrixPermissions,
      });
      soundFX.playCashSuccess();
      setStatusMsg(t('employeeMgr.roleUpdated', 'Role permissions updated successfully'));
      fetchData();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      soundFX.playError();
      alert(err.response?.data?.message || err.message || 'Failed to update permissions');
    } finally {
      setIsSavingMatrix(false);
    }
  };

  // Filter & Sort Users
  const filteredAndSortedUsers = useMemo<UserItem[]>(() => {
    const list = usersList.filter((u) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matches =
          (u.fullName || '').toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.phone || '').includes(q) ||
          (u.roleName || '').toLowerCase().includes(q);
        if (!matches) return false;
      }

      // Role Filter
      if (roleFilter !== 'ALL' && u.roleId !== roleFilter && u.roleName !== roleFilter) {
        return false;
      }

      // Status Filter
      if (statusFilter === 'ACTIVE' && !u.isActive) return false;
      if (statusFilter === 'INACTIVE' && u.isActive) return false;

      // Cashier PIN Filter
      if (pinFilter === 'HAS_PIN' && (!u.pinCode || u.pinCode === '0000')) return false;
      if (pinFilter === 'NO_PIN' && u.pinCode && u.pinCode !== '0000') return false;

      return true;
    });

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'NAME':
          comparison = (a.fullName || a.username || '').localeCompare(b.fullName || b.username || '');
          break;
        case 'ROLE':
          comparison = (a.roleName || a.roleId || '').localeCompare(b.roleName || b.roleId || '');
          break;
        case 'PIN':
          comparison = (a.pinCode || '').localeCompare(b.pinCode || '');
          break;
        case 'STATUS':
          comparison = (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
          break;
        case 'LAST_ACTIVE':
          comparison = (a.lastLoginAt || '').localeCompare(b.lastLoginAt || '');
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [usersList, searchTerm, roleFilter, statusFilter, pinFilter, sortField, sortDirection]);

  const totalItems = filteredAndSortedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);

  const paginatedUsers = useMemo<UserItem[]>(() => {
    if (pageSize >= 999999) return filteredAndSortedUsers;
    const start = (effectivePage - 1) * pageSize;
    return filteredAndSortedUsers.slice(start, start + pageSize);
  }, [filteredAndSortedUsers, effectivePage, pageSize]);

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    pinFilter !== 'ALL';

  const resetAllFilters = () => {
    setSearchTerm('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
    setPinFilter('ALL');
    setCurrentPage(1);
  };

  const handleSort = (field: UserSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Bulk Selection Handlers
  const handleToggleSelectAll = () => {
    if (selectedUserIds.size === paginatedUsers.length && paginatedUsers.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      const next = new Set<string>();
      paginatedUsers.forEach((u: UserItem) => next.add(u.id));
      setSelectedUserIds(next);
    }
  };

  const handleToggleSelectUser = (id: string) => {
    const next = new Set(selectedUserIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedUserIds(next);
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    if (selectedUserIds.size === 0) return;
    setBulkActionLoading(true);
    try {
      await Promise.all(
        Array.from(selectedUserIds).map((id) =>
          api.put(`/users/${id}`, { isActive })
        )
      );
      soundFX.playCashSuccess();
      setStatusMsg(`Updated status for ${selectedUserIds.size} staff member(s)`);
      setSelectedUserIds(new Set());
      fetchData();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err: any) {
      soundFX.playError();
      alert(err.response?.data?.message || err.message || 'Failed to update staff accounts');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Group Permissions by Module
  const groupedPermissions = permissionsList.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, PermissionItem[]>);

  const selectedRoleObj = rolesList.find((r) => r.id === selectedRoleForMatrix);

  return (
    <div className="h-full w-full flex flex-col min-h-0 space-y-3 animate-in fade-in duration-150">
      {/* Page Header (Fixed) */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl neu-sunken-sm flex items-center justify-center text-emerald-500">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-800 dark:text-white">
              {t('employeeMgr.title', 'Staff & Access Control Management')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
              {t(
                'employeeMgr.subtitle',
                'Manage employee accounts, fast cashier PIN codes, role assignments, and granular security permissions'
              )}
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setRoleForm({ name: '', description: '', permissionIds: [] });
              setRoleModalOpen(true);
            }}
            className="px-3.5 py-2 neu-btn text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-4 h-4 text-emerald-500" />
            <span>{t('employeeMgr.btnCreateRole', 'Create Custom Role')}</span>
          </button>

          <button
            onClick={handleOpenCreateUser}
            className="px-4 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 cursor-pointer shadow-neu-glow-emerald"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('employeeMgr.btnAddStaff', 'Add New Staff')}</span>
          </button>
        </div>
      </div>

      {/* Top Status Alert */}
      {statusMsg && (
        <div className="flex-shrink-0 p-3 rounded-2xl neu-card-sm text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-500" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Bento KPI Stats Cards (Fixed) */}
      <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('employeeMgr.statsTotalStaff', 'Total Registered Staff')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm text-emerald-500 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
            {usersList.length}
          </div>
          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('employeeMgr.activeAccounts', 'All system user credentials')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('employeeMgr.statsActiveCashiers', 'Active Cashier Accounts')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm text-amber-500 flex items-center justify-center">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-amber-600 dark:text-amber-400 font-mono tracking-tight">
            {usersList.filter((u) => u.isActive && u.pinCode && u.pinCode !== '0000').length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('employeeMgr.posEnabled', 'Quick PIN login configured')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('employeeMgr.statsSecurityRoles', 'Security Role Profiles')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm text-indigo-500 flex items-center justify-center">
              <Shield className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-tight">
            {rolesList.length}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('employeeMgr.definedRoles', 'Custom permission levels')}
          </div>
        </div>

        <div className="p-3.5 rounded-2xl neu-card-interactive flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              {t('employeeMgr.statsGranularRules', 'System Access Rules')}
            </span>
            <div className="w-7 h-7 rounded-xl neu-sunken-sm text-purple-500 flex items-center justify-center">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl lg:text-2xl font-black text-purple-600 dark:text-purple-400 font-mono tracking-tight">
            {t('employeeMgr.permsCount', '{{count}} Perms', { count: permissionsList.length })}
          </div>
          <div className="text-[10px] text-slate-400 font-medium pt-1 border-t border-slate-200/40 dark:border-slate-800/50">
            {t('employeeMgr.matrixAudited', 'Granular capability rules')}
          </div>
        </div>
      </div>

      {/* Main Tab Navigation (Fixed) */}
      <div className="flex-shrink-0 p-1 neu-tab-container flex items-center gap-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('STAFF')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'STAFF'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t('employeeMgr.tabStaff', 'Staff & User Accounts')}</span>
          <span className="px-1.5 py-0.2 rounded-md neu-sunken-sm font-mono font-bold text-[10px]">
            {usersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ROLES')}
          className={`px-3.5 py-1.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'ROLES'
              ? 'neu-tab-active text-emerald-600 dark:text-emerald-400 font-extrabold'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('employeeMgr.tabRoles', 'Roles & Permission Matrix')}</span>
          <span className="px-1.5 py-0.2 rounded-md neu-sunken-sm font-mono font-bold text-[10px]">
            {rolesList.length}
          </span>
        </button>
      </div>

      {/* Scrollable Work Pane for Tab Contents */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4 scrollbar-thin space-y-4">
        {/* TAB 1: STAFF DIRECTORY */}
        {activeTab === 'STAFF' && (
        <div className="space-y-4">
          {/* Multi-Facet Filter Ribbon */}
          <div className="p-4 rounded-3xl neu-card-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder={t('employeeMgr.searchPlaceholder', 'Search by name, username, phone, or role...')}
                    className="w-full pl-9 pr-3.5 py-2 neu-input text-xs font-bold text-slate-900 dark:text-white outline-none"
                  />
                </div>

                {/* Role Dropdown Filter */}
                <div className="w-44">
                  <CustomSelect
                    value={roleFilter}
                    onChange={(val) => {
                      setRoleFilter(val);
                      setCurrentPage(1);
                    }}
                    options={[
                      {
                        value: 'ALL',
                        label: t('employeeMgr.allRoles', 'All Roles'),
                        icon: <Shield className="w-3.5 h-3.5 text-emerald-500" />,
                      },
                      ...rolesList.map((r) => ({
                        value: r.id,
                        label: r.name,
                        icon: <Shield className="w-3.5 h-3.5 text-slate-400" />,
                      })),
                    ]}
                    size="sm"
                    dropdownWidth="w-52"
                  />
                </div>

                {/* Status Filter */}
                <div className="w-40">
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => {
                      setStatusFilter(val as any);
                      setCurrentPage(1);
                    }}
                    options={[
                      {
                        value: 'ALL',
                        label: t('employeeMgr.allStatuses', 'All Statuses'),
                        icon: <Users className="w-3.5 h-3.5 text-emerald-500" />,
                      },
                      {
                        value: 'ACTIVE',
                        label: t('employeeMgr.activeStaff', 'Active Staff'),
                        icon: <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20" />,
                      },
                      {
                        value: 'INACTIVE',
                        label: t('employeeMgr.suspendedStaff', 'Suspended'),
                        icon: <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/20" />,
                      },
                    ]}
                    size="sm"
                    dropdownWidth="w-48"
                  />
                </div>

                {/* PIN Code Filter */}
                <div className="w-40">
                  <CustomSelect
                    value={pinFilter}
                    onChange={(val) => {
                      setPinFilter(val as any);
                      setCurrentPage(1);
                    }}
                    options={[
                      {
                        value: 'ALL',
                        label: t('employeeMgr.allCashiers', 'All Cashiers'),
                        icon: <KeyRound className="w-3.5 h-3.5 text-emerald-500" />,
                      },
                      {
                        value: 'HAS_PIN',
                        label: t('employeeMgr.hasPin', 'Has Fast PIN'),
                        icon: <KeyRound className="w-3.5 h-3.5 text-amber-500" />,
                      },
                      {
                        value: 'NO_PIN',
                        label: t('employeeMgr.noPin', 'No Fast PIN'),
                        icon: <KeyRound className="w-3.5 h-3.5 text-slate-400" />,
                      },
                    ]}
                    size="sm"
                    dropdownWidth="w-48"
                  />
                </div>

                {/* Reset Filters */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="w-8 h-8 neu-circle-btn text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer"
                    title={t('common.reset', 'Clear all active filters')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Quick Count Badge */}
              <div className="text-xs font-bold text-slate-400">
                {t('employeeMgr.showingText', 'Showing')}{' '}
                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                  {filteredAndSortedUsers.length}
                </span>{' '}
                {t('employeeMgr.ofText', 'of')}{' '}
                <span className="font-extrabold text-slate-700 dark:text-slate-200">
                  {usersList.length}
                </span>{' '}
                {t('employeeMgr.staffCountText', 'staff')}
              </div>
            </div>
          </div>

          {/* Bulk Action Ribbon when items are selected */}
          {selectedUserIds.size > 0 && (
            <div className="p-3.5 rounded-2xl neu-sunken-sm flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                <CheckSquare className="w-4 h-4" />
                <span>
                  {t('employeeMgr.bulkSelected', '{{count}} staff member(s) selected', {
                    count: selectedUserIds.size,
                  })}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkStatusUpdate(true)}
                  className="px-3.5 py-1.5 neu-btn-primary text-white text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('employeeMgr.activateSelected', 'Activate Selected')}</span>
                </button>

                <button
                  type="button"
                  disabled={bulkActionLoading}
                  onClick={() => handleBulkStatusUpdate(false)}
                  className="px-3.5 py-1.5 neu-btn-danger text-white text-xs font-extrabold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{t('employeeMgr.suspendSelected', 'Suspend Selected')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedUserIds(new Set())}
                  className="px-3 py-1.5 neu-btn text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  {t('employeeMgr.deselectAll', 'Deselect All')}
                </button>
              </div>
            </div>
          )}

          {/* Users Table */}
          <div className="neu-card-lg rounded-3xl overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="neu-sunken-sm text-slate-400 uppercase font-black tracking-wider border-b border-slate-200/40 dark:border-slate-800/60 select-none">
                  <tr>
                    {/* Checkbox */}
                    <th className="py-3.5 pl-4 pr-2 w-10 text-center">
                      <CustomCheckbox
                        checked={
                          paginatedUsers.length > 0 &&
                          paginatedUsers.every((u) => selectedUserIds.has(u.id))
                        }
                        indeterminate={
                          selectedUserIds.size > 0 &&
                          !paginatedUsers.every((u) => selectedUserIds.has(u.id))
                        }
                        onChange={handleToggleSelectAll}
                        size="sm"
                        ariaLabel="Select all visible staff"
                      />
                    </th>

                    {/* Name */}
                    <th
                      onClick={() => handleSort('NAME')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('employeeMgr.colName', 'Staff Name & User')}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === 'NAME' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </th>

                    {/* Role */}
                    <th
                      onClick={() => handleSort('ROLE')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('employeeMgr.colRole', 'Assigned Role')}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === 'ROLE' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </th>

                    {/* PIN */}
                    <th
                      onClick={() => handleSort('PIN')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('employeeMgr.colPin', 'Cashier PIN')}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === 'PIN' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </th>

                    {/* Status */}
                    <th
                      onClick={() => handleSort('STATUS')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('employeeMgr.colStatus', 'Status')}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === 'STATUS' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </th>

                    {/* Last Login */}
                    <th
                      onClick={() => handleSort('LAST_ACTIVE')}
                      className="py-3.5 px-4 cursor-pointer hover:text-slate-800 dark:hover:text-slate-200 select-none transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>{t('employeeMgr.colLastLogin', 'Last Active')}</span>
                        <ArrowUpDown
                          className={`w-3 h-3 ${
                            sortField === 'LAST_ACTIVE' ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                          }`}
                        />
                      </div>
                    </th>

                    {/* Actions */}
                    <th className="py-3.5 px-4 text-right">{t('employeeMgr.colActions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300">
                  {paginatedUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400 font-bold">
                        {t('employeeMgr.noStaffFound', 'No staff accounts found matching your search or filters.')}
                      </td>
                    </tr>
                  ) : (
                    paginatedUsers.map((user) => {
                      const isSelected = selectedUserIds.has(user.id);
                      return (
                        <tr
                          key={user.id}
                          className={`hover:bg-slate-500/5 transition-colors group ${
                            isSelected ? 'neu-sunken-sm' : ''
                          }`}
                        >
                          {/* Selection Checkbox */}
                          <td className="py-3.5 pl-4 pr-2 text-center">
                            <CustomCheckbox
                              checked={isSelected}
                              onChange={() => handleToggleSelectUser(user.id)}
                              size="sm"
                              ariaLabel={`Select ${user.fullName || user.username}`}
                            />
                          </td>

                          {/* Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {user.avatarUrl ? (
                                <img
                                  src={user.avatarUrl}
                                  alt={user.fullName}
                                  onClick={() =>
                                    setLightboxUrl({
                                      url: user.avatarUrl!,
                                      title: user.fullName,
                                      role: user.roleName,
                                    })
                                  }
                                  className="w-9 h-9 rounded-2xl object-cover neu-sunken-sm flex-shrink-0 cursor-pointer hover:scale-105 transition-all"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-2xl neu-sunken-sm bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-black text-xs flex items-center justify-center flex-shrink-0">
                                  {user.fullName ? user.fullName.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                              )}
                              <div>
                                <div className="font-extrabold text-slate-900 dark:text-white text-xs">
                                  {user.fullName}
                                </div>
                                <div className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-2">
                                  <span>@{user.username}</span>
                                  {user.phone && (
                                    <>
                                      <span>•</span>
                                      <span>{user.phone}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold neu-pill text-indigo-600 dark:text-indigo-400">
                              <Shield className="w-3 h-3" />
                              {user.roleName || user.roleId}
                            </span>
                          </td>

                          {/* PIN Code Badge */}
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-mono neu-sunken-sm font-bold text-slate-700 dark:text-slate-300">
                              <KeyRound className="w-3 h-3 text-amber-500" />
                              <span>{user.pinCode ? `•••• (${user.pinCode})` : t('employeeMgr.noPinBadge', 'None')}</span>
                            </span>
                          </td>

                          {/* Status Switch */}
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => handleToggleUserActive(user)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                                user.isActive
                                  ? 'neu-pill text-emerald-600 dark:text-emerald-400 font-extrabold'
                                  : 'neu-pill text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.isActive ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              {user.isActive
                                ? t('employeeMgr.active', 'Active')
                                : t('employeeMgr.inactive', 'Suspended')}
                            </button>
                          </td>

                          {/* Last Login */}
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                            {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : t('employeeMgr.neverLoggedIn', 'Never logged in')}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEditUser(user)}
                                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 cursor-pointer"
                                title={t('employeeMgr.editUser', 'Edit Staff Account')}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirm({ id: user.id, username: user.username })}
                                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 cursor-pointer"
                                title={t('employeeMgr.deleteUser', 'Delete Staff Account')}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Enterprise Pagination Footer */}
            <div className="p-3.5 neu-sunken-sm rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              {/* Left: Page Size Selector */}
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-semibold">{t('employeeMgr.staffPerPage', 'Staff per page:')}</span>
                <div className="w-24">
                  <CustomSelect
                    value={String(pageSize)}
                    onChange={(val) => {
                      setPageSize(Number(val));
                      setCurrentPage(1);
                    }}
                    options={[
                      { value: '10', label: '10' },
                      { value: '25', label: '25' },
                      { value: '50', label: '50' },
                      { value: '100', label: '100' },
                      { value: '999999', label: t('employeeMgr.allWithCount', 'All ({{total}})', { total: totalItems }) },
                    ]}
                    size="sm"
                    placement="up"
                    dropdownWidth="w-28"
                  />
                </div>

                <span className="text-slate-400 font-medium">
                  {t('employeeMgr.pageOf', 'Page {{current}} of {{total}}', { current: effectivePage, total: totalPages })}
                </span>
              </div>

              {/* Right: Page Navigation Buttons */}
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={effectivePage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('common.firstPage', 'First Page')}
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={effectivePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('common.prevPage', 'Previous Page')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page Number Pills */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = idx + 1;
                  } else if (effectivePage <= 3) {
                    pageNum = idx + 1;
                  } else if (effectivePage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = effectivePage - 2 + idx;
                  }

                  const isActive = pageNum === effectivePage;
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        isActive
                          ? 'neu-btn-primary text-white'
                          : 'neu-btn text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('common.nextPage', 'Next Page')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={effectivePage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="w-8 h-8 neu-circle-btn text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title={t('common.lastPage', 'Last Page')}
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ROLES & GRANULAR PERMISSION MATRIX */}
      {activeTab === 'ROLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Role Selector Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="p-5 rounded-3xl neu-card-lg space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 dark:border-slate-800/80">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>{t('employeeMgr.selectRole', 'Select Role to Configure')}</span>
                </h3>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  {t('employeeMgr.rolesCount', '{{count}} Roles', { count: rolesList.length })}
                </span>
              </div>

              <div className="space-y-2">
                {rolesList.map((r) => {
                  const isSelected = r.id === selectedRoleForMatrix;
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoleForMatrix(r.id)}
                      className={`w-full text-left p-3.5 rounded-2xl transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'neu-card-interactive border-2 border-emerald-500/50 bg-emerald-500/5'
                          : 'neu-card-sm text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-mono font-black text-xs flex items-center gap-1.5">
                          <span className={isSelected ? 'text-emerald-600 dark:text-emerald-400 font-extrabold' : ''}>{r.name}</span>
                          {r.isSystem && (
                            <span
                              className={`px-1.5 py-0.2 rounded-md text-[9px] font-sans font-bold neu-pill`}
                            >
                              {t('employeeMgr.systemBadge', 'SYSTEM')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {r.description || t('employeeMgr.noDesc', 'No description provided')}
                        </div>
                      </div>

                      <div className="font-mono text-xs font-bold text-slate-500 whitespace-nowrap neu-pill px-2 py-0.5">
                        {t('employeeMgr.permsShort', '{{count}} perms', { count: r.permissionIds?.length || 0 })}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Granular Permission Matrix (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-6 rounded-3xl neu-card-lg space-y-6">
              {/* Header with Save & Select All Buttons */}
              <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-200/50 dark:border-slate-800/80">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-xl neu-pill text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs">
                      {selectedRoleObj?.name || 'SELECT ROLE'}
                    </span>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                      {t('employeeMgr.roleMatrixTitle', 'Granular Role & Module Permission Matrix')}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold neu-pill`}
                    >
                      {matrixPermissions.length} / {permissionsList.length} Perms
                      {matrixPermissions.length === permissionsList.length && ` ${t('employeeMgr.fullAccessBadge', '(Full Access)')}`}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">
                    {t(
                      'employeeMgr.roleMatrixSubtitle',
                      'Configure functional access permissions per role. Changes apply immediately to all assigned users.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Select All Full Access */}
                  <button
                    type="button"
                    onClick={handleSelectAllFullAccess}
                    className="px-3.5 py-2 neu-btn text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('employeeMgr.grantFullAccess', 'Grant Full Access (Select All)')}</span>
                  </button>

                  {/* Clear All */}
                  <button
                    type="button"
                    onClick={handleDeselectAll}
                    className="px-3 py-2 neu-btn text-slate-600 dark:text-slate-300 font-bold text-xs whitespace-nowrap cursor-pointer"
                  >
                    <span>{t('employeeMgr.clearAllPerms', 'Clear All')}</span>
                  </button>

                  {/* Save */}
                  <button
                    type="button"
                    onClick={handleSaveRolePermissions}
                    disabled={isSavingMatrix}
                    className="px-5 py-2 neu-btn-primary text-white font-extrabold text-xs flex items-center gap-2 whitespace-nowrap cursor-pointer"
                  >
                    <Save className={`w-3.5 h-3.5 ${isSavingMatrix ? 'animate-spin' : ''}`} />
                    <span>
                      {isSavingMatrix
                        ? t('common.saving', 'Saving...')
                        : t('employeeMgr.saveRolePerms', 'Save Role Permissions')}
                    </span>
                  </button>
                </div>
              </div>

              {/* Module Groups */}
              <div className="space-y-4">
                {Object.entries(groupedPermissions).map(([moduleName, perms]) => {
                  const moduleIds = perms.map((p) => p.id);
                  const isAllModuleSelected = moduleIds.every((id) => matrixPermissions.includes(id));
                  return (
                    <div
                      key={moduleName}
                      className="p-4 rounded-2xl neu-card-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{t('employeeMgr.moduleCapabilities', '{{module}} Module Capabilities', { module: moduleName })}</span>
                        </span>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleAll(perms)}
                            className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                          >
                            {isAllModuleSelected
                              ? t('employeeMgr.deselectAllModule', 'Deselect Module')
                              : t('employeeMgr.selectAllModule', 'Select Module All')}
                          </button>
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {t('employeeMgr.enabledOfTotal', '{{enabled}} of {{total}} Enabled', {
                              enabled: perms.filter((p) => matrixPermissions.includes(p.id)).length,
                              total: perms.length,
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {perms.map((perm) => {
                          const isGranted = matrixPermissions.includes(perm.id);
                          return (
                            <button
                              key={perm.id}
                              type="button"
                              onClick={() => handleTogglePermission(perm.id)}
                              className={`p-3 rounded-2xl text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                                isGranted
                                  ? 'neu-card-interactive border-emerald-500/40 bg-emerald-500/5 text-slate-900 dark:text-white'
                                  : 'neu-sunken-sm text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-md mt-0.5 flex items-center justify-center flex-shrink-0 transition-all ${
                                  isGranted ? 'bg-emerald-600 text-white' : 'neu-sunken'
                                }`}
                              >
                                {isGranted && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>

                              <div>
                                <div className="font-mono font-bold text-xs">{perm.code}</div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  {perm.description || 'Permission action capability'}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* MODAL: CREATE / EDIT USER */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl neu-card-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto my-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <UserPlus className="w-4 h-4" />
                </div>
                <span>
                  {editingUser
                    ? t('employeeMgr.editUser', 'Edit Staff Account')
                    : t('employeeMgr.createUser', 'Create New Staff Account')}
                </span>
              </h3>
              <button
                onClick={() => setUserModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Circular Avatar Management */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-emerald-500" />
                    <span>{t('employeeMgr.avatarPhoto', 'Staff Profile Photo')}</span>
                  </label>

                  <div className="flex items-center neu-tab-container p-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setAvatarMode('upload')}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        avatarMode === 'upload'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <Upload className="w-3 h-3" />
                      <span>{t('employeeMgr.uploadPhoto', 'Upload')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAvatarMode('url')}
                      className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        avatarMode === 'url'
                          ? 'neu-tab-active text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                      }`}
                    >
                      <LinkIcon className="w-3 h-3" />
                      <span>{t('employeeMgr.urlPhoto', 'URL')}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Circular Avatar */}
                  <div
                    onClick={() => {
                      if (userForm.avatarUrl) {
                        setLightboxUrl({
                          url: userForm.avatarUrl,
                          title: userForm.fullName || 'Staff Profile Photo Preview',
                          role: rolesList.find((r) => r.id === userForm.roleId)?.name,
                        });
                      }
                    }}
                    className={`w-20 h-20 rounded-full neu-sunken overflow-hidden flex-shrink-0 flex items-center justify-center relative group ${
                      userForm.avatarUrl ? 'cursor-pointer' : ''
                    }`}
                  >
                    {avatarUploading ? (
                      <div className="flex flex-col items-center justify-center text-emerald-500 gap-1">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-[8px] font-bold">{t('employeeMgr.uploading', 'Uploading')}</span>
                      </div>
                    ) : userForm.avatarUrl ? (
                      <>
                        <img
                          src={userForm.avatarUrl}
                          alt="Avatar Preview"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = 'none';
                          }}
                        />
                        {/* Dual Action Overlay: Preview (Eye) & Remove (Trash) */}
                        <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxUrl({
                                url: userForm.avatarUrl,
                                title: userForm.fullName || 'Staff Profile Photo Preview',
                                role: rolesList.find((r) => r.id === userForm.roleId)?.name,
                              });
                            }}
                            title={t('employeeMgr.previewFullImage', 'Preview Full Image')}
                            className="neu-circle-btn w-7 h-7 text-emerald-400 hover:text-white"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            title={t('employeeMgr.removePhoto', 'Remove Photo')}
                            className="neu-circle-btn w-7 h-7 text-rose-400 hover:text-white"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-slate-400">
                        <Users className="w-6 h-6 mx-auto opacity-40 mb-0.5" />
                        <span className="text-[8px] font-bold block">{t('employeeMgr.noPhoto', 'No Photo')}</span>
                      </div>
                    )}
                  </div>

                  {/* Dropzone or URL input */}
                  <div className="flex-1">
                    {avatarMode === 'upload' ? (
                      <div>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileUpload(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                        <div
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                          }}
                          onDragLeave={() => setIsDragging(false)}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`h-20 neu-sunken-sm rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all px-3 text-center ${
                            isDragging
                              ? 'border-2 border-emerald-500'
                              : ''
                          }`}
                        >
                          <Upload className="w-4 h-4 text-slate-400 mb-1" />
                          <span className="font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                            {avatarUploading
                              ? t('employeeMgr.processingUpload', 'Processing upload...')
                              : t('employeeMgr.dropAvatar', 'Click to browse or drop avatar')}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {t('employeeMgr.avatarLimit', 'PNG, JPG, WEBP up to 5MB')}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <input
                          type="url"
                          value={userForm.avatarUrl}
                          onChange={(e) => {
                            const clean = sanitizeImageUrl(e.target.value);
                            setUserForm({ ...userForm, avatarUrl: clean });
                          }}
                          onPaste={(e) => {
                            const pasteText = e.clipboardData.getData('text');
                            if (pasteText) {
                              e.preventDefault();
                              const clean = sanitizeImageUrl(pasteText);
                              setUserForm((prev) => ({ ...prev, avatarUrl: clean }));
                            }
                          }}
                          placeholder={t('employeeMgr.pasteLinkPlaceholder', 'Paste image link or Google Images link...')}
                          className="w-full px-3.5 py-2 neu-input text-slate-800 dark:text-white font-medium outline-none text-xs"
                        />
                        <span className="text-[10px] text-slate-400 block">
                          {t('employeeMgr.pasteLinkHelp', 'Paste direct image link (JPG, PNG, WebP) or Google Images link.')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {uploadError && (
                  <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-bold neu-pill px-3 py-1.5">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Full Name */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.fullName', 'Full Name')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.fullName}
                    onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full px-3.5 py-2 neu-input font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>

                {/* Username */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.username', 'Username')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="e.g. jdoe_pos"
                    className="w-full px-3.5 py-2 neu-input font-mono font-bold text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Email */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.email', 'Email Address')} *
                  </label>
                  <input
                    type="email"
                    required
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="john@39pos.com"
                    className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.phone', 'Phone Number')}
                  </label>
                  <input
                    type="text"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="+856 20 ..."
                    className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Role Assignment */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.role', 'Role Assignment')} *
                  </label>
                  <CustomSelect
                    value={userForm.roleId}
                    onChange={(val) => setUserForm({ ...userForm, roleId: val })}
                    options={rolesList.map((r) => ({ value: r.id, label: r.name }))}
                  />
                </div>

                {/* Cashier Quick PIN */}
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1 flex items-center justify-between">
                    <span>{t('employeeMgr.pinCode', 'Cashier Quick PIN')} *</span>
                    <span className="text-[10px] font-mono text-amber-500 font-bold">
                      {t('employeeMgr.pinDigits', '4-6 Digits')}
                    </span>
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={userForm.pinCode}
                    onChange={(e) => setUserForm({ ...userForm, pinCode: e.target.value.replace(/\D/g, '') })}
                    placeholder="1234"
                    className="w-full px-3.5 py-2 neu-input font-mono font-black text-center tracking-widest text-base text-slate-800 dark:text-white outline-none"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('employeeMgr.password', 'Password (leave blank to keep existing)')}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUser ? '••••••••' : 'Enter strong password'}
                  className="w-full px-3.5 py-2 neu-input font-mono text-slate-800 dark:text-white outline-none"
                />
              </div>

              {/* Preferences & Active Toggle */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.languagePref', 'UI Language Preference')}
                  </label>
                  <CustomSelect
                    value={userForm.language}
                    onChange={(val) => setUserForm({ ...userForm, language: val })}
                    options={[
                      { value: 'en', label: 'English (Arial Narrow)' },
                      { value: 'la', label: 'Lao (Noto Sans Lao)' },
                      { value: 'th', label: 'Thai (Noto Sans Thai)' },
                      { value: 'jp', label: 'Japanese (Noto Serif Japanese)' },
                      { value: 'zh', label: 'Chinese (Noto Serif Simplified Chinese)' },
                    ]}
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    {t('employeeMgr.colStatus', 'Status')}
                  </label>
                  <button
                    type="button"
                    onClick={() => setUserForm({ ...userForm, isActive: !userForm.isActive })}
                    className={`w-full px-3.5 py-2 rounded-2xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                      userForm.isActive
                        ? 'neu-pill text-emerald-600 dark:text-emerald-400 font-extrabold'
                        : 'neu-pill text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <span>
                      {userForm.isActive
                        ? t('employeeMgr.activeEnabled', 'Active (Enabled)')
                        : t('employeeMgr.suspendedDisabled', 'Suspended (Disabled)')}
                    </span>
                    <span className={`w-2.5 h-2.5 rounded-full ${userForm.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-200/50 dark:border-slate-800/80 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUserModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                >
                  {t('employeeMgr.saveUser', 'Save Staff Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CUSTOM ROLE */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl neu-card-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 dark:border-slate-800/80">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl neu-sunken-sm flex items-center justify-center text-emerald-500">
                  <Shield className="w-4 h-4" />
                </div>
                <span>{t('employeeMgr.createRoleModalTitle', 'Create New Custom Role')}</span>
              </h3>
              <button
                onClick={() => setRoleModalOpen(false)}
                className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('employeeMgr.roleName', 'Role Name (e.g. ASSISTANT_MANAGER)')} *
                </label>
                <input
                  type="text"
                  required
                  value={roleForm.name}
                  onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                  placeholder="e.g. SHIFT_SUPERVISOR"
                  className="w-full px-3.5 py-2 neu-input font-mono font-bold uppercase text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('employeeMgr.roleDescription', 'Role Description')}
                </label>
                <input
                  type="text"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  placeholder="Floor supervisor with cashier void approval"
                  className="w-full px-3.5 py-2 neu-input text-slate-800 dark:text-white outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/80 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleModalOpen(false)}
                  className="px-4 py-2.5 neu-btn text-slate-600 dark:text-slate-400 font-bold cursor-pointer"
                >
                  {t('common.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 neu-btn-primary text-white font-extrabold cursor-pointer"
                >
                  {t('employeeMgr.saveRole', 'Create Role')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL-SCREEN LIGHTBOX MODAL */}
      {lightboxUrl && (
        <div
          onClick={() => {
            setLightboxUrl(null);
            setZoomLevel(1);
          }}
          className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200 select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full neu-card-lg p-5 sm:p-6 rounded-3xl shadow-2xl flex flex-col gap-4 border border-slate-200/80 dark:border-slate-800/80"
          >
            {/* Lightbox Header */}
            <div className="w-full flex items-center justify-between gap-3 pb-3 border-b border-slate-200/60 dark:border-slate-800/70">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-2xl neu-sunken-sm text-emerald-500 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {lightboxUrl.title}
                  </h4>
                  {lightboxUrl.role && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase font-mono tracking-wider">
                      {lightboxUrl.role}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center neu-tab-container p-1 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title={t('common.zoomOut', 'Zoom Out')}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono font-bold px-2 text-slate-700 dark:text-slate-300 min-w-[3.2rem] text-center">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                    className="w-7 h-7 neu-circle-btn text-slate-500 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title={t('common.zoomIn', 'Zoom In')}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoomLevel(1)}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white ml-0.5 cursor-pointer"
                    title="Reset to 100%"
                  >
                    100%
                  </button>
                </div>

                <a
                  href={lightboxUrl.url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-emerald-500 flex items-center justify-center cursor-pointer transition-colors"
                  title={t('common.openNewTab', 'Open in new tab')}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setLightboxUrl(null);
                    setZoomLevel(1);
                  }}
                  className="w-8 h-8 neu-circle-btn text-slate-400 hover:text-rose-500 flex items-center justify-center cursor-pointer transition-colors"
                  title={t('common.close', 'Close')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lightbox Body (Obsidian Viewport with Avatar) */}
            <div className="w-full h-[50vh] max-h-[460px] rounded-2xl bg-slate-950/60 dark:bg-slate-950/90 border border-slate-200/50 dark:border-slate-800/80 p-6 flex items-center justify-center overflow-hidden neu-sunken relative select-none">
              <div
                className="relative transition-transform duration-200 ease-out neu-sunken rounded-full overflow-hidden w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center shadow-2xl ring-4 ring-white/10"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={lightboxUrl.url}
                  alt={lightboxUrl.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatedConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        title={t('employeeMgr.deleteUser', 'Delete Staff Account')}
        message={t('employeeMgr.confirmDeleteUser', 'Are you sure you want to delete this staff account? ({{username}}). This action cannot be undone.', { username: deleteConfirm?.username || '' })}
        confirmLabel={t('common.delete', 'Delete')}
        variant="danger"
      />
    </div>
  );
};
export default EmployeesPage;
