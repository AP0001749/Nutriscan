'use client';

import { Wifi, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function OfflinePage() {
  const router = useRouter();

  const handleRetry = () => {
    if (navigator.onLine) {
      router.push('/');
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="max-w-md w-full text-center space-y-6 md:space-y-8">
        {/* Offline Icon */}
        <div className="relative mx-auto w-20 h-20 md:w-24 md:h-24">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-2xl opacity-30"></div>
          <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-full w-20 h-20 md:w-24 md:h-24 flex items-center justify-center">
            <Wifi className="w-10 h-10 md:w-12 md:h-12 text-red-400" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-3 md:space-y-4">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">
            You&apos;re Offline
          </h1>
          <p className="text-slate-400 text-base md:text-lg">
            No internet connection detected. Please check your network and try again.
          </p>
        </div>

        {/* Retry Button */}
        <Button
          onClick={handleRetry}
          size="lg"
          className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-semibold py-6 rounded-xl shadow-lg shadow-red-500/25 transition-all duration-300 hover:shadow-red-500/40 hover:scale-105"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Retry Connection
        </Button>

        {/* Cached Features */}
        <div className="mt-8 p-6 bg-slate-800/30 backdrop-blur-sm border border-slate-700 rounded-xl">
          <p className="text-sm text-slate-400 mb-3">
            <span className="text-emerald-400 font-semibold">✓ Available Offline:</span>
          </p>
          <ul className="text-sm text-slate-500 space-y-2 text-left">
            <li>• Previously viewed pages</li>
            <li>• Cached meal history</li>
            <li>• App navigation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
