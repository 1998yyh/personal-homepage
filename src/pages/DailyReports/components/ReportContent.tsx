import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { DailyReport } from '../../../types/daily-report';

interface ReportContentProps {
  report: DailyReport | null;
  isLoading: boolean;
  theme?: 'ai' | 'stock';
}

export default function ReportContent({ report, isLoading, theme = 'ai' }: ReportContentProps) {
  const themeColors = {
    ai: {
      accent: 'bg-indigo-500',
      text: 'text-indigo-400',
      border: 'border-indigo-500/20',
    },
    stock: {
      accent: 'bg-emerald-500',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
    },
  };

  const colors = themeColors[theme];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-white/10 border-t-white/40 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-white/30 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">📰</div>
          <p className="text-white/30">选择一份日报查看详情</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8 markdown-content">
      {/* 标题 */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white mb-2">{report.title}</h1>
        <p className="text-white/40 text-sm">
          {new Date(report.date).toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Markdown 内容 - 卡片式布局 */}
      <div className="space-y-6">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // 标题
            h1: ({ children }) => (
              <h1 className="text-lg font-semibold text-white mb-6 first:mt-0">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-base font-medium text-white mb-4 mt-6 first:mt-0">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-sm font-medium text-white mb-3 mt-4">{children}</h3>
            ),

            // 段落
            p: ({ children }) => (
              <p className="text-white/70 leading-relaxed text-sm mb-4">{children}</p>
            ),

            // 链接
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${colors.text} hover:opacity-80 underline underline-offset-2 inline-flex items-center gap-1`}
              >
                <span className="text-inherit">{children}</span>
                <svg className="w-3 h-3 opacity-60 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ),

            // 无序列表 - 卡片式
            ul: ({ children }) => (
              <div className="space-y-3 mb-6">{children}</div>
            ),
            
            // 有序列表 - 卡片式
            ol: ({ children }) => (
              <div className="space-y-3 mb-6">{children}</div>
            ),
            
            // 列表项 - 卡片
            li: ({ children }) => (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.05] transition-colors">
                <div className="text-white/80 text-sm leading-relaxed">{children}</div>
              </div>
            ),

            // 分隔线
            hr: () => <hr className="border-white/10 my-6" />,

            // 代码
            pre: ({ children }) => (
              <pre className="bg-white/[0.03] rounded-xl p-4 overflow-x-auto mb-4 border border-white/[0.06]">
                {children}
              </pre>
            ),
            code: ({ className, children }) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-white/10 px-1.5 py-0.5 rounded text-white/80 text-xs">
                  {children}
                </code>
              ) : (
                <code className="text-xs text-white/70">{children}</code>
              );
            },

            // 引用
            blockquote: ({ children }) => (
              <blockquote className={`border-l-2 ${colors.border} pl-4 py-2 my-4 bg-white/[0.02] rounded-r-lg`}>
                {children}
              </blockquote>
            ),

            // 强调
            strong: ({ children }) => (
              <strong className="text-white font-medium">{children}</strong>
            ),
            em: ({ children }) => (
              <em className="text-white/90">{children}</em>
            ),

            // 表格
            table: ({ children }) => (
              <div className="overflow-x-auto mb-6 rounded-xl border border-white/[0.06]">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-white/[0.05]">{children}</thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-white/[0.06]">{children}</tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-white/[0.03] transition-colors">{children}</tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 text-left text-white/90 font-medium whitespace-nowrap">{children}</th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-white/70">{children}</td>
            ),
          }}
        >
          {report.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}