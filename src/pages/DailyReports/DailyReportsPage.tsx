import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dailyReportsApi from '../../lib/daily-report-api';
import type { DailyReportType, DailyReport } from '../../types/daily-report';
import ReportList from './components/ReportList';
import ReportContent from './components/ReportContent';
import Navbar from '../../components/Navbar';

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
      <Navbar />

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