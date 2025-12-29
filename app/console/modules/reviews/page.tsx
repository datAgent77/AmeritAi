"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Star, MessageCircle, MapPin, Loader2, RefreshCw, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function ReviewManagementPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [isSyncing, setIsSyncing] = useState(false)

    // Mock Reviews
    const [reviews, setReviews] = useState([
        { id: 1, source: 'Google', author: 'John Doe', rating: 5, comment: "Best steak in town! The atmosphere was amazing.", date: "2 days ago", replied: true },
        { id: 2, source: 'Yelp', author: 'Sarah Smith', rating: 3, comment: "Food was good but service was slow.", date: "5 days ago", replied: false },
        { id: 3, source: 'Google', author: 'Mike Johnson', rating: 5, comment: "Loved the new dessert menu.", date: "1 week ago", replied: true },
    ])

    const handleSync = () => {
        setIsSyncing(true)
        setTimeout(() => {
            setIsSyncing(false)
            toast({
                title: "Synced",
                description: "Latest reviews fetched from Google & Yelp."
            })
        }, 1500)
    }

    const handleAutoReply = (id: number) => {
        toast({
            title: "AI Draft Generated",
            description: "Reply draft created for review #" + id
        })
    }

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Star className="h-8 w-8 text-yellow-500" />
                            {t('modules.reviewManagement') || "Review Management"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.reviewManagementDesc') || "Monitor and reply to customer reviews from Google & Yelp"}
                        </p>
                    </div>
                </div>
                <Button onClick={handleSync} variant="outline" disabled={isSyncing}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                    {t('syncReviews') || "Sync Reviews"}
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold flex items-center gap-2">
                            4.8 <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">+0.2 from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">1,284</div>
                        <p className="text-xs text-muted-foreground mt-1">12 new this week</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Response Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">94%</div>
                        <p className="text-xs text-muted-foreground mt-1">AI Auto-Reply Active</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="reviews" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="reviews">Latest Reviews</TabsTrigger>
                    <TabsTrigger value="settings">Connection Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="reviews" className="space-y-4">
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <Card key={review.id} className="p-6">
                                <div className="flex flex-col md:flex-row gap-4 justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className={review.source === 'Google' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}>
                                                {review.source}
                                            </Badge>
                                            <span className="font-semibold">{review.author}</span>
                                            <span className="text-muted-foreground text-sm">• {review.date}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                                            ))}
                                        </div>
                                        <p className="text-sm">{review.comment}</p>
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-[200px]">
                                        {review.replied ? (
                                            <Button variant="secondary" size="sm" disabled className="justify-start">
                                                <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                                Replied
                                            </Button>
                                        ) : (
                                            <Button size="sm" onClick={() => handleAutoReply(review.id)}>
                                                <MessageCircle className="mr-2 h-4 w-4" />
                                                Generate AI Reply
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4 max-w-2xl">
                    <Card>
                        <CardHeader>
                            <CardTitle>Platform Connections</CardTitle>
                            <CardDescription>Connect sources to fetch reviews from</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between border p-4 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <MapPin className="h-6 w-6 text-blue-500" />
                                    <div>
                                        <div className="font-medium">Google Maps</div>
                                        <div className="text-sm text-green-600">Connected</div>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm">Configure</Button>
                            </div>
                            <div className="flex items-center justify-between border p-4 rounded-lg">
                                <div className="flex items-center gap-4">
                                    <Star className="h-6 w-6 text-red-500" />
                                    <div>
                                        <div className="font-medium">Yelp</div>
                                        <div className="text-sm text-muted-foreground">Not Connected</div>
                                    </div>
                                </div>
                                <Button size="sm">Connect</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}

function Badge({ children, variant, className }: any) {
    return (
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${className}`}>
            {children}
        </span>
    )
}
