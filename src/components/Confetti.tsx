'use client';

import { useEffect, useState } from 'react';

interface ConfettiProps {
  active: boolean;
  onComplete?: () => void;
}

export function Confetti({ active, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    if (active) {
      // Generate 50 confetti particles
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.3,
        duration: 1.5 + Math.random() * 1,
      }));
      setParticles(newParticles);

      // Clean up after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-full animate-confetti-fall"
          style={{
            left: `${particle.left}%`,
            top: '-10px',
            backgroundColor: ['#10b981', '#14b8a6', '#22d3ee', '#06b6d4', '#0ea5e9'][
              Math.floor(Math.random() * 5)
            ],
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
      
      {/* Add CSS animation inline */}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        
        .animate-confetti-fall {
          animation: confetti-fall 2s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
