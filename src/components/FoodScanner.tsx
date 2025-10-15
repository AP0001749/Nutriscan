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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

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

    } catch (err) {
      console.error('Scanning error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during the scan.')
    } finally {
      setIsScanning(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handleActionClick = () => {
    fileInputRef.current?.click()
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {!results && (
        <Card>
          <CardHeader className="items-center text-center">
            <div className="p-3 rounded-full bg-primary/10 border border-primary/20 mb-2">
                <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">AI Vision Engine</CardTitle>
            <CardDescription>
              Take a photo or upload an image for a complete ingredient and nutritional breakdown.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                onClick={handleActionClick} 
                className="flex-1 shadow-lg shadow-primary/30"
                size="lg"
                disabled={isScanning}
              >
                <Camera className="mr-2 h-5 w-5" />
                Take Photo
              </Button>
              <div className="flex items-center gap-3">
                <Button 
                  onClick={handleActionClick} 
                  variant="secondary" 
                  size="lg"
                  className=""
                  disabled={isScanning}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  Upload Image
                </Button>
                <div
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`w-12 h-12 rounded-md flex items-center justify-center border-2 border-dashed transition-all duration-150 ${isDragging ? 'border-accent bg-accent/6 scale-105 shadow-md' : 'border-border bg-muted/5 hover:scale-102 hover:shadow-sm'}`}
                  title="Drop image here"
                >
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedImage && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-sm font-medium text-muted-foreground text-center mb-4">Image Preview:</p>
                <div className="relative w-full max-w-md mx-auto aspect-video rounded-xl overflow-hidden border-2 border-dashed border-border">
                  <Image 
                    src={selectedImage} 
                    alt="Selected food" 
                    fill
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {isScanning && <ResultsSkeleton />}

      {error && !isScanning && (
        <Card className="border-destructive bg-destructive/10 text-destructive-foreground">
          <CardContent className="p-6 flex items-center gap-4">
            <AlertCircle className="h-8 w-8" />
            <div>
              <p className="font-semibold text-lg">Scan Failed</p>
              <span className="text-sm">{error}</span>
            </div>
             <Button onClick={handleScanAnother} variant="destructive" size="sm" className="ml-auto">Try Again</Button>
          </CardContent>
        </Card>
      )}

      {results && !isScanning && (
        <NutritionResults results={results} onClear={handleScanAnother} />
      )}
    </div>
  )
}