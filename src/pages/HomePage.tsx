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
                className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-indigo-500/20 hover:to-purple-500/20"
              >
                <span className="text-base group-hover:scale-110 transition-transform">🤖</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  AI资讯
                </span>
              </a>
              
              <div className="w-px h-4 bg-white/10"></div>
              
              <a
                href="/stock-news"
                className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-emerald-500/20 hover:to-green-500/20"
              >
                <span className="text-base group-hover:scale-110 transition-transform">📈</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  股票资讯
                </span>
              </a>

              <div className="w-px h-4 bg-white/10"></div>
              
              <a
                href="/dev-tools"
                className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-cyan-500/20 hover:to-blue-500/20"
              >
                <span className="text-base group-hover:scale-110 transition-transform">⚙️</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  开发工具
                </span>
              </a>

              <div className="w-px h-4 bg-white/10"></div>
              
              <a
                href="/novels"
                className="group flex items-center gap-2 px-3 py-2 rounded-full transition-all duration-300 hover:bg-gradient-to-r hover:from-amber-500/20 hover:to-orange-500/20"
              >
                <span className="text-base group-hover:scale-110 transition-transform">📚</span>
                <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">
                  小说
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
          <a
            href="/dev-tools"
            className="group glass-dark rounded-2xl p-6 border border-transparent hover:border-cyan-500/30 transition-all duration-300 relative overflow-hidden"
          >
            {/* 悬浮光效 */}
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-500"></div>
            
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">⚙️</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                开发工具箱
                <svg className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </h3>
              <p className="text-dark-400 text-sm">编码解码 / 格式化 / 转换工具</p>
            </div>
          </a>
        </div>

        {/* 快捷工具 */}
        <div className="glass-dark rounded-2xl p-6">
          <h3 className="text-white/60 text-sm mb-4">常用工具</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
            {[
              { icon: '🔤', name: 'Base64', href: '/dev-tools' },
              { icon: '🔗', name: 'URL', href: '/dev-tools' },
              { icon: '📋', name: 'JSON', href: '/dev-tools' },
              { icon: '⏰', name: '时间戳', href: '/dev-tools' },
              { icon: '🎨', name: '颜色', href: '/dev-tools' },
              { icon: '🔑', name: 'UUID', href: '/dev-tools' },
              { icon: '🔐', name: '密码', href: '/dev-tools' },
              { icon: '✔️', name: 'Hash', href: '/dev-tools' },
            ].map((tool) => (
              <a
                key={tool.name}
                href={tool.href}
                className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/5 transition-colors group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{tool.icon}</span>
                <span className="text-white/50 text-xs group-hover:text-white/80 transition-colors">{tool.name}</span>
              </a>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}