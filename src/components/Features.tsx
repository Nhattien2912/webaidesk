import React from 'react';
import { 
  Network, 
  GitFork, 
  Layers, 
  Eye, 
  Gauge, 
  ShieldAlert, 
  CheckCircle2, 
  Activity
} from 'lucide-react';

export const Features: React.FC = () => {
  const featuresList = [
    {
      id: 'orchestration',
      icon: Network,
      iconColor: 'text-brand-blue',
      bgColor: 'bg-brand-blue/10 border-brand-blue/20',
      title: 'Multi-AI Orchestration',
      subtitle: 'Điều phối đa AI theo chuyên môn',
      description: 'Không có một mô hình AI nào giải quyết hoàn hảo mọi khâu. AI Desk kết nối ChatGPT (chỉ huy), Codex (viết mã), Claude (đánh giá & bảo mật) và Antigravity (IDE) vào cùng một đường ống xử lý.',
      bullets: [
        'Chia nhỏ bài toán phức tạp thành các task con',
        'Tự động dispatch task cho AI worker phù hợp nhất',
        'Thu thập và ghép nối kết quả theo thứ tự logic'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-emerald-400">● Pipeline Dispatch</span>
            <span>Workers: 3/3</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px]">GPT Manager</span>
            <span>→</span>
            <span className="px-1.5 py-0.5 rounded bg-brand-blue/10 text-brand-blue text-[9px]">Codex CLI</span>
            <span>→</span>
            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px]">Claude</span>
          </div>
        </div>
      )
    },
    {
      id: 'manager-workflow',
      icon: GitFork,
      iconColor: 'text-brand-indigo',
      bgColor: 'bg-brand-indigo/10 border-brand-indigo/20',
      title: 'GPT Manager Workflow',
      subtitle: 'Chuyển giao yêu cầu & nhận kết quả',
      description: 'Biến GPT thành người quản lý dự án kỹ thuật (Project Lead). GPT phân tích yêu cầu kiến trúc, tạo đặc tả task có cấu trúc chuẩn và giám sát toàn bộ tiến độ thực thi của các worker.',
      bullets: [
        'Bóc tách yêu cầu kiến trúc thành đặc tả JSON',
        'Chuyển giao task kèm ngữ cảnh file liên quan',
        'Tự động trả kết quả diff về GPT để đánh giá nghiệm thu'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono space-y-1">
          <div className="text-slate-400">TaskSpec #108: VerifyAuth</div>
          <div className="text-slate-300 truncate">Constraint: RS256 algorithm + Audit log</div>
          <div className="text-emerald-400 text-[10px]">Status: Manager Approved</div>
        </div>
      )
    },
    {
      id: 'session-management',
      icon: Layers,
      iconColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20',
      title: 'Worker Session Management',
      subtitle: 'Quản lý phiên hội thoại độc lập',
      description: 'Mỗi AI worker hoạt động trong một session riêng biệt. Không còn hiện tượng ngữ cảnh bị loãng, không bị trôi bộ nhớ đệm và không bao giờ vô tình gửi nhầm prompt giữa các tác vụ.',
      bullets: [
        'Cô lập môi trường thực thi của từng worker',
        'Duy trì context sạch, giảm thiểu hallucination',
        'Dễ dàng tạo mới hoặc reset session cho task mới'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="text-slate-300 font-semibold">Session #sess_98b</div>
            <div className="text-slate-500 text-[10px]">Codex Worker Context Isolated</div>
          </div>
          <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px]">
            Cách ly 100%
          </span>
        </div>
      )
    },
    {
      id: 'conversation-monitor',
      icon: Eye,
      iconColor: 'text-cyan-400',
      bgColor: 'bg-cyan-500/10 border-cyan-500/20',
      title: 'AI Conversation Monitor',
      subtitle: 'Minh bạch từng bước trao đổi',
      description: 'Không phải chiếc "hộp đen". AI Desk ghi nhận toàn bộ payload, prompt trung gian, phản hồi thô và code diff mà GPT Manager cùng các AI worker trao đổi với nhau.',
      bullets: [
        'Xem trực tiếp log hội thoại giữa các mô hình AI',
        'Xem trước code diff và payload JSON trước khi áp dụng',
        'Lưu vết audit phục vụ việc debug khi kết quả không như ý'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span>Inspector: Event Stream</span>
            <span className="text-cyan-400">Captured</span>
          </div>
          <div className="text-slate-300 text-[10px] truncate">
            &gt; [Codex -&gt; AI Desk]: Diff (+32 lines) verified
          </div>
        </div>
      )
    },
    {
      id: 'quota-monitor',
      icon: Gauge,
      iconColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10 border-amber-500/20',
      title: 'Quota & Status Monitoring',
      subtitle: 'Giám sát hạn mức & nhịp kết nối',
      description: 'Chủ động nắm bắt giới hạn tin nhắn của ChatGPT Plus, hạn mức Claude hay tần suất gọi Codex. Không còn cảnh flow bị dừng đột ngột giữa chừng vì chạm rate limit.',
      bullets: [
        'Theo dõi số lượt yêu cầu còn lại trong khung giờ',
        'Cảnh báo sớm khi quota sắp cạn để kịp thời điều phối',
        'Hiển thị độ trễ kết nối (latency) của từng công cụ'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono space-y-1">
          <div className="flex justify-between text-slate-300">
            <span>ChatGPT Plus Quota:</span>
            <span className="text-amber-400 font-semibold">32/40 msgs</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full" style={{ width: '80%' }}></div>
          </div>
        </div>
      )
    },
    {
      id: 'flow-recovery',
      icon: ShieldAlert,
      iconColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10 border-rose-500/20',
      title: 'Safe Flow Recovery',
      subtitle: 'Cơ chế phục hồi & bảo vệ an toàn',
      description: 'Khi một worker gặp sự cố (timeout, rate-limit hoặc code lỗi), AI Desk cung cấp các thao tác recovery tức thời: thử lại bước nghẽn, chuyển giao sang worker dự phòng hoặc rollback phiên an toàn.',
      bullets: [
        'Ngăn chặn gửi nhầm conversation hoặc context sai lệch',
        'Chuyển giao tác vụ sang worker dự phòng (fallback diversion)',
        'Rollback trạng thái về điểm kiểm tra an toàn gần nhất'
      ],
      microUI: (
        <div className="p-2.5 rounded-xl bg-[#090D17] border border-[#192236] text-[11px] font-mono flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            <span>Timeout Worker 01</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
            Auto-divert OK
          </span>
        </div>
      )
    }
  ];

  return (
    <section id="features" className="py-24 relative overflow-hidden bg-[#080B12]">
      {/* Background subtleties */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Title */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-indigo/10 border border-brand-indigo/20 text-xs font-semibold text-brand-indigo mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>KHẢ NĂNG KỸ THUẬT CỐT LÕI</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Được thiết kế cho kỹ sư phần mềm thực chiến
          </h2>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Mỗi tính năng của AI Desk đều tập trung giải quyết bài toán nhức nhối khi làm việc cùng lúc với nhiều mô hình AI: bảo vệ ngữ cảnh, điều phối tự động và minh bạch dữ liệu.
          </p>
        </div>

        {/* 6 Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuresList.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                className="group relative rounded-2xl bg-[#0B0F19] border border-[#1A2338] hover:border-brand-blue/40 p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-brand-blue/5 hover:-translate-y-1"
              >
                <div>
                  {/* Icon & Title */}
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${feature.bgColor} transition-transform group-hover:scale-105`}>
                      <Icon className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
                      Module
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1 group-hover:text-brand-blue transition-colors">
                    {feature.title}
                  </h3>

                  <div className="text-xs font-medium text-slate-400 mb-3">
                    {feature.subtitle}
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Bullet points */}
                  <ul className="space-y-2 mb-6">
                    {feature.bullets.map((b, i) => (
                      <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-brand-blue flex-shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Micro visual representation */}
                <div className="pt-2">
                  {feature.microUI}
                </div>
              </div>
            );
          })}
        </div>

        {/* Realistic disclaimer reminder */}
        <div className="mt-12 p-4 rounded-2xl bg-[#0E1424] border border-[#1C263D] max-w-3xl mx-auto text-center text-xs text-slate-400">
          <p>
            <strong className="text-slate-300">Ghi chú kỹ thuật:</strong> AI Desk hoạt động độc lập trên máy tính Windows của bạn. Các tính năng điều phối được kiểm thử liên tục để thích ứng với giao diện và API của các mô hình AI phổ biến.
          </p>
        </div>

      </div>
    </section>
  );
};
