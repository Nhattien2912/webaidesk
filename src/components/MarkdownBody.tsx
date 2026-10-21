import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { headingSlug } from "../lib/markdownToc";

const safeMarkdownUrl = (url: string) => {
  if (url.startsWith("/") || url.startsWith("#")) return url;
  try {
    const parsed = new URL(url);
    return ["https:", "mailto:"].includes(parsed.protocol) ? url : "";
  } catch {
    return "";
  }
};

/** Only images that the public media route will serve (published content only) are rendered. */
const PUBLIC_MEDIA = /^\/api\/content\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const textOf = (node: React.ReactNode): string =>
  React.Children.toArray(node)
    .map((child) =>
      typeof child === "string" || typeof child === "number"
        ? String(child)
        : React.isValidElement<{ children?: React.ReactNode }>(child)
          ? textOf(child.props.children)
          : "",
    )
    .join("");

/** Shared renderer for CMS Markdown: raw HTML is skipped, only https/mailto/relative links, images only from the public media route. */
const CALLOUTS: Record<string, string> = { NOTE: "Ghi chú", TIP: "Mẹo", IMPORTANT: "Quan trọng", WARNING: "Cảnh báo", CAUTION: "Lưu ý" };
const CALLOUT_MARKER = /^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i;

/** `> [!NOTE]` style quotes become labelled callouts; any other blockquote stays a plain quote. */
function Blockquote({ children }: { children?: React.ReactNode }) {
  const kids = React.Children.toArray(children);
  const index = kids.findIndex((child) => React.isValidElement(child));
  const first = index >= 0 ? kids[index] : null;
  if (React.isValidElement<{ children?: React.ReactNode }>(first)) {
    const inner = React.Children.toArray(first.props.children);
    const head = inner[0];
    const match = typeof head === "string" ? CALLOUT_MARKER.exec(head) : null;
    if (match && typeof head === "string") {
      const type = match[1]!.toUpperCase();
      const rest = [head.slice(match[0].length), ...inner.slice(1)].filter((part) => part !== "");
      const body = rest.length ? [React.cloneElement(first, { key: "first" }, ...rest)] : [];
      return (
        <aside className={`md-callout md-callout-${type.toLowerCase()}`} role="note">
          <p className="md-callout-title">{CALLOUTS[type]}</p>
          {body}
          {kids.slice(index + 1)}
        </aside>
      );
    }
  }
  return <blockquote>{children}</blockquote>;
}

export const MarkdownBody: React.FC<{ children: string; headingIds?: boolean; mediaBase?: string }> = ({ children, headingIds = false, mediaBase }) => {
  const seen = new Map<string, number>();
  const heading =
    (Tag: "h2" | "h3") =>
    ({ children: label, node: _node, ...props }: React.ComponentPropsWithoutRef<"h2"> & { node?: unknown }) => {
      if (!headingIds) return <Tag {...props}>{label}</Tag>;
      const base = headingSlug(textOf(label));
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      return (
        <Tag {...props} id={count ? `${base}-${count + 1}` : base}>
          {label}
        </Tag>
      );
    };
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={safeMarkdownUrl}
      components={{
        h2: heading("h2"),
        h3: heading("h3"),
        img: ({ src, alt }) =>
          typeof src === "string" && PUBLIC_MEDIA.test(src) ? (
            <img src={mediaBase ? `${mediaBase}/${src.split("/").pop()}` : src} alt={alt ?? ""} loading="lazy" decoding="async" onError={(event) => { event.currentTarget.style.display = "none"; }} />
          ) : null,
        a: ({ children: label, node: _node, ...props }) =>
          props.href ? (
            <a {...props} rel="noopener noreferrer">
              {label}
            </a>
          ) : (
            <span>{label}</span>
          ),
        blockquote: ({ children: quote }) => <Blockquote>{quote}</Blockquote>,
        input: ({ type, checked }) => (type === "checkbox" ? <input type="checkbox" checked={Boolean(checked)} disabled readOnly aria-label={checked ? "Đã hoàn thành" : "Chưa hoàn thành"} /> : null),
        table: ({ children: rows }) => (
          <div className="md-table-wrap" role="region" tabIndex={0} aria-label="Bảng dữ liệu">
            <table>{rows}</table>
          </div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
};
