"use client"

import { useState, useEffect } from "react"
import { MultiUploadZone } from "@/components/ui-ux-auditor/multi-upload-zone"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, GitMerge, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

export default function UserFlowPage() {
    const { t, language } = useLanguage()
    const [files, setFiles] = useState<File[]>([])
    const [goal, setGoal] = useState("")
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [result, setResult] = useState<any>(null)

    // Check for extension data
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search)
        if (searchParams.get('source') === 'extension') {
            setIsAnalyzing(true)
            // Fetch temp data
            fetch('/temp_flow_data.json')
                .then(res => res.json())
                .then(data => {
                    // Pre-fill result with simulated analysis based on this data
                    // In a real app we'd process the specific screenshots
                    setGoal(`Analyze flow for URL: ${data.url}`)

                    // Simulate processing time then showing result
                    setTimeout(() => {
                        setIsAnalyzing(false)
                        setResult({
                            score: 85,
                            status: "good",
                            frictionPoints: 1,
                            steps: data.events.map((e: any, i: number) => ({
                                step: i + 1,
                                screen: `Interaction ${i + 1}`,
                                status: i % 3 === 0 ? 'warning' : 'pass',
                                analysis: `User performed ${e.eventType} on ${e.element} (${e.text || 'Element'}).`
                            })),
                            summary: "Extension flow captured successfully. Analysis shows clear progression with minor friction."
                        })
                    }, 1500)
                })
                .catch(err => {
                    console.error("Failed to load extension data", err)
                    setIsAnalyzing(false)
                })
        }
    }, [])

    const handleAnalyze = () => {
        if (files.length < 2) return
        setIsAnalyzing(true)
        setResult(null)

        // Simulate AI Analysis
        setTimeout(() => {
            setIsAnalyzing(false)
            if (language === 'tr') {
                setResult({
                    score: 72,
                    status: "moderate",
                    frictionPoints: 2,
                    steps: [
                        {
                            step: 1,
                            screen: "Ürün Sayfası",
                            status: "pass",
                            analysis: "'Sepete Ekle' CTA'sı net. Bilgi hiyerarşisi iyi."
                        },
                        {
                            step: 2,
                            screen: "Sepet Modalı",
                            status: "warning",
                            analysis: "'Alışverişe Devam Et' seçeneği net değil. Kullanıcı sıkışmış hissedebilir."
                        },
                        {
                            step: 3,
                            screen: "Ödeme",
                            status: "fail",
                            analysis: "Misafir ödeme seçeneği gizlenmiş. Bu noktada terk etme riski yüksek."
                        },
                        {
                            step: 4,
                            screen: "Başarılı",
                            status: "pass",
                            analysis: "Net onay ve sonraki adımlar sağlanmış."
                        }
                    ],
                    summary: "Akış genel olarak mantıklı, ancak ödeme sırasında hesap oluşturma zorunluluğu büyük bir sürtünme noktası."
                })
            } else if (language === 'de') {
                setResult({
                    score: 72,
                    status: "moderate",
                    frictionPoints: 2,
                    steps: [
                        {
                            step: 1,
                            screen: "Produktseite",
                            status: "pass",
                            analysis: "Klarer CTA 'In den Warenkorb'. Informationshierarchie ist gut."
                        },
                        {
                            step: 2,
                            screen: "Warenkorb-Modal",
                            status: "warning",
                            analysis: "Keine klare Möglichkeit 'Weiter einkaufen'. Benutzer könnte sich gefangen fühlen."
                        },
                        {
                            step: 3,
                            screen: "Kasse",
                            status: "fail",
                            analysis: "Gastbestellung ist versteckt. Hohes Risiko für Abbruch hier."
                        },
                        {
                            step: 4,
                            screen: "Erfolg",
                            status: "pass",
                            analysis: "Klare Bestätigung und nächste Schritte bereitgestellt."
                        }
                    ],
                    summary: "Der Ablauf ist im Allgemeinen logisch, aber die erzwungene Kontoerstellung während des Checkouts ist ein großer Reibungspunkt."
                })
            } else if (language === 'es') {
                setResult({
                    score: 72,
                    status: "moderate",
                    frictionPoints: 2,
                    steps: [
                        {
                            step: 1,
                            screen: "Página de producto",
                            status: "pass",
                            analysis: "CTA claro 'Añadir al carrito'. La jerarquía de información es buena."
                        },
                        {
                            step: 2,
                            screen: "Modal del carrito",
                            status: "warning",
                            analysis: "No hay una forma clara de 'Seguir comprando'. El usuario puede sentirse atrapado."
                        },
                        {
                            step: 3,
                            screen: "Pago",
                            status: "fail",
                            analysis: "La opción de pago como invitado está oculta. Alto riesgo de abandono aquí."
                        },
                        {
                            step: 4,
                            screen: "Éxito",
                            status: "pass",
                            analysis: "Confirmación clara y siguientes pasos proporcionados."
                        }
                    ],
                    summary: "El flujo es generalmente lógico, pero la creación forzada de cuenta durante el pago es un punto de fricción importante."
                })
            } else {
                setResult({
                    score: 72,
                    status: "moderate",
                    frictionPoints: 2,
                    steps: [
                        {
                            step: 1,
                            screen: "Product Page",
                            status: "pass",
                            analysis: "Clear CTA to 'Add to Cart'. Information hierarchy is good."
                        },
                        {
                            step: 2,
                            screen: "Cart Modal",
                            status: "warning",
                            analysis: "No clear way to 'Continue Shopping'. User might feel trapped."
                        },
                        {
                            step: 3,
                            screen: "Checkout",
                            status: "fail",
                            analysis: "Guest checkout option is hidden. High risk of drop-off here."
                        },
                        {
                            step: 4,
                            screen: "Success",
                            status: "pass",
                            analysis: "Clear confirmation and next steps provided."
                        }
                    ],
                    summary: "The flow is generally logical, but the forced account creation during checkout is a major friction point."
                })
            }
        }, 3000)
    }

    return (
        <div className="flex flex-col h-full p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('userFlowTitle')}</h2>
                    <p className="text-muted-foreground">
                        {t('userFlowDesc')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Panel: Inputs */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('defineJourney')}</CardTitle>
                            <CardDescription>
                                Upload screens in order and describe the user&apos;s goal.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="goal">{t('userGoal')}</Label>
                                <Input
                                    id="goal"
                                    placeholder="e.g. Purchase a t-shirt as a guest user"
                                    value={goal}
                                    onChange={(e) => setGoal(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Screens (Min. 2)</Label>
                                <MultiUploadZone onFilesChange={setFiles} isAnalyzing={isAnalyzing} />
                            </div>

                            <Button
                                className="w-full"
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || files.length < 2 || !goal}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {t('analyzing')}
                                    </>
                                ) : (
                                    <>
                                        <GitMerge className="mr-2 h-4 w-4" />
                                        {t('analyzeFlow')}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Panel: Results */}
                <div className="lg:col-span-1">
                    {result ? (
                        <div className="space-y-4 animate-in slide-in-from-right-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-lg">{t('flowScore')}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-end gap-2">
                                        <span className={`text-4xl font-bold ${result.score > 80 ? 'text-green-600' : result.score > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                                            {result.score}
                                        </span>
                                        <span className="text-muted-foreground mb-1">/ 100</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {result.summary}
                                    </p>
                                </CardContent>
                            </Card>

                            <div className="space-y-4">
                                <h3 className="font-semibold text-sm uppercase text-muted-foreground tracking-wider">{t('stepByStepAnalysis')}</h3>
                                {result.steps.map((step: any, index: number) => (
                                    <div key={index} className="relative pl-6 pb-6 border-l last:pb-0 last:border-l-0">
                                        <div className={`absolute -left-3 top-0 rounded-full w-6 h-6 flex items-center justify-center border bg-background z-10
                                            ${step.status === 'pass' ? 'border-green-500 text-green-500' :
                                                step.status === 'fail' ? 'border-red-500 text-red-500' : 'border-yellow-500 text-yellow-500'}`}>
                                            {step.status === 'pass' && <CheckCircle className="w-3 h-3" />}
                                            {step.status === 'fail' && <AlertTriangle className="w-3 h-3" />}
                                            {step.status === 'warning' && <AlertTriangle className="w-3 h-3" />}
                                        </div>

                                        <div className="bg-card border rounded-lg p-3 text-sm">
                                            <div className="font-medium mb-1 flex justify-between">
                                                <span>Step {step.step}: {step.screen}</span>
                                            </div>
                                            <p className="text-muted-foreground">{step.analysis}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <Card className="h-full bg-muted/20 border-dashed">
                            <CardContent className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                                <GitMerge className="h-12 w-12 mb-4 opacity-20" />
                                <p>Upload screens and define a goal to see the flow analysis here.</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
