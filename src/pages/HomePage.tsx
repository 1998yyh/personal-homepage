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
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-display font-bold text-white">Web Tools</span>
          </div>

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

        {/* 信息卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">账户信息</h3>
            <p className="text-dark-400 text-sm">邮箱：{user?.email}</p>
            <p className="text-dark-400 text-sm mt-1">用户名：{user?.username}</p>
          </div>

          <div className="glass-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">注册时间</h3>
            <p className="text-dark-400 text-sm">
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              }) : '-'}
            </p>
          </div>

          <div className="glass-dark rounded-2xl p-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">安全状态</h3>
            <p className="text-green-400 text-sm flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-400"></span>
              账户安全
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}