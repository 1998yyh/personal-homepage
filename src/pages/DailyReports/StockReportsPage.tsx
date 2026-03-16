import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dailyReportsApi from '../../lib/daily-report-api';
import type { DailyReport } from '../../types/daily-report';
import ReportList from './components/ReportList';
import ReportContent from './components/ReportContent';

interface StockReportsPageProps {
  initialReport?: DailyReport | null;
}

export default function StockReportsPage({ initialReport }: StockReportsPageProps) {
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(initialReport || null);

  // 获取股票日报列表
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['daily-reports', 'stock'],
    queryFn: () => dailyReportsApi.getList({ type: 'stock', limit: 30 }),
  });

  // 当列表加载完成且没有选中日报时，自动选中第一个
  useEffect(() => {
    if (reportsData?.items?.length && !selectedReport) {
      setSelectedReport(reportsData.items[0]);
    }
  }, [reportsData, selectedReport]);

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 - 股票主题色 */}
      <div className="orb orb-1" style={{ background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)' }}></div>
      <div className="orb orb-2" style={{ background: 'radial-gradient(circle, rgba(5, 150, 105, 0.1) 0%, transparent 70%)' }}></div>
      <div className="orb orb-3" style={{ background: 'radial-gradient(circle, rgba(34, 197, 94, 0.08) 0%, transparent 70%)' }}></div>

      {/* 导航栏 */}
      <nav className="relative z-10 glass-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xl font-bold text-white">Web Tools</span>
            </a>
            
            {/* 模块切换标签 */}
            <div className="flex items-center bg-white/5 rounded-full p-1 ml-4">
              <a
                href="/ai-news"
                className="px-4 py-1.5 rounded-full text-sm font-medium text-white/60 hover:text-white transition-colors"
              >
                🤖 AI资讯
              </a>
              <span
                className="px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg cursor-default"
              >
                📈 股票资讯
              </span>
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
            <ReportContent report={selectedReport} isLoading={isLoading} theme="stock" />
          </div>
        </div>
      </main>
    </div>
  );
}