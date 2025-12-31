import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import * as cheerio from 'cheerio';
import * as xlsx from 'xlsx';
import mammoth from 'mammoth';
// const pdf = require('pdf-parse');

export const dynamic = 'force-dynamic';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

export async function GET(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const chatbotId = searchParams.get("chatbotId");
        const wantsStats = searchParams.get("stats") === "true";
        const sourceUrl = searchParams.get("source");

        if (!chatbotId) {
            return NextResponse.json({ error: "Chatbot ID is required" }, { status: 400 });
        }

        let query = adminDb.collection("knowledge_docs").where("chatbotId", "==", chatbotId);

        if (sourceUrl) {
            query = query.where("source", "==", sourceUrl);
        }

        const querySnapshot = await query.get();

        const docs = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })).sort((a: any, b: any) => b.createdAt - a.createdAt);

        // If stats requested, return aggregated counts
        if (wantsStats) {
            const stats = {
                total: docs.length,
                text: docs.filter((d: any) => d.type === 'text' || d.type === 'manual').length,
                url: docs.filter((d: any) => d.type === 'url').length,
                file: docs.filter((d: any) => d.type === 'file').length,
                qa: docs.filter((d: any) => d.type === 'qa').length
            };
            return NextResponse.json({ stats }, {
                headers: { 'Cache-Control': 'no-store, max-age=0' }
            });
        }

        return NextResponse.json({ docs }, {
            headers: {
                'Cache-Control': 'no-store, max-age=0'
            }
        });

    } catch (error: any) {
        console.error("Error fetching knowledge docs:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }
        console.log("API: Received knowledge request");
        const body = await req.json();

        // Handle Bulk Import
        if (body.action === 'bulk_import' && Array.isArray(body.items)) {
            console.log(`API: Processing bulk import of ${body.items.length} items`);
            const results = [];
            const index = pinecone.index("chatbot-knowledge");

            for (const item of body.items) {
                try {
                    const { title, content, type, chatbotId } = item;
                    if (!content || !chatbotId) continue;

                    // Create doc in Firestore
                    const docRef = adminDb.collection("knowledge_docs").doc();
                    const docId = docRef.id;

                    const embeddingResponse = await openai.embeddings.create({
                        model: "text-embedding-3-small",
                        input: content.substring(0, 8000),
                    });
                    const embedding = embeddingResponse.data[0].embedding;

                    await index.upsert([{
                        id: `${chatbotId}-${docId}`,
                        values: embedding,
                        metadata: {
                            chatbotId,
                            docId,
                            title: title || 'Untitled',
                            source: 'import',
                            chunkIndex: 0,
                            text: content.substring(0, 1000),
                        }
                    }]);

                    await docRef.set({
                        chatbotId,
                        title: title || 'Untitled',
                        content,
                        fullContent: content,
                        type: type || 'text',
                        source: 'import',
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        status: 'indexed'
                    });
                    results.push({ success: true, id: docId });
                } catch (err) {
                    console.error("Bulk import item error:", err);
                    results.push({ success: false, error: err });
                }
            }
            return NextResponse.json({ success: true, results });
        }

        const { text, chatbotId, docId, type, url, fileBase64, fileName, title: providedTitle } = body;
        console.log("API: Parsed body", { chatbotId, docId, type, fileName, providedTitle, hasFile: !!fileBase64 });

        if (!chatbotId) {
            return NextResponse.json({ error: "Missing chatbotId" }, { status: 400 });
        }

        // Enforce docId for consistency
        if (!docId) {
            return NextResponse.json({ error: "Missing docId" }, { status: 400 });
        }

        let contentToEmbed = text;
        // Use provided title first, then fileName, then default
        let title = providedTitle || fileName || "";
        let preview = "";

        // Handle URL Type
        if (type === 'url') {
            if (!url) return NextResponse.json({ error: "Missing URL" }, { status: 400 });

            try {
                // If text is already provided (from preview), use it. Otherwise scrape.
                if (!text) {
                    const response = await fetch(url);
                    const html = await response.text();
                    const $ = cheerio.load(html);

                    // Remove scripts, styles, etc.
                    $('script').remove();
                    $('style').remove();
                    $('nav').remove();
                    $('footer').remove();
                    $('header').remove();

                    title = $('title').text() || url;
                    // Get text content
                    contentToEmbed = $('body').text().replace(/\s+/g, ' ').trim();
                }

                preview = contentToEmbed.substring(0, 200) + "...";

                if (!contentToEmbed || contentToEmbed.length < 50) {
                    return NextResponse.json({ error: "Could not extract enough text from URL" }, { status: 400 });
                }

            } catch (e) {
                console.error("Scraping error:", e);
                return NextResponse.json({ error: "Failed to scrape URL" }, { status: 500 });
            }
        } else if (type === 'file') {
            console.log("API: Processing file upload");
            if (!fileBase64) return NextResponse.json({ error: "Missing file data" }, { status: 400 });

            try {
                const buffer = Buffer.from(fileBase64, 'base64');
                console.log("API: File buffer created, size:", buffer.length);

                if (fileName.endsWith('.pdf')) {
                    console.log("API: Parsing PDF...");

                    // Import directly from lib to avoid index.js side-effect (isDebugMode check)
                    const pdfParse = require('pdf-parse/lib/pdf-parse.js');

                    const data = await pdfParse(buffer);
                    console.log("API: PDF parsed, text length:", data.text.length);
                    contentToEmbed = data.text;
                } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    console.log("API: Parsing Excel...");
                    const workbook = xlsx.read(buffer, { type: 'buffer' });
                    let excelText = "";

                    workbook.SheetNames.forEach(sheetName => {
                        const sheet = workbook.Sheets[sheetName];
                        // Convert sheet to CSV to preserve some structure
                        const sheetCsv = xlsx.utils.sheet_to_csv(sheet);
                        excelText += `\n--- Sheet: ${sheetName} ---\n${sheetCsv}`;
                    });

                    console.log("API: Excel parsed, text length:", excelText.length);
                    contentToEmbed = excelText;
                } else if (fileName.endsWith('.docx')) {
                    console.log("API: Parsing Word...");
                    const result = await mammoth.extractRawText({ buffer: buffer });
                    console.log("API: Word parsed, text length:", result.value.length);
                    if (result.messages.length > 0) {
                        console.log("API: Mammoth messages:", result.messages);
                    }
                    contentToEmbed = result.value;
                } else {
                    // Assume text file
                    contentToEmbed = buffer.toString('utf-8');
                }

                // Clean up text
                contentToEmbed = contentToEmbed.replace(/\s+/g, ' ').trim();
                preview = contentToEmbed.substring(0, 200) + "...";

                if (!contentToEmbed || contentToEmbed.length < 20) {
                    return NextResponse.json({ error: "Could not extract text from file" }, { status: 400 });
                }

            } catch (e) {
                console.error("File parsing error:", e);
                return NextResponse.json({ error: "Failed to parse file: " + e }, { status: 500 });
            }
        } else {
            // Text Type
            if (!text) {
                return NextResponse.json({ error: "Missing text" }, { status: 400 });
            }
        }

        console.log("API: Generating embeddings...");

        // Simple chunking function
        function chunkText(text: string, chunkSize: number = 4000): string[] {
            const chunks = [];
            for (let i = 0; i < text.length; i += chunkSize) {
                chunks.push(text.slice(i, i + chunkSize));
            }
            return chunks;
        }

        const chunks = chunkText(contentToEmbed);
        console.log(`API: Split text into ${chunks.length} chunks`);

        // Process chunks in batches to avoid rate limits
        const vectors = [];

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: chunk,
                encoding_format: "float",
            });

            const embedding = embeddingResponse.data[0].embedding;
            // Use docId in the vector ID for easier debugging, but rely on metadata for deletion
            const chunkId = `${docId}-${i}`;

            vectors.push({
                id: chunkId,
                values: embedding,
                metadata: {
                    chatbotId,
                    docId, // CRITICAL: Store docId in metadata for deletion
                    text: chunk,
                    type: type || 'text',
                    source: url || fileName || 'manual',
                    title: `${title || 'Untitled'} (Part ${i + 1})`,
                    chunkIndex: i,
                    totalChunks: chunks.length
                },
            });
        }

        // 2. Save to Pinecone (batch upsert)
        const index = pinecone.index("chatbot-knowledge");

        // Upsert in batches of 10 to be safe
        const batchSize = 10;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);
            await index.upsert(batch);
        }

        console.log("API: Saved all chunks to Pinecone");

        // 3. Save Metadata to Firestore (Admin SDK) - Critical for persistence
        try {
            // Use serverTimestamp from admin SDK (it's actually Firestore.Timestamp or FieldValue)
            // We can just use new Date() for simplicity in Admin SDK usually, or FieldValue.
            const docData: any = {
                chatbotId,
                title: title || "Untitled",
                type: type || "text",
                content: preview || (contentToEmbed.substring(0, 200) + "..."),
                // Store full content for editing/reference, but strict limit?
                // Firestore limit is 1MB. If text is huge, maybe truncate?
                // Let's store it for now as client did.
                fullContent: contentToEmbed,
                source: url || fileName || 'manual',
                updatedAt: new Date()
            };

            // Only set createdAt if it doesn't exist (using merge)
            // Actually we can just set it if we fetch first, or use set with merge and dont touch createdAt if exists?
            // But we can't condition inside set easily without Preconditions.
            // Let's just set createdAt to now if we are creating. 
            // Since we use docId, we can check existence?
            // For simplicity, let's just write. The client was writing createdAt every time on add.
            docData.createdAt = new Date(); // Admin SDK accepts Date objects

            await adminDb.collection("knowledge_docs").doc(docId).set(docData, { merge: true });
            console.log("API: Saved metadata to Firestore");
        } catch (fsError) {
            console.error("API: Failed to save to Firestore:", fsError);
            // Don't fail the request if embedding worked, but warn? 
            // Actually this IS the persistence fix, so we should arguably fail or retry.
            // But yielding error will show "Failed" to user.
            throw fsError;
        }

        return NextResponse.json({ success: true, title, preview, vectorId: vectors?.[0]?.id, chunkCount: chunks.length });

    } catch (error) {
        console.error("Ingestion error:", error);
        return NextResponse.json({ error: "Internal Server Error: " + error }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }
        const { searchParams } = new URL(req.url);
        const docId = searchParams.get("docId");
        const chatbotId = searchParams.get("chatbotId");

        if (!docId || !chatbotId) {
            return NextResponse.json({ error: "Missing docId or chatbotId" }, { status: 400 });
        }

        console.log(`API: Deleting doc ${docId} for chatbot ${chatbotId}`);

        const index = pinecone.index("chatbot-knowledge");

        // Delete by metadata filter
        await index.deleteMany({
            chatbotId: chatbotId,
            docId: docId
        });

        // Also delete from Firestore
        if (adminDb) {
            await adminDb.collection("knowledge_docs").doc(docId).delete();
        }

        console.log("API: Deleted vectors from Pinecone");

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Delete error:", error);
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}

// PUT - Edit existing knowledge document
export async function PUT(req: Request) {
    try {
        const adminDb = getAdminDb();
        if (!adminDb) {
            return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
        }

        const body = await req.json();
        const { docId, chatbotId, title, content } = body;

        if (!docId || !chatbotId) {
            return NextResponse.json({ error: "Missing docId or chatbotId" }, { status: 400 });
        }

        console.log(`API: Editing doc ${docId} for chatbot ${chatbotId}`);

        // Get existing document to check type
        const existingDoc = await adminDb.collection("knowledge_docs").doc(docId).get();
        if (!existingDoc.exists) {
            return NextResponse.json({ error: "Document not found" }, { status: 404 });
        }

        const existingData = existingDoc.data();
        const docType = existingData?.type || 'text';

        // For text/manual types, we can update content and re-embed
        if ((docType === 'text' || docType === 'manual') && content) {
            const index = pinecone.index("chatbot-knowledge");

            // Delete old vectors
            await index.deleteMany({
                chatbotId: chatbotId,
                docId: docId
            });

            // Create new embedding
            const embeddingResponse = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: content.substring(0, 8000),
            });
            const embedding = embeddingResponse.data[0].embedding;

            // Upsert new vector
            await index.upsert([{
                id: `${chatbotId}-${docId}`,
                values: embedding,
                metadata: {
                    chatbotId,
                    docId,
                    title: title || existingData?.title || 'Untitled',
                    source: 'manual',
                    chunkIndex: 0,
                    text: content.substring(0, 1000),
                }
            }]);

            // Update Firestore
            await adminDb.collection("knowledge_docs").doc(docId).update({
                title: title || existingData?.title,
                content: content,
                fullContent: content,
                updatedAt: new Date()
            });
        } else {
            // For URL/file types, only update title
            await adminDb.collection("knowledge_docs").doc(docId).update({
                title: title || existingData?.title,
                updatedAt: new Date()
            });
        }

        console.log("API: Document updated successfully");
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Edit error:", error);
        return NextResponse.json({ error: "Edit failed" }, { status: 500 });
    }
}

