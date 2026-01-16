import { NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/lib/firebase-admin";
import { MODULES_REGISTRY } from "@/lib/modules-registry";

// Updated: 2026-01-01 - Added enableVisualDiagnosis support
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        // REMOVED EARLY RETURN: if (!adminDb) { ... }
        // We will handle null adminDb gracefully inside


        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        try {
            if (adminDb) {
                // Fetch user doc as well for permissions

                const userDocSnap = await adminDb.collection("users").doc(chatbotId).get();
                const userData = userDocSnap.exists ? userDocSnap.data() : null;

                const isChatbotEnabled = userData?.enableChatbot !== false;
                const isAccountActive = userData?.isActive !== false;

                const shouldEnable = isChatbotEnabled && isAccountActive;

                const docSnap = await adminDb.collection("chatbots").doc(chatbotId).get();

                if (docSnap.exists) {
                const data = docSnap.data() || {};
                
                // Merge data: Chatbot settings first, then User settings override (for module flags)
                // This ensures module toggles from the Console (written to users) take precedence
                const mergedData = {
                    ...data,
                    ...userData
                };

                const isChatbotEnabled = mergedData.enableChatbot !== false; // Default true
                const isAccountActive = mergedData.isActive !== false;
                
                // Force-disable modules that are 'coming_soon' in the registry
                const isVoiceAssistantAvailable = MODULES_REGISTRY.voiceAssistant?.status !== 'coming_soon';

                // Return only public settings
                return NextResponse.json({
                    isEnabled: isChatbotEnabled && isAccountActive,
                    companyName: mergedData.companyName || "Acme Corp",
                    welcomeTitle: mergedData.welcomeTitle || "",
                    welcomeMessage: mergedData.welcomeMessage || "Hello! How can I help you today?",
                    brandColor: mergedData.brandColor || "#000000",
                    brandLogo: mergedData.brandLogo || "",
                    headerLogo: mergedData.headerLogo || "",
                    headerLogoWidth: mergedData.headerLogoWidth || 32,
                    headerLogoHeight: mergedData.headerLogoHeight || 32,
                    headerBackgroundColor: mergedData.headerBackgroundColor || "",
                    headerTextColor: mergedData.headerTextColor || "#FFFFFF",
                    suggestedQuestions: mergedData.suggestedQuestions || ["What are your pricing plans?", "How do I get started?", "Contact support"],
                    enableLeadCollection: mergedData.enableLeadCollection || false,
                    enableInitialLeadCollection: mergedData.enableInitialLeadCollection ?? mergedData.enableLeadCollection ?? false,
                    enableInChatLeadCollection: mergedData.enableInChatLeadCollection ?? false,
                    leadFormConfig: mergedData.leadFormConfig || null,
                    leadCustomFields: mergedData.leadCustomFields || [],
                    position: mergedData.position || "bottom-right", // 'bottom-right' | 'bottom-left'
                    viewMode: mergedData.viewMode || "classic", // 'classic' | 'wide'
                    modalSize: mergedData.modalSize || "half", // 'half' | 'full'
                    launcherStyle: mergedData.launcherStyle || "circle",
                    launcherCollapse: mergedData.launcherCollapse || false,
                    launcherText: mergedData.launcherText || "Chat",
                    launcherRadius: mergedData.launcherRadius !== undefined ? mergedData.launcherRadius : 50,
                    launcherHeight: mergedData.launcherHeight || 60,
                    launcherWidth: mergedData.launcherWidth || 60,
                    fullImageLauncherWidth: mergedData.fullImageLauncherWidth || 60,
                    fullImageLauncherHeight: mergedData.fullImageLauncherHeight || 60,
                    launcherIcon: mergedData.launcherIcon || "message",
                    launcherIconUrl: mergedData.launcherIconUrl || "",
                    launcherLibraryIcon: mergedData.launcherLibraryIcon || "MessageSquare",
                    launcherIconColor: mergedData.launcherIconColor || "#FFFFFF",
                    launcherBackgroundColor: mergedData.launcherBackgroundColor || "",
                    bottomSpacing: mergedData.bottomSpacing !== undefined ? mergedData.bottomSpacing : 20,
                    sideSpacing: mergedData.sideSpacing !== undefined ? mergedData.sideSpacing : 20,
                    launcherShadow: mergedData.launcherShadow || "medium",
                    launcherAnimation: mergedData.launcherAnimation || "none",
                    // Full Image / Lottie Mode
                    launcherType: mergedData.launcherType || "standard",
                    launcherImageMode: mergedData.launcherImageMode || "image",
                    launcherFullImageUrl: mergedData.launcherFullImageUrl || "",
                    launcherLottieUrl: mergedData.launcherLottieUrl || "",
                    launcherHoverEffect: mergedData.launcherHoverEffect || "scale",
                    initialLanguage: mergedData.initialLanguage || "auto",
                    // Triggers
                    autoOpenDelay: mergedData.autoOpenDelay || 0,
                    openOnExitIntent: mergedData.openOnExitIntent || false,
                    openOnScroll: mergedData.openOnScroll || 0,
                    // Availability
                    enableBusinessHours: mergedData.enableBusinessHours || false,
                    timezone: mergedData.timezone || "UTC",
                    businessHoursStart: mergedData.businessHoursStart || "09:00",
                    businessHoursEnd: mergedData.businessHoursEnd || "17:00",
                    offlineMessage: mergedData.offlineMessage || "We are currently offline.",
                    // Engagement
                    engagement: mergedData.engagement || null,
                    // Digital Waiter (Restaurant)
                    digitalWaiter: mergedData.digitalWaiter || null,
                    // Voice Assistant - only enable if module is available AND user has it enabled
                    enableVoiceAssistant: isVoiceAssistantAvailable && (mergedData.enableVoiceAssistant || false),
                    voiceProvider: mergedData.voiceProvider || "klassifier",
                    elevenLabsVoiceId: mergedData.elevenLabsVoiceId || "",
                    enablePersonalShopper: mergedData.enablePersonalShopper || false,
                    enableVisualDiagnosis: mergedData.enableVisualDiagnosis || false,
                    enableIndustryGreeting: mergedData.enableIndustryGreeting || false,
                    industry: data.industry || mergedData.industry || "ecommerce",
                    customPrompts: mergedData.customPrompts || "",
                    salesOptimizationConfig: mergedData.salesOptimizationConfig || null,
                    theme: mergedData.theme || "classic",
                    }, {
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                            'Cache-Control': 'no-store, max-age=0',
                        }
                    });
                }
            } // Close adminDb

            const defaultSettings = {
                isEnabled: true,
                companyName: "Vion AI",
                welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
                brandColor: "#000000",
                brandLogo: "", // Ensure this is a valid path if possible, or empty
                headerLogo: "",
                headerBackgroundColor: "#000000",
                headerTextColor: "#FFFFFF",
                suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
                enableLeadCollection: false,
                position: "bottom-right",
                viewMode: "classic",
                modalSize: "half",
                launcherStyle: "circle",
                launcherCollapse: false,
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
                launcherBackgroundColor: "#000000",
                bottomSpacing: 20,
                sideSpacing: 20,
                launcherShadow: "medium",
                launcherAnimation: "none",
                initialLanguage: "tr",
                engagement: null,
                digitalWaiter: null,
                enableVoiceAssistant: false,
                voiceProvider: "klassifier",
                elevenLabsVoiceId: "",
                enablePersonalShopper: false,
                enableIndustryGreeting: false,
                industry: "technology",
                customPrompts: "",
                theme: "classic",
            };

            return NextResponse.json(defaultSettings, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                    'Cache-Control': 'no-store, max-age=0',
                }
            });
        }
        catch (error) {
            console.error("Error fetching settings:", error);
            // Return defaults on error instead of 500
            return NextResponse.json({
                isEnabled: true,
                companyName: "Vion AI",
                welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
                brandColor: "#000000",
                suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
                position: "bottom-right",
                viewMode: "classic",
                initialLanguage: "tr",
                theme: "classic"
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
        console.error("Error in GET /api/widget-settings:", error);
        // Return defaults on catastrophic error
        return NextResponse.json({
            isEnabled: true,
            companyName: "Vion AI",
            welcomeMessage: "Merhaba! Size nasıl yardımcı olabilirim?",
            brandColor: "#000000",
            suggestedQuestions: ["Fiyatlarınız nedir?", "Nasıl başlarım?", "İletişim"],
            position: "bottom-right",
            viewMode: "classic",
            initialLanguage: "tr",
            theme: "classic"
        }, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Cache-Control': 'no-store, max-age=0',
            }
        });
    }
}

export async function POST(req: Request) {
    console.log("POST /api/widget-settings called");
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

        // If industry is being set, also update sector and sectorId to ensure AI uses correct sector
        // AI service prioritizes sector > sectorId > industry, so we must sync all three
        const dataToSave = {
            ...settingsToSave,
            updatedAt: new Date().toISOString(),
        };

        if (settingsToSave.industry) {
            dataToSave.sector = settingsToSave.industry;
            dataToSave.sectorId = settingsToSave.industry;
        }

        await adminDb.collection("chatbots").doc(targetChatbotId).set(dataToSave, { merge: true });

        // Sync industry to users collection for Company Settings page
        if (settingsToSave.industry) {
            await adminDb.collection("users").doc(targetChatbotId).set({
                industry: settingsToSave.industry,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
        }

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
