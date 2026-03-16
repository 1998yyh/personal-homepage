import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dailyReportsApi from '../../lib/daily-report-api';
import type { DailyReportType, DailyReport } from '../../types/daily-report';
import ReportList from './components/ReportList';
import ReportContent from './components/ReportContent';

export default function DailyReportsPage() {
  const [selectedType, setSelectedType] = useState<DailyReportType>('ai');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);

  // 获取日报列表
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['daily-reports', selectedType],
    queryFn: () => dailyReportsApi.getList({ type: selectedType, limit: 30 }),
  });

  // 当列表加载完成且没有选中日报时，自动选中第一个
  useEffect(() => {
    if (reportsData?.items?.length && !selectedReport) {
      setSelectedReport(reportsData.items[0]);
    }
  }, [reportsData, selectedReport]);

  // 切换类型时重置选中
  const handleTypeChange = (type: DailyReportType) => {
    setSelectedType(type);
    setSelectedReport(null);
  };

  return (
    <div className="min-h-screen bg-mesh relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="orb orb-1"></div>
      <div className="orb orb-2"></div>
      <div className="orb orb-3"></div>

      {/* 导航栏 */}
      <nav className="relative z-10 glass-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-display font-bold text-white">Web Tools</span>
            </a>
            <div className="h-6 w-px bg-white/10"></div>
            <span className="text-white/80 font-medium">📰 日报</span>
          </div>

          <a
            href="/"
            className="px-4 py-2 rounded-lg glass text-white/80 hover:text-white hover:bg-white/10 transition-all"
          >
            返回首页
          </a>
        </div>
      </nav>

      {/* 主内容 - 左右布局 */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 h-[calc(100vh-140px)]">
          {/* 左侧：类型筛选 + 日报列表 */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-4">
            {/* 类型筛选 */}
            <div className="glass-dark rounded-2xl p-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleTypeChange('ai')}
                  className={`px-4 py-3 rounded-xl text-left transition-all ${
                    selectedType === 'ai'
                      ? 'bg-gradient-to-r from-primary-500/20 to-cyan-500/20 text-white border border-primary-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg mr-2">🤖</span>
                  AI资讯
                </button>
                <button
                  onClick={() => handleTypeChange('stock')}
                  className={`px-4 py-3 rounded-xl text-left transition-all ${
                    selectedType === 'stock'
                      ? 'bg-gradient-to-r from-primary-500/20 to-cyan-500/20 text-white border border-primary-500/30'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="text-lg mr-2">📈</span>
                  股票资讯
                </button>
              </div>
            </div>

            {/* 日报列表 */}
            <div className="flex-1 glass-dark rounded-2xl p-4 overflow-hidden">
              <h3 className="text-white/40 text-sm font-medium mb-3 px-2">日报列表</h3>
              <ReportList
                reports={reportsData?.items || []}
                selectedReport={selectedReport}
                onSelect={setSelectedReport}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* 右侧：日报内容 */}
          <div className="flex-1 glass-dark rounded-2xl overflow-hidden">
            <ReportContent report={selectedReport} isLoading={isLoading} />
          </div>
        </div>
      </main>
    </div>
  );
}