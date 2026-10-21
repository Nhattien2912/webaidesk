import type { FaqEntry } from '../data/faq'

/** CMS items -> render model. Answers are paragraphs separated by blank lines; link lines are `text | href`. */
export function toFaqEntries(items: Array<Record<string, string>>): FaqEntry[] {
  return items.map((item) => {
    const links = (item.links ?? '')
      .split('\n')
      .map((line) => line.split(' | '))
      .filter((parts) => parts.length === 2)
      .map(([text, href]) => ({ text: text.trim(), href: href.trim() }))
    const entry: FaqEntry = {
      id: item.id,
      question: item.question,
      paragraphs: (item.answer ?? '').split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean),
    }
    if (links.length) entry.links = links
    return entry
  })
}
