// src/pages/AdminUsersPage.tsx
//
// Phase 6: Admin User Management Page
// Allows ROOT_ADMIN and ADMIN to:
// - Review and Approve/Reject pending registration requests (Google and Email)
// - View approved users and update roles (VIEWER, EDITOR, ADMIN, ROOT_ADMIN)
// - Suspend/Reactivate user accounts
// - View audit logs with timestamps, actions, and actors
//

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  FileText,
  UserCheck,
  UserX,
  History,
  Lock,
} from 'lucide-react';
import { authService } from '@/services/authService';
import { useAuth } from '@/hooks/useAuth';
import { UserProfile, UserRole, ApprovalStatus, AuditLogEntry } from '@/types';

export const AdminUsersPage: React.FC = () => {
  const { profile: currentAdminProfile, isRootAdmin } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Tabs: 'pending' | 'approved' | 'rejected' | 'audit'
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'audit'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Confirmation Modal State
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
      console.error('Failed to load admin user data:', err);
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
      description: `Are you sure you want to approve ${target.full_name} (${target.email}) as an EDITOR?`,
      confirmLabel: 'Approve as Editor',
      confirmAction: async () => {
        try {
          await authService.approveUser(target.id, 'EDITOR');
          showSuccessBanner(`Approved ${target.full_name} successfully!`);
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
      description: `Reject access request for ${target.full_name} (${target.email})?`,
      confirmLabel: 'Reject Request',
      isDestructive: true,
      confirmAction: async () => {
        try {
          await authService.rejectUser(target.id);
          showSuccessBanner(`Rejected request for ${target.full_name}.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to reject user.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // 3. Update User Role
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

  // 4. Suspend or Reactivate
  const handleToggleStatus = (target: UserProfile) => {
    const nextStatus: ApprovalStatus = target.approval_status === 'SUSPENDED' ? 'APPROVED' : 'SUSPENDED';
    const isSuspending = nextStatus === 'SUSPENDED';

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? 'Suspend User Access' : 'Reactivate User Account',
      description: isSuspending
        ? `Are you sure you want to temporarily suspend ${target.full_name}? They will not be able to log in or view records.`
        : `Reactivate ${target.full_name}? Their access will be restored immediately.`,
      confirmLabel: isSuspending ? 'Suspend Account' : 'Reactivate Account',
      isDestructive: isSuspending,
      confirmAction: async () => {
        try {
          await authService.setUserStatus(target.id, nextStatus);
          showSuccessBanner(`User account ${isSuspending ? 'suspended' : 'reactivated'}.`);
          await loadData();
        } catch (e: any) {
          setErrorMessage(e.message || 'Failed to update user status.');
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Filtered lists
  const pendingUsers = useMemo(() => {
    return profiles.filter((p) => p.approval_status === 'PENDING');
  }, [profiles]);

  const approvedUsers = useMemo(() => {
    return profiles.filter((p) => p.approval_status === 'APPROVED' || p.approval_status === 'SUSPENDED');
  }, [profiles]);

  const rejectedUsers = useMemo(() => {
    return profiles.filter((p) => p.approval_status === 'REJECTED');
  }, [profiles]);

  const displayedList = useMemo(() => {
    let list: UserProfile[] = [];
    if (activeTab === 'pending') list = pendingUsers;
    else if (activeTab === 'approved') list = approvedUsers;
    else if (activeTab === 'rejected') list = rejectedUsers;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (p) =>
        p.full_name?.toLowerCase().includes(q) ||
        p.email?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q)
    );
  }, [activeTab, pendingUsers, approvedUsers, rejectedUsers, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Page Header */}
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
              User Management & Access Control
            </h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
            Authorize registered users, assign role permissions, and inspect security audit logs.
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

      {/* Navigation Tabs */}
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
            <span>Pending Requests</span>
            {pendingUsers.length > 0 && (
              <span
                style={{
                  background: '#F59E0B',
                  color: '#FFFFFF',
                  borderRadius: '10px',
                  padding: '1px 6px',
                  fontSize: '11px',
                  fontWeight: 900,
                }}
              >
                {pendingUsers.length}
              </span>
            )}
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
            <span>Approved Users ({approvedUsers.length})</span>
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

        {/* Search Bar for users */}
        {activeTab !== 'audit' && (
          <div style={{ position: 'relative', width: '220px' }}>
            <input
              type="text"
              placeholder="Search user or email..."
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

      {/* Tab 1, 2, 3: User Cards / Table */}
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
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>User / Email</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Method</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Role</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Status</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900 }}>Registered</th>
                    <th style={{ padding: '12px 16px', fontWeight: 900, textAlign: 'right' }}>Actions</th>
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
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{usr.full_name || 'Anonymous User'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{usr.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>
                        {usr.registration_method === 'google' ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#4285F4', fontWeight: 700 }}>G</span> Google
                          </span>
                        ) : (
                          'Email'
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {activeTab === 'approved' ? (
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
                      <td style={{ padding: '12px 16px' }}>
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
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        {new Date(usr.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {activeTab === 'pending' && (
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

                        {activeTab === 'approved' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              type="button"
                              disabled={usr.role === 'ROOT_ADMIN' && !isRootAdmin}
                              onClick={() => handleToggleStatus(usr)}
                              className="btn btn-outline btn-sm"
                              style={{ height: '32px', fontSize: '12px' }}
                            >
                              {usr.approval_status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                            </button>
                          </div>
                        )}

                        {activeTab === 'rejected' && (
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

      {/* Tab 4: Audit Logs */}
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

      {/* Confirmation Modal */}
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
