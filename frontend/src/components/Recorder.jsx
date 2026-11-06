import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../services/auth';
import { Mic, Square } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Recorder({ onResult }) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8000";
      socketRef.current = new WebSocket(`${wsUrl}/ws/analyze-audio?token=${token}`);
      
      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        onResult(data);
      };

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0 && socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.send(event.data);
        }
      };

      // Send chunk every 3 seconds
      mediaRecorderRef.current.start(3000);
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setIsRecording(false);
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-slate-800 rounded-xl border border-slate-700">
      {isRecording ? (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={stopRecording}
          className="flex items-center gap-2 bg-red-500/20 text-red-400 border border-red-500/50 px-6 py-3 rounded-full font-medium"
        >
          <Square size={20} />
          Stop Detection
        </motion.button>
      ) : (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={startRecording}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-3 rounded-full font-medium transition-colors"
        >
          <Mic size={20} />
          Start Real-Time Detection
        </motion.button>
      )}

      {isRecording && (
        <div className="mt-8 flex items-center gap-2 text-cyan-400">
          <motion.div 
            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }} 
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-3 h-3 bg-cyan-400 rounded-full"
          />
          <span className="text-sm font-medium">Listening & Analyzing...</span>
        </div>
      )}
    </div>
  );
}
