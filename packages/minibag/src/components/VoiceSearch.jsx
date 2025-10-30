import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';

export default function VoiceSearch({ onSearch, userLanguage = 'english', ...props }) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState(null);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Voice search not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();

    // Language mapping based on user preference
    const languageMap = {
      'english': 'en-IN',
      'hindi': 'hi-IN',
      'gujarati': 'gu-IN'
    };

    recognition.lang = languageMap[userLanguage] || 'en-IN';
    recognition.continuous = false; // Single phrase
    recognition.interimResults = false; // Only final results
    recognition.maxAlternatives = 1;

    // Event: Recognition started
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    // Event: Recognition succeeded
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;

      console.log(`Voice: "${transcript}" (${Math.round(confidence * 100)}% confident)`);

      // Trigger search with transcript
      onSearch(transcript);
      setIsListening(false);
    };

    // Event: Recognition error
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      // User-friendly error messages
      const errorMessages = {
        'no-speech': "Couldn't hear anything. Try again?",
        'audio-capture': "Microphone not found",
        'not-allowed': "Microphone access denied",
        'network': "Network error"
      };

      setError(errorMessages[event.error] || "Voice search failed");

      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    };

    // Event: Recognition ended
    recognition.onend = () => {
      setIsListening(false);
    };

    // Start recognition
    recognition.start();
  };

  // Don't show button if not supported
  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={startListening}
        disabled={isListening}
        className={`p-2 rounded-full transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
        }`}
        title={isListening ? "Listening..." : "Voice search"}
        {...props}
      >
        {isListening ? (
          <MicOff size={20} strokeWidth={2} />
        ) : (
          <Mic size={20} strokeWidth={2} />
        )}
      </button>

      {/* Error tooltip */}
      {error && (
        <div className="absolute top-12 right-0 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded-lg shadow-lg whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
