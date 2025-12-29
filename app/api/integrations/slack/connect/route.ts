import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }

        const { userId, botToken, signingSecret } = await req.json();

        if (!userId || !botToken || !signingSecret) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Validate token with Slack
        const response = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${botToken}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();

        if (!data.ok) {
            return NextResponse.json({ error: "Invalid Slack Bot Token" }, { status: 400 });
        }

        // Save to Firestore using Admin SDK
        const docRef = adminDb.collection("chatbots").doc(userId);
        await docRef.set({
            integrations: {
                slack: {
                    connected: true,
                    botToken,
                    signingSecret,
                    botId: data.bot_id,
                    botUserId: data.user_id,
                    teamId: data.team_id,
                    teamName: data.team,
                    connectedAt: new Date().toISOString()
                }
            }
        }, { merge: true });

        return NextResponse.json({
            success: true,
            team: data.team,
            botId: data.bot_id
        });

    } catch (error) {
        console.error("Error connecting Slack:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
