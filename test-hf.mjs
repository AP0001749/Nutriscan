// Test script for Hugging Face vision API
import { callHuggingFaceVision } from './src/lib/huggingface-client';
import * as fs from 'fs';
import * as path from 'path';

async function testHuggingFace() {
    console.log('🧪 Testing Hugging Face Vision API...\n');
    
    // Check for API key
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey || apiKey === 'hf_YOUR_TOKEN_HERE') {
        console.error('❌ HUGGINGFACE_API_KEY not configured!');
        console.log('\n📝 To fix this:');
        console.log('1. Visit https://huggingface.co/settings/tokens');
        console.log('2. Create a new token (read access is enough)');
        console.log('3. Update .env.local with: HUGGINGFACE_API_KEY="hf_YOUR_TOKEN_HERE"');
        process.exit(1);
    }
    
    console.log('✅ API key found:', apiKey.slice(0, 8) + '...');
    
    // Test with a sample image (you can replace with your own)
    const testImagesDir = path.join(process.cwd(), 'test', 'accuracy-gauntlet', 'ground-truth-images');
    
    if (!fs.existsSync(testImagesDir)) {
        console.log('⚠️ No test images found. Using a simple test...');
        
        // Create a tiny 1x1 pixel JPEG as base64 for testing
        const tinyJpeg = '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlbaWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/aAAwDAQACEQMRAD8A0KKKKAAP/Z';
        
        try {
            console.log('\n🖼️ Testing with sample image...');
            const result = await callHuggingFaceVision(tinyJpeg);
            console.log('✅ Hugging Face API is working!');
            console.log('📝 Result:', result);
            console.log('\n✨ You can now use Hugging Face vision in NutriScan!');
        } catch (error) {
            console.error('❌ Hugging Face API test failed:', error);
            if (error instanceof Error && error.message.includes('503')) {
                console.log('\n⏳ Model is loading (first request). This is normal!');
                console.log('   Try again in 20-30 seconds...');
            }
        }
        
        process.exit(0);
    }
    
    // Test with actual images
    const images = fs.readdirSync(testImagesDir).filter(f => /\.(jpg|jpeg|png)$/i.test(f));
    
    if (images.length === 0) {
        console.log('⚠️ No images found in test directory');
        process.exit(1);
    }
    
    console.log(`\n📁 Found ${images.length} test images\n`);
    
    for (const img of images.slice(0, 3)) { // Test first 3 images
        const imagePath = path.join(testImagesDir, img);
        const imageBuffer = fs.readFileSync(imagePath);
        const base64 = imageBuffer.toString('base64');
        
        console.log(`\n🖼️ Testing: ${img}`);
        
        try {
            const result = await callHuggingFaceVision(base64);
            console.log('✅ Result:', result);
        } catch (error) {
            console.error('❌ Failed:', error);
            if (error instanceof Error && error.message.includes('503')) {
                console.log('⏳ Model loading, waiting 20 seconds...');
                await new Promise(r => setTimeout(r, 20000));
                
                try {
                    const retryResult = await callHuggingFaceVision(base64);
                    console.log('✅ Retry successful:', retryResult);
                } catch (retryErr) {
                    console.error('❌ Retry failed:', retryErr);
                }
            }
        }
        
        // Wait between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 1000));
    }
    
    console.log('\n✨ Hugging Face vision test complete!\n');
}

// Run the test
testHuggingFace().catch(console.error);
