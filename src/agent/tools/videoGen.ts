export const toolDefinition = {
    type: "function" as const,
    function: {
        name: "generate_video",
        description: "Genera un vídeo corto (animación) basado en una descripción de texto. ESTA HERRAMIENTA ES GRATUITA. Úsala cuando el usuario quiera ver movimiento, una escena animada o una idea en vídeo.",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "La descripción de la escena en movimiento. Ej: 'una cascada en un bosque mágico con luciérnagas'."
                }
            },
            required: ["prompt"],
        },
    }
};

export async function execute(args: { prompt: string }): Promise<string> {
    const prompt = encodeURIComponent(args.prompt);
    
    // Endpoint de vídeo de Pollinations
    const videoUrl = `https://gen.pollinations.ai/video/${prompt}`;
    
    console.log(`[VideoGen] Vídeo solicitado para: ${args.prompt}`);
    
    // Marcador especial para el bot
    return `VIDEO_GENERADO: ${videoUrl} | Prompt: ${args.prompt}`;
}
