import { NextRequest, NextResponse } from 'next/server';
import { vision } from '@/lib/vision-client';

export async function POST(request: NextRequest) {
  try {
    const { image } = await request.json();
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // If no Vision client is available, fail — no mock data allowed.
    if (!vision.client) {
      console.error('Vision client is not configured on the server.');
      return NextResponse.json({ error: 'Vision service unavailable' }, { status: 502 });
    }

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');
    const visionRequest = { image: { content: imageBuffer } };

    // Perform multiple types of analysis for better food recognition
    // Update Promise.all to include explicit types
    const [labelResult, textResult, objectResult] = await Promise.all([
      vision.labelDetection(visionRequest) as unknown as [{ labelAnnotations: Array<{ description: string; score: number }> }],
      vision.textDetection(visionRequest) as unknown as [{ textAnnotations: Array<{ description: string }> }],
      vision.objectLocalization(visionRequest) as unknown as [{ localizedObjectAnnotations: Array<{ name: string; score: number }> }]
    ]);

    const labels = labelResult[0].labelAnnotations || [];
    const textAnnotations = textResult[0].textAnnotations || [];
    const objects = objectResult[0].localizedObjectAnnotations || [];

    // Add type annotations for map and filter functions
    const detectedText = textAnnotations.map((annotation: { description: string }) => annotation.description || '').join(' ').toLowerCase();

    // Use filteredObjects in the response to avoid unused variable warning
    const filteredObjects = objects
      .filter((obj: { score: number }) => obj.score && obj.score > 0.4)
      .map((obj: { name: string }) => obj.name || '');

    return NextResponse.json({
      labels,
      detectedText,
      filteredObjects
    });
  } catch (error) {
    console.error('AI Vision Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze image' }, 
      { status: 500 }
    );
  }
}
