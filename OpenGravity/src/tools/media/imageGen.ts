import { getPromptVariations } from '../../utils/promptArtist.js';

export const toolDefinition = {
    name: "generate_image",
    description: "Genera imágenes artísticas de alta calidad. Betty actuará como Directora Creativa expandiendo tu idea y ofreciendo 3 variaciones por defecto.",
    parameters: {
        type: "object",
        properties: {
            prompt: { type: "string" },
            variations: { type: "number", default: 3 },
            aspect_ratio: { type: "string", enum: ["1:1", "16:9", "9:16"] }
        },
        required: ["prompt"]
    }
};

export async function execute(args: { prompt: string, variations?: number, aspect_ratio?: string }) {
    const numVariations = Math.min(Math.max(args.variations || 3, 1), 3);
    const prompts = getPromptVariations(args.prompt, numVariations);
    
    // Configuración local (Placeholder para cuando el Mac Studio tenga SD local)
    // De momento usamos Pollinations con modelo FLUX para máxima calidad
    const results = prompts.map((p, i) => {
        const seed = Math.floor(Math.random() * 1000000) + i;
        const imageUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(p)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true&enhance=true`;
        return `IMAGEN_GENERADA: ${imageUrl} | [V${i+1}] ${p}`;
    });
    
    return results.join('\n\n');
}
