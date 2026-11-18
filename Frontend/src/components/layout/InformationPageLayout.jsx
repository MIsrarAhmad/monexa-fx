import { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore';
import PublicHeader from './PublicHeader';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

export default function InformationPageLayout({ children }) {
  const isUser = useAuthStore((state) => state.isAuthenticated && state.role === 'user');
  const logout = useAuthStore((state) => state.logout);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={`min-h-screen bg-[#060a12] text-slate-100 flex flex-col relative ${isUser ? 'pb-20 md:pb-6' : 'pb-6'}`}>
      {isUser ? (
        <Navbar isMobileSidebarOpen={sidebarOpen} onMobileSidebarToggle={() => setSidebarOpen((open) => !open)} />
      ) : <PublicHeader />}
      <div className="max-w-7xl mx-auto w-full flex gap-6 px-4 py-6 md:px-8 flex-1">
        {isUser && <Sidebar isOpen={sidebarOpen} onCloseSidebar={() => setSidebarOpen(false)} onLogout={logout} />}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
      {isUser && <BottomNav />}
    </div>
  );
}
