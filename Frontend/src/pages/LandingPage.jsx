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
import PublicHeader from '../components/layout/PublicHeader';

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
      description: 'MonexaFX provides access to market information across XAUUSD Gold and major currency pairs.',
      badge: 'High Performance',
      gradient: 'from-cyan-900/80 via-blue-900/60 to-slate-900',
      border: 'border-cyan-500/40',
      icon: Cpu,
      accent: 'text-cyan-400',
    },
    {
      id: 2,
      title: 'Stated 1% Daily Yield',
      subtitle: '24-Hour Automated Ledger Activation',
      description: 'The stated return is 1% of qualifying main investment balance every 24 hours after activation. It is not compounded and pauses below the $300 minimum balance.',
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
      description: 'Invite new investors to MonexaFX. Earn a $50 USDT flat cash bonus plus $0.20 daily passive payments for qualifying $300+ deposits.',
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
      <PublicHeader />

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
            <p className="text-xs text-slate-400">Stated 1% return on qualifying main investment balance, credited every 24 hours after activation.</p>
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
            <span className="font-bold text-slate-300">MonexaFX Financial Portal</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to={portalPath} className="hover:text-cyan-400 transition">Portal</Link>
            <Link to="/terms-policy" className="hover:text-cyan-400 transition">Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;