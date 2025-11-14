'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression';
import { Camera, Upload, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import NutritionResults from '@/components/NutritionResults'
import ResultsSkeleton from '@/components/ResultsSkeleton';
import { NutritionInfo } from '@/lib/types';
import { showToast } from '@/components/Toast';
import { ImageEditor } from '@/components/ImageEditor';

// Define precise types for the component's state to eliminate 'any'
interface FoodRecognitionResult {
  name: string;
  confidence: number;
  source: string;
}

interface AiAnalysisResult {
  description: string;
  healthScore: number;
  suggestions: string[];
}

interface PriceData {
    name: string;
    price: number;
    url?: string;
}

interface ScanResults {
  foodItems: FoodRecognitionResult[];
  // aiAnalysis may be null when the AI provider fails; allow null at runtime.
  aiAnalysis: AiAnalysisResult | null;
  nutritionData: NutritionInfo[];
  priceData: PriceData[];
  warnings?: string[];
}

export default function FoodScanner() {
  const [isScanning, setIsScanning] = useState(false)
  const [results, setResults] = useState<ScanResults | null>(null)
  const [error, setError] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [showEditor, setShowEditor] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)

  const handleImageUpload = async (file: File) => {
    if (!file) return

    setIsScanning(true)
    setError(null)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (e) => setSelectedImage(e.target?.result as string)
    reader.readAsDataURL(file)

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      }
      
      const compressedFile = await imageCompression(file, options);
      
      const formData = new FormData();
      formData.append('image', compressedFile);

      // Single API call to the unified backend
      const response = await fetch('/api/scan-food', {
          method: 'POST',
          body: formData,
      });

      if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.details || 'Failed to analyze food.');
      }

  const scanResults = await response.json();
  // Ensure aiAnalysis is explicit null if missing
  if (!scanResults.aiAnalysis) scanResults.aiAnalysis = null;
  setResults(scanResults as ScanResults);
  showToast('success', '✨ Food scanned successfully!');

    } catch (err) {
      console.error('Scanning error:', err)
      const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred during the scan.';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsScanning(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Show editor first
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setPendingFile(file);
        setShowEditor(true);
      };
      reader.readAsDataURL(file);
    }
  }

  const handleEditorConfirm = (editedFile: File) => {
    setShowEditor(false);
    handleImageUpload(editedFile);
  };

  const handleEditorCancel = () => {
    setShowEditor(false);
    setSelectedImage(null);
    setPendingFile(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
    }
    if (uploadInputRef.current) {
      uploadInputRef.current.value = '';
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click()
  }

  const handleUploadClick = () => {
    uploadInputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // only reset when leaving the dropzone entirely
    if ((e.target as HTMLElement).contains(e.relatedTarget as Node) === false) {
      setIsDragging(false)
    }
    setIsDragging(false)
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer?.files?.[0]
    if (file) {
      await handleImageUpload(file)
    }
  }

  const handleScanAnother = () => {
    setResults(null)
    setError(null)
    setSelectedImage(null)
    if (cameraInputRef.current) {
      cameraInputRef.current.value = ''
    }
    if (uploadInputRef.current) {
      uploadInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {showEditor && selectedImage && (
        <ImageEditor
          imageSrc={selectedImage}
          onConfirm={handleEditorConfirm}
          onCancel={handleEditorCancel}
        />
      )}
      
      {!results && !showEditor && (
        <Card className="glass-card border-0 overflow-hidden">
          <CardHeader className="items-center text-center space-y-4 p-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/20 shimmer pulse-glow">
                <Sparkles className="h-10 w-10 text-emerald-400" />
            </div>
            <CardTitle className="text-3xl font-bold">
              <span className="text-gradient">AI Vision Engine</span>
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground max-w-lg">
              Capture or upload your meal for instant AI-powered nutritional analysis with complete ingredient breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-8">
            {/* Action Buttons - Premium Style */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleCameraClick} 
                className="w-full sm:flex-1 btn-premium text-base py-6"
                size="lg"
                disabled={isScanning}
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <Button 
                onClick={handleUploadClick} 
                variant="outline" 
                size="lg"
                className="w-full sm:flex-1 glass-card border-emerald-500/30 hover:border-emerald-500/50 text-base py-6"
                disabled={isScanning}
              >
                <Upload className="mr-2 h-5 w-5" />
                Upload Image
              </Button>
            </div>

            {/* Drag & Drop Zone - Premium Glassmorphism */}
            <div
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`w-full p-12 rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-4 cursor-pointer ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02] shadow-lg shadow-emerald-500/20' 
                  : 'glass-card border-emerald-500/20 hover:border-emerald-500/40 hover:bg-white/5'
              }`}
            >
              <div className={`p-4 rounded-full transition-colors ${
                isDragging ? 'bg-emerald-500/20' : 'bg-white/5'
              }`}>
                <Upload className={`h-10 w-10 ${isDragging ? 'text-emerald-400' : 'text-muted-foreground'}`} />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground mb-1">
                  {isDragging ? 'Drop your image here' : 'Drag & drop your meal photo'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG, WEBP up to 10MB
                </p>
              </div>
            </div>

            {/* Camera Input - Opens camera on mobile */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Capture photo with camera"
            />

            {/* Upload Input - Opens file picker */}
            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload image from device"
            />

            {/* Image Preview - Enhanced */}
            {selectedImage && (
              <div className="mt-8 pt-8 border-t border-emerald-500/20 space-y-4 animate-in fade-in duration-500">
                <p className="text-sm font-semibold text-emerald-400 text-center flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Image Preview
                </p>
                <div className="relative w-full max-w-2xl mx-auto aspect-video rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-lg shadow-emerald-500/10 glass-card">
                  <Image 
                    src={selectedImage} 
                    alt="Selected food" 
                    fill
                    style={{ objectFit: 'contain' }}
                    className="p-2"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isScanning && <ResultsSkeleton />}

      {error && !isScanning && (
        <Card className="glass-card border-red-500/30 bg-red-500/10 animate-in fade-in zoom-in-95 duration-300">
          <CardContent className="p-8 flex flex-col sm:flex-row items-center gap-6">
            <div className="p-4 rounded-full bg-red-500/20 border border-red-500/30">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-xl text-red-400 mb-2">Scan Failed</p>
              <span className="text-sm text-muted-foreground">{error}</span>
            </div>
            <Button onClick={handleScanAnother} variant="destructive" size="lg" className="btn-premium">
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {results && !isScanning && (
        <NutritionResults results={results} onClear={handleScanAnother} />
      )}
    </div>
  )
}