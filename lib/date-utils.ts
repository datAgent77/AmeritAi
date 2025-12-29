/**
 * Date utilities for parsing relative dates in Turkish and English
 */

// Day mappings
const TURKISH_DAYS: Record<string, number> = {
    'pazartesi': 1,
    'salı': 2,
    'çarşamba': 3,
    'perşembe': 4,
    'cuma': 5,
    'cumartesi': 6,
    'pazar': 0
};

const ENGLISH_DAYS: Record<string, number> = {
    'monday': 1,
    'tuesday': 2,
    'wednesday': 3,
    'thursday': 4,
    'friday': 5,
    'saturday': 6,
    'sunday': 0
};

// Month mappings
const TURKISH_MONTHS: Record<string, number> = {
    'ocak': 0, 'şubat': 1, 'mart': 2, 'nisan': 3,
    'mayıs': 4, 'haziran': 5, 'temmuz': 6, 'ağustos': 7,
    'eylül': 8, 'ekim': 9, 'kasım': 10, 'aralık': 11
};

/**
 * Parse relative date expressions to actual date strings
 * Examples: "bu perşembe", "önümüzdeki cuma", "next monday", "this saturday"
 */
export function parseRelativeDate(text: string): string {
    const normalizedText = text.toLowerCase().trim();
    const today = new Date();
    const currentDay = today.getDay();

    // Check for "bugün" / "today"
    if (normalizedText.includes('bugün') || normalizedText.includes('today')) {
        return formatDateISO(today);
    }

    // Check for "yarın" / "tomorrow"  
    if (normalizedText.includes('yarın') || normalizedText.includes('tomorrow')) {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        return formatDateISO(tomorrow);
    }

    // Check for "bu hafta" patterns - "bu perşembe", "this thursday"
    const isThisWeek = normalizedText.includes('bu ') || normalizedText.includes('this ');

    // Check for "önümüzdeki" / "gelecek" / "next" patterns
    const isNextWeek = normalizedText.includes('önümüzdeki') ||
        normalizedText.includes('gelecek') ||
        normalizedText.includes('next ') ||
        normalizedText.includes('haftaya');

    // Find day name in text
    let targetDayNum: number | null = null;

    for (const [dayName, dayNum] of Object.entries(TURKISH_DAYS)) {
        if (normalizedText.includes(dayName)) {
            targetDayNum = dayNum;
            break;
        }
    }

    if (targetDayNum === null) {
        for (const [dayName, dayNum] of Object.entries(ENGLISH_DAYS)) {
            if (normalizedText.includes(dayName)) {
                targetDayNum = dayNum;
                break;
            }
        }
    }

    if (targetDayNum !== null) {
        let daysToAdd = targetDayNum - currentDay;

        if (isNextWeek) {
            // Always go to next week
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            } else {
                daysToAdd += 7;
            }
        } else if (isThisWeek) {
            // This week - if day has passed, still use this week (could be in the past)
            if (daysToAdd < 0) {
                daysToAdd += 7; // Actually move to next occurrence
            }
        } else {
            // No qualifier - assume next occurrence
            if (daysToAdd <= 0) {
                daysToAdd += 7;
            }
        }

        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        return formatDateISO(targetDate);
    }

    // Check for DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
    const dateMatch = normalizedText.match(/(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{2,4})/);
    if (dateMatch) {
        const day = parseInt(dateMatch[1]);
        const month = parseInt(dateMatch[2]) - 1; // JS months are 0-indexed
        let year = parseInt(dateMatch[3]);
        if (year < 100) year += 2000;

        const parsedDate = new Date(year, month, day);
        if (!isNaN(parsedDate.getTime())) {
            return formatDateISO(parsedDate);
        }
    }

    // Check for "15 ocak", "20 şubat" patterns
    const turkishDateMatch = normalizedText.match(/(\d{1,2})\s+(ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık)/i);
    if (turkishDateMatch) {
        const day = parseInt(turkishDateMatch[1]);
        const month = TURKISH_MONTHS[turkishDateMatch[2].toLowerCase()];
        const year = today.getFullYear();

        const parsedDate = new Date(year, month, day);
        // If date is in the past, assume next year
        if (parsedDate < today) {
            parsedDate.setFullYear(year + 1);
        }
        return formatDateISO(parsedDate);
    }

    // Could not parse - return today as fallback
    return formatDateISO(today);
}

/**
 * Format date as ISO date string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Get day name in Turkish
 */
export function getDayNameTR(dayNum: number): string {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[dayNum];
}

/**
 * Check if a date is a working day based on settings
 */
export function isWorkingDay(date: Date, workingDays: string[]): boolean {
    const dayMap: Record<number, string> = {
        0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat'
    };
    const dayCode = dayMap[date.getDay()];
    return workingDays.includes(dayCode);
}

/**
 * Parse time string to hours and minutes
 */
export function parseTime(timeStr: string): { hours: number, minutes: number } | null {
    const match = timeStr.match(/(\d{1,2})[:\.](\d{2})/);
    if (match) {
        return {
            hours: parseInt(match[1]),
            minutes: parseInt(match[2])
        };
    }
    return null;
}

/**
 * Check if time is within working hours
 */
export function isWithinWorkingHours(
    time: string,
    workingHoursStart: string,
    workingHoursEnd: string
): boolean {
    const timeObj = parseTime(time);
    const startObj = parseTime(workingHoursStart);
    const endObj = parseTime(workingHoursEnd);

    if (!timeObj || !startObj || !endObj) return true; // Can't validate

    const timeMinutes = timeObj.hours * 60 + timeObj.minutes;
    const startMinutes = startObj.hours * 60 + startObj.minutes;
    const endMinutes = endObj.hours * 60 + endObj.minutes;

    return timeMinutes >= startMinutes && timeMinutes < endMinutes;
}

/**
 * Get next available working day
 */
export function getNextAvailableDay(fromDate: Date, workingDays: string[]): Date {
    const result = new Date(fromDate);
    let attempts = 0;

    while (!isWorkingDay(result, workingDays) && attempts < 14) {
        result.setDate(result.getDate() + 1);
        attempts++;
    }

    return result;
}
