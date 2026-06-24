/**
 * Central embedding configuration.
 *
 * All embedding calls (knowledge ingest, product sync, and query-time search)
 * MUST use the same model and dimension, because they read/write the same
 * Pinecone index ("chatbot-knowledge"). If these ever drift apart, search
 * silently breaks or Pinecone rejects writes with a dimension-mismatch error.
 *
 * The OpenAI `text-embedding-3-small` model defaults to 1536 dimensions but can
 * output a shorter vector via the `dimensions` parameter. We default to 1024 to
 * match the Pinecone index dimension. Override with EMBEDDING_DIMENSIONS in the
 * environment if the index is recreated at a different size.
 */
export const EMBEDDING_MODEL = "text-embedding-3-small";

export const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS) || 1024;
