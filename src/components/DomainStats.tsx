import { Globe } from 'lucide-react';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function DomainStats() {
  const domains = useBookmarkStore(s => s.domains);
  const overview = useBookmarkStore(s => s.overview);

  if (domains.length === 0) {
    return (
      <div className="card p-6 h-full">
        <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary-600" />
          域名分布
        </h3>
        <p className="text-sm text-slate-500 text-center py-6">暂无数据</p>
      </div>
    );
  }

  const maxCount = domains[0]?.count || 1;

  return (
    <div className="card p-6 h-full">
      <h3 className="font-serif text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <Globe className="w-5 h-5 text-primary-600" />
        域名分布
        <span className="badge bg-primary-100 text-primary-700 ml-auto">{overview.domainCount} 个</span>
      </h3>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {domains.slice(0, 15).map((d, index) => {
          const width = (d.count / maxCount) * 100;
          const barColor = index < 3 ? 'bg-accent-500' : index < 6 ? 'bg-primary-500' : 'bg-slate-300';
          return (
            <div key={d.domain} className="animate-fade-in" style={{ animationDelay: `${index * 30}ms` }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">{d.domain}</span>
                <span className="text-xs text-slate-500 font-medium">{d.count}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${barColor} rounded-full transition-all duration-500`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {domains.length > 15 && (
        <p className="text-xs text-slate-400 text-center mt-4">仅显示前 15 个域名</p>
      )}
    </div>
  );
}
