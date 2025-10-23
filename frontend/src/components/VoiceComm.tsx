import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import { Socket } from 'socket.io-client';

interface VoiceCommProps {
  socket: Socket | null;
}

export const VoiceComm: React.FC<VoiceCommProps> = ({ socket }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [synthesis, setSynthesis] = useState<SpeechSynthesis | null>(null);
  const [lastCommand, setLastCommand] = useState<string>('');

  useEffect(() => {
    // Initialize speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

        if (transcript.toLowerCase().includes('box box')) {
          handleVoiceCommand('pit_stop', 'Box box! Coming in for pit stop.');
        } else if (transcript.toLowerCase().includes('push')) {
          handleVoiceCommand('push', 'Push mode activated. Push hard!');
        } else if (transcript.toLowerCase().includes('fuel')) {
          handleVoiceCommand('fuel_save', 'Fuel saving mode activated.');
        }
      };

      setRecognition(recognition);
    }

    // Initialize speech synthesis
    if ('speechSynthesis' in window) {
      setSynthesis(window.speechSynthesis);
    }
  }, []);

  const handleVoiceCommand = (type: string, message: string) => {
    setLastCommand(message);
    
    // Send command to backend
    if (socket) {
      socket.emit('voice_command', { type, message, timestamp: Date.now() });
    }

    // Speak the response
    if (synthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      synthesis.speak(utterance);
      setIsSpeaking(true);
      
      utterance.onend = () => setIsSpeaking(false);
    }
  };

  const startListening = () => {
    if (recognition) {
      recognition.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (message: string) => {
    if (synthesis) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.rate = 1.2;
      utterance.pitch = 1.1;
      synthesis.speak(utterance);
      setIsSpeaking(true);
      
      utterance.onend = () => setIsSpeaking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Voice Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-2xl font-bold mb-6">Voice Communication</h2>
        
        <div className="flex items-center justify-center space-x-8">
          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex flex-col items-center space-y-2 p-6 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isListening ? (
              <MicOff className="w-8 h-8" />
            ) : (
              <Mic className="w-8 h-8" />
            )}
            <span className="font-medium">
              {isListening ? 'Stop Listening' : 'Start Listening'}
            </span>
          </button>

          <button
            onClick={() => speakMessage('Box box! Coming in for pit stop.')}
            className={`flex flex-col items-center space-y-2 p-6 rounded-lg transition-colors ${
              isSpeaking 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            {isSpeaking ? (
              <VolumeX className="w-8 h-8" />
            ) : (
              <Volume2 className="w-8 h-8" />
            )}
            <span className="font-medium">
              {isSpeaking ? 'Speaking...' : 'Test Voice'}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Commands */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Commands</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleVoiceCommand('pit_stop', 'Box box! Coming in for pit stop.')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Box Box
          </button>
          <button
            onClick={() => handleVoiceCommand('push', 'Push mode activated. Push hard!')}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Push Mode
          </button>
          <button
            onClick={() => handleVoiceCommand('fuel_save', 'Fuel saving mode activated.')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Save Fuel
          </button>
          <button
            onClick={() => handleVoiceCommand('tire_info', 'Tire wear is good. Continue current strategy.')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            Tire Check
          </button>
        </div>
      </div>

      {/* Last Command */}
      {lastCommand && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Last Command</h3>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-300">{lastCommand}</p>
            <p className="text-sm text-gray-500 mt-2">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      )}

      {/* Voice Commands Help */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Voice Commands</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-gray-300 mb-2">Pit Stop Commands</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• "Box box" - Request pit stop</li>
              <li>• "Stay out" - Continue current strategy</li>
              <li>• "Tire change" - Request tire change</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-300 mb-2">Race Commands</h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• "Push" - Push hard mode</li>
              <li>• "Save fuel" - Fuel saving mode</li>
              <li>• "Tire check" - Check tire status</li>
              <li>• "Weather" - Weather update</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
