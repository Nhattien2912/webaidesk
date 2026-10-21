import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Box,
  Check,
  ChevronRight,
  FileText,
  GraduationCap,
  Image,
  LayoutDashboard,
  ListChecks,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import type { StudioItem } from "../data/studioFixtures";
import { parseYouTubeId, slugify, type ContentStatus } from "../lib/studio";
import { MarkdownBody } from "../components/MarkdownBody";
import { videoCategories } from "../data/tutorials";
import { PageContentManager, type PageIntent } from "./StudioPageContent";
import { ContentOverview } from "./StudioOverview";
import { ConfirmDialog, TrashManager } from "./StudioTrash";
import { describeTrashError, moveToTrash, type TrashType } from "../lib/trashApi";
import { PAGES, defaultDoc, type PageId } from "../content/pageContent";
import { MARKDOWN_SNIPPETS, buildAppData, buildGuideData, buildVideoData, describeSaveError, formatChangelog, insertAtCursor, joinList, mediaMarkdown, splitList } from "../lib/studioEditor";
import { contentRepository, RepositoryError, type MediaItem } from "../lib/contentRepository";

type Section =
  | "dashboard"
  | "all"
  | "videos"
  | "articles"
  | "guides"
  | "pages"
  | "apps"
  | "comments"
  | "media"
  | "trash"
  | "settings";
const nav: Array<{
  id: Section;
  label: string;
  icon: React.FC<{ className?: string }>;
}> = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "all", label: "Tất cả nội dung", icon: ListChecks },
  { id: "videos", label: "Video", icon: Video },
  { id: "articles", label: "Bài viết", icon: BookOpen },
  { id: "guides", label: "Hướng dẫn", icon: GraduationCap },
  { id: "pages", label: "Trang nội dung", icon: FileText },
  { id: "apps", label: "Ứng dụng", icon: Box },
  { id: "comments", label: "Bình luận", icon: MessageSquare },
  { id: "media", label: "Thư viện Media", icon: Image },
  { id: "trash", label: "Thùng rác", icon: Trash2 },
  { id: "settings", label: "Cài đặt", icon: Settings },
];

function pathSection(path: string): Section {
  const value = path.split("/")[2];
  return nav.some((item) => item.id === value)
    ? (value as Section)
    : "dashboard";
}

function pathEditor(
  path: string,
  items: StudioItem[],
): { type: StudioItem["type"]; item?: StudioItem } | null {
  const section = pathSection(path);
  const type =
    section === "videos"
      ? "video"
      : section === "articles"
        ? "article"
        : section === "guides"
          ? "guide"
          : section === "apps"
            ? "app"
            : null;
  if (!type || (!path.endsWith("/new") && !path.endsWith("/edit"))) return null;
  const id = path.split("/")[3];
  return {
    type,
    item: path.endsWith("/edit")
      ? items.find(
          (candidate) => candidate.id === id && candidate.type === type,
        )
      : undefined,
  };
}

const kindLabel = { video: "Video", article: "Bài viết", guide: "Hướng dẫn", page: "Trang nội dung", app: "Ứng dụng" };
const statusLabel: Record<ContentStatus, string> = {
  draft: "Bản nháp",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

function Notice({ message }: { message: string }) {
  return (
    <div className="studio-toast" role="status" aria-live="polite">
      <Check aria-hidden="true" />
      {message}
    </div>
  );
}

function Dashboard({
  items,
  navigate,
  onEdit,
  onDelete,
}: {
  items: StudioItem[];
  navigate: (section: Section) => void;
  onEdit: (item: StudioItem) => void;
  onDelete: (item: StudioItem) => void;
}) {
  const counts = (type: StudioItem["type"]) =>
    items.filter((item) => item.type === type).length;
  return (
    <>
      <section className="studio-welcome">
        <div>
          <span className="studio-eyebrow">
            <Sparkles aria-hidden="true" /> Workspace nội dung
          </span>
          <h2>Chào mừng đến với AI Desk Studio</h2>
          <p>
            Quản lý nội dung và phát triển hệ sinh thái từ một nơi nhất quán.
          </p>
        </div>
        <div className="studio-orbit" aria-hidden="true">
          <span>AI</span>
        </div>
      </section>
      <section aria-labelledby="overview-title">
        <div className="studio-section-head">
          <div>
            <p>Tổng quan</p>
            <h2 id="overview-title">Nội dung của bạn</h2>
          </div>
          <span className="prototype-label">Dữ liệu CMS (D1)</span>
        </div>
        <div className="metric-grid">
          {(
            [
              ["video", "Video", Video],
              ["article", "Bài viết", FileText],
              ["guide", "Hướng dẫn", GraduationCap],
              ["app", "Ứng dụng", Box],
            ] as const
          ).map(([type, label, Icon]) => (
            <button
              key={type}
              onClick={() =>
                navigate(
                  type === "video"
                    ? "videos"
                    : type === "article"
                      ? "articles"
                      : type === "guide"
                        ? "guides"
                        : "apps",
                )
              }
              className="metric-card"
            >
              <span>
                <Icon aria-hidden="true" />
              </span>
              <strong>{counts(type)}</strong>
              <small>{label}</small>
              <ChevronRight aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
      <section className="studio-grid">
        <div className="studio-card">
          <div className="studio-section-head">
            <div>
              <p>Thao tác nhanh</p>
              <h2>Bắt đầu sáng tạo</h2>
            </div>
          </div>
          <div className="quick-actions">
            <button onClick={() => navigate("all")}>
              <ListChecks />
              <span>
                <b>Xem tất cả nội dung</b>
                <small>Cái gì đang công khai, cái gì chỉ là bản nháp</small>
              </span>
            </button>
            <button onClick={() => navigate("videos")}>
              <Video />
              <span>
                <b>Thêm video</b>
                <small>Liên kết YouTube an toàn</small>
              </span>
            </button>
            <button onClick={() => navigate("articles")}>
              <FileText />
              <span>
                <b>Viết bài mới</b>
                <small>Soạn bằng Markdown</small>
              </span>
            </button>
            <button onClick={() => navigate("guides")}>
              <GraduationCap />
              <span>
                <b>Viết hướng dẫn</b>
                <small>Từng bước, có ảnh minh họa</small>
              </span>
            </button>
            <button onClick={() => navigate("apps")}>
              <Box />
              <span>
                <b>Giới thiệu ứng dụng</b>
                <small>Tạo trang sản phẩm</small>
              </span>
            </button>
          </div>
        </div>
        <div className="studio-card">
          <div className="studio-section-head">
            <div>
              <p>Trạng thái</p>
              <h2>Luồng biên tập</h2>
            </div>
          </div>
          <div className="status-stack">
            {(["draft", "published", "archived"] as ContentStatus[]).map(
              (status) => (
                <div key={status}>
                  <span className={`status-dot ${status}`} />
                  <span>{statusLabel[status]}</span>
                  <b>{items.filter((item) => item.status === status).length}</b>
                </div>
              ),
            )}
          </div>
        </div>
      </section>
      <ContentTable
        title="Nội dung gần đây"
        items={[...items].filter((item) => item.status !== "archived").sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0)).slice(0, 8)}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}

function ContentTable({
  title,
  items,
  onEdit,
  onDelete,
}: {
  title: string;
  items: StudioItem[];
  onEdit?: (item: StudioItem) => void;
  onDelete?: (item: StudioItem) => void;
}) {
  return (
    <section className="studio-card table-card">
      <div className="studio-section-head">
        <div>
          <p>Cập nhật gần đây</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="studio-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nội dung</th>
              <th>Loại</th>
              <th>Trạng thái</th>
              <th>Cập nhật</th>
              <th>
                <span className="sr-only">Hành động</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td>
                  <b>{item.title}</b>
                  <small>{item.category}</small>
                </td>
                <td>{kindLabel[item.type]}</td>
                <td>
                  <span className={`status-pill ${item.status}`}>
                    {statusLabel[item.status]}
                  </span>
                </td>
                <td>{item.updatedAt}</td>
                <td>
                  <button
                    onClick={() => onEdit?.(item)}
                    aria-label={`Chỉnh sửa ${item.title}`}
                  >
                    Chỉnh sửa
                  </button>
                  {onDelete && item.type !== "page" && item.version ? (
                    <button
                      className="row-delete"
                      onClick={() => onDelete(item)}
                      aria-label={`Xóa bài ${item.title}`}
                    >
                      <Trash2 aria-hidden="true" /> Xóa bài
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ListManager({
  section,
  items,
  onNew,
  onEdit,
  onDelete,
}: {
  section: "videos" | "articles" | "guides" | "apps";
  items: StudioItem[];
  onNew: () => void;
  onEdit: (item: StudioItem) => void;
  onDelete: (item: StudioItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const type =
    section === "videos" ? "video" : section === "articles" ? "article" : section === "guides" ? "guide" : "app";
  const filtered = items.filter(
    (item) =>
      item.type === type &&
      item.title.toLowerCase().includes(query.toLowerCase()) &&
      (status === "all" || item.status === status),
  );
  const label =
    section === "videos"
      ? "Video"
      : section === "articles"
        ? "Bài viết"
        : section === "guides"
          ? "Hướng dẫn"
          : "Ứng dụng";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Thư viện nội dung</span>
          <h2>Quản lý {label.toLowerCase()}</h2>
          <p>Tìm kiếm, lọc và chuẩn bị nội dung trước khi xuất bản.</p>
        </div>
        <button className="studio-primary" onClick={onNew}>
          <Plus />
          Tạo {label.toLowerCase()}
        </button>
      </div>
      <div className="studio-card">
        <div className="manager-filters">
          <label>
            <Search />
            <span className="sr-only">Tìm kiếm</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Tìm ${label.toLowerCase()}…`}
            />
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Lọc trạng thái"
          >
            <option value="all">Mọi trạng thái</option>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </div>
        {filtered.length ? (
          <ContentTable
            title={`${filtered.length} mục`}
            items={filtered}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ) : (
          <div className="manager-empty">
            <Search />
            <h3>Không tìm thấy nội dung</h3>
            <p>Thử từ khóa hoặc bộ lọc khác.</p>
          </div>
        )}
      </div>
    </>
  );
}

function Editor({
  type,
  item,
  onBack,
  onSave,
  onDelete,
}: {
  type: StudioItem["type"];
  item?: StudioItem;
  onBack: () => void;
  onSave: (item: StudioItem) => Promise<StudioItem | null>;
  onDelete: (item: StudioItem) => void;
}) {
  const [persistedItem, setPersistedItem] = useState(item);
  const [title, setTitle] = useState(item?.title ?? "");
  const [summary, setSummary] = useState(item?.summary ?? "");
  const [url, setUrl] = useState(String(item?.data?.youtubeId ?? ""));
  const [content, setContent] = useState(item?.bodyMarkdown ?? "");
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState<ContentStatus>(item?.status ?? "draft");
  const videoId = type === "video" ? parseYouTubeId(url) : null;
  const slug = persistedItem?.slug ?? slugify(title);
  const initialData = item?.data ?? {};
  const categoryOptions = useMemo(() => {
    const base =
      type === "video"
        ? videoCategories.filter((c) => c.id !== "all").map((c) => ({ value: c.id, label: c.label }))
        : (type === "article" ? ["Hướng dẫn", "Công nghệ", "Thông báo"] : type === "guide" ? ["Cài đặt", "Bắt đầu", "Quy trình làm việc", "Mẹo & thủ thuật", "Khắc phục sự cố"] : ["Ứng dụng", "Công cụ"]).map((c) => ({ value: c, label: c }));
    const current = item?.category;
    return current && !base.some((o) => o.value === current) ? [{ value: current, label: current }, ...base] : base;
  }, [type, item?.category]);
  const [category, setCategory] = useState(item?.category && item.category !== "" ? item.category : categoryOptions[0]!.value);
  const [tags, setTags] = useState((item?.tags ?? []).join(", "));
  const [seoTitle, setSeoTitle] = useState(item?.seoTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(item?.metaDescription ?? "");
  const [coverMediaId, setCoverMediaId] = useState(String(initialData.coverMediaId ?? ""));
  const [mediaOptions, setMediaOptions] = useState<MediaItem[]>([]);
  const [thumbnailUrl, setThumbnailUrl] = useState(String(initialData.thumbnailUrl ?? ""));
  const [displayOrder, setDisplayOrder] = useState(initialData.displayOrder == null ? "" : String(initialData.displayOrder));
  const [websiteUrl, setWebsiteUrl] = useState(String(initialData.websiteUrl ?? ""));
  const [githubUrl, setGithubUrl] = useState(String(initialData.githubUrl ?? ""));
  const [downloadUrl, setDownloadUrl] = useState(String(initialData.downloadUrl ?? ""));
  const [documentationUrl, setDocumentationUrl] = useState(String(initialData.documentationUrl ?? ""));
  const [currentVersion, setCurrentVersion] = useState(String(initialData.currentVersion ?? ""));
  const [platforms, setPlatforms] = useState(joinList(initialData.platforms, ", "));
  const [features, setFeatures] = useState(joinList(initialData.features, "\n"));
  const [changelog, setChangelog] = useState(formatChangelog(initialData.changelog));
  const [guideOrder, setGuideOrder] = useState(initialData.order == null ? "" : String(initialData.order));
  const [guideVersion, setGuideVersion] = useState(String(initialData.version ?? ""));
  const [guidePlatform, setGuidePlatform] = useState(String(initialData.platform ?? ""));
  const [relatedVideos, setRelatedVideos] = useState<string[]>(Array.isArray(initialData.relatedVideoSlugs) ? (initialData.relatedVideoSlugs as unknown[]).filter((v): v is string => typeof v === "string") : []);
  const [videoChoices, setVideoChoices] = useState<StudioItem[]>([]);
  const [insertMediaId, setInsertMediaId] = useState("");
  const [uploading, setUploading] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [formError, setFormError] = useState("");
  useEffect(() => {
    if (type !== "guide") return;
    let active = true;
    contentRepository.list("video").then((values) => { if (active) setVideoChoices(values.filter((v) => v.status !== "archived")); }).catch(() => undefined);
    return () => { active = false; };
  }, [type]);
  const insertSnippet = (snippet: string) => {
    const area = bodyRef.current;
    const start = area?.selectionStart ?? content.length;
    const end = area?.selectionEnd ?? content.length;
    const next = insertAtCursor(content, start, end, snippet);
    setContent(next.text);
    window.setTimeout(() => { area?.focus(); area?.setSelectionRange(next.cursor, next.cursor); }, 0);
  };
  const insertUpload = async (file: File | undefined) => {
    if (!file) return;
    setFormError("");
    setUploading(true);
    try {
      const media = await contentRepository.uploadMedia(file, file.name.replace(/\.[^.]+$/, ""));
      setMediaOptions((current) => [media, ...current]);
      insertSnippet(mediaMarkdown(media.id, media.altText));
    } catch (error) {
      setFormError(error instanceof RepositoryError ? `Tải ảnh thất bại: ${error.code === "unsupported_media_type" ? "chỉ hỗ trợ PNG, JPEG hoặc WebP" : error.code === "media_too_large" ? "ảnh vượt quá 5 MB" : error.code}` : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };
  useEffect(() => {
    if (type === "video") return;
    let active = true;
    contentRepository.listMedia().then((values) => { if (active) setMediaOptions(values); }).catch(() => undefined);
    return () => { active = false; };
  }, [type]);
  const save = async (next: ContentStatus) => {
    if (!title.trim()) return;
    setFormError("");
    let data: Record<string, unknown>;
    if (type === "video") {
      data = buildVideoData(persistedItem?.data, { youtubeId: videoId, thumbnailUrl, displayOrder });
    } else if (type === "app") {
      const built = buildAppData(persistedItem?.data, { websiteUrl, githubUrl, downloadUrl, documentationUrl, currentVersion, platforms, features, changelog });
      if (!built.ok) {
        setFormError(`Changelog dòng ${built.changelogLine} sai định dạng: phiên bản | YYYY-MM-DD | ghi chú.`);
        return;
      }
      data = built.data;
    } else if (type === "guide") {
      data = buildGuideData(persistedItem?.data, { coverMediaId, order: guideOrder, version: guideVersion, platform: guidePlatform, relatedVideoSlugs: relatedVideos });
    } else {
      data = { ...(persistedItem?.data ?? {}), coverMediaId };
    }
    const saved = await onSave({
      ...persistedItem,
      id: persistedItem?.id ?? `${type}-${Date.now()}`,
      type,
      slug,
      title: title.trim(),
      summary,
      bodyMarkdown: content,
      status: next,
      category,
      tags: splitList(tags, /,/),
      seoTitle: seoTitle.trim() || title.trim(),
      metaDescription: metaDescription.trim() || summary,
      updatedAt: "Vừa xong",
      data,
    });
    if (saved) {
      setPersistedItem(saved);
      setStatus(saved.status);
    }
  };
  return (
    <>
      <button className="editor-back" onClick={onBack}>
        <ArrowLeft />
        Quay lại danh sách
      </button>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">
            {persistedItem ? "Chỉnh sửa" : "Nội dung mới"}
          </span>
          <h2>
            {type === "video"
              ? "Video Editor"
              : type === "article"
                ? "Article Editor"
                : type === "guide"
                  ? "Guide Editor"
                  : "Product Editor"}
          </h2>
          <p>{import.meta.env.VITE_CMS_API_ENABLED === "true" ? "Thay đổi được lưu vào D1 sau khi server xác nhận." : "Dữ liệu xem trước của giao diện."}</p>
        </div>
        <span className={`status-pill ${status}`}>{statusLabel[status]}</span>
      </div>
      <div className="editor-layout">
        <div className="studio-card editor-main">
          <div className="editor-tabs">
            <button
              className={!preview ? "active" : ""}
              onClick={() => setPreview(false)}
            >
              Chỉnh sửa
            </button>
            <button
              className={preview ? "active" : ""}
              onClick={() => setPreview(true)}
            >
              Xem trước
            </button>
          </div>
          {preview ? (
            <div className="preview-card">
              <span className="content-kicker">Bản xem trước</span>
              <h3>{title || "Tiêu đề nội dung"}</h3>
              <p>{summary || "Mô tả ngắn sẽ xuất hiện tại đây."}</p>
              {videoId && (
                <img
                  src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
                  alt="Thumbnail YouTube preview"
                />
              )}
              <div className="preview-body">
                {content ? (
                  <MarkdownBody mediaBase="/api/admin/media">{content}</MarkdownBody>
                ) : (
                  "Nội dung xem trước chưa có."
                )}
              </div>
            </div>
          ) : (
            <div className="form-stack">
              {type === "video" && (
                <label>
                  URL YouTube
                  <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=…"
                  />
                  <small className={url && !videoId ? "field-error" : ""}>
                    {url
                      ? videoId
                        ? `Video ID: ${videoId}`
                        : "URL YouTube không hợp lệ"
                      : "Hỗ trợ watch, youtu.be, shorts và embed."}
                  </small>
                </label>
              )}
              <label>
                {type === "app" ? "Tên sản phẩm" : "Tiêu đề"}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề…"
                />
                <small>Slug: {slug || "tự-động-tạo"}</small>
              </label>
              <label>
                {type === "app" ? "Tagline" : "Mô tả ngắn"}
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                />
              </label>
              {(type === "article" || type === "guide") && (
                <div className="md-toolbar" role="toolbar" aria-label="Công cụ Markdown">
                  {MARKDOWN_SNIPPETS.filter((s) => type === "guide" || s.id === "code").map((s) => (
                    <button type="button" key={s.id} onClick={() => insertSnippet(s.markdown)}>{s.label}</button>
                  ))}
                  <select aria-label="Chọn ảnh từ Thư viện Media" value={insertMediaId} onChange={(e) => setInsertMediaId(e.target.value)}>
                    <option value="">Ảnh từ thư viện…</option>
                    {mediaOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.altText || m.id}</option>
                    ))}
                  </select>
                  <button type="button" disabled={!insertMediaId} onClick={() => { const m = mediaOptions.find((x) => x.id === insertMediaId); if (m) insertSnippet(mediaMarkdown(m.id, m.altText)); }}>Chèn ảnh</button>
                  <label className="md-upload">
                    {uploading ? "Đang tải…" : "Tải ảnh lên & chèn"}
                    <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => { void insertUpload(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                </div>
              )}
              <label>
                {type === "article" || type === "guide"
                  ? "Nội dung Markdown"
                  : "Mô tả chi tiết (Markdown)"}
                <textarea
                  ref={bodyRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={type === "guide" ? 16 : 10}
                  placeholder={
                    type === "article" || type === "guide" ? "## Bắt đầu viết…" : "Nhập nội dung…"
                  }
                />
              </label>
              {type === "video" && (
                <div className="form-grid">
                  <label>
                    Thumbnail (tuỳ chọn, chỉ i.ytimg.com)
                    <input value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://i.ytimg.com/vi/…/hqdefault.jpg" />
                    <small>Để trống để dùng thumbnail YouTube tự động.</small>
                  </label>
                  <label>
                    Thứ tự hiển thị
                    <input inputMode="numeric" value={displayOrder} onChange={(e) => setDisplayOrder(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0–10000" />
                  </label>
                </div>
              )}
              {type === "guide" && (
                <>
                  <p className="editor-subhead">Thông tin hướng dẫn</p>
                  <div className="form-grid">
                    <label>
                      Thứ tự hiển thị (nhỏ hơn hiện trước)
                      <input inputMode="numeric" value={guideOrder} onChange={(e) => setGuideOrder(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0–9999" />
                    </label>
                    <label>
                      Phiên bản AI Desk áp dụng
                      <input value={guideVersion} onChange={(e) => setGuideVersion(e.target.value)} placeholder="0.3.0" maxLength={40} />
                    </label>
                    <label>
                      Nền tảng
                      <input value={guidePlatform} onChange={(e) => setGuidePlatform(e.target.value)} placeholder="Windows" maxLength={80} />
                    </label>
                  </div>
                  <fieldset className="related-videos">
                    <legend>Video liên quan (chọn từ mục Video, tối đa 6)</legend>
                    {videoChoices.length === 0 ? <small>Chưa có video nào trong Studio.</small> : null}
                    {videoChoices.map((v) => (
                      <label key={v.id} className="check-row">
                        <input
                          type="checkbox"
                          checked={relatedVideos.includes(v.slug ?? "")}
                          disabled={!relatedVideos.includes(v.slug ?? "") && relatedVideos.length >= 6}
                          onChange={(e) => setRelatedVideos((current) => (e.target.checked ? [...current, v.slug ?? ""] : current.filter((slug) => slug !== v.slug)))}
                        />
                        <span>{v.title}{v.status !== "published" ? ` (${statusLabel[v.status]} — chỉ hiện công khai khi video được xuất bản)` : ""}</span>
                      </label>
                    ))}
                  </fieldset>
                </>
              )}
              {(type === "article" || type === "guide") && (
                <label>
                  Ảnh bìa (từ Thư viện Media)
                  <select value={coverMediaId} onChange={(e) => setCoverMediaId(e.target.value)}>
                    <option value="">Không có ảnh bìa</option>
                    {mediaOptions.map((m) => (
                      <option key={m.id} value={m.id}>{m.altText || m.id}</option>
                    ))}
                    {coverMediaId && !mediaOptions.some((m) => m.id === coverMediaId) && <option value={coverMediaId}>{coverMediaId}</option>}
                  </select>
                </label>
              )}
              {type === "app" && (
                <>
                  <p className="editor-subhead">Thông tin ứng dụng</p>
                  <div className="form-grid">
                    <label>
                      Phiên bản hiện tại
                      <input value={currentVersion} onChange={(e) => setCurrentVersion(e.target.value)} placeholder="1.0.0" maxLength={40} />
                    </label>
                    <label>
                      Nền tảng (phân tách bằng dấu phẩy)
                      <input value={platforms} onChange={(e) => setPlatforms(e.target.value)} placeholder="Windows" />
                    </label>
                    <label>
                      Link tải xuống (HTTPS, host được duyệt)
                      <input value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://" />
                    </label>
                    <label>
                      Link tài liệu
                      <input value={documentationUrl} onChange={(e) => setDocumentationUrl(e.target.value)} placeholder="https://" />
                    </label>
                    <label>
                      Website
                      <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://" />
                    </label>
                    <label>
                      GitHub
                      <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" />
                    </label>
                  </div>
                  <label>
                    Tính năng (mỗi dòng một mục)
                    <textarea value={features} onChange={(e) => setFeatures(e.target.value)} rows={4} />
                  </label>
                  <label>
                    Changelog (mỗi dòng: phiên bản | YYYY-MM-DD | ghi chú)
                    <textarea value={changelog} onChange={(e) => setChangelog(e.target.value)} rows={5} placeholder="1.0.0 | 2026-10-20 | Bản phát hành đầu tiên" />
                  </label>
                </>
              )}
              {formError && <small className="field-error" role="alert">{formError}</small>}
            </div>
          )}
        </div>
        <aside className="studio-card editor-side">
          <h3>Thiết lập xuất bản</h3>
          <label>
            Trạng thái
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContentStatus)}
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Đã xuất bản</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </label>
          <label>
            Danh mục
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categoryOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label>
            Tags
            <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="AI, workflow…" />
          </label>
          <label>
            SEO title
            <input value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title} maxLength={180} />
          </label>
          <label>
            Meta description
            <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder={summary} rows={3} maxLength={300} />
          </label>
          <div className="editor-actions">
            <button onClick={() => save("draft")}>Lưu nháp</button>
            <button
              className="studio-primary"
              onClick={() => save("published")}
              disabled={!title.trim() || (type === "video" && !videoId)}
            >
              Xuất bản
            </button>
            <button onClick={() => save("archived")}>
              <Archive />
              Lưu trữ
            </button>
          </div>
          {persistedItem?.version ? (
            <div className="editor-danger-zone">
              <h4>Xóa nội dung</h4>
              <p>Chuyển vào Thùng rác: nội dung biến khỏi website ngay nhưng có thể khôi phục. Khác với “Lưu trữ”.</p>
              <button type="button" className="danger-outline" onClick={() => onDelete(persistedItem)}>
                <Trash2 aria-hidden="true" /> Xóa bài
              </button>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

function MediaLibrary({ notify }: { notify: (message: string) => void }) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [altText, setAltText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    contentRepository.listMedia().then((values) => {
      if (active) { setItems(values); setSelected(values[0] ?? null); }
    }).catch(() => { if (active) notify("Không thể tải thư viện Media."); });
    return () => { active = false; };
  }, [notify]);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const item = await contentRepository.uploadMedia(file, altText.trim());
      setItems((current) => [item, ...current]);
      setSelected(item);
      setAltText("");
      notify("Ảnh đã được lưu vào R2 và ghi nhận trong CMS.");
    } catch (error) {
      notify(error instanceof RepositoryError ? `Upload thất bại: ${error.code}` : "Upload thất bại.");
    } finally { setBusy(false); }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Kho dùng chung</span>
          <h2>Thư viện Media</h2>
          <p>Ảnh được kiểm tra định dạng, lưu vào R2 và ghi metadata trong D1.</p>
        </div>
        <label className="studio-primary">
          <Upload />
          {busy ? "Đang tải…" : "Tải ảnh lên"}
          <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
      </div>
      <div className="media-layout">
        <div className="studio-card media-grid">
          {items.map((media) => (
            <button
              key={media.id}
              className={selected?.id === media.id ? "selected" : ""}
              onClick={() => setSelected(media)}
            >
              <span><img src={media.url} alt="" /></span>
              <b>{media.altText || media.id}</b>
              <small>{media.width} × {media.height}</small>
            </button>
          ))}
          {!items.length && <p>Chưa có ảnh nào trong thư viện.</p>}
        </div>
        <aside className="studio-card media-detail">
          {selected ? <img src={selected.url} alt={selected.altText} /> : <div><Image /></div>}
          <h3>{selected?.altText || "Ảnh mới"}</h3>
          <dl>
            <div>
              <dt>Định dạng</dt>
              <dd>{selected?.mime ?? "JPEG, PNG hoặc WebP"}</dd>
            </div>
            <div>
              <dt>Kích thước</dt>
              <dd>{selected ? `${selected.width} × ${selected.height}` : "Tối đa 12000 × 12000"}</dd>
            </div>
            <div>
              <dt>Dung lượng</dt>
              <dd>{selected ? `${Math.ceil(selected.bytes / 1024)} KB` : "Tối đa 5 MB"}</dd>
            </div>
          </dl>
          <label>
            Alt text
            <input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={500} placeholder="Mô tả ảnh trước khi tải lên" />
          </label>
          {selected && <button onClick={() => { void navigator.clipboard.writeText(selected.url); notify("Đã sao chép URL Media."); }}>Sao chép URL</button>}
        </aside>
      </div>
    </>
  );
}

type AdminComment = {
  id: string;
  displayName: string;
  body: string;
  contentTitle: string;
  status: string;
  createdAt: number;
  version: number;
};
function CommentsManager({ notify }: { notify: (message: string) => void }) {
  const [items, setItems] = useState<AdminComment[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("pending");
  const load = useCallback(() =>
    fetch(`/api/admin/comments?status=${filter}`)
      .then((r) => r.json())
      .then(
        (v: {
          data?: AdminComment[];
          meta?: { stats: Record<string, number> };
        }) => {
          setItems(v.data ?? []);
          setStats(v.meta?.stats ?? {});
        },
      ), [filter]);
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (item: AdminComment, status: string) => {
    const session = (await fetch("/api/admin/session").then((r) =>
      r.json(),
    )) as { data: { csrfToken: string } };
    const response = await fetch(`/api/admin/comments/${item.id}`, {
      method: status === "deleted" ? "DELETE" : "PATCH",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": session.data.csrfToken,
      },
      body: JSON.stringify(
        status === "deleted"
          ? { version: item.version }
          : { status, version: item.version },
      ),
    });
    if (response.ok) {
      notify("Đã cập nhật bình luận trong D1.");
      void load();
    } else notify("Không thể cập nhật bình luận.");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Kiểm duyệt</span>
          <h2>Bình luận</h2>
          <p>Chỉ bình luận được duyệt mới xuất hiện công khai.</p>
        </div>
      </div>
      <div className="metric-grid">
        {(["pending", "approved", "rejected", "hidden"] as const).map(
          (status) => (
            <button
              className="metric-card"
              key={status}
              onClick={() => setFilter(status)}
            >
              <strong>{stats[status] ?? 0}</strong>
              <small>{status}</small>
            </button>
          ),
        )}
      </div>
      <div className="studio-card">
        {items.length ? (
          items.map((item) => (
            <article className="comment-admin-row" key={item.id}>
              <div>
                <b>{item.displayName}</b>
                <small>{item.contentTitle}</small>
                <p>{item.body}</p>
              </div>
              <div>
                <button onClick={() => act(item, "approved")}>Duyệt</button>
                <button onClick={() => act(item, "rejected")}>Từ chối</button>
                {item.status === "approved" && <button onClick={() => act(item, "hidden")}>Ẩn</button>}
                <button
                  aria-label="Xóa mềm"
                  onClick={() =>
                    confirm("Xóa mềm bình luận này?") && act(item, "deleted")
                  }
                >
                  <Trash2 />
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="manager-empty">
            <MessageSquare />
            <h3>Không có bình luận</h3>
          </div>
        )}
      </div>
    </>
  );
}

export const StudioPage: React.FC = () => {
  const [section, setSection] = useState<Section>(() =>
    pathSection(window.location.pathname),
  );
  const [drawer, setDrawer] = useState(false);
  const [items, setItems] = useState<StudioItem[]>([]);
  const [editor, setEditor] = useState<{
    type: StudioItem["type"];
    item?: StudioItem;
  } | null>(() => pathEditor(window.location.pathname, []));
  const [notice, setNotice] = useState("");
  const title = nav.find((item) => item.id === section)?.label ?? "Tổng quan";
  const notify = useCallback((message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }, []);
  const [pageIntent, setPageIntent] = useState<PageIntent | null>(null);
  const [deleting, setDeleting] = useState<StudioItem | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [allState, setAllState] = useState<{ loading: boolean; error: string }>({ loading: true, error: "" });
  const refreshAll = useCallback(async () => {
    try {
      const types: StudioItem["type"][] = ["article", "guide", "video", "app", "page"];
      const lists = await Promise.all(types.map((type) => contentRepository.list(type)));
      setItems(lists.flat());
      setAllState({ loading: false, error: "" });
    } catch (error) {
      setAllState({ loading: false, error: error instanceof RepositoryError ? `Không tải đủ dữ liệu CMS (API ${error.status}: ${error.code}).` : "Không tải được dữ liệu CMS." });
    }
  }, []);
  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);
  const openPage = (pageId: PageId, mode: "edit" | "preview") => {
    setPageIntent({ pageId, mode, nonce: Date.now() });
    setSection("pages");
    setEditor(null);
    setDrawer(false);
    window.history.replaceState({}, "", "/admin/pages");
  };
  const editItem = (item: StudioItem) => {
    if (item.type === "page") {
      openPage((item.slug as PageId) ?? "install", "edit");
      return;
    }
    const next: Section = item.type === "video" ? "videos" : item.type === "article" ? "articles" : item.type === "guide" ? "guides" : "apps";
    setSection(next);
    setDrawer(false);
    window.history.replaceState({}, "", `/admin/${next}`);
    setEditor({ type: item.type, item });
  };
  const createDraftFromDefault = async (pageId: PageId) => {
    const page = PAGES[pageId];
    try {
      await contentRepository.save({ id: `page-${pageId}`, type: "page", slug: pageId, title: page.title, summary: "", bodyMarkdown: "", category: "Trang nội dung", tags: [], status: "draft", seoTitle: "", metaDescription: "", featured: false, data: { section: "page", page: { draft: defaultDoc(page), published: null } }, updatedAt: "" });
      await refreshAll();
      notify("Đã tạo bản nháp từ nội dung mặc định. Website công khai chưa thay đổi.");
      openPage(pageId, "preview");
    } catch (error) {
      notify(error instanceof RepositoryError ? describeSaveError(error.status, error.code, error.fields) : "Lỗi mạng — chưa tạo được bản nháp.");
    }
  };
  const requestDelete = (item: StudioItem) => {
    if (item.type === "page" || !item.version) return;
    setDeleteError("");
    setDeleting(item);
  };
  const confirmDelete = async () => {
    if (!deleting?.version) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await moveToTrash(deleting.type as TrashType, deleting.id, deleting.version);
      setItems((current) => current.filter((item) => item.id !== deleting.id));
      setEditor(null);
      setDeleting(null);
      notify(`Đã chuyển "${deleting.title}" vào Thùng rác. Bạn có thể khôi phục trong mục Thùng rác.`);
    } catch (error) {
      setDeleteError(describeTrashError(error));
    } finally {
      setDeleteBusy(false);
    }
  };
  const navigate = (next: Section) => {
    setSection(next);
    setPageIntent(null);
    setEditor(null);
    setDrawer(false);
    const path = next === "dashboard" ? "/admin" : `/admin/${next}`;
    window.history.replaceState({}, "", path);
  };
  useEffect(() => {
    const type =
      section === "videos"
        ? "video"
        : section === "articles"
          ? "article"
          : section === "guides"
            ? "guide"
            : section === "apps"
              ? "app"
              : null;
    if (!type) return;
    let active = true;
    contentRepository
      .list(type)
      .then((values) => {
        if (active)
          setItems((current) => [
            ...current.filter((item) => item.type !== type),
            ...values,
          ]);
      })
      .catch((error: unknown) => {
        if (active)
          notify(
            error instanceof RepositoryError
              ? `API ${error.status}: ${error.code}`
              : "Không thể tải dữ liệu CMS.",
          );
      });
    return () => {
      active = false;
    };
  }, [section, notify]);
  const save = async (value: StudioItem) => {
    try {
      const saved = await contentRepository.save(value);
      setItems((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      notify(`Đã lưu — trạng thái "${statusLabel[saved.status]}" được server xác nhận.`);
      return saved;
    } catch (error) {
      notify(
        error instanceof RepositoryError
          ? describeSaveError(error.status, error.code, error.fields)
          : "Lỗi mạng — chưa có thay đổi nào được xác nhận.",
      );
      return null;
    }
  };
  const filtered = useMemo(() => items, [items]);
  return (
    <div className="studio">
      <a className="skip-link" href="#studio-main">
        Bỏ qua tới nội dung chính
      </a>
      {drawer && (
        <button
          className="studio-scrim"
          aria-label="Đóng menu"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside className={`studio-sidebar ${drawer ? "open" : ""}`}>
        <div className="studio-brand">
          <a href="/" aria-label="AI Desk Studio">
            <span>AD</span>
            <div>
              <b>AI Desk</b>
              <small>Studio</small>
            </div>
          </a>
          <button onClick={() => setDrawer(false)} aria-label="Đóng menu">
            <X />
          </button>
        </div>
        <div className="prototype-badge">
          <span />
          Studio riêng tư
        </div>
        <nav aria-label="Điều hướng Studio">
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <a className="back-site" href="/">
          <ArrowLeft />
          Quay về website
        </a>
      </aside>
      <div className="studio-workspace">
        <header className="studio-topbar">
          <button
            className="menu-toggle"
            onClick={() => setDrawer(true)}
            aria-expanded={drawer}
            aria-controls="studio-sidebar"
          >
            <Menu />
          </button>
          <div>
            <small>AI Desk Studio /</small>
            <b>{title}</b>
          </div>
          <label className="studio-search">
            <Search />
            <span className="sr-only">Tìm kiếm toàn cục</span>
            <input placeholder="Tìm nội dung…" />
          </label>
          <button
            className="studio-create"
            onClick={() => {
              setSection("articles");
              setEditor({ type: "article" });
            }}
          >
            <Plus />
            <span>Tạo nội dung</span>
          </button>
          <span className="studio-avatar" aria-label="Tài khoản mẫu">
            AD
          </span>
        </header>
        <main id="studio-main" tabIndex={-1}>
          <div className="studio-mobile-state">
            Cloud CMS · D1/R2 persistent
          </div>
          {editor ? (
            <Editor
              type={editor.type}
              item={editor.item}
              onBack={() => setEditor(null)}
              onSave={save}
              onDelete={requestDelete}
            />
          ) : section === "dashboard" ? (
            <Dashboard items={filtered} navigate={navigate} onEdit={editItem} onDelete={requestDelete} />
          ) : section === "videos" ||
            section === "articles" ||
            section === "guides" ||
            section === "apps" ? (
            <ListManager
              section={section}
              items={filtered}
              onNew={() =>
                setEditor({
                  type:
                    section === "videos"
                      ? "video"
                      : section === "articles"
                        ? "article"
                        : section === "guides"
                          ? "guide"
                          : "app",
                })
              }
              onEdit={(item) => setEditor({ type: item.type, item })}
              onDelete={requestDelete}
            />
          ) : section === "all" ? (
            <ContentOverview items={filtered} loading={allState.loading} loadError={allState.error} onEditItem={editItem} onOpenPage={openPage} onCreateDraft={createDraftFromDefault} onDeleteItem={requestDelete} />
          ) : section === "pages" ? (
            <PageContentManager notify={notify} intent={pageIntent} />
          ) : section === "trash" ? (
            <TrashManager notify={notify} onChanged={() => void refreshAll()} />
          ) : section === "comments" ? (
            <CommentsManager notify={notify} />
          ) : section === "media" ? (
            <MediaLibrary notify={notify} />
          ) : (
            <div className="studio-card settings-panel">
              <Settings />
              <h2>Cài đặt nội dung</h2>
              <p>Cấu hình danh mục, quy tắc slug và SEO mặc định chưa có API quản trị.</p>
              <button disabled>Chưa khả dụng</button>
            </div>
          )}
        </main>
      </div>
      {deleting && (
        <ConfirmDialog
          title="Xóa bài này?"
          danger
          confirmLabel="Chuyển vào Thùng rác"
          busy={deleteBusy}
          error={deleteError}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setDeleting(null)}
        >
          <p><b>{deleting.title}</b> sẽ được chuyển vào <b>Thùng rác</b>.</p>
          <p>{deleting.status === "published" ? "Nội dung đang công khai và sẽ biến khỏi website ngay lập tức (trang chi tiết trả về 404). " : "Nội dung sẽ biến khỏi các danh sách. "}Bạn có thể khôi phục lại từ Thùng rác; khi khôi phục, nội dung quay về Bản nháp.</p>
          <p>Ảnh trong Thư viện Media không bị xóa.</p>
        </ConfirmDialog>
      )}
      {notice && <Notice message={notice} />}
    </div>
  );
};
