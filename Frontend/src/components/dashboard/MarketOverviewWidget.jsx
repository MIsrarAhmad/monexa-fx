// src/components/dashboard/MarketOverviewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';

const MarketOverviewWidget = memo(() => {
  const containerRef = useRef(null);

  useEffect(() => {
    // Avoid appending multiple scripts on re-renders
    if (!containerRef.current || containerRef.current.querySelector('script')) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
    script.type = 'text/javascript';
    script.async = true;

    // TradingView Market Overview Configuration
    script.innerHTML = JSON.stringify({
      colorTheme: 'dark',
      dateRange: '12M',
      showChart: true,
      locale: 'en',
      largeChartUrl: '',
      isTransparent: true,
      showSymbolLogo: true,
      showFloatingTooltip: true,
      width: '100%',
      height: '420',
      plotLineColorGrowing: 'rgba(52, 211, 153, 1)',
      plotLineColorFalling: 'rgba(244, 63, 94, 1)',
      gridLineColor: 'rgba(30, 41, 59, 0.5)',
      scaleFontColor: 'rgba(148, 163, 184, 1)',
      belowLineFillColorGrowing: 'rgba(52, 211, 153, 0.12)',
      belowLineFillColorFalling: 'rgba(244, 63, 94, 0.12)',
      belowLineFillColorGrowingBottom: 'rgba(52, 211, 153, 0)',
      belowLineFillColorFallingBottom: 'rgba(244, 63, 94, 0)',
      symbolActiveColor: 'rgba(14, 165, 233, 0.25)',
      tabs: [
        {
          title: 'Crypto Assets',
          symbols: [
            { s: 'BINANCE:BTCUSDT', d: 'Bitcoin (BTC/USDT)' },
            { s: 'BINANCE:ETHUSDT', d: 'Ethereum (ETH/USDT)' },
            { s: 'BINANCE:BNBUSDT', d: 'Binance Coin (BNB)' },
            { s: 'BINANCE:SOLUSDT', d: 'Solana (SOL/USDT)' },
            { s: 'BINANCE:XRPUSDT', d: 'Ripple (XRP/USDT)' },
          ],
        },
        {
          title: 'Commodities & Gold',
          symbols: [
            { s: 'OANDA:XAUUSD', d: 'Gold Spot (XAU/USD)' },
            { s: 'OANDA:XAGUSD', d: 'Silver Spot (XAG/USD)' },
            { s: 'TVC:USOIL', d: 'WTI Crude Oil' },
          ],
        },
        {
          title: 'Forex Pairs',
          symbols: [
            { s: 'FX:EURUSD', d: 'EUR / USD' },
            { s: 'FX:GBPUSD', d: 'GBP / USD' },
            { s: 'FX:USDJPY', d: 'USD / JPY' },
            { s: 'FX:AUDUSD', d: 'AUD / USD' },
            { s: 'FX:USDCAD', d: 'USD / CAD' },
          ],
        },
      ],
    });

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="neon-card p-5 rounded-2xl mb-6">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" /> Live Market Ticker
          </h3>
          <p className="text-xs text-slate-400">Real-time quotes for Crypto, Gold, and Forex currency pairs.</p>
        </div>
        <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-800/50">
          Live Data
        </span>
      </div>

      <div className="tradingview-widget-container" ref={containerRef}>
        <div className="tradingview-widget-container__widget" />
      </div>
    </div>
  );
});

MarketOverviewWidget.displayName = 'MarketOverviewWidget';
export default MarketOverviewWidget;
