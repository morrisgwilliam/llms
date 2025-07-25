import { Anthropic } from "@anthropic-ai/sdk"
import {
    MessageParam,
    Tool,
} from "@anthropic-ai/sdk/resources/messages.mjs"
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js"
import readlline from "readline/promises"
import dotenv from "dotenv"

dotenv.config()

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if(!ANTHROPIC_API_KEY) {
    throw new Error("Please set the ANTHROPIC_API_KEY environment variable.");
}

class MCPClient {
    private mcp: Client
    private anthropic: Anthropic
    private transport: StdioClientTransport | null = null
    private tools: Tool[] = []
    private model: string = "claude-3-5-sonnet-20241022"

    constructor(){
        this.anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mcp = new Client({
            name: "mcp-client-cli",
            version: "1.0.0"
        });
    }

    async connectToServer(serverScriptPath: string){
        try {
            const isJs = serverScriptPath.endsWith('.js');
            const isPy = serverScriptPath.endsWith('.py');

            if(!isJs && !isPy) {
                throw new Error("Server script must be a .js or .py file.");
            }

            const command = isPy ?
            process.platform === 'win32' ?
            "python" : "python3"
            : process.execPath

            this.transport = new StdioClientTransport({
                command,
                args: [ serverScriptPath ]
            })

            await this.mcp.connect(this.transport)

            const toolsResult = await this.mcp.listTools();
            this.tools = toolsResult.tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                input_schema: tool.inputSchema
            }))

            console.log(
                "Connected to server with tools:",
                this.tools.map(({name}) => name)
            )

        } catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    async processQuery(query: string) {
        const messages: MessageParam[] = [
            {
                role: "user",
                content: query
            }
        ]

        const response = await this.anthropic.messages.create({
            model: this.model,
            max_tokens: 1000,
            messages,
            tools: this.tools,
        })

        const finalText = []

        for (const content of response.content) {
            if(content.type === "text") {
                finalText.push(content.text)
            } else if(content.type === "tool_use") {
                const toolName = content.name
                const toolArgs = content.input as { [x: string]: unknown } | undefined;

                const result = await this.mcp.callTool({
                    name: toolName,
                    arguments: toolArgs,
                })

                finalText.push(
                    `[Calling tool ${toolName} with args: ${JSON.stringify(toolArgs)}]`
                )

                messages.push({
                    role: "user",
                    content: result.content as string
                })

                const response = await this.anthropic.messages.create({
                    model: this.model,
                    max_tokens: 1000,
                    messages,
                })

                finalText.push(
                    response.content[0].type === "text" ? response.content[0].text : ""
                )

            }
        }
        return finalText.join("\n");
    }

    async chatLoop() {
        const rl = readlline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        console.log("Type your query (or 'exit' to quit):");

        while (true) {
            const query = await rl.question("> ");
            if (query.toLowerCase() === "exit") {
                break;
            }

            try {
                const response = await this.processQuery(query);
                console.log("Response:", response);
            } catch (error) {
                console.error("Error processing query:", error);
            }
        }

        rl.close();
    }
    async cleanup(){
        await this.mcp.close()
    }
}

async function main() {
    if(process.argv.length < 3) {
        console.log("Usage: node index.ts <path_to_server_script>");
        return
    }
    const mcpClient = new MCPClient();
    try {
        await mcpClient.connectToServer(process.argv[2]);
        await mcpClient.chatLoop();
    } finally {
        await mcpClient.cleanup();
        process.exit()
    }
}

main()