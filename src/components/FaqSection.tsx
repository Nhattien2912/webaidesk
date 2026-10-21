import React, { useId, useRef, useState } from 'react'
import { Minus, Plus, Search, X } from 'lucide-react'
import { SECTION_IDS } from '../config/navigation'
import { FAQS, searchFaqs, type FaqEntry } from '../data/faq'
import './faq.css'

const AnswerParagraph: React.FC<{ text: string; links?: FaqEntry['links'] }> = ({ text, links }) => {
  const parts: React.ReactNode[] = []
  let offset = 0
  const matches = (links ?? []).map((link) => ({ ...link, start: text.indexOf(link.text) }))
    .filter((link) => link.start >= 0).sort((a, b) => a.start - b.start)
  for (const link of matches) {
    parts.push(text.slice(offset, link.start))
    parts.push(<a key={link.href} href={link.href}>{link.text}</a>)
    offset = link.start + link.text.length
  }
  parts.push(text.slice(offset))
  return <p>{parts}</p>
}

export const FaqSection: React.FC = () => {
  const [openQuestion, setOpenQuestion] = useState<string | null>(FAQS[0].id)
  const [query, setQuery] = useState('')
  const baseId = useId()
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = searchFaqs(query)

  const clearSearch = () => {
    setQuery('')
    searchRef.current?.focus()
  }

  return (
    <section id={SECTION_IDS.faq} aria-labelledby="faq-title" className="faq-v3">
      <div className="container-content faq-v3-layout">
        <div className="faq-v3-intro">
          <p className="faq-v3-eyebrow">FAQ</p>
          <h2 id="faq-title">Câu hỏi thường gặp</h2>
          <p className="faq-v3-lead">Những điều cần biết về bản Beta, cách cài đặt và quyền sử dụng AI Desk.</p>
          <div className="faq-v3-search">
            <label htmlFor={`${baseId}-search`} className="sr-only">Tìm câu hỏi</label>
            <Search className="faq-v3-search-icon" aria-hidden="true" />
            <input ref={searchRef} id={`${baseId}-search`} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm câu hỏi: tài khoản, Windows…" aria-describedby={`${baseId}-search-hint`} />
            {query && <button type="button" className="faq-v3-clear" onClick={clearSearch} aria-label="Xóa từ khóa tìm kiếm"><X aria-hidden="true" /></button>}
          </div>
          <p id={`${baseId}-search-hint`} className="faq-v3-search-hint">Tìm theo câu hỏi hoặc nội dung trả lời, có dấu hoặc không dấu.</p>
          <p className="faq-v3-result-count" role="status" aria-live="polite" aria-atomic="true">{query.trim() ? `${filtered.length} câu hỏi phù hợp` : `${FAQS.length} câu hỏi giúp bạn bắt đầu`}</p>
        </div>

        <div className="faq-v3-list">
          {filtered.length === 0 && <div className="faq-v3-empty"><Search aria-hidden="true" /><h3>Không tìm thấy câu hỏi phù hợp.</h3><p>Thử từ khóa khác như “Beta”, “tài khoản” hoặc “dữ liệu”.</p><button type="button" onClick={clearSearch}>Xóa tìm kiếm</button></div>}
          {filtered.map((faq) => {
            const open = openQuestion === faq.id
            const panelId = `${baseId}-faq-${faq.id}`
            const triggerId = `${panelId}-trigger`
            return (
              <div key={faq.id} className={`faq-v3-item ${open ? 'is-open' : ''}`}>
                <h3><button type="button" id={triggerId} aria-expanded={open} aria-controls={panelId} onClick={() => setOpenQuestion(open ? null : faq.id)}><span>{faq.question}</span><span className="faq-v3-toggle-icon">{open ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}</span></button></h3>
                <div id={panelId} role="region" aria-labelledby={triggerId} hidden={!open} className="faq-v3-answer">
                  {faq.paragraphs.map((paragraph) => <AnswerParagraph key={paragraph} text={paragraph} links={faq.links} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
