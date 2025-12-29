import { getAdminDb } from "@/lib/firebase-admin";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ error: "Admin SDK not initialized" }, { status: 500 });
        }

        // Fetch all products for this chatbot using Admin SDK
        const snapshot = await adminDb.collection("products")
            .where("chatbotId", "==", chatbotId)
            .get();

        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

        // Calculate stats
        const totalProducts = products.length;
        const inStock = products.filter(p => p.inStock).length;
        const outOfStock = totalProducts - inStock;

        // Calculate approximate inventory value
        const totalValue = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);

        // Get recent products (sorted by updatedAt or createdAt)
        // We sort in memory since we already fetched all documentation
        const recentProducts = [...products]
            .sort((a, b) => {
                const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
                const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
                return dateB - dateA;
            })
            .slice(0, 5)
            .map(p => ({
                id: p.id,
                name: p.name,
                price: p.price,
                currency: p.currency,
                inStock: p.inStock,
                updatedAt: p.updatedAt || p.createdAt || null
            }));

        return NextResponse.json({
            stats: {
                totalProducts,
                inStock,
                outOfStock,
                totalValue
            },
            recentProducts
        });

    } catch (error) {
        console.error("Error fetching shopper stats:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
