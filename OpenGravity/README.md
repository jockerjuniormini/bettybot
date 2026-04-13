# 🌌 OpenGravity

**OpenGravity** es tu agente autónomo local de élite, diseñado específicamente para ser el "cerebro" de tu nuevo Mac Studio. 

A diferencia de otros bots, OpenGravity está construido para correr **Local-First**, utilizando la potencia de tu hardware Apple Silicon para procesar IA sin depender de nubes externas.

## 🚀 Guía de Instalación para el Martes

Cuando llegue tu Mac Studio, sigue estos pasos:

### 1. Requisitos Previos
- **Homebrew**: Instálalo desde [brew.sh](https://brew.sh).
- **Node.js**: `brew install node` (versión 20+ recomendada).
- **Ollama**: El motor para IA local.
  - Descárgalo en [ollama.com](https://ollama.com).
  - En la terminal del Mac Studio, ejecuta: `ollama run llama3.1:8b` (o 70b si tu Mac tiene 64GB+ de RAM).

### 2. Configuración del Proyecto
1.  Copia esta carpeta `OpenGravity` a tu Mac Studio.
2.  Abre la terminal en la carpeta y ejecuta:
    ```bash
    npm install
    ```
3.  Copia el archivo `.env.example` a `.env`:
    ```bash
    cp .env.example .env
    ```
4.  Rellena tu `TELEGRAM_BOT_TOKEN` y los IDs autorizados en el `.env`.

### 3. ¡Despegue!
Para iniciar a Betty en modo desarrollo:
```bash
npm run dev
```

## 🛠️ Estructura del Proyecto
- `src/agent`: El núcleo del razonamiento.
- `src/tools`: Habilidades del sistema (archivos, fotos, control).
- `src/llm`: Integración con Ollama y fallbacks a la nube.
- `src/config`: Gestión de variables de entorno.

## 🧠 Filosofía
Este proyecto no es solo un bot de chat. Es una **extensión de tu propia inteligencia** integrada en tu Mac Studio. Juntos iremos dándole nuevas habilidades cada día.

---
*Construido con ❤️ por Antigravity para @jocker y su nueva bestia de aluminio.*
