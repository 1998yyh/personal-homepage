import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const navItems = [
    { path: '/ai-news', label: 'AI资讯', emoji: '🤖', activePattern: /\/ai-news/ },
    { path: '/stock-news', label: '股票资讯', emoji: '📈', activePattern: /\/stock-news/ },
    { path: '/dev-tools', label: '开发工具', emoji: '⚙️', activePattern: /\/dev-tools/ },
    { path: '/novels', label: '小说', emoji: '📚', activePattern: /\/novels/ },
  ];

  return (
    <nav className="relative z-10 glass-dark border-b border-white/5">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-white">Web Tools</span>
          </Link>

          {/* 导航标签 */}
          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
            {navItems.map((item) => {
              const isActive = item.activePattern.test(location.pathname);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-primary-500/30 to-primary-600/30 text-white'
                      : 'hover:bg-white/10 text-white/70 hover:text-white'
                  }`}
                >
                  <span className="text-sm">{item.emoji}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* 用户信息 */}
        {isAuthenticated && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <span className="text-white/80 text-sm hidden sm:block">{user?.username}</span>
            </div>
            <button
              onClick={logout}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              退出
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}