"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldCheck } from "lucide-react"
import { auth } from "@/lib/firebase"
import type { ContractTemplateType, PublishedContractVersion } from "@/lib/contracts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface ContractAcceptancePageProps {
    scope: "console" | "agency"
    type: ContractTemplateType
}

export function ContractAcceptancePage({ scope, type }: ContractAcceptancePageProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [contract, setContract] = useState<PublishedContractVersion | null>(null)
    const fallbackHref = scope === "agency" ? "/agency" : "/console/chatbot"

    useEffect(() => {
        const load = async () => {
            try {
                const token = await auth.currentUser?.getIdToken()
                if (!token) return

                const response = await fetch("/api/contracts/current", {
                    headers: { Authorization: `Bearer ${token}` },
                })
                const data = response.ok ? await response.json() : null
                const required = data?.required

                if (!required?.requiresAcceptance || required?.type !== type) {
                    router.replace(fallbackHref)
                    return
                }

                setContract(required.contract || null)
            } catch (error) {
                console.error("Failed to load contract gate:", error)
            } finally {
                setIsLoading(false)
            }
        }

        load()
    }, [fallbackHref, router, type])

    const acceptContract = async () => {
        setIsSubmitting(true)
        try {
            const token = await auth.currentUser?.getIdToken()
            if (!token) return

            const response = await fetch("/api/contracts/accept", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ type }),
            })

            if (!response.ok) {
                throw new Error("Accept failed")
            }

            router.replace(fallbackHref)
        } catch (error) {
            console.error("Failed to accept contract:", error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-4xl items-center justify-center p-6">
            <Card className="w-full shadow-xl">
                <CardHeader className="space-y-4 border-b pb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <CardTitle className="text-2xl">{contract?.title || "Sozlesme Onayi"}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Devam etmek icin guncel sozlesmeyi kabul etmeniz gerekir.
                            </p>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6 p-6">
                    <div className="max-h-[55vh] overflow-y-auto rounded-2xl border bg-muted/20 p-5">
                        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-foreground/90">
                            {contract?.text || "Yayinlanmis sozlesme metni bulunamadi."}
                        </pre>
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={acceptContract} disabled={isSubmitting || !contract}>
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Kabul ediyorum ve devam et
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
