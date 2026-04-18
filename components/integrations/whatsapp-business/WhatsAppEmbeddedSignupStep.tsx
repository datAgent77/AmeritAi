"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function WhatsAppEmbeddedSignupStep(props: {
    connecting?: boolean
    onConnect: () => void
}) {
    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle className="text-base">2. Meta penceresini tamamlayın</CardTitle>
                <CardDescription>
                    Açılan Meta penceresinde işletme hesabınızı ve numaranızı seçin. İşlem tamamlanınca bu pencere otomatik güncellenecek.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Button type="button" onClick={props.onConnect} disabled={props.connecting}>
                    {props.connecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Meta penceresini aç
                </Button>
            </CardContent>
        </Card>
    )
}
