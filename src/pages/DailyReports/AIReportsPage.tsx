import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dailyReportsApi from '../../lib/daily-report-api';
import type { DailyReport } from '../../types/daily-report';
import ReportList from './components/ReportList';
import ReportContent from './components/ReportContent';

interface AIReportsPageProps {
  initialReport?: DailyReport | null;
}

export default function AIReportsPage({ initialReport }: AIReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(initialReport || null);

  // 获取AI日报列表
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['daily-reports', 'ai'],
    queryFn: () => dailyReportsApi.getList({ type: 'ai', limit: 30 }),
  });

  // 当列表加载完成且没有选中日报时，自动选中第一个
  useEffect(() => {
    if (reportsData?.items?.length && !selectedReport) {
      setSelectedReport(reportsData.items[0]);
    }
  }, [reportsData, selectedReport]);

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 - AI主题色 */}
      <div className="orb orb-1" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)' }}></div>
      <div className="orb orb-2" style={{ background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)' }}></div>
      <div className="orb orb-3" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%)' }}></div>

      {/* 导航栏 */}
      <nav className="relative z-10 glass-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Web Tools</span>
            </a>
            
            {/* 模块切换标签 */}
            <div className="flex items-center bg-white/5 rounded-full p-1 ml-4">
              <span
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg cursor-default"
              >
                🤖 AI资讯
              </span>
              <a
                href="/stock-news"
                className="px-4 py-1.5 rounded-full text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                📈 股票资讯
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-6 h-[calc(100vh-88px)]">
          {/* 左侧：日报列表 */}
          <div className="w-56 flex-shrink-0 glass-dark rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06]">
              <h3 className="text-white/50 text-xs font-medium uppercase tracking-wider">
                历史日报
              </h3>
            </div>
            <div className="p-2 h-[calc(100%-48px)]">
              <ReportList
                reports={reportsData?.items || []}
                selectedReport={selectedReport}
                onSelect={setSelectedReport}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 右侧：日报内容 */}
          <div className="flex-1 glass-dark rounded-xl overflow-hidden">
            <ReportContent report={selectedReport} isLoading={isLoading} theme="ai" />
          </div>
        </div>
      </main>
    </div>
  );
}