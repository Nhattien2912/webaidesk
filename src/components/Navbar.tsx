import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Menu, 
  X, 
  Download, 
  Sparkles, 
  Monitor
} from 'lucide-react';

interface NavbarProps {
  onOpenEarlyAccess: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenEarlyAccess }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Tổng quan', href: '#overview' },
    { name: 'Demo điều phối', href: '#orchestrator' },
    { name: 'Tính năng', href: '#features' },
    { name: 'So sánh', href: '#comparison' },
    { name: 'Bảng giá', href: '#pricing' },
    { name: 'Tải về', href: '#download' },
    { name: 'FAQ', href: '#faq' },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled 
          ? 'bg-[#080B12]/85 backdrop-blur-xl border-b border-[#1E273D]/80 shadow-lg shadow-black/40 py-3' 
          : 'bg-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue via-brand-indigo to-brand-purple p-[1px] shadow-lg shadow-brand-blue/20 group-hover:shadow-brand-blue/35 transition-all">
              <div className="w-full h-full bg-[#0E1320] rounded-[11px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-brand-blue group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-sans">
                  AI Desk
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-brand-blue/15 text-brand-blue border border-brand-blue/30 rounded uppercase tracking-wider">
                  Desktop
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono -mt-0.5 hidden sm:inline">
                v0.8 Early Preview
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 px-3 py-1.5 rounded-full bg-[#0E1320]/80 border border-[#1E273D] backdrop-blur-md shadow-inner-glow">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="px-3 py-1.5 text-xs lg:text-sm font-medium text-slate-300 hover:text-white rounded-full hover:bg-slate-800/60 transition-all"
              >
                {link.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={onOpenEarlyAccess}
              className="text-xs font-medium text-slate-300 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-indigo" />
              Đăng ký nhận tin
            </button>

            <a
              href="#download"
              className="px-4 py-2 rounded-lg bg-[#151C2C] hover:bg-[#1A2438] border border-[#24304D] hover:border-brand-blue/40 text-xs font-semibold text-white flex items-center gap-2 transition-all shadow-sm hover:shadow-brand-blue/10"
            >
              <Monitor className="w-3.5 h-3.5 text-brand-blue" />
              <span>Tải AI Desk</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Sắp ra mắt
              </span>
            </a>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenEarlyAccess}
              className="px-3 py-1.5 rounded-lg bg-brand-blue text-xs font-semibold text-white flex items-center gap-1 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5" /> Early Access
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#1E273D] bg-[#0A0E17]/95 backdrop-blur-2xl px-4 pt-3 pb-6 space-y-3 mt-3 animate-fadeIn">
          <div className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60"
              >
                {link.name}
              </a>
            ))}
          </div>

          <div className="pt-3 border-t border-[#1E273D] flex flex-col gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenEarlyAccess();
              }}
              className="w-full py-2.5 rounded-lg bg-brand-blue text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md"
            >
              <Sparkles className="w-4 h-4" /> Đăng ký nhận tin ra mắt
            </button>
            <a
              href="#download"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#151C2C] border border-[#24304D] text-slate-300 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 text-brand-blue" />
              <span>Tải cho Windows (Sắp ra mắt)</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
};
