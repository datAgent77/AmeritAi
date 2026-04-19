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
        <Card className="border-border/70 shadow-sm hover:shadow-md transition-shadow duration-200">
            <CardHeader className="bg-slate-50/50 pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground font-semibold">✓</span>
                    Test Mesajı Gönder
                </CardTitle>
                <CardDescription className="text-xs">
                    {props.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
                <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">{props.recipientLabel}</Label>
                        <Input 
                            value={props.recipientValue} 
                            onChange={(event) => props.onRecipientChange(event.target.value)} 
                            placeholder={props.recipientPlaceholder} 
                            className="bg-muted/30"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Test mesajı</Label>
                        <Textarea
                            rows={3}
                            value={props.messageValue}
                            onChange={(event) => props.onMessageChange(event.target.value)}
                            placeholder="Merhaba, bu Vion kurulum test mesajıdır."
                            className="bg-muted/30 resize-none"
                        />
                    </div>
                </div>
                <div className="pt-2">
                    <Button 
                        type="button" 
                        onClick={props.onSend} 
                        disabled={props.sending || !props.recipientValue.trim()} 
                        className="w-full sm:w-auto bg-primary hover:bg-primary/90"
                    >
                        {props.sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Mesajı Gönder ve Doğrula
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
