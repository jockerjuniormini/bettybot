export const toolDefinition = {
    type: "function",
    function: {
        name: "get_current_time",
        description: "Returns the current date and time in the specified timezone (or UTC if not specified)",
        parameters: {
            type: "object",
            properties: {
                timezone: {
                    type: "string",
                    description: "The tz timezone string (e.g., 'America/Los_Angeles', 'Europe/Madrid'). If omitted, defaults to UTC."
                }
            }
        }
    }
};

export async function execute(args: { timezone?: string }): Promise<string> {
    const tz = args.timezone || 'UTC';
    try {
        const time = new Date().toLocaleString('en-US', { timeZone: tz });
        return `Current time in ${tz} is: ${time}`;
    } catch (error) {
        return `Error getting time for timezone ${tz}: ${(error as Error).message}`;
    }
}
