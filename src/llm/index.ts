import Groq from 'groq-sdk';
import { config } from '../config/env.js';
import fs from 'fs';

const groq = new Groq({ apiKey: config.groqApiKey });

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string | null;
    name?: string;
    tool_call_id?: string;
    tool_calls?: any[];
}

export interface ChatOptions {
    model?: string;
    temperature?: number;
    tools?: any[];
}

export async function chatCompletion(messages: ChatMessage[], options: ChatOptions = {}) {
    const defaultModel = 'llama-3.3-70b-versatile';
    const groqModel = options.model || defaultModel;

    try {
        const response = await groq.chat.completions.create({
            model: groqModel,
            messages: messages as any[],
            temperature: options.temperature ?? 0.7,
            tools: options.tools as any,
            tool_choice: options.tools && options.tools.length > 0 ? 'auto' : 'none'
        });

        return response.choices[0].message;
    } catch (error: any) {
        console.error('Groq API Error:', error.message);
        
        // Fallback to OpenRouter if configured
        if (config.openrouterApiKey) {
            console.log('Falling back to OpenRouter...');
            return fetchOpenRouter(messages, options);
        }
        throw error;
    }
}

async function fetchOpenRouter(messages: ChatMessage[], options: ChatOptions) {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.openrouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/betty-agent',
            'X-Title': 'Betty'
        },
        body: JSON.stringify({
            model: config.openrouterModel,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            tools: options.tools
        })
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    return data.choices[0].message;
}

export async function transcribeAudio(filePath: string) {
    try {
        const transcription = await groq.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-large-v3",
            response_format: "json",
            language: "es", // Opcional: el modelo suele detectarlo solo, pero podemos forzarlo o dejarlo auto
        });
        return transcription.text;
    } catch (error: any) {
        console.error('Error transcribiendo audio con Groq:', error.message);
        throw new Error(`Fallo en la transcripción: ${error.message}`);
    }
}

