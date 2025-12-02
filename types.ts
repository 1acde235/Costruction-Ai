export interface TakeoffItem {
  id: string;
  item: string;
  description: string;
  quantity: number;
  unit: string;
  category: string;
  confidence: string; // 'High' | 'Medium' | 'Low'
}

export interface TakeoffResult {
  projectName: string;
  items: TakeoffItem[];
  summary: string;
}

export interface UploadedFile {
  name: string;
  type: string;
  data: string; // Base64
  url: string; // Blob URL for preview
}

export enum AppState {
  UPLOAD = 'UPLOAD',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}
