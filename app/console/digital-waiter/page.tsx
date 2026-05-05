"use client"

import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WaiterRequestsList } from "@/components/modules/digital-waiter/waiter-requests-list"
import { DigitalWaiterSettingsForm } from "@/components/modules/digital-waiter/digital-waiter-settings-form"
import { MenuManagement } from "@/components/modules/digital-waiter/menu-management"
import { DigitalWaiterAnalytics } from "@/components/modules/digital-waiter/digital-waiter-analytics"
import { QRGenerator } from "@/components/modules/digital-waiter/qr-generator"
import { Utensils, Bell, Settings, BarChart3, BookOpen, QrCode } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot } from "firebase/firestore"

export default function DigitalWaiterPage() {
    const { user, role, userData } = useAuth()
    const { t } = useLanguage()
    const params = useParams()
    const [pendingCount, setPendingCount] = useState(0)

    const chatbotId = (params?.userId as string) || user?.uid || ""

    useEffect(() => {
        if (!chatbotId) return

        const q = query(
            collection(db, "waiter_requests"),
            where("chatbotId", "==", chatbotId),
            where("status", "==", "pending")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPendingCount(snapshot.size)
        })

        return () => unsubscribe()
    }, [chatbotId])

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Utensils className="w-8 h-8 text-primary" />
                        {t('modules.digitalWaiter') || "Dijital Garson"}
                    </h2>
                    <p className="text-muted-foreground">
                        {t('modules.digitalWaiterDesc') || "Masa isteklerini yönetin ve restoran ayarlarınızı yapılandırın."}
                    </p>
                </div>
            </div>

            <Tabs defaultValue="requests" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3 md:w-[800px] md:grid-cols-5">
                    <TabsTrigger value="requests" className="relative">
                        <Bell className="w-4 h-4 mr-2" />
                        İstekler
                        {pendingCount > 0 && (
                            <Badge className="ml-2 bg-red-500 hover:bg-red-600 animate-pulse">
                                {pendingCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="menu">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Menü
                    </TabsTrigger>
                    <TabsTrigger value="qr">
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Kodlar
                    </TabsTrigger>
                    <TabsTrigger value="settings">
                        <Settings className="w-4 h-4 mr-2" />
                        Ayarlar
                    </TabsTrigger>
                    <TabsTrigger value="analytics">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analizler
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="requests" className="space-y-4">
                    <WaiterRequestsList chatbotId={chatbotId} />
                </TabsContent>

                <TabsContent value="menu" className="space-y-4">
                    <MenuManagement chatbotId={chatbotId} />
                </TabsContent>

                <TabsContent value="qr" className="space-y-4">
                    <QRGenerator chatbotId={chatbotId} />
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <DigitalWaiterSettingsForm targetUserId={chatbotId} />
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-4">
                    <DigitalWaiterAnalytics chatbotId={chatbotId} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
