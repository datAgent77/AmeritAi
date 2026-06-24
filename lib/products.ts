import { db } from "@/lib/firebase";
import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { EMBEDDING_MODEL, EMBEDDING_DIMENSIONS } from "@/lib/embedding-config";

export interface Product {
    id?: string;
    chatbotId: string;
    name: string;
    description: string;
    price: number;
    currency: string;
    imageUrl?: string;
    category?: string;
    inStock: boolean;
    url?: string; // Link to the product on the actual e-commerce site
    createdAt?: any;
    updatedAt?: any;
}

const COLLECTION_NAME = "products";

export async function getProducts(chatbotId: string): Promise<Product[]> {
    try {
        const q = query(collection(db, COLLECTION_NAME), where("chatbotId", "==", chatbotId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
    }
}

export async function getProduct(productId: string): Promise<Product | null> {
    try {
        const docRef = doc(db, COLLECTION_NAME, productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as Product;
        }
        return null;
    } catch (error) {
        console.error("Error fetching product:", error);
        throw error;
    }
}

import { OpenAI } from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

let openaiClient: OpenAI | null | undefined;
let pineconeClient: Pinecone | null | undefined;
let hasWarnedMissingOpenAIKey = false;
let hasWarnedMissingPineconeKey = false;

function getOpenAIClient(): OpenAI | null {
    if (openaiClient !== undefined) return openaiClient;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        if (!hasWarnedMissingOpenAIKey) {
            console.warn("[Products] OPENAI_API_KEY missing. Embedding sync is disabled.");
            hasWarnedMissingOpenAIKey = true;
        }
        openaiClient = null;
        return openaiClient;
    }

    openaiClient = new OpenAI({ apiKey });
    return openaiClient;
}

function getPineconeClient(): Pinecone | null {
    if (pineconeClient !== undefined) return pineconeClient;

    const apiKey = process.env.PINECONE_API_KEY;
    if (!apiKey) {
        if (!hasWarnedMissingPineconeKey) {
            console.warn("[Products] PINECONE_API_KEY missing. Embedding sync is disabled.");
            hasWarnedMissingPineconeKey = true;
        }
        pineconeClient = null;
        return pineconeClient;
    }

    pineconeClient = new Pinecone({ apiKey });
    return pineconeClient;
}

const INDEX_NAME = "chatbot-knowledge";

export async function indexProduct(product: Product) {
    try {
        const openai = getOpenAIClient();
        const pc = getPineconeClient();
        if (!openai || !pc) {
            return;
        }

        const textToEmbed = `Product Name: ${product.name}\nDescription: ${product.description}\nPrice: ${product.price} ${product.currency}\nCategory: ${product.category || 'Uncategorized'}`;

        const embeddingResponse = await openai.embeddings.create({
            model: EMBEDDING_MODEL,
            input: textToEmbed,
            dimensions: EMBEDDING_DIMENSIONS,
        });

        const embedding = embeddingResponse.data[0].embedding;
        const index = pc.index(INDEX_NAME);

        await index.upsert([
            {
                id: `product-${product.id}`,
                values: embedding,
                metadata: {
                    chatbotId: product.chatbotId,
                    type: "product",
                    productId: product.id || "",
                    text: textToEmbed,
                    name: product.name,
                    price: product.price,
                    currency: product.currency,
                    url: product.url || ""
                }
            }
        ]);
        console.log(`Product ${product.id} indexed successfully.`);
    } catch (error) {
        console.error("Error indexing product:", error);
        // Don't throw error here to avoid blocking the UI if indexing fails, but log it.
    }
}

export async function createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...product,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        // Index the new product
        await indexProduct({ id: docRef.id, ...product } as Product);

        return docRef.id;
    } catch (error) {
        console.error("Error creating product:", error);
        throw error;
    }
}

export async function updateProduct(productId: string, updates: Partial<Product>): Promise<void> {
    try {
        const docRef = doc(db, COLLECTION_NAME, productId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp()
        });

        // Re-index if relevant fields changed
        if (updates.name || updates.description || updates.price || updates.category) {
            const updatedDoc = await getDoc(docRef);
            if (updatedDoc.exists()) {
                await indexProduct({ id: updatedDoc.id, ...updatedDoc.data() } as Product);
            }
        }
    } catch (error) {
        console.error("Error updating product:", error);
        throw error;
    }
}

export async function deleteProduct(productId: string): Promise<void> {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, productId));

        // Remove from Pinecone
        try {
            const pc = getPineconeClient();
            if (!pc) return;
            const index = pc.index(INDEX_NAME);
            await index.deleteOne(`product-${productId}`);
        } catch (pcError) {
            console.error("Error deleting product from Pinecone:", pcError);
        }

    } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
    }
}
