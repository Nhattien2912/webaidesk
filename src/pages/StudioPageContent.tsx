import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, Plus, RotateCcw, Trash2, Upload } from "lucide-react";
import {
  PAGES,
  PAGE_IDS,
  defaultDoc,
  hideIds,
  validateDoc,
  type Field,
  type PageDef,
  type PageDoc,
  type PageId,
  type SubField,
  type Value,
} from "../content/pageContent";
import { contentRepository, RepositoryError, type MediaItem } from "../lib/contentRepository";
import { parseYouTubeId } from "../lib/studio";
import { MARKDOWN_SNIPPETS, describeSaveError, insertAtCursor, mediaMarkdown } from "../lib/studioEditor";
import type { StudioItem } from "../data/studioFixtures";

type Mode = "edit" | "preview";
interface PageRecord {
  item: StudioItem;
  draft: PageDoc | null;
  published: PageDoc | null;
}

const asDoc = (value: unknown): PageDoc | null => {
  if (!value || typeof value !== "object") return null;
  const v = value as { values?: unknown; hidden?: unknown };
  return {
    values: v.values && typeof v.values === "object" && !Array.isArray(v.values) ? (v.values as Record<string, Value>) : {},
    hidden: Array.isArray(v.hidden) ? (v.hidden as string[]) : [],
  };
};
const toRecord = (item: StudioItem): PageRecord => {
  const page = (item.data?.page ?? {}) as { draft?: unknown; published?: unknown };
  return { item, draft: asDoc(page.draft), published: asDoc(page.published) };
};

const PROBLEMS: Record<string, string> = {
  string_required: "phải là văn bản",
  control_characters: "chứa ký tự điều khiển không hợp lệ",
  single_line_required: "chỉ được một dòng",
  url_invalid: "phải là đường dẫn nội bộ (bắt đầu bằng /) hoặc https://",
  links_invalid: "mỗi dòng phải có dạng: văn bản | /đường-dẫn (hoặc https://…)",
  youtube_id_invalid: "liên kết YouTube không hợp lệ",
  date_invalid: "ngày không hợp lệ (YYYY-MM-DD)",
  duration_invalid: "thời lượng không hợp lệ (ví dụ 03:20)",
  media_id_invalid: "ảnh không hợp lệ",
  option_invalid: "lựa chọn không hợp lệ",
  slug_invalid: "mã chỉ gồm chữ thường, số và gạch ngang",
  duplicate_id: "mã bị trùng",
  unknown_field: "trường không được hỗ trợ",
  hidden_ids_invalid: "khối ẩn không hợp lệ",
  document_too_large: "nội dung quá lớn",
  object_required: "dữ liệu không hợp lệ",
};
const problemText = (code: string) => PROBLEMS[code] ?? (/^max_(\d+)$/.test(code) ? `tối đa ${code.slice(4)} ký tự` : /^list_max_(\d+)$/.test(code) ? `tối đa ${code.slice(9)} mục` : code);

/** Human-readable lines for server/client validation problems of a page document. */
function describeProblems(problems: Record<string, string>, page: PageDef): string[] {
  const fields = new Map(page.sections.flatMap((s) => s.fields).map((f) => [f.key, f]));
  return Object.entries(problems).slice(0, 8).map(([path, code]) => {
    const key = path.replace(/^data\.page\.(draft|published)\./, "");
    const match = /^([^[]+)(?:\[(\d+)\](?:\.(.+))?)?$/.exec(key);
    const field = match ? fields.get(match[1]!) : undefined;
    if (!field) return `${key}: ${problemText(code)}`;
    if (match![2] === undefined) return `${field.label}: ${problemText(code)}`;
    const itemNo = Number(match![2]) + 1;
    const sub = field.type === "items" ? field.fields.find((s) => s.key === match![3]) : undefined;
    return `${field.label} #${itemNo}${sub ? ` — ${sub.label}` : ""}: ${problemText(code)}`;
  });
}

const sameValue = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

function MediaPicker({ value, onChange, options, onUploaded, onError }: { value: string; onChange: (id: string) => void; options: MediaItem[]; onUploaded: (m: MediaItem) => void; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const media = await contentRepository.uploadMedia(file, file.name.replace(/\.[^.]+$/, ""));
      onUploaded(media);
      onChange(media.id);
    } catch (error) {
      onError(error instanceof RepositoryError ? `Tải ảnh thất bại: ${error.code === "unsupported_media_type" ? "chỉ hỗ trợ PNG, JPEG hoặc WebP" : error.code === "media_too_large" ? "ảnh vượt quá 5 MB" : error.code}` : "Tải ảnh thất bại.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="media-picker">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Chọn ảnh từ Thư viện Media">
        <option value="">Không dùng ảnh tùy chỉnh</option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>{m.altText || m.id}</option>
        ))}
        {value && !options.some((m) => m.id === value) && <option value={value}>{value}</option>}
      </select>
      <label className="md-upload">
        <Upload aria-hidden="true" /> {busy ? "Đang tải…" : "Tải ảnh lên"}
        <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
      </label>
      {value && <img className="media-thumb" src={`/api/admin/media/${value}`} alt="Ảnh đã chọn" />}
    </div>
  );
}

function ScalarInput({ sub, value, onChange, media }: { sub: SubField; value: string; onChange: (v: string) => void; media: { options: MediaItem[]; onUploaded: (m: MediaItem) => void; onError: (m: string) => void } }) {
  switch (sub.type) {
    case "select":
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {!sub.options?.some((o) => o.value === value) && <option value={value}>{value || "—"}</option>}
          {sub.options?.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      );
    case "longtext":
    case "lines":
    case "links":
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={sub.type === "lines" || sub.type === "links" ? 5 : 3} maxLength={sub.max} />;
    case "code":
      return <textarea className="mono-input" value={value} onChange={(e) => onChange(e.target.value)} rows={10} maxLength={sub.max} spellCheck={false} />;
    case "youtube":
      return (
        <>
          <input value={value} onChange={(e) => { const raw = e.target.value.trim(); onChange(raw === "" ? "" : parseYouTubeId(raw) ?? raw); }} placeholder="https://www.youtube.com/watch?v=…" />
          <small className={value && !parseYouTubeId(value) ? "field-error" : ""}>{value ? (parseYouTubeId(value) ? `Video ID: ${value}` : "Liên kết YouTube không hợp lệ") : "Để trống nếu chưa có video thật."}</small>
        </>
      );
    case "media":
      return <MediaPicker value={value} onChange={onChange} options={media.options} onUploaded={media.onUploaded} onError={media.onError} />;
    case "date":
      return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="2026-10-21" maxLength={10} />;
    case "duration":
      return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="03:20" maxLength={10} />;
    case "url":
      return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="/install hoặc https://…" maxLength={sub.max} />;
    default:
      return <input value={value} onChange={(e) => onChange(e.target.value)} maxLength={sub.max} />;
  }
}

function MarkdownEditor({ value, onChange, media }: { value: string; onChange: (v: string) => void; media: { options: MediaItem[]; onUploaded: (m: MediaItem) => void; onError: (m: string) => void } }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const insert = (snippet: string) => {
    const area = ref.current;
    const next = insertAtCursor(value, area?.selectionStart ?? value.length, area?.selectionEnd ?? value.length, snippet);
    onChange(next.text);
    window.setTimeout(() => { area?.focus(); area?.setSelectionRange(next.cursor, next.cursor); }, 0);
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const m = await contentRepository.uploadMedia(file, file.name.replace(/\.[^.]+$/, ""));
      media.onUploaded(m);
      insert(mediaMarkdown(m.id, m.altText));
    } catch (error) {
      media.onError(error instanceof RepositoryError ? `Tải ảnh thất bại: ${error.code}` : "Tải ảnh thất bại.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="md-toolbar" role="toolbar" aria-label="Công cụ Markdown">
        {MARKDOWN_SNIPPETS.map((s) => (
          <button type="button" key={s.id} onClick={() => insert(s.markdown)}>{s.label}</button>
        ))}
        <select aria-label="Chọn ảnh từ Thư viện Media" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Ảnh từ thư viện…</option>
          {media.options.map((m) => (
            <option key={m.id} value={m.id}>{m.altText || m.id}</option>
          ))}
        </select>
        <button type="button" disabled={!pick} onClick={() => { const m = media.options.find((x) => x.id === pick); if (m) insert(mediaMarkdown(m.id, m.altText)); }}>Chèn ảnh</button>
        <label className="md-upload">
          {busy ? "Đang tải…" : "Tải ảnh lên & chèn"}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} />
        </label>
      </div>
      <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} rows={8} maxLength={20000} placeholder="## Tiêu đề phụ&#10;Nội dung Markdown…" />
    </>
  );
}

function FieldEditor({ field, doc, setValue, media }: { field: Field; doc: PageDoc; setValue: (key: string, value: Value | undefined) => void; media: { options: MediaItem[]; onUploaded: (m: MediaItem) => void; onError: (m: string) => void } }) {
  const current = (doc.values[field.key] ?? field.default) as Value;
  const changed = !sameValue(current, field.default);
  const reset = changed ? (
    <button type="button" className="field-reset" onClick={() => setValue(field.key, undefined)} title="Đặt lại giá trị mặc định">
      <RotateCcw aria-hidden="true" /> Mặc định
    </button>
  ) : null;
  if (field.type === "text") {
    const text = current as string;
    return (
      <div className="page-field">
        <label>
          <span>{field.label}{changed && <em> · đã sửa</em>}</span>
          {field.multiline ? <textarea value={text} rows={3} maxLength={field.max} onChange={(e) => setValue(field.key, e.target.value)} /> : <input value={text} maxLength={field.max} onChange={(e) => setValue(field.key, e.target.value)} />}
        </label>
        <small>{text.length}/{field.max}</small>
        {reset}
      </div>
    );
  }
  if (field.type === "code") {
    return (
      <div className="page-field">
        <label>
          <span>{field.label}{changed && <em> · đã sửa</em>}</span>
          <textarea className="mono-input" value={current as string} rows={6} maxLength={field.max} spellCheck={false} onChange={(e) => setValue(field.key, e.target.value)} />
        </label>
        {reset}
      </div>
    );
  }
  if (field.type === "markdown") {
    return (
      <div className="page-field">
        <span className="page-field-label">{field.label}{changed && <em> · đã sửa</em>}</span>
        {field.help && <small>{field.help}</small>}
        <MarkdownEditor value={current as string} onChange={(v) => setValue(field.key, v)} media={media} />
        {reset}
      </div>
    );
  }
  if (field.type === "list") {
    const list = current as string[];
    const update = (next: string[]) => setValue(field.key, next);
    const move = (index: number, delta: number) => { const next = [...list]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target]!, next[index]!]; update(next); };
    return (
      <fieldset className="page-field list-field">
        <legend>{field.label}{changed && <em> · đã sửa</em>}</legend>
        {list.map((item, index) => (
          <div className="list-row" key={index}>
            <span className="row-no">{index + 1}</span>
            <textarea value={item} rows={2} maxLength={field.itemMax} aria-label={`${field.itemLabel} ${index + 1}`} onChange={(e) => update(list.map((v, i) => (i === index ? e.target.value.replace(/[\r\n]+/g, " ") : v)))} />
            <div className="row-tools">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Chuyển lên"><ArrowUp /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === list.length - 1} aria-label="Chuyển xuống"><ArrowDown /></button>
              <button type="button" onClick={() => update(list.filter((_, i) => i !== index))} aria-label="Xóa"><Trash2 /></button>
            </div>
          </div>
        ))}
        <div className="list-actions">
          <button type="button" disabled={list.length >= field.maxItems} onClick={() => update([...list, ""])}><Plus /> Thêm {field.itemLabel.toLowerCase()}</button>
          {reset}
        </div>
      </fieldset>
    );
  }
  const items = current as Array<Record<string, string>>;
  const update = (next: Array<Record<string, string>>) => setValue(field.key, next);
  const move = (index: number, delta: number) => { const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target]!, next[index]!]; update(next); };
  const blank = (): Record<string, string> => {
    const item: Record<string, string> = Object.fromEntries(field.fields.map((s) => [s.key, s.type === "select" ? s.options?.[0]?.value ?? "" : ""]));
    if ("id" in item) { let n = items.length + 1; while (items.some((x) => x.id === `moi-${n}`)) n++; item.id = `moi-${n}`; }
    return item;
  };
  return (
    <fieldset className="page-field items-field">
      <legend>{field.label}{changed && <em> · đã sửa</em>}</legend>
      {items.map((item, index) => (
        <details key={index} className="item-card" open={items.length <= 3}>
          <summary>
            <span className="row-no">{index + 1}</span>
            <b>{item[field.titleKey] || `${field.itemLabel} ${index + 1}`}</b>
            <span className="row-tools" onClick={(e) => e.preventDefault()}>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Chuyển lên"><ArrowUp /></button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === items.length - 1} aria-label="Chuyển xuống"><ArrowDown /></button>
              <button type="button" onClick={() => update(items.filter((_, i) => i !== index))} aria-label="Xóa mục này"><Trash2 /></button>
            </span>
          </summary>
          <div className="item-fields">
            {field.fields.map((sub) => (
              <label key={sub.key} className="sub-field">
                <span>{sub.label}</span>
                <ScalarInput sub={sub} value={item[sub.key] ?? ""} media={media} onChange={(v) => update(items.map((x, i) => (i === index ? { ...x, [sub.key]: v } : x)))} />
                {sub.help && <small>{sub.help}</small>}
              </label>
            ))}
          </div>
        </details>
      ))}
      <div className="list-actions">
        <button type="button" disabled={items.length >= field.maxItems} onClick={() => update([...items, blank()])}><Plus /> Thêm {field.itemLabel.toLowerCase()}</button>
        {reset}
      </div>
    </fieldset>
  );
}

const STATUS_TEXT: Record<string, string> = { none: "Chưa tùy chỉnh — website đang dùng nội dung mặc định trong code", draft: "Có bản nháp — website vẫn dùng nội dung mặc định", published: "Đang xuất bản — website hiển thị nội dung từ Studio", archived: "Đã gỡ — website dùng nội dung mặc định trong code" };

export interface PageIntent {
  pageId: PageId;
  mode: "edit" | "preview";
  nonce: number;
}

function PageEditor({ pageId, record, initialMode = "edit", onBack, onSaved, notify }: { pageId: PageId; record: PageRecord | null; initialMode?: Mode; onBack: () => void; onSaved: (item: StudioItem) => void; notify: (m: string) => void }) {
  const page = PAGES[pageId];
  const [persisted, setPersisted] = useState<PageRecord | null>(record);
  const initial = persisted?.draft ?? persisted?.published ?? defaultDoc(page);
  const [doc, setDoc] = useState<PageDoc>(initial);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [width, setWidth] = useState<390 | 768 | 1440>(1440);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [mediaOptions, setMediaOptions] = useState<MediaItem[]>([]);
  const [error, setError] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [previewReady, setPreviewReady] = useState(false);

  useEffect(() => {
    let active = true;
    contentRepository.listMedia().then((values) => { if (active) setMediaOptions(values); }).catch(() => undefined);
    return () => { active = false; };
  }, []);
  const media = useMemo(() => ({ options: mediaOptions, onUploaded: (m: MediaItem) => setMediaOptions((current) => [m, ...current]), onError: setError }), [mediaOptions]);

  const setValue = useCallback((key: string, value: Value | undefined) => {
    setDoc((current) => {
      const values = { ...current.values };
      if (value === undefined) delete values[key];
      else values[key] = value;
      return { ...current, values };
    });
  }, []);
  const toggleHidden = (id: string) => setDoc((current) => ({ ...current, hidden: current.hidden.includes(id) ? current.hidden.filter((h) => h !== id) : [...current.hidden, id] }));

  const status = persisted ? persisted.item.status : "none";
  const dirty = !sameValue(doc, persisted?.draft ?? persisted?.published ?? defaultDoc(page));
  const changedCount = useMemo(() => page.sections.flatMap((s) => s.fields).filter((f) => !sameValue(doc.values[f.key] ?? f.default, f.default)).length + doc.hidden.length, [doc, page]);

  // Preview: the real public page component runs in a same-origin iframe and receives the working copy by postMessage.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === iframeRef.current?.contentWindow && (event.data as { type?: string } | null)?.type === "aidesk-preview-ready") setPreviewReady(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
  useEffect(() => {
    if (mode !== "preview" || !previewReady) return;
    const checked = validateDoc(pageId, doc);
    const handle = window.setTimeout(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: "aidesk-page-preview", page: pageId, doc: checked.ok ? checked.doc : doc }, window.location.origin);
    }, 150);
    return () => window.clearTimeout(handle);
  }, [mode, previewReady, doc, pageId, width]);

  const persist = async (nextStatus: "draft" | "published" | "archived", pageData: { draft: PageDoc | null; published: PageDoc | null }): Promise<boolean> => {
    setError("");
    const base: StudioItem = {
      ...(persisted?.item ?? { id: `page-${pageId}`, type: "page", title: page.title, category: "Trang nội dung" }),
      type: "page",
      slug: pageId,
      title: page.title,
      summary: "",
      bodyMarkdown: "",
      category: "Trang nội dung",
      tags: [],
      status: nextStatus,
      data: { section: "page", page: pageData },
      updatedAt: "Vừa xong",
    };
    try {
      let item = base;
      // Archived pages must go back to draft before they can be published again.
      if (persisted?.item.status === "archived" && nextStatus === "published") {
        item = await contentRepository.save({ ...base, status: "draft", data: { section: "page", page: pageData } });
        item = await contentRepository.save({ ...item, status: "published", data: { section: "page", page: pageData } });
      } else {
        item = await contentRepository.save(base);
      }
      const nextRecord = toRecord(item);
      setPersisted(nextRecord);
      onSaved(item);
      return true;
    } catch (e) {
      if (e instanceof RepositoryError) {
        const lines = e.code === "validation_failed" && e.fields ? describeProblems(e.fields, page) : [describeSaveError(e.status, e.code, e.fields)];
        setProblems(lines);
        setError(lines[0] ?? "Không lưu được.");
      } else {
        setError("Lỗi mạng — chưa có thay đổi nào được xác nhận.");
      }
      return false;
    }
  };
  const validate = (): boolean => {
    const checked = validateDoc(pageId, doc);
    if (checked.ok) { setProblems([]); return true; }
    setProblems(describeProblems(checked.problems, page));
    setError("Có trường chưa hợp lệ — hãy sửa các mục bên dưới trước khi lưu.");
    return false;
  };
  const saveDraft = async () => {
    if (!validate()) return;
    setBusy(true);
    const ok = await persist(persisted?.item.status ?? "draft", { draft: doc, published: persisted?.published ?? null });
    setBusy(false);
    if (ok) notify("Đã lưu bản nháp. Website công khai chưa thay đổi.");
  };
  const publish = async () => {
    if (!validate()) return;
    setBusy(true);
    const ok = await persist("published", { draft: doc, published: doc });
    setBusy(false);
    if (ok) notify("Đã xuất bản — website cập nhật ngay, không cần deploy lại.");
  };
  const unpublish = async () => {
    if (!persisted) return;
    setBusy(true);
    const ok = await persist("archived", { draft: persisted.draft ?? persisted.published, published: persisted.published });
    setBusy(false);
    if (ok) notify("Đã gỡ nội dung từ Studio. Website dùng lại nội dung mặc định trong code.");
  };
  const revertToPublished = () => { setDoc(persisted?.published ?? defaultDoc(page)); setProblems([]); setError(""); };
  const resetDefaults = () => { setDoc(defaultDoc(page)); setProblems([]); setError(""); };

  return (
    <>
      <button className="editor-back" onClick={onBack}><ArrowLeft />Quay lại danh sách trang</button>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Chỉnh sửa trang · {page.path}</span>
          <h2>{page.label}</h2>
          <p>{page.description}</p>
        </div>
        <span className={`status-pill ${status === "published" ? "published" : status === "archived" ? "archived" : "draft"}`}>{status === "none" ? "Mặc định" : status === "published" ? "Đang xuất bản" : status === "archived" ? "Đã gỡ" : "Nháp"}</span>
      </div>
      <p className="page-status-note">{STATUS_TEXT[status]}. {dirty ? "Bạn có thay đổi chưa lưu." : ""} {changedCount > 0 ? `${changedCount} mục khác với mặc định.` : "Chưa có mục nào khác mặc định."}</p>
      <div className="editor-layout page-editor-layout">
        <div className="studio-card editor-main">
          <div className="editor-tabs">
            <button className={mode === "edit" ? "active" : ""} onClick={() => { setMode("edit"); setPreviewReady(false); }}>Chỉnh sửa</button>
            <button className={mode === "preview" ? "active" : ""} onClick={() => setMode("preview")}><Eye aria-hidden="true" /> Xem trước giao diện thật</button>
          </div>
          {error && <div className="page-error" role="alert"><b>{error}</b>{problems.length > 0 && <ul>{problems.map((p) => <li key={p}>{p}</li>)}</ul>}</div>}
          {mode === "preview" ? (
            <div className="preview-frame-wrap">
              <div className="preview-widths" role="group" aria-label="Độ rộng xem trước">
                {([1440, 768, 390] as const).map((w) => (
                  <button key={w} className={width === w ? "active" : ""} onClick={() => setWidth(w)}>{w}px</button>
                ))}
              </div>
              <div className="preview-scroller">
                <iframe ref={iframeRef} title={`Xem trước ${page.label}`} src={`/admin/preview/${pageId}`} style={{ width }} className="preview-frame" />
              </div>
              <small>Bản xem trước dùng đúng thành phần và CSS của website; đây là bản nháp chưa xuất bản.</small>
            </div>
          ) : (
            <div className="page-sections">
              {page.sections.map((section) => {
                const hidden = section.hideId ? doc.hidden.includes(section.hideId) : false;
                const n = section.fields.filter((f) => !sameValue(doc.values[f.key] ?? f.default, f.default)).length;
                return (
                  <details key={section.id} className="page-section" open={section.id === "hero"}>
                    <summary>
                      <b>{section.label}</b>
                      {hidden && <span className="chip hidden-chip">Đang ẩn</span>}
                      {n > 0 && <span className="chip">{n} đã sửa</span>}
                    </summary>
                    {section.hideId && (
                      <label className="hide-toggle">
                        <input type="checkbox" checked={hidden} onChange={() => toggleHidden(section.hideId!)} />
                        {hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />} Ẩn khối này trên website
                      </label>
                    )}
                    <div className="section-fields">
                      {section.fields.map((field) => (
                        <FieldEditor key={field.key} field={field} doc={doc} setValue={setValue} media={media} />
                      ))}
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </div>
        <aside className="studio-card editor-side">
          <h3>Xuất bản</h3>
          <p className="side-note">Lưu nháp không thay đổi website. Chỉ khi bấm “Xuất bản” nội dung mới xuất hiện công khai, không cần deploy lại.</p>
          <div className="editor-actions">
            <button onClick={saveDraft} disabled={busy}>Lưu bản nháp</button>
            <button className="studio-primary" onClick={publish} disabled={busy}>Xuất bản</button>
            <button onClick={revertToPublished} disabled={busy || !dirty}><RotateCcw /> Hủy thay đổi chưa lưu</button>
            <button onClick={resetDefaults} disabled={busy}><RotateCcw /> Điền lại nội dung mặc định</button>
            <button onClick={unpublish} disabled={busy || !persisted || persisted.item.status !== "published"}><Archive /> Gỡ khỏi website</button>
          </div>
          <p className="side-note">“Gỡ khỏi website” đưa trang về nội dung mặc định trong code (trang không bao giờ bị trống). Bấm “Xuất bản” để đăng lại.</p>
          <p className="side-note">Không thể chỉnh sửa tại đây: bố cục, màu sắc, biểu tượng, liên kết tải xuống và các quy tắc bảo mật — những phần này nằm trong mã nguồn.</p>
        </aside>
      </div>
    </>
  );
}

export function PageContentManager({ notify, intent }: { notify: (message: string) => void; intent?: PageIntent | null }) {
  const [records, setRecords] = useState<Record<string, PageRecord>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [editing, setEditing] = useState<PageId | null>(intent?.pageId ?? null);
  const [editMode, setEditMode] = useState<Mode>(intent?.mode ?? "edit");
  useEffect(() => {
    let active = true;
    contentRepository.list("page")
      .then((items) => { if (active) { setRecords(Object.fromEntries(items.filter((i) => i.slug).map((i) => [i.slug!, toRecord(i)]))); setLoading(false); } })
      .catch((e: unknown) => { if (active) { setLoadError(e instanceof RepositoryError ? describeSaveError(e.status, e.code) : "Không tải được danh sách trang."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  if (editing && loading) return <p className="page-status-note" role="status">Đang tải trang…</p>;
  if (editing) {
    return (
      <PageEditor
        key={editing}
        pageId={editing}
        initialMode={editMode}
        record={records[editing] ?? null}
        onBack={() => setEditing(null)}
        onSaved={(item) => setRecords((current) => ({ ...current, [item.slug ?? editing]: toRecord(item) }))}
        notify={notify}
      />
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="studio-eyebrow">Nội dung trang</span>
          <h2>Trang hướng dẫn trên website</h2>
          <p>Chỉnh sửa chữ, các bước, prompt, video, FAQ và changelog của các trang có sẵn mà không đổi giao diện. Nội dung chưa chỉnh sẽ dùng bản mặc định trong code.</p>
        </div>
      </div>
      {loadError && <div className="page-error" role="alert"><b>{loadError}</b></div>}
      <div className="page-cards">
        {PAGE_IDS.map((id) => {
          const def = PAGES[id];
          const record = records[id];
          const status = record ? record.item.status : "none";
          return (
            <article key={id} className="studio-card page-card">
              <span className={`status-pill ${status === "published" ? "published" : status === "archived" ? "archived" : "draft"}`}>{loading ? "…" : status === "none" ? "Mặc định" : status === "published" ? "Đang xuất bản" : status === "archived" ? "Đã gỡ" : "Nháp"}</span>
              <h3>{def.label}</h3>
              <p>{def.description}</p>
              <small>{def.path} · {def.sections.reduce((n, s) => n + s.fields.length, 0)} trường · {hideIds(def).length} khối có thể ẩn</small>
              <div className="page-card-actions">
                <button className="studio-primary" disabled={loading} onClick={() => { setEditMode("edit"); setEditing(id); }}>Chỉnh sửa</button>
                <a href={def.path} target="_blank" rel="noopener noreferrer">Mở trang công khai</a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
