"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { translations, Language } from '@/lib/translations';

type LanguageContextType = {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const missingTranslationKeys = new Set<string>();
const LANGUAGE_COOKIE_NAME = 'language';
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function isSupportedLanguage(value: string | null | undefined): value is Language {
    return value === 'en' || value === 'tr';
}

function getCookieLanguage(): Language | null {
    if (typeof document === 'undefined') return null;

    const cookieValue = document.cookie
        .split('; ')
        .find((cookie) => cookie.startsWith(`${LANGUAGE_COOKIE_NAME}=`))
        ?.split('=')[1];

    if (!cookieValue) return null;
    return isSupportedLanguage(cookieValue) ? cookieValue : null;
}

function setLanguageCookie(language: Language) {
    if (typeof document === 'undefined') return;
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${language}; path=/; max-age=${LANGUAGE_COOKIE_MAX_AGE}; samesite=lax`;
}

function humanizeTranslationKey(key: string): string {
    const readable = key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();

    if (!readable) return key;
    return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function LanguageProvider({
    children,
    initialLanguage = 'en'
}: {
    children: React.ReactNode;
    initialLanguage?: Language;
}) {
    const [language, setLanguage] = useState<Language>(initialLanguage);

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language');
        if (isSupportedLanguage(savedLanguage)) {
            setLanguage(savedLanguage);
            setLanguageCookie(savedLanguage);
            return;
        }

        const cookieLanguage = getCookieLanguage();
        if (cookieLanguage) {
            setLanguage(cookieLanguage);
            localStorage.setItem('language', cookieLanguage);
            return;
        }

        localStorage.setItem('language', initialLanguage);
        setLanguageCookie(initialLanguage);
    }, [initialLanguage]);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
        setLanguageCookie(lang);
    };

    const t = (key: string): string => {
        const trans = translations[language] as Record<string, string>;
        const enTrans = translations['en'] as Record<string, string>;
        const translated = trans[key] || enTrans[key];

        if (translated) return translated;

        if (process.env.NODE_ENV !== 'production' && !missingTranslationKeys.has(key)) {
            missingTranslationKeys.add(key);
            console.warn(`[i18n] Missing translation key: "${key}" (lang=${language})`);
        }

        // Never show raw keys like "moduleEnabled" directly to users.
        return humanizeTranslationKey(key);
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
