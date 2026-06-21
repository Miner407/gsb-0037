import { useEffect } from 'react';
import { Bookmark, AlertTriangle, Globe, Archive } from 'lucide-react';
import StatsCard from '@/components/StatsCard';
import DuplicateList from '@/components/DuplicateList';
import DomainStats from '@/components/DomainStats';
import RecentList from '@/components/RecentList';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function Dashboard() {
  const overview = useBookmarkStore(s => s.overview);
  const fetchAll = useBookmarkStore(s => s.fetchAll);
  const loading = useBookmarkStore(s => s.loading);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

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
