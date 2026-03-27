import { PageKey } from '../types';

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: Array<{ key: PageKey; label: string; icon: string }> = [
  { key: 'text2image', label: '文生图', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { key: 'image2image', label: '图生图', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M14 10V4.5a2.5 2.5 0 00-5 0V10m9 4h.01' },
  { key: 'video', label: '视频生成', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { key: 'history', label: '历史记录', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
  { key: 'settings', label: '配置中心', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-40 h-full w-64 lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)] lg:rounded-2xl glass-card transform transition-all duration-300 ease-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30">
            梦
          </div>
          <div>
            <span className="text-lg font-bold text-white text-glow">即梦 AI</span>
            <p className="text-xs text-gray-500">Neon Glass</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => { onNavigate(item.key); onClose(); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group ${
                activePage === item.key
                  ? 'bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 text-white shadow-lg shadow-purple-500/10'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                activePage === item.key
                  ? 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-md shadow-purple-500/30'
                  : 'bg-white/5 group-hover:bg-white/10'
              }`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
              </div>
              {item.label}
              {activePage === item.key && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 shadow-lg shadow-purple-500/50" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5">
          <div className="text-xs text-gray-500 text-center">
            Powered by <span className="text-purple-400">Jimeng API</span>
          </div>
        </div>
      </aside>
    </>
  );
}
