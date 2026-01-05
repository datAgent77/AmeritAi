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
        /bilgileriniz.*alın/i,
        /iletişim.*kayd/i,
        /sizinle.*iletişime.*geçeceğ/i,
        /temsilci.*iletişime/i,
        /bilgilerinizi.*aldık/i,
        /kayd.*alınmıştır/i,
        /teşekkür.*bilgiler/i,
        /en kısa sürede.*iletişime/i,
        // English patterns
        /contact.*details.*received/i,
        /information.*recorded/i,
        /we.*will.*contact/i,
        /representative.*will.*reach/i,
        /thank.*for.*your.*information/i,
        /details.*have.*been.*saved/i,
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
 */
function extractName(userMessages: string[]): string {
    const combinedText = userMessages.join(' ');

    // Strategy 1: Look for explicit name statements
    const explicitPatterns = [
        /(?:adım|ismim|ben)\s+([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)/i,
        /(?:my name is|i am|i'm)\s+([a-zA-Z]+(?:\s+[a-zA-Z]+)?)/i,
    ];

    for (const pattern of explicitPatterns) {
        const match = combinedText.match(pattern);
        if (match && match[1]) {
            return formatName(match[1]);
        }
    }

    // Strategy 2: Look for name followed by contact info
    // Pattern: "Name Surname, phone" or "Name Surname email@..."
    for (const msg of userMessages) {
        const trimmed = msg.trim();

        // Skip if it looks like just a question or command
        if (trimmed.length < 3 || trimmed.length > 100) continue;
        if (/^(evet|hayır|tamam|ok|merhaba|selam|hello|hi)\s*$/i.test(trimmed)) continue;

        // Check for: "Name Surname, phone_number"
        const nameWithPhoneMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s*[,\s]+(\+?[\d\s\-]+)$/i);
        if (nameWithPhoneMatch && nameWithPhoneMatch[1].length > 2) {
            return formatName(nameWithPhoneMatch[1]);
        }

        // Check for: "Name Surname email@..."
        const nameWithEmailMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+)?)\s+[a-zA-Z0-9._-]+@/i);
        if (nameWithEmailMatch) {
            return formatName(nameWithEmailMatch[1]);
        }

        // Check for: "Company Name Surname, phone" (3 word pattern)
        const companyNamePhoneMatch = trimmed.match(/^([a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+){1,3})\s*[,\s]+(\+?[\d\s\-]+)$/i);
        if (companyNamePhoneMatch) {
            const words = companyNamePhoneMatch[1].split(/\s+/);
            if (words.length >= 2) {
                // Try to separate company from name (common patterns)
                const companyKeywords = ['firması', 'şirketi', 'ltd', 'a.ş', 'inc', 'company', 'corp'];
                const hasCompanyWord = words.some(w => companyKeywords.some(k => w.toLowerCase().includes(k)));

                if (hasCompanyWord) {
                    // First word is likely company, rest is name
                    const name = words.slice(1).join(' ');
                    if (name.length > 2) return formatName(name);
                } else if (words.length >= 2) {
                    // Assume last 2 words are name
                    return formatName(words.slice(-2).join(' '));
                }
            }
        }

        // Check for simple name (2-3 words, no numbers)
        if (/^[a-zA-ZğüşöçıİĞÜŞÖÇ]+(?:\s+[a-zA-ZğüşöçıİĞÜŞÖÇ]+){0,2}$/i.test(trimmed) && !containsNonNameContent(trimmed)) {
            return formatName(trimmed);
        }
    }

    return "";
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
