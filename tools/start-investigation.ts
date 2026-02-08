
import { NotebookLMService } from '../src/services/notebooklm';
import fs from 'fs';
import path from 'path';

function loadEnv() {
    try {
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = fs.readFileSync(envPath, 'utf-8');
        const env: Record<string, string> = {};

        envContent.split('\n').forEach(line => {
            const [key, value] = line.split('=');
            if (key && value) env[key.trim()] = value.trim();
        });

        if (!env.NOTEBOOKLM_COOKIE) {
            const psidMatch = envContent.match(/__Secure-1PSID\s+([^\s]+)/);
            const papisidMatch = envContent.match(/__Secure-1PAPISID\s+([^\s]+)/);
            if (psidMatch && papisidMatch) {
                env.NOTEBOOKLM_COOKIE = `__Secure-1PSID=${psidMatch[1]}; __Secure-1PAPISID=${papisidMatch[1]}`;
            }
        }
        return env;
    } catch (e) { return {}; }
}

async function main() {
    const env = loadEnv();
    if (!env.NOTEBOOKLM_COOKIE) {
        console.error("❌ Cookie not found. Please add NOTEBOOKLM_COOKIE to .env");
        process.exit(1);
    }

    const service = new NotebookLMService(env.NOTEBOOKLM_COOKIE);
    const args = process.argv.slice(2);

    // Usage: tools/start-investigation.ts <notebookId> <topic>
    const notebookId = args[0];
    const topic = args[1];

    if (!notebookId || !topic) {
        console.error("Usage: npx tsx tools/start-investigation.ts <notebookId> <topic>");
        process.exit(1);
    }

    console.log(`🔍 Starting investigation on: "${topic}"...`);

    try {
        const prompt = `Research and summarize key trends for: ${topic}. Focus on modern programming trends, UX design, and visual aesthetics.`;
        const answer = await service.queryNotebook(notebookId, prompt);

        console.log("\n✅ Investigation Complete.\n");
        console.log(answer);

        const outputPath = path.resolve(process.cwd(), 'research', 'modern_copy_board.md');
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, `# Research: ${topic}\n\n${answer}`);
        console.log(`\n📄 Saved to ${outputPath}`);

    } catch (e) {
        console.error("\n❌ Investigation failed:", e);
    }
}

main();
