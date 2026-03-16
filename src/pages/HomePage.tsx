import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { user, logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* 导航栏 */}
      <nav className="relative z-10 glass-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-display font-bold text-white">Web Tools</span>
            </a>
            
            {/* 日报入口 - 精致胶囊式设计 */}
            <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
              <a
                href="/ai-news"
                className="group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">🤖</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  AI资讯
                </span>
              </a>
              
              <div className="w-px h-4 bg-white/10"></div>
              
              <a
                href="/stock-news"
                className="group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-green-500/20"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">📈</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  股票资讯
                </span>
              </a>
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm text-dark-200">{user?.username}</p>
              <p className="text-xs text-dark-400">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg glass text-white/80 hover:text-white hover:bg-white/10 transition-all"
            >
              退出登录
            </button>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* 欢迎卡片 */}
        <div className="glass-dark rounded-3xl p-8 mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-4">
            欢迎回来，<span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-cyan-400">{user?.username}</span> 👋
          </h1>
          <p className="text-dark-300 text-lg">
            你的个人工作空间已准备就绪，开始探索吧！
          </p>
        </div>

        {/* 功能卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* AI资讯卡片 */}
          <a
            href="/ai-news"
            className="group glass-dark rounded-2xl p-6 border border-transparent hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden"
          >
            {/* 悬浮光效 */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-all duration-500"></div>
            
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                AI情报早报
                <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <p className="text-dark-400 text-sm">AI / Agent / Claude Code 每日精选</p>
            </div>
          </a>

          {/* 股票资讯卡片 */}
          <a
            href="/stock-news"
            className="group glass-dark rounded-2xl p-6 border border-transparent hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden"
          >
            {/* 悬浮光效 */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 transition-all duration-500"></div>
            
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                股票资讯日报
                <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <p className="text-dark-400 text-sm">A股 / 港股 每日市场精选</p>
            </div>
          </a>

          {/* 安全状态卡片 */}
          <div className="glass-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">安全状态</h3>
            <p className="text-green-400 text-sm flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              账户安全
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}