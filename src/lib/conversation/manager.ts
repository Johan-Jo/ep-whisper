/**
 * Conversation manager for step-by-step estimate creation
 */

import { ConversationState, ConversationStep, CONVERSATION_PROMPTS } from './types';
import { 
  parseClientName,
  parseProjectName, 
  parseMeasurements, 
  isDone, 
  wantsToAddMore,
  isConfirmation,
  parsePaintingTasks 
} from './parser';

export class ConversationManager {
  private state: ConversationState;
  
  constructor() {
    this.state = {
      step: 'client_name',
      tasks: [],
    };
  }
  
  /**
   * Get current state
   */
  getState(): ConversationState {
    return { ...this.state };
  }
  
  /**
   * Get current prompt for the user
   */
  getCurrentPrompt(): string {
    return CONVERSATION_PROMPTS[this.state.step].question;
  }
  
  /**
   * Process user's voice input and advance conversation
   */
  processInput(transcription: string): {
    success: boolean;
    message: string;
    nextPrompt?: string;
    error?: string;
  } {
    const text = transcription.trim();
    
    if (!text) {
      return {
        success: false,
        message: 'Jag hörde inget. Försök igen.',
        error: 'Empty transcription',
      };
    }
    
    switch (this.state.step) {
      case 'client_name':
        return this.handleClientName(text);
      
      case 'project_name':
        return this.handleProjectName(text);
      
      case 'room_measurements':
        return this.handleMeasurements(text);
      
      case 'tasks':
        return this.handleTasks(text);
      
      case 'confirmation':
        return this.handleConfirmation(text);
      
      default:
        return {
          success: false,
          message: 'Något gick fel. Börja om.',
          error: 'Unknown step',
        };
    }
  }
  
  /**
   * Handle client name step
   */
  private handleClientName(text: string): any {
    const clientName = parseClientName(text);
    
    if (!clientName) {
      return {
        success: false,
        message: 'Kundens namn måste vara mellan 2 och 100 tecken. Försök igen.',
        nextPrompt: CONVERSATION_PROMPTS['client_name'].question,
        error: 'Invalid client name',
      };
    }
    
    this.state.clientName = clientName;
    this.state.step = 'project_name';
    
    return {
      success: true,
      message: `Kund: ${clientName}`,
      nextPrompt: CONVERSATION_PROMPTS['project_name'].question,
    };
  }
  
  /**
   * Handle project name step
   */
  private handleProjectName(text: string): any {
    // First parse as project name
    const projectName = parseProjectName(text);
    this.state.projectName = projectName;
    
    // Now we need room name, but we'll ask for measurements directly
    // Room name will be derived from project or asked separately if needed
    this.state.roomName = projectName; // Use project name as room name for now
    this.state.step = 'room_measurements';
    
    return {
      success: true,
      message: `Projekt: ${projectName}`,
      nextPrompt: CONVERSATION_PROMPTS['room_measurements'].question,
    };
  }
  
  /**
   * Handle measurements step
   */
  private handleMeasurements(text: string): any {
    const measurements = parseMeasurements(text);
    
    // Validation
    if (!measurements.width || !measurements.length || !measurements.height) {
      return {
        success: false,
        message: 'Jag behöver alla tre måtten: bredd, längd och höjd. Försök igen.',
        nextPrompt: CONVERSATION_PROMPTS['room_measurements'].question,
        error: 'Incomplete measurements',
      };
    }
    
    this.state.measurements = {
      width: measurements.width,
      length: measurements.length,
      height: measurements.height,
      doors: measurements.doors || 1,
      windows: measurements.windows || 1,
    };
    this.state.step = 'tasks';
    
    const summary = `${measurements.width} × ${measurements.length} × ${measurements.height} meter`;
    
    return {
      success: true,
      message: `Mått: ${summary}`,
      nextPrompt: CONVERSATION_PROMPTS['tasks'].question,
    };
  }
  
  /**
   * Handle tasks step
   */
  private handleTasks(text: string): any {
    // Check if user is done
    if (isDone(text)) {
      if (this.state.tasks.length === 0) {
        return {
          success: false,
          message: 'Du har inte lagt till några uppgifter än. Säg en målningsuppgift.',
          nextPrompt: CONVERSATION_PROMPTS['tasks'].question,
          error: 'No tasks added',
        };
      }
      
      this.state.step = 'confirmation';
      return {
        success: true,
        message: `${this.state.tasks.length} uppgifter tillagda.`,
        nextPrompt: CONVERSATION_PROMPTS['confirmation'].question,
      };
    }
    
    // Parse painting tasks from the input
    const parsedTasks = parsePaintingTasks(text);
    
    if (parsedTasks.length === 0) {
      // If no tasks were parsed, treat the whole input as a task
      this.state.tasks.push({
        phrase: text,
        transcription: text,
      });
      
      return {
        success: true,
        message: `Lade till: ${text}. Fortsätt eller säg "klar".`,
        nextPrompt: 'Nästa uppgift? Eller säg "klar" om du är färdig.',
      };
    }
    
    // Add all parsed tasks
    for (const task of parsedTasks) {
      this.state.tasks.push({
        phrase: task,
        transcription: text,
      });
    }
    
    const taskList = parsedTasks.join(', ');
    return {
      success: true,
      message: `Lade till: ${taskList}. Fortsätt eller säg "klar".`,
      nextPrompt: 'Nästa uppgift? Eller säg "klar" om du är färdig.',
    };
  }
  
  /**
   * Handle confirmation step
   */
  private handleConfirmation(text: string): any {
    if (wantsToAddMore(text)) {
      this.state.step = 'tasks';
      return {
        success: true,
        message: 'Ok, lägg till fler uppgifter.',
        nextPrompt: CONVERSATION_PROMPTS['tasks'].question,
      };
    }
    
    if (isConfirmation(text)) {
      this.state.step = 'complete';
      return {
        success: true,
        message: 'Genererar offert...',
        nextPrompt: CONVERSATION_PROMPTS['complete'].question,
      };
    }
    
    return {
      success: false,
      message: 'Säg "ja" för att fortsätta eller "lägg till" för fler uppgifter.',
      nextPrompt: CONVERSATION_PROMPTS['confirmation'].question,
      error: 'Unclear confirmation',
    };
  }
  
  /**
   * Check if conversation is complete
   */
  isComplete(): boolean {
    return this.state.step === 'complete' && !!this.state.clientName;
  }
  
  /**
   * Get summary for estimate generation
   */
  getSummary() {
    return {
      clientName: this.state.clientName || 'Kund',
      projectName: this.state.projectName || 'Projekt',
      roomName: this.state.roomName || 'Rum',
      measurements: this.state.measurements || { width: 4, length: 5, height: 2.5 },
      tasks: this.state.tasks.map(t => t.phrase),
    };
  }
  
  /**
   * Reset conversation
   */
  reset() {
    this.state = {
      step: 'client_name',
      tasks: [],
    };
  }
}

