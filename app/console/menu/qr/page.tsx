"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"
import { Printer, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function QRPage() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const router = useRouter()

    // Only access window on client
    const [origin, setOrigin] = useState("")
    const [tableCount, setTableCount] = useState(10)

    useEffect(() => {
        setOrigin(window.location.origin)
    }, [])

    if (!user) return null

    const menuLink = `${origin}/menu/${user.uid}`

    // Use QR Code API service
    const getQrUrl = (text: string) =>
        `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`

    return (
        <div className="p-8 space-y-8 print:p-0 print:space-y-4">
            <div className="flex items-center justify-between print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">{t('qrCodes') || "QR Center"}</h2>
                </div>
                <Button onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print / Save PDF
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3 print:hidden">
                {/* General Menu QR */}
                <Card>
                    <CardHeader>
                        <CardTitle>General Menu QR</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <div className="bg-white p-2 border rounded relative w-36 h-36">
                            <Image
                                src={getQrUrl(menuLink)}
                                alt="General Menu"
                                fill
                                className="object-contain"
                                unoptimized
                            />
                        </div>
                        <p className="mt-4 text-xs text-muted-foreground break-all text-center">
                            {menuLink}
                        </p>
                    </CardContent>
                </Card>

                {/* Configuration */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Table Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="max-w-xs space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Number of Tables</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={tableCount}
                                    onChange={e => setTableCount(parseInt(e.target.value) || 0)}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Generates individual QR codes for each table.
                                    Table number is passed to the chatbot for order tracking.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Print Area */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold print:hidden">Preview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 print:grid-cols-4">
                    {Array.from({ length: tableCount }).map((_, i) => {
                        const tableNum = i + 1
                        const link = `${menuLink}?table=${tableNum}`

                        return (
                            <div key={tableNum} className="border rounded-lg p-4 flex flex-col items-center justify-center text-center bg-white space-y-2 break-inside-avoid">
                                <span className="font-bold text-lg">Table {tableNum}</span>
                                <div className="relative w-32 h-32 mx-auto">
                                    <Image
                                        src={getQrUrl(link)}
                                        alt={`Table ${tableNum}`}
                                        fill
                                        className="object-contain"
                                        unoptimized
                                    />
                                </div>
                                <span className="text-[10px] text-gray-500">Scan for Menu</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
