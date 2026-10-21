import { useMemo, useState } from "react";
import { ExternalLink, Eye, FilePlus2, Pencil, Search } from "lucide-react";
import type { StudioItem } from "../data/studioFixtures";
import type { PageId } from "../content/pageContent";
import {
  DEFAULT_FILTER,
  LIVE_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
  buildOverview,
  filterOverview,
  summarize,
  type OverviewFilter,
  type OverviewRow,
  type RowSource,
  type RowStatus,
  type RowType,
} from "../lib/contentOverview";

const STATUS_CLASS: Record<RowStatus, string> = {
  published: "published",
  draft: "draft",
  archived: "archived",
  default: "draft",
  "needs-migration": "archived",
  exception: "archived",
};

const formatDate = (ms: number | null) => (ms ? new Date(ms).toLocaleString("vi-VN") : "—");

export function ContentOverview({
  items,
  loading,
  loadError,
  onEditItem,
  onOpenPage,
  onCreateDraft,
}: {
  items: StudioItem[];
  loading: boolean;
  loadError: string;
  onEditItem: (item: StudioItem) => void;
  onOpenPage: (pageId: PageId, mode: "edit" | "preview") => void;
  onCreateDraft: (pageId: PageId) => Promise<void>;
}) {
  const [filter, setFilter] = useState<OverviewFilter>(DEFAULT_FILTER);
  const [busy, setBusy] = useState<string | null>(null);
  const rows = useMemo(() => buildOverview(items), [items]);
  const summary = useMemo(() => summarize(rows), [rows]);
  const areas = useMemo(() => [...new Set(rows.map((row) => row.area))], [rows]);
  const visible = useMemo(() => filterOverview(rows, filter), [rows, filter]);
  const hiddenArchived = rows.filter((row) => row.status === "archived" && row.type !== "page").length;
  const set = <K extends keyof OverviewFilter>(key: K, value: OverviewFilter[K]) => setFilter((current) => ({ ...current, [key]: value }));

  const createDraft = async (row: OverviewRow) => {
    if (!row.pageId) return;
    setBusy(row.key);
    try {
      await onCreateDraft(row.pageId);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Tất cả nội dung</span>
          <h2>Mọi nội dung biên tập của website</h2>
          <p>
            Một danh sách duy nhất cho bài viết, hướng dẫn, video, ứng dụng, các trang nội dung và phần còn nằm trong code. Cột “Đang hiển thị” cho biết nội dung công khai
            hiện lấy từ CMS hay từ bản mặc định trong code — bản nháp chưa bao giờ hiển thị công khai.
          </p>
        </div>
      </div>
      {loadError && <div className="page-error" role="alert"><b>{loadError}</b></div>}
      <div className="overview-summary" aria-label="Tóm tắt trạng thái">
        <div><b>{summary.liveCms}</b><span>Đang công khai từ CMS</span></div>
        <div><b>{summary.liveCode}</b><span>Trang dùng mặc định trong code</span></div>
        <div><b>{summary.draft}</b><span>Bản nháp (chưa công khai)</span></div>
        <div><b>{summary["needs-migration"]}</b><span>Cần chuyển vào CMS</span></div>
        <div><b>{summary.exception}</b><span>Chỉ trong code (có chủ đích)</span></div>
        <div><b>{summary.archived}</b><span>Lưu trữ</span></div>
      </div>
      <section className="studio-card overview-card" aria-label="Danh sách nội dung">
        <div className="overview-filters" role="search">
          <label className="overview-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm nội dung</span>
            <input value={filter.query} onChange={(event) => set("query", event.target.value)} placeholder="Tìm theo tiêu đề, đường dẫn, ghi chú…" />
          </label>
          <label>
            <span>Trang</span>
            <select value={filter.area} onChange={(event) => set("area", event.target.value)}>
              <option value="all">Tất cả trang</option>
              {areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
          </label>
          <label>
            <span>Loại</span>
            <select value={filter.type} onChange={(event) => set("type", event.target.value as RowType | "all")}>
              <option value="all">Tất cả loại</option>
              {(Object.keys(TYPE_LABEL) as RowType[]).map((type) => <option key={type} value={type}>{TYPE_LABEL[type]}</option>)}
            </select>
          </label>
          <label>
            <span>Nguồn</span>
            <select value={filter.source} onChange={(event) => set("source", event.target.value as RowSource | "all")}>
              <option value="all">Mọi nguồn</option>
              {(Object.keys(SOURCE_LABEL) as RowSource[]).map((source) => <option key={source} value={source}>{SOURCE_LABEL[source]}</option>)}
            </select>
          </label>
          <label>
            <span>Trạng thái</span>
            <select value={filter.status} onChange={(event) => set("status", event.target.value as RowStatus | "all")}>
              <option value="all">Mọi trạng thái</option>
              {(Object.keys(STATUS_LABEL) as RowStatus[]).map((status) => <option key={status} value={status}>{STATUS_LABEL[status]}</option>)}
            </select>
          </label>
          <label className="overview-check">
            <input type="checkbox" checked={filter.showArchived} onChange={(event) => set("showArchived", event.target.checked)} />
            <span>Hiện mục lưu trữ ({hiddenArchived})</span>
          </label>
        </div>
        <p className="overview-count" role="status" aria-live="polite">
          {loading ? "Đang tải dữ liệu CMS…" : `${visible.length} / ${rows.length} mục`}
        </p>
        <div className="overview-list">
          <div className="overview-row overview-head" aria-hidden="true">
            <span>Nội dung</span><span>Loại · Trang</span><span>Nguồn</span><span>Trạng thái</span><span>Đang hiển thị</span><span>Cập nhật</span><span>Hành động</span>
          </div>
          {visible.map((row) => (
            <article key={row.key} className="overview-row" data-status={row.status} data-source={row.source}>
              <div className="overview-title">
                <b>{row.title}</b>
                {row.publicUrl && <small>{row.publicUrl}</small>}
                {row.note && <small className="overview-note">{row.note}</small>}
              </div>
              <div data-label="Loại · Trang"><span>{TYPE_LABEL[row.type]}</span><small>{row.area}</small></div>
              <div data-label="Nguồn">{SOURCE_LABEL[row.source]}</div>
              <div data-label="Trạng thái"><span className={`status-pill ${STATUS_CLASS[row.status]}`}>{STATUS_LABEL[row.status]}</span></div>
              <div data-label="Đang hiển thị"><span className={`live-pill live-${row.liveFrom}`}>{LIVE_LABEL[row.liveFrom]}</span></div>
              <div data-label="Cập nhật">{formatDate(row.updatedAtMs)}</div>
              <div className="overview-actions">
                {row.item && row.type !== "page" && (
                  <button className="studio-primary" onClick={() => onEditItem(row.item!)} aria-label={`Chỉnh sửa ${row.title}`}><Pencil aria-hidden="true" /> Chỉnh sửa</button>
                )}
                {row.pageId && row.canCreateDraft && (
                  <button className="studio-primary" disabled={busy === row.key} onClick={() => void createDraft(row)} aria-label={`Tạo bản nháp từ mặc định cho ${row.title}`}><FilePlus2 aria-hidden="true" /> Tạo nháp từ mặc định</button>
                )}
                {row.pageId && !row.canCreateDraft && (
                  <button className="studio-primary" onClick={() => onOpenPage(row.pageId!, "edit")} aria-label={`Chỉnh sửa ${row.title}`}><Pencil aria-hidden="true" /> Chỉnh sửa</button>
                )}
                {row.pageId && (
                  <button onClick={() => onOpenPage(row.pageId!, "preview")} aria-label={`Xem trước ${row.title}`}><Eye aria-hidden="true" /> Xem trước</button>
                )}
                {row.item && row.type !== "page" && row.status !== "published" && (
                  <button onClick={() => onEditItem(row.item!)} aria-label={`Xem trước ${row.title}`}><Eye aria-hidden="true" /> Xem trước</button>
                )}
                {row.publicUrl && (row.type === "code" || row.type === "page" || row.status === "published") && (
                  <a href={row.publicUrl} target="_blank" rel="noopener noreferrer" aria-label={`Mở ${row.title} trên website`}><ExternalLink aria-hidden="true" /> Trang công khai</a>
                )}
              </div>
            </article>
          ))}
          {!loading && visible.length === 0 && <div className="manager-empty"><Search /><h3>Không có mục phù hợp</h3><button onClick={() => setFilter(DEFAULT_FILTER)}>Xóa bộ lọc</button></div>}
        </div>
      </section>
    </>
  );
}
