import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';

interface WaveformCanvasProps {
  deckId: 'A' | 'B';
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  cuePoint: number;
  isPlaying: boolean;
  accentColor: string; // hex color e.g. "#00f2fe" or "#ff007f"
  height?: number;
}

export const WaveformCanvas: React.FC<WaveformCanvasProps> = ({
  deckId,
  audioBuffer,
  currentTime,
  duration,
  cuePoint,
  isPlaying,
  accentColor,
  height = 80,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.clearRect(0, 0, width, h);
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, width, h);

    // Grid background lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(width, h / 2);
    ctx.stroke();

    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    if (!audioBuffer) {
      // Empty waveform placeholder
      ctx.fillStyle = '#334155';
      ctx.font = '12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`DECK ${deckId} - NO TRACK LOADED`, width / 2, h / 2 + 4);
      return;
    }

    // Draw Audio Waveform Peaks
    const channelData = audioBuffer.getChannelData(0);
    const step = Math.ceil(channelData.length / width);
    const amp = h / 2;

    ctx.fillStyle = accentColor;
    ctx.globalAlpha = 0.65;

    for (let x = 0; x < width; x++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j += 4) {
        const datum = channelData[x * step + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.fillRect(x, (1 + min) * amp, 1, Math.max(1, (max - min) * amp));
    }
    ctx.globalAlpha = 1.0;

    // Draw Cue Point Marker Flag
    if (cuePoint > 0 && duration > 0) {
      const cueX = (cuePoint / duration) * width;
      ctx.strokeStyle = '#eab308'; // yellow cue flag
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cueX, 0);
      ctx.lineTo(cueX, h);
      ctx.stroke();

      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.arc(cueX, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Current Playhead Line & Glow
    if (duration > 0) {
      const playX = (currentTime / duration) * width;

      // Played area overlay
      ctx.fillStyle = accentColor;
      ctx.globalAlpha = 0.15;
      ctx.fillRect(0, 0, playX, h);
      ctx.globalAlpha = 1.0;

      // Playhead line
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowColor = accentColor;
      ctx.shadowBlur = isPlaying ? 10 : 4;
      ctx.beginPath();
      ctx.moveTo(playX, 0);
      ctx.lineTo(playX, h);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }, [audioBuffer, currentTime, duration, cuePoint, isPlaying, accentColor, deckId]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    scrub(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      scrub(e);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const scrub = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const targetTime = pct * duration;
    audioEngine.scrubTime(deckId, targetTime);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-slate-800 bg-slate-950/80 shadow-inner">
      <canvas
        ref={canvasRef}
        width={600}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-auto cursor-pointer touch-none block"
      />
    </div>
  );
};
