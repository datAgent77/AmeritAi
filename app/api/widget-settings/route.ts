import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        try {
            if (!adminDb) {
                return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
            }

            // Fetch user doc as well for permissions
            const userDocSnap = await adminDb.collection("users").doc(chatbotId).get();
            const userData = userDocSnap.exists ? userDocSnap.data() : null;

            const isChatbotEnabled = userData?.enableChatbot !== false;
            const isAccountActive = userData?.isActive !== false;

            const shouldEnable = isChatbotEnabled && isAccountActive;

            const docSnap = await adminDb.collection("chatbots").doc(chatbotId).get();

            if (docSnap.exists) {
                const data = docSnap.data() || {};
                // Return only public settings
                return NextResponse.json({
                    isEnabled: shouldEnable,
                    companyName: data.companyName || "Acme Corp",
                    welcomeMessage: data.welcomeMessage || "Hello! How can I help you today?",
                    brandColor: data.brandColor || "#000000",
                    brandLogo: data.brandLogo || "",
                    headerLogo: data.headerLogo || "",
                    headerLogoWidth: data.headerLogoWidth || 32,
                    headerLogoHeight: data.headerLogoHeight || 32,
                    headerBackgroundColor: data.headerBackgroundColor || "",
                    headerTextColor: data.headerTextColor || "#FFFFFF",
                    suggestedQuestions: data.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                    enableLeadCollection: data.enableLeadCollection || false,
                    position: data.position || "bottom-right", // 'bottom-right' | 'bottom-left'
                    viewMode: data.viewMode || "classic", // 'classic' | 'wide'
                    modalSize: data.modalSize || "half", // 'half' | 'full'
                    launcherStyle: data.launcherStyle || "circle",
                    launcherText: data.launcherText || "Chat",
                    launcherRadius: data.launcherRadius !== undefined ? data.launcherRadius : 50,
                    launcherHeight: data.launcherHeight || 60,
                    launcherWidth: data.launcherWidth || 60,
                    fullImageLauncherWidth: data.fullImageLauncherWidth || 60,
                    fullImageLauncherHeight: data.fullImageLauncherHeight || 60,
                    launcherIcon: data.launcherIcon || "message",
                    launcherIconUrl: data.launcherIconUrl || "",
                    launcherLibraryIcon: data.launcherLibraryIcon || "MessageSquare",
                    launcherIconColor: data.launcherIconColor || "#FFFFFF",
                    launcherBackgroundColor: data.launcherBackgroundColor || "",
                    bottomSpacing: data.bottomSpacing !== undefined ? data.bottomSpacing : 20,
                    sideSpacing: data.sideSpacing !== undefined ? data.sideSpacing : 20,
                    launcherShadow: data.launcherShadow || "medium",
                    launcherAnimation: data.launcherAnimation || "none",
                    // Full Image / Lottie Mode
                    launcherType: data.launcherType || "standard",
                    launcherImageMode: data.launcherImageMode || "image",
                    launcherFullImageUrl: data.launcherFullImageUrl || "",
                    launcherLottieUrl: data.launcherLottieUrl || "",
                    launcherHoverEffect: data.launcherHoverEffect || "scale",
                    initialLanguage: data.initialLanguage || "auto",
                    // Triggers
                    autoOpenDelay: data.autoOpenDelay || 0,
                    openOnExitIntent: data.openOnExitIntent || false,
                    openOnScroll: data.openOnScroll || 0,
                    // Availability
                    enableBusinessHours: data.enableBusinessHours || false,
                    timezone: data.timezone || "UTC",
                    businessHoursStart: data.businessHoursStart || "09:00",
                    businessHoursEnd: data.businessHoursEnd || "17:00",
                    offlineMessage: data.offlineMessage || "We are currently offline.",
                    // Engagement
                    engagement: data.engagement || null,
                    // Digital Waiter (Restaurant)
                    digitalWaiter: data.digitalWaiter || null,
                    enableVoiceAssistant: data.enableVoiceAssistant || false,
                    voiceProvider: data.voiceProvider || "klassifier",
                    elevenLabsVoiceId: data.elevenLabsVoiceId || "",
                    enablePersonalShopper: data.enablePersonalShopper || false,
                    enableIndustryGreeting: data.enableIndustryGreeting || false,
                    industry: data.industry || "ecommerce",
                    customPrompts: data.customPrompts || "",
                    theme: data.theme || "classic",
                }, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Cache-Control': 'no-store, max-age=0',
                    }
                });
            } else {
                // Return default settings if not found
                return NextResponse.json({
                    companyName: "Acme Corp",
                    welcomeMessage: "Hello! How can I help you today?",
                    brandColor: "#000000",
                    brandLogo: "",
                    headerLogo: "",
                    headerBackgroundColor: "",
                    headerTextColor: "#FFFFFF",
                    suggestedQuestions: ["What are your pricing plans?", "How do I get started?", "Contact support"],
                    enableLeadCollection: false,
                    position: "bottom-right",
                    viewMode: "classic",
                    modalSize: "half",
                    launcherStyle: "circle",
                    launcherText: "Sohbet",
                    launcherRadius: 50,
                    launcherHeight: 60,
                    launcherWidth: 60,
                    fullImageLauncherWidth: 60,
                    fullImageLauncherHeight: 60,
                    launcherIcon: "message",
                    launcherIconUrl: "",
                    launcherLibraryIcon: "MessageSquare",
                    launcherIconColor: "#FFFFFF",
                    launcherBackgroundColor: "",
                    bottomSpacing: 20,
                    sideSpacing: 20,
                    launcherShadow: "medium",
                    launcherAnimation: "none",
                    initialLanguage: "auto",
                    engagement: null,
                    digitalWaiter: null,
                    enableVoiceAssistant: false,
                    voiceProvider: "klassifier",
                    elevenLabsVoiceId: "",
                    enablePersonalShopper: false,
                    enableIndustryGreeting: false,
                    industry: "ecommerce",
                    customPrompts: "",
                    theme: "classic",
                }, {
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                        'Cache-Control': 'no-store, max-age=0',
                    }
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
            return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
        }
    } catch (error) {
        console.error("Error in GET /api/widget-settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    if (!adminDb || !adminAuth) {
        return NextResponse.json({ error: "Firebase Admin SDK not initialized" }, { status: 500 });
    }

    try {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        if (!userId) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        const body = await req.json();
        const { chatbotId } = body;

        let targetChatbotId = userId;

        // If trying to edit another chatbot, check permissions
        if (chatbotId && chatbotId !== userId) {
            const userDoc = await adminDb.collection("users").doc(userId).get();
            const userData = userDoc.data();

            if (userData?.role === 'SUPER_ADMIN') {
                targetChatbotId = chatbotId;
            } else {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Validation or sanitization could go here if needed

        // Remove chatbotId from body before saving
        const { chatbotId: _, ...settingsToSave } = body;

        await adminDb.collection("chatbots").doc(targetChatbotId).set({
            ...settingsToSave,
            updatedAt: new Date().toISOString(),
        }, { merge: true });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving settings:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function OPTIONS(req: Request) {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
