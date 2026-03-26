import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getNovel, getChapters } from '../lib/novelsApi';
import type { Chapter } from '../types/novel';

export default function NovelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const novelId = Number(id);

  const { data: novel, isLoading: novelLoading, error: novelError } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => getNovel(novelId),
    enabled: !!novelId,
  });

  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', novelId],
    queryFn: () => getChapters(novelId),
    enabled: !!novelId,
  });

  const chapters: Chapter[] = chaptersData?.items || [];

  if (novelLoading || chaptersLoading) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-white/60 text-lg">加载中...</div>
      </div>
    );
  }

  if (novelError || !novel) {
    return (
      <div className="min-h-screen bg-mesh flex items-center justify-center">
        <div className="text-red-400 text-lg">小说不存在或加载失败</div>
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
      <nav className="relative z-10 glass-dark border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-display font-bold text-white">Web Tools</span>
            </Link>
          </div>

          <Link to="/novels" className="px-4 py-2 rounded-lg glass text-white/80 hover:text-white hover:bg-white/10 transition-all">
            ← 返回书架
          </Link>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* 小说信息 */}
        <div className="glass-dark rounded-3xl p-8 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* 封面 */}
            <div className="flex-shrink-0">
              <div className="w-48 h-64 rounded-xl overflow-hidden shadow-2xl">
                {novel.coverUrl ? (
                  <img
                    src={novel.coverUrl}
                    alt={novel.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/30 to-orange-600/30 flex items-center justify-center">
                    <span className="text-8xl">📖</span>
                  </div>
                )}
              </div>
            </div>

            {/* 详情 */}
            <div className="flex-1">
              <h1 className="text-3xl font-display font-bold text-white mb-2">{novel.title}</h1>
              <p className="text-dark-300 mb-4">作者：{novel.author}</p>
              
              {/* 统计信息 */}
              <div className="flex flex-wrap gap-4 mb-6">
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                  novel.status === 1 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {novel.status === 1 ? '✓ 已完结' : '✎ 连载中'}
                </span>
                <span className="px-3 py-1 rounded-lg text-sm text-dark-300 bg-white/5">
                  {(novel.wordCount / 10000).toFixed(1)} 万字
                </span>
                <span className="px-3 py-1 rounded-lg text-sm text-dark-300 bg-white/5">
                  {novel.chapterCount} 章
                </span>
              </div>

              {/* 简介 */}
              <div className="glass rounded-xl p-4 mb-6">
                <h3 className="text-white/80 font-medium mb-2">简介</h3>
                <p className="text-dark-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {novel.description || '暂无简介'}
                </p>
              </div>

              {/* 开始阅读按钮 */}
              {chapters.length > 0 && (
                <Link
                  to={`/novels/${novelId}/chapters/${chapters[0].id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40"
                >
                  <span>开始阅读</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* 章节目录 */}
        <div className="glass-dark rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            章节目录
          </h2>
          
          {chapters.length === 0 ? (
            <div className="text-center py-12 text-dark-400">
              暂无章节
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {chapters.map((chapter) => (
                <Link
                  key={chapter.id}
                  to={`/novels/${novelId}/chapters/${chapter.id}`}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition-all"
                >
                  <span className="text-dark-400 text-sm w-8 text-right">
                    {chapter.chapterOrder}
                  </span>
                  <span className="text-white/80 group-hover:text-amber-400 transition-colors flex-1 truncate">
                    {chapter.title}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}