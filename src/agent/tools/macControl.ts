import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const toolDefinition = {
    type: "function" as const,
    function: {
        name: "execute_mac_command",
        description: "Ejecuta un comando en la terminal del Mac Mini del administrador. PUEDES USARLO para subir volumen, apagar pantalla, abrir apps, decir texto, etc. NUNCA USES ESTA HERRAMIENTA a menos que el usuario tenga rol de 'admin' y haya escrito el código: AUTORIZACIÓN ALPHA.",
        parameters: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "El comando bash o AppleScript a ejecutar. Ej: 'osascript -e \"set volume 3\"' o 'open -a Safari'."
                }
            },
            required: ["command"],
        },
    }
};

export async function execute(args: { command: string }, role: string): Promise<string> {
    if (role !== 'admin') {
        console.error(`[ALERTA DE SEGURIDAD] Usuario con rol '${role}' intentó ejecutar comando Mac: ${args.command}`);
        return "ACCESO DENEGADO. Nivel de autorización insuficiente para ejecutar comandos de sistema.";
    }

    try {
        console.log(`[MacControl] Ejecutando comando por orden de Betty: ${args.command}`);
        const { stdout, stderr } = await execAsync(args.command);
        
        if (stderr && stderr.trim().length > 0) {
            return `Ejecutado con advertencias/errores: ${stderr}`;
        }
        
        return stdout ? `Ejecutado con éxito. Salida: ${stdout}` : `Ejecutado con éxito. Sin salida visible.`;
    } catch (error: any) {
        return `Error crítico ejecutando el comando: ${error.message}`;
    }
}
