
import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import * as xlsx from 'xlsx';

export const maxDuration = 60; // Allow longer timeout for large files

export async function POST(request: Request) {
    const adminDb = getAdminDb();
    try {
        if (!adminDb) {
            return NextResponse.json({ success: false, error: "Server configuration error - Admin SDK not available" }, { status: 500 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const chatbotId = formData.get('chatbotId') as string;

        if (!file || !chatbotId) {
            return NextResponse.json({ success: false, error: "File and Chatbot ID are required" }, { status: 400 });
        }

        console.log(`[ProductUpload] Processing file: ${file.name} for Chatbot: ${chatbotId}`);

        const buffer = Buffer.from(await file.arrayBuffer());
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = xlsx.utils.sheet_to_json(sheet);

        if (!rows || rows.length === 0) {
            return NextResponse.json({ success: false, error: "No data found in file" }, { status: 400 });
        }

        console.log(`[ProductUpload] Found ${rows.length} rows`);

        const batchSize = 450;
        let batch = adminDb.batch();
        let currentBatchCount = 0;
        let processedCount = 0;

        for (const row of rows) {
            // Flexible Column Mapping (try to guess standard names)
            // Supported: name/title, price, currency, description, sku/id, stock/quantity, image/image_url
            // Case insensitive check helper
            const getVal = (keys: string[]) => {
                for (const k of keys) {
                    // direct match
                    if (row[k] !== undefined) return row[k];
                    // lower case match
                    const keyLower = k.toLowerCase();
                    const rowKey = Object.keys(row).find(rk => rk.toLowerCase() === keyLower);
                    if (rowKey) return row[rowKey];
                }
                return undefined;
            };

            const pName = getVal(['name', 'title', 'product_name', 'urun_adi']);
            if (!pName) continue; // Skip if no name

            const pPriceFull = getVal(['price', 'fiyat', 'amount']);
            const pPrice = typeof pPriceFull === 'number' ? pPriceFull : parseFloat(String(pPriceFull).replace(/[^0-9.]/g, '')) || 0;

            const pCurrency = getVal(['currency', 'para_birimi']) || "TRY";
            const pDesc = getVal(['description', 'aciklama', 'desc']) || "";
            const pImage = getVal(['image', 'image_url', 'gorsel', 'img']) || "";
            const pUrl = getVal(['url', 'link', 'product_url', 'urun_linki']) || "";

            const pStock = getVal(['stock', 'quantity', 'stok', 'adet']);
            const stockNum = pStock !== undefined ? parseInt(String(pStock)) : null;
            const pInStock = stockNum !== null ? stockNum > 0 : true;

            let pSku = getVal(['sku', 'id', 'product_id', 'code']);
            if (!pSku) {
                pSku = "sku-up-" + Buffer.from(String(pName)).toString('base64').substring(0, 10);
            }
            const cleanSku = String(pSku).replace(/\//g, "-");

            const deterministicId = `${chatbotId}_${cleanSku}`;
            const docRef = adminDb.collection("products").doc(deterministicId);

            const productData = {
                chatbotId,
                name: String(pName),
                price: pPrice,
                currency: String(pCurrency).toUpperCase(),
                description: String(pDesc).slice(0, 1000),
                imageUrl: String(pImage),
                url: String(pUrl),
                sku: String(pSku),
                stockQuantity: stockNum,
                inStock: pInStock,
                source: 'file-upload',
                updatedAt: new Date().toISOString()
            };

            batch.set(docRef, productData, { merge: true });

            currentBatchCount++;
            processedCount++;

            if (currentBatchCount >= batchSize) {
                await batch.commit();
                batch = adminDb.batch();
                currentBatchCount = 0;
            }
        }

        if (currentBatchCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({ success: true, count: processedCount });

    } catch (error: any) {
        console.error("[ProductUpload] Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
