import React from 'react';
import { 
  Layers, 
  ArrowUp, 
  Mail, 
  ShieldCheck 
} from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#05070D] border-t border-[#161E31] text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 mb-12">
          
          {/* Brand Info (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-purple p-[1px]">
                <div className="w-full h-full bg-[#0E1320] rounded-[11px] flex items-center justify-center">
                  <Layers className="w-4 h-4 text-brand-blue" />
                </div>
              </div>
              <span className="text-lg font-bold text-white tracking-tight font-sans">
                AI Desk
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-brand-blue/10 text-brand-blue border border-brand-blue/20">
                Independent Tool
              </span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed max-w-sm">
              "Một trung tâm. Nhiều AI. Một quy trình làm việc."
              <br />
              Phần mềm Windows Desktop giúp lập trình viên quản lý, bảo vệ ngữ cảnh và điều phối nhiều công cụ AI lập trình trong cùng một quy trình làm việc thống nhất.
            </p>

            <div className="flex items-center gap-3 pt-1 text-slate-400">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Trạng thái: Đang trong chu kỳ Closed Beta v0.8
              </span>
            </div>
          </div>

          {/* Group 1: Product */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Sản phẩm
            </h4>
            <ul className="space-y-2">
              <li><a href="#overview" className="hover:text-white transition-colors">Tổng quan kiến trúc</a></li>
              <li><a href="#orchestrator" className="hover:text-white transition-colors">Demo điều phối trực quan</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">6 Tính năng kỹ thuật</a></li>
              <li><a href="#comparison" className="hover:text-white transition-colors">So sánh hiệu năng</a></li>
              <li><a href="#download" className="hover:text-white transition-colors">Tải bản Windows</a></li>
            </ul>
          </div>

          {/* Group 2: Documentation & Tech */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Tài liệu & Kỹ thuật
            </h4>
            <ul className="space-y-2">
              <li><a href="#faq" className="hover:text-white transition-colors">Cơ chế Session Guard</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Giao thức GPT Manager</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Safe Flow Recovery</a></li>
              <li><a href="#pricing" className="hover:text-white transition-colors">Chính sách Early Access</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Bảo mật dữ liệu cục bộ</a></li>
            </ul>
          </div>

          {/* Group 3: Contact & Updates */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Cập nhật & Liên hệ
            </h4>
            <ul className="space-y-2">
              <li>
                <a href="#download" className="hover:text-white transition-colors flex items-center gap-1">
                  <span>Changelog v0.8.4</span>
                  <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">Beta</span>
                </a>
              </li>
              <li><a href="#faq" className="hover:text-white transition-colors">Báo cáo lỗi (Issue Tracker)</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">Đăng ký khảo sát người dùng</a></li>
              <li>
                <a href="mailto:support@aidesk.local" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-brand-blue" />
                  <span>support@aidesk.local</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-2xl bg-[#090D18] border border-[#161F33] text-[11px] text-slate-400 space-y-2 mb-8 leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <ShieldCheck className="w-4 h-4 text-brand-blue" />
            <span>Tuyên bố pháp lý & Tính độc lập:</span>
          </div>
          <p>
            AI Desk là sản phẩm phần mềm độc lập dành cho nhà phát triển (Independent Developer Tool). Chúng tôi không có quan hệ đối tác chính thức, không được tài trợ hay chứng thực bởi OpenAI, Anthropic, Google hay Microsoft. Các thương hiệu ChatGPT, Codex, Claude, Google Antigravity và Windows thuộc quyền sở hữu độc quyền của các tổ chức tương ứng. Mọi số liệu mô phỏng trên website nhằm mục đích minh họa trải nghiệm giao diện người dùng (UX preview).
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-[#141B2E] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} AI Desk. Tất cả quyền được bảo lưu. Thiết kế cho cộng đồng kỹ sư phần mềm.
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F1628] hover:bg-[#151E36] border border-[#1E2942] text-xs text-slate-300 hover:text-white transition-colors"
          >
            <span>Lên đầu trang</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </footer>
  );
};
