
"use client"

import { useState, useEffect } from "react"
import { ChatbotLoader } from "@/components/chatbot-loader"
import { Loader2, Utensils, Clock, Info } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface MenuItem {
    id: string
    name: string
    description: string
    price: number
    currency: string
    category: string
    imageUrl: string
}

export default function PublicMenuPage({ params }: { params: { tenantId: string } }) {
    const { tenantId } = params
    const [items, setItems] = useState<MenuItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeCategory, setActiveCategory] = useState("All")
    const [error, setError] = useState(false)

    useEffect(() => {
        const fetchMenu = async () => {
            try {
                const res = await fetch(`/api/public/menu/${tenantId}`)
                if (!res.ok) throw new Error("Failed to load menu")
                const data = await res.json()
                setItems(data.items || [])
            } catch (err) {
                console.error(err)
                setError(true)
            } finally {
                setIsLoading(false)
            }
        }
        fetchMenu()
    }, [tenantId])

    const categories = ["All", ...Array.from(new Set(items.map(i => i.category || "General")))]

    const filteredItems = activeCategory === "All"
        ? items
        : items.filter(i => (i.category || "General") === activeCategory)

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50">
            <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
    }

    if (error) {
        return <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 text-center">
            <div>
                <Info className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h1 className="text-xl font-semibold mb-2">Menu Not Available</h1>
                <p className="text-muted-foreground">We couldn't load the restaurant menu. Please try again later.</p>
            </div>
        </div>
    }

    return (
        <div className="min-h-screen bg-zinc-50 pb-24">
            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
                <div className="container max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="bg-black text-white p-2 rounded-lg">
                            <Utensils className="h-4 w-4" />
                        </div>
                        <h1 className="font-bold text-lg">Digital Menu</h1>
                    </div>
                </div>

                {/* Category Scroller */}
                <div className="overflow-x-auto pb-0 px-4 scrollbar-hide">
                    <div className="flex gap-2 py-3 w-max">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${activeCategory === cat
                                        ? "bg-black text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Menu Grid */}
            <main className="container max-w-md mx-auto px-4 py-6 space-y-4">
                {filteredItems.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        No items found in this category.
                    </div>
                ) : (
                    filteredItems.map(item => (
                        <div key={item.id} className="bg-white rounded-xl p-3 shadow-sm flex gap-4 border border-zinc-100/50">
                            {/* Image */}
                            <div className="w-24 h-24 flex-shrink-0 bg-zinc-100 rounded-lg overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                        <Utensils className="h-8 w-8" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-semibold text-gray-900 line-clamp-1">{item.name}</h3>
                                        <span className="font-bold text-sm bg-zinc-50 px-2 py-0.5 rounded text-zinc-900 ml-2 whitespace-nowrap">
                                            {item.price} {item.currency}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{item.description}</p>
                                </div>
                                <div className="mt-2 flex items-center justify-between">
                                    {item.category && (
                                        <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                                            {item.category}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </main>

            {/* Digital Waiter Loader */}
            <ChatbotLoader chatbotId={tenantId} />
        </div>
    )
}
