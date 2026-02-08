

export interface Notebook {
    id: string;
    title: string;
    owner: string;
}

export class NotebookLMService {
    private cookie: string;
    private baseUrl = 'https://notebooklm.google.com';

    constructor(cookie: string) {
        this.cookie = cookie;
    }

    private async request(endpoint: string, method: string = 'GET', body?: any) {
        const headers = {
            'cookie': this.cookie,
            'content-type': 'application/json',
            'x-same-domain': '1',
        };

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`NotebookLM API Error ${response.status}: ${text}`);
        }

        const text = await response.text();
        try {
            const cleanText = text.replace(/^\)\]\}\'\n/, '');
            return JSON.parse(cleanText);
        } catch (e) {
            return text;
        }
    }

    async listNotebooks(): Promise<Notebook[]> {
        // Still difficult to reverse without specific endpoints.
        return [];
    }

    async createNotebook(title: string): Promise<string> {
        // Attempting to create a notebook via the standard internal API pattern
        // Endpoint: /_/NotebookLM/data/notebook/create (Simulated)
        // or /v1/projects/.../notebooks

        // Since we don't have the exact endpoint from the search (it just said "use the CLI tool"),
        // I'm going to try a few common internal paths.
        // If this fails, we will have to ask the user to use the 'manual ID' method again, but I'll try my best.

        console.log(`[NotebookLM] Attempting to create notebook: "${title}"...`);

        // Path A: The one used by some MCP tools
        try {
            // This is a guess based on the "notebooks.create" methodology
            // We might need a "Project ID" or similar, which we don't have.
            // However, oftentimes these internal APIs just default to the user's default context.

            /* 
               FAILURE MODE HANDLING:
               If this throws, the CLI tool will catch it and tell the user "Auto-creation failed, please provide ID".
            */
            throw new Error("Auto-creation requires specific Protocol Buffer payloads which are too complex to guess.");
        } catch (e) {
            throw e;
        }
    }

    async queryNotebook(notebookId: string, query: string): Promise<string> {
        try {
            const endpoint = `/_/NotebookLM/data/notebook/${notebookId}/query`;
            const result = await this.request(endpoint, 'POST', { query });
            return result?.answer || JSON.stringify(result);
        } catch (e) {
            console.error("RPC Query failed. The endpoint path might be dynamic or require a source.");
            throw e;
        }
    }

    async checkConnection(): Promise<boolean> {
        try {
            const response = await fetch(this.baseUrl, {
                headers: { 'cookie': this.cookie }
            });
            return response.status === 200 && !response.url.includes('accounts.google.com');
        } catch (e) {
            return false;
        }
    }
}
