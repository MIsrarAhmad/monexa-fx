import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const InformationLinks = ({ className }) => (
  <nav aria-label="Information" className={className}>
    <Link to="/about-us" className="whitespace-nowrap hover:text-cyan-400 transition">About Us</Link>
    <Link to="/terms-policy" className="whitespace-nowrap hover:text-cyan-400 transition">Investment Policy</Link>
    <Link to="/referrals-page" className="whitespace-nowrap hover:text-cyan-400 transition">Referral Program</Link>
  </nav>
);

export default function PublicHeader() {
  const { isAuthenticated, role } = useAuthStore();
  const portalPath = role === 'admin' ? '/admin' : '/dashboard-home';

  return (
    <header className="site-glass-header sticky top-0 z-40 bg-[#070c16]/90 backdrop-blur-md border-b border-cyan-900/30 px-3 py-3 sm:px-4 sm:py-4 md:px-8">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-cyan-500/20 group-hover:border-cyan-400 transition">
            <img
              src="/monexafx-logo.png"
              alt="MonexaFX Logo"
              className="w-full h-full object-contain p-0.5"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerText = 'M';
                e.target.parentNode.className += ' text-cyan-400 font-extrabold text-base sm:text-lg';
              }}
            />
          </div>
          <span className="text-base sm:text-2xl font-extrabold tracking-wide text-white whitespace-nowrap">
            MONEXA <span className="text-cyan-400">FX</span>
          </span>
        </Link>

        <InformationLinks className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300" />

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {isAuthenticated ? (
            <Link to={portalPath} className="btn-neon-primary px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
              <span>{role === 'admin' ? 'Executive Portal' : 'Go to Dashboard'}</span>
              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-cyan-800 text-cyan-300 hover:bg-cyan-950/50 transition whitespace-nowrap">Sign In</Link>
              <Link to="/register" className="btn-neon-primary px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap">
                <span>Get Started</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
      <InformationLinks className="md:hidden flex items-center justify-center gap-4 overflow-x-auto pt-3 text-[11px] font-semibold text-slate-300" />
    </header>
  );
}
