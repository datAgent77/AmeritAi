/**
 * Appointment Data Extractor
 * Clean, reliable extraction of appointment data from chat conversations
 */

import { parseRelativeDate } from "./date-utils";

export interface ExtractedAppointmentData {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    date: string;
    time: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Check if AI response confirms an appointment was made
 */
export function isAppointmentConfirmation(aiResponse: string): boolean {
    const patterns = [
        // Turkish patterns
        /randevu.*oluştur/i,
        /randevu.*ayarla/i,
        /randevu.*planla/i,
        /randevu.*kaydet/i,
        /randevu.*alındı/i,
        /randevu.*onaylan/i,
        /randevu.*kesinleş/i,
        // English patterns
        /appointment.*schedul/i,
        /appointment.*confirm/i,
        /appointment.*book/i,
        /appointment.*creat/i,
    ];

    return patterns.some(p => p.test(aiResponse));
}

/**
 * Extract all appointment data from conversation
 * CRITICAL: Only extracts from USER messages to avoid AI-generated fake data
 */
export function extractAppointmentData(
    messages: ChatMessage[],
    aiConfirmationMessage: string
): ExtractedAppointmentData {

    // Separate user messages - THIS IS CRITICAL
    const userMessagesOnly = messages
        .filter(m => m.role === 'user')
        .map(m => m.content);

    const userText = userMessagesOnly.join(' ');
    const allText = messages.map(m => m.content).join(' ') + ' ' + aiConfirmationMessage;

    console.log('[Extractor] User messages:', userText);
    console.log('[Extractor] AI confirmation:', aiConfirmationMessage.substring(0, 100));

    // ========================================
    // 1. EXTRACT NAME
    // ========================================
    let customerName = extractName(userMessagesOnly, aiConfirmationMessage);

    // ========================================
    // 2. EXTRACT EMAIL (only from user messages!)
    // ========================================
    const customerEmail = extractEmail(userText);

    // ========================================
    // 3. EXTRACT PHONE (only from user messages!)
    // ========================================
    const customerPhone = extractPhone(userText);

    // ========================================
    // 4. EXTRACT DATE
    // ========================================
    const date = extractDate(allText);

    // ========================================
    // 5. EXTRACT TIME
    // ========================================
    const time = extractTime(allText);

    const result = {
        customerName,
        customerEmail,
        customerPhone,
        date,
        time
    };

    console.log('[Extractor] Final extracted data:', result);

    return result;
}

/**
 * Extract customer name from user messages
 */
function extractName(userMessages: string[], aiConfirmation: string): string {
    const userText = userMessages.join(' ');

    // Strategy 1: Look for the FIRST user message that looks like a name
    // (Usually users provide their name first in the conversation)
    for (const msg of userMessages) {
        const trimmed = msg.trim();

        // Skip if it's too short or too long
        if (trimmed.length < 3 || trimmed.length > 50) continue;

        // Skip if it contains typical non-name content
        if (containsNonNameContent(trimmed)) continue;

        // Check if message looks like a name (just words, possibly with space)
        const nameMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)$/i);
        if (nameMatch) {
            return formatName(nameMatch[1]);
        }

        // Check if message starts with a name followed by email
        const nameEmailMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s+[a-zA-Z0-9._-]+@/i);
        if (nameEmailMatch) {
            return formatName(nameEmailMatch[1]);
        }

        // Check if message starts with a name followed by phone
        const namePhoneMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s+[\d\s\-+]+$/i);
        if (namePhoneMatch && namePhoneMatch[1].length > 2) {
            return formatName(namePhoneMatch[1]);
        }
    }

    // Strategy 2: Check AI confirmation for "Sayın X" pattern
    const sayinMatch = aiConfirmation.match(/Sayın\s+([A-ZğüşöçıİĞÜŞÖÇ][a-zğüşöçıİĞÜŞÖÇ]+(?:\s+[A-ZğüşöçıİĞÜŞÖÇ][a-zğüşöçıİĞÜŞÖÇ]+)?)/i);
    if (sayinMatch) {
        return formatName(sayinMatch[1]);
    }

    // Strategy 3: Look for explicit name statements
    const explicitPatterns = [
        /(?:adım|ismim|ben)\s+([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)/i,
        /(?:my name is|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i
    ];

    for (const pattern of explicitPatterns) {
        const match = userText.match(pattern);
        if (match && match[1]) {
            return formatName(match[1]);
        }
    }

    return "Müşteri";
}

/**
 * Check if text contains non-name content (dates, times, emails, etc.)
 */
function containsNonNameContent(text: string): boolean {
    const nonNamePatterns = [
        /@/, // email
        /\d{2}:\d{2}/, // time
        /\d{4}/, // year or long number
        /pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar/i, // days
        /ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık/i, // months
        /randevu|merhaba|evet|hayır|tamam|ok|teşekkür/i, // common words
        /saat|gün|hafta|ay/i, // time words
        /haftaya|yarın|bugün/i // relative dates
    ];

    return nonNamePatterns.some(p => p.test(text));
}

/**
 * Format name with proper capitalization
 */
function formatName(name: string): string {
    return name
        .trim()
        .replace(/\s+(bey|hanım|mr|ms|mrs)\.?$/i, '') // Remove titles
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Extract email from user text only
 */
function extractEmail(userText: string): string {
    const matches = userText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/g);
    if (matches && matches.length > 0) {
        // Return the last email (in case user corrected themselves)
        return matches[matches.length - 1];
    }
    return "";
}

/**
 * Extract phone from user text only
 */
function extractPhone(userText: string): string {
    // Turkish phone patterns
    const patterns = [
        /(?:\+90|0)?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, // Mobile
        /(?:\+90|0)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,  // General
    ];

    for (const pattern of patterns) {
        const matches = userText.match(pattern);
        if (matches && matches.length > 0) {
            // Return the last phone, cleaned up
            return matches[matches.length - 1].replace(/[\s\-]/g, '');
        }
    }
    return "";
}

/**
 * Extract date from conversation
 */
function extractDate(allText: string): string {
    const datePatterns = [
        /(?:haftaya|önümüzdeki|gelecek|bu)\s*(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)/i,
        /(pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar)/i,
        /yarın|bugün/i,
        /(\d{1,2})[\/.]\s*(\d{1,2})[\/.]\s*(\d{2,4})/,
        /(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i
    ];

    for (const pattern of datePatterns) {
        const match = allText.match(pattern);
        if (match) {
            return parseRelativeDate(match[0]);
        }
    }

    // Default to tomorrow if no date found
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

/**
 * Extract time from conversation
 */
function extractTime(allText: string): string {
    // Look for explicit time patterns
    const timePatterns = [
        /saat\s*(\d{1,2})[:.]?(\d{2})?/i,
        /(\d{1,2})[:.](\d{2})/,
        /(\d{1,2})\s*(?:da|de|te|ta)\b/i // "10 da", "3 te"
    ];

    for (const pattern of timePatterns) {
        const match = allText.match(pattern);
        if (match) {
            const hour = match[1].padStart(2, '0');
            const minute = match[2] ? match[2].padStart(2, '0') : '00';
            return `${hour}:${minute}`;
        }
    }

    return "10:00"; // Default time
}
