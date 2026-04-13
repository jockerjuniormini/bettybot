import { Bot, InputFile } from 'grammy';
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

// Helper para enviar medios (Imágenes/Vídeos)
async function sendResponseWithMedia(ctx: any, response: string) {
    const imageMarkers = response.match(/IMAGEN_GENERADA: (https?:\/\/[^\s|]+)/g);
    const videoMarkers = response.match(/VIDEO_GENERADO: (https?:\/\/[^\s|]+)/g);

    let cleanText = response.replace(/IMAGEN_GENERADA: [^|]+\|[^|\n]+/g, '').trim();
    cleanText = cleanText.replace(/VIDEO_GENERADO: [^|]+\|[^|\n]+/g, '').trim();
    cleanText = cleanText.replace(/\[V\d+\].+/g, '').trim();

    if (cleanText) await ctx.reply(cleanText);

    if (imageMarkers) {
        for (const marker of imageMarkers) {
            const url = marker.replace('IMAGEN_GENERADA: ', '').trim();
            await ctx.replyWithPhoto(new InputFile(new URL(url)));
        }
    }
    if (videoMarkers) {
        for (const marker of videoMarkers) {
            const url = marker.replace('VIDEO_GENERADO: ', '').trim();
            await ctx.replyWithVideo(new InputFile(new URL(url)));
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
