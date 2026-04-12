import * as timeTool from './time.js';
import * as webSearchTool from './webSearch.js';
import * as macControlTool from './macControl.js';

export const toolsRegistry = {
    [timeTool.toolDefinition.function.name]: timeTool,
    [webSearchTool.toolDefinition.function.name]: webSearchTool,
    [macControlTool.toolDefinition.function.name]: macControlTool
};

export const toolsDefinitions = Object.values(toolsRegistry).map(t => t.toolDefinition);

export async function executeTool(name: string, argsStr: string, role: string): Promise<string> {
    const tool = toolsRegistry[name as keyof typeof toolsRegistry];
    if (!tool) {
        return `Error: Tool ${name} not found.`;
    }

    try {
        const args = JSON.parse(argsStr);
        // If the tool exports an execute that expects a role as second argument, pass it
        return await (tool.execute as any)(args, role);
    } catch (error) {
        return `Error executing tool ${name}: ${(error as Error).message}`;
    }
}
