import { useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowRight, Gift, Home, Menu, Rocket, ShieldCheck, UserRound, UsersRound, X } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

const informationLinks = [
  { to: '/about-us', label: 'About Us', Icon: UsersRound },
  { to: '/terms-policy', label: 'Investment Policy', Icon: ShieldCheck },
  { to: '/referrals-page', label: 'Referral Program', Icon: Gift },
];

const InformationLinks = ({ className, includeHome = false, onNavigate }) => (
  <nav aria-label="Information" className={className}>
    {includeHome && (
      <NavLink to="/" end className="public-nav-link" onClick={onNavigate}>
        <Home aria-hidden="true" /> <span>Home</span>
      </NavLink>
    )}
    {informationLinks.map(({ to, label, Icon }) => (
      <NavLink key={to} to={to} className="public-nav-link" onClick={onNavigate}>
        <Icon aria-hidden="true" /> <span>{label}</span>
      </NavLink>
    ))}
  </nav>
);

export default function PublicHeader() {
  const { isAuthenticated, role } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef(null);
  const portalPath = role === 'admin' ? '/admin' : '/dashboard-home';

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && menuOpen) {
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    }
  };

  return (
    <header className="public-header sticky top-0 z-40" onKeyDown={handleKeyDown}>
      <div className="public-header-shell">
        <Link to="/" className="public-brand" onClick={() => setMenuOpen(false)}>
          <div className="public-brand-logo">
            <img
              src="/monexafx-header-logo.png"
              alt="MonexaFX Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerText = 'M';
                e.target.parentNode.className += ' text-cyan-400 font-extrabold text-base sm:text-lg';
              }}
            />
          </div>
          <span className="public-brand-name">
            MONEXA <span>FX</span>
            <small>Trade <b>•</b> Invest <b>•</b> Grow</small>
          </span>
        </Link>

        <InformationLinks includeHome className="public-desktop-nav" />

        <div className="public-header-actions">
          {isAuthenticated ? (
            <Link to={portalPath} className="public-action public-action-primary" onClick={() => setMenuOpen(false)}>
              <span>{role === 'admin' ? 'Executive Portal' : 'Go to Dashboard'}</span>
              <ArrowRight aria-hidden="true" />
            </Link>
          ) : (
            <>
              <Link to="/login" className="public-action public-action-outline" onClick={() => setMenuOpen(false)}>
                <UserRound aria-hidden="true" /> <span>Sign In</span>
              </Link>
              <Link to="/register" className="public-action public-action-primary" onClick={() => setMenuOpen(false)}>
                <Rocket aria-hidden="true" /> <span>Get Started</span> <ArrowRight aria-hidden="true" />
              </Link>
            </>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            className="public-menu-toggle"
            aria-label={menuOpen ? 'Close information menu' : 'Open information menu'}
            aria-expanded={menuOpen}
            aria-controls="public-mobile-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div id="public-mobile-menu" className="public-mobile-menu" hidden={!menuOpen}>
        <InformationLinks className="public-mobile-nav" onNavigate={() => setMenuOpen(false)} />
      </div>
    </header>
  );
}
