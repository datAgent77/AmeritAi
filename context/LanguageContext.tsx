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

function humanizeTranslationKey(key: string): string {
    const readable = key
        .replace(/[_-]+/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .trim();

    if (!readable) return key;
    return readable.charAt(0).toUpperCase() + readable.slice(1);
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>('en');

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage && savedLanguage in translations) {
            setLanguage(savedLanguage as Language);
        }
    }, []);

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
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
