'use client';

import { useEffect, useRef } from 'react';

interface MacroChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

export function MacroChart({ protein, carbs, fat }: MacroChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size for high DPI
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const radius = Math.min(centerX, centerY) - 10;

    // Calculate totals and percentages
    const total = protein + carbs + fat;
    if (total === 0) return;

    // Colors
    const colors = {
      protein: '#3b82f6', // blue
      carbs: '#10b981', // emerald
      fat: '#f59e0b', // amber
    };

    // Draw pie chart
    let currentAngle = -Math.PI / 2; // Start at top

    // Protein slice
    const proteinAngle = (protein / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + proteinAngle);
    ctx.closePath();
    ctx.fillStyle = colors.protein;
    ctx.fill();
    currentAngle += proteinAngle;

    // Carbs slice
    const carbsAngle = (carbs / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + carbsAngle);
    ctx.closePath();
    ctx.fillStyle = colors.carbs;
    ctx.fill();
    currentAngle += carbsAngle;

    // Fat slice
    const fatAngle = (fat / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + fatAngle);
    ctx.closePath();
    ctx.fillStyle = colors.fat;
    ctx.fill();

    // Draw center circle (donut effect)
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, 2 * Math.PI);
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fill();

    // Draw center text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Macros', centerX, centerY);

  }, [protein, carbs, fat]);

  const total = protein + carbs + fat;
  const proteinPercent = total > 0 ? ((protein / total) * 100).toFixed(0) : 0;
  const carbsPercent = total > 0 ? ((carbs / total) * 100).toFixed(0) : 0;
  const fatPercent = total > 0 ? ((fat / total) * 100).toFixed(0) : 0;

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        className="w-full h-48"
        style={{ width: '100%', height: '192px' }}
      />
      
      {/* Legend */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium text-blue-300">Protein</span>
          </div>
          <div className="text-2xl font-bold text-white">{proteinPercent}%</div>
          <div className="text-xs text-slate-400">{protein.toFixed(0)}g</div>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm font-medium text-emerald-300">Carbs</span>
          </div>
          <div className="text-2xl font-bold text-white">{carbsPercent}%</div>
          <div className="text-xs text-slate-400">{carbs.toFixed(0)}g</div>
        </div>
        
        <div className="flex flex-col items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-sm font-medium text-amber-300">Fat</span>
          </div>
          <div className="text-2xl font-bold text-white">{fatPercent}%</div>
          <div className="text-xs text-slate-400">{fat.toFixed(0)}g</div>
        </div>
      </div>
    </div>
  );
}
