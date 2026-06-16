"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { QrCode, Printer, Link2 } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

export function QRGenerator({ chatbotId }: { chatbotId: string }) {
    const { t } = useLanguage()
    const [tableCount, setTableCount] = useState(10)
    const [prefix, setPrefix] = useState("Table ")
    
    // In production this should be the actual base URL of the site
    // We can infer it from window.location.origin
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.getvion.com'
    const widgetUrl = `${baseUrl}/chatbot-view?id=${chatbotId}`

    const tables = Array.from({ length: tableCount }, (_, i) => ({
        id: i + 1,
        name: `${prefix}${i + 1}`,
        url: `${widgetUrl}&masa=${i + 1}`
    }))

    const handlePrint = () => {
        window.print()
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <QrCode className="w-5 h-5" />
                        {t('generateTableQr')}
                    </CardTitle>
                    <CardDescription>
                        {t('generateTableQrDesc')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label>{t('tablePrefix')}</Label>
                            <Input
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                placeholder={t('tablePrefixPlaceholder')}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('tableCount')}</Label>
                            <Input 
                                type="number" 
                                min="1" 
                                max="100"
                                value={tableCount} 
                                onChange={(e) => setTableCount(Number(e.target.value) || 1)}
                            />
                        </div>
                    </div>
                    
                    <div className="p-4 bg-muted/50 rounded-lg border flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium">{t('sampleUrlStructure')}</span>
                            <span className="text-xs text-muted-foreground break-all">{widgetUrl}&masa=1</span>
                        </div>
                        <Button onClick={handlePrint} className="shrink-0 ml-4">
                            <Printer className="w-4 h-4 mr-2" />
                            {t('print')}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* QR Codes Grid (Visible for print, or preview) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 print:grid-cols-4 print:gap-8">
                {tables.map((table) => (
                    <Card key={table.id} className="text-center overflow-hidden border-2 print:shadow-none print:break-inside-avoid">
                        <div className="bg-primary/5 p-2 border-b">
                            <h3 className="font-bold text-lg">{table.name}</h3>
                        </div>
                        <CardContent className="p-4 flex flex-col items-center gap-3">
                            {/* Using api.qrserver.com for zero-dependency QR code generation */}
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(table.url)}`}
                                alt={`${table.name} ${t('qrCodeAlt')}`}
                                className="w-32 h-32 object-contain"
                                crossOrigin="anonymous"
                            />
                            <p className="text-[10px] text-muted-foreground w-full break-all leading-tight">
                                {t('scanForMenu')}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>
            
            {/* Print Styles */}
            <style jsx global>{`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    .print\\:block {
                        display: block !important;
                    }
                    /* Container to print */
                    .print\\:grid-cols-4 {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    .print\\:grid-cols-4 * {
                        visibility: visible;
                    }
                }
            `}</style>
        </div>
    )
}
