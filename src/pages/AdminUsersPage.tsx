// src/pages/AdminUsersPage.tsx
//
// Phase 4: Administrator Approval System & User Management Table
// Displayed inside Settings (and direct /admin/users route for Admin & Root Admin).
//
// Table Columns:
// - Full Name
// - Email
// - Mobile Number
// - Registration Date
// - Authentication Method (Email or Google)
// - Account Status (Pending, Approved, Rejected, Suspended)
// - Assigned Role (VIEWER, EDITOR, ADMIN, ROOT_ADMIN)
// - Actions (Approve, Reject, Suspend, Reactivate, Change Role)
// Includes confirmation modal before rejecting or suspending an account.
//

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  Search,
  RefreshCw,
  AlertCircle,
  UserCheck,
  UserX,
  History,
  Phone,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, UserRole, ApprovalStatus, AuditLogEntry } from '@/types';

export const AdminUsersPage: React.FC = () => {
  const { isRootAdmin } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Tabs: 'pending' | 'approved' | 'rejected' | 'suspended' | 'audit'
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'suspended' | 'audit'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Dialog State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmAction: () => Promise<void>;
    confirmLabel: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmAction: async () => {},
    confirmLabel: '',
  });

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [userList, logs] = await Promise.all([
        authService.getAllProfiles(),
        authService.getAuditLogs(),
      ]);
      setProfiles(userList);
      setAuditLogs(logs);
    } catch (err: any) {
      console.error('Failed to load user management data:', err);
      setErrorMessage(err.message || 'Could not load user profiles from database.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showSuccessBanner = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3500);
  };

  // 1. Approve User Action
  const handleApprove = (target: UserProfile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Approve User Registration',
      description: `Approve registration for ${target.full_name} (${target.email}) and grant application access?`,
      confirmLabel: 'Approve Account',
      confirmAction: async () => {
        try {
          await authService.approveUser(target.id, 'EDITOR');
          showSuccessBanner(`Approved ${target.full_name} successfully! Access granted.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to approve user.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 2. Reject User Action
  const handleReject = (target: UserProfile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reject Registration Request',
      description: `Are you sure you want to reject the registration request from ${target.full_name} (${target.email})? They will be unable to access PW Materials.`,
      confirmLabel: 'Reject Registration',
      isDestructive: true,
      confirmAction: async () => {
        try {
          await authService.rejectUser(target.id);
          showSuccessBanner(`Rejected registration for ${target.full_name}.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to reject user.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 3. Suspend Account Action
  const handleSuspend = (target: UserProfile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Suspend User Account',
      description: `Suspend ${target.full_name} (${target.email})? Their active sessions will be terminated and they will not be able to log in.`,
      confirmLabel: 'Suspend Account',
      isDestructive: true,
      confirmAction: async () => {
        try {
          await authService.setUserStatus(target.id, 'SUSPENDED');
          showSuccessBanner(`User account for ${target.full_name} has been suspended.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to suspend user.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 4. Reactivate Account Action
  const handleReactivate = (target: UserProfile) => {
    setConfirmModal({
      isOpen: true,
      title: 'Reactivate User Account',
      description: `Reactivate account for ${target.full_name} (${target.email})? They will regain application access.`,
      confirmLabel: 'Reactivate Account',
      confirmAction: async () => {
        try {
          await authService.setUserStatus(target.id, 'APPROVED');
          showSuccessBanner(`User account for ${target.full_name} has been reactivated.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to reactivate user.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 5. Update User Role
  const handleRoleChange = (target: UserProfile, newRole: UserRole) => {
    if (newRole === 'ROOT_ADMIN' && !isRootAdmin) {
      setErrorMessage('Only ROOT_ADMIN can assign the ROOT_ADMIN role.');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Change User Role',
      description: `Change role for ${target.full_name} to ${newRole}?`,
      confirmLabel: 'Update Role',
      confirmAction: async () => {
        try {
          await authService.updateUserRole(target.id, newRole);
          showSuccessBanner(`Updated ${target.full_name}'s role to ${newRole}.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to change role.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Category counts
  const pendingUsers = useMemo(() => profiles.filter((p) => p.approval_status === 'PENDING'), [profiles]);
  const approvedUsers = useMemo(() => profiles.filter((p) => p.approval_status === 'APPROVED'), [profiles]);
  const rejectedUsers = useMemo(() => profiles.filter((p) => p.approval_status === 'REJECTED'), [profiles]);
  const suspendedUsers = useMemo(() => profiles.filter((p) => p.approval_status === 'SUSPENDED'), [profiles]);

  const displayedList = useMemo(() => {
    let list: UserProfile[] = [];
    if (activeTab === 'pending') list = pendingUsers;
    else if (activeTab === 'approved') list = approvedUsers;
    else if (activeTab === 'rejected') list = rejectedUsers;
    else if (activeTab === 'suspended') list = suspendedUsers;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.mobile_number?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q)
    );
  }, [activeTab, pendingUsers, approvedUsers, rejectedUsers, suspendedUsers, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={22} color="var(--text-primary)" strokeWidth={2.5} />
            <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', margin: 0 }}>
              User Management & Account Approvals
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Authorize registered accounts, assign role permissions, and view audit records.
          </p>
        </div>

        <button
          type="button"
          onClick={loadData}
          disabled={isLoading}
          className="btn btn-secondary btn-sm"
          style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Accounts Notification Alert */}
      {pendingUsers.length > 0 && (
        <div
          style={{
            background: '#FEF3C7',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-hard-xs)',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#D97706" strokeWidth={2.5} />
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {pendingUsers.length} registration {pendingUsers.length === 1 ? 'request is' : 'requests are'} awaiting administrator review.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className="btn btn-primary btn-sm"
            style={{ height: '30px', fontSize: '12px', padding: '0 10px' }}
          >
            Review Requests
          </button>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div
          style={{
            background: 'var(--color-success)',
            border: '2px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-hard-xs)',
          }}
        >
          <CheckCircle2 size={16} strokeWidth={2.5} />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div
          style={{
            background: '#FEE2E2',
            border: '2px solid #EF4444',
            borderRadius: 'var(--radius-md)',
            padding: '10px 16px',
            color: '#991B1B',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Navigation Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'pending' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeTab === 'pending' ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'pending' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Clock size={15} />
            <span>Pending ({pendingUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('approved')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'approved' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeTab === 'approved' ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'approved' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserCheck size={15} />
            <span>Approved ({approvedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rejected')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'rejected' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeTab === 'rejected' ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'rejected' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <UserX size={15} />
            <span>Rejected ({rejectedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('suspended')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'suspended' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeTab === 'suspended' ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'suspended' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <AlertTriangle size={15} />
            <span>Suspended ({suspendedUsers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              border: activeTab === 'audit' ? '2px solid var(--color-border)' : '2px solid transparent',
              background: activeTab === 'audit' ? 'var(--color-primary-selected)' : 'var(--bg-surface)',
              boxShadow: activeTab === 'audit' ? 'var(--shadow-hard-xs)' : 'none',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History size={15} />
            <span>Audit Logs ({auditLogs.length})</span>
          </button>
        </div>

        {/* Search */}
        {activeTab !== 'audit' && (
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Search by name, email, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                height: '36px',
                padding: '0 10px 0 32px',
                borderRadius: 'var(--radius-md)',
                border: '2px solid var(--color-border)',
                fontSize: '13px',
                background: '#FFFFFF',
                boxSizing: 'border-box',
              }}
            />
            <Search size={14} color="var(--text-secondary)" style={{ position: 'absolute', left: '10px', top: '11px' }} />
          </div>
        )}
      </div>

      {/* User Management Table */}
      {activeTab !== 'audit' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {displayedList.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
              No {activeTab} user accounts found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '2.5px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Full Name</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Email Address</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Mobile Number</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Registration Date</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Authentication Method</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Account Status</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900 }}>Assigned Role</th>
                    <th style={{ padding: '12px 14px', fontWeight: 900, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedList.map((usr) => (
                    <tr
                      key={usr.id}
                      style={{
                        borderBottom: '1px solid #E5E7EB',
                        backgroundColor: usr.approval_status === 'SUSPENDED' ? '#FEF2F2' : 'transparent',
                      }}
                    >
                      {/* 1. Full Name */}
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {usr.full_name || 'Anonymous User'}
                      </td>

                      {/* 2. Email */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-primary)' }}>
                        {usr.email}
                      </td>

                      {/* 3. Mobile Number */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                        {usr.mobile_number || '—'}
                      </td>

                      {/* 4. Registration Date */}
                      <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(usr.created_at).toLocaleDateString()}
                      </td>

                      {/* 5. Authentication Method */}
                      <td style={{ padding: '12px 14px', textTransform: 'capitalize' }}>
                        {usr.auth_provider === 'google' || usr.registration_method === 'google' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#4285F4', fontWeight: 800 }}>G</span> Google
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Mail size={12} color="var(--text-secondary)" /> Email / Password
                          </span>
                        )}
                      </td>

                      {/* 6. Account Status */}
                      <td style={{ padding: '12px 14px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            fontSize: '11px',
                            fontWeight: 800,
                            border: '1.5px solid var(--color-border)',
                            background:
                              usr.approval_status === 'APPROVED'
                                ? 'var(--color-success)'
                                : usr.approval_status === 'PENDING'
                                ? '#FEF3C7'
                                : '#FEE2E2',
                          }}
                        >
                          {usr.approval_status}
                        </span>
                      </td>

                      {/* 7. Assigned Role */}
                      <td style={{ padding: '12px 14px' }}>
                        {usr.approval_status === 'APPROVED' ? (
                          <select
                            value={usr.role}
                            disabled={usr.role === 'ROOT_ADMIN' && !isRootAdmin}
                            onChange={(e) => handleRoleChange(usr, e.target.value as UserRole)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1.5px solid var(--color-border)',
                              fontSize: '12px',
                              fontWeight: 700,
                              background: '#FFFFFF',
                            }}
                          >
                            <option value="VIEWER">VIEWER</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="ADMIN">ADMIN</option>
                            {isRootAdmin && <option value="ROOT_ADMIN">ROOT_ADMIN</option>}
                          </select>
                        ) : (
                          <span style={{ fontWeight: 700 }}>{usr.role}</span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {usr.approval_status === 'PENDING' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleApprove(usr)}
                              className="btn btn-primary btn-sm"
                              style={{ height: '32px', fontSize: '12px', padding: '0 10px' }}
                            >
                              <UserCheck size={14} /> Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(usr)}
                              className="btn btn-secondary btn-sm"
                              style={{ height: '32px', fontSize: '12px', padding: '0 10px', color: '#DC2626' }}
                            >
                              <UserX size={14} /> Reject
                            </button>
                          </div>
                        )}

                        {usr.approval_status === 'APPROVED' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              disabled={usr.role === 'ROOT_ADMIN' && !isRootAdmin}
                              onClick={() => handleSuspend(usr)}
                              className="btn btn-outline btn-sm"
                              style={{ height: '32px', fontSize: '12px', color: '#DC2626', borderColor: '#DC2626' }}
                            >
                              Suspend
                            </button>
                          </div>
                        )}

                        {usr.approval_status === 'SUSPENDED' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleReactivate(usr)}
                              className="btn btn-primary btn-sm"
                              style={{ height: '32px', fontSize: '12px' }}
                            >
                              Reactivate
                            </button>
                          </div>
                        )}

                        {usr.approval_status === 'REJECTED' && (
                          <button
                            type="button"
                            onClick={() => handleApprove(usr)}
                            className="btn btn-secondary btn-sm"
                            style={{ height: '32px', fontSize: '12px' }}
                          >
                            Re-Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          {auditLogs.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No audit log entries recorded yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-card)', borderBottom: '2.5px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Timestamp</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Action</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Actor</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Target</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            background: '#F3F4F6',
                            border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '1px 6px',
                            fontWeight: 800,
                            fontSize: '11px',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700 }}>
                        {log.actor_email || 'System'}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {log.target_type}: {log.target_id?.slice(0, 8)}...
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {log.details ? JSON.stringify(log.details) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(20, 24, 28, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              background: '#FFFFFF',
              boxShadow: 'var(--shadow-hard-lg)',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 900, margin: '0 0 10px 0', fontFamily: 'var(--font-serif)' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {confirmModal.description}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="btn btn-secondary"
                style={{ height: '38px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.confirmAction}
                className={`btn ${confirmModal.isDestructive ? 'btn-outline' : 'btn-primary'}`}
                style={{
                  height: '38px',
                  fontSize: '13px',
                  borderColor: confirmModal.isDestructive ? '#DC2626' : undefined,
                  color: confirmModal.isDestructive ? '#DC2626' : undefined,
                }}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
