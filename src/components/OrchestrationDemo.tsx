import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ArrowRight, 
  Bot, 
  Cpu, 
  Layers, 
  Code2, 
  Terminal,
  Activity,
  FileText
} from 'lucide-react';
import type { DemoStep } from '../types';

export const OrchestrationDemo: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const timerRef = useRef<any>(null);

  const stepsData: DemoStep[] = [
    {
      step: 1,
      title: "1. Người dùng gửi yêu cầu tới GPT Manager",
      description: "Bạn nhập yêu cầu kỹ thuật tổng thể: 'Xây dựng authentication middleware hỗ trợ JWT, kiểm tra quyền truy cập và tự động ghi audit log khi đăng nhập thất bại'.",
      fromNode: "Lập trình viên (User)",
      toNode: "ChatGPT Manager",
      status: "Completed",
      payloadSummary: "Prompt người dùng → GPT Manager tiếp nhận bài toán kiến trúc",
      codeSnippet: `Prompt: "Hãy tạo auth middleware cho Express.js với JWT verification, phân quyền role và audit log."`,
      log: "[10:14:02] USER_INPUT: Yêu cầu được gửi vào kênh điều phối ChatGPT Manager."
    },
    {
      step: 2,
      title: "2. GPT Manager phân rã & tạo đặc tả nhiệm vụ",
      description: "Thay vì tự viết mã dài dòng hoặc mất ngữ cảnh, GPT Manager giữ vai trò chỉ huy: phân tích kiến trúc, lập danh sách file cần sửa, và tạo Task #104 kèm ràng buộc cho worker.",
      fromNode: "ChatGPT Manager",
      toNode: "AI Desk Core",
      status: "Completed",
      payloadSummary: "Spec #104: Định nghĩa input, thuật toán RS256, format response JSON",
      codeSnippet: `TaskSpec: {
  id: "TASK-104",
  targetWorker: "OpenAI Codex CLI",
  action: "IMPLEMENT_MIDDLEWARE",
  files: ["src/middleware/auth.ts"],
  constraints: ["Use RS256", "Audit failed attempts"]
}`,
      log: "[10:14:05] MANAGER_DISPATCH: GPT Manager lập xong bản đặc tả nhiệm vụ TASK-104."
    },
    {
      step: 3,
      title: "3. AI Desk chuyển giao yêu cầu an toàn đến Codex",
      description: "AI Desk nhận task từ GPT, kích hoạt Session Guard để bảo vệ phiên: lọc bỏ token bí mật, gán session ID độc lập cho Codex, và chuyển lệnh qua socket nội bộ trên Windows.",
      fromNode: "AI Desk Core",
      toNode: "OpenAI Codex",
      status: "Safe Passed",
      payloadSummary: "Session Guard: Cách ly phiên hội thoại, chuẩn bị workspace context",
      codeSnippet: `BridgeEvent: {
  sessionId: "sess_codex_98b",
  workspace: "c:\\projects\\ecommerce",
  quotaStatus: "OK (142/500 req)",
  securityCheck: "PASSED"
}`,
      log: "[10:14:08] BRIDGE_TRANSFER: AI Desk kiểm tra quota, bọc cách ly phiên và dispatch tới Codex."
    },
    {
      step: 4,
      title: "4. Codex xử lý mã nguồn & phản hồi kết quả",
      description: "OpenAI Codex hoạt động như một AI worker chuyên trách: tập trung 100% tài nguyên để sinh mã, xuất diff chuẩn và tạo unit test tương ứng mà không làm loãng phiên GPT Manager.",
      fromNode: "OpenAI Codex",
      toNode: "AI Desk Core",
      status: "Processing",
      payloadSummary: "Codex phản hồi code diff + test suite hoàn chỉnh",
      codeSnippet: `+ export const verifyAuth = (req, res, next) => {
+   const token = req.headers.authorization?.split(' ')[1];
+   if (!token) return res.status(401).json({ error: 'Unauthorized' });
+   // RS256 verify & audit log
+ };`,
      log: "[10:14:14] WORKER_RESPONSE: OpenAI Codex hoàn tất sinh mã (42 dòng mã, 0 cảnh báo lint)."
    },
    {
      step: 5,
      title: "5. AI Desk nhận kết quả & chuyển ngược về GPT Manager",
      description: "AI Desk thu thập output từ Codex, kiểm tra tính toàn vẹn (sanity check), đối chiếu với yêu cầu ban đầu và đóng gói dữ liệu gửi ngược lại phòng điều phối của GPT Manager.",
      fromNode: "AI Desk Core",
      toNode: "ChatGPT Manager",
      status: "Completed",
      payloadSummary: "Đồng bộ hóa kết quả: Trả diff và trạng thái về màn hình quản lý",
      codeSnippet: `PayloadReturned: {
  taskId: "TASK-104",
  status: "SUCCESS",
  generatedDiff: "src/middleware/auth.ts (+42, -3)",
  readyForReview: true
}`,
      log: "[10:14:18] BRIDGE_RETURN: AI Desk cập nhật kết quả và chuyển dữ liệu sạch về GPT Manager."
    },
    {
      step: 6,
      title: "6. GPT Manager đánh giá kết quả & chỉ định bước tiếp",
      description: "GPT Manager đọc kết quả từ Codex, xác nhận mã đáp ứng tiêu chuẩn, sau đó tự động kích hoạt Claude Desktop để thực hiện bước Code Review hoặc báo cáo lại cho bạn.",
      fromNode: "ChatGPT Manager",
      toNode: "Claude Desktop / User",
      status: "Completed",
      payloadSummary: "Quy trình khép kín: GPT Manager duyệt thành công, chuyển reviewer",
      codeSnippet: `ManagerVerdict: {
  auditReview: "PASSED",
  nextAction: "DISPATCH_TO_CLAUDE_FOR_SECURITY_AUDIT",
  workflowState: "COMPLETED_PHASE_1"
}`,
      log: "[10:14:22] FLOW_COMPLETE: GPT Manager xác nhận Task 104 hoàn tất. Vòng điều phối thành công."
    }
  ];

  const activeData = stepsData[currentStep - 1];

  // Auto-advance loop when playing
  useEffect(() => {
    if (isPlaying) {
      const delay = (3800 / playbackSpeed);
      timerRef.current = setTimeout(() => {
        setCurrentStep((prev) => (prev < 6 ? prev + 1 : 1));
      }, delay);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, currentStep, playbackSpeed]);

  const handleNext = () => {
    setCurrentStep((prev) => (prev < 6 ? prev + 1 : 1));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 1 ? prev - 1 : 6));
  };

  const handleReset = () => {
    setCurrentStep(1);
    setIsPlaying(false);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <section id="orchestrator" className="py-24 relative overflow-hidden bg-[#080B12]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[400px] h-[400px] bg-brand-purple/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-xs font-semibold text-brand-blue mb-4">
            <Activity className="w-3.5 h-3.5" />
            <span>TÂM ĐIỂM TRẢI NGHIỆM TƯƠNG TÁC</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
            Mô phỏng quy trình điều phối đa AI
          </h2>

          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Quan sát cách <span className="text-white font-medium">GPT Manager</span> chỉ đạo,{' '}
            <span className="text-white font-medium">AI Desk</span> kết nối an toàn, và{' '}
            <span className="text-white font-medium">Codex</span> hoàn thành nhiệm vụ mà không cần bạn phải copy-paste thủ công.
          </p>
        </div>

        {/* The Orchestration Stage Container */}
        <div className="rounded-3xl border border-[#1E273D] bg-[#0B0F19]/90 backdrop-blur-xl p-5 sm:p-8 shadow-2xl shadow-black/80">
          
          {/* Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-[#1A2338]">
            {/* Timeline step indicators */}
            <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto py-1">
              {stepsData.map((s) => (
                <button
                  key={s.step}
                  onClick={() => {
                    setCurrentStep(s.step);
                    setIsPlaying(false);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    currentStep === s.step
                      ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25 scale-105'
                      : s.step < currentStep
                      ? 'bg-[#151D2F] text-slate-300 border border-[#24314E]'
                      : 'bg-[#0E1424] text-slate-500 border border-[#182136] hover:text-slate-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-black/30">
                    {s.step}
                  </span>
                  <span className="hidden md:inline">Bước {s.step}</span>
                </button>
              ))}
            </div>

            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="px-3.5 py-1.5 rounded-lg bg-brand-blue hover:bg-blue-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-md transition-all active:scale-95"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Tạm dừng' : 'Chạy demo'}</span>
              </button>

              <button
                onClick={handleReset}
                className="p-2 rounded-lg bg-[#141C2E] hover:bg-slate-800 text-slate-400 hover:text-white border border-[#222E4A] transition-colors"
                title="Chạy lại từ đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 1.5 : 1)}
                className="px-2.5 py-1.5 rounded-lg bg-[#141C2E] text-slate-400 hover:text-slate-200 border border-[#222E4A] text-xs font-mono transition-colors"
                title="Tốc độ phát"
              >
                {playbackSpeed}x
              </button>
            </div>
          </div>

          {/* Interactive Visual Orchestration Flow Graph */}
          <div className="py-8 my-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
              
              {/* Node 1: User Input */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                currentStep === 1 
                  ? 'bg-[#141F36] border-brand-blue shadow-lg shadow-brand-blue/20 ring-1 ring-brand-blue'
                  : 'bg-[#0E1424] border-[#1C263D] opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-200">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    currentStep === 1 ? 'bg-brand-blue/20 text-brand-blue' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {currentStep === 1 ? 'Phát lệnh' : 'Sẵn sàng'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">1. Lập trình viên</h4>
                <p className="text-xs text-slate-400">Đưa ra yêu cầu tổng thể, không cần viết chi tiết từng hàm.</p>
              </div>

              {/* Node 2: GPT Manager */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                currentStep === 2 || currentStep === 6
                  ? 'bg-[#141F36] border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                  : 'bg-[#0E1424] border-[#1C263D] opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    currentStep === 2 ? 'bg-emerald-500/20 text-emerald-400 animate-pulse' :
                    currentStep === 6 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {currentStep === 2 ? 'Lập Spec' : currentStep === 6 ? 'Duyệt xong' : 'Chỉ huy'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">2. GPT Manager</h4>
                <p className="text-xs text-slate-400">Phân tách kiến trúc, lên kế hoạch task và đánh giá kết quả.</p>
              </div>

              {/* Node 3: AI Desk Central Engine (The Core) */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                currentStep === 3 || currentStep === 5
                  ? 'bg-[#1B223B] border-brand-indigo shadow-lg shadow-brand-indigo/30 ring-1 ring-brand-indigo'
                  : 'bg-[#0E1424] border-[#1C263D] opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-indigo/20 text-brand-indigo flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    currentStep === 3 ? 'bg-brand-indigo/20 text-brand-indigo animate-pulse' :
                    currentStep === 5 ? 'bg-brand-blue/20 text-brand-blue' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {currentStep === 3 ? 'Bridge Safe' : currentStep === 5 ? 'Thu thập diff' : 'Trung tâm'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">3. AI Desk Hub</h4>
                <p className="text-xs text-slate-400">Session Guard, cách ly phiên, kiểm tra quota và định tuyến an toàn.</p>
              </div>

              {/* Node 4: OpenAI Codex Worker */}
              <div className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                currentStep === 4 
                  ? 'bg-[#141F36] border-purple-500 shadow-lg shadow-purple-500/20 ring-1 ring-purple-500'
                  : 'bg-[#0E1424] border-[#1C263D] opacity-75'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                    currentStep === 4 ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-slate-800 text-slate-500'
                  }`}>
                    {currentStep === 4 ? 'Sinh mã diff' : 'Worker'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-white mb-1">4. OpenAI Codex</h4>
                <p className="text-xs text-slate-400">Chuyên trách viết code, refactor và tạo unit test trong session độc lập.</p>
              </div>
            </div>
          </div>

          {/* Active Step Deep-Dive Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-4 border-t border-[#1A2338]">
            
            {/* Left: Step Description & Rationale (6 cols) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-brand-blue px-2.5 py-0.5 rounded-full bg-brand-blue/10 border border-brand-blue/20">
                  TIẾN TRÌNH: BƯỚC {activeData.step}/6
                </span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                  activeData.status === 'Completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  activeData.status === 'Safe Passed' ? 'bg-brand-indigo/10 text-brand-indigo border border-brand-indigo/20' :
                  'bg-brand-blue/10 text-brand-blue border border-brand-blue/20 animate-pulse'
                }`}>
                  Trạng thái: {activeData.status}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white">
                {activeData.title}
              </h3>

              <p className="text-sm text-slate-300 leading-relaxed">
                {activeData.description}
              </p>

              <div className="p-3 rounded-xl bg-[#0E1526] border border-[#1D283E] space-y-1 text-xs">
                <div className="text-slate-400">Luồng giao tiếp dữ liệu:</div>
                <div className="flex items-center gap-2 font-mono text-slate-200">
                  <span className="text-brand-blue font-semibold">{activeData.fromNode}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-emerald-400 font-semibold">{activeData.toNode}</span>
                </div>
              </div>

              {/* Step manual navigation buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1A253E] border border-[#202B45] text-xs text-slate-300"
                >
                  ← Bước trước
                </button>
                <button
                  onClick={handleNext}
                  className="px-3 py-1.5 rounded-lg bg-[#141C2E] hover:bg-[#1A253E] border border-[#202B45] text-xs text-slate-300"
                >
                  Bước tiếp theo →
                </button>
              </div>
            </div>

            {/* Right: Code / JSON Payload Inspector (6 cols) */}
            <div className="lg:col-span-6 rounded-2xl bg-[#080C14] border border-[#1A2338] p-4 flex flex-col justify-between font-mono">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#161F33] text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-slate-300 font-sans font-medium">
                    <Code2 className="w-3.5 h-3.5 text-brand-blue" />
                    Dữ liệu trao đổi (Payload Inspector)
                  </span>
                  <span className="text-[10px] text-slate-500">Mô phỏng an toàn</span>
                </div>

                <pre className="text-xs text-slate-300 bg-[#06080F] p-3 rounded-xl border border-[#141C2E] overflow-x-auto leading-relaxed">
                  <code>{activeData.codeSnippet}</code>
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-[#141C2E] flex items-center justify-between text-[11px] text-slate-400 font-sans">
                <span>{activeData.payloadSummary}</span>
                <span className="text-emerald-400 font-mono">200 OK</span>
              </div>
            </div>
          </div>

          {/* Simulated Real-Time System Log Terminal */}
          <div className="mt-6 pt-4 border-t border-[#1A2338]">
            <div className="p-3 rounded-xl bg-[#070A11] border border-[#161F31] font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-400">
                <Terminal className="w-3.5 h-3.5 text-brand-blue" />
                <span className="text-slate-500">AI Desk Engine Log:</span>
                <span className="text-emerald-400">{activeData.log}</span>
              </div>
              <div className="text-[10px] text-slate-500">
                Mô phỏng frontend • Không gọi API thật
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
