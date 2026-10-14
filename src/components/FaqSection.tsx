import React, { useState } from 'react';
import { 
  ChevronDown, 
  HelpCircle, 
  Search
} from 'lucide-react';
import type { FaqItem } from '../types';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const faqs: FaqItem[] = [
    {
      question: "AI Desk là gì?",
      category: "Tổng quan",
      answer: "AI Desk là phần mềm Windows Desktop độc lập giúp các kỹ sư phần mềm quản lý và điều phối nhiều công cụ AI lập trình trong cùng một quy trình làm việc khép kín theo mô hình: GPT Manager (chỉ huy & phân rã bài toán) → AI Desk (cầu nối & bảo vệ phiên) → AI Workers (Codex, Claude, Antigravity thực thi) → AI Desk → GPT Manager (nghiệm thu)."
    },
    {
      question: "AI Desk khác gì với việc mở nhiều cửa sổ AI riêng lẻ trên trình duyệt?",
      category: "Tổng quan",
      answer: "Khi mở nhiều cửa sổ, bạn phải tự tay copy prompt, chuyển đổi định dạng, dán code diff và tự ghi nhớ tiến trình; đồng thời các hội thoại dễ bị loãng ngữ cảnh và nhanh chóng cạn quota. AI Desk tự động hóa khâu chuyển giao đặc tả kỹ thuật, cách ly phiên độc lập cho từng worker bằng Session Guard, giám sát hạn mức tập trung và cung cấp cơ chế cứu hộ dòng việc (Safe Flow Recovery)."
    },
    {
      question: "Có cần tài khoản riêng cho ChatGPT, Codex và Claude không?",
      category: "Bản quyền & Chi phí",
      answer: "Có. AI Desk là phần mềm trung gian điều phối trên máy bạn. Bạn cần có tài khoản sử dụng hợp lệ tương ứng với các dịch vụ mà bạn muốn kết nối (ví dụ: tài khoản ChatGPT Plus/Team, API key OpenAI Codex hoặc tài khoản Claude Pro/Desktop). AI Desk không bán lại tài khoản hay gói token của bên thứ ba."
    },
    {
      question: "AI Desk có tự động sinh mã hoặc thay thế lập trình viên không?",
      category: "Kỹ thuật",
      answer: "Không. AI Desk không thay thế tư duy kỹ thuật của bạn và bản thân phần mềm không tự ý chèn mã vào dự án mà không có sự kiểm duyệt. Trí tuệ sinh mã thuộc về các mô hình AI bạn tích hợp. AI Desk đóng vai trò là 'nhạc trưởng' và hạ tầng desktop giúp các AI phối hợp với nhau hiệu quả và an toàn hơn dưới sự kiểm soát của bạn."
    },
    {
      question: "AI Desk có hỗ trợ Windows không? Khi nào có macOS hoặc Linux?",
      category: "Kỹ thuật",
      answer: "AI Desk được ưu tiên tối ưu hóa kiến trúc gốc (native) cho nền tảng Windows 10 và Windows 11 (64-bit). Phiên bản dành cho macOS và Linux nằm trong lộ trình nghiên cứu tiếp theo sau khi bản Windows đạt độ ổn định và hoàn thiện đợt Closed Beta."
    },
    {
      question: "AI Desk đã được phát hành thương mại chính thức chưa?",
      category: "Tổng quan",
      answer: "Chưa. AI Desk hiện đang trong giai đoạn phát triển và kiểm thử nội bộ (Early Access Preview v0.8). Chúng tôi đang tiếp nhận đăng ký từ cộng đồng để mời những người dùng đầu tiên trải nghiệm bản thử nghiệm kín (Closed Beta) trước khi thương mại hóa chính thức."
    },
    {
      question: "Dữ liệu mã nguồn và quyền riêng tư được xử lý như thế nào?",
      category: "Bảo mật",
      answer: "AI Desk hoạt động theo cơ chế Client-Side First trên máy trạm của bạn. Toàn bộ mã nguồn, dữ liệu phiên và file trong workspace được lưu trữ cục bộ. Khi điều phối tác vụ, Session Guard bóc tách các token bí mật trong file .env và chỉ chuyển giao các đoạn context cần thiết đến mô hình AI bạn chỉ định qua kết nối được mã hóa."
    },
    {
      question: "AI Desk có phải là đối tác chính thức của OpenAI, Anthropic hay Google không?",
      category: "Bản quyền & Chi phí",
      answer: "Không. AI Desk là một công cụ độc lập phát triển bởi cộng đồng kỹ sư phần mềm. Chúng tôi không tuyên bố bất kỳ mối quan hệ đối tác chính thức, ủy quyền hay bảo trợ nào từ OpenAI, Anthropic hay Google. Tất cả tên sản phẩm và thương hiệu thuộc quyền sở hữu của các tổ chức tương ứng."
    }
  ];

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 relative overflow-hidden bg-[#080B12]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300 mb-4">
            <HelpCircle className="w-3.5 h-3.5 text-brand-blue" />
            <span>MINH BẠCH & TRUNG THỰC</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-4">
            Câu hỏi thường gặp (FAQ)
          </h2>

          <p className="text-base text-slate-400 leading-relaxed">
            Mọi thông tin về khả năng kỹ thuật, bảo mật và tình trạng phát triển của AI Desk đều được giải đáp rõ ràng, không mập mờ hay phóng đại.
          </p>

          {/* Search box for FAQ */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm câu hỏi (ví dụ: Windows, Quota, Bảo mật...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0E1424] border border-[#1E283F] focus:border-brand-blue text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Accordion List */}
        <div className="space-y-3">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={index}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isOpen
                      ? 'bg-[#0E1528] border-brand-blue/40 shadow-lg shadow-brand-blue/5'
                      : 'bg-[#0B0F1A] border-[#1A243A] hover:border-slate-700'
                  }`}
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                    aria-expanded={isOpen}
                  >
                    <span className="text-sm sm:text-base font-semibold text-white">
                      {faq.question}
                    </span>
                    <span className={`p-1.5 rounded-lg bg-slate-800 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180 text-brand-blue bg-brand-blue/15' : ''
                    }`}>
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-xs sm:text-sm text-slate-300 leading-relaxed border-t border-[#18233C]/80 pt-4">
                      <p>{faq.answer}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          Chuyên mục: {faq.category}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-sm text-slate-500">
              Không tìm thấy câu hỏi phù hợp với từ khóa của bạn.
            </div>
          )}
        </div>

        {/* Still have questions note */}
        <div className="mt-10 p-5 rounded-2xl bg-[#0D1220] border border-[#1A2438] text-center text-xs text-slate-400">
          <span>Còn thắc mắc chưa được giải đáp? Hãy liên hệ trực tiếp với nhóm phát triển qua kênh hỗ trợ hoặc để lại câu hỏi trong form đăng ký Early Access.</span>
        </div>

      </div>
    </section>
  );
};
