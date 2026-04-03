import { describe, expect, test } from "vitest";

import {
    detectConversationLanguage,
    normalizeConversationLanguage,
    resolveConversationLanguage,
    toCopyLanguage,
} from "./conversation-language";

describe("conversation-language", () => {
    test("prefers the latest user text over an explicit Turkish UI language", () => {
        expect(resolveConversationLanguage({
            explicitLanguage: "tr",
            userText: "How much is this product?",
        })).toBe("en");
    });

    test("detects Turkish from content", () => {
        expect(resolveConversationLanguage({
            explicitLanguage: "en",
            userText: "Merhaba, fiyat nedir?",
        })).toBe("tr");
    });

    test("detects intent-style English without relying on browser language", () => {
        expect(resolveConversationLanguage({
            explicitLanguage: "tr",
            userText: "I want to buy this and need shipping info",
        })).toBe("en");
    });

    test("falls back to explicit language when text is ambiguous", () => {
        expect(resolveConversationLanguage({
            explicitLanguage: "tr",
            userText: "ok",
        })).toBe("tr");
    });

    test("normalizes locale tags", () => {
        expect(normalizeConversationLanguage("en-US")).toBe("en");
        expect(normalizeConversationLanguage("tr-TR")).toBe("tr");
        expect(normalizeConversationLanguage("pt-BR")).toBe("pt");
        expect(normalizeConversationLanguage("it_IT")).toBe("it");
        expect(normalizeConversationLanguage("auto")).toBeNull();
    });

    test("detects other supported languages used by copy fallbacks", () => {
        expect(detectConversationLanguage("Wie viel kostet das Produkt?")).toBe("de");
        expect(detectConversationLanguage("Bonjour, quel est le prix ?")).toBe("fr");
        expect(detectConversationLanguage("Hola, cuanto cuesta este producto?")).toBe("es");
    });

    test("preserves broader browser locales when user text is ambiguous", () => {
        expect(resolveConversationLanguage({
            explicitLanguage: "pt-BR",
            userText: "ok",
        })).toBe("pt");

        expect(resolveConversationLanguage({
            explicitLanguage: "it-IT",
            userText: "ok",
        })).toBe("it");
    });

    test("detects non-latin scripts for broader automatic language support", () => {
        expect(detectConversationLanguage("こんにちは、価格はいくらですか？")).toBe("ja");
        expect(detectConversationLanguage("안녕하세요 가격이 얼마인가요?")).toBe("ko");
        expect(detectConversationLanguage("我想了解价格")).toBe("zh");
        expect(detectConversationLanguage("Привет, сколько стоит?")).toBe("ru");
    });
    test("maps unsupported copy languages back to English copy", () => {
        expect(toCopyLanguage("ru")).toBe("en");
        expect(toCopyLanguage("ar")).toBe("en");
        expect(toCopyLanguage("de")).toBe("de");
    });
});
