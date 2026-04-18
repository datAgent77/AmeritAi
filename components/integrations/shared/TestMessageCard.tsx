"use client"

import { Loader2, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function TestMessageCard(props: {
    title: string
    description: string
    recipientLabel: string
    recipientPlaceholder: string
    recipientValue: string
    onRecipientChange: (value: string) => void
    messageValue: string
    onMessageChange: (value: string) => void
    onSend: () => void
    sending?: boolean
}) {
    return (
        <Card className="border-border/70">
            <CardHeader className="pb-4">
                <CardTitle className="text-base">{props.title}</CardTitle>
                <CardDescription>{props.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>{props.recipientLabel}</Label>
                    <Input value={props.recipientValue} onChange={(event) => props.onRecipientChange(event.target.value)} placeholder={props.recipientPlaceholder} />
                </div>
                <div className="space-y-2">
                    <Label>Test mesajı</Label>
                    <Textarea
                        rows={3}
                        value={props.messageValue}
                        onChange={(event) => props.onMessageChange(event.target.value)}
                        placeholder="Merhaba, bu Vion kurulum test mesajıdır."
                    />
                </div>
                <Button type="button" onClick={props.onSend} disabled={props.sending || !props.recipientValue.trim()} className="w-full sm:w-auto">
                    {props.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Test mesajını gönder
                </Button>
            </CardContent>
        </Card>
    )
}
