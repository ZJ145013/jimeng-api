import { useState, ReactNode } from 'react';
import { PageKey } from '../types';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  children: ReactNode;
}

export function Layout({ activePage, onNavigate, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 relative selection:bg-violet-500/30">
      {/* 现代极简网格背景 */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
        {/* 紫色/蓝色柔和光晕点缀 */}
        <div className="absolute top-0 right-0 -mr-[10%] -mt-[10%] w-[50%] h-[50%] rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-0 -ml-[10%] -mb-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <div className="relative z-10 lg:pl-[17.5rem] flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-4 px-4 h-16 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-white/5 text-zinc-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
              <span className="font-bold text-sm">梦</span>
            </div>
            <span className="font-bold text-white tracking-wide">即梦 AI</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-10 container mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
