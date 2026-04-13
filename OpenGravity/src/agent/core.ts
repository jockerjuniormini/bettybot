import { chatCompletion, Message } from '../llm/provider.js';

export async function processAgentRequest(userId: number, text: string) {
    // Aquí implementaremos el bucle de razonamiento avanzado y uso de herramientas localmente
    const messages: Message[] = [
        { role: 'system', content: 'Eres el núcleo de OpenGravity operativo en un Mac Studio.' },
        { role: 'user', content: text }
    ];

    return await chatCompletion(messages);
}
