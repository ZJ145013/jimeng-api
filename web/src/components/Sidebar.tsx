import { PageKey } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Image as ImageIcon,
  Video,
  Clock,
  Settings,
  Sparkles
} from 'lucide-react';
import { cn } from '../utils/cn';

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  isOpen: boolean;
  onClose: () => void;
}

const navItems: Array<{ key: PageKey; label: string; icon: React.ElementType }> = [
  { key: 'dashboard', label: '控制台', icon: LayoutDashboard },
  { key: 'image', label: '图像工作台', icon: ImageIcon },
  { key: 'video', label: '视频工作台', icon: Video },
  { key: 'history', label: '历史画廊', icon: Clock },
  { key: 'settings', label: '系统设置', icon: Settings },
];

export function Sidebar({ activePage, onNavigate, isOpen, onClose }: SidebarProps) {
  return (
    <>
      <AnimatePresence>
        {/* 只在移动端显示的遮罩 */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 lg:top-4 lg:left-4 lg:h-[calc(100%-2rem)]",
          "lg:rounded-2xl glass-card border border-white/10 overflow-hidden",
          "transform transition-transform duration-300 ease-out lg:translate-x-0 flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* 顶部 Logo 区 */}
        <div className="flex items-center gap-3 px-6 h-20 border-b border-white/5 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-fuchsia-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">即梦 AI</h1>
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-semibold mt-0.5">Workspace</p>
          </div>
        </div>

        {/* 导航菜单区 */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto w-full">
          {navItems.map((item) => {
            const isActive = activePage === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  onClose();
                }}
                className={cn(
                  "relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group overflow-hidden outline-none",
                  isActive
                    ? "text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav-bg"
                    className="absolute inset-0 bg-white/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {/* 图标 */}
                <span className={cn(
                  "relative z-10 flex items-center justify-center w-8 h-8 rounded-lg transition-transform duration-300",
                  isActive 
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-md shadow-violet-500/30 text-white" 
                    : "bg-white/5 text-zinc-400 group-hover:bg-white/10 group-hover:text-white group-hover:scale-105"
                )}>
                  <item.icon className="w-4 h-4" />
                </span>

                {/* 文本 */}
                <span className="relative z-10 tracking-wide text-[15px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 底部区 */}
        <div className="mt-auto shrink-0 p-4 border-t border-white/5">
          <div className="w-full h-12 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
            <span className="text-xs text-zinc-500 font-medium tracking-wider uppercase">
              Powered by <span className="text-violet-400 ml-1 font-bold">Jimeng</span>
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
