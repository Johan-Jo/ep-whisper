import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/openai/whisper';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max

export async function POST(request: NextRequest) {
  console.log('🎤 [API] Transcribe endpoint called');
  
  try {
    // Get audio buffer from request
    console.log('📥 [API] Reading request body...');
    const arrayBuffer = await request.arrayBuffer();
    console.log(`📊 [API] Received ${arrayBuffer.byteLength} bytes`);
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      console.error('❌ [API] Empty audio buffer');
      return NextResponse.json(
        { error: 'No audio data received' },
        { status: 400 }
      );
    }

    // Convert to Buffer
    const buffer = Buffer.from(arrayBuffer);
    console.log(`✅ [API] Buffer created: ${buffer.length} bytes`);

    // Transcribe using Whisper
    console.log('🔄 [API] Calling Whisper transcription...');
    const result = await transcribeAudio(buffer, {
      enableVAD: true,
      confidenceThreshold: 0.6,
      includeSegments: false,
      maxRetries: 2,
    });

    console.log('✅ [API] Transcription successful:', result);

    return NextResponse.json({
      text: result.text,
      confidence: result.confidence,
      language: result.language,
      duration: result.duration,
    });

  } catch (error: any) {
    console.error('❌ [API] Transcription error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    
    // More detailed error message for client
    let errorMessage = 'Transkriptionsfel: ' + (error.message || 'Transcription failed');
    if (error.message && error.message.includes('Invalid file format')) {
      errorMessage = 'Transkriptionsfel: ' + error.message + ' Supported formats: [\'flac\', \'m4a\', \'mp3\', \'mp4\', \'mpeg\', \'mpga\', \'oga\', \'ogg\', \'wav\', \'webm\']';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: error.code || 'UNKNOWN_ERROR',
        details: error.message
      },
      { status: error.status || 500 }
    );
  }
}

