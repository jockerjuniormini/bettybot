import google from 'googlethis';

export const toolDefinition = {
    type: "function" as const,
    function: {
        name: "search_web",
        description: "Busca en Google cualquier tipo de información actualizada. Úsalo cuando no sepas algo, necesites datos actuales, noticias o validar información reciente.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "La consulta de búsqueda (ej. 'clima en Barcelona', 'ganador del Oscar 2024', 'precio del dólar')."
                }
            },
            required: ["query"],
        },
    }
};

export async function execute(args: { query: string }): Promise<string> {
    try {
        const options = {
            page: 0,
            safe: false,
            parse_ads: false,
            additional_params: {
                hl: 'es' // Buscar en español
            }
        };

        const response = await google.search(args.query, options);
        
        let resultText = `Resultados de búsqueda para "${args.query}":\n\n`;
        
        // Agregar el resultado de conocimiento directo (si existe)
        if (response.dictionary) {
            resultText += `[Diccionario] ${response.dictionary.word}: ${response.dictionary.phonetic}\n${response.dictionary.definitions.join('\n')}\n\n`;
        }
        
        // Añadir el "knowledge panel" (ej. cuando preguntas por personas famosas)
        if (response.knowledge_panel.title) {
            resultText += `[Resumen General] ${response.knowledge_panel.title}\n${response.knowledge_panel.description}\n\n`;
        }

        // Agregar top 3 resultados orgánicos
        const topResults = response.results.slice(0, 3);
        topResults.forEach((res, i) => {
            resultText += `[${i + 1}] ${res.title}\n${res.description}\n`;
        });

        // TRUNCAMIENTO DE SEGURIDAD (Ahorro de Tokens)
        // Reducimos la información devuelta por seguridad
        if (resultText.length > 1500) {
            resultText = resultText.substring(0, 1500) + '... [CORTADO PARA AHORRAR TOKENS]';
        }

        return resultText;

    } catch (error: any) {
        return `Error searching the web: ${error.message}`;
    }
}
