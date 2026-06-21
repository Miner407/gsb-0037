import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2, Eye } from 'lucide-react';
import { useBookmarkStore } from '@/store/useBookmarkStore';
import type { ImportPreviewResult } from '@shared/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'previewing' | 'confirming' | 'importing' | 'success' | 'error';

export default function ImportModal({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [preview, setPreview] = useState<ImportPreviewResult | null>(null);
  const [result, setResult] = useState<{ success: number; skipped: number; duplicates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importBookmarks = useBookmarkStore(s => s.importBookmarks);
  const previewImport = useBookmarkStore(s => s.previewImport);

  if (!open) return null;

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    if (status !== 'importing' && status !== 'previewing') {
      resetState();
      onClose();
    }
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.html') && !f.name.toLowerCase().endsWith('.htm')) {
      setError('请选择 HTML 格式的书签文件');
      return;
    }
    setError(null);
    setFile(f);
    setPreview(null);
    setResult(null);
    setStatus('idle');
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0] || null);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0] || null);
  };

  const handlePreview = async () => {
    if (!file) return;
    setStatus('previewing');
    setError(null);
    try {
      const p = await previewImport(file);
      setPreview(p);
      setStatus('confirming');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '预览失败';
      setError(msg);
      setStatus('error');
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('importing');
    setError(null);
    try {
      const r = await importBookmarks(file);
      setResult({ success: r.success, skipped: r.skipped, duplicates: r.duplicates });
      setStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '导入失败';
      setError(msg);
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-serif text-xl font-semibold text-primary-800">导入书签</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {status === 'success' ? (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h4 className="font-serif text-xl font-semibold text-slate-800 mb-2">导入完成！</h4>
              <div className="space-y-2 text-sm text-slate-600 mb-6">
                <p>成功导入 <span className="font-semibold text-green-600">{result?.success}</span> 条书签</p>
                <p>跳过重复 <span className="font-semibold text-amber-600">{result?.skipped}</span> 条</p>
                <p>当前共有 <span className="font-semibold text-primary-700">{result?.duplicates}</span> 条重复链接</p>
              </div>
              <button onClick={handleClose} className="btn-primary">
                完成
              </button>
            </div>
          ) : status === 'confirming' && preview ? (
            <div className="animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-primary-600" />
                <h4 className="font-medium text-slate-800">导入预览</h4>
              </div>
              <div className="space-y-3 mb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">预计导入数量</p>
                    <p className="text-lg font-bold text-slate-800">{preview.totalParsed - preview.existingCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-50">
                    <p className="text-xs text-amber-600">已存在 URL 数量</p>
                    <p className="text-lg font-bold text-amber-700">{preview.existingCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-50">
                    <p className="text-xs text-red-600">同批重复 URL</p>
                    <p className="text-lg font-bold text-red-700">{preview.batchDuplicateCount}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary-50">
                    <p className="text-xs text-primary-600">涉及文件夹</p>
                    <p className="text-lg font-bold text-primary-700">{Object.keys(preview.folderStats).length}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">域名统计（前 5）</p>
                  <div className="space-y-1">
                    {Object.entries(preview.domainStats)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([domain, count]) => (
                        <div key={domain} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700 truncate">{domain}</span>
                          <span className="text-slate-500 font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">文件夹统计</p>
                  <div className="space-y-1">
                    {Object.entries(preview.folderStats).map(([folder, count]) => (
                      <div key={folder} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700 truncate">{folder}</span>
                        <span className="text-slate-500 font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button onClick={() => { setPreview(null); setStatus('idle'); }} className="btn-secondary">
                  返回
                </button>
                <button onClick={handleImport} className="btn-primary">
                  确认导入
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-accent-500 bg-accent-50'
                    : file
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".html,.htm"
                  onChange={handleChange}
                  className="hidden"
                />
                {file ? (
                  <div className="animate-fade-in">
                    <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-primary-100 flex items-center justify-center">
                      <FileText className="w-7 h-7 text-primary-600" />
                    </div>
                    <p className="font-medium text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
                    <p className="text-xs text-primary-600 mt-2">点击重新选择文件</p>
                  </div>
                ) : (
                  <div>
                    <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Upload className="w-7 h-7 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-700">拖拽文件到这里</p>
                    <p className="text-sm text-slate-500 mt-1">或点击选择浏览器导出的 HTML 书签文件</p>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-sm text-red-700 animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button onClick={handleClose} className="btn-secondary" disabled={status === 'previewing'}>
                  取消
                </button>
                <button
                  onClick={handlePreview}
                  disabled={!file || status === 'previewing'}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'previewing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      预览中...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" />
                      预览导入
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
