import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink, FolderOpen, Loader2, FileText } from 'lucide-react';
import { useAppStore } from '../store';

// NOTE: the in-app HTML preview renders the dashboard inside an Electron
// <webview> (an isolated guest process) instead of an `srcdoc` iframe, so
// Chart.js from a CDN + the dashboard's inline scripts run — a webview does NOT
// inherit the app's strict CSP (which would block them in an iframe).

type PreviewResult = {
  ok: boolean;
  kind: 'html' | 'image' | 'pdf' | 'text' | 'unsupported';
  name: string;
  mime?: string;
  dataUrl?: string;
  text?: string;
  error?: string;
};

/**
 * In-app file preview overlay. Opens when the store's `previewFile` is set
 * (e.g. by clicking a generated file link / artifact). Renders HTML in a
 * sandboxed iframe, images/PDF inline, and text as-is. Anything else falls back
 * to an "open externally" action.
 */
export function PreviewPanel() {
  const { t } = useTranslation();
  const previewFile = useAppStore((s) => s.previewFile);
  const setPreviewFile = useAppStore((s) => s.setPreviewFile);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PreviewResult | null>(null);

  const close = () => setPreviewFile(null);

  // Load file content whenever a new preview target is set.
  useEffect(() => {
    if (!previewFile || typeof window === 'undefined' || !window.electronAPI?.preview) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setResult(null);
    window.electronAPI.preview
      .readFile(previewFile.path, previewFile.cwd)
      .then((res) => {
        if (!cancelled) setResult(res as PreviewResult);
      })
      .catch((err) => {
        if (!cancelled) {
          setResult({
            ok: false,
            kind: 'unsupported',
            name: previewFile.path.split(/[\\/]/).pop() || '',
            error: err instanceof Error ? err.message : String(err),
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [previewFile]);

  // Close on Escape.
  useEffect(() => {
    if (!previewFile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewFile]);

  if (!previewFile) {
    return null;
  }

  const name = result?.name || previewFile.path.split(/[\\/]/).pop() || '';

  const openExternally = () => {
    void window.electronAPI?.openFile?.(previewFile.path, previewFile.cwd);
  };
  const showInFolder = () => {
    void window.electronAPI?.showItemInFolder?.(previewFile.path, previewFile.cwd);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={close}
    >
      <div
        className="w-full max-w-5xl h-[85vh] flex flex-col rounded-2xl bg-background border border-border shadow-elevated overflow-hidden animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-muted bg-surface/60">
          <FileText className="w-4 h-4 text-text-muted flex-shrink-0" />
          <span className="flex-1 truncate text-sm font-medium text-text-primary" title={previewFile.path}>
            {name}
          </span>
          <button
            type="button"
            onClick={openExternally}
            title={t('preview.openExternal')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t('preview.openExternal')}</span>
          </button>
          <button
            type="button"
            onClick={showInFolder}
            title={t('preview.showInFolder')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={close}
            title={t('common.close')}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 bg-surface-muted">
          {loading && (
            <div className="h-full flex items-center justify-center gap-2 text-text-muted text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t('preview.loading')}
            </div>
          )}

          {!loading && result?.ok && result.kind === 'image' && (
            <div className="h-full overflow-auto flex items-center justify-center p-4">
              <img src={result.dataUrl} alt={name} className="max-w-full max-h-full object-contain" />
            </div>
          )}

          {!loading && result?.ok && result.kind === 'pdf' && (
            <iframe title={name} src={result.dataUrl} className="w-full h-full border-0 bg-white" />
          )}

          {!loading && result?.ok && result.kind === 'html' && result.text != null && (
            <webview
              src={`data:text/html;charset=utf-8,${encodeURIComponent(result.text)}`}
              className="w-full h-full border-0 bg-white"
              style={{ display: 'flex' }}
            />
          )}

          {!loading && result?.ok && result.kind === 'text' && (
            <pre className="h-full overflow-auto p-4 text-xs leading-relaxed text-text-primary whitespace-pre-wrap break-words font-mono">
              {result.text}
            </pre>
          )}

          {!loading && (!result?.ok || result.kind === 'unsupported') && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-text-muted text-sm px-6 text-center">
              <p>{t('preview.cannotPreview')}</p>
              <button
                type="button"
                onClick={openExternally}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                {t('preview.openExternal')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
