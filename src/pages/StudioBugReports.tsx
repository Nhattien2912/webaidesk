import { useEffect, useState } from "react";
import { Bug, Download } from "lucide-react";
import {
  CHANNEL_NAME,
  bugReportFacets,
  describeBugReportsError,
  formatBytes,
  listBugReports,
  type BugReportFacets,
  type BugReportFilters,
  type BugReportPage,
} from "../lib/bugReportsApi";

const EMPTY: BugReportFilters = { appVersion: "", channel: "", errorCode: "", worker: "" };
const formatTime = (ms: number) => new Date(ms).toLocaleString("vi-VN");

/** Read-only list of bug reports sent from the desktop app ("Gửi báo lỗi"), newest first, with filters and bundle download. */
export function BugReportsManager() {
  const [filters, setFilters] = useState<BugReportFilters>(EMPTY);
  const [facets, setFacets] = useState<BugReportFacets | null>(null);
  const [cursors, setCursors] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [page, setPage] = useState<BugReportPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { bugReportFacets().then(setFacets).catch(() => setFacets(null)); }, []);

  // Fetch only; the "loading" flag is raised by whoever changes filters/page, so the effect never sets state synchronously.
  useEffect(() => {
    let current = true;
    listBugReports(filters, cursors[pageIndex] ?? null)
      .then((result) => { if (current) { setPage(result); setLoadError(""); } })
      .catch((error: unknown) => { if (current) setLoadError(describeBugReportsError(error)); })
      .finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [filters, cursors, pageIndex, reloadKey]);

  const startLoading = () => { setLoading(true); setLoadError(""); };
  const reload = () => { startLoading(); setReloadKey((value) => value + 1); };
  const resetFilters = (next: BugReportFilters) => {
    startLoading();
    setFilters(next);
    setCursors([null]);
    setPageIndex(0);
  };
  const setFilter = (key: keyof BugReportFilters, value: string) => resetFilters({ ...filters, [key]: value });
  const goPrevious = () => { startLoading(); setPageIndex((current) => Math.max(0, current - 1)); };
  const goNext = () => {
    if (!page?.nextCursor) return;
    startLoading();
    setCursors((current) => { const next = current.slice(0, pageIndex + 1); next.push(page.nextCursor); return next; });
    setPageIndex((current) => current + 1);
  };
  const filtered = Object.values(filters).some(Boolean);

  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Báo lỗi</span>
          <h2>Báo lỗi từ ứng dụng</h2>
          <p>
            Người dùng bấm <b>Gửi báo lỗi</b> trong AI Desk, xem trước rồi mới gửi. Mỗi báo lỗi có một mã <code>BR-XXXXXX</code> mà người dùng có thể gửi cho bạn.
            Gói dữ liệu gốc nằm trong bucket R2 riêng tư, chỉ tải được ở đây.
          </p>
        </div>
      </div>
      <section className="studio-card trash-card" aria-label="Danh sách báo lỗi">
        <div className="manager-filters bug-filters">
          <select value={filters.appVersion} onChange={(event) => setFilter("appVersion", event.target.value)} aria-label="Lọc theo phiên bản">
            <option value="">Mọi phiên bản</option>
            {facets?.appVersions.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
          <select value={filters.channel} onChange={(event) => setFilter("channel", event.target.value)} aria-label="Lọc theo kênh">
            <option value="">Mọi kênh</option>
            {(facets?.channels ?? ["stable", "beta", "dev"]).map((value) => <option key={value} value={value}>{CHANNEL_NAME[value] ?? value}</option>)}
          </select>
          <select value={filters.errorCode} onChange={(event) => setFilter("errorCode", event.target.value)} aria-label="Lọc theo mã lỗi">
            <option value="">Mọi mã lỗi</option>
            {facets?.errorCodes.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
          <select value={filters.worker} onChange={(event) => setFilter("worker", event.target.value)} aria-label="Lọc theo worker">
            <option value="">Mọi worker</option>
            {facets?.workers.map((facet) => <option key={facet.value} value={facet.value}>{facet.value} ({facet.count})</option>)}
          </select>
          {filtered && <button type="button" onClick={() => resetFilters(EMPTY)}>Xóa bộ lọc</button>}
        </div>
        {loadError && <div className="page-error" role="alert"><b>{loadError}</b> <button onClick={reload}>Thử lại</button></div>}
        <p className="overview-count" role="status" aria-live="polite">
          {loading ? "Đang tải báo lỗi…" : page ? `${page.items.length} báo lỗi trên trang ${pageIndex + 1}` : ""}
        </p>
        <div className="trash-list">
          {page?.items.map((report) => (
            <article key={report.id} className="bug-row">
              <div className="trash-main">
                <b><code>{report.id}</code></b>
                <small>{formatTime(report.createdAt)}</small>
              </div>
              <div data-label="Phiên bản"><span>{report.appVersion}</span> <span className="status-pill">{CHANNEL_NAME[report.channel] ?? report.channel}</span></div>
              <div data-label="Hệ điều hành"><small>{report.os}</small></div>
              <div data-label="Mã lỗi" className="bug-chips">
                {report.errorCodes.length ? report.errorCodes.map((code) => <code key={code}>{code}</code>) : <small>—</small>}
              </div>
              <div data-label="Worker" className="bug-chips">
                {report.workers.length ? report.workers.map((name) => <span key={name}>{name}</span>) : <small>—</small>}
              </div>
              <div className="trash-actions">
                <a className="studio-primary bug-download" href={report.bundleUrl} download={`${report.id}.json`} aria-label={`Tải gói dữ liệu ${report.id}`}>
                  <Download aria-hidden="true" /> Tải JSON ({formatBytes(report.bundleBytes)})
                </a>
              </div>
              {report.description && (
                <details className="bug-description">
                  <summary>Mô tả của người dùng</summary>
                  <p>{report.description}</p>
                </details>
              )}
            </article>
          ))}
          {!loading && !loadError && page && page.items.length === 0 && (
            <div className="manager-empty">
              <Bug />
              <h3>{filtered ? "Không có báo lỗi phù hợp" : "Chưa có báo lỗi nào"}</h3>
              <p>Báo lỗi người dùng gửi từ ứng dụng AI Desk sẽ xuất hiện ở đây.</p>
            </div>
          )}
        </div>
        {page && (page.nextCursor || pageIndex > 0) && (
          <nav className="trash-pager" aria-label="Phân trang báo lỗi">
            <button onClick={goPrevious} disabled={pageIndex === 0 || loading}>← Mới hơn</button>
            <span>Trang {pageIndex + 1}</span>
            <button onClick={goNext} disabled={!page.nextCursor || loading}>Cũ hơn →</button>
          </nav>
        )}
      </section>
    </>
  );
}
