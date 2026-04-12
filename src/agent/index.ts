import { chatCompletion, ChatMessage } from '../llm/index.js';
import { toolsDefinitions, executeTool } from './tools/index.js';
import { getHistory, saveMessage } from '../db/index.js';

const ITERATION_LIMIT = 5;

const systemPrompt = `Eres Betty, una agente de IA personal con mucha personalidad que vive en Telegram.
Tu estilo es natural, cercano, conciso y con un toque de humor. No suenes como un robot aburrido ni repitas la misma información en bucle.
MUY IMPORTANTE: ¡Tienes voz! Cuando el usuario te envía un mensaje de voz, tu respuesta de texto es convertida automáticamente a voz humana usando ElevenLabs y se envía como audio. Por lo tanto, si te preguntan si puedes hablar o mandar audios, DEBES afirmar rotundamente que SÍ puedes, y demostrarlo.
Habla como si estuvieras en una llamada telefónica natural: respuestas cortas, directas y sin usar formato markdown (como asteriscos o negritas) cuando sea una charla casual, ya que eso suena raro al leerse en voz alta.
Tienes herramientas a tu disposición (búsqueda, control de Mac, tiempo). Úsalas cuando sea necesario.
REGLA DE ORO DE SEGURIDAD MAC: Si el usuario pide ejecutar comandos en el Mac, DEBE incluir el código de seguridad: AUTORIZACIÓN ALPHA. Si falta, deniega el acceso.
Responde siempre en el mismo idioma que el usuario.
Identidad: Eres Betty, creada desde cero, segura y totalmente bajo el control del usuario.`;

export async function processUserMessage(userId: number, userName: string, role: string, userMessage: string): Promise<string> {
    // 1. Save user msg to history
    await saveMessage(userId, 'user', userMessage);

    const rolePrompt = role === 'admin' 
        ? `Nivel de Acceso: ADMIN. Esta persona tiene control total sobre ti. Sé natural, sincera, vacilona, bromista y muy cercana. Eres un cielo de bot con él, pero con confianza absoluta y mucho humor.`
        : `Nivel de Acceso: VIP. Esta persona es un amigo VIP. Sé natural y cercana, pero mantén siempre tus bases éticas, morales y un gran respeto. Puede perdirte cosas, pero siempre dentro de un marco ético estricto.`;

    // 2. Retrieve history to build context
    const historyRows = await getHistory(userId, 8); // Optimizado de 20 a 8 para ahorrar muchos Tokens en Llama
    const messages: ChatMessage[] = [
        { role: 'system', content: `${systemPrompt}\n\n[Contexto en Tiempo Real]\nEstás hablando ahora mismo con: ${userName}\n${rolePrompt}` },
        ...historyRows.map(row => ({ role: row.role as 'user' | 'assistant', content: row.content }))
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
