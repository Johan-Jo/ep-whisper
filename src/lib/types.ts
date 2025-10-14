// EP-Whisper Types - Based on PRD §13

export type Unit = 'm2' | 'lpm' | 'st';

export interface MepsRow {
  meps_id: string;
  task_name_sv: string;
  task_name_en?: string;
  unit: Unit;
  labor_norm_per_unit: number; // h per unit
  material_factor_per_unit?: number;
  default_layers?: number;
  surface_type?: 'vägg' | 'tak' | 'dörr' | 'fönster' | 'list';
  prep_required?: boolean;
  synonyms?: string; // semicolon-separated
  price_material_per_unit?: number;
  price_labor_per_hour?: number;
  markup_pct?: number;
}

export interface RoomGeometry {
  W: number; // width in meters
  L: number; // length in meters
  H: number; // height in meters
  doors: { w?: number; h?: number; sides?: 1 | 2 }[];
  windows: { w: number; h: number }[];
  wardrobes: { length: number; coverage_pct?: number }[]; // along wall length
}

export interface LineItem {
  meps_id: string;
  name: string;
  unit: Unit;
  qty: number;
  unit_price: number;
  subtotal: number;
}

export interface RoomCalculation {
  walls_gross: number;
  walls_net: number;
  ceiling_gross: number;
  ceiling_net: number;
  openings_total: number;
  wardrobes_deduction: number;
}

export interface EstimateTotals {
  labor_total: number;
  material_total: number;
  markup_total: number;
  grand_total: number;
}

export interface Project {
  id: string;
  client_name: string;
  project_name: string;
  market: 'SE' | 'BR';
  rooms: Room[];
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  name: string;
  geometry: RoomGeometry;
  calculation: RoomCalculation;
  line_items: LineItem[];
  totals: EstimateTotals;
}

// Voice and NLP Types
export interface VoiceCommand {
  transcript: string;
  confidence: number;
  intent: string;
  entities: Record<string, any>;
}

export interface TemplateInstance {
  id: string;
  type: 'room' | 'door' | 'window' | 'trim';
  surface_type: string;
  meps_ids: string[];
  active: boolean;
}

// Audit and Telemetry Types
export interface AuditLog {
  id: string;
  timestamp: Date;
  transcript?: string;
  parsed_commands: any[];
  meps_ids: string[];
  geometry_input: RoomGeometry;
  calculation_snapshot: RoomCalculation;
  line_items: LineItem[];
  totals: EstimateTotals;
}

export interface Metrics {
  completion_rate: number;
  correction_rate: number;
  avg_latency_p95: number;
  unmatched_intent_percentage: number;
}
