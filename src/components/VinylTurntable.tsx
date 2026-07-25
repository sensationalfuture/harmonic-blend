import React, { useRef, useEffect, useState } from 'react';
import { audioEngine } from '../audio/AudioEngine';

interface VinylTurntableProps {
  deckId: 'A' | 'B';
  isPlaying: boolean;
  accentColor: string; // hex color e.g. "#00f2fe" or "#ff007f"
  title?: string;
  artist?: string;
}

export const VinylTurntable: React.FC<VinylTurntableProps> = ({
  deckId,
  isPlaying,
  accentColor,
  title = 'No Track Loaded',
  artist = 'Select Track',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const lastAngleRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Turntable Rotation Loop
  useEffect(() => {
    let currentRot = rotation;
    const animate = () => {
      if (isPlaying && !isScratching) {
        currentRot = (currentRot + 2.5) % 360;
        setRotation(currentRot);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, isScratching, rotation]);

  // Draw Turntable Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // Save context for rotation
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate((rotation * Math.PI) / 180);

    // Outer Vinyl Rim
    ctx.fillStyle = '#090a0f';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Vinyl Grooves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let r = radius - 12; r > 35; r -= 6) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Neon Accent Outer Ring
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = isPlaying ? 12 : 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center Record Label
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f1117';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // Center Spindle Hole
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Visual Scratch Position Line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -radius + 10);
    ctx.stroke();

    ctx.restore();
  }, [rotation, isPlaying, accentColor]);

  // Scratch Physics Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsScratching(true);
    const angle = getAngle(e);
    lastAngleRef.current = angle;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isScratching || lastAngleRef.current === null) return;
    const currentAngle = getAngle(e);
    let deltaAngle = currentAngle - lastAngleRef.current;

    // Normalize angle jump across 180 / -180 boundary
    if (deltaAngle > 180) deltaAngle -= 360;
    if (deltaAngle < -180) deltaAngle += 360;

    const newRot = rotation + deltaAngle;
    setRotation(newRot);

    // Convert rotation delta to audio buffer time scrub offset
    const deck = deckId === 'A' ? audioEngine.deckA : audioEngine.deckB;
    if (deck.duration > 0) {
      const timeDelta = (deltaAngle / 360) * 2.0; // 2 sec per full rotation
      const targetTime = deck.currentTime + timeDelta;
      audioEngine.scrubTime(deckId, targetTime);
    }

    lastAngleRef.current = currentAngle;
  };

  const handleMouseUp = () => {
    setIsScratching(false);
    lastAngleRef.current = null;
  };

  const getAngle = (e: React.MouseEvent<HTMLCanvasElement>): number => {
    const canvas = canvasRef.current;
    if (!canvas) return 0;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    return (Math.atan2(y, x) * 180) / Math.PI;
  };

  return (
    <div className="flex flex-col items-center gap-2 select-none">
      <div className="relative group cursor-grab active:cursor-grabbing">
        {/* Turntable Platter Base */}
        <div className="p-3 rounded-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800 shadow-2xl shadow-black">
          <canvas
            ref={canvasRef}
            width={180}
            height={180}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="rounded-full touch-none block"
          />
        </div>

        {/* Tonearm Arm Needle */}
        <div
          className={`absolute top-2 right-2 w-16 h-20 pointer-events-none transition-transform duration-500 origin-top-right ${
            isPlaying ? 'rotate-12' : 'rotate-0'
          }`}
        >
          <div className="w-1.5 h-16 bg-slate-400 rounded-full mx-auto shadow-md shadow-black" />
          <div className="w-3 h-3 bg-red-500 rounded-sm mx-auto -mt-1 shadow-sm" />
        </div>
      </div>

      {/* Track Label */}
      <div className="text-center max-w-[180px] overflow-hidden">
        <h4 className="text-xs font-bold text-slate-200 truncate m-0">{title}</h4>
        <p className="text-[10px] text-slate-400 font-medium truncate m-0">{artist}</p>
      </div>
    </div>
  );
};
