/**
 * Standalone Anthropic connectivity test.
 * Run:  node scripts/test-anthropic.js
 * Reads ANTHROPIC_API_KEY from .env.local and tries a few Claude models,
 * printing the exact success/error for each so we can pinpoint the issue.
 */
require('dotenv').config({ path: '.env.local' });

const mod = require('@anthropic-ai/sdk');
const Anthropic = mod.default || mod;

(async () => {
    const key = (process.env.ANTHROPIC_API_KEY || '').trim();
    console.log('--- Anthropic test ---');
    console.log('Key present:', !!key, key ? `(length ${key.length}, starts "${key.slice(0, 7)}...")` : '(MISSING)');
    if (!key) {
        console.log('ANTHROPIC_API_KEY is missing/empty in .env.local');
        process.exit(1);
    }
    if (key.toLowerCase().includes('your-') || key.includes('sk-ant-your')) {
        console.log('⚠️  Key looks like a PLACEHOLDER, not a real key.');
    }

    const client = new Anthropic({ apiKey: key });
    const models = [
        'claude-sonnet-4-6',
        'claude-haiku-4-5-20251001',
        'claude-opus-4-6',
    ];

    for (const model of models) {
        try {
            const r = await client.messages.create({
                model,
                max_tokens: 50,
                messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
            });
            const text = (r.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('');
            console.log(`✓ ${model}  ->  WORKS. Reply: "${text.trim()}"`);
        } catch (e) {
            console.log(`✗ ${model}  ->  FAILED. status=${e.status || '?'} type=${e.error?.error?.type || '?'} message=${e.message || e}`);
        }
    }
    console.log('--- done ---');
})();
