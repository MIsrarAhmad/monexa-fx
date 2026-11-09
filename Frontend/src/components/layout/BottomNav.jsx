// src/components/layout/BottomNav.jsx
import React, { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Wallet, FileText, User } from 'lucide-react';

const BottomNav = memo(() => {
  const activeClass = 'text-cyan-400 flex flex-col items-center gap-1 text-[10px] font-semibold';
  const inactiveClass = 'text-slate-400 hover:text-cyan-400 flex flex-col items-center gap-1 text-[10px]';

  return (
    <div className="fixed bottom-0 inset-x-0 z-30 bg-[#070c16]/95 border-t border-cyan-900/40 py-2.5 px-4 md:hidden backdrop-blur-lg">
      <div className="flex justify-around items-center text-center">
        {/* 1. Home (User Dashboard Welcome Home Page) */}
        <NavLink to="/dashboard-home" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        {/* 2. Market Page */}
        <NavLink to="/market" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
          <BarChart2 className="w-5 h-5" />
          <span>Market</span>
        </NavLink>

        {/* 3. Asset Page (User Dashboard Capital & Returns) */}
        <NavLink to="/dashboard" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
          <Wallet className="w-5 h-5" />
          <span>Asset</span>
        </NavLink>

        {/* 4. Transaction Page */}
        <NavLink to="/transactions" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
          <FileText className="w-5 h-5" />
          <span>Transaction</span>
        </NavLink>

        {/* 5. Profile Page */}
        <NavLink to="/profile" className={({ isActive }) => (isActive ? activeClass : inactiveClass)}>
          <User className="w-5 h-5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </div>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;