'use client';

export default function TestTTSPage() {
  const testText = "Hello, this is a test of the text-to-speech functionality. Can you hear me speaking?";

  const testQuickPlay = () => {
    console.log('Testing quick play...');
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(testText);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onstart = () => console.log('Test speech started');
      utterance.onend = () => console.log('Test speech ended');
      utterance.onerror = (e) => console.error('Test speech error:', e);
      
      speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis not supported');
    }
  };

  const testTTSAPI = () => {
    console.log('Testing TTS API...');
    const ttsUrl = `/api/tts?text=${encodeURIComponent(testText)}&voice=en-US-Standard-A`;
    console.log('Opening:', ttsUrl);
    window.open(ttsUrl, '_blank', 'width=800,height=600');
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Text-to-Speech Test Page</h1>
      <p>Test text: "{testText}"</p>
      
      <div style={{ margin: '20px 0' }}>
        <button
          onClick={testQuickPlay}
          style={{
            background: '#10B981',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            marginRight: '10px',
            cursor: 'pointer'
          }}
        >
          🔊 Test Quick Play
        </button>
        
        <button
          onClick={testTTSAPI}
          style={{
            background: '#3B82F6',
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '6px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🎧 Test TTS API
        </button>
      </div>
      
      <div style={{ marginTop: '40px', padding: '20px', background: '#f8f9fa', borderRadius: '8px' }}>
        <h3>Browser Support Check:</h3>
        <p>Speech Synthesis Available: {typeof window !== 'undefined' && 'speechSynthesis' in window ? '✅ Yes' : '❌ No'}</p>
        <p>Voices Available: {typeof window !== 'undefined' && 'speechSynthesis' in window ? speechSynthesis.getVoices().length : 'Unknown'}</p>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#3B82F6' }}>← Back to Home</a>
      </div>
    </div>
  );
}
