/**
 * Conversational workflow types for step-by-step estimate creation
 */

export type ConversationStep = 
  | 'welcome'
  | 'project_name'
  | 'room_measurements'
  | 'tasks'
  | 'confirmation'
  | 'complete';

export interface ConversationState {
  step: ConversationStep;
  projectName?: string;
  roomName?: string;
  measurements?: {
    width?: number;
    length?: number;
    height?: number;
    doors?: number;
    windows?: number;
  };
  tasks: Array<{
    phrase: string;
    transcription: string;
  }>;
}

export interface ConversationPrompt {
  question: string;
  expectedInput: string;
  validation?: (input: string) => { valid: boolean; error?: string };
}

export const CONVERSATION_PROMPTS: Record<ConversationStep, ConversationPrompt> = {
  welcome: {
    question: 'Välkommen till EP-Whisper! Låt oss skapa din målningsoffert. Vad heter projektet?',
    expectedInput: 'project name',
  },
  project_name: {
    question: 'Tack! Vad heter rummet som ska målas?',
    expectedInput: 'room name',
  },
  room_measurements: {
    question: 'Bra! Nu behöver jag rummets mått. Säg bredd, längd och höjd i meter. Till exempel: fyra gånger fem gånger två och en halv meter.',
    expectedInput: 'width length height in meters',
    validation: (input: string) => {
      const numbers = input.match(/\d+([.,]\d+)?/g);
      if (!numbers || numbers.length < 3) {
        return { 
          valid: false, 
          error: 'Jag behöver tre mått: bredd, längd och höjd. Försök igen.' 
        };
      }
      return { valid: true };
    },
  },
  tasks: {
    question: 'Perfekt! Nu kan du berätta vilka målningsarbeten som ska göras. Säg en uppgift i taget, till exempel "måla väggar två lager" eller "grundmåla tak". Säg "klar" när du är färdig.',
    expectedInput: 'painting tasks one at a time',
  },
  confirmation: {
    question: 'Vill du granska offerten? Säg "ja" för att se resultatet, eller "lägg till" för fler uppgifter.',
    expectedInput: 'confirmation',
  },
  complete: {
    question: 'Din offert är klar! Du kan nu exportera den som PDF.',
    expectedInput: 'complete',
  },
};

