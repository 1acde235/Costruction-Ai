export interface TakeoffItem {
  id: string;
  description: string; // Combined Item name and detailed spec
  timesing: number; // Multiplier
  dimension: string; // e.g. "4.00 x 3.00"
  quantity: number; // Total result
  unit: string; // Metric units
  category: string; // 'Sub Structure' | 'Super Structure' | 'Finishing Works' | 'Openings' | 'Painting'
  confidence: string; // 'High' | 'Medium' | 'Low'
}

export interface RebarItem {
  id: string; // Bar Mark e.g., '01', '02'
  member: string; // e.g., 'Grade Beam (Grid A)', 'Column C1'
  barType: string; // e.g., 'Y12', 'Y16', 'R8'
  shapeCode: string; // e.g., '00', '21' (Standard shape codes)
  noOfMembers: number; 
  barsPerMember: number;
  totalBars: number; // noOfMembers * barsPerMember
  lengthPerBar: number; // meters
  totalLength: number; // meters
  totalWeight: number; // kg
}

export interface TakeoffResult {
  projectName: string;
  items: TakeoffItem[];
  rebarItems: RebarItem[];
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
  INSTRUCTIONS = 'INSTRUCTIONS',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}