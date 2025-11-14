'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RotateCw, RotateCcw, Crop, Check, X } from 'lucide-react';

interface ImageEditorProps {
  imageSrc: string;
  onConfirm: (editedImage: File) => void;
  onCancel: () => void;
}

export function ImageEditor({ imageSrc, onConfirm, onCancel }: ImageEditorProps) {
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const rotateLeft = () => {
    setRotation((prev) => (prev - 90) % 360);
  };

  const rotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleConfirm = async () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const img = imageRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size based on rotation
    if (rotation === 90 || rotation === 270 || rotation === -90 || rotation === -270) {
      canvas.width = img.naturalHeight;
      canvas.height = img.naturalWidth;
    } else {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }

    // Apply rotation
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Convert canvas to blob then to file
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
        onConfirm(file);
      }
    }, 'image/jpeg', 0.95);
  };

  return (
    <Card className="glass-card border-0 w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crop className="w-5 h-5" />
          Edit Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image Preview */}
        <div className="relative w-full aspect-video bg-muted/30 rounded-lg overflow-hidden flex items-center justify-center">
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.3s ease',
            }}
            className="max-w-full max-h-full"
          >
            <Image
              ref={imageRef}
              src={imageSrc}
              alt="Image to edit"
              width={800}
              height={600}
              style={{ objectFit: 'contain' }}
              className="max-h-[60vh]"
            />
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <div className="flex gap-2">
            <Button variant="outline" size="lg" onClick={rotateLeft} className="glass-card">
              <RotateCcw className="w-5 h-5 mr-2" />
              Rotate Left
            </Button>
            <Button variant="outline" size="lg" onClick={rotateRight} className="glass-card">
              <RotateCw className="w-5 h-5 mr-2" />
              Rotate Right
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" size="lg" onClick={onCancel} className="flex-1 sm:flex-none">
              <X className="w-5 h-5 mr-2" />
              Cancel
            </Button>
            <Button size="lg" onClick={handleConfirm} className="btn-premium flex-1 sm:flex-none">
              <Check className="w-5 h-5 mr-2" />
              Confirm
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Rotation: {rotation}° | Adjust your image before scanning
        </p>
      </CardContent>
    </Card>
  );
}
