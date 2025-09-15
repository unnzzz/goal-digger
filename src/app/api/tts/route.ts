import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const text = searchParams.get('text');
    const voice = searchParams.get('voice') || 'en-US-Standard-A';

    if (!text) {
      return NextResponse.json({ error: 'Text parameter is required' }, { status: 400 });
    }

    console.log(`Generating TTS for text: ${text.substring(0, 100)}...`);

    // Use the Web Speech API on the client side instead of server-side TTS
    // This avoids the need for external TTS services and API keys
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Text-to-Speech Audio</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f9fafb;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            max-width: 600px;
            text-align: center;
        }
        .audio-player {
            margin: 20px 0;
        }
        .controls {
            margin: 20px 0;
        }
        button {
            background: #3b82f6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            margin: 0 10px;
        }
        button:hover {
            background: #2563eb;
        }
        button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .text-content {
            background: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            white-space: pre-wrap;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎧 Podcast Audio</h1>
        <p>Click the play button to hear the podcast read aloud</p>
        
        <div class="controls">
            <button id="playBtn" onclick="playAudio()">▶️ Play</button>
            <button id="pauseBtn" onclick="pauseAudio()" disabled>⏸️ Pause</button>
            <button id="stopBtn" onclick="stopAudio()" disabled>⏹️ Stop</button>
        </div>
        
        <div class="text-content" id="textContent">${text}</div>
        
        <p><a href="javascript:history.back()" style="color: #3b82f6; text-decoration: none;">← Back to Roadmap</a></p>
    </div>

    <script>
        let speech = null;
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        const textContent = document.getElementById('textContent');
        
        function playAudio() {
            if (speech) {
                speechSynthesis.resume();
            } else {
                speech = new SpeechSynthesisUtterance(textContent.textContent);
                speech.rate = 0.9;
                speech.pitch = 1;
                speech.volume = 1;
                
                // Try to use a specific voice if available
                const voices = speechSynthesis.getVoices();
                const selectedVoice = voices.find(voice => voice.name.includes('${voice}')) || voices[0];
                if (selectedVoice) {
                    speech.voice = selectedVoice;
                }
                
                speech.onstart = () => {
                    playBtn.disabled = true;
                    pauseBtn.disabled = false;
                    stopBtn.disabled = false;
                };
                
                speech.onend = () => {
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                    stopBtn.disabled = true;
                    speech = null;
                };
                
                speech.onerror = () => {
                    playBtn.disabled = false;
                    pauseBtn.disabled = true;
                    stopBtn.disabled = true;
                    speech = null;
                    alert('Text-to-speech failed. Please try again.');
                };
                
                speechSynthesis.speak(speech);
            }
        }
        
        function pauseAudio() {
            if (speech) {
                speechSynthesis.pause();
                playBtn.disabled = false;
                pauseBtn.disabled = true;
            }
        }
        
        function stopAudio() {
            if (speech) {
                speechSynthesis.cancel();
                playBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = true;
                speech = null;
            }
        }
        
        // Load voices when page loads
        window.onload = () => {
            if (speechSynthesis.getVoices().length === 0) {
                speechSynthesis.addEventListener('voiceschanged', () => {
                    // Voices loaded
                });
            }
        };
    </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('TTS generation failed:', error);
    return NextResponse.json({ error: 'Failed to generate audio' }, { status: 500 });
  }
}
