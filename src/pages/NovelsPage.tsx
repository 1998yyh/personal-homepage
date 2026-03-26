import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getNovels } from '../lib/novelsApi';
import type { Novel } from '../types/novel';
import Navbar from '../components/Navbar';

export default function NovelsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['novels'],
    queryFn: () => getNovels(1, 50),
  });

  const novels: Novel[] = data?.items || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-white/60 text-lg">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-red-400 text-lg">加载失败，请稍后重试</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* 导航栏 */}
      <Navbar />

      {/* 主内容 */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* 标题 */}
        <div className="glass-dark rounded-3xl p-8 mb-8">
          <h1 className="text-4xl font-display font-bold text-white mb-2 flex items-center gap-3">
            <span className="text-5xl">📚</span>
            小说书架
          </h1>
          <p className="text-dark-300 text-lg">
            探索精彩故事，开启阅读之旅
          </p>
        </div>

        {/* 小说列表 */}
        {novels.length === 0 ? (
          <div className="glass-dark rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📖</div>
            <p className="text-dark-300">暂无小说</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {novels.map((novel) => (
              <Link
                key={novel.id}
                to={`/novels/${novel.id}`}
                className="group glass-dark rounded-2xl overflow-hidden border border-transparent hover:border-amber-500/30 transition-all duration-300"
              >
                {/* 封面 */}
                <div className="aspect-[3/4] relative overflow-hidden">
                  {novel.coverUrl ? (
                    <img
                      src={novel.coverUrl}
                      alt={novel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                      <span className="text-6xl">📖</span>
                    </div>
                  )}
                  {/* 状态标签 */}
                  <div className="absolute top-2 right-2">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                      novel.status === 1 
                        ? 'bg-emerald-500/80 text-white' 
                        : 'bg-amber-500/80 text-white'
                    }`}>
                      {novel.status === 1 ? '已完结' : '连载中'}
                    </span>
                  </div>
                </div>
                
                {/* 信息 */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-white mb-1 truncate group-hover:text-amber-400 transition-colors">
                    {novel.title}
                  </h3>
                  <p className="text-dark-400 text-sm mb-2">{novel.author}</p>
                  <p className="text-dark-300 text-sm line-clamp-2 mb-3">
                    {novel.description || '暂无简介'}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-dark-400">
                    <span>{(novel.wordCount / 10000).toFixed(1)}万字</span>
                    <span>{novel.chapterCount}章</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}