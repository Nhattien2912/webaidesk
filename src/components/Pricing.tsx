import React from 'react';
import { 
  Check, 
  Sparkles, 
  ArrowRight,
  Info
} from 'lucide-react';

interface PricingProps {
  onOpenEarlyAccess: () => void;
}

export const Pricing: React.FC<PricingProps> = ({ onOpenEarlyAccess }) => {
  return (
    <section id="pricing" className="py-24 relative overflow-hidden bg-[#080B12]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-xs font-semibold text-brand-blue mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MÔ HÌNH THƯƠNG MẠI HÓA</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Bảng giá & Gói dịch vụ dự kiến
          </h2>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Chúng tôi đang hoàn thiện cấu trúc gói để đảm bảo mức giá hợp lý nhất cho cộng đồng lập trình viên. Đăng ký sớm để nhận ưu đãi Early Bird khi chính thức ra mắt.
          </p>

          {/* Honest Transparency Notice */}
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 text-left">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Lưu ý:</strong> Mức giá chính thức và chính sách quyền lợi đang trong giai đoạn khảo sát. Hiện tại chưa mở cổng thanh toán thương mại.
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          
          {/* Plan 1: Free / Community */}
          <div className="rounded-3xl bg-[#0B0F19] border border-[#1A243A] p-6 sm:p-8 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Gói Cá nhân
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                  Dự kiến Miễn phí
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Community
              </h3>

              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Dành cho lập trình viên cá nhân muốn trải nghiệm quy trình điều phối giữa GPT Manager và 1 worker.
              </p>

              <div className="mb-6 pb-6 border-b border-[#182136]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">0₫</span>
                  <span className="text-xs text-slate-500 font-mono">/ sử dụng cơ bản</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  * Trạng thái: Sắp mở thử nghiệm
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="text-xs font-semibold text-slate-300">Tính năng dự kiến:</div>
                {[
                  'Cài đặt trực tiếp trên Windows Desktop',
                  'Kết nối 1 AI Manager + 1 AI Worker',
                  'Giao diện Session Guard cục bộ',
                  'Xem hội thoại và code diff cơ bản',
                  'Cập nhật bản vá từ cộng đồng'
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <Check className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={onOpenEarlyAccess}
                className="w-full py-3 px-4 rounded-xl bg-[#141C2E] hover:bg-[#1A253E] border border-[#23314F] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Đăng ký nhận bản Community</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Plan 2: AI Desk Pro (Featured) */}
          <div className="rounded-3xl bg-[#0E1528] border-2 border-brand-blue p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl shadow-brand-blue/15 scale-100 lg:-translate-y-2">
            {/* Top Pill */}
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-blue to-brand-indigo text-white text-[11px] font-bold uppercase tracking-wider shadow-md">
              Khuyên dùng cho Developer
            </div>

            <div>
              <div className="flex items-center justify-between mb-4 mt-1">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-blue font-mono">
                  Gói Chuyên nghiệp
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 text-[10px] font-mono">
                  Ưu tiên Early Bird
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                AI Desk Pro
              </h3>

              <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                Đầy đủ sức mạnh điều phối đa AI không giới hạn, giám sát quota chuyên sâu và phục hồi lỗi an toàn.
              </p>

              <div className="mb-6 pb-6 border-b border-[#213052]">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">Sắp công bố</span>
                  <span className="text-xs text-brand-blue font-mono bg-brand-blue/10 px-2 py-0.5 rounded">
                    Dự kiến
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  * Thành viên Early Access được giảm 40% trọn đời khi mở bán
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="text-xs font-semibold text-white">Tất cả quyền lợi Community, cộng thêm:</div>
                {[
                  'Không giới hạn số lượng AI Worker kết nối song song',
                  'Hỗ trợ Codex, Claude, Antigravity & OpenCode',
                  'Giám sát Quota & cảnh báo thời gian thực',
                  'Safe Flow Recovery (Retry, Divert, Safe Rollback)',
                  'Lưu trữ và xuất audit trace log chi tiết',
                  'Kênh hỗ trợ kỹ thuật ưu tiên từ nhà phát triển'
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-200">
                    <Check className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={onOpenEarlyAccess}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/25 transition-all hover:scale-[1.01]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Giữ chỗ ưu đãi Pro Early Bird</span>
              </button>
            </div>
          </div>

          {/* Plan 3: Early Access Team */}
          <div className="rounded-3xl bg-[#0B0F19] border border-[#1A243A] p-6 sm:p-8 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Gói Nhóm & Studio
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-mono">
                  Đang hoàn thiện
                </span>
              </div>

              <h3 className="text-2xl font-bold text-white mb-2">
                Team Access
              </h3>

              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Dành cho các đội ngũ phát triển phần mềm muốn chuẩn hóa quy trình điều phối AI chung trong dự án.
              </p>

              <div className="mb-6 pb-6 border-b border-[#182136]">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold text-white">Đang khảo sát</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  * Thiết kế riêng theo quy mô và yêu cầu hạ tầng
                </div>
              </div>

              <div className="space-y-3 mb-8">
                <div className="text-xs font-semibold text-slate-300">Tính năng đang nghiên cứu:</div>
                {[
                  'Chia sẻ cấu hình pipeline và prompt template chung',
                  'Đồng bộ trace log và audit qua Git hoặc cloud riêng',
                  'Hỗ trợ custom worker adapter theo giao thức công ty',
                  'Quản lý quota tập trung cho toàn team'
                ].map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-slate-400">
                    <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <button
                onClick={onOpenEarlyAccess}
                className="w-full py-3 px-4 rounded-xl bg-[#141C2E] hover:bg-[#1A253E] border border-[#23314F] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <span>Đăng ký tham gia khảo sát Team</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
