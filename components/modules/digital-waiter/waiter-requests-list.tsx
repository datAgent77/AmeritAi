"use client"

import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from "firebase/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Check, Clock, User, Utensils, Receipt, XCircle, Loader2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { tr } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"

interface WaiterRequest {
    id: string
    masaNo: string
    type: 'call_staff' | 'request_bill'
    status: 'pending' | 'in_progress' | 'done'
    createdAt: string
    note?: string
    contactKey?: string
}

export function WaiterRequestsList({ chatbotId }: { chatbotId: string }) {
    const [requests, setRequests] = useState<WaiterRequest[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()

    useEffect(() => {
        if (!chatbotId) return

        const q = query(
            collection(db, "waiter_requests"),
            where("chatbotId", "==", chatbotId),
            orderBy("createdAt", "desc")
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WaiterRequest))
            setRequests(list)
            setLoading(false)

            // Play notification sound for new pending requests
            const hasNewPending = snapshot.docChanges().some(change => 
                change.type === 'added' && change.doc.data().status === 'pending'
            )
            if (hasNewPending && !loading) {
                const audio = new Audio('/sound/notification.mp3')
                audio.play().catch(e => console.warn("Audio play failed", e))
                toast({
                    title: "Yeni İstek!",
                    description: "Yeni bir masa isteği geldi.",
                })
            }
        }, (error) => {
            console.error("Firestore error:", error)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [chatbotId, loading, toast])

    const updateStatus = async (id: string, status: WaiterRequest['status']) => {
        try {
            const patch: any = { status }
            if (status === 'done') {
                patch.completedAt = new Date().toISOString()
            }
            await updateDoc(doc(db, "waiter_requests", id), patch)
        } catch (error) {
            console.error("Update failed", error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const pending = requests.filter(r => r.status === 'pending')
    const others = requests.filter(r => r.status !== 'pending').slice(0, 20)

    return (
        <div className="space-y-6">
            {/* Pending Requests */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pending.length > 0 ? (
                    pending.map((req) => (
                        <Card key={req.id} className="border-l-4 border-l-red-500 shadow-lg animate-pulse-subtle">
                            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                                <CardTitle className="text-xl font-bold">Masa {req.masaNo}</CardTitle>
                                {req.type === 'call_staff' ? (
                                    <Utensils className="w-5 h-5 text-red-500" />
                                ) : (
                                    <Receipt className="w-5 h-5 text-green-500" />
                                )}
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm font-medium">
                                        <Badge variant={req.type === 'call_staff' ? 'destructive' : 'secondary'}>
                                            {req.type === 'call_staff' ? 'Garson Çağırıyor' : 'Hesap İstiyor'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: tr })}
                                        </span>
                                    </div>
                                    {req.note && (
                                        <p className="text-sm bg-muted p-2 rounded-md italic">&ldquo;{req.note}&rdquo;</p>
                                    )}
                                    <div className="flex gap-2 mt-4">
                                        <Button 
                                            className="flex-1 bg-green-600 hover:bg-green-700" 
                                            size="sm"
                                            onClick={() => updateStatus(req.id, 'done')}
                                        >
                                            <Check className="w-4 h-4 mr-1" /> Tamamla
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm"
                                            onClick={() => updateStatus(req.id, 'in_progress')}
                                        >
                                            İşleme Al
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center bg-muted/20 border-2 border-dashed rounded-xl">
                        <Bell className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium">Aktif istek bulunmuyor</h3>
                        <p className="text-sm text-muted-foreground">Tüm masalar şu an mutlu görünüyor.</p>
                    </div>
                )}
            </div>

            {/* History / Others */}
            {others.length > 0 && (
                <div className="mt-12">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-muted-foreground" /> Son Hareketler
                    </h3>
                    <Card>
                        <div className="divide-y">
                            {others.map((req) => (
                                <div key={req.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${req.status === 'done' ? 'bg-green-100' : 'bg-blue-100'}`}>
                                            {req.type === 'call_staff' ? (
                                                <Utensils className={`w-4 h-4 ${req.status === 'done' ? 'text-green-600' : 'text-blue-600'}`} />
                                            ) : (
                                                <Receipt className={`w-4 h-4 ${req.status === 'done' ? 'text-green-600' : 'text-blue-600'}`} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-medium">Masa {req.masaNo} - {req.type === 'call_staff' ? 'Garson' : 'Hesap'}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(req.createdAt), { addSuffix: true, locale: tr })}
                                            </div>
                                        </div>
                                    </div>
                                    <Badge variant={req.status === 'done' ? 'outline' : 'secondary'}>
                                        {req.status === 'done' ? 'Tamamlandı' : 'İşlemde'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
