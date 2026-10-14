export interface WorkerNode {
  id: string;
  name: string;
  role: string;
  type: 'manager' | 'worker' | 'ide' | 'reviewer';
  status: 'active' | 'processing' | 'idle' | 'standby';
  avatar: string;
  color: string;
  quotaUsage?: string;
  currentTask?: string;
}

export interface DemoStep {
  step: number;
  title: string;
  description: string;
  fromNode: string;
  toNode: string;
  status: 'Waiting' | 'Processing' | 'Completed' | 'Safe Passed';
  payloadSummary: string;
  codeSnippet?: string;
  log: string;
}

export interface FeatureItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: string;
  icon: string;
  badge?: string;
  details: string[];
}

export interface FaqItem {
  question: string;
  answer: string;
  category: 'Tổng quan' | 'Kỹ thuật' | 'Bản quyền & Chi phí' | 'Bảo mật';
}
