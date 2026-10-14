import React from 'react';
import { 
  XCircle, 
  CheckCircle2, 
  SplitSquareVertical, 
  AlertTriangle,
  Zap
} from 'lucide-react';

export const BeforeAfter: React.FC = () => {
  const comparisons = [
    {
      title: 'Không gian làm việc',
      before: 'Mở 6-8 cửa sổ rời rạc: tab ChatGPT trên trình duyệt, terminal Codex, cửa sổ Claude Desktop và editor code.',
      after: 'Một trung tâm duy nhất trên Windows Desktop. Tất cả AI được tổ chức trong cùng một quy trình làm việc liền mạch.'
    },
    {
      title: 'Chuyển giao mã & Ngữ cảnh',
      before: 'Copy-paste thủ công prompt và code diff qua lại hàng chục lần mỗi ngày; dễ dính khoảng trắng lỗi hoặc thiếu file.',
      after: 'AI Desk tự động đóng gói đặc tả kiến trúc, context file liên quan và chuyển giao chính xác đến worker chỉ định.'
    },
    {
      title: 'Quản lý phiên & Tránh trôi context',
      before: 'Hội thoại dài khiến AI bị loãng ngữ cảnh, nhầm lẫn biến giữa các module và phản hồi sai lệch (hallucination).',
      after: 'Session Guard cách ly từng phiên của worker. Context luôn sạch, bảo mật biến môi trường và không bao giờ gửi nhầm thread.'
    },
    {
      title: 'Theo dõi tiến trình & Nghiệm thu',
      before: 'Mất dấu nhiệm vụ, không rõ AI nào đã làm xong khâu nào, phải tự tay tổng hợp code từ nhiều nguồn.',
      after: 'Timeline trực quan theo thời gian thực: Giám sát toàn bộ quá trình trao đổi giữa Manager và Worker qua dữ liệu ghi nhận.'
    },
    {
      title: 'Xử lý khi gặp lỗi hoặc chạm hạn mức',
      before: 'AI bị dừng đột ngột do hết hạn mức tin nhắn hoặc sinh mã lỗi mà không có phương án thay thế, gây gián đoạn dự án.',
      after: 'Chủ động giám sát quota; sẵn sàng cơ chế Safe Flow Recovery: Thử lại bước nghẽn, chuyển giao sang AI phụ, rollback an toàn.'
    }
  ];

  return (
    <section id="comparison" className="py-24 relative overflow-hidden bg-[#080B12]">
      {/* Background illumination */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300 mb-4">
            <SplitSquareVertical className="w-3.5 h-3.5 text-brand-blue" />
            <span>HIỆU QUẢ CÔNG VIỆC THỰC TẾ</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Sự khác biệt khi có AI Desk
          </h2>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Thay vì tốn thời gian làm "cầu nối copy-paste" thủ công giữa các công cụ AI, hãy tập trung vào bài toán cốt lõi và để AI Desk lo phần điều phối.
          </p>
        </div>

        {/* Side by Side Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card Left: TRƯỚC KHI CÓ AI DESK */}
          <div className="rounded-3xl bg-[#0D111C]/80 border border-rose-500/20 p-6 sm:p-8 space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#1A2234]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Trước khi có AI Desk
                  </h3>
                  <p className="text-xs text-rose-300/80 font-mono">Quy trình rời rạc, thủ công</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                Thất thoát thời gian
              </span>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#080B13] border border-[#161E2E] space-y-1.5">
                  <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400/80"></span>
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed pl-3 border-l border-rose-500/20">
                    {item.before}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/15 text-xs text-rose-300/90 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>Hệ quả: Bạn mất hơn 30% thời gian chỉ để dàn xếp cửa sổ và copy mã giữa các AI.</span>
            </div>
          </div>

          {/* Card Right: VỚI AI DESK */}
          <div className="rounded-3xl bg-[#0E1526]/90 border border-brand-blue/30 p-6 sm:p-8 space-y-6 relative shadow-xl shadow-brand-blue/5">
            <div className="flex items-center justify-between pb-4 border-b border-[#1E2940]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-brand-blue/15 border border-brand-blue/40 flex items-center justify-center text-brand-blue">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    Với AI Desk
                  </h3>
                  <p className="text-xs text-brand-blue font-mono">Một trung tâm thống nhất</p>
                </div>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-brand-blue/15 text-brand-blue border border-brand-blue/30 font-mono">
                Quy trình tự động hóa
              </span>
            </div>

            <div className="space-y-4">
              {comparisons.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0B101D] border border-[#1D2A45] space-y-1.5 hover:border-brand-blue/40 transition-colors">
                  <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue"></span>
                    <span className="text-white">{item.title}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed pl-3 border-l border-brand-blue/40">
                    {item.after}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-brand-blue/10 border border-brand-blue/20 text-xs text-brand-blue flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand-blue flex-shrink-0" />
              <span>Lợi ích: Giữ vững dòng suy nghĩ (flow state), kiểm soát hoàn toàn mã nguồn và tiết kiệm hàng giờ mỗi tuần.</span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
