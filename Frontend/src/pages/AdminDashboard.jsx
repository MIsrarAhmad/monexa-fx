// src/pages/AdminDashboard.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck,
  Users,
  Power,
  Check,
  X,
  ArrowUpRight,
  Vault,
  Wallet,
  User,
  Key,
  Save,
  CheckCircle,
  Search,
  Filter,
  UserCheck,
  XCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  DollarSign,
  Clock,
  Trash2,
  Copy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axiosInstance';
import { useAuthStore } from '../store/useAuthStore';
import { useSystemStore } from '../store/useSystemStore';

import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import StatCard from '../components/common/StatCard';
import Toast from '../components/common/Toast';
import { PASSWORD_MIN_LENGTH, PASSWORD_PATTERN, PASSWORD_REQUIREMENTS } from '../utils/passwordPolicy';

const AdminDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const { isMaintenanceMode, toggleMaintenanceMode } = useSystemStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'kyc', 'deposits', 'withdrawals', 'users', 'profile'
  const [toastMsg, setToastMsg] = useState('');
  const [processingId, setProcessingId] = useState(null);

  // KYC Review States
  const [selectedKycUser, setSelectedKycUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  // User Directory Search & Filter States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('ALL');
  const [selectedDeleteUser, setSelectedDeleteUser] = useState(null);
  const [deleteConfirmationEmail, setDeleteConfirmationEmail] = useState('');

  // Admin Profile Form States
  const [adminName, setAdminName] = useState(user?.name || '');
  const [adminEmail, setAdminEmail] = useState(user?.email || '');
  const [savingAdminProfile, setSavingAdminProfile] = useState(false);

  // Admin Password Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // 1. Fetch system metrics
  const { data: statsData, isLoading: loadingStats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/stats');
      return res.data.data;
    },
  });

  const {
    data: adminReferralCode,
    isLoading: loadingAdminReferralCode,
    isError: adminReferralCodeError,
  } = useQuery({
    queryKey: ['adminReferralCode'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/referral-code');
      return res.data.data.referralCode;
    },
  });

  // 2. Fetch pending withdrawals
  const { data: pendingWithdrawals, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ['pendingWithdrawals'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/withdrawals/pending');
      return res.data.data;
    },
  });

  // 3. Fetch pending deposits
  const { data: pendingDeposits, isLoading: loadingDeposits } = useQuery({
    queryKey: ['pendingDeposits'],
    queryFn: async () => {
      const res = await axiosInstance.get('/admin/deposits/pending');
      return res.data.data;
    },
  });

  // 4. Fetch pending KYC submissions
  const { data: pendingKycs, isLoading: loadingKycs } = useQuery({
    queryKey: ['adminPendingKycs'],
    queryFn: async () => {
      const res = await axiosInstance.get('/kyc/admin/pending');
      return res.data.data;
    },
  });

  // Withdrawal Action Mutation
  const withdrawalActionMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      setProcessingId(id);
      const res = await axiosInstance.put(`/admin/withdrawals/${id}/action`, { action });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingWithdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      showToast(data.message);
      setProcessingId(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to process withdrawal action');
      setProcessingId(null);
    },
  });

  // Deposit Action Mutation
  const depositActionMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      setProcessingId(id);
      const res = await axiosInstance.put(`/admin/deposits/${id}/action`, { action });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingDeposits'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      showToast(data.message);
      setProcessingId(null);
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to process deposit action');
      setProcessingId(null);
    },
  });

  // KYC Review Mutation
  const kycReviewMutation = useMutation({
    mutationFn: async ({ userId, action, reason }) => {
      const res = await axiosInstance.put(`/kyc/admin/${userId}/review`, {
        action,
        rejectionReason: reason,
      });
      return res.data;
    },
    onSuccess: (data) => {
      showToast(data.message || 'KYC decision recorded!');
      queryClient.invalidateQueries({ queryKey: ['adminPendingKycs'] });
      setRejectModalOpen(false);
      setSelectedKycUser(null);
      setRejectionReason('');
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to record KYC decision');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async ({ userId, confirmEmail }) => {
      const res = await axiosInstance.delete(`/admin/users/${userId}`, { data: { confirmEmail } });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      queryClient.invalidateQueries({ queryKey: ['pendingDeposits'] });
      queryClient.invalidateQueries({ queryKey: ['pendingWithdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['adminPendingKycs'] });
      showToast(data.message || 'User account and linked data permanently deleted.');
      setSelectedDeleteUser(null);
      setDeleteConfirmationEmail('');
    },
    onError: (err) => {
      showToast(err.response?.data?.error || 'Failed to permanently delete the user.');
    },
  });

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const handleCopyAdminReferralCode = async () => {
    if (!adminReferralCode) return;
    try {
      await navigator.clipboard.writeText(adminReferralCode);
      showToast('Admin referral code copied!');
    } catch {
      showToast('Could not copy the admin referral code.');
    }
  };

  const handleLogout = () => {
    if (logout) logout();
    navigate('/login');
  };

  const handleUpdateAdminProfile = async (e) => {
    e.preventDefault();
    setSavingAdminProfile(true);
    try {
      const res = await axiosInstance.put('/user/profile', { name: adminName, email: adminEmail });
      if (updateUser && res.data?.data) {
        updateUser(res.data.data);
      }
      showToast('Admin profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update admin profile');
    } finally {
      setSavingAdminProfile(false);
    }
  };

  const handleChangeAdminPassword = async (e) => {
    e.preventDefault();
    setChangingPassword(true);
    try {
      await axiosInstance.put('/user/change-password', {
        currentPassword,
        newPassword,
      });
      showToast('Admin password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change admin password');
    } finally {
      setChangingPassword(false);
    }
  };

  const metrics = statsData?.metrics;
  const userList = statsData?.userInvestmentDetails || [];

  const filteredUsers = userList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        isMobileSidebarOpen={sidebarOpen}
        onMobileSidebarToggle={() => setSidebarOpen((open) => !open)}
        onOpenNotifications={() => showToast('No new notifications')}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingWithdrawalsCount={metrics?.pendingWithdrawalsCount || 0}
          pendingKycCount={pendingKycs?.length || 0}
          pendingDepositsCount={metrics?.pendingDepositsCount || pendingDeposits?.length || 0}
        />

        <main className="flex-1 min-w-0">
          {/* Header Banner */}
          <div className="relative overflow-hidden rounded-2xl neon-card p-6 mb-6 border border-purple-500/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-400">System Administration</span>
                  <span className="bg-purple-900/50 text-purple-300 text-[10px] px-2 py-0.5 rounded-full border border-purple-700">Executive Control</span>
                </div>
                <h1 className="text-2xl md:text-3xl font-extrabold text-white flex items-center gap-2">
                  <ShieldCheck className="w-7 h-7 text-purple-400" /> Executive Control Center
                </h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">
                  Monexafx Exchange live liquidity metrics, user directory, KYC queue, deposit audit, and cashout authorization.
                </p>
              </div>

              <button
                onClick={() => toggleMaintenanceMode()}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                  isMaintenanceMode
                    ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isMaintenanceMode ? 'Maintenance Mode: ON' : 'Toggle Maintenance'}</span>
              </button>
            </div>
          </div>

          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Registered Users"
                  value={loadingStats ? '...' : (metrics?.totalUsers || 0).toString()}
                  unit="Users"
                  icon={Users}
                  subText="Registered Clients"
                  badgeText="Total"
                />
                <StatCard
                  title="System Liquidity"
                  value={`$${loadingStats ? '...' : (metrics?.totalLiquidity?.toFixed(2) || '0.00')}`}
                  unit="USDT"
                  icon={Vault}
                  subText="Invested Main Capital"
                  badgeText="Invested"
                  accentColor="cyan"
                />
                <StatCard
                  title="Total Withdrawable"
                  value={`$${loadingStats ? '...' : (metrics?.totalWithdrawableBalance?.toFixed(2) || '0.00')}`}
                  unit="USDT"
                  icon={Wallet}
                  subText="System Total Assets"
                  badgeText="Withdrawable"
                  accentColor="emerald"
                />
                <StatCard
                  title="20% Platform Revenue"
                  value={`$${loadingStats ? '...' : (metrics?.totalPlatformFeesCollected?.toFixed(2) || '0.00')}`}
                  unit="USDT"
                  icon={ArrowUpRight}
                  subText="Fee Collections"
                  badgeText="Revenue"
                  highlight
                />
              </div>

              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4">User Investment Segmentation</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-emerald-900/40">
                    <span className="text-xs text-slate-400">Fully Qualified (&ge; $300)</span>
                    <div className="text-xl font-extrabold text-emerald-400 mt-1">
                      {metrics?.segmentation?.fullyInvestedCount || 0} Users
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-amber-900/40">
                    <span className="text-xs text-slate-400">Partially Invested (&lt; $300)</span>
                    <div className="text-xl font-extrabold text-amber-400 mt-1">
                      {metrics?.segmentation?.partiallyInvestedCount || 0} Users
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-4 rounded-xl border border-rose-900/40">
                    <span className="text-xs text-slate-400">Uninvested ($0)</span>
                    <div className="text-xl font-extrabold text-rose-400 mt-1">
                      {metrics?.segmentation?.zeroInvestedCount || 0} Users
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: KYC AUDIT QUEUE */}
          {activeTab === 'kyc' && (
            <div className="neon-card p-6 rounded-2xl border border-slate-800">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-cyan-400" /> Pending KYC Verification Queue
              </h3>

              {loadingKycs ? (
                <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                  <span>Loading pending verification submissions...</span>
                </div>
              ) : !pendingKycs || pendingKycs.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No pending KYC submissions in the queue.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingKycs.map((u) => (
                    <div key={u._id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-3">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="font-bold text-white text-sm block">{u.name}</span>
                          <span className="text-slate-400">{u.email}</span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="text-cyan-400 font-bold block">{u.kycDetails?.documentType}</span>
                          <span className="text-slate-500 text-[11px]">ID: {u.kycDetails?.documentNumber}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1 font-semibold">ID Front:</span>
                          <a href={u.kycDetails?.idFrontUrl} target="_blank" rel="noopener noreferrer" className="relative block group">
                            <img
                              src={u.kycDetails?.idFrontUrl}
                              alt="ID Front"
                              className="h-28 w-full object-cover rounded-lg border border-slate-700 group-hover:border-cyan-400 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 rounded-lg transition">
                              <ExternalLink className="w-3.5 h-3.5" /> Full View
                            </div>
                          </a>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1 font-semibold">ID Back:</span>
                          <a href={u.kycDetails?.idBackUrl} target="_blank" rel="noopener noreferrer" className="relative block group">
                            <img
                              src={u.kycDetails?.idBackUrl}
                              alt="ID Back"
                              className="h-28 w-full object-cover rounded-lg border border-slate-700 group-hover:border-cyan-400 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 rounded-lg transition">
                              <ExternalLink className="w-3.5 h-3.5" /> Full View
                            </div>
                          </a>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-400 block mb-1 font-semibold">Live Selfie:</span>
                          <a href={u.kycDetails?.selfieUrl} target="_blank" rel="noopener noreferrer" className="relative block group">
                            <img
                              src={u.kycDetails?.selfieUrl}
                              alt="Live Selfie"
                              className="h-28 w-full object-cover rounded-lg border border-slate-700 group-hover:border-cyan-400 transition"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold gap-1 rounded-lg transition">
                              <ExternalLink className="w-3.5 h-3.5" /> Full View
                            </div>
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          onClick={() => {
                            setSelectedKycUser(u);
                            setRejectModalOpen(true);
                          }}
                          disabled={kycReviewMutation.isLoading}
                          className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold flex items-center gap-1.5 transition text-xs"
                        >
                          <XCircle className="w-4 h-4" /> Reject
                        </button>

                        <button
                          onClick={() => kycReviewMutation.mutate({ userId: u._id, action: 'APPROVE' })}
                          disabled={kycReviewMutation.isLoading}
                          className="px-4 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 font-bold flex items-center gap-1.5 transition text-xs"
                        >
                          <CheckCircle className="w-4 h-4" /> Approve Client
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3 & 4: COMBINED DEPOSIT & CASHOUT QUEUE */}
          {(activeTab === 'deposits' || activeTab === 'withdrawals') && (
            <div className="space-y-4">
              {/* Top Sub-tab Toggle Bar */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl w-fit text-xs">
                <button
                  onClick={() => setActiveTab('deposits')}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${
                    activeTab === 'deposits'
                      ? 'bg-emerald-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Pending Deposit Proofs</span>
                  {pendingDeposits?.length > 0 && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full text-[10px]">
                      {pendingDeposits.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('withdrawals')}
                  className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition ${
                    activeTab === 'withdrawals'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>Pending Cashout Requests</span>
                  {pendingWithdrawals?.length > 0 && (
                    <span className="bg-amber-950 text-amber-300 border border-amber-700 px-2 py-0.5 rounded-full text-[10px]">
                      {pendingWithdrawals.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Sub-tab Content: Deposits */}
              {activeTab === 'deposits' && (
                <div className="neon-card p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" /> Pending Deposit Proofs Queue
                  </h3>

                  {loadingDeposits ? (
                    <div className="py-12 text-center text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                      <span>Loading pending deposit submissions...</span>
                    </div>
                  ) : !pendingDeposits || pendingDeposits.length === 0 ? (
                    <div className="py-12 text-center text-slate-500 text-xs">
                      No pending deposit proofs in the queue.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingDeposits.map((d) => {
                        const isProcessingThis = processingId === d._id || depositActionMutation.isPending;
                        return (
                          <div key={d._id} className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-800 pb-3">
                              <div>
                                <span className="font-bold text-white text-sm block">{d.user?.name}</span>
                                <span className="text-slate-400">{d.user?.email}</span>
                              </div>
                              <div className="text-left sm:text-right">
                                <span className="text-emerald-400 font-bold text-sm block">${d.amount} USDT</span>
                                <span className="text-slate-400 text-[11px]">Via {d.paymentMethod || 'USDT'}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div>
                                  <span className="text-slate-400 block font-semibold">Transaction Hash / Order ID:</span>
                                  <span className="font-mono text-cyan-400 text-[11px] break-all bg-slate-950 p-2 rounded-lg border border-slate-800 block mt-1">
                                    {d.txHash}
                                  </span>
                                </div>
                                <div className="text-slate-400 text-[11px]">
                                  Submitted: {new Date(d.createdAt).toLocaleString()}
                                </div>
                              </div>

                              {/* Cloudinary Screenshot Proof */}
                              <div>
                                <span className="text-slate-400 block font-semibold mb-1">Transfer Proof Screenshot:</span>
                                {d.paymentProofUrl ? (
                                  <a
                                    href={d.paymentProofUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative block group"
                                  >
                                    <img
                                      src={d.paymentProofUrl}
                                      alt="Payment Proof"
                                      className="h-32 w-full object-cover rounded-lg border border-slate-700 group-hover:border-emerald-400 transition"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-1 rounded-lg transition">
                                      <ExternalLink className="w-4 h-4" /> View Full Proof
                                    </div>
                                  </a>
                                ) : (
                                  <div className="h-32 w-full rounded-lg border border-slate-800 bg-slate-950 flex items-center justify-center text-slate-500 text-[11px]">
                                    No screenshot proof uploaded
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                              <button
                                disabled={isProcessingThis}
                                onClick={() => depositActionMutation.mutate({ id: d._id, action: 'REJECT' })}
                                className="px-4 py-2 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold flex items-center gap-1.5 transition text-xs disabled:opacity-40"
                              >
                                <X className="w-4 h-4" /> Reject Deposit
                              </button>

                              <button
                                disabled={isProcessingThis}
                                onClick={() => depositActionMutation.mutate({ id: d._id, action: 'APPROVE' })}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 transition text-xs disabled:opacity-40 shadow-lg shadow-emerald-950/50"
                              >
                                <Check className="w-4 h-4" /> Approve & Credit ${d.amount} USDT
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab Content: Cashouts */}
              {activeTab === 'withdrawals' && (
                <div className="neon-card p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" /> Pending Cashout Requests Queue
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-3 px-3">Investor Email</th>
                          <th className="py-3 px-3">Gross Requested</th>
                          <th className="py-3 px-3">Net Payout (20% Fee)</th>
                          <th className="py-3 px-3">Withdrawal Destination</th>
                          <th className="py-3 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {loadingWithdrawals ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">Loading pending requests...</td>
                          </tr>
                        ) : pendingWithdrawals?.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center text-slate-500">No pending withdrawal requests.</td>
                          </tr>
                        ) : (
                          pendingWithdrawals?.map((w) => {
                            const isProcessingThis = processingId === w._id || withdrawalActionMutation.isPending;
                            const legacyDestination = w.description?.match(/Cashout request to (.+?) \(Net Payout:/)?.[1];
                            return (
                              <tr key={w._id}>
                                <td className="py-3 px-3 font-semibold text-white">{w.user?.email}</td>
                                <td className="py-3 px-3 font-bold text-slate-300">${w.amount} USDT</td>
                                <td className="py-3 px-3 font-bold text-emerald-400">${w.netAmount} USDT</td>
                                <td className="py-3 px-3 font-mono text-cyan-400 break-all">{w.receiverAddress || legacyDestination || 'Address unavailable'}</td>
                                <td className="py-3 px-3 text-right space-x-2">
                                  <button
                                    disabled={isProcessingThis}
                                    onClick={() => withdrawalActionMutation.mutate({ id: w._id, action: 'APPROVE' })}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition inline-flex items-center gap-1"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>{isProcessingThis ? 'Processing...' : `Pay Net $${w.netAmount}`}</span>
                                  </button>
                                  <button
                                    disabled={isProcessingThis}
                                    onClick={() => withdrawalActionMutation.mutate({ id: w._id, action: 'REJECT' })}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold transition inline-flex items-center gap-1"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>{isProcessingThis ? 'Processing...' : 'Reject'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: USER DIRECTORY */}
          {activeTab === 'users' && (
            <div className="neon-card p-6 rounded-2xl border border-slate-800">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> User Directory & Threshold Status
                </h3>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search name or email..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
                    <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {[
                      { label: 'All Users', key: 'ALL' },
                      { label: 'Qualified', key: 'ACTIVE_QUALIFIED' },
                      { label: '< $300', key: 'BELOW_THRESHOLD' },
                      { label: '$0 Balance', key: 'UNINVESTED' },
                    ].map((st) => (
                      <button
                        key={st.key}
                        onClick={() => setUserStatusFilter(st.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition ${
                          userStatusFilter === st.key
                            ? 'bg-purple-600 text-white shadow-md'
                            : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-3 px-3">Name & Email</th>
                      <th className="py-3 px-3">Invested Capital</th>
                      <th className="py-3 px-3">Total Withdrawable</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Deficit Below $300</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {loadingStats ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          Loading user directory...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-slate-500">
                          No users matched your search or filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.userId} className="hover:bg-slate-900/40">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white">{u.name}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="py-3 px-3 font-bold text-cyan-400">${u.mainBalance.toFixed(2)} USDT</td>
                          <td className="py-3 px-3 font-bold text-emerald-400">${u.totalWithdrawable.toFixed(2)} USDT</td>
                          <td className="py-3 px-3">
                            {u.status === 'ACTIVE_QUALIFIED' && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Qualified (&ge; $300)
                              </span>
                            )}
                            {u.status === 'BELOW_THRESHOLD' && (
                              <span className="bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Below Threshold
                              </span>
                            )}
                            {u.status === 'UNINVESTED' && (
                              <span className="bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                                Uninvested ($0)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-bold text-slate-300">
                            {u.remainingToMinThreshold > 0 ? (
                              <span className="text-amber-400">Needs ${u.remainingToMinThreshold.toFixed(2)} USDT</span>
                            ) : (
                              <span className="text-emerald-400">Threshold Met</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDeleteUser(u);
                                setDeleteConfirmationEmail('');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-900/70 bg-rose-950/40 text-rose-300 hover:bg-rose-900/70 transition"
                              aria-label={`Permanently delete ${u.email}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: ADMIN PROFILE SETTINGS */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-purple-400" /> Admin Credentials
                </h3>

                <form onSubmit={handleUpdateAdminProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Administrator Name</label>
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Email Address</label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Security Level</label>
                    <div className="inline-block bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1 rounded-full text-[11px] font-bold">
                      Super Admin Privileges
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingAdminProfile}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingAdminProfile ? 'Saving...' : 'Save Profile'}</span>
                  </button>
                </form>
              </div>

              <div className="neon-card p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" /> Security & Password
                </h3>

                <form onSubmit={handleChangeAdminPassword} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">Current Password</label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      placeholder="Enter current password"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-semibold">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={PASSWORD_MIN_LENGTH}
                      pattern={PASSWORD_PATTERN.source}
                      title={PASSWORD_REQUIREMENTS}
                      placeholder="Enter a strong password"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{PASSWORD_REQUIREMENTS}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    <span>{changingPassword ? 'Updating...' : 'Update Password'}</span>
                  </button>
                </form>
              </div>

              <div className="neon-card p-6 rounded-2xl border border-cyan-500/30 lg:col-span-2">
                <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" /> Admin Referral Code
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Share this code with people who register. It is for referral tracking only; no bonus or reward is paid for admin referrals.
                </p>
                {loadingAdminReferralCode ? (
                  <p className="text-sm text-slate-400">Generating your admin referral code...</p>
                ) : adminReferralCodeError ? (
                  <p className="text-sm text-rose-400">Could not load the admin referral code. Please refresh and try again.</p>
                ) : (
                  <div className="flex items-center gap-3">
                    <code className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-lg font-bold tracking-widest text-cyan-300">
                      {adminReferralCode}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyAdminReferralCode}
                      className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Code
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* KYC Rejection Reason Modal */}
      {rejectModalOpen && selectedKycUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0a101d] border border-rose-900/60 rounded-2xl p-6 max-w-md w-full space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Reject KYC for {selectedKycUser.name}
            </h4>
            <p className="text-xs text-slate-400">
              State the rejection reason so the client can submit acceptable replacement documents.
            </p>

            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. ID Front photo is blurry or illegible."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 hover:text-white text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  kycReviewMutation.mutate({
                    userId: selectedKycUser._id,
                    action: 'REJECT',
                    reason: rejectionReason,
                  })
                }
                disabled={kycReviewMutation.isLoading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDeleteUser && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0a101d] border border-rose-900/70 rounded-2xl p-6 max-w-lg w-full space-y-4">
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-400" /> Permanently delete account?
            </h4>
            <p className="text-sm font-semibold text-rose-300 break-all">{selectedDeleteUser.email}</p>
            <p className="text-xs text-slate-300">
              This irreversible action removes the user, wallet and balances, transaction history, referral records, KYC details, and stored KYC/deposit-proof images. It cannot be undone.
            </p>
            <label className="block text-xs text-slate-400" htmlFor="delete-user-confirmation">
              Type the email address above to confirm:
            </label>
            <input
              id="delete-user-confirmation"
              type="email"
              autoComplete="off"
              value={deleteConfirmationEmail}
              onChange={(event) => setDeleteConfirmationEmail(event.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:border-rose-500 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedDeleteUser(null);
                  setDeleteConfirmationEmail('');
                }}
                disabled={deleteUserMutation.isPending}
                className="px-4 py-2 rounded-xl bg-slate-900 text-slate-300 hover:text-white text-xs font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteUserMutation.mutate({
                    userId: selectedDeleteUser.userId,
                    confirmEmail: deleteConfirmationEmail,
                  })
                }
                disabled={
                  deleteUserMutation.isPending ||
                  deleteConfirmationEmail.trim().toLowerCase() !== selectedDeleteUser.email.toLowerCase()
                }
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteUserMutation.isPending ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMsg} />
    </div>
  );
};

export default AdminDashboard;