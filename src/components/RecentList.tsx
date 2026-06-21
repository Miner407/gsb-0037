import { Clock, Link as LinkIcon, FolderOpen, Archive } from 'lucide-react';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function RecentList() {
  const recent = useBookmarkStore(s => s.recent);
  const toggleArchive = useBookmarkStore(s => s.toggleArchive);

  if (recent.length === 0) {
    return (
      <div className="card p-6 h-full">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-accent-500" />
          最近导入
        </h3>
        <p className="text-sm text-slate-500 text-center py-6">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="card p-6 h-full">
      <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-accent-500" />
        最近导入
      </h3>

      <div className="space-y-1 -mx-2">
        {recent.map((bm, index) => (
          <div
            key={bm.id}
            className="group flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50 animate-fade-in transition-colors"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center text-xs font-bold text-primary-700">
              {bm.title.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">{bm.title}</p>
                {bm.archived && <span className="badge bg-slate-200 text-slate-600">已归档</span>}
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span className="truncate">{bm.domain}</span>
                {bm.folder && (
                  <>
                    <span>·</span>
                    <FolderOpen className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{bm.folder}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(bm.importedAt).toLocaleString('zh-CN', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => toggleArchive(bm.id)}
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-primary-600 transition-colors"
                title={bm.archived ? '取消归档' : '归档'}
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <a
                href={bm.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-primary-600 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
