// src/pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Zap,
  Users,
  Coins,
  ArrowRight,
  BarChart2,
  DollarSign,
  AlertTriangle,
  Lock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Flame,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import MarketOverviewWidget from '../components/dashboard/MarketOverviewWidget';
import LOGO_IMAGE_PATH from '../assets/logo.jpeg';

const LandingPage = () => {
  const { isAuthenticated, role } = useAuthStore();

  const portalPath = !isAuthenticated
    ? '/login'
    : role === 'admin'
    ? '/admin'
    : '/dashboard-home';

  const [currentSlide, setCurrentSlide] = useState(0);

  const carouselCards = [
    {
      id: 1,
      title: 'Institutional Multi-Asset Engine',
      subtitle: 'Automated Forex, Gold & Crypto Trading',
      description: 'Monexafx Exchange provides seamless access to institutional liquidity pools across XAUUSD Gold, major Currency Pairs, and USDT yield engines.',
      badge: 'High Performance',
      gradient: 'from-cyan-900/80 via-blue-900/60 to-slate-900',
      border: 'border-cyan-500/40',
      icon: Cpu,
      accent: 'text-cyan-400',
    },
    {
      id: 2,
      title: 'Guaranteed 1% Daily Yield',
      subtitle: '24-Hour Automated Ledger Activation',
      description: 'Participate in our structured capital program. Enjoy fixed daily compounding yield credited directly after a 24-hour setup period.',
      badge: 'Promised Return',
      gradient: 'from-emerald-950/80 via-slate-900 to-teal-950/60',
      border: 'border-emerald-500/40',
      icon: DollarSign,
      accent: 'text-emerald-400',
    },
    {
      id: 3,
      title: 'Direct $50 Referral Rewards',
      subtitle: 'Flat Direct Sponsor Payouts',
      description: 'Invite new investors to Monexafx Exchange. Earn a $50 USDT flat cash bonus plus $0.20 daily passive payments for qualifying $300+ deposits.',
      badge: 'Network Growth',
      gradient: 'from-purple-950/80 via-slate-900 to-indigo-950/60',
      border: 'border-purple-500/40',
      icon: Users,
      accent: 'text-purple-400',
    },
    {
      id: 4,
      title: 'Fast Payout Gateways',
      subtitle: 'TRON (TRC20) USDT Cashouts',
      description: 'Execute instant withdrawal requests processed directly to your personal USDT/TRC20 wallet within 1 to 30 minutes.',
      badge: 'Instant Liquidity',
      gradient: 'from-amber-950/80 via-slate-900 to-orange-950/60',
      border: 'border-amber-500/40',
      icon: Flame,
      accent: 'text-amber-400',
    },
  ];

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselCards.length);
    }, 4500);
    return () => clearInterval(slideInterval);
  }, [carouselCards.length]);

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselCards.length) % carouselCards.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselCards.length);
  };

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col font-sans">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-[#070c16]/90 backdrop-blur-md border-b border-cyan-900/30 px-3 py-3 sm:px-4 sm:py-4 md:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          {/* Logo Image & Brand Title */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            {/* Larger Logo Container: w-10 h-10 (mobile) / w-12 h-12 (desktop) */}
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-slate-900/80 border border-cyan-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-lg shadow-cyan-500/20 group-hover:border-cyan-400 transition">
              <img
                src={LOGO_IMAGE_PATH}
                alt="Monexafx Exchange Logo"
                className="w-full h-full object-cover"
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

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a href="#about" className="hover:text-cyan-400 transition">About Us</a>
            <a href="#policy" className="hover:text-cyan-400 transition">Investment Policy</a>
            <a href="#referral" className="hover:text-cyan-400 transition">Referral Program</a>
            <a href="#terms" className="hover:text-cyan-400 transition">Terms & Risk</a>
          </nav>

          {/* Auth Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                to={portalPath}
                className="btn-neon-primary px-3 py-1.5 sm:px-5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap"
              >
                <span>{role === 'admin' ? 'Executive Portal' : 'Go to Dashboard'}</span>
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-cyan-800 text-cyan-300 hover:bg-cyan-950/50 transition whitespace-nowrap"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-neon-primary px-2.5 py-1.5 sm:px-5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 px-4 md:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-4xl mx-auto mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs font-bold mb-4">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Welcome to Monexa Fx</span>
          </div>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
            Discover a Smarter Approach to Digital Investment.
          </h1>

          {/* Interactive Auto-Changing Card Carousel */}
          <div className="relative max-w-3xl mx-auto my-6">
            <div className="overflow-hidden rounded-2xl relative shadow-2xl">
              <div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {carouselCards.map((card) => {
                  const IconComp = card.icon;
                  return (
                    <div
                      key={card.id}
                      className={`w-full shrink-0 p-6 md:p-8 rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} text-left flex flex-col justify-between min-h-[220px]`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className={`text-[11px] font-extrabold uppercase px-3 py-1 rounded-full bg-slate-900/80 border ${card.border} ${card.accent}`}>
                            {card.badge}
                          </span>
                          <IconComp className={`w-6 h-6 ${card.accent}`} />
                        </div>
                        <h3 className="text-xl md:text-2xl font-extrabold text-white mb-1">
                          {card.title}
                        </h3>
                        <p className={`text-xs font-bold mb-3 ${card.accent}`}>{card.subtitle}</p>
                        <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
                          {card.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Carousel Controls */}
            <button
              onClick={handlePrevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-950/70 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-900 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Slide Dots Indicator */}
            <div className="flex justify-center items-center gap-2 mt-4">
              {carouselCards.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    currentSlide === index ? 'w-8 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              to={isAuthenticated ? portalPath : '/register'}
              className="btn-neon-primary w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <span>{isAuthenticated ? 'Open Portal' : 'Start Investing ($300 Min)'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={portalPath}
              className="btn-neon-outline w-full sm:w-auto px-8 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              <BarChart2 className="w-4 h-4" />
              <span>{role === 'admin' ? 'Access Executive Center' : 'Access Client Portal'}</span>
            </Link>
          </div>
        </div>

        {/* Core Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          <div className="neon-card p-5 rounded-2xl border border-cyan-500/20">
            <DollarSign className="w-8 h-8 text-cyan-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">1% Daily Returns</h3>
            <p className="text-xs text-slate-400">Fixed 1% daily yield credited directly to your profit ledger.</p>
          </div>
          <div className="neon-card p-5 rounded-2xl border border-cyan-500/20">
            <Lock className="w-8 h-8 text-emerald-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">24-Hour Profit Activation</h3>
            <p className="text-xs text-slate-400">Yield processing starts 24 hours after deposit confirmation.</p>
          </div>
          <div className="neon-card p-5 rounded-2xl border border-cyan-500/20">
            <Globe className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">Multi-Market Execution</h3>
            <p className="text-xs text-slate-400">Capital deployed across Forex, Gold (XAUUSD), and Crypto assets.</p>
          </div>
        </div>

        <MarketOverviewWidget />
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-[#04070d] py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-300">Monexafx Exchange Financial Portal</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to={portalPath} className="hover:text-cyan-400 transition">Portal</Link>
            <a href="#policy" className="hover:text-cyan-400 transition">Policy</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;