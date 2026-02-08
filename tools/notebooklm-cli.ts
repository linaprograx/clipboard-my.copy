
import { NotebookLMService } from '../src/services/notebooklm';
import fs from 'fs';
import path from 'path';

// Simple .env parser since we might not have dotenv installed in this environment
function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env: Record<string, string> = {};

        // Strategy 1: Standard KEY=VALUE parsing
        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) {
                env[key.trim()] = value.trim();
            }
        });

        // Strategy 2: Raw Cookie Dump (if NOTEBOOKLM_COOKIE not found)
        // This handles copy-paste from Chrome DevTools table (Name Value Domain Path...)
        if (!env.NOTEBOOKLM_COOKIE) {
            const psidMatch = envContent.match(/__Secure-1PSID\s+([^\s]+)/);
            const papisidMatch = envContent.match(/__Secure-1PAPISID\s+([^\s]+)/);
            const psidtsMatch = envContent.match(/__Secure-1PSIDTS\s+([^\s]+)/);

            if (psidMatch && papisidMatch) {
                const parts = [
                    `__Secure-1PSID=${psidMatch[1]}`,
                    `__Secure-1PAPISID=${papisidMatch[1]}`
                ];
                if (psidtsMatch) {
                    parts.push(`__Secure-1PSIDTS=${psidtsMatch[1]}`);
                }
                env.NOTEBOOKLM_COOKIE = parts.join('; ');
                console.log("Detected raw cookie dump format. Assembled cookie string.");
            }
        }

        return env;
    } catch (e) {
        return {};
    }
}

async function main() {
    const env = loadEnv();
    const cookie = env.NOTEBOOKLM_COOKIE;

    if (!cookie) {
        console.error("Error: NOTEBOOKLM_COOKIE not found in .env file.");
        console.error("Please add it: NOTEBOOKLM_COOKIE=your_cookie_string");
        process.exit(1);
    }

    const service = new NotebookLMService(cookie);
    console.log("Checking connection to NotebookLM...");

    const connected = await service.checkConnection();

    if (connected) {
        console.log("✅ Successfully connected to NotebookLM (Cookie is valid).");
    } else {
        console.error("❌ Failed to connect. Cookie might be invalid or expired.");
    }
}

main().catch(console.error);
