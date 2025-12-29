import { getAdminDb } from "@/lib/firebase-admin";
import { createProduct, deleteProduct, updateProduct } from "@/lib/products";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const adminDb = getAdminDb();
        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        if (!adminDb) {
            return NextResponse.json({ products: [], error: "Admin SDK not available" }, { status: 500 });
        }

        const snapshot = await adminDb.collection("products").where("chatbotId", "==", chatbotId).get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ products });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { chatbotId, name, price, description } = body;

        if (!chatbotId || !name || price === undefined) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const productId = await createProduct(body);
        return NextResponse.json({ success: true, productId });
    } catch (error) {
        console.error("Error creating product:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
        }

        await updateProduct(id, updates);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error updating product:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
        return NextResponse.json({ error: "Missing product ID" }, { status: 400 });
    }

    try {
        await deleteProduct(id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting product:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
