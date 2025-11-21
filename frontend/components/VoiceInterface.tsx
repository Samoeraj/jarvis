'use client';

import { useState, useRef, useEffect } from 'react';

export default function VoiceInterface() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [audioData, setAudioData] = useState<number[]>(new Array(50).fill(0));

    const recognitionRef = useRef<any>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number | null>(null);

    // Initialize Speech Recognition
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onresult = (event: any) => {
                    const text = event.results[0][0].transcript;
                    setTranscript(text);
                    handleVoiceCommand(text);
                };

                recognition.onerror = (event: any) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);
                    stopAudioVisualization();
                };

                recognition.onend = () => {
                    setIsListening(false);
                    stopAudioVisualization();
                };

                recognitionRef.current = recognition;
            } else {
                console.error('Speech recognition not supported');
            }
        }

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Handle voice commands
    const handleVoiceCommand = (text: string) => {
        console.log('Voice command:', text);

        // Simple response for now
        const lowerText = text.toLowerCase();
        let reply = '';

        if (lowerText.includes('hello') || lowerText.includes('hi')) {
            reply = 'Hello! I am JARVIS, your personal assistant. How can I help you?';
        } else if (lowerText.includes('cpu')) {
            reply = 'You can see your CPU usage in the dashboard above.';
        } else if (lowerText.includes('memory') || lowerText.includes('ram')) {
            reply = 'Your memory usage is displayed in the metrics section.';
        } else {
            reply = `You said: ${text}. I'm still learning how to respond!`;
        }

        setResponse(reply);
        speak(reply);
    };

    // Text-to-speech
    const speak = (text: string) => {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };

    // Start listening
    const startListening = async () => {
        if (!recognitionRef.current) {
            alert('Speech recognition not supported in your browser');
            return;
        }

        try {
            // Start audio visualization
            await startAudioVisualization();

            // Start speech recognition
            recognitionRef.current.start();
            setIsListening(true);
            setTranscript('');
            setResponse('');
        } catch (error) {
            console.error('Error starting recognition:', error);
        }
    };

    // Stop listening
    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
        stopAudioVisualization();
    };

    // Audio visualization
    const startAudioVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 128;

            source.connect(analyserRef.current);

            visualize();
        } catch (error) {
            console.error('Error accessing microphone:', error);
        }
    };

    const visualize = () => {
        if (!analyserRef.current) return;

        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationRef.current = requestAnimationFrame(draw);

            analyserRef.current!.getByteFrequencyData(dataArray);

            // Normalize and create array for visualization
            const normalized = Array.from(dataArray).map(value => value / 255);
            setAudioData(normalized);
        };

        draw();
    };

    const stopAudioVisualization = () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setAudioData(new Array(50).fill(0));
    };

    return (
        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
            <h2 className="text-2xl font-bold mb-6 text-center">Voice Interface</h2>

            {/* Audio Visualizer */}
            <div className="mb-8 h-32 flex items-end justify-center gap-1">
                {audioData.map((value, index) => (
                    <div
                        key={index}
                        className="bg-blue-500 w-2 rounded-t transition-all duration-75"
                        style={{
                            height: `${Math.max(value * 100, 2)}%`,
                            opacity: isListening ? 1 : 0.3,
                        }}
                    />
                ))}
            </div>

            {/* Microphone Button */}
            <div className="flex justify-center mb-6">
                <button
                    onClick={isListening ? stopListening : startListening}
                    className={`
            w-20 h-20 rounded-full flex items-center justify-center
            transition-all duration-300 transform hover:scale-110
            ${isListening
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }
          `}
                >
                    {isListening ? (
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <rect x="6" y="6" width="8" height="8" />
                        </svg>
                    ) : (
                        <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
                            <path d="M5.5 9.643a.75.75 0 00-1.5 0V10c0 3.06 2.29 5.585 5.25 5.954V17.5h-1.5a.75.75 0 000 1.5h4.5a.75.75 0 000-1.5h-1.5v-1.546A6.001 6.001 0 0016 10v-.357a.75.75 0 00-1.5 0V10a4.5 4.5 0 01-9 0v-.357z" />
                        </svg>
                    )}
                </button>
            </div>

            {/* Status */}
            <p className="text-center text-gray-400 mb-4">
                {isListening ? '🎤 Listening...' : '🎤 Click to speak'}
            </p>

            {/* Transcript */}
            {transcript && (
                <div className="mb-4 p-4 bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">You said:</p>
                    <p className="text-white">{transcript}</p>
                </div>
            )}

            {/* Response */}
            {response && (
                <div className="p-4 bg-blue-900/30 rounded-lg border border-blue-500/30">
                    <p className="text-sm text-blue-400 mb-1">JARVIS:</p>
                    <p className="text-white">{response}</p>
                </div>
            )}
        </div>
    );
}