"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Scan, Upload, AlertCircle, CheckCircle, Loader2, Camera } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLanguage } from "@/context/LanguageContext"
import { useToast } from "@/hooks/use-toast"

export default function VisualDiagnosisPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const { toast } = useToast()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [result, setResult] = useState<null | { diagnosis: string, confidence: string, treatment: string }>(null)

    const handleUpload = () => {
        setIsAnalyzing(true)
        setResult(null)
        setTimeout(() => {
            setIsAnalyzing(false)
            setResult({
                diagnosis: "Tomato Early Blight",
                confidence: "94%",
                treatment: "Remove infected leaves immediately. Apply copper-based fungicide."
            })
            toast({
                title: "Analysis Complete",
                description: "Disease detected: Tomato Early Blight"
            })
        }, 2000)
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/console/modules")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                            <Scan className="h-8 w-8 text-green-600" />
                            {t('modules.visualDiagnosis') || "Visual Diagnosis"}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('modules.visualDiagnosisDesc') || "Identify plant diseases and damages with AI"}
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Image Analysis</CardTitle>
                        <CardDescription>Upload a photo of the plant leaf or affected area</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer" onClick={handleUpload}>
                            <Camera className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="font-medium">Click to upload or take photo</p>
                            <p className="text-sm text-muted-foreground mt-1">Supports JPG, PNG</p>
                        </div>
                        <Button className="w-full" onClick={handleUpload} disabled={isAnalyzing}>
                            {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAnalyzing ? "Analyzing..." : "Analyze Image"}
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                        <CardDescription>AI Diagnostic Report</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {result ? (
                            <div className="space-y-6">
                                <div className="p-4 bg-red-50 text-red-900 rounded-lg border border-red-100 flex items-start gap-4">
                                    <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold text-lg">{result.diagnosis}</h4>
                                        <p className="text-sm opacity-90">Confidence: {result.confidence}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="font-semibold flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                        Recommended Action
                                    </h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {result.treatment}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground opacity-50">
                                <Scan className="h-16 w-16 mb-4" />
                                <p>No analysis performed yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
