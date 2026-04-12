import { Bot, InputFile } from 'grammy';
import { config } from './config/env.js';
import { initDb, clearHistory } from './db/index.js';
import { processUserMessage } from './agent/index.js';
import { transcribeAudio } from './llm/index.js';
import { generateSpeech } from './llm/tts.js';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// 1. Initialize SQLite/Firebase Database
await initDb();
console.log('Database initialized successfully.');

// 2. Initialize Telegram Bot
const bot = new Bot(config.telegramBotToken);

// 3. Security Middleware: Whitelist Check
bot.use(async (ctx, next) => {
    const userId = ctx.from?.id.toString();
    if (!userId || !config.telegramAllowedUserIds.includes(userId)) {
        console.warn(`[Security] Unauthorized access attempt from User ID: ${userId}`);
        // We do not respond to unauthorized users to avoid leakage
        return;
    }
    await next();
});

// 4. Command Handlers
bot.command('start', async (ctx) => {
    const userId = ctx.from!.id;
    await ctx.reply("Hello! I'm Betty, your personal AI agent running locally. How can I help you today?");
});

bot.command('clear', async (ctx) => {
    const userId = ctx.from!.id;
    await clearHistory(userId);
    await ctx.reply("Mi memoria sobre nuestra conversación ha sido borrada.");
});

// 4.5 Helper function to handle audio
async function handleAudioMessage(ctx: any) {
    const userId = ctx.from.id;
    const voice = ctx.message.voice || ctx.message.audio;

    if (!voice) return;

    await ctx.replyWithChatAction('typing');

    try {
        // 1. Get file link from Telegram
        const file = await ctx.getFile();
        const url = `https://api.telegram.org/file/bot${config.telegramBotToken}/${file.file_path}`;

        // 2. Download to local disk
        const tempDir = './temp';
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        
        const filePath = path.join(tempDir, `${file.file_id}.ogg`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al descargar el audio de Telegram');
        
        const fileStream = fs.createWriteStream(filePath);
        await pipeline(Readable.fromWeb(response.body as any), fileStream);

        // 3. Transcribe with Groq Whisper
        const text = await transcribeAudio(filePath);
        
        // 4. Clean up file
        fs.unlinkSync(filePath);

        if (!text || text.trim().length === 0) {
            await ctx.reply("He recibido tu audio, pero no he podido entender nada de lo que has dicho.");
            return;
        }

        console.log(`[Audio] Transcripción para ${userId}: ${text}`);
        
        // Optional: Inform the user what we understood
        // await ctx.reply(`_He entendido:_ "${text}"`, { parse_mode: 'Markdown' });

        // 5. Process as normal message
        const userName = ctx.from.first_name || 'Usuario';
        const role = config.telegramAdminIds.includes(userId.toString()) ? 'admin' : 'vip';
        const reply = await processUserMessage(userId, userName, role, text);
        
        // 6. Generate Voice Response (optional but recommended if ELEVENLABS_API_KEY is present)
        if (config.elevenLabsApiKey) {
            try {
                const responseAudioPath = path.join(tempDir, `reply_${file.file_id}.mp3`);
                await generateSpeech(reply, responseAudioPath);
                
                await ctx.replyWithVoice(new InputFile(responseAudioPath));
                
                // Clean up response audio
                fs.unlinkSync(responseAudioPath);
            } catch (ttsError: any) {
                console.error('Error generando voz:', ttsError);
                // Fallback to text if TTS fails
                await ctx.reply(reply);
            }
        } else {
            await ctx.reply(reply);
        }

    } catch (error: any) {
        console.error('Error procesando audio:', error);
        await ctx.reply(`Lo siento, he tenido un problema al procesar tu audio: ${error.message}`);
    }
}

bot.on('message:voice', handleAudioMessage);
bot.on('message:audio', handleAudioMessage);

// 5. Message Handler
bot.on('message:text', async (ctx) => {
    const userId = ctx.from.id;
    const userMessage = ctx.message.text;

    // Send typing indicator
    await ctx.replyWithChatAction('typing');

    try {
        const userName = ctx.from.first_name || 'Usuario';
        const role = config.telegramAdminIds.includes(userId.toString()) ? 'admin' : 'vip';
        const response = await processUserMessage(userId, userName, role, userMessage);
        await ctx.reply(response);
    } catch (error: any) {
        console.error('Error processing message:', error);
        await ctx.reply(`Sorry, I encountered an error: ${error.message}`);
    }
});

// 6. Start the Bot (Long Polling)
bot.start({
    onStart: (botInfo) => {
        console.log(`Betty bot (@${botInfo.username}) started successfully.`);
        console.log(`Allowed Users: ${config.telegramAllowedUserIds.join(', ')}`);
    }
});

// Error handling to prevent crashes
bot.catch((err) => {
    console.error(`Bot Error: ${err.message}`);
});

// Handle graceful shutdown
process.once('SIGINT', () => bot.stop());
process.once('SIGTERM', () => bot.stop());
