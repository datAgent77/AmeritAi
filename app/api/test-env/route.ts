
import { NextResponse } from "next/server";

export async function GET() {
    return NextResponse.json({
        email: process.env.FIREBASE_CLIENT_EMAIL,
        keyExists: !!process.env.FIREBASE_PRIVATE_KEY,
        keyLen: process.env.FIREBASE_PRIVATE_KEY?.length
    });
}
