import { useState, useEffect } from 'react';
import { Search, Archive, Trash2, Link as LinkIcon, FolderOpen, Globe, Tag, X, ChevronDown, Calendar } from 'lucide-react';
import type { Bookmark } from '@shared/types';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function Bookmarks() {
  const bookmarks = useBookmarkStore(s => s.bookmarks);
  const domains = useBookmarkStore(s => s.domains);
  const folders = useBookmarkStore(s => s.folders);
  const tags = useBookmarkStore(s => s.tags);
  const fetchBookmarks = useBookmarkStore(s => s.fetchBookmarks);
  const fetchFolders = useBookmarkStore(s => s.fetchFolders);
  const fetchTags = useBookmarkStore(s => s.fetchTags);
  const batchArchive = useBookmarkStore(s => s.batchArchive);
  const batchDelete = useBookmarkStore(s => s.batchDelete);
  const toggleArchive = useBookmarkStore(s => s.toggleArchive);
  const deleteBookmark = useBookmarkStore(s => s.deleteBookmark);
  const loading = useBookmarkStore(s => s.loading);

  const [search, setSearch] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterFolder, setFilterFolder] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterArchived, setFilterArchived] = useState<boolean | undefined>(undefined);
  const [importedAfter, setImportedAfter] = useState('');
  const [importedBefore, setImportedBefore] = useState('');
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [groupByDomain, setGroupByDomain] = useState(true);

  useEffect(() => {
    fetchFolders();
    fetchTags();
  }, [fetchFolders, fetchTags]);

  useEffect(() => {
    const params: Record<string, string | boolean | number> = {};
    if (search) params.search = search;
    if (filterDomain) params.domain = filterDomain;
    if (filterFolder) params.folder = filterFolder;
    if (filterTag) params.tags = filterTag;
    if (filterArchived !== undefined) params.archived = filterArchived;
    if (importedAfter) params.importedAfter = importedAfter;
    if (importedBefore) params.importedBefore = importedBefore;
    fetchBookmarks(params);
  }, [search, filterDomain, filterFolder, filterTag, filterArchived, importedAfter, importedBefore, fetchBookmarks]);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === bookmarks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(bookmarks.map(b => b.id)));
    }
  };

  const handleBatchArchive = async (archived: boolean) => {
    if (selected.size === 0) return;
    await batchArchive(Array.from(selected), archived);
    setSelected(new Set());
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条书签？此操作不可撤销。`)) return;
    await batchDelete(Array.from(selected));
    setSelected(new Set());
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除这条书签？此操作不可撤销。')) return;
    await deleteBookmark(id);
    setSelected(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setFilterDomain('');
    setFilterFolder('');
    setFilterTag('');
    setFilterArchived(undefined);
    setImportedAfter('');
    setImportedBefore('');
  };

  const groupedByDomain: Record<string, Bookmark[]> = {};
  if (groupByDomain) {
    bookmarks.forEach(b => {
      if (!groupedByDomain[b.domain]) groupedByDomain[b.domain] = [];
      groupedByDomain[b.domain].push(b);
    });
  }

  const hasActiveFilters = search || filterDomain || filterFolder || filterTag || filterArchived !== undefined || importedAfter || importedBefore;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-primary-800 mb-1">书签管理</h1>
          <p className="text-slate-500">
            共 {bookmarks.length} 条书签
            {selected.size > 0 && <span className="text-primary-600 ml-2">（已选 {selected.size} 条）</span>}
          </p>
        </div>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <button onClick={() => handleBatchArchive(true)} className="btn-secondary" disabled={loading}>
              <Archive className="w-4 h-4" />
              批量归档
            </button>
            <button onClick={() => handleBatchArchive(false)} className="btn-secondary" disabled={loading}>
              取消归档
            </button>
            <button onClick={handleBatchDelete} className="btn-danger" disabled={loading}>
              <Trash2 className="w-4 h-4" />
              删除
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="搜索标题、URL、文件夹或标签..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-search"
            />
          </div>

          <div className="relative">
            <select
              value={filterDomain}
              onChange={e => setFilterDomain(e.target.value)}
              className="input pr-10 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">全部域名</option>
              {domains.map(d => (
                <option key={d.domain} value={d.domain}>{d.domain} ({d.count})</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterFolder}
              onChange={e => setFilterFolder(e.target.value)}
              className="input pr-10 appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="">全部文件夹</option>
              {folders.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="input pr-10 appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">全部标签</option>
              {tags.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterArchived === undefined ? '' : String(filterArchived)}
              onChange={e => setFilterArchived(e.target.value === '' ? undefined : e.target.value === 'true')}
              className="input pr-10 appearance-none cursor-pointer min-w-[140px]"
            >
              <option value="">全部状态</option>
              <option value="false">未归档</option>
              <option value="true">已归档</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="date"
              value={importedAfter}
              onChange={e => setImportedAfter(e.target.value)}
              className="input min-w-[140px]"
              title="导入开始日期"
            />
            <span className="text-slate-400 text-sm">至</span>
            <input
              type="date"
              value={importedBefore}
              onChange={e => setImportedBefore(e.target.value)}
              className="input min-w-[140px]"
              title="导入结束日期"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={groupByDomain}
              onChange={e => setGroupByDomain(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            按域名分组
          </label>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn-ghost text-xs">
              <X className="w-3.5 h-3.5" />
              清除筛选
            </button>
          )}
        </div>
      </div>

      {bookmarks.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <LinkIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="font-medium text-slate-700 mb-1">
            {hasActiveFilters ? '没有匹配的书签' : '暂无书签'}
          </p>
          <p className="text-sm text-slate-500">
            {hasActiveFilters ? '尝试调整搜索条件或清除筛选' : '点击右上角"导入书签"按钮开始'}
          </p>
        </div>
      ) : groupByDomain ? (
        <div className="space-y-6">
          {Object.entries(groupedByDomain).map(([domain, items]) => (
            <div key={domain} className="card overflow-hidden animate-fade-in">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary-600" />
                <span className="font-medium text-slate-800">{domain}</span>
                <span className="badge bg-primary-100 text-primary-700">{items.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="table-cell w-10">
                        <input
                          type="checkbox"
                          checked={items.every(b => selected.has(b.id))}
                          ref={el => { if (el) el.indeterminate = items.some(b => selected.has(b.id)) && !items.every(b => selected.has(b.id)); }}
                          onChange={() => {
                            const allSelected = items.every(b => selected.has(b.id));
                            setSelected(prev => {
                              const next = new Set(prev);
                              items.forEach(b => {
                                if (allSelected) next.delete(b.id);
                                else next.add(b.id);
                              });
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">标题</th>
                      <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">文件夹</th>
                      <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">标签</th>
                      <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">导入时间</th>
                      <th className="table-cell text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.map(bm => (
                      <BookmarkRow
                        key={bm.id}
                        bookmark={bm}
                        selected={selected.has(bm.id)}
                        onToggle={() => toggleSelect(bm.id)}
                        onToggleArchive={() => toggleArchive(bm.id)}
                        onDelete={() => handleDelete(bm.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white sticky top-0">
                <tr className="border-b border-slate-100">
                  <th className="table-cell w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === bookmarks.length && bookmarks.length > 0}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < bookmarks.length; }}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">标题</th>
                  <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">域名</th>
                  <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">文件夹</th>
                  <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">标签</th>
                  <th className="table-cell text-left text-xs font-medium text-slate-500 uppercase">导入时间</th>
                  <th className="table-cell text-right text-xs font-medium text-slate-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {bookmarks.map(bm => (
                  <BookmarkRow
                    key={bm.id}
                    bookmark={bm}
                    selected={selected.has(bm.id)}
                    onToggle={() => toggleSelect(bm.id)}
                    onToggleArchive={() => toggleArchive(bm.id)}
                    onDelete={() => handleDelete(bm.id)}
                    showDomain
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function BookmarkRow({
  bookmark,
  selected,
  onToggle,
  onToggleArchive,
  onDelete,
  showDomain,
}: {
  bookmark: Bookmark;
  selected: boolean;
  onToggle: () => void;
  onToggleArchive: () => void;
  onDelete: () => void;
  showDomain?: boolean;
}) {
  return (
    <tr className={`hover:bg-slate-50 transition-colors ${selected ? 'bg-primary-50/50' : ''} ${bookmark.archived ? 'opacity-60' : ''}`}>
      <td className="table-cell">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
        />
      </td>
      <td className="table-cell">
        <div className="flex items-center gap-2">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-slate-800 hover:text-primary-600 truncate max-w-[280px]"
          >
            {bookmark.title}
          </a>
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-primary-600 flex-shrink-0"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </a>
          {bookmark.archived && <span className="badge bg-slate-200 text-slate-600">已归档</span>}
        </div>
      </td>
      {showDomain && (
        <td className="table-cell">
          <span className="text-sm text-slate-600 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-slate-400" />
            {bookmark.domain}
          </span>
        </td>
      )}
      <td className="table-cell">
        {bookmark.folder ? (
          <span className="text-sm text-slate-600 flex items-center gap-1">
            <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
            {bookmark.folder}
          </span>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="table-cell">
        {bookmark.tags.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {bookmark.tags.slice(0, 2).map(tag => (
              <span key={tag} className="badge bg-accent-50 text-accent-700">{tag}</span>
            ))}
            {bookmark.tags.length > 2 && (
              <span className="text-xs text-slate-500">+{bookmark.tags.length - 2}</span>
            )}
          </div>
        ) : (
          <span className="text-sm text-slate-400">-</span>
        )}
      </td>
      <td className="table-cell">
        <span className="text-sm text-slate-500">
          {new Date(bookmark.importedAt).toLocaleDateString('zh-CN')}
        </span>
      </td>
      <td className="table-cell text-right">
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={onToggleArchive}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-primary-600 transition-colors"
            title={bookmark.archived ? '取消归档' : '归档'}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
