/**
 * Types for PDF generation
 */

import { RoomCalculation, LineItem, EstimateSection } from '../types';

export interface PDFEstimateData {
  // Room information
  roomName: string;
  date: Date;
  geometry: RoomCalculation;
  
  // Estimate data
  lineItems: LineItem[];
  sections?: EstimateSection[];
  
  // Totals
  subtotal: number;
  markup: number;
  markupPercent: number;
  total: number;
  
  // Optional metadata
  customerName?: string;
  projectName?: string;
  notes?: string;
}

export interface PDFConfig {
  // Branding
  companyName: string;
  documentTitle: string;
  
  // Colors (SE branding)
  primaryColor: string;    // Black
  accentColor: string;     // Lime
  textColor: string;       // Dark gray
  
  // Layout
  pageWidth: number;
  pageHeight: number;
  margin: number;
  
  // Fonts
  headerFontSize: number;
  bodyFontSize: number;
  tableFontSize: number;
}

export const DEFAULT_PDF_CONFIG: PDFConfig = {
  companyName: 'EP-Whisper',
  documentTitle: 'Målningsoffert',
  primaryColor: '#000000',
  accentColor: '#BFFF00',
  textColor: '#333333',
  pageWidth: 210,      // A4 width in mm
  pageHeight: 297,     // A4 height in mm
  margin: 20,
  headerFontSize: 16,
  bodyFontSize: 10,
  tableFontSize: 9,
};

