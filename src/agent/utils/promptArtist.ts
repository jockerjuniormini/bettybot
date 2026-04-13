export const promptStyles = {
    photorealistic: "cinematic photography, 8k resolution, highly detailed textures, shot on 35mm lens, golden hour lighting, f/1.8, realistic skin, intricate details, professional color grading",
    artistic: "digital painting, conceptual art, intricate brushstrokes, vibrant colors, expressive lighting, masterpiece, Trending on ArtStation, surreal atmosphere",
    cyberpunk: "cyberpunk aesthetic, neon lights, rainy street, futuristic architecture, synthwave color palette, hyper-detailed, cinematic composition",
    abstract: "abstract expressionism, bold shapes, organic textures, experimental lighting, symbolic, minimalist but detailed"
};

/**
 * Toma un prompt básico y lo expande usando técnicas de ingeniería de prompts inteligentes.
 */
export function expandPrompt(basePrompt: string, style: keyof typeof promptStyles = 'photorealistic'): string {
    const styleSuffix = promptStyles[style] || promptStyles.photorealistic;
    
    // Si el usuario ya dio un prompt largo, solo añadimos el estilo
    if (basePrompt.split(' ').length > 15) {
        return `${basePrompt}, ${styleSuffix}`;
    }

    // Si es corto, intentamos enriquecerlo un poco más
    return `${basePrompt}, ${styleSuffix}, masterpiece, award-winning composition, sharp focus, atmospheric lighting`;
}

/**
 * Genera variaciones de un prompt para asegurar diversidad en las imágenes generadas.
 */
export function getPromptVariations(basePrompt: string, count: number = 3): string[] {
    const styles: (keyof typeof promptStyles)[] = ['photorealistic', 'artistic', 'cyberpunk', 'abstract'];
    const variations: string[] = [];

    for (let i = 0; i < count; i++) {
        const style = styles[i % styles.length];
        variations.push(expandPrompt(basePrompt, style));
    }

    return variations;
}
