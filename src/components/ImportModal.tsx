import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useBookmarkStore } from '@/store/useBookmarkStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ImportStatus = 'idle' | 'importing' | 'success' | 'error';

export default function ImportModal({ open, onClose }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [result, setResult] = useState<{ success: number; skipped: number; duplicates: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const importBookmarks = useBookmarkStore(s => s.importBookmarks);

  if (!open) return null;

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setResult(null);
    setError(null);
  };

  const handleClose = () => {
    if (status !== 'importing') {
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
    setResult(null);
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

  const handleImport = async () => {
    if (!file) return;
    setStatus('importing');
    setError(null);
    try {
      const r = await importBookmarks(file);
      setResult({ success: r.success, skipped: r.skipped, duplicates: r.duplicates });
      setStatus('success');
    } catch (err: any) {
      setError(err.message || '导入失败');
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
                <button onClick={handleClose} className="btn-secondary" disabled={status === 'importing'}>
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!file || status === 'importing'}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {status === 'importing' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      导入中...
                    </>
                  ) : (
                    '开始导入'
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
