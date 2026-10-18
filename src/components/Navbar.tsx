import React, { useState, useRef, useEffect } from 'react'
import { Bell, ChevronDown, Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { mainNav, SECTION_IDS, type NavItem } from '../config/navigation'
import { useDialog } from '../lib/useDialog'

// Dropdown menu for nav items with children
const NavDropdown: React.FC<{ item: NavItem; onClose: () => void; activePath: string }> = ({ item, onClose, activePath }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-brand-ice hover:text-brand-navy ${item.children?.some((child) => child.href === activePath) ? 'bg-brand-ice text-brand-navy' : 'text-slate-600'}`}
      >
        {item.label}
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-brand-border bg-white p-1.5 shadow-xl shadow-blue-950/10"
        >
          {item.children?.map((child) => (
            <a
              key={child.href}
              href={child.href}
              aria-current={child.href === activePath ? 'page' : undefined}
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onClose()
              }}
              className={`block rounded-lg px-4 py-2.5 text-[13px] font-medium transition-colors hover:bg-brand-ice hover:text-brand-navy ${child.href === activePath ? 'bg-brand-ice text-brand-navy' : 'text-slate-600'}`}
            >
              {child.label}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

export const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const close = () => {
    setMenuOpen(false)
    setMobileExpanded(null)
  }
  const panelRef = useDialog<HTMLDivElement>(menuOpen, close)
  const activePath = typeof window === 'undefined' ? '' : window.location.pathname

  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-white/95 shadow-[0_8px_24px_-20px_rgba(11,31,77,0.35)] backdrop-blur-xl">
      <div className="container-content flex h-16 items-center justify-between gap-6">
        <Logo variant="light" />

        <nav aria-label="Điều hướng chính" className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {mainNav.map((item) => (
              <li key={item.href ?? item.label}>
                {item.children ? (
                  <NavDropdown item={item} onClose={close} activePath={activePath} />
                ) : (
                  <a
                    href={item.href ?? '/'}
                    aria-current={item.href === activePath ? 'page' : undefined}
                    className={`rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-brand-ice hover:text-brand-navy ${item.href === activePath ? 'bg-brand-ice text-brand-navy' : 'text-slate-600'}`}
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`/#${SECTION_IDS.waitlist}`}
            className="btn hidden border border-brand-primary/20 bg-brand-ice px-3.5 py-2 text-[13px] text-brand-primary hover:bg-blue-100 sm:inline-flex"
          >
            <Bell className="h-3.5 w-3.5" aria-hidden="true" />
            Nhận thông báo Pro
          </a>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-brand-navy hover:bg-brand-ice lg:hidden"
            aria-label="Mở menu điều hướng"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-brand-navy/25 backdrop-blur-sm" aria-hidden="true" onClick={close} />
          <div
            id="mobile-menu"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            tabIndex={-1}
            className="absolute inset-x-0 top-0 border-b border-brand-border bg-white px-5 pb-6 pt-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <Logo variant="light" />
              <button
                type="button"
                onClick={close}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-navy hover:bg-brand-ice"
                aria-label="Đóng menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Điều hướng di động" className="mt-3">
              <ul className="flex flex-col">
                {mainNav.map((item) => (
                  <li key={item.href ?? item.label}>
                    {item.children ? (
                      <div>
                        <button
                          type="button"
                          onClick={() =>
                            setMobileExpanded((v) => (v === item.label ? null : item.label))
                          }
                          aria-expanded={mobileExpanded === item.label}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-base font-medium text-slate-700 hover:bg-brand-ice"
                        >
                          {item.label}
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`}
                            aria-hidden="true"
                          />
                        </button>
                        {mobileExpanded === item.label && (
                          <ul className="ml-3 border-l border-brand-border pl-3">
                            {item.children.map((child) => (
                              <li key={child.href}>
                                <a
                                  href={child.href}
                                  aria-current={child.href === activePath ? 'page' : undefined}
                                  onClick={close}
                                  className={`block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-brand-ice hover:text-brand-navy ${child.href === activePath ? 'bg-brand-ice text-brand-navy' : 'text-slate-600'}`}
                                >
                                  {child.label}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : (
                      <a
                        href={item.href ?? '/'}
                        aria-current={item.href === activePath ? 'page' : undefined}
                        onClick={close}
                        className={`block rounded-lg px-3 py-3 text-base font-medium hover:bg-brand-ice ${item.href === activePath ? 'bg-brand-ice text-brand-navy' : 'text-slate-700'}`}
                      >
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
            <a href={`/#${SECTION_IDS.waitlist}`} onClick={close} className="btn-primary mt-4 w-full">
              <Bell className="h-4 w-4" aria-hidden="true" />
              Nhận thông báo Pro
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
