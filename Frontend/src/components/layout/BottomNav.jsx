// src/components/layout/BottomNav.jsx
import { memo } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Wallet, FileText, User } from 'lucide-react';

const BottomNav = memo(() => {
  const navClass = ({ isActive }) => `account-bottom-link${isActive ? ' active' : ''}`;

  return (
    <nav aria-label="Account navigation" className="account-bottom-nav fixed bottom-0 inset-x-0 z-30 md:hidden">
      <div className="account-bottom-shell">
        {/* 1. Home (User Dashboard Welcome Home Page) */}
        <NavLink to="/dashboard-home" className={navClass}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </NavLink>

        {/* 2. Market Page */}
        <NavLink to="/market" className={navClass}>
          <BarChart2 className="w-5 h-5" />
          <span>Market</span>
        </NavLink>

        {/* 3. Asset Page (User Dashboard Capital & Returns) */}
        <NavLink to="/dashboard" className={navClass}>
          <Wallet className="w-5 h-5" />
          <span>Asset</span>
        </NavLink>

        {/* 4. Transaction Page */}
        <NavLink to="/transactions" className={navClass}>
          <FileText className="w-5 h-5" />
          <span>Transaction</span>
        </NavLink>

        {/* 5. Profile Page */}
        <NavLink to="/profile" className={navClass}>
          <User className="w-5 h-5" />
          <span>Profile</span>
        </NavLink>
      </div>
    </nav>
  );
});

BottomNav.displayName = 'BottomNav';
export default BottomNav;