import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArchiveRestore, Loader2, Search, Trash2 } from "lucide-react";
import {
  PURGE_PHRASE,
  TYPE_NAME,
  describeTrashError,
  listTrash,
  purgeFromTrash,
  restoreFromTrash,
  TrashError,
  type TrashEntry,
  type TrashPage,
  type TrashType,
} from "../lib/trashApi";

const STATUS_VI = { draft: "Bản nháp", published: "Đã xuất bản", archived: "Lưu trữ" } as const;
const formatTime = (ms: number) => new Date(ms).toLocaleString("vi-VN");

/** Accessible modal confirmation: focus moves into the dialog, Tab stays inside, Escape cancels (unless busy), focus returns on close. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  error = "",
  confirmDisabled = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  error?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,select,a[href]') ?? []);
    (ref.current?.querySelector<HTMLElement>("[data-autofocus]") ?? focusable()[0])?.focus();
    return () => previous?.focus?.();
  }, []);
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape" && !busy) {
      event.stopPropagation();
      onCancel();
    }
    if (event.key === "Tab") {
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input,textarea,select,a[href]') ?? []);
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };
  return (
    <div className="confirm-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={ref} className={`confirm-dialog ${danger ? "danger" : ""}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} onKeyDown={onKeyDown}>
        <h3 id={titleId}>{title}</h3>
        <div id={descriptionId} className="confirm-body">{children}</div>
        {error && <p className="confirm-error" role="alert">{error}</p>}
        <div className="confirm-actions">
          <button type="button" data-autofocus onClick={onCancel} disabled={busy}>Hủy</button>
          <button type="button" className={danger ? "danger-button" : "studio-primary"} onClick={onConfirm} disabled={busy || confirmDisabled} aria-busy={busy}>
            {busy && <Loader2 className="spin" aria-hidden="true" />} {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

type Dialog =
  | { kind: "restore"; entry: TrashEntry; slug: string; suggestion: string }
  | { kind: "purge"; entry: TrashEntry; typed: string; slug: string };

export function TrashManager({ notify, onChanged }: { notify: (message: string) => void; onChanged: () => void }) {
  const [type, setType] = useState<TrashType | "all">("all");
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<TrashPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => { setApplied(query); setCursors([null]); setPageIndex(0); }, 300);
    return () => window.clearTimeout(handle);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setPage(await listTrash({ type, q: applied, cursor: cursors[pageIndex] ?? null }));
    } catch (error) {
      setLoadError(describeTrashError(error));
    } finally {
      setLoading(false);
    }
  }, [type, applied, cursors, pageIndex]);
  useEffect(() => { void load(); }, [load]);

  const goNext = () => {
    if (!page?.nextCursor) return;
    setCursors((current) => { const next = current.slice(0, pageIndex + 1); next.push(page.nextCursor); return next; });
    setPageIndex((current) => current + 1);
  };
  const resetToFirst = () => { setCursors([null]); setPageIndex(0); };

  const doRestore = async () => {
    if (dialog?.kind !== "restore") return;
    setBusy(true);
    setDialogError("");
    try {
      const slug = dialog.slug.trim() && dialog.slug.trim() !== dialog.entry.slug ? dialog.slug.trim() : undefined;
      const result = await restoreFromTrash(dialog.entry.id, dialog.entry.version, slug);
      setDialog(null);
      notify(`Đã khôi phục "${dialog.entry.title}" về Bản nháp. Nội dung chưa công khai — hãy bấm Xuất bản khi sẵn sàng.${result.missingMediaIds.length ? ` Lưu ý: ${result.missingMediaIds.length} ảnh được tham chiếu không còn trong Thư viện Media.` : ""}`);
      onChanged();
      await load();
    } catch (error) {
      if (error instanceof TrashError && error.code === "slug_conflict") setDialog({ ...dialog, suggestion: error.suggestedSlug ?? "", slug: error.suggestedSlug ?? dialog.slug });
      setDialogError(describeTrashError(error));
    } finally {
      setBusy(false);
    }
  };

  const doPurge = async () => {
    if (dialog?.kind !== "purge") return;
    setBusy(true);
    setDialogError("");
    try {
      await purgeFromTrash(dialog.entry.id, dialog.entry.version, dialog.slug, dialog.typed);
      setDialog(null);
      notify(`Đã xóa vĩnh viễn "${dialog.entry.title}". Ảnh trong Thư viện Media được giữ nguyên.`);
      onChanged();
      if (page && page.items.length === 1 && pageIndex > 0) setPageIndex(pageIndex - 1);
      else await load();
    } catch (error) {
      setDialogError(describeTrashError(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Thùng rác</span>
          <h2>Nội dung đã xóa</h2>
          <p>
            Nội dung ở đây đã biến khỏi website và các danh sách thường, nhưng chưa mất: bạn có thể khôi phục (về <b>Bản nháp</b>, không tự công khai lại).
            Khác với <b>Lưu trữ</b> — nội dung lưu trữ vẫn nằm trong danh sách của từng mục.
          </p>
        </div>
      </div>
      <section className="studio-card trash-card" aria-label="Danh sách Thùng rác">
        <div className="manager-filters">
          <label>
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm trong Thùng rác</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề hoặc slug…" />
          </label>
          <select value={type} onChange={(event) => { setType(event.target.value as TrashType | "all"); resetToFirst(); }} aria-label="Lọc theo loại nội dung">
            <option value="all">Mọi loại</option>
            {(Object.keys(TYPE_NAME) as TrashType[]).map((value) => <option key={value} value={value}>{TYPE_NAME[value]}</option>)}
          </select>
        </div>
        {loadError && <div className="page-error" role="alert"><b>{loadError}</b> <button onClick={() => void load()}>Thử lại</button></div>}
        <p className="overview-count" role="status" aria-live="polite">
          {loading ? "Đang tải Thùng rác…" : page ? `${page.total} mục trong Thùng rác` : ""}
        </p>
        <div className="trash-list">
          {page?.items.map((entry) => (
            <article key={entry.id} className="trash-row">
              <div className="trash-main">
                <b>{entry.title}</b>
                <small>{entry.slug}</small>
              </div>
              <div data-label="Loại"><span>{TYPE_NAME[entry.type]}</span></div>
              <div data-label="Trạng thái trước khi xóa"><span className={`status-pill ${entry.originalStatus}`}>{STATUS_VI[entry.originalStatus]}</span></div>
              <div data-label="Thời điểm xóa">{formatTime(entry.deletedAt)}</div>
              <div className="trash-actions">
                <button className="studio-primary" onClick={() => { setDialogError(""); setDialog({ kind: "restore", entry, slug: entry.slug, suggestion: "" }); }} aria-label={`Khôi phục ${entry.title}`}>
                  <ArchiveRestore aria-hidden="true" /> Khôi phục
                </button>
                <button className="danger-outline" disabled={!page.permanentDeleteEnabled} title={page.permanentDeleteEnabled ? undefined : "Xóa vĩnh viễn đang tắt trên máy chủ"} onClick={() => { setDialogError(""); setDialog({ kind: "purge", entry, typed: "", slug: "" }); }} aria-label={`Xóa vĩnh viễn ${entry.title}`}>
                  <Trash2 aria-hidden="true" /> Xóa vĩnh viễn
                </button>
              </div>
            </article>
          ))}
          {!loading && !loadError && page && page.items.length === 0 && (
            <div className="manager-empty">
              <Trash2 />
              <h3>{applied || type !== "all" ? "Không có mục phù hợp" : "Thùng rác trống"}</h3>
              <p>Nội dung bạn chọn “Xóa bài” sẽ xuất hiện ở đây trước khi bị xóa hẳn.</p>
            </div>
          )}
        </div>
        {page && (page.nextCursor || pageIndex > 0) && (
          <nav className="trash-pager" aria-label="Phân trang Thùng rác">
            <button onClick={() => setPageIndex((current) => Math.max(0, current - 1))} disabled={pageIndex === 0 || loading}>← Trước</button>
            <span>Trang {pageIndex + 1}</span>
            <button onClick={goNext} disabled={!page.nextCursor || loading}>Sau →</button>
          </nav>
        )}
      </section>

      {dialog?.kind === "restore" && (
        <ConfirmDialog title="Khôi phục nội dung?" confirmLabel="Khôi phục về Bản nháp" busy={busy} error={dialogError} onConfirm={() => void doRestore()} onCancel={() => setDialog(null)}>
          <p><b>{dialog.entry.title}</b> ({TYPE_NAME[dialog.entry.type]}) sẽ quay lại danh sách với trạng thái <b>Bản nháp</b>. Nội dung, ảnh và lịch sử chỉnh sửa được giữ nguyên.</p>
          <p>Trạng thái trước khi xóa là <b>{STATUS_VI[dialog.entry.originalStatus]}</b>{dialog.entry.originalStatus === "published" ? " — nội dung sẽ KHÔNG tự công khai lại; bạn cần bấm Xuất bản." : "."}</p>
          {dialog.suggestion && (
            <label className="confirm-field"><span>Slug đã bị dùng. Nhập slug mới:</span>
              <input value={dialog.slug} onChange={(event) => setDialog({ ...dialog, slug: event.target.value })} maxLength={180} />
            </label>
          )}
        </ConfirmDialog>
      )}
      {dialog?.kind === "purge" && (
        <ConfirmDialog
          title="Xóa vĩnh viễn?"
          danger
          confirmLabel="Xóa vĩnh viễn"
          busy={busy}
          error={dialogError}
          confirmDisabled={dialog.typed !== PURGE_PHRASE || dialog.slug !== dialog.entry.slug}
          onConfirm={() => void doPurge()}
          onCancel={() => setDialog(null)}
        >
          <p><b>{dialog.entry.title}</b> sẽ bị xóa hẳn cùng toàn bộ lịch sử chỉnh sửa. <b>Không thể hoàn tác.</b></p>
          <p>Ảnh trong Thư viện Media không bị xóa. Nội dung còn bình luận sẽ bị chặn xóa.</p>
          <label className="confirm-field"><span>Nhập slug <code>{dialog.entry.slug}</code> để xác nhận:</span>
            <input value={dialog.slug} onChange={(event) => setDialog({ ...dialog, slug: event.target.value })} autoComplete="off" spellCheck={false} />
          </label>
          <label className="confirm-field"><span>Gõ <code>{PURGE_PHRASE}</code> để xác nhận:</span>
            <input value={dialog.typed} onChange={(event) => setDialog({ ...dialog, typed: event.target.value })} autoComplete="off" spellCheck={false} />
          </label>
        </ConfirmDialog>
      )}
    </>
  );
}
