'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ProgressHeader,
  ConversationArea,
  StatusArea,
  HoldToTalkButton,
  VoiceConfirmationModal,
  ConfirmationButtons,
  type Message
} from '@/components/figma';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { ConversationManager } from '@/lib/conversation/manager';
import { generateEstimateFromVoice } from '@/lib/nlp';
import { MepsCatalog } from '@/lib/excel/catalog';
import type { RoomCalculation, MepsRow } from '@/lib/types';
import type { PDFEstimateData } from '@/lib/pdf/types';
import { PDFExportButton } from '@/components/estimate/PDFExportButton';

type ButtonState = 'idle' | 'pressed' | 'recording' | 'processing' | 'disabled';
type StatusState = 'idle' | 'recording' | 'generating' | 'complete';

// Mock MEPS data for demo
const MOCK_MEPS: MepsRow[] = [
        {
          meps_id: 'GRUND-VÄGG-M2',
          task_name_sv: 'Grundmåla väggar',
          unit: 'm2' as const,
          labor_norm_per_unit: 0.4,
          surface_type: 'vägg' as const,
          default_layers: 1,
          material_factor_per_unit: 1.0,
          price_labor_per_hour: 450,
          price_material_per_unit: 35,
          synonyms: 'grundmåla väggar;grundmåla vägg;grundmålning väggar'
        },
        {
          meps_id: 'MÅL-VÄGG-M2',
          task_name_sv: 'Måla väggar',
          unit: 'm2' as const,
          labor_norm_per_unit: 0.5,
          surface_type: 'vägg' as const,
          default_layers: 2,
          material_factor_per_unit: 1.2,
          price_labor_per_hour: 450,
          price_material_per_unit: 45,
          synonyms: 'måla väggar;måla vägg;väggmålning;täckmåla väggar;täckmåla vägg'
        },
        {
          meps_id: 'MÅL-TAK-M2',
          task_name_sv: 'Måla tak',
          unit: 'm2' as const,
          labor_norm_per_unit: 0.45,
          surface_type: 'tak' as const,
          default_layers: 2,
          material_factor_per_unit: 1.2,
          price_labor_per_hour: 450,
          price_material_per_unit: 50,
          synonyms: 'måla tak;måla taket;takmålning;täckmåla tak'
        },
        {
          meps_id: 'GRUND-TAK-M2',
          task_name_sv: 'Grundmåla tak',
          unit: 'm2' as const,
          labor_norm_per_unit: 0.35,
          surface_type: 'tak' as const,
          default_layers: 1,
          material_factor_per_unit: 1.0,
          price_labor_per_hour: 450,
          price_material_per_unit: 40,
          synonyms: 'grundmåla tak;grundmåla taket;grundmålning tak'
        },
        {
    meps_id: 'SPACK-VÄGG-M2',
    task_name_sv: 'Spackla väggar',
    unit: 'm2' as const,
          labor_norm_per_unit: 0.3,
    surface_type: 'vägg' as const,
    default_layers: 1,
          material_factor_per_unit: 0.8,
          price_labor_per_hour: 450,
          price_material_per_unit: 25,
    synonyms: 'spackla väggar;spackla vägg;bredspackla väggar;bredspackla vägg'
  }
];

const STEP_NAMES = ['Kund', 'Projekt', 'Mått', 'Uppgifter', 'Klar'];

export default function Home() {
  const [buttonState, setButtonState] = useState<ButtonState>('idle');
  const [statusState, setStatusState] = useState<StatusState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [estimate, setEstimate] = useState('');
  const [pdfData, setPdfData] = useState<PDFEstimateData | null>(null);
  const [showConfirmationButtons, setShowConfirmationButtons] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(0);
  
  const pressStartTime = useRef<number>(0);
  const conversationManager = useRef<ConversationManager | null>(null);
  const mepsCatalog = useRef<MepsCatalog | null>(null);

  // Initialize
  useEffect(() => {
    conversationManager.current = new ConversationManager();
    const catalog = new MepsCatalog();
    catalog.loadFromRows(MOCK_MEPS);
    mepsCatalog.current = catalog;
    
    // Add welcome message in the center box
    addMessage('system', 'Välkommen till EP-Whisper – prata, så målar vi upp offerten.');
    
    // Add first question separately
    addMessage('assistant', conversationManager.current.getCurrentPrompt());
    
    // Prevent auto-scroll on mobile
    window.scrollTo(0, 0);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Audio recorder hook
  const {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder({
    onRecordingComplete: async (blob) => {
      console.log('✅ Recording complete!');
      console.log(`📊 Blob size: ${blob.size} bytes, type: ${blob.type}`);
      await transcribeAudio(blob);
    },
    onError: (error) => {
      console.error('❌ Recording error:', error);
      addMessage('system', `Fel: ${error}`);
      setButtonState('idle');
      setStatusState('idle');
    },
    onPermissionGranted: () => {
      console.log('✅ Microphone permission granted');
    },
    onPermissionDenied: () => {
      console.log('❌ Microphone permission denied');
      addMessage('system', 'Mikrofontillgång nekad. Kontrollera dina inställningar.');
    },
  });

  const addMessage = (type: Message['type'], text: string) => {
    const newMessage: Message = {
      id: Date.now().toString() + Math.random(),
      type,
      text,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  const getCurrentStep = (): number => {
    if (!conversationManager.current) return 1;
    const state = conversationManager.current.getState();
    const stepMap: Record<string, number> = {
      'client_name': 1,
      'project_name': 2,
      'room_measurements': 3,
      'tasks': 4,
      'complete': 5
    };
    // If status is complete, always return step 5
    if (statusState === 'complete') return 5;
    return stepMap[state.step] || 1;
  };

  const transcribeAudio = async (blob: Blob) => {
    console.log('🔄 Starting transcription...');
    setButtonState('processing');
    
    try {
      console.log(`📊 Converting blob to buffer (${blob.size} bytes)...`);
      // Convert blob to buffer
      const arrayBuffer = await blob.arrayBuffer();
      console.log(`✅ ArrayBuffer created: ${arrayBuffer.byteLength} bytes`);
      
      // Call transcription API
      console.log('📡 Calling /api/transcribe...');
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: arrayBuffer,
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Try to parse JSON first; if it fails, read raw text for better diagnostics
        let errorData: any = null;
        let rawText = '';
        try {
          errorData = await response.json();
        } catch (_) {
          try {
            rawText = await response.text();
          } catch (_) {
            // ignore
          }
        }

        console.error('❌ API error:', {
          status: response.status,
          statusText: response.statusText,
          json: errorData,
          raw: rawText?.slice(0, 500)
        });
        const message = (errorData && (errorData.error || errorData.message))
          || rawText
          || `Transcription failed: ${response.status} ${response.statusText}`;
        throw new Error(message);
      }

      const data = await response.json();
      console.log('📄 Response data:', data);
      const transcribedText = data.text || '';
      
      console.log('✅ Transcribed:', transcribedText);
      setTranscript(transcribedText);
      setButtonState('idle');
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('❌ Transcription error:', error);
      addMessage('system', `Transkriptionsfel: ${error instanceof Error ? error.message : 'Okänt fel'}`);
      setButtonState('idle');
      setStatusState('idle');
    }
  };

  const handlePress = async () => {
    console.log('🎤 Button pressed');
    if (buttonState !== 'idle') {
      console.log('⚠️ Button not idle, ignoring press');
      return;
    }
    if (!conversationManager.current) {
      console.log('⚠️ Conversation manager not initialized');
      return;
    }
    
    pressStartTime.current = Date.now();
    setButtonState('pressed');
    console.log('✅ Button state set to pressed');
    
    // Start recording after short press delay
    setTimeout(async () => {
      console.log('⏰ Timeout fired, starting recording...');
      setButtonState('recording');
      setStatusState('recording');
      setTranscript('Lyssnar...');
      clearRecording();
      
      try {
        console.log('📝 Calling startRecording()...');
        await startRecording();
        console.log('✅ Recording started successfully');
      } catch (error) {
        console.error('❌ Failed to start recording:', error);
        setButtonState('idle');
        setStatusState('idle');
      }
    }, 150);
  };

  const handleRelease = () => {
    console.log('🎤 Button released');
    const holdDuration = Date.now() - pressStartTime.current;
    console.log(`⏱️ Hold duration: ${holdDuration}ms`);
    
    if (holdDuration < 150) {
      console.log('⚠️ Too short, ignoring');
      setButtonState('idle');
      setStatusState('idle');
      return;
    }
    
    console.log(`📊 Button state: ${buttonState}, isRecording: ${isRecording}`);
    
    if (isRecording) {
      console.log('🛑 Stopping recording...');
      stopRecording();
      setStatusState('idle');
    } else {
      console.log('⚠️ Not recording, resetting state');
      setButtonState('idle');
      setStatusState('idle');
    }
  };

  const handleConfirm = async () => {
    setShowConfirmation(false);
    
    if (!conversationManager.current) return;
    
    // Add user message
    addMessage('user', transcript);
    
    // Process with conversation manager
    const result = conversationManager.current.processInput(transcript);
    
    // Add assistant response
    addMessage('assistant', result.message);
    
    // Show confirmation buttons if the message contains the question
    if (result.success && result.message && result.message.includes('Vill du granska offerten eller lägga till fler arbeten?')) {
      setTimeout(() => {
        setShowConfirmationButtons(true);
      }, 500);
    }
    
    // If we reached complete step, generate estimate automatically
    if (result.success && conversationManager.current && conversationManager.current.getState().step === 'complete') {
      setTimeout(async () => {
        await generateFinalEstimate();
      }, 1000);
    }
    
    if (result.success && result.nextPrompt) {
      setTimeout(() => {
        addMessage('assistant', result.nextPrompt!);
        
        // Show confirmation buttons when we reach confirmation step or task completion
        if (result.nextPrompt && (result.nextPrompt.includes('granska offerten') || 
            result.nextPrompt.includes('lägga till fler arbeten') ||
            result.nextPrompt.includes('Nästa uppgift') ||
            result.nextPrompt.includes('klar'))) {
          setShowConfirmationButtons(true);
        }
      }, 500);
    }
    
    // Check if conversation is complete
    if (conversationManager.current.isComplete()) {
      await generateFinalEstimate();
    }
    
    setTranscript('');
  };

  const handleRetry = () => {
    setShowConfirmation(false);
    setTranscript('');
  };

  const handleReviewEstimate = async () => {
    setShowConfirmationButtons(false);
    
    // Add user message to show the choice
    addMessage('user', 'Granska offerten');
    
    // Mark conversation as complete and generate estimate
    if (conversationManager.current) {
      conversationManager.current.getState().step = 'complete';
      await generateFinalEstimate();
      
      // If estimate generation failed (no line items), go back to tasks step
      if (conversationManager.current.getState().step === 'complete') {
        const currentStep = conversationManager.current.getState().step;
        console.log('Estimate generation completed, step:', currentStep);
      }
    }
  };

  const handleAddMoreTasks = () => {
    setShowConfirmationButtons(false);
    
    // Add user message to show the choice
    addMessage('user', 'Lägg till fler arbeten');
    
    if (conversationManager.current) {
      conversationManager.current.getState().step = 'tasks';
      addMessage('assistant', 'Okej, lägg till fler uppgifter. Säg en uppgift i taget.');
      
      // Don't show buttons again - user will add tasks via voice
    }
  };

  const handleCreateNewEstimate = () => {
    // Reset everything
    setMessages([]);
    setEstimate('');
    setPdfData(null);
    setShowConfirmationButtons(false);
    setButtonState('idle');
    setStatusState('idle');
    
    // Reinitialize conversation
    if (conversationManager.current) {
      conversationManager.current = new ConversationManager();
      const catalog = new MepsCatalog();
      catalog.loadFromRows(MOCK_MEPS);
      mepsCatalog.current = catalog;
      
      // Add welcome message in the center box
      addMessage('system', 'Välkommen till EP-Whisper – prata, så målar vi upp offerten.');
      
      // Add first question separately
      addMessage('assistant', conversationManager.current.getCurrentPrompt());
    }
  };

  const generateFinalEstimate = async () => {
    if (!conversationManager.current || !mepsCatalog.current) return;
    
    setStatusState('generating');
    setButtonState('disabled');
    
    try {
      const summary = conversationManager.current.getSummary();
      console.log('Generating estimate for:', summary);
      
      // Calculate room geometry
      const { width = 4, length = 5, height = 2.5, doors = 1, windows = 1 } = summary.measurements;
      const roomCalculation: RoomCalculation = {
        walls_gross: 2 * (width + length) * height,
        walls_net: 2 * (width + length) * height - ((doors || 1) * 1.89 + (windows || 1) * 1.44),
        ceiling_gross: width * length,
        ceiling_net: width * length,
        floor_gross: width * length,
        floor_net: width * length,
        openings_total: (doors || 1) * 1.89 + (windows || 1) * 1.44,
        wardrobes_deduction: 0,
      };
      
      // Process all tasks
      const allLineItems = [];
      for (const taskPhrase of summary.tasks) {
        const estimateResult = await generateEstimateFromVoice({
          transcription: taskPhrase,
          roomCalculation,
          mepsCatalog: mepsCatalog.current
        });
        
        console.log('Estimate result for task:', taskPhrase, estimateResult);
        
        if (estimateResult.success && estimateResult.mappedTasks) {
          allLineItems.push(...estimateResult.mappedTasks);
        } else {
          console.warn('Failed to process task:', taskPhrase, estimateResult.errors);
        }
      }

      console.log('All line items:', allLineItems);
      
      // Check if we have any line items
      if (allLineItems.length === 0) {
        // Instead of throwing an error, ask user what work they want
        addMessage('assistant', 'Jag kunde inte bearbeta de uppgifter du angav. Kan du berätta mer specifikt vilka målningsarbeten du vill ha gjorda? Till exempel "måla väggar", "grundmåla tak" eller "täckmåla dörrar".');
        setStatusState('idle');
        setButtonState('idle');
        
        // Go back to tasks step so user can add more specific tasks
        if (conversationManager.current) {
          conversationManager.current.getState().step = 'tasks';
        }
        return;
      }
      
      // Calculate totals with safety checks
      const subtotal = allLineItems.reduce((sum, item) => {
        const itemSubtotal = item.subtotal || 0;
        return sum + itemSubtotal;
      }, 0);
      const markup = subtotal * 0.15;
      const total = subtotal + markup;
      
      // Format estimate
      const formattedEstimate = `EP-WHISPER OFFERT
━━━━━━━━━━━━━━━━━━━━━━━

KUND: ${summary.clientName}
PROJEKT: ${summary.projectName}
RUM: ${summary.roomName}

MÅTT:
- Bredd: ${width}m
- Längd: ${length}m
- Höjd: ${height}m
- Area: ${(width * length).toFixed(1)}m²

ARBETSUPPGIFTER:
${allLineItems.map((item, i) => 
  `${i + 1}. ${item.name || 'Okänd uppgift'} (${(item.qty || 0).toFixed(1)} ${item.unit || 'st'})`
).join('\n')}

KOSTNADER:
${allLineItems.map(item => 
  `- ${item.name || 'Okänd uppgift'}: ${(item.subtotal || 0).toFixed(0)} kr`
).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━
DELSUMMA:        ${subtotal.toFixed(0)} kr
PÅLÄGG (15%):    ${markup.toFixed(0)} kr
━━━━━━━━━━━━━━━━━━━━━━━
TOTALT:          ${total.toFixed(0)} kr

Giltig i 30 dagar.`;
      
      setEstimate(formattedEstimate);
      setStatusState('complete');
      
      // Ensure step is set to complete
      if (conversationManager.current) {
        conversationManager.current.getState().step = 'complete';
        // Force re-render to update progress bar
        setForceUpdate(prev => prev + 1);
      }
      
      // Don't add estimate to conversation - it will be shown in StatusArea
      
      // Prepare PDF data
      const pdfEstimateData: PDFEstimateData = {
        roomName: summary.roomName,
        date: new Date(),
        geometry: roomCalculation,
        lineItems: allLineItems,
        subtotal,
        markup,
        markupPercent: 15,
        total,
      };
      setPdfData(pdfEstimateData);
      
    } catch (error) {
      console.error('Error generating estimate:', error);
      addMessage('system', `Fel vid generering: ${error instanceof Error ? error.message : 'Okänt fel'}`);
      setButtonState('idle');
      setStatusState('idle');
    }
  };

  return (
    <div className="dark app-container bg-gradient-to-br from-[rgba(10,10,10,1)] via-[rgba(10,10,10,1)] to-[rgba(38,38,38,0.2)] flex items-center justify-center">
      <div className="w-full max-w-[448px] h-[800px] mx-auto">
        <div 
          className="bg-[rgba(10,10,10,0.5)] border border-neutral-800 rounded-[24px] shadow-2xl overflow-hidden h-full flex flex-col"
          style={{ 
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)'
          }}
        >
          {/* Sticky Header */}
          <ProgressHeader currentStep={getCurrentStep()} totalSteps={5} />
          
          {/* Scrollable Conversation Area */}
          <ConversationArea 
            messages={messages}
            showConfirmationButtons={showConfirmationButtons}
            onReviewEstimate={handleReviewEstimate}
            onAddMoreTasks={handleAddMoreTasks}
          />
          
          {/* Status Area - if needed */}
          {estimate && statusState !== 'complete' && (
            <StatusArea 
              status={statusState}
              transcript={isRecording ? 'Spelar in...' : transcript}
              estimate={estimate}
            />
          )}
          
          {/* PDF Export Button */}
          {pdfData && statusState === 'complete' && (
            <div className="px-6 pb-4">
              <PDFExportButton 
                data={pdfData}
                filename={`offert-${pdfData.roomName.toLowerCase().replace(/\s+/g, '-')}.pdf`}
              />
            </div>
          )}
          
          {/* Bottom Button Area - Fixed */}
          {statusState === 'complete' ? (
            <div className="px-6 pb-6 pt-4 bg-[rgba(10,10,10,0.8)] backdrop-blur-xl border-t border-neutral-800">
              <button
                onClick={handleCreateNewEstimate}
                className="w-full bg-gradient-to-r from-chart-1 to-chart-2 text-neutral-900 rounded-2xl py-4 px-6 text-center font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 active:scale-95"
                style={{ fontFamily: 'Arimo, sans-serif' }}
              >
                Skapa ny offert
              </button>
            </div>
          ) : (
            <HoldToTalkButton
              state={buttonState}
              onPress={handlePress}
              onRelease={handleRelease}
            />
          )}
        </div>
      </div>
      
      <VoiceConfirmationModal
        isOpen={showConfirmation}
        transcript={transcript}
        onRetry={handleRetry}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
