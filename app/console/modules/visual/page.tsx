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
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [result, setResult] = useState<null | { diagnosis: string, confidence: string, treatment: string }>(null)

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // 1. Preview
        const reader = new FileReader()
        reader.onload = (e) => setSelectedImage(e.target?.result as string)
        reader.readAsDataURL(file)

        // 2. Analyze
        setIsAnalyzing(true)
        setResult(null)

        try {
            // Need clean base64 string (remove data:image/bg;base64, prefix)
            // But we can do this inside the promise
            const base64Promise = new Promise<string>((resolve, reject) => {
                const r = new FileReader()
                r.onload = () => {
                    const result = r.result as string
                    const base64 = result.split(',')[1] // Extract actual data
                    resolve(base64)
                }
                r.onerror = reject
                r.readAsDataURL(file)
            })

            const base64Data = await base64Promise

            const response = await fetch('/api/visual-diagnosis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image: base64Data,
                    mimeType: file.type
                })
            })

            if (!response.ok) throw new Error("Analysis failed")

            const data = await response.json()
            setResult(data)

            toast({
                title: "Analysis Complete",
                description: `Identified: ${data.diagnosis}`
            })

        } catch (error) {
            console.error(error)
            toast({
                title: "Error",
                description: "Failed to analyze image. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsAnalyzing(false)
        }
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
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            id="image-upload"
                            onChange={handleFileSelect}
                        />
                        <label
                            htmlFor="image-upload"
                            className="border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors cursor-pointer relative overflow-hidden"
                        >
                            {selectedImage ? (
                                <img src={selectedImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                            ) : null}
                            <Camera className="h-12 w-12 text-muted-foreground mb-4 z-10" />
                            <p className="font-medium z-10">Click to upload or take photo</p>
                            <p className="text-sm text-muted-foreground mt-1 z-10">Supports JPG, PNG</p>
                        </label>
                        <Button className="w-full" onClick={() => document.getElementById('image-upload')?.click()} disabled={isAnalyzing}>
                            {isAnalyzing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isAnalyzing ? "Analyzing..." : "Select Image"}
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
