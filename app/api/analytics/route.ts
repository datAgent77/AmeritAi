import { NextRequest, NextResponse } from "next/server";
import { getAnalyticsData } from "@/lib/analytics";
import { authorizeTargetAccess } from "@/lib/api-auth";
import { buildActorFromRequest, logPlatformEvent } from "@/lib/server-event-log";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");
        const startDateStr = searchParams.get("startDate");
        const endDateStr = searchParams.get("endDate");

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        const authz = await authorizeTargetAccess(req, chatbotId);
        if (!authz.ok) {
            await logPlatformEvent({
                event_type: "analytics_fetch",
                actor: buildActorFromRequest(req),
                source_module: "analytics_api",
                result: "denied",
                target: { chatbot_id: chatbotId }
            });
            return authz.response;
        }

        const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().setDate(new Date().getDate() - 7));
        const endDate = endDateStr ? new Date(endDateStr) : new Date();

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
            return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
        }

        const data = await getAnalyticsData(chatbotId, startDate, endDate);

        await logPlatformEvent({
            event_type: "analytics_fetch",
            actor: buildActorFromRequest(req, {
                uid: authz.callerUid,
                role: authz.isSuperAdmin ? "SUPER_ADMIN" : "TENANT_ADMIN"
            }),
            source_module: "analytics_api",
            result: "success",
            target: { chatbot_id: chatbotId },
            metadata: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString()
            }
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error("Analytics API Error:", error);
        await logPlatformEvent({
            event_type: "analytics_fetch",
            actor: buildActorFromRequest(req),
            source_module: "analytics_api",
            result: "error",
            metadata: {
                error_message: error instanceof Error ? error.message : "Unknown error"
            }
        });
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
