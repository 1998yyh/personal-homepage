import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getNovel, getChapters, getChapter } from '../lib/novelsApi';

export default function ChapterPage() {
  const { id, chapterId } = useParams<{ id: string; chapterId: string }>();
  const novelId = Number(id);
  const currentChapterId = Number(chapterId);

  // 获取小说信息
  const { data: novel } = useQuery({
    queryKey: ['novel', novelId],
    queryFn: () => getNovel(novelId),
    enabled: !!novelId,
  });

  // 获取章节列表
  const { data: chaptersData } = useQuery({
    queryKey: ['chapters', novelId],
    queryFn: () => getChapters(novelId),
    enabled: !!novelId,
  });

  // 获取当前章节内容
  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ['chapter', novelId, currentChapterId],
    queryFn: () => getChapter(novelId, currentChapterId),
    enabled: !!novelId && !!currentChapterId,
  });

  const chapters = chaptersData?.items || [];
  const currentIndex = chapters.findIndex((c: { id: number }) => c.id === currentChapterId);
  const prevChapter = currentIndex > 0 ? chapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-white/60 text-lg">加载中...</div>
      </div>
    );
  }

  if (error || !chapter) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-red-400 text-lg">章节不存在或加载失败</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-50 bg-[#1a1a1a]/95 backdrop-blur border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            to={`/novels/${novelId}`}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">{novel?.title || '返回目录'}</span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Link to="/novels" className="text-white/40 hover:text-white/80 text-sm transition-colors">
              书架
            </Link>
          </div>
        </div>
      </header>

      {/* 章节内容 */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* 章节标题 */}
        <h1 className="text-2xl font-bold text-white mb-8 text-center">
          {chapter.title}
        </h1>

        {/* 章节内容 - 阅读优化样式 */}
        <article className="prose prose-invert prose-lg max-w-none">
          <div 
            className="text-white/90 leading-[2] text-lg font-serif"
            style={{
              textIndent: '2em',
              letterSpacing: '0.02em',
            }}
            dangerouslySetInnerHTML={{ __html: chapter.content.replace(/\n/g, '<br/>').split('<br/>').map((p: string) => `<p>${p}</p>`).join('') }}
          />
        </article>

        {/* 底部导航 */}
        <nav className="mt-12 pt-8 border-t border-white/10">
          <div className="flex items-center justify-between gap-4">
            {/* 上一章 */}
            {prevChapter ? (
              <Link
                to={`/novels/${novelId}/chapters/${prevChapter.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/5 hover:border-white/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                </svg>
                <span>上一章</span>
              </Link>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/30 cursor-not-allowed">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7" />
                </svg>
                <span>上一章</span>
              </div>
            )}

            {/* 目录 */}
            <Link
              to={`/novels/${novelId}`}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">目录</span>
            </Link>

            {/* 下一章 */}
            {nextChapter ? (
              <Link
                to={`/novels/${novelId}/chapters/${nextChapter.id}`}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all border border-white/5 hover:border-white/10"
              >
                <span>下一章</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </Link>
            ) : (
              <div className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/5 text-white/30 cursor-not-allowed">
                <span>下一章</span>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>

          {/* 章节进度 */}
          <div className="mt-6 text-center text-white/40 text-sm">
            {currentIndex + 1} / {chapters.length}
          </div>
        </nav>
      </main>
    </div>
  );
}