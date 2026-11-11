// src/pages/MarketPage.jsx
import { useState } from 'react';
import { Activity, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';

const MarketPage = () => {
  const logout = useAuthStore((state) => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Gold (XAUUSD) selected by default
  const [selectedAsset, setSelectedAsset] = useState('XAUUSD');

  const marketAssets = [
    { symbol: 'XAUUSD', name: 'Gold / US Dollar (XAUUSD)', category: 'Commodities' },
    { symbol: 'BTCUSDT', name: 'Bitcoin / USDT (BTCUSDT)', category: 'Crypto' },
    { symbol: 'ETHUSDT', name: 'Ethereum / USDT (ETHUSDT)', category: 'Crypto' },
    { symbol: 'SOLUSDT', name: 'Solana / USDT (SOLUSDT)', category: 'Crypto' },
    { symbol: 'EURUSD', name: 'Euro / US Dollar (EURUSD)', category: 'Forex' },
    { symbol: 'GBPUSD', name: 'British Pound / USD (GBPUSD)', category: 'Forex' },
  ];

  return (
    <div className="min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative pb-20 md:pb-6">
      <Navbar
        isMobileSidebarOpen={sidebarOpen}
        onMobileSidebarToggle={() => setSidebarOpen((open) => !open)}
      />

      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        <Sidebar
          isOpen={sidebarOpen}
          onCloseSidebar={() => setSidebarOpen(false)}
          onLogout={logout}
        />

        <main className="flex-1 min-w-0">
          {/* Full Width Candlestick Chart Card with Asset Dropdown */}
          <div className="neon-card p-5 rounded-2xl border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Live Technical Candlestick</h3>
              </div>

              {/* Asset Dropdown Selector */}
              <div className="flex items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <select
                    value={selectedAsset}
                    onChange={(e) => setSelectedAsset(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-cyan-300 focus:outline-none focus:border-cyan-400 appearance-none cursor-pointer"
                  >
                    {marketAssets.map((asset) => (
                      <option key={asset.symbol} value={asset.symbol} className="bg-slate-900 text-white">
                        {asset.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>

                <span className="hidden sm:flex text-xs bg-emerald-950 text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-800 font-bold items-center gap-1 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Streaming
                </span>
              </div>
            </div>

            {/* TradingView Chart Container */}
            <div className="w-full h-[450px] sm:h-[550px] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center relative">
              <iframe
                title="TradingView Technical Chart"
                allow="autoplay"
                src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_chart&symbol=${selectedAsset}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=060a12&studies=[]&theme=dark&style=1&timezone=Etc%2FUTC&studies_overrides={}&overrides={}&enabled_features=[]&disabled_features=[]&locale=en&utm_source=localhost&utm_medium=widget&utm_campaign=chart&utm_term=${selectedAsset}`}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
};

export default MarketPage;