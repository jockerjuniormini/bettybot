import { getPromptVariations } from '../utils/promptArtist.js';

export const toolDefinition = {
    type: "function" as const,
    function: {
        name: "generate_image",
        description: "Genera una o varias imágenes artísticas, realistas o creativas basadas en una descripción de texto. Esta herramienta es experta en Prompt Engineering y devolverá variaciones para asegurar el mejor resultado.",
        parameters: {
            type: "object",
            properties: {
                prompt: {
                    type: "string",
                    description: "La descripción básica del usuario. Betty la expandirá artísticamente."
                },
                variations: {
                    type: "number",
                    description: "Número de variaciones a generar (1-3). Por defecto 3 para asegurar calidad.",
                    default: 3
                },
                aspect_ratio: {
                    type: "string",
                    enum: ["1:1", "16:9", "9:16", "4:3", "3:2"],
                    description: "Relación de aspecto."
                }
            },
            required: ["prompt"],
        },
    }
};

export async function execute(args: { prompt: string, variations?: number, aspect_ratio?: string }): Promise<string> {
    const numVariations = Math.min(Math.max(args.variations || 3, 1), 3);
    const prompts = getPromptVariations(args.prompt, numVariations);
    
    let width = 1024;
    let height = 1024;
    if (args.aspect_ratio === "16:9") { width = 1280; height = 720; }
    else if (args.aspect_ratio === "9:16") { width = 720; height = 1280; }

    const results = prompts.map((p, i) => {
        const seed = Math.floor(Math.random() * 1000000) + i;
        // Revertimos al endpoint público que no requiere API KEY
        const imageUrl = `https://pollinations.ai/p/${encodeURIComponent(p)}?width=${width}&height=${height}&seed=${seed}&nologo=true&enhance=true`;
        return `IMAGEN_GENERADA: ${imageUrl} | [V${i+1}] ${p}`;
    });
    
    console.log(`[ImageGen] Generadas ${numVariations} variaciones (Public Engine) para: ${args.prompt}`);
    
    return results.join('\n\n');
}
