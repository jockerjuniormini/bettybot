const response = `Aquí te dejo tres versiones de un templo antiguo en la selva, con mucha niebla. La primera es una imagen fotográfica con un estilo cinematográfico, la segunda es una pintura digital con un estilo conceptual y la tercera es una imagen con un estilo ciberpunk. ¿Te gustaría que te muestre más variaciones o que te explique algo sobre estas imágenes?

IMAGEN_GENERADA: https://pollinations.ai/p/un%20templo%20antiguo%20en%20la%20selva%2C%20con%20mucha%20niebla%2C%20cinematic%20photography%2C%208k%20resolution%2C%20highly%20detailed%2C%20masterpiece?width=1280&height=720&seed=274900&nologo=true&enhance=true | [V1] un templo...

IMAGEN_GENERADA: https://pollinations.ai/p/un%20templo%20antiguo%20en%20la... | [V2] ...`;

const imageRegex = /IMAGEN_GENERADA:\s*(https?:\/\/[^\s|]+)/g;
const imageMatches = [...response.matchAll(imageRegex)];

console.log('Matches found:', imageMatches.length);
imageMatches.forEach((m, i) => console.log(`Match ${i}: ${m[1]}`));
