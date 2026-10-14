import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  PlayCircle, 
  ShieldCheck, 
  Monitor, 
  Workflow, 
  Cpu
} from 'lucide-react';
import { DesktopAppPreview } from './DesktopAppPreview';

interface HeroProps {
  onOpenEarlyAccess: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenEarlyAccess }) => {
  return (
    <section id="overview" className="relative pt-32 pb-20 md:pt-36 md:pb-28 overflow-hidden bg-[#080B12]">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-r from-brand-blue/15 via-brand-indigo/20 to-brand-purple/15 blur-[120px] pointer-events-none rounded-full" />
      <div className="absolute -top-24 left-1/4 w-96 h-96 bg-brand-blue/10 blur-[100px] pointer-events-none rounded-full" />
      
      {/* Background grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Tag & Status Badges */}
        <div className="flex flex-col items-center text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#111827]/90 border border-[#1E293B] shadow-inner-glow">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue"></span>
            </span>
            <span className="text-xs font-medium text-slate-300">
              Phần mềm Windows Desktop • Thử nghiệm độc lập
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-xs font-mono text-brand-blue font-semibold">
              Preview v0.8
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
            <span>Tagline: "Một trung tâm. Nhiều AI. Một quy trình làm việc."</span>
          </div>
        </div>

        {/* Main Headline & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
            Đừng chuyển qua lại giữa các AI. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
              Hãy để chúng phối hợp cùng nhau.
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            <strong className="text-white font-semibold">AI Desk</strong> kết nối{' '}
            <span className="text-brand-blue font-medium">GPT Manager</span> với{' '}
            <span className="text-purple-300 font-medium">Codex</span>,{' '}
            <span className="text-indigo-300 font-medium">Claude</span>,{' '}
            <span className="text-amber-300 font-medium">Antigravity</span> và các công cụ AI lập trình trong một không gian làm việc thống nhất.
          </p>

          {/* Call to Actions */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <a
              href="#orchestrator"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue via-brand-indigo to-brand-purple hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-brand-blue/25 hover:shadow-brand-blue/40 flex items-center justify-center gap-2.5 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Xem demo hoạt động</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              onClick={onOpenEarlyAccess}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#111728] hover:bg-[#161F36] border border-[#23314F] hover:border-brand-blue/40 text-slate-200 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Monitor className="w-4 h-4 text-brand-blue" />
              <span>Đăng ký nhận bản Windows</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-blue/15 text-brand-blue font-mono font-medium">
                Early Access
              </span>
            </button>
          </div>

          {/* Micro trust indicators */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Session Guard ngăn rò rỉ ngữ cảnh</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Workflow className="w-4 h-4 text-brand-blue" />
              <span>Luân chuyển task tự động</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-purple-400" />
              <span>Chạy native trên Windows 10 & 11</span>
            </div>
          </div>
        </div>

        {/* Desktop App Preview Window (The center visual) */}
        <div className="mt-8 relative">
          <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-brand-blue/20 via-transparent to-brand-purple/10 blur-xl opacity-60" />
          <div className="relative">
            <DesktopAppPreview />
          </div>
        </div>

      </div>
    </section>
  );
};
