import { Ollama } from 'ollama';
import { config } from '../config/env.js';

const ollama = new Ollama({ host: config.ollamaHost });

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export async function chatCompletion(messages: Message[], options: { brain?: string } = {}) {
  const brain = options.brain || config.defaultBrain;

  if (brain === 'ollama') {
    try {
      const response = await ollama.chat({
        model: config.localModel,
        messages: messages,
        stream: false
      });
      return response.message.content;
    } catch (error) {
      console.error('Error con Ollama, intentando fallback a Groq...', error);
      return callGroq(messages);
    }
  }

  return callGroq(messages);
}

async function callGroq(messages: Message[]) {
  // Aquí irá la lógica de Groq (similar a la de Betty)
  // Por ahora devolvemos un placeholder hasta que completemos la integración de Groq
  console.log('Llamando a Groq (Placeholder)...');
  return "Respuesta de Groq (Beta)";
}
