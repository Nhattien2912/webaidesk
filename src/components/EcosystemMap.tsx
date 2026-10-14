import React from 'react';
import { Workflow } from 'lucide-react';

export const EcosystemMap: React.FC = () => {
  const tools = [
    {
      name: 'ChatGPT / GPT Web',
      role: 'Quản lý & Điều phối (Manager)',
      desc: 'Tiếp nhận bài toán, phân tích kiến trúc hệ thống và lập đặc tả nhiệm vụ chi tiết.',
      badge: 'Manager Node',
      color: 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
    },
    {
      name: 'OpenAI Codex',
      role: 'Viết code & Refactor (Worker)',
      desc: 'Chuyên trách sinh mã nhanh chóng, xử lý các hàm phức tạp và xuất code diff chuẩn.',
      badge: 'Code Worker',
      color: 'border-brand-blue/40 text-brand-blue bg-brand-blue/10'
    },
    {
      name: 'Claude Desktop',
      role: 'Review & Kiểm thử (Reviewer)',
      desc: 'Đọc kỹ code diff, kiểm tra lỗ hổng bảo mật, đánh giá corner cases và viết test suite.',
      badge: 'Review Worker',
      color: 'border-purple-500/40 text-purple-400 bg-purple-500/10'
    },
    {
      name: 'Google Antigravity',
      role: 'AI IDE Workspace',
      desc: 'Môi trường phát triển thông minh, cung cấp kiến trúc và ngữ cảnh repo theo thời gian thực.',
      badge: 'IDE Node',
      color: 'border-amber-500/40 text-amber-400 bg-amber-500/10'
    },
    {
      name: 'OpenCode / Local AI',
      role: 'Worker Tùy chọn',
      desc: 'Khả năng mở rộng cho các mô hình mã nguồn mở cục bộ hoặc các CLI coding agent khác.',
      badge: 'Custom Worker',
      color: 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10'
    }
  ];

  return (
    <section className="py-20 relative overflow-hidden bg-[#070A11] border-y border-[#182136]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111726] border border-[#1E283F] text-xs font-semibold text-slate-300 mb-4">
            <Workflow className="w-3.5 h-3.5 text-brand-blue" />
            <span>HỆ SINH THÁI CÔNG CỤ TƯƠNG THÍCH</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Một trung tâm. Mọi công cụ AI bạn tin dùng.
          </h2>

          <p className="text-base text-slate-400 leading-relaxed">
            AI Desk đóng vai trò là nhạc trưởng trung tâm kết nối các thế mạnh riêng biệt của từng mô hình AI thành một quy trình làm việc trơn tru.
          </p>
        </div>

        {/* Central Hub and Spoke Architecture Visual */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {tools.map((tool, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-[#0B0F1B] border border-[#1A243A] hover:border-brand-blue/40 flex flex-col justify-between transition-all hover:-translate-y-1"
            >
              <div>
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-medium border mb-3 ${tool.color}`}>
                  {tool.badge}
                </span>

                <h3 className="text-base font-bold text-white mb-1">
                  {tool.name}
                </h3>

                <div className="text-xs font-semibold text-slate-400 mb-2">
                  {tool.role}
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {tool.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-[#161F33] flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>Trạng thái:</span>
                <span className="text-emerald-400">Hỗ trợ kết nối</span>
              </div>
            </div>
          ))}
        </div>

        {/* Independence Disclaimer */}
        <div className="mt-8 text-center text-xs text-slate-400 max-w-2xl mx-auto">
          <span>* AI Desk là phần mềm độc lập của bên thứ ba, không có quan hệ đối tác chính thức hay đại diện thương quyền với OpenAI, Anthropic hay Google.</span>
        </div>

      </div>
    </section>
  );
};
