import { useEffect, useState } from 'react';
import { Bookmark, AlertTriangle, Globe, Archive, Lightbulb, FileX, Link2Off, TrendingUp } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import DuplicateList from '@/components/DuplicateList';
import DomainStats from '@/components/DomainStats';
import RecentList from '@/components/RecentList';
import { useBookmarkStore } from '@/store/useBookmarkStore';
import type { CleanupSuggestions } from '@shared/types';
import * as api from '@/lib/api';

export default function Dashboard() {
  const overview = useBookmarkStore(s => s.overview);
  const fetchAll = useBookmarkStore(s => s.fetchAll);
  const loading = useBookmarkStore(s => s.loading);
  const [suggestions, setSuggestions] = useState<CleanupSuggestions | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    api.getCleanupSuggestions().then(setSuggestions).catch(() => {});
  }, [loading]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl font-bold text-primary-800 mb-2">仪表板</h1>
        <p className="text-slate-500">管理你的书签收藏，清理重复链接</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          title="书签总数"
          value={loading ? '...' : overview.totalCount}
          icon={Bookmark}
          accent="primary"
        />
        <StatsCard
          title="重复链接"
          value={loading ? '...' : overview.duplicateCount}
          icon={AlertTriangle}
          accent="red"
          subtitle="需要清理"
        />
        <StatsCard
          title="域名数量"
          value={loading ? '...' : overview.domainCount}
          icon={Globe}
          accent="accent"
        />
        <StatsCard
          title="已归档"
          value={loading ? '...' : overview.archivedCount}
          icon={Archive}
          accent="green"
        />
      </div>

      {suggestions && (
        <div className="card p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-500" />
            <h3 className="font-serif text-lg font-semibold text-slate-800">清理建议</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-3 rounded-lg bg-red-50">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <p className="text-xs text-red-600">重复 URL 组数</p>
              </div>
              <p className="text-2xl font-bold text-red-700">{suggestions.duplicateGroups}</p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50">
              <div className="flex items-center gap-2 mb-1">
                <Archive className="w-4 h-4 text-amber-500" />
                <p className="text-xs text-amber-600">可归档重复项</p>
              </div>
              <p className="text-2xl font-bold text-amber-700">{suggestions.archiveableCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary-50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-primary-500" />
                <p className="text-xs text-primary-600">7天热门域名</p>
              </div>
              {suggestions.topDomains7d.length > 0 ? (
                <div className="space-y-0.5">
                  {suggestions.topDomains7d.map(d => (
                    <p key={d.domain} className="text-xs text-slate-700">
                      <span className="font-medium">{d.domain}</span> ({d.count})
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">近7天无导入</p>
              )}
            </div>
            <div className="p-3 rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-1">
                <FileX className="w-4 h-4 text-slate-500" />
                <p className="text-xs text-slate-600">空标题书签</p>
              </div>
              <p className="text-2xl font-bold text-slate-700">{suggestions.emptyTitleCount}</p>
            </div>
            <div className="p-3 rounded-lg bg-orange-50">
              <div className="flex items-center gap-2 mb-1">
                <Link2Off className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-orange-600">无效 URL</p>
              </div>
              <p className="text-2xl font-bold text-orange-700">{suggestions.invalidUrlCount}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <DuplicateList />
        </div>
        <div className="space-y-6">
          <DomainStats />
          <RecentList />
        </div>
      </div>
    </div>
  );
}
