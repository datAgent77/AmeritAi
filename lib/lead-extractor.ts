/**
 * Lead Data Extractor
 * Extracts contact information from chat conversations for lead collection
 */

export interface ExtractedLeadData {
    name: string;
    email: string;
    phone: string;
    company?: string;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

/**
 * Check if AI response confirms lead data was collected
 */
export function isLeadConfirmation(aiResponse: string): boolean {
    const patterns = [
        // Turkish patterns
        /bilgileriniz.*kaydet/i,
        /bilgiler.*kaydet/i,
        /bilgileriniz.*alın/i,
        /bilgi.*alın/i,
        /iletişim.*kayd/i,
        /sizinle.*iletişime.*geçeceğ/i,
        /temsilci.*iletişime/i,
        /bilgilerinizi.*aldık/i,
        /not.*edildi/i,
        /not.*aldım/i,
        /kayd.*alınmıştır/i,
        /kayd.*oluştur/i,
        /teşekkür.*bilgiler/i,
        /en kısa sürede.*iletişime/i,
        /iletişime.*geçilecektir/i,
        /ulaşacağız/i,
        /arayacağız/i,
        // English patterns
        /contact.*details.*received/i,
        /information.*recorded/i,
        /we.*will.*contact/i,
        /representative.*will.*reach/i,
        /thank.*for.*your.*information/i,
        /thank.*for.*info/i,
        /details.*have.*been.*saved/i,
        /noted.*information/i,
    ];

    return patterns.some(p => p.test(aiResponse));
}

/**
 * Extract lead data from conversation
 * Only extracts from USER messages to ensure authentic data
 */
export function extractLeadData(messages: ChatMessage[]): ExtractedLeadData {
    // Only process user messages to avoid AI-generated fake data
    const userMessagesOnly = messages
        .filter(m => m.role === 'user')
        .map(m => m.content);

    const userText = userMessagesOnly.join(' ');

    console.log('[Lead Extractor] Processing user messages:', userText.substring(0, 200));

    // Extract each field
    const name = extractName(userMessagesOnly);
    const email = extractEmail(userText);
    const phone = extractPhone(userText);
    const company = extractCompany(userMessagesOnly);

    const result = { name, email, phone, company };
    console.log('[Lead Extractor] Extracted data:', result);

    return result;
}

/**
 * Extract customer name from user messages
 * STRICT: Only accepts explicit name statements or name combined with contact info
 */
function extractName(userMessages: string[]): string {
    const combinedText = userMessages.join(' ');

    // Strategy 1: Look for EXPLICIT name statements (highest confidence)
    const explicitPatterns = [
        /(?:adım|ismim|ben)\s+([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)/i,
        /(?:my name is|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    ];

    for (const pattern of explicitPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1] && looksLikeName(match[1])) {
            return formatName(match[1]);
        }
    }

    // Strategy 2: Look for name ONLY when combined with valid contact info
    for (const msg of userMessages) {
        const trimmed = msg.trim();

        // Skip short or long messages
        if (trimmed.length < 5 || trimmed.length > 80) continue;

        // Check for: "Name Surname, phone_number" pattern
        const nameWithPhoneMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s*[,\s]+(\+?[\d\s\-]{8,})$/i);
        if (nameWithPhoneMatch && nameWithPhoneMatch[1] && looksLikeName(nameWithPhoneMatch[1])) {
            return formatName(nameWithPhoneMatch[1]);
        }

        // Check for: "Name Surname email@..." pattern
        const nameWithEmailMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s+[a-zA-Z0-9._-]+@/i);
        if (nameWithEmailMatch && looksLikeName(nameWithEmailMatch[1])) {
            return formatName(nameWithEmailMatch[1]);
        }
    }

    // DO NOT accept random standalone text as names anymore
    // This prevents garbage like "selam", "adfadf", "hangi sektör odaklısın" from being saved
    return "";
}

/**
 * Validate if text actually looks like a human name
 */
function looksLikeName(text: string): boolean {
    const cleaned = text.trim();
    
    // Minimum 3 characters
    if (cleaned.length < 3) return false;
    
    // Maximum 40 characters (names shouldn't be too long)
    if (cleaned.length > 40) return false;
    
    // Single word names must be between 3-15 chars
    if (!cleaned.includes(' ') && (cleaned.length < 3 || cleaned.length > 15)) return false;
    
    // Must start with a letter
    if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ]/i.test(cleaned)) return false;
    
    // Only letters and spaces allowed
    if (!/^[a-zA-ZğüşöçıİĞÜŞÖÇ\s]+$/.test(cleaned)) return false;
    
    // Blacklist of common non-name words
    const blacklist = [
        // Greetings
        'selam', 'merhaba', 'merhabalar', 'hello', 'hi', 'hey',
        // Responses
        'evet', 'hayır', 'tamam', 'ok', 'okay', 'yes', 'no',
        // Test/spam
        'test', 'deneme', 'adfadf', 'asdf', 'asdfasdf', 'xxx', 'aaa', 'bbb', 'abc', 'qwerty',
        // Common questions (Turkish)
        'nedir', 'nasıl', 'neden', 'nerede', 'hangi', 'yaparsın', 'yapıyor', 'yapabilir',
        // Common questions (English)
        'what', 'how', 'why', 'where', 'which', 'when', 'can', 'will', 'are', 'you', 'sure',
        // Brands/products
        'vion', 'chatbot', 'robot', 'yapay', 'zeka',
    ];
    
    const lowerText = cleaned.toLowerCase();
    if (blacklist.some(word => lowerText === word || lowerText.startsWith(word + ' ') || lowerText.endsWith(' ' + word))) {
        return false;
    }
    
    // Check for question patterns
    if (/^(ne |neler |nasıl |neden |nerede |kim |hangi |kaç |what |how |why |where |who |which |when |can |will |do |does |is |are )/i.test(cleaned)) {
        return false;
    }
    
    // Check for common chat phrases
    if (/profil|design|sektör|test|odaklı|yapabilir|performed|profiles|features/i.test(cleaned)) {
        return false;
    }
    
    return true;
}

/**
 * Check if text contains non-name content
 */
function containsNonNameContent(text: string): boolean {
    const nonNamePatterns = [
        /@/, // email
        /\d{2}:\d{2}/, // time
        /\d{4}/, // year or long number
        /pazartesi|salı|çarşamba|perşembe|cuma|cumartesi|pazar/i, // days
        /randevu|merhaba|evet|hayır|tamam|ok|teşekkür|demo|fiyat|bilgi/i, // common words
        /[?!.,;:]/g, // punctuation (names usually don't have these)
        /^(neler|ne|nasıl|neden|nerede|kim|hangi|kaç|ne zaman|vion|nedir|yaparsın|yapıyor|yapabilir)/i, // questions/phrases
        /^(what|how|why|where|who|which|when|can|will|do|does|is|are)/i, // English questions
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
 * Extract email from user text
 */
function extractEmail(userText: string): string {
    const matches = userText.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}/g);
    if (matches && matches.length > 0) {
        // Return the last email (in case user corrected themselves)
        return matches[matches.length - 1].toLowerCase();
    }
    return "";
}

/**
 * Extract phone from user text
 * Supports Turkish phone formats
 */
function extractPhone(userText: string): string {
    // Turkish phone patterns
    const patterns = [
        /(?:\+90|0)?[\s-]?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g, // Mobile 5XX XXX XX XX
        /(?:\+90|0)?[\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g,  // General
        /\d{10,11}/g, // Plain numbers
    ];

    for (const pattern of patterns) {
        const matches = userText.match(pattern);
        if (matches && matches.length > 0) {
            // Return the last phone, cleaned up
            let phone = matches[matches.length - 1].replace(/[\s\-]/g, '');

            // Normalize to international format if it's a Turkish mobile
            if (phone.startsWith('5') && phone.length === 10) {
                phone = '+90' + phone;
            } else if (phone.startsWith('05') && phone.length === 11) {
                phone = '+9' + phone;
            }

            return phone;
        }
    }
    return "";
}

/**
 * Extract company name from user messages
 */
function extractCompany(userMessages: string[]): string | undefined {
    const combinedText = userMessages.join(' ');

    // Look for company indicators
    const companyPatterns = [
        /(?:firma(?:m|sı)?|şirket(?:im)?|company)\s*[:\s]+([a-zA-ZğüşöçıİĞÜŞÖÇ0-9\s]+?)(?:\s*[,.]|$)/i,
        /([a-zA-ZğüşöçıİĞÜŞÖÇ0-9]+)\s+(?:firması|şirketi|ltd|a\.?ş\.?|inc)/i,
    ];

    for (const pattern of companyPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1] && match[1].length > 2) {
            return match[1].trim();
        }
    }

    // Check first words of messages that contain a comma (company, name pattern)
    for (const msg of userMessages) {
        const parts = msg.split(',');
        if (parts.length >= 2) {
            const firstPart = parts[0].trim();
            // If first part ends with firması or similar
            if (/firması|şirketi|ltd|a\.?ş\.?$/i.test(firstPart)) {
                return firstPart;
            }
            // If first part looks like a company name (single word or "X firması")
            if (/^[a-zA-ZğüşöçıİĞÜŞÖÇ0-9]+\s+(?:firması|şirketi)$/i.test(firstPart)) {
                return firstPart;
            }
        }
    }

    return undefined;
}
