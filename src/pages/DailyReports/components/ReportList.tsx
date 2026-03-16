import type { DailyReport } from '../../../types/daily-report';

interface ReportListProps {
  reports: DailyReport[];
  selectedReport: DailyReport | null;
  onSelect: (report: DailyReport) => void;
  isLoading: boolean;
}

export default function ReportList({ reports, selectedReport, onSelect, isLoading }: ReportListProps) {
  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3">📭</div>
        <p className="text-white/40 text-sm">暂无日报</p>
      </div>
    );
  }

  // 格式化日期显示
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    return { month, day, weekDay };
  };

  return (
    <div className="space-y-1 overflow-y-auto h-full pr-1">
      {reports.map((report) => {
        const { month, day, weekDay } = formatDate(report.date);
        const isSelected = selectedReport?.id === report.id;

        return (
          <button
            key={report.id}
            onClick={() => onSelect(report)}
            className={`w-full text-left transition-all duration-150 group relative py-3 px-3 rounded-lg ${
              isSelected
                ? 'bg-white/[0.08]'
                : 'hover:bg-white/[0.03]'
            }`}
          >
            {/* 日期行 */}
            <div className="flex items-baseline gap-2 mb-1">
              <span className={`text-base font-medium ${isSelected ? 'text-white' : 'text-white/70'}`}>
                {month}月{day}日
              </span>
              <span className={`text-xs ${isSelected ? 'text-white/50' : 'text-white/30'}`}>
                {weekDay}
              </span>
            </div>
            
            {/* 标题预览 */}
            <p className={`text-xs truncate ${isSelected ? 'text-white/60' : 'text-white/30'}`}>
              {report.title}
            </p>
          </button>
        );
      })}
    </div>
  );
}