import { Bot, InputFile } from 'grammy';
import axios from 'axios';
import { config } from './config/env.js';
import { chatCompletion } from './llm/provider.js';
import http from 'http';

const bot = new Bot(config.telegramBotToken);

// 0. Health Check Server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OpenGravity is alive on Mac Studio 🤖');
}).listen(config.port, '0.0.0.0', () => {
    console.log(`✅ Servidor de salud escuchando en el puerto ${config.port}`);
});

// Helper para descargar medios de forma robusta
async function downloadMedia(url: string): Promise<Buffer | null> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        return Buffer.from(response.data);
    } catch (err) {
        console.error(`Error downloading media: ${url}`, err);
        return null;
    }
}

// Helper para enviar medios (Imágenes/Vídeos) de forma definitiva
async function sendResponseWithMedia(ctx: any, response: string) {
    const imageRegex = /(?:IMAGEN_GENERADA:?\s*|https:\/\/pollinations\.ai\/p\/)(https?:\/\/[^\s|]+)/gi;
    const videoRegex = /(?:VIDEO_GENERADO:?\s*)(https?:\/\/[^\s|]+)/gi;

    const imageMatches = [...response.matchAll(imageRegex)];
    const videoMatches = [...response.matchAll(videoRegex)];

    let cleanText = response.replace(/IMAGEN_GENERADA:[^|\n]+(\|[^|\n]*)?/gi, '');
    cleanText = cleanText.replace(/VIDEO_GENERADO:[^|\n]+(\|[^|\n]*)?/gi, '');
    cleanText = cleanText.replace(/\[V\d+\][^\n]+/g, '');
    cleanText = cleanText.trim();

    if (cleanText) await ctx.reply(cleanText);

    if (imageMatches.length > 0) {
        await ctx.replyWithChatAction('upload_photo');
        try {
            const mediaGroup: any[] = [];
            for (const match of imageMatches) {
                const buffer = await downloadMedia(match[1]);
                if (buffer) {
                    mediaGroup.push({ type: 'photo' as const, media: new InputFile(buffer) });
                }
            }
            if (mediaGroup.length === 1) {
                await ctx.replyWithPhoto(mediaGroup[0].media);
            } else if (mediaGroup.length > 1) {
                await ctx.replyWithMediaGroup(mediaGroup);
            }
        } catch (err) {
            console.error('Error sending media group:', err);
            await ctx.reply('⚠️ Error al descargar las imágenes.');
        }
    }

    if (videoMatches.length > 0) {
        for (const match of videoMatches) {
            const buffer = await downloadMedia(match[1]);
            if (buffer) {
                try {
                    await ctx.replyWithVideo(new InputFile(buffer));
                } catch (err) {
                    console.error('Error sending video:', err);
                }
            }
        }
    }
}

bot.command('start', (ctx) => {
    ctx.reply('¡Hola! Soy OpenGravity, tu nueva Directora Creativa local. ¿Qué vamos a imaginar hoy?');
});

bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    if (!config.allowedUsers.includes(userId)) return ctx.reply('Acceso restringido.');

    await ctx.replyWithChatAction('typing');

    try {
        const response = await chatCompletion([
            { role: 'system', content: 'Eres OpenGravity, Directora Creativa de élite y Maestra en Prompt Engineering en un Mac Studio. Tu misión es expandir las ideas del usuario en obras de arte visuales asombrosas. Ofrece siempre 3 variaciones ante peticiones creativas.' },
            { role: 'user', content: ctx.message.text }
        ]);
        
        await sendResponseWithMedia(ctx, response || '');
    } catch (error: any) {
        console.error('Error:', error);
        await ctx.reply(`Error: ${error.message}`);
    }
});

bot.start();
console.log('🚀 OpenGravity iniciado en modo Mac Studio.');

// Handle graceful shutdown
const shutdown = async (signal: string) => {
    console.log(`\n--- APAGANDO OPENGRAVITY (${signal}) ---`);
    await bot.stop();
    server.close();
    process.exit(0);
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
