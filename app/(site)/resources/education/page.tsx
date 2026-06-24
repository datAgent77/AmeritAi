
"use client"

import { useEffect, useState } from "react"
import { PublicHeader } from "@/components/public-header"
import { PublicFooter } from "@/components/public-footer"
import { useLanguage } from "@/context/LanguageContext"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlayCircle, FileText, ArrowRight } from "lucide-react"

interface EducationResource {
    id: string;
    title: { en: string; tr: string };
    description: { en: string; tr: string };
    type: 'video' | 'article' | 'guide';
    url: string;
    duration?: string;
    thumbnailUrl?: string;
    category?: string;
}

export default function EducationPage() {
    const { t, language } = useLanguage()
    const [resources, setResources] = useState<EducationResource[]>([])

    useEffect(() => {
        fetch('/api/cms/education')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setResources(data)
            })
            .catch(err => console.error(err))
    }, [])

    return (
        <div className="min-h-screen bg-black text-white font-sans">
            <PublicHeader />

            <section className="pt-32 pb-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-green-900/10 to-black pointer-events-none" />
                <div className="container mx-auto px-4 relative z-10 max-w-4xl text-center mb-16">
                    <Badge variant="outline" className="mb-6 border-green-500/30 text-green-300">
                        {language === 'tr' ? 'Akademi' : 'Academy'}
                    </Badge>
                    <h1 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                        {language === 'tr' ? 'AmeritAI ile Öğrenin' : 'Learn with AmeritAI'}
                    </h1>
                    <p className="text-xl text-zinc-400">
                        {language === 'tr'
                            ? 'AI asistanınızı en verimli şekilde kullanmak için rehberler ve eğitimler.'
                            : 'Guides and tutorials to get the most out of your AI assistant.'}
                    </p>
                </div>

                <div className="container mx-auto px-4">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {resources.map((resource) => (
                            <Card key={resource.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all">
                                <CardHeader>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`p-3 rounded-lg ${resource.type === 'video' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {resource.type === 'video' ? <PlayCircle className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                        </div>
                                        {resource.duration && (
                                            <span className="text-xs text-zinc-500 font-mono bg-black/30 px-2 py-1 rounded">
                                                {resource.duration}
                                            </span>
                                        )}
                                    </div>
                                    <CardTitle className="text-xl text-white">
                                        {resource.title[language as 'en' | 'tr']}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-zinc-400 mb-6 text-sm h-10 line-clamp-2">
                                        {resource.description[language as 'en' | 'tr']}
                                    </p>
                                    <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
                                        {language === 'tr' ? 'İncele' : 'View Resource'} <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            <PublicFooter />
        </div>
    )
}
