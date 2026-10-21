import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, ListTree, PlayCircle, RefreshCw, Search, Sparkles, Terminal, X } from "lucide-react";
import { MarkdownBody } from "../components/MarkdownBody";
import { extractToc } from "../lib/markdownToc";
import { Comments, type PublicContent } from "./PublicContentPages";
import "./blog.css";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "numeric", month: "long", year: "numeric" });
const formatDate = (value: number | null | undefined) => (value ? dateFormatter.format(new Date(value)) : "");
const isoDate = (value: number | null | undefined) => (value ? new Date(value).toISOString() : undefined);

type Status = "loading" | "ready" | "error";

function useArticles(api = "/api/content/articles?limit=50"): { items: PublicContent[]; status: Status; reload: () => void } {
  const [items, setItems] = useState<PublicContent[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetch(api, { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        return ((await response.json()) as { data?: PublicContent[] }).data ?? [];
      })
      .then((data) => {
        if (!active) return;
        setItems(data);
        setStatus("ready");
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt, api]);
  return { items, status, reload: useCallback(() => {
      setStatus("loading");
      setAttempt((value) => value + 1);
    }, []) };
}

/** Deterministic palette from the slug so a missing cover still looks intentional. No text, no fake data. */
function paletteIndex(slug: string): number {
  let hash = 0;
  for (const char of slug) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 4;
}

const Thumb: React.FC<{ item: PublicContent; variant: "feature" | "card" | "hero" }> = ({ item, variant }) => {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(item.coverUrl) && !failed;
  return (
    <div className={`blog-thumb blog-thumb-${variant} palette-${paletteIndex(item.slug)}`} aria-hidden={showImage ? undefined : "true"}>
      {showImage ? (
        <img
          src={item.coverUrl!}
          alt={`Ảnh bìa: ${item.title}`}
          loading={variant === "card" ? "lazy" : "eager"}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          <span className="blog-thumb-grid" />
          <span className="blog-thumb-orb orb-a" />
          <span className="blog-thumb-orb orb-b" />
          <BookOpen className="blog-thumb-icon" />
        </>
      )}
    </div>
  );
};

const dataText = (item: PublicContent, key: string): string => (typeof item.data?.[key] === "string" ? (item.data[key] as string) : "");

const ArticleCard: React.FC<{ item: PublicContent; basePath?: string; cta?: string }> = ({ item, basePath = "/blog", cta = "Đọc bài viết" }) => (
  <article className="blog-card">
    <a className="blog-card-link" href={`${basePath}/${item.slug}`}>
      <Thumb item={item} variant="card" />
      <div className="blog-card-body">
        <span className="blog-pill">{item.category || "Bài viết"}</span>
        <h3>{item.title}</h3>
        {item.summary ? <p>{item.summary}</p> : null}
        {dataText(item, "version") || dataText(item, "platform") ? (
          <ul className="blog-tags" aria-label="Phiên bản và nền tảng">
            {dataText(item, "version") ? <li>Phiên bản {dataText(item, "version")}</li> : null}
            {dataText(item, "platform") ? <li>{dataText(item, "platform")}</li> : null}
          </ul>
        ) : null}
        <div className="blog-card-foot">
          <time dateTime={isoDate(item.publishedAt)}>{formatDate(item.publishedAt)}</time>
          <span className="blog-cta">
            {cta} <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
);

const FeaturedArticle: React.FC<{ item: PublicContent }> = ({ item }) => (
  <article className="blog-featured" aria-labelledby="blog-featured-title">
    <a className="blog-featured-link" href={`/blog/${item.slug}`}>
      <Thumb item={item} variant="feature" />
      <div className="blog-featured-body">
        <span className="blog-flag">
          <Sparkles aria-hidden="true" /> Bài viết mới nhất
        </span>
        <span className="blog-pill">{item.category || "Bài viết"}</span>
        <h2 id="blog-featured-title">{item.title}</h2>
        {item.summary ? <p>{item.summary}</p> : null}
        {item.tags?.length ? (
          <ul className="blog-tags" aria-label="Thẻ">
            {item.tags.slice(0, 4).map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : null}
        <div className="blog-featured-foot">
          <time dateTime={isoDate(item.publishedAt)}>{formatDate(item.publishedAt)}</time>
          <span className="blog-button">
            Đọc bài viết <ArrowRight aria-hidden="true" />
          </span>
        </div>
      </div>
    </a>
  </article>
);

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();

export const BlogPage: React.FC = () => {
  const { items, status, reload } = useArticles();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.category || "Bài viết", (counts.get(item.category || "Bài viết") ?? 0) + 1);
    return [...counts.entries()];
  }, [items]);
  const filtering = query.trim() !== "" || category !== "all";
  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return items.filter(
      (item) =>
        (category === "all" || (item.category || "Bài viết") === category) &&
        (!needle || normalize(`${item.title} ${item.summary} ${(item.tags ?? []).join(" ")}`).includes(needle)),
    );
  }, [items, query, category]);
  const featured = !filtering ? results[0] : undefined;
  const rest = featured ? results.slice(1) : results;
  const showTools = items.length > 1;
  const clear = () => {
    setQuery("");
    setCategory("all");
  };

  return (
    <div className="blog-page premium-page">
      <header className="blog-hero">
        <div className="container-content">
          <span className="blog-kicker">
            <Sparkles aria-hidden="true" /> Góc công nghệ AI Desk
          </span>
          <h1>
            Góc nhìn thực chiến về <span>AI và cách làm việc thông minh hơn</span>
          </h1>
          <p>Hướng dẫn, phân tích và câu chuyện xây dựng AI Desk — mỗi bài chỉ được xuất bản khi thực sự sẵn sàng.</p>
        </div>
      </header>

      <section className="container-content blog-shell" aria-label="Danh sách bài viết" aria-busy={status === "loading"}>
        {status === "ready" && showTools ? (
          <div className="blog-toolbar">
            <form className="blog-search" role="search" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="blog-search-input" className="sr-only">
                Tìm bài viết
              </label>
              <Search aria-hidden="true" />
              <input
                id="blog-search-input"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm theo tiêu đề, mô tả hoặc thẻ…"
                autoComplete="off"
              />
              {query ? (
                <button type="button" className="blog-search-clear" onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm">
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </form>
            {categories.length > 1 ? (
              <div className="blog-filters" role="group" aria-label="Lọc theo chủ đề">
                <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
                  Tất cả <span>{items.length}</span>
                </button>
                {categories.map(([name, count]) => (
                  <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>
                    {name} <span>{count}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        <p className="blog-count" role="status" aria-live="polite">
          {status === "ready" && items.length > 0 ? `${results.length} bài viết${filtering ? " phù hợp" : ""}` : ""}
        </p>

        {status === "loading" ? (
          <div className="blog-skeleton" role="status" aria-label="Đang tải bài viết">
            <div className="blog-skeleton-feature" />
            <div className="blog-skeleton-grid">
              <div />
              <div />
              <div />
            </div>
          </div>
        ) : null}

        {status === "error" ? (
          <div className="blog-state" role="alert">
            <RefreshCw aria-hidden="true" />
            <h2>Không tải được danh sách bài viết</h2>
            <p>Kết nối tới máy chủ nội dung gặp sự cố. Hãy thử lại sau ít phút.</p>
            <button type="button" className="blog-button" onClick={reload}>
              Thử lại
            </button>
          </div>
        ) : null}

        {status === "ready" && items.length === 0 ? (
          <div className="blog-state" role="status">
            <BookOpen aria-hidden="true" />
            <h2>Bài viết đầu tiên đang được chuẩn bị</h2>
            <p>Những ghi chép về AI, quy trình làm việc và quá trình xây dựng AI Desk sẽ xuất hiện tại đây khi sẵn sàng.</p>
            <a className="blog-button" href="/download">
              Khám phá AI Desk <ArrowRight aria-hidden="true" />
            </a>
          </div>
        ) : null}

        {status === "ready" && items.length > 0 && results.length === 0 ? (
          <div className="blog-state" role="status">
            <Search aria-hidden="true" />
            <h2>Không tìm thấy bài viết phù hợp</h2>
            <p>Thử từ khóa khác hoặc quay lại tất cả chủ đề.</p>
            <button type="button" className="blog-button" onClick={clear}>
              Xóa bộ lọc
            </button>
          </div>
        ) : null}

        {featured ? <FeaturedArticle item={featured} /> : null}

        {rest.length > 0 ? (
          <div className="blog-grid">
            {rest.map((item) => (
              <ArticleCard key={item.slug} item={item} />
            ))}
          </div>
        ) : null}

        {status === "ready" && items.length === 1 && !filtering ? (
          <p className="blog-more">Bài viết mới sẽ xuất hiện tại đây ngay khi được xuất bản.</p>
        ) : null}
      </section>
    </div>
  );
};

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function applyArticleMeta(item: PublicContent, base: string): void {
  document.title = `${item.seoTitle || item.title} — AI Desk`;
  const description = item.metaDescription || item.summary;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[property="og:title"]', "property", "og:title", item.seoTitle || item.title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:type"]', "property", "og:type", "article");
  setMeta('meta[property="og:url"]', "property", "og:url", `${window.location.origin}${base}/${item.slug}`);
  if (item.coverUrl) setMeta('meta[property="og:image"]', "property", "og:image", `${window.location.origin}${item.coverUrl}`);
}

type SectionKind = "blog" | "guide";
const SECTION_CONFIG = {
  blog: { api: "/api/content/articles", base: "/blog", hub: "Blog", all: "Tất cả bài viết", related: "Bài viết liên quan", missing: "Bài viết này chưa có trên website", notPublished: "Đường dẫn chỉ hoạt động sau khi bài viết được xuất bản. Có thể bài đã được gỡ hoặc chưa sẵn sàng.", cta: "Đọc bài viết", loadError: "Không tải được bài viết" },
  guide: { api: "/api/content/guides", base: "/guides", hub: "Hướng dẫn", all: "Tất cả hướng dẫn", related: "Hướng dẫn khác", missing: "Hướng dẫn này chưa có trên website", notPublished: "Đường dẫn chỉ hoạt động sau khi hướng dẫn được xuất bản. Có thể nội dung đã được gỡ hoặc chưa sẵn sàng.", cta: "Đọc hướng dẫn", loadError: "Không tải được hướng dẫn" },
} as const;

const RelatedVideos: React.FC<{ videos: Array<{ slug: string; title: string; youtubeId: string }> }> = ({ videos }) => (
  <section className="blog-videos" aria-labelledby="blog-videos-title">
    <h2 id="blog-videos-title">Video liên quan</h2>
    <div className="blog-video-grid">
      {videos.map((video) => (
        <figure key={video.slug}>
          <div className="blog-video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
              title={video.title}
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <figcaption>{video.title}</figcaption>
        </figure>
      ))}
    </div>
  </section>
);

const ArticleView: React.FC<{ section: SectionKind }> = ({ section }) => {
  const cfg = SECTION_CONFIG[section];
  const [item, setItem] = useState<PublicContent | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [related, setRelated] = useState<PublicContent[]>([]);
  const [coverFailed, setCoverFailed] = useState(false);
  const [tocOpen, setTocOpen] = useState(() => typeof window.matchMedia === "function" && window.matchMedia("(min-width: 1101px)").matches);
  const slug = useMemo(() => decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? ""), []);

  useEffect(() => {
    let active = true;
    fetch(`${cfg.api}/${encodeURIComponent(slug)}`, { headers: { accept: "application/json" } })
      .then(async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(String(response.status));
        return ((await response.json()) as { data: PublicContent }).data;
      })
      .then((value) => {
        if (!active) return;
        setItem(value);
        setState(value ? "ready" : "missing");
        if (value) applyArticleMeta(value, cfg.base);
      })
      .catch(() => {
        if (active) setState("error");
      });
    fetch(`${cfg.api}?limit=12`, { headers: { accept: "application/json" } })
      .then(async (response) => (response.ok ? ((await response.json()) as { data?: PublicContent[] }).data ?? [] : []))
      .then((list) => {
        if (active) setRelated(list.filter((entry) => entry.slug !== slug));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [slug, cfg.api, cfg.base]);

  const toc = useMemo(() => (item?.bodyMarkdown ? extractToc(item.bodyMarkdown) : []), [item]);
  const suggestions = useMemo(() => {
    if (!item) return [];
    const sameCategory = related.filter((entry) => entry.category === item.category);
    const others = related.filter((entry) => entry.category !== item.category);
    return [...sameCategory, ...others].slice(0, 3);
  }, [item, related]);

  if (state === "loading") {
    return (
      <div className="blog-page premium-page">
        <div className="container-content blog-detail-wrap" role="status" aria-label="Đang tải bài viết">
          <div className="blog-skeleton-line wide" />
          <div className="blog-skeleton-line" />
          <div className="blog-skeleton-cover" />
        </div>
      </div>
    );
  }

  if (!item) {
    const error = state === "error";
    return (
      <div className="blog-page premium-page">
        <div className="container-content blog-detail-wrap">
          <div className="blog-state" role={error ? "alert" : "status"}>
            {error ? <RefreshCw aria-hidden="true" /> : <BookOpen aria-hidden="true" />}
            <h1>{error ? cfg.loadError : cfg.missing}</h1>
            <p>{error ? "Kết nối tới máy chủ nội dung gặp sự cố. Hãy thử lại sau ít phút." : cfg.notPublished}</p>
            <a className="blog-button" href={cfg.base}>
              <ArrowLeft aria-hidden="true" /> Quay lại {cfg.hub}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="blog-page premium-page">
      <article className="blog-detail">
        <header className="blog-detail-head">
          <div className="container-content blog-detail-wrap">
            <nav className="blog-breadcrumb" aria-label="Breadcrumb">
              <ol>
                <li>
                  <a href="/">Trang chủ</a>
                </li>
                <li>
                  <ChevronRight aria-hidden="true" />
                  <a href={cfg.base}>{cfg.hub}</a>
                </li>
                <li aria-current="page">
                  <ChevronRight aria-hidden="true" />
                  <span>{item.title}</span>
                </li>
              </ol>
            </nav>
            <span className="blog-pill">{item.category || "Bài viết"}</span>
            <h1>{item.title}</h1>
            {item.summary ? <p className="blog-lead">{item.summary}</p> : null}
            <div className="blog-meta">
              {item.publishedAt ? (
                <time dateTime={isoDate(item.publishedAt)}>Đăng ngày {formatDate(item.publishedAt)}</time>
              ) : null}
              {dataText(item, "version") ? <span className="blog-pill soft">Phiên bản {dataText(item, "version")}</span> : null}
              {dataText(item, "platform") ? <span className="blog-pill soft">{dataText(item, "platform")}</span> : null}
              {item.tags?.length ? (
                <ul className="blog-tags" aria-label="Thẻ">
                  {item.tags.slice(0, 8).map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </header>

        {item.coverUrl && !coverFailed ? (
          <div className="container-content blog-detail-wrap blog-cover">
            <img src={item.coverUrl} alt={`Ảnh bìa: ${item.title}`} decoding="async" onError={() => setCoverFailed(true)} />
          </div>
        ) : null}

        <div className={`container-content blog-detail-wrap blog-detail-grid${toc.length > 1 ? " has-toc" : ""}`}>
          {toc.length > 1 ? (
            <aside className="blog-toc" aria-label="Mục lục">
              <details open={tocOpen} onToggle={(event) => setTocOpen(event.currentTarget.open)}>
                <summary>
                  <ListTree aria-hidden="true" /> Mục lục
                </summary>
                <ol>
                  {toc.map((entry) => (
                    <li key={entry.id} className={entry.level === 3 ? "sub" : undefined}>
                      <a href={`#${entry.id}`}>{entry.text}</a>
                    </li>
                  ))}
                </ol>
              </details>
            </aside>
          ) : null}
          <div className="blog-prose preview-body">
            <MarkdownBody headingIds>{item.bodyMarkdown ?? ""}</MarkdownBody>
          </div>
        </div>

        <div className="container-content blog-detail-wrap blog-after">
          {item.relatedVideos?.length ? <RelatedVideos videos={item.relatedVideos} /> : null}
          <a className="blog-back" href={cfg.base}>
            <ArrowLeft aria-hidden="true" /> {cfg.all}
          </a>
          {section === "blog" ? <Comments kind="article" item={item} /> : null}
        </div>
      </article>

      {suggestions.length > 0 ? (
        <section className="blog-related" aria-labelledby="blog-related-title">
          <div className="container-content">
            <h2 id="blog-related-title">{cfg.related}</h2>
            <div className="blog-grid">
              {suggestions.map((entry) => (
                <ArticleCard key={entry.slug} item={entry} basePath={cfg.base} cta={cfg.cta} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};

export const ArticleDetailPage: React.FC = () => <ArticleView section="blog" />;
export const GuideDetailPage: React.FC = () => <ArticleView section="guide" />;

const FOUNDATION_GUIDES = [
  { href: "/install", title: "Hướng dẫn cài đặt", text: "Cài AI Desk trên Windows, từng bước và cách xử lý lỗi thường gặp.", icon: Terminal },
  { href: "/tutorials", title: "Video hướng dẫn", text: "Xem cách dùng AI Desk qua các video ngắn.", icon: PlayCircle },
  { href: "/prompts", title: "Thư viện Prompt", text: "Bộ prompt mẫu để bắt đầu nhanh với nhiều AI.", icon: Sparkles },
] as const;

export const GuidesPage: React.FC = () => {
  const { items, status, reload } = useArticles("/api/content/guides?limit=100");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) counts.set(item.category || "Hướng dẫn", (counts.get(item.category || "Hướng dẫn") ?? 0) + 1);
    return [...counts.entries()];
  }, [items]);
  const results = useMemo(() => {
    const needle = normalize(query.trim());
    return items.filter(
      (item) =>
        (category === "all" || (item.category || "Hướng dẫn") === category) &&
        (!needle || normalize(`${item.title} ${item.summary} ${(item.tags ?? []).join(" ")}`).includes(needle)),
    );
  }, [items, query, category]);
  const filtering = query.trim() !== "" || category !== "all";
  const clear = () => {
    setQuery("");
    setCategory("all");
  };
  return (
    <div className="blog-page premium-page">
      <header className="blog-hero">
        <div className="container-content">
          <span className="blog-kicker">
            <BookOpen aria-hidden="true" /> Trung tâm hướng dẫn
          </span>
          <h1>
            Bắt đầu nhanh và làm chủ <span>AI Desk từng bước</span>
          </h1>
          <p>Cài đặt, quy trình làm việc và mẹo sử dụng — mỗi hướng dẫn chỉ xuất hiện khi đã được kiểm tra và xuất bản.</p>
        </div>
      </header>
      <section className="container-content blog-shell" aria-labelledby="guides-foundation-title">
        <h2 className="guides-heading" id="guides-foundation-title">
          Hướng dẫn nền tảng
        </h2>
        <div className="blog-grid guides-foundation">
          {FOUNDATION_GUIDES.map(({ href, title, text, icon: Icon }) => (
            <article className="blog-card" key={href}>
              <a className="blog-card-link" href={href}>
                <div className="blog-card-body">
                  <span className="guides-icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <h3>{title}</h3>
                  <p>{text}</p>
                  <div className="blog-card-foot">
                    <span />
                    <span className="blog-cta">
                      Mở <ArrowRight aria-hidden="true" />
                    </span>
                  </div>
                </div>
              </a>
            </article>
          ))}
        </div>
      </section>
      <section className="container-content blog-shell guides-cms" aria-labelledby="guides-cms-title" aria-busy={status === "loading"}>
        <h2 className="guides-heading" id="guides-cms-title">
          Hướng dẫn chi tiết
        </h2>
        {status === "ready" && items.length > 1 ? (
          <div className="blog-toolbar">
            <form className="blog-search" role="search" onSubmit={(event) => event.preventDefault()}>
              <label htmlFor="guides-search-input" className="sr-only">
                Tìm hướng dẫn
              </label>
              <Search aria-hidden="true" />
              <input id="guides-search-input" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm hướng dẫn…" autoComplete="off" />
              {query ? (
                <button type="button" className="blog-search-clear" onClick={() => setQuery("")} aria-label="Xóa nội dung tìm kiếm">
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </form>
            {categories.length > 1 ? (
              <div className="blog-filters" role="group" aria-label="Lọc theo nhóm">
                <button type="button" aria-pressed={category === "all"} onClick={() => setCategory("all")}>
                  Tất cả <span>{items.length}</span>
                </button>
                {categories.map(([name, count]) => (
                  <button key={name} type="button" aria-pressed={category === name} onClick={() => setCategory(name)}>
                    {name} <span>{count}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <p className="blog-count" role="status" aria-live="polite">
          {status === "ready" && items.length > 0 ? `${results.length} hướng dẫn${filtering ? " phù hợp" : ""}` : ""}
        </p>
        {status === "loading" ? (
          <div className="blog-skeleton" role="status" aria-label="Đang tải hướng dẫn">
            <div className="blog-skeleton-grid">
              <div />
              <div />
              <div />
            </div>
          </div>
        ) : null}
        {status === "error" ? (
          <div className="blog-state" role="alert">
            <RefreshCw aria-hidden="true" />
            <h3>Không tải được danh sách hướng dẫn</h3>
            <p>Kết nối tới máy chủ nội dung gặp sự cố. Hãy thử lại sau ít phút.</p>
            <button type="button" className="blog-button" onClick={reload}>
              Thử lại
            </button>
          </div>
        ) : null}
        {status === "ready" && items.length === 0 ? (
          <div className="blog-state" role="status">
            <BookOpen aria-hidden="true" />
            <h3>Hướng dẫn chi tiết đang được chuẩn bị</h3>
            <p>Các bài hướng dẫn từng bước sẽ xuất hiện tại đây khi được xuất bản. Trong lúc chờ, hãy xem các hướng dẫn nền tảng ở trên.</p>
          </div>
        ) : null}
        {status === "ready" && items.length > 0 && results.length === 0 ? (
          <div className="blog-state" role="status">
            <Search aria-hidden="true" />
            <h3>Không tìm thấy hướng dẫn phù hợp</h3>
            <p>Thử từ khóa khác hoặc quay lại tất cả nhóm.</p>
            <button type="button" className="blog-button" onClick={clear}>
              Xóa bộ lọc
            </button>
          </div>
        ) : null}
        {results.length > 0 ? (
          <div className="blog-grid">
            {results.map((item) => (
              <ArticleCard key={item.slug} item={item} basePath="/guides" cta="Đọc hướng dẫn" />
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
