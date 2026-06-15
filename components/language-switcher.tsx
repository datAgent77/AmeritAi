"use client"

import * as React from "react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useLanguage } from "@/context/LanguageContext"
import { Globe } from "lucide-react"

const languages = [
    { value: "en", label: "English" },
    { value: "es", label: "Español" },
    { value: "tr", label: "Türkçe" },
]

export function LanguageSwitcher() {
    const { language, setLanguage } = useLanguage()

    return (
        <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
            <SelectTrigger className="w-[140px] rounded-full">
                <Globe className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
                {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
