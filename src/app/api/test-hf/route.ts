import { NextResponse } from 'next/server';
import { callHuggingFace } from '@/lib/huggingface-client';

export const runtime = 'nodejs';

export async function GET() {
    try {
        // Check API key
        const apiKey = process.env.HUGGINGFACE_API_KEY;
        if (!apiKey || apiKey === 'hf_YOUR_TOKEN_HERE') {
            return NextResponse.json({
                success: false,
                error: 'HUGGINGFACE_API_KEY not configured',
                help: 'Get your token from https://huggingface.co/settings/tokens'
            }, { status: 400 });
        }

        console.log('🧪 Testing Hugging Face Inference Providers API...');
        console.log('🔑 API key found:', apiKey.slice(0, 8) + '...');

        // Test with a widely available chat model from the documentation
        console.log('💬 Testing with chat model...');
        const result = await callHuggingFace('What is 2+2? Answer in one word.', { 
            model: 'Qwen/Qwen2.5-72B-Instruct',
            max_new_tokens: 50
        });
        
        console.log('✅ Hugging Face API test successful!');
        console.log('📝 Result:', result);

        return NextResponse.json({
            success: true,
            message: 'Hugging Face Inference Providers API is working!',
            result: result,
            model: 'Qwen/Qwen2.5-72B-Instruct',
            endpoint: 'https://router.huggingface.co/v1/chat/completions',
            note: 'Using new Hugging Face Inference Providers API (OpenAI-compatible)',
            apiKey: apiKey.slice(0, 8) + '...' + apiKey.slice(-4)
        });

    } catch (error) {
        console.error('❌ Hugging Face test failed:', error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        let help = '';
        
        if (errorMessage.includes('503')) {
            help = 'Model is loading (first request). This is normal! Wait 20-30 seconds and try again.';
        } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
            help = 'Invalid API key. Get a new one from https://huggingface.co/settings/tokens';
        } else if (errorMessage.includes('429')) {
            help = 'Rate limited. Wait a few seconds and try again.';
        } else if (errorMessage.includes('404') || errorMessage.includes('model_not_available')) {
            help = 'Model not available on free tier. Try a different model or upgrade to HF Pro.';
        }

        return NextResponse.json({
            success: false,
            error: errorMessage,
            help: help
        }, { status: 500 });
    }
}
