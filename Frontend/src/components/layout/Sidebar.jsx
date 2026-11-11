// src/components/layout/Sidebar.jsx
import { memo, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  UserCheck,
  Users,
  FileText,
  Info,
  ShieldCheck,
  Clock,
  User,
  LogOut,
  X,
  Power,
  ShieldAlert,
  ArrowRightLeft,
  Home,
  BarChart2,
  Wallet,
  Megaphone,
} from 'lucide-react';
import axiosInstance from '../../api/axiosInstance';
import { useAuthStore } from '../../store/useAuthStore';
import { useSystemStore } from '../../store/useSystemStore';

const Sidebar = memo(
  ({
    isOpen,
    onCloseSidebar,
    onLogout,
    activeTab,
    setActiveTab,
    pendingWithdrawalsCount = 0,
    pendingDepositsCount = 0,
    pendingKycCount = 0,
  }) => {
    const user = useAuthStore((state) => state.user);
    const { isMaintenanceMode, toggleMaintenanceMode } = useSystemStore();

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
      if (!isOpen || window.matchMedia('(min-width: 768px)').matches) return undefined;

      const scrollY = window.scrollY;
      const bodyStyles = {
        position: document.body.style.position,
        top: document.body.style.top,
        width: document.body.style.width,
        overflow: document.body.style.overflow,
      };
      const rootOverflow = document.documentElement.style.overflow;
      let lastTouchY = 0;

      const handleTouchStart = (event) => {
        lastTouchY = event.touches[0].clientY;
      };
      const handleTouchMove = (event) => {
        const drawer = event.target instanceof Element
          ? event.target.closest('[data-mobile-sidebar]')
          : null;

        if (!drawer) {
          event.preventDefault();
          return;
        }

        const touchY = event.touches[0].clientY;
        const deltaY = touchY - lastTouchY;
        lastTouchY = touchY;

        if (
          drawer.scrollHeight <= drawer.clientHeight ||
          (drawer.scrollTop <= 0 && deltaY > 0) ||
          (drawer.scrollTop + drawer.clientHeight >= drawer.scrollHeight && deltaY < 0)
        ) {
          event.preventDefault();
        }
      };

      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
        document.body.style.position = bodyStyles.position;
        document.body.style.top = bodyStyles.top;
        document.body.style.width = bodyStyles.width;
        document.body.style.overflow = bodyStyles.overflow;
        document.documentElement.style.overflow = rootOverflow;
        window.scrollTo(0, scrollY);
      };
    }, [isOpen]);

    // Fetch live KYC status for regular users
    const { data: kycData } = useQuery({
      queryKey: ['kyc-status-sidebar'],
      queryFn: async () => {
        const res = await axiosInstance.get('/kyc/me');
        return res.data.data;
      },
      enabled: !isAdmin,
    });

    const kycStatus = kycData?.kycStatus || 'UNVERIFIED';

    const activeClass = isAdmin
      ? 'flex items-center justify-between w-full px-4 py-3 rounded-xl bg-purple-950/60 text-purple-300 font-semibold border border-purple-700/40 shadow-lg shadow-purple-950/50 text-left'
      : 'flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-cyan-950/60 text-cyan-300 font-semibold border border-cyan-700/40 shadow-lg shadow-cyan-950/50';

    const inactiveClass = isAdmin
      ? 'flex items-center justify-between w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-slate-900/80 hover:text-purple-300 transition text-left'
      : 'flex items-center gap-3 w-full px-4 py-3 rounded-xl text-gray-400 hover:bg-slate-900/80 hover:text-cyan-300 transition';

    const handleAdminTabClick = (tab) => {
      if (setActiveTab) setActiveTab(tab);
      if (onCloseSidebar) onCloseSidebar();
    };

    const totalPendingTransactions = pendingWithdrawalsCount + pendingDepositsCount;

    return (
      <>
        {isOpen && (
          <button
            type="button"
            onClick={onCloseSidebar}
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-black/60 md:hidden"
          />
        )}
        <aside
          data-mobile-sidebar
          className={`fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto overscroll-contain touch-pan-y bg-[#0a101d] ${
            isAdmin ? 'border-r border-purple-900/30' : 'border-r border-cyan-900/30'
          } p-5 transform transition-transform duration-300 md:relative md:translate-x-0 md:overflow-visible md:overscroll-auto md:bg-transparent md:border-r-0 md:p-0 md:w-60 shrink-0 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
        <div className="flex justify-between items-center mb-6 md:hidden">
          <span className={`text-lg font-bold ${isAdmin ? 'text-purple-400' : 'text-cyan-400'}`}>
            Navigation Menu
          </span>
          <button onClick={onCloseSidebar} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* User / Admin Profile Card */}
        <div className="mb-6 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full border flex items-center justify-center font-bold ${
                isAdmin
                  ? 'border-purple-400 bg-purple-950 text-purple-300'
                  : kycStatus === 'APPROVED'
                  ? 'border-emerald-400 bg-emerald-950 text-emerald-300'
                  : kycStatus === 'PENDING'
                  ? 'border-amber-400 bg-amber-950 text-amber-300'
                  : 'border-slate-600 bg-slate-800 text-slate-300'
              }`}
            >
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name || 'Investor'}</p>

              {isAdmin ? (
                <p className="text-xs flex items-center gap-1 text-purple-400">
                  <ShieldCheck className="w-3.5 h-3.5" /> Super Admin
                </p>
              ) : kycStatus === 'APPROVED' ? (
                <p className="text-xs flex items-center gap-1 text-emerald-400 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Client
                </p>
              ) : kycStatus === 'PENDING' ? (
                <p className="text-xs flex items-center gap-1 text-amber-400 font-semibold">
                  <Clock className="w-3.5 h-3.5 animate-pulse" /> Pending Review
                </p>
              ) : (
                <p className="text-xs flex items-center gap-1 text-slate-400 font-medium">
                  <ShieldAlert className="w-3.5 h-3.5 text-slate-500" /> Unverified Client
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5">
          {isAdmin ? (
            /* ADMIN TABS */
            <>
              <button
                onClick={() => handleAdminTabClick('overview')}
                className={activeTab === 'overview' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-purple-400" />
                  <span>Executive Overview</span>
                </div>
              </button>

              <button
                onClick={() => handleAdminTabClick('kyc')}
                className={activeTab === 'kyc' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-cyan-400" />
                  <span>KYC Queue</span>
                </div>
                {pendingKycCount > 0 && (
                  <span className="bg-cyan-500 text-black px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {pendingKycCount}
                  </span>
                )}
              </button>

              {/* RENAMED: DEPOSIT & CASHOUT QUEUE */}
              <button
                onClick={() => handleAdminTabClick('deposits')}
                className={activeTab === 'deposits' || activeTab === 'withdrawals' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                  <span>Deposit & Cashout Queue</span>
                </div>
                {totalPendingTransactions > 0 && (
                  <span className="bg-amber-500 text-black px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                    {totalPendingTransactions}
                  </span>
                )}
              </button>

              <button
                onClick={() => handleAdminTabClick('users')}
                className={activeTab === 'users' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>User Directory</span>
                </div>
              </button>

              <button
                onClick={() => handleAdminTabClick('announcements')}
                className={activeTab === 'announcements' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-amber-400" />
                  <span>Announcements</span>
                </div>
              </button>

              <button
                onClick={() => handleAdminTabClick('profile')}
                className={activeTab === 'profile' ? activeClass : inactiveClass}
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-emerald-400" />
                  <span>Admin Profile</span>
                </div>
              </button>
            </>
          ) : (
            /* USER TABS */
            <>
              <NavLink to="/dashboard-home" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <Home className="w-5 h-5 text-cyan-400" />
                <span>Home</span>
              </NavLink>

              <NavLink to="/market" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                <span>Market</span>
              </NavLink>

              <NavLink to="/dashboard" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <Wallet className="w-5 h-5 text-cyan-400" />
                <span>Assets</span>
              </NavLink>

              <NavLink to="/transactions" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Transactions</span>
              </NavLink>

              <NavLink to="/profile" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <User className="w-5 h-5 text-cyan-400" />
                <span>Profile</span>
              </NavLink>

              <NavLink to="/verification" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <UserCheck className="w-5 h-5 text-cyan-400" />
                <span>Verification</span>
              </NavLink>

              <NavLink to="/referrals-page" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <Users className="w-5 h-5 text-cyan-400" />
                <span>Referral</span>
              </NavLink>

              <NavLink to="/terms-policy" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <FileText className="w-5 h-5 text-cyan-400" />
                <span>Terms & Policy</span>
              </NavLink>

              <NavLink to="/about-us" onClick={onCloseSidebar} className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
                <Info className="w-5 h-5 text-cyan-400" />
                <span>About Us</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* Bottom Controls */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 space-y-2">
          {isAdmin && (
            <button
              onClick={() => toggleMaintenanceMode()}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold border transition ${
                isMaintenanceMode
                  ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Power className="w-4 h-4" />
              <span>{isMaintenanceMode ? 'Maintenance Mode: ON' : 'Toggle Maintenance'}</span>
            </button>
          )}

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition font-medium text-xs"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
        </aside>
      </>
    );
  }
);

Sidebar.displayName = 'Sidebar';
export default Sidebar;