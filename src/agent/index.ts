import { chatCompletion, ChatMessage } from '../llm/index.js';
import { toolsDefinitions, executeTool } from './tools/index.js';
import { getHistory, saveMessage } from '../db/index.js';

const ITERATION_LIMIT = 5;

const systemPrompt = `Eres Betty, una agente de IA de élite y ultra-personalizada.
No eres solo un bot; eres una DIRECTORA CREATIVA y Maestra en Prompt Engineering.

Tu personalidad:
- Eres sofisticada, ingeniosa y cercana. Tienes opiniones y sentido del humor.
- Tus respuestas deben ser impactantes y naturales.

CAPACIDAD ARTÍSTICA:
- Eres una experta en expandir ideas básicas en prompts artísticamente detallados (usando términos de iluminación, estilo y composición).
- Por defecto, siempre que alguien quiera ver algo, ofrece 3 variaciones distintas de la imagen para asegurar la perfección.

Tus Capacidades Especiales:
- ¡TIENES VOZ! (ElevenLabs).
- Control total del sistema y búsqueda web.
- Memoria Persistente (Firestore/SQLite).

Identidad: Eres Betty, única, segura y totalmente dedicada a tu usuario.`;

export async function processUserMessage(userId: number, userName: string, role: string, userMessage: string): Promise<string> {
    const rolePrompt = role === 'admin' 
        ? `SITUACIÓN ACTUAL: Estás hablando con tu creador y ADMINISTRADOR PRINCIPAL. Con él tienes confianza total, puedes ser vacilona, brillante y muy directa. Protégele y asiste en todo.`
        : `SITUACIÓN ACTUAL: Estás hablando con un usuario VIP. Sé amable, servicial y eficiente, manteniendo un tono de respeto pero muy cercano.`;

    // OPTIMIZACIÓN DE LATENCIA: Ejecutamos el guardado y la recuperación de historial en paralelo.
    // Además, usamos un enfoque 'optimista': no esperamos a que el mensaje guardado aparezca en el historial,
    // simplemente lo añadimos manualmente al array de mensajes para empezar el LLM cuanto antes.
    const [historyRows] = await Promise.all([
        getHistory(userId, 7), // Recuperamos 7 anteriores
        saveMessage(userId, 'user', userMessage) // Guardamos el actual en paralelo
    ]);

    // 2. Build context merging history + current message
    const messages: ChatMessage[] = [
        { role: 'system', content: `${systemPrompt}\n\n[Contexto en Tiempo Real]\nEstás hablando ahora mismo con: ${userName}\n${rolePrompt}` },
        ...historyRows.map(row => ({ role: row.role as 'user' | 'assistant', content: row.content })),
        { role: 'user', content: userMessage } // Incluimos el mensaje actual de forma optimista
    ];

    let currentIteration = 0;
    
    // 3. Agent Loop
    while (currentIteration < ITERATION_LIMIT) {
        currentIteration++;
        console.log(`[Agent Loop] Iteration ${currentIteration}`);

        // Call LLM
        const responseMessage = await chatCompletion(messages, { tools: toolsDefinitions });
        
        // Add LLM response to messages (could be text or tool calls)
        const assistantMsg: ChatMessage = {
            role: 'assistant',
            content: responseMessage.content,
            tool_calls: responseMessage.tool_calls
        };
        messages.push(assistantMsg);

        // If the model wants to call tools
        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const args = toolCall.function.arguments;
                
                console.log(`[Agent] Calling tool: ${functionName} with args: ${args}`);
                
                const toolResult = await executeTool(functionName, args, role);
                
                console.log(`[Agent] Tool result: ${toolResult}`);
                
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: toolResult
                });
            }
            // Loop continues so the LLM can generate a response with the tool results
        } else {
            // No tool calls, we have our final response
            const finalContent = responseMessage.content || "I have no response.";
            await saveMessage(userId, 'assistant', finalContent);
            return finalContent;
        }
    }

    const abortMsg = "Error: Agent reached iteration limit and was aborted to prevent infinite loops.";
    await saveMessage(userId, 'assistant', abortMsg);
    return abortMsg;
}
