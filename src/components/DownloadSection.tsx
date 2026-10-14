import React, { useState } from 'react';
import { 
  Monitor, 
  Download, 
  AlertCircle, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight
} from 'lucide-react';

interface DownloadSectionProps {
  onOpenEarlyAccess: () => void;
}

export const DownloadSection: React.FC<DownloadSectionProps> = ({ onOpenEarlyAccess }) => {
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);

  const handleDownloadClick = () => {
    setDownloadNotice(
      'AI Desk hiện đang hoàn tất đợt kiểm thử Closed Beta nội bộ. Vui lòng để lại email bên dưới để nhận link tải bộ cài đặt .exe ngay khi đợt mở rộng bắt đầu.'
    );
  };

  return (
    <section id="download" className="py-24 relative overflow-hidden bg-[#0A0E17]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-blue/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Box */}
        <div className="rounded-3xl bg-gradient-to-b from-[#0E1528] to-[#0A0F1D] border border-[#202C47] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Left Content (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/15 border border-brand-blue/30 text-xs font-semibold text-brand-blue">
                <Monitor className="w-3.5 h-3.5" />
                <span>BẢN DÀNH CHO WINDOWS DESKTOP</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Trải nghiệm AI Desk trên máy tính của bạn
              </h2>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl">
                Phần mềm desktop độc lập được xây dựng để tận dụng tối đa sức mạnh phần cứng máy tính, độ trễ cực thấp và khả năng cách ly bảo mật dữ liệu tuyệt đối trên Windows.
              </p>

              {/* Specs & Requirements Table */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#121A2C] border border-[#1E2942] space-y-1">
                  <div className="text-slate-400 font-mono text-[11px]">Hệ điều hành:</div>
                  <div className="font-semibold text-white">Windows 10 / 11</div>
                  <div className="text-[10px] text-slate-500">64-bit Architecture</div>
                </div>

                <div className="p-3 rounded-xl bg-[#121A2C] border border-[#1E2942] space-y-1">
                  <div className="text-slate-400 font-mono text-[11px]">Yêu cầu RAM:</div>
                  <div className="font-semibold text-white">Tối thiểu 8GB RAM</div>
                  <div className="text-[10px] text-slate-500">Khuyên dùng 16GB</div>
                </div>

                <div className="p-3 rounded-xl bg-[#121A2C] border border-[#1E2942] space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-slate-400 font-mono text-[11px]">Runtime nền tảng:</div>
                  <div className="font-semibold text-white">WebView2 / C++</div>
                  <div className="text-[10px] text-emerald-400">Tự động cấu hình</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={onOpenEarlyAccess}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 transition-all hover:scale-[1.01]"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Đăng ký nhận bộ cài đặt Windows</span>
                </button>

                <button
                  onClick={handleDownloadClick}
                  className="px-5 py-3.5 rounded-xl bg-[#141C2E] hover:bg-[#1A253E] border border-[#23314F] text-slate-300 hover:text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4 text-brand-blue" />
                  <span>Tải trực tiếp (.exe)</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                    Sắp ra mắt
                  </span>
                </button>
              </div>

              {/* Download Notice Box */}
              {downloadNotice && (
                <div className="p-4 rounded-xl bg-[#151D30] border border-brand-blue/30 text-xs text-slate-200 space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 text-brand-blue font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Thông tin về đợt phát hành:</span>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    {downloadNotice}
                  </p>
                  <button
                    onClick={onOpenEarlyAccess}
                    className="text-xs text-brand-blue hover:underline flex items-center gap-1 font-medium"
                  >
                    Mở form đăng ký email ngay <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Không tạo file cài đặt giả. Tôn trọng an toàn bảo mật máy tính người dùng.</span>
              </div>
            </div>

            {/* Right Graphic / App Window Card (5 cols) */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-[#080B14] border border-[#1E2940] shadow-xl space-y-4 font-mono text-xs">
                <div className="flex items-center justify-between pb-3 border-b border-[#161F33]">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                    <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                  </div>
                  <span className="text-slate-400 text-[11px]">AI Desk Package Status</span>
                </div>

                <div className="space-y-2 text-[11px] leading-relaxed text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tên gói:</span>
                    <span className="text-slate-200">AIDesk-Setup-x64.exe</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phiên bản:</span>
                    <span className="text-brand-blue">v0.8.4 (Beta Preview)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Chữ ký số:</span>
                    <span className="text-emerald-400">Đang thẩm định CodeSign</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dung lượng ước tính:</span>
                    <span className="text-slate-200">~68 MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nền tảng mục tiêu:</span>
                    <span className="text-slate-200">Windows 10/11 64-bit</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0F1626] border border-[#1A263D] text-[11px] text-slate-400 space-y-1">
                  <span className="text-emerald-400 font-semibold">● Cam kết kỹ thuật:</span>
                  <p>Mã nguồn chạy cục bộ trên máy trạm của bạn. Không chuyển tiếp mã nguồn dự án qua máy chủ trung gian không rõ nguồn gốc.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
