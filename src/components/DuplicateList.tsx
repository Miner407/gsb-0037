import { useState } from 'react';
import { Link as LinkIcon, Archive, Trash2, ChevronDown, ChevronUp, AlertTriangle, Shield } from 'lucide-react';
import type { DuplicateEntry } from '@shared/types';
import { useBookmarkStore } from '@/store/useBookmarkStore';

export default function DuplicateList() {
  const duplicates = useBookmarkStore(s => s.duplicates);
  const batchArchive = useBookmarkStore(s => s.batchArchive);
  const batchDelete = useBookmarkStore(s => s.batchDelete);
  const deduplicateKeepOne = useBookmarkStore(s => s.deduplicateKeepOne);
  const loading = useBookmarkStore(s => s.loading);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirmDedup, setConfirmDedup] = useState<{ keepId: number; entry: DuplicateEntry } | null>(null);

  const toggleExpand = (url: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllInGroup = (entry: DuplicateEntry) => {
    const allSelected = entry.bookmarks.every(b => selected.has(b.id));
    setSelected(prev => {
      const next = new Set(prev);
      entry.bookmarks.forEach(b => {
        if (allSelected) next.delete(b.id);
        else next.add(b.id);
      });
      return next;
    });
  };

  const handleArchive = async () => {
    if (selected.size === 0) return;
    await batchArchive(Array.from(selected), true);
    setSelected(new Set());
  };

  const handleDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`确定删除选中的 ${selected.size} 条书签？此操作不可撤销。`)) return;
    await batchDelete(Array.from(selected));
    setSelected(new Set());
  };

  const handleKeepOne = (keepId: number, entry: DuplicateEntry) => {
    const others = entry.bookmarks.filter(b => b.id !== keepId && !b.archived);
    if (others.length === 0) return;
    setConfirmDedup({ keepId, entry });
  };

  const confirmKeepOne = async () => {
    if (!confirmDedup) return;
    const result = await deduplicateKeepOne(confirmDedup.keepId);
    setConfirmDedup(null);
    if (result.archived > 0) {
      setSelected(new Set());
    }
  };

  if (duplicates.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-green-100 flex items-center justify-center">
          <LinkIcon className="w-6 h-6 text-green-600" />
        </div>
        <p className="font-medium text-slate-700">暂无重复链接</p>
        <p className="text-sm text-slate-500 mt-1">导入书签后，重复的链接会显示在这里</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="font-serif text-lg font-semibold text-slate-800">重复链接</h3>
          <span className="badge bg-red-100 text-red-700">{duplicates.length} 组</span>
        </div>
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">已选 {selected.size} 项</span>
            <button onClick={handleArchive} className="btn-secondary text-xs" disabled={loading}>
              <Archive className="w-3.5 h-3.5" />
              批量归档
            </button>
            <button onClick={handleDelete} className="btn-danger text-xs" disabled={loading}>
              <Trash2 className="w-3.5 h-3.5" />
              删除
            </button>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {duplicates.map((entry) => {
          const isExpanded = expanded.has(entry.url);
          const allSelected = entry.bookmarks.every(b => selected.has(b.id));
          const someSelected = entry.bookmarks.some(b => selected.has(b.id));
          const unarchivedCount = entry.bookmarks.filter(b => !b.archived).length;

          return (
            <div key={entry.url} className="animate-fade-in">
              <div
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer"
                onClick={() => toggleExpand(entry.url)}
              >
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleSelectAllInGroup(entry);
                  }}
                  className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{entry.url}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="badge bg-red-100 text-red-700 mr-2">重复 {entry.count} 次</span>
                    {entry.bookmarks[0]?.folder && <span>文件夹: {entry.bookmarks[0].folder}</span>}
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </div>

              {isExpanded && (
                <div className="bg-slate-50 px-5 py-2 border-t border-slate-100 animate-fade-in">
                  {entry.bookmarks.map((bm) => (
                    <div
                      key={bm.id}
                      className={`flex items-center gap-3 py-2 ${selected.has(bm.id) ? 'bg-primary-50 -mx-2 px-2 rounded-lg' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(bm.id)}
                        onChange={() => toggleSelect(bm.id)}
                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{bm.title}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(bm.importedAt).toLocaleString('zh-CN')}
                          {bm.archived && <span className="badge bg-slate-200 text-slate-600 ml-2">已归档</span>}
                        </p>
                      </div>
                      {!bm.archived && unarchivedCount > 1 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleKeepOne(bm.id, entry); }}
                          className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-primary-600 transition-colors"
                          title="保留此项，归档其余重复项"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                      )}
                      <a
                        href={bm.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="p-1.5 rounded-lg hover:bg-white text-slate-500 hover:text-primary-600 transition-colors"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {confirmDedup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmDedup(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-primary-600" />
              <h4 className="font-medium text-slate-800">确认保留并归档其余项</h4>
            </div>
            <div className="space-y-2 text-sm text-slate-600 mb-4">
              <p>将保留: <span className="font-semibold text-primary-700">{confirmDedup.entry.bookmarks.find(b => b.id === confirmDedup.keepId)?.title}</span></p>
              <p>将归档以下 {confirmDedup.entry.bookmarks.filter(b => b.id !== confirmDedup.keepId && !b.archived).length} 条书签:</p>
              <ul className="space-y-1 pl-4">
                {confirmDedup.entry.bookmarks.filter(b => b.id !== confirmDedup.keepId && !b.archived).map(bm => (
                  <li key={bm.id} className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{bm.title}</span>
                    <span className="ml-1">— {bm.folder || '无文件夹'}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDedup(null)} className="btn-secondary">取消</button>
              <button onClick={confirmKeepOne} className="btn-primary" disabled={loading}>确认归档</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
