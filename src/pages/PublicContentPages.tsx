import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Box, Clock3, Search } from "lucide-react";
import { TurnstileWidget } from "../components/TurnstileWidget";
import "./public-content.css";
import { MarkdownBody } from "../components/MarkdownBody";

export interface PublicContent {
  id: string;
  slug: string;
  title: string;
  summary: string;
  category: string;
  bodyMarkdown: string;
  publishedAt: number | null;
  tags?: string[];
  coverUrl?: string | null;
  relatedVideos?: Array<{ slug: string; title: string; youtubeId: string }>;
  seoTitle?: string;
  metaDescription?: string;
  data: Record<string, unknown>;
}

const formatDate = (value: number | null | undefined) =>
  value ? new Date(value).toLocaleDateString("vi-VN") : "";

interface PublicComment { id:string;displayName:string;body:string;createdAt:number;parentId:string|null }
export function Comments({kind,item}:{kind:"article"|"app";item:PublicContent}) {
  const [comments,setComments]=useState<PublicComment[]>([]);const [name,setName]=useState("");const [body,setBody]=useState("");const [token,setToken]=useState("");const [state,setState]=useState<"idle"|"sending"|"sent"|"error">("idle");const [widgetKey,setWidgetKey]=useState(0)
  const endpoint=`/api/content/${kind==="article"?"articles":"apps"}/${encodeURIComponent(item.slug)}/comments`
  useEffect(()=>{fetch(endpoint).then(r=>r.json()).then((v:{data?:PublicComment[]})=>setComments(v.data??[])).catch(()=>setComments([]))},[endpoint])
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(!token){setState("error");return}setState("sending");const response=await fetch("/api/comments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({contentType:kind,contentId:item.id,displayName:name,body,turnstileToken:token})});if(response.ok){setState("sent");setName("");setBody("")}else{setState("error");setToken("");setWidgetKey(k=>k+1)}}
  const siteKey=import.meta.env.VITE_COMMENTS_TURNSTILE_SITE_KEY as string|undefined
  return <section className="comments-section" aria-labelledby="comments-title"><div className="comments-heading"><span className="content-kicker">Cộng đồng</span><h2 id="comments-title">Bình luận và thảo luận</h2><p>{comments.length} bình luận đã duyệt</p></div><div className="comments-list">{comments.length?comments.map(comment=><article className="comment-card" key={comment.id}><span className="comment-avatar" aria-hidden="true">{comment.displayName.slice(0,1).toUpperCase()}</span><div><b>{comment.displayName}</b><time dateTime={new Date(comment.createdAt).toISOString()}>{new Date(comment.createdAt).toLocaleDateString("vi-VN")}</time><p>{comment.body}</p></div></article>):<p className="comments-empty">Chưa có bình luận được duyệt. Hãy bắt đầu cuộc trò chuyện.</p>}</div><form className="comment-form" onSubmit={submit}><h3>Gửi bình luận</h3><label>Tên hiển thị<input value={name} onChange={e=>setName(e.target.value)} minLength={2} maxLength={60} required /></label><label>Nội dung<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={5} maxLength={2000} required rows={5}/></label>{siteKey?<TurnstileWidget key={widgetKey} siteKey={siteKey} action="comment" onEvent={event=>setToken(event.type==="token"?event.token:"")}/>:<p className="field-error">Turnstile chưa được cấu hình.</p>}<button className="btn-primary" disabled={state==="sending"||!siteKey}>{state==="sending"?"Đang gửi…":"Gửi bình luận"}</button><p aria-live="polite">{state==="sent"?"Bình luận đã được tiếp nhận và đang chờ duyệt.":state==="error"?"Không thể gửi. Kiểm tra nội dung và Turnstile rồi thử lại.":""}</p></form></section>
}
function usePublished(kind: "articles" | "apps") {
  const [items, setItems] = useState<PublicContent[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/content/${kind}`)
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { data: PublicContent[] }).data
          : [],
      )
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, [kind]);
  return items;
}

function EmptyContent({ kind }: { kind: "articles" | "apps" }) {
  const article = kind === "articles";
  return (
    <div className="content-empty" role="status">
      {article ? <Clock3 aria-hidden="true" /> : <Box aria-hidden="true" />}
      <h2>
        {article
          ? "Bài viết đang được chuẩn bị"
          : "Sản phẩm mới đang được hoàn thiện"}
      </h2>
      <p>
        {article
          ? "Những ghi chép công nghệ chất lượng sẽ xuất hiện tại đây khi sẵn sàng."
          : "AI Desk vẫn là sản phẩm trung tâm. Các ứng dụng khác chỉ xuất hiện sau khi được phát hành chính thức."}
      </p>
    </div>
  );
}

export const AppsPage: React.FC = () => {
  const [query, setQuery] = useState("");
  const publishedApps = usePublished("apps");
  const results = useMemo(
    () =>
      publishedApps.filter((item) =>
        `${item.title} ${item.summary}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [query, publishedApps],
  );
  return (
    <div className="public-content premium-page">
      <section className="content-hero apps">
        <div className="container-content">
          <span className="content-kicker">
            <Box aria-hidden="true" /> Hệ sinh thái sản phẩm
          </span>
          <h1>Phần mềm hữu ích, được xây dựng có chủ đích.</h1>
          <p>
            AI Desk là trung tâm — một không gian phối hợp nhiều AI trong cùng
            quy trình làm việc.
          </p>
          <a className="btn-primary" href="/download">
            Khám phá AI Desk
          </a>
        </div>
      </section>
      <section
        className="container-content content-shell"
        aria-label="Danh sách ứng dụng"
      >
        <div className="content-toolbar">
          <label>
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm ứng dụng</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm sản phẩm…"
            />
          </label>
          <button type="button" aria-pressed="true">
            Mọi nền tảng
          </button>
        </div>
        {results.length === 0 ? (
          <EmptyContent kind="apps" />
        ) : (
          <div className="metric-grid">
            {results.map((item) => (
              <a
                className="studio-card"
                key={item.slug}
                href={`/apps/${item.slug}`}
              >
                <span className="content-kicker">Sản phẩm</span>
                <h2>{item.title}</h2>
                <p>{item.summary}</p>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

interface ChangelogEntry { version: string; date: string; notes: string }
const httpsOnly = (value: unknown): string => (typeof value === "string" && value.startsWith("https://") ? value : "");

/** Real app metadata from the CMS. Nothing renders for a field the owner has not filled in. */
function AppFacts({ data }: { data: Record<string, unknown> }) {
  const version = typeof data.currentVersion === "string" ? data.currentVersion : "";
  const changelog = Array.isArray(data.changelog) ? (data.changelog as ChangelogEntry[]) : [];
  const links = [
    ["Tải xuống", httpsOnly(data.downloadUrl)],
    ["Tài liệu", httpsOnly(data.documentationUrl)],
    ["Website", httpsOnly(data.websiteUrl)],
    ["GitHub", httpsOnly(data.githubUrl)],
  ].filter(([, href]) => href);
  const platforms = Array.isArray(data.platforms) ? (data.platforms as string[]) : [];
  const features = Array.isArray(data.features) ? (data.features as string[]) : [];
  if (!version && !links.length && !changelog.length && !platforms.length && !features.length) return null;
  return (
    <section className="app-facts" aria-label="Thông tin ứng dụng">
      {(version || platforms.length > 0) && (
        <p className="app-facts-meta">
          {version && <span>Phiên bản {version}</span>}
          {platforms.length > 0 && <span>{platforms.join(" · ")}</span>}
        </p>
      )}
      {links.length > 0 && (
        <p className="app-facts-links">
          {links.map(([label, href], index) => (
            <a key={label} className={index === 0 ? "btn-primary" : "btn-secondary"} href={href} rel="noopener noreferrer" target="_blank">
              {label}
            </a>
          ))}
        </p>
      )}
      {features.length > 0 && (
        <ul className="app-facts-features">
          {features.map((feature) => <li key={feature}>{feature}</li>)}
        </ul>
      )}
      {changelog.length > 0 && (
        <div className="app-changelog">
          <h2>Lịch sử thay đổi</h2>
          {changelog.map((entry) => (
            <article key={`${entry.version}-${entry.date}`}>
              <h3>{entry.version} <time dateTime={entry.date}>{entry.date}</time></h3>
              <p>{entry.notes}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export const ContentDetailPage: React.FC<{ kind: "article" | "app" }> = ({
  kind,
}) => {
  const [item, setItem] = useState<PublicContent | null>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    const slug = decodeURIComponent(
      window.location.pathname.split("/").filter(Boolean).at(-1) ?? "",
    );
    fetch(
      `/api/content/${kind === "article" ? "articles" : "apps"}/${encodeURIComponent(slug)}`,
    )
      .then(async (response) =>
        response.ok
          ? ((await response.json()) as { data: PublicContent }).data
          : null,
      )
      .then((value) => {
        if (active) {
          if (value) {
            document.title = `${value.seoTitle || value.title} — AI Desk`;
            const description = value.metaDescription || value.summary;
            let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
            if (!meta) {
              meta = document.createElement("meta");
              meta.name = "description";
              document.head.appendChild(meta);
            }
            meta.content = description;
          }
          setItem(value);
          setDone(true);
        }
      })
      .catch(() => {
        if (active) setDone(true);
      });
    return () => {
      active = false;
    };
  }, [kind]);
  return (
    <div className="public-content premium-page">
      <section className="container-content detail-empty">
        <a href={kind === "article" ? "/blog" : "/apps"}>
          <ArrowLeft aria-hidden="true" /> Quay lại{" "}
          {kind === "article" ? "Blog" : "Ứng dụng"}
        </a>
        {item ? (
          <>
            <span className="content-kicker">{item.category || "AI Desk"}</span>
            <h1>{item.title}</h1>
            <p>{item.summary}</p>
            {item.publishedAt ? (
              <p className="content-meta">
                <time dateTime={new Date(item.publishedAt).toISOString()}>
                  Đăng ngày {formatDate(item.publishedAt)}
                </time>
                {item.tags?.length ? ` · ${item.tags.join(", ")}` : ""}
              </p>
            ) : null}
            {kind === "app" && <AppFacts data={item.data ?? {}} />}
            <div className="preview-body"><MarkdownBody>{item.bodyMarkdown}</MarkdownBody></div>
            <Comments kind={kind} item={item} />
          </>
        ) : done ? (
          <>
            <span className="content-kicker">Chưa xuất bản</span>
            <h1>Nội dung này chưa có trên website.</h1>
            <p>
              Đường dẫn chỉ hoạt động sau khi chủ sở hữu duyệt và xuất bản nội
              dung thật.
            </p>
          </>
        ) : (
          <p role="status">Đang tải nội dung…</p>
        )}
      </section>
    </div>
  );
};
