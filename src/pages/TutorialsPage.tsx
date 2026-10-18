import React, { useState, useMemo } from 'react'
import { PlayCircle, Search, Tag, Clock, Filter, BookOpen } from 'lucide-react'
import { tutorialVideos, videoCategories, type TutorialVideo } from '../data/tutorials'

const getYoutubeThumbnail = (youtubeId: string): string =>
  youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : ''

// Status badge
const StatusBadge: React.FC<{ status: TutorialVideo['status'] }> = ({ status }) => {
  if (status === 'published') return null
  return (
    <span
      className={`badge absolute right-3 top-3 ${
        status === 'coming-soon'
          ? 'bg-navy-800/90 text-slate-400 ring-1 ring-white/10'
          : 'bg-amber-400/10 text-amber-300'
      }`}
    >
      {status === 'coming-soon' ? 'Sắp có' : 'Nháp'}
    </span>
  )
}

// Video card thumbnail
const VideoThumbnail: React.FC<{ video: TutorialVideo }> = ({ video }) => {
  const thumbUrl = video.youtubeId ? getYoutubeThumbnail(video.youtubeId) : ''
  const isAvailable = video.status === 'published' && video.youtubeId

  return (
    <div className="relative aspect-video overflow-hidden rounded-t-card bg-navy-800">
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-subtle">
          <PlayCircle className="h-10 w-10 opacity-30" aria-hidden="true" />
          <span className="text-xs">Video sắp có</span>
        </div>
      )}
      {/* Duration badge */}
      {video.duration && (
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-1.5 py-0.5 font-mono text-[11px] text-white">
          {video.duration}
        </span>
      )}
      {/* Overlay for coming-soon */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-navy-950/40" aria-hidden="true" />
      )}
      <StatusBadge status={video.status} />
    </div>
  )
}
// Category tag badge
const CategoryTag: React.FC<{ label: string }> = ({ label }) => (
  <span className="flex items-center gap-1 rounded-full bg-white/[0.04] px-2.5 py-0.5 text-xs font-medium text-subtle ring-1 ring-white/10">
    <Tag className="h-2.5 w-2.5" aria-hidden="true" />
    {label}
  </span>
)

// Video card
const VideoCard: React.FC<{ video: TutorialVideo; onPlay: (v: TutorialVideo) => void }> = ({
  video,
  onPlay,
}) => {
  const categoryLabel =
    videoCategories.find((c) => c.id === video.category)?.label ?? video.category
  const isPlayable = video.status === 'published' && video.youtubeId

  return (
    <article className="card flex flex-col overflow-hidden transition-colors hover:border-white/20">
      <VideoThumbnail video={video} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryTag label={categoryLabel} />
          {video.publishedAt && (
            <span className="flex items-center gap-1 text-[11px] text-subtle">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {new Date(video.publishedAt).toLocaleDateString('vi-VN')}
            </span>
          )}
        </div>
        <h3 className="mt-3 font-semibold text-white">{video.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{video.description}</p>
        <div className="mt-4">
          {isPlayable ? (
            <button
              type="button"
              onClick={() => onPlay(video)}
              className="btn-primary w-full"
            >
              <PlayCircle className="h-4 w-4" aria-hidden="true" />
              Xem video
            </button>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="btn w-full cursor-not-allowed border border-white/10 bg-white/[0.03] text-subtle"
            >
              <Clock className="h-4 w-4" aria-hidden="true" />
              Sắp ra mắt
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// Video player modal
const VideoModal: React.FC<{
  video: TutorialVideo | null
  onClose: () => void
}> = ({ video, onClose }) => {
  if (!video) return null
  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-card border border-line bg-navy-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="font-semibold text-white">{video.title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-subtle hover:bg-white/10 hover:text-white"
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            allow="autoplay; fullscreen"
            className="h-full w-full"
            title={video.title}
          />
        </div>
        <div className="p-5">
          <p className="text-sm leading-relaxed text-muted">{video.description}</p>
        </div>
      </div>
    </div>
  )
}
// Empty state
const EmptyState: React.FC<{ query: string; category?: string }> = ({ query }) => (
  <div className="col-span-full flex flex-col items-center py-20 text-center">
    <BookOpen className="h-12 w-12 text-subtle opacity-40" aria-hidden="true" />
    <p className="mt-4 font-medium text-ink">Không tìm thấy video nào</p>
    <p className="mt-2 text-sm text-muted">
      {query ? `Không có video nào khớp với "${query}"` : `Không có video nào trong danh mục này`}
    </p>
  </div>
)

export const TutorialsPage: React.FC = () => {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [playingVideo, setPlayingVideo] = useState<TutorialVideo | null>(null)

  const filtered = useMemo(() => {
    return tutorialVideos.filter((v) => {
      const matchCategory = activeCategory === 'all' || v.category === activeCategory
      const q = query.toLowerCase()
      const matchQuery =
        !q || v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
      return matchCategory && matchQuery
    })
  }, [query, activeCategory])

  const featuredVideo = tutorialVideos.find((v) => v.status === 'published') ?? tutorialVideos[0]

  return (
    <div className="premium-page">
      {/* Hero */}
      <div className="border-b border-white/[0.06] bg-navy-950">
        <div className="container-content py-16 sm:py-20">
          <a href="/" className="text-sm font-medium text-accent-light hover:underline">
            ← Về trang chủ
          </a>
          <p className="eyebrow mt-6">Thư viện video</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Video hướng dẫn AI Desk
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Học cách cài đặt và sử dụng AI Desk qua các video hướng dẫn từng bước. Video đang được
            chuẩn bị cùng với bản Public Beta.
          </p>
          <div
            role="status"
            aria-live="polite"
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/[0.05] px-3 py-1.5 text-sm text-amber-300"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            Video đang được sản xuất — cập nhật khi có bản Beta
          </div>
        </div>
      </div>

      <div className="container-content py-12">
        {/* Featured video placeholder */}
        {featuredVideo && (
          <section aria-labelledby="featured-title" className="mb-12">
            <h2 id="featured-title" className="mb-6 text-xl font-semibold text-white">
              Video nổi bật
            </h2>
            <div className="card overflow-hidden lg:grid lg:grid-cols-[1.6fr_1fr]">
              <div className="relative aspect-video bg-navy-800 lg:aspect-auto">
                <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-subtle">
                  <PlayCircle className="h-16 w-16 opacity-20" aria-hidden="true" />
                  <span className="text-sm">Video sắp có</span>
                </div>
              </div>
              <div className="flex flex-col justify-center p-6">
                <CategoryTag
                  label={videoCategories.find((c) => c.id === featuredVideo.category)?.label ?? ''}
                />
                <h3 className="mt-3 text-xl font-semibold text-white">{featuredVideo.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {featuredVideo.description}
                </p>
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  className="btn mt-6 w-fit cursor-not-allowed border border-white/10 bg-white/[0.03] text-subtle"
                >
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  Sắp ra mắt
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-xs flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
              aria-hidden="true"
            />
            <input
              type="search"
              placeholder="Tìm kiếm video..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="field pl-9"
              aria-label="Tìm kiếm video"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
            {videoCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                aria-pressed={activeCategory === cat.id}
                className={`badge whitespace-nowrap px-3 py-1.5 text-[13px] transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-accent/15 text-accent-light ring-1 ring-accent/40'
                    : 'bg-white/[0.04] text-subtle hover:bg-white/[0.08] hover:text-ink ring-1 ring-white/10'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-6 text-sm text-subtle" aria-live="polite">
          {filtered.length} video
          {query ? ` khớp với "${query}"` : ''}
        </p>

        {/* Video grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.length > 0 ? (
            filtered.map((video) => (
              <VideoCard key={video.id} video={video} onPlay={setPlayingVideo} />
            ))
          ) : (
            <EmptyState query={query} category={activeCategory} />
          )}
        </div>

        {/* Coming soon callout */}
        <div className="mt-12 rounded-card border border-white/[0.06] bg-navy-900 p-6 text-center">
          <PlayCircle className="mx-auto h-10 w-10 text-accent-light opacity-60" aria-hidden="true" />
          <h2 className="mt-4 text-lg font-semibold text-white">
            Video đang được sản xuất
          </h2>
          <p className="mt-2 text-sm text-muted">
            Các video hướng dẫn sẽ được ra mắt cùng bản Public Beta. Đăng ký để nhận thông báo khi
            có video mới.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <a href="/#pro-news" className="btn-primary">
              Nhận thông báo
            </a>
            <a href="/install" className="btn-secondary-dark">
              Xem hướng dẫn cài đặt
            </a>
          </div>
        </div>
      </div>

      {/* Video modal */}
      {playingVideo && (
        <VideoModal video={playingVideo} onClose={() => setPlayingVideo(null)} />
      )}
    </div>
  )
}
