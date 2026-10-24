import React from 'react';
import { Shield, Mic } from 'lucide-react';

export default function ShieldMicLogo({
  size = 24,
  className = '',
  shieldClassName = '',
  micClassName = '',
  strokeWidth = 2,
  micColor = 'text-white'
}) {
  const micSize = Math.max(8, Math.round(size * 0.44));
  const micStroke = Math.max(1.8, Number((strokeWidth * 1.15).toFixed(1)));

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Shield */}
      <Shield
        size={size}
        strokeWidth={strokeWidth}
        className={`w-full h-full text-current ${shieldClassName}`}
      />

      {/* Centered Microphone inside Shield */}
      <div className="absolute inset-0 flex items-center justify-center pt-[6%] pointer-events-none">
        <Mic
          size={micSize}
          strokeWidth={micStroke}
          className={`${micColor} ${micClassName}`}
        />
      </div>
    </div>
  );
}
