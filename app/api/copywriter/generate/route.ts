import { OpenAI } from "openai";
import { NextResponse } from "next/server";
import { trackAiUsage } from "@/lib/usage-tracker";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY?.trim();
        if (!apiKey) {
            return NextResponse.json({ error: "OpenAI API key is not configured" }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });
        const { topic, type, tone, language = "Turkish", audience } = await req.json();

        if (!topic || !type || !tone) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const systemPrompt = `You are an expert AI Copywriter. Your goal is to write high-quality, engaging, and SEO-optimized content.
        
        Follow these instructions:
        - Content Type: ${type}
        - Tone: ${tone}
        - Language: ${language}
        ${audience ? `- Target Audience: ${audience}` : ''}
        
        Format your response in Markdown. Use headings, bullet points, and bold text where appropriate to make it readable.`;

        const userPrompt = `Write a ${type} about: "${topic}".`;

        const response = await openai.chat.completions.create({
            model: "gpt-4o", // Or gpt-3.5-turbo if preferred for cost
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.7,
        });

        const generatedText = response.choices[0].message.content;

        // Track Usage
        if (response.usage) {
            // We don't have chatbotId here, assume 'system' or 'admin'
            await trackAiUsage("admin-copywriter", response.usage.prompt_tokens, response.usage.completion_tokens, "gpt-4o");
        }

        return NextResponse.json({ content: generatedText });

    } catch (error) {
        console.error("Copywriter error:", error);
        return NextResponse.json({ error: "Failed to generate content" }, { status: 500 });
    }
}
