import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, Send, ShieldCheck, AlertCircle } from 'lucide-react';

interface EarlyAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EarlyAccessModal: React.FC<EarlyAccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Fullstack Developer');
  const [tools, setTools] = useState<string[]>(['ChatGPT', 'Claude Desktop']);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const toggleTool = (toolName: string) => {
    if (tools.includes(toolName)) {
      setTools(tools.filter(t => t !== toolName));
    } else {
      setTools([...tools, toolName]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    setError('');
    // Client-side demo feedback - transparent that this is preview simulation
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-[#0E1320] border border-[#1E273D] rounded-2xl p-6 md:p-8 shadow-2xl shadow-brand-indigo/10 text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors"
          aria-label="Đóng modal"
        >
          <X className="w-5 h-5" />
        </button>

        {!submitted ? (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-brand-blue/10 text-brand-blue border border-brand-blue/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Early Access Preview
              </span>
              <span className="text-xs text-slate-400">Windows 10 / 11</span>
            </div>

            <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-2">
              Đăng ký nhận suất thử nghiệm AI Desk
            </h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              Nhận thông báo tải bộ cài đặt Windows ngay khi đợt Closed Beta đầu tiên được mở. Không spam, hủy nhận tin bất kỳ lúc nào.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Địa chỉ Email của bạn <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="dev@company.com"
                  className="w-full px-4 py-2.5 rounded-lg bg-[#151C2C] border border-[#24304D] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm text-white placeholder-slate-500 outline-none transition-all"
                  required
                />
                {error && (
                  <p className="text-xs text-rose-400 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Vai trò chính của bạn
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#151C2C] border border-[#24304D] focus:border-brand-blue focus:ring-1 focus:ring-brand-blue text-sm text-slate-200 outline-none"
                >
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="Fullstack Developer">Fullstack Developer</option>
                  <option value="AI / ML Engineer">AI / ML Engineer</option>
                  <option value="Software Architect">Software Architect / Tech Lead</option>
                  <option value="Khác">Lập trình viên tự do / Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2">
                  Công cụ AI bạn đang dùng hàng ngày
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {['ChatGPT / GPT-4', 'OpenAI Codex', 'Claude Desktop', 'Google Antigravity', 'OpenCode / Cursor'].map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => toggleTool(tool)}
                      className={`px-3 py-2 rounded-lg border text-left flex items-center justify-between transition-all ${
                        tools.includes(tool)
                          ? 'bg-brand-blue/15 border-brand-blue/40 text-brand-blue'
                          : 'bg-[#151C2C] border-[#24304D] text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <span>{tool}</span>
                      {tools.includes(tool) && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-blue to-brand-indigo hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Send className="w-4 h-4" /> Đăng ký giữ chỗ Early Access
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Minh bạch: Chưa có backend thực tế. Dữ liệu demo mô phỏng trên giao diện.</span>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2">
              Đã ghi nhận đăng ký của bạn!
            </h4>
            <p className="text-sm text-slate-300 mb-4 max-w-sm mx-auto">
              Cảm ơn bạn đã quan tâm. Chúng tôi đã lưu mô phỏng thông tin với email: <span className="text-brand-blue font-mono font-medium">{email}</span>.
            </p>
            <div className="p-3 bg-[#151C2C] border border-[#24304D] rounded-xl text-xs text-slate-400 mb-6 text-left space-y-1">
              <p>• Vai trò: <span className="text-slate-200">{role}</span></p>
              <p>• Công cụ quan tâm: <span className="text-slate-200">{tools.join(', ') || 'Chưa chọn'}</span></p>
              <p>• Trạng thái: <span className="text-emerald-400">Đã xếp hàng trong danh sách Early Access</span></p>
            </div>
            <button
              onClick={handleReset}
              className="px-6 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-colors"
            >
              Hoàn tất & Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
