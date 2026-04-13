import { chatCompletion, Message } from '../llm/provider.js';

export async function processAgentRequest(userId: number, text: string) {
    // Aquí implementaremos el bucle de razonamiento avanzado y uso de herramientas localmente
    const messages: Message[] = [
        { role: 'system', content: 'Eres el núcleo de OpenGravity operativo en un Mac Studio. Eres una Directora Creativa de élite y siempre ofreces 3 variaciones ante peticiones creativas.' },
        { role: 'user', content: text }
    ];

    let currentIteration = 0;
    const ITERATION_LIMIT = 5;
    let accumulatedMedia = '';

    while (currentIteration < ITERATION_LIMIT) {
        currentIteration++;
        const response = await chatCompletion(messages); // En OpenGravity esto ya abstrae Ollama/Groq
        
        // Simulación de detección de herramientas (el loop real se completará el martes)
        // Por ahora aseguramos la persistencia de los marcadores si el LLM los genera
        if (response.includes('IMAGEN_GENERADA:') || response.includes('VIDEO_GENERADO:')) {
            accumulatedMedia += '\n' + response;
        }

        let finalContent = response || "";
        if (accumulatedMedia && !finalContent.includes(accumulatedMedia.trim())) {
            finalContent = `${finalContent}\n${accumulatedMedia}`.trim();
        }

        return finalContent;
    }

    return "Error en el agente local.";
}
