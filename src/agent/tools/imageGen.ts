export const toolDefinition = {
    type: "function" as const,
    function: {
        name: "generate_image",
        description: "Genera una imagen artística, realista o creativa basada en una descripción de texto. ESTA HERRAMIENTA ES GRATUITA E ILIMITADA. Úsala siempre que el usuario pida ver algo, imaginar algo o crear arte.",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "La descripción detallada de la imagen a generar (ej. 'un gato astronauta en Marte estilo cyberpunk'). MEJOR SI ES EN INGLÉS para mayor precisión."
                },
                aspect_ratio: {
                    type: "string",
                    enum: ["1:1", "16:9", "9:16", "4:3", "3:2"],
                    description: "La relación de aspecto de la imagen. Por defecto es 1:1."
                }
            },
            required: ["prompt"],
        },
    }
};

export async function execute(args: { prompt: string, aspect_ratio?: string }): Promise<string> {
    const prompt = encodeURIComponent(args.prompt);
    
    // Configuración de dimensiones según aspect ratio
    let width = 1024;
    let height = 1024;
    
    if (args.aspect_ratio === "16:9") { width = 1280; height = 720; }
    else if (args.aspect_ratio === "9:16") { width = 720; height = 1280; }
    else if (args.aspect_ratio === "4:3") { width = 1024; height = 768; }
    else if (args.aspect_ratio === "3:2") { width = 1024; height = 682; }

    const seed = Math.floor(Math.random() * 1000000);
    // Usamos el endpoint de Pollinations que es gratuito y no requiere API Key
    const imageUrl = `https://pollinations.ai/p/${prompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
    
    console.log(`[ImageGen] Imagen generada para: ${args.prompt}`);
    
    // Devolvemos el mensaje indicando que la imagen está lista y su URL
    // Incluimos un marcador especial para que el bot la detecte y la envíe como foto
    return `IMAGEN_GENERADA: ${imageUrl} | Prompt: ${args.prompt}`;
}
