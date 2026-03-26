import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import dailyReportsApi from '../../lib/daily-report-api';
import type { DailyReport } from '../../types/daily-report';
import ReportList from './components/ReportList';
import ReportContent from './components/ReportContent';
import Navbar from '../../components/Navbar';

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
      <Navbar />

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