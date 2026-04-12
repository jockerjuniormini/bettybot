import { config } from '../config/env.js';
import fs from 'fs';
import path from 'path';

export async function generateSpeech(text: string, outputFilePath: string): Promise<string> {
    if (!config.elevenLabsApiKey) {
        throw new Error('ELEVENLABS_API_KEY no configurada');
    }

    const voiceId = config.elevenLabsVoiceId;
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'xi-api-key': config.elevenLabsApiKey,
            'Content-Type': 'application/json',
            'accept': 'audio/mpeg'
        },
        body: JSON.stringify({
            text: text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 1.15
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error de ElevenLabs: ${response.status} - ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(outputFilePath, buffer);
    
    return outputFilePath;
}
