// src/components/layout/Navbar.jsx
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Menu, X, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import LOGO_IMAGE_PATH from '../../assets/logo.jpeg';
import NotificationCenter from './NotificationCenter';

const Navbar = memo(({ onMobileSidebarToggle, isMobileSidebarOpen }) => {
  const user = useAuthStore((state) => state.user);

  const MONEXAFX_CHAT_URL = 'https://smp15.simplex.im/c#e1j3FUyEqT0OzeGprP26OZ7yea6nqTMULxV-yCG5ouU';

  return (
    <header className="sticky top-0 z-50 bg-[#070c16] border-b border-cyan-900/30 px-3 py-2.5 sm:px-4 sm:py-3 md:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        {/* Left Branding & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onMobileSidebarToggle}
            aria-label={isMobileSidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileSidebarOpen}
            className="md:hidden text-gray-300 hover:text-cyan-400 focus:outline-none p-1.5 rounded-lg bg-gray-900/50"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo Image & Brand Name (Redirects to Landing Page) */}
          <Link to="/" className="flex items-center gap-2.5 transition group">
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-cyan-500/20 group-hover:border-cyan-400 transition">
              <img
                src={LOGO_IMAGE_PATH}
                alt="MONEXA FX Logo"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentNode.innerText = 'M';
                  e.target.parentNode.className += ' text-cyan-400 font-extrabold text-base sm:text-lg';
                }}
              />
            </div>

            {/* Brand Title */}
            <div className="whitespace-nowrap">
              <span className="text-base sm:text-xl font-extrabold tracking-wide text-white">
                MONEXA <span className="text-cyan-400">FX</span>
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800">
                Pro V2.4
              </span>
            </div>
          </Link>
        </div>

        {/* Right chat link, notifications & user info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Chat link */}
          <a
            href={MONEXAFX_CHAT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative p-1.5 sm:p-2 rounded-xl bg-cyan-950/80 text-cyan-300 hover:text-white hover:bg-cyan-900/80 border border-cyan-700/50 transition flex items-center gap-1.5 text-xs font-bold shadow-md shadow-cyan-950/40"
            title="Open chat"
            aria-label="Open chat"
          >
            <MessageCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Chat</span>
            <ExternalLink className="hidden sm:inline w-3 h-3 text-cyan-400/70" />
          </a>

          <NotificationCenter />

          {/* User Profile Summary */}
          <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-3 border-l border-slate-800">
            <div className="relative">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-cyan-400 bg-slate-800 flex items-center justify-center text-cyan-300 font-bold text-xs sm:text-sm shadow-md shadow-cyan-500/20">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-500 border-2 border-slate-900"></span>
            </div>
            <div className="hidden sm:block">
              <h4 className="text-sm font-semibold text-white leading-none">{user?.name || 'Investor'}</h4>
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