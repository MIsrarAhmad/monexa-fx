// src/components/layout/Navbar.jsx
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Menu, X, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import NotificationCenter from './NotificationCenter';
import CountryFlag from '../common/CountryFlag';
import UserAvatar from '../common/UserAvatar';

const Navbar = memo(({ onMobileSidebarToggle, isMobileSidebarOpen }) => {
  const user = useAuthStore((state) => state.user);

  const MONEXAFX_DISCORD_URL = 'https://discord.gg/tUM3Urq7';

  return (
    <header className="public-header sticky top-0 z-50">
      <div className="public-header-shell account-header-shell">
        {/* Left Branding & Mobile Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onMobileSidebarToggle}
            aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileSidebarOpen}
            className="account-menu-toggle"
          >
            {isMobileSidebarOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          {/* Logo Image & Brand Name (Redirects to Landing Page) */}
          <Link to="/" className="public-brand">
            <div className="public-brand-logo">
              <img
                src="/monexafx-header-logo.png"
                alt="MONEXA FX Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerText = 'M';
                  e.target.parentNode.className += ' text-cyan-400 font-extrabold text-base sm:text-lg';
                }}
              />
            </div>

            {/* Brand Title */}
            <span className="public-brand-name">
              MONEXA <span>FX</span>
              <small>Trade <b>•</b> Invest <b>•</b> Grow</small>
            </span>
          </Link>
          <span className="hidden sm:inline-block text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
            Pro V2.4
          </span>
        </div>

        {/* Right chat link, notifications & user info */}
        <div className="account-header-actions">
          {/* Chat link */}
          <a
            href={MONEXAFX_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="account-chat"
            title="Open Discord"
            aria-label="Open Discord"
          >
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Chat</span>
            <ExternalLink className="hidden sm:inline w-3 h-3 text-cyan-400/70" />
          </a>

          <NotificationCenter />

          {/* User Profile Summary */}
          <div className="account-profile">
            <div className="relative">
              <UserAvatar user={user} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-cyan-400 bg-slate-800 flex items-center justify-center text-cyan-300 font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20" />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
            </div>
            <div className="hidden sm:block min-w-0">
              <h4 className="text-sm font-semibold text-white leading-none truncate">
                {user?.name || 'Investor'} <CountryFlag country={user?.country} />
              </h4>
              <span className="text-xs text-cyan-400 font-medium">
                {user?.role === 'admin' ? 'System Administrator' : 'VIP Investor'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
});

Navbar.displayName = 'Navbar';
export default Navbar;