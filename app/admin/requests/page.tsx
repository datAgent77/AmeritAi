"use client"

import { useEffect, useState, useCallback } from "react"
import { auth } from "@/lib/firebase"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useLanguage } from "@/context/LanguageContext"

interface ModuleRequest {
    id: string
    userId: string
    userEmail: string
    moduleKey: string
    moduleName: string
    status: 'pending' | 'approved' | 'rejected'
    requestedAt: any
}

export default function AdminRequestsPage() {
    const { t } = useLanguage()
    const [requests, setRequests] = useState<ModuleRequest[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const { toast } = useToast()

    const fetchRequests = useCallback(async () => {
        setIsLoading(true)
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) return;

            const token = await currentUser.getIdToken();
            const response = await fetch("/api/admin/module-requests", {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to fetch requests");
            }

            const data = await response.json();
            setRequests(data.requests || []);
        } catch (error: any) {
            console.error("Error fetching requests:", error)
            toast({
                title: "Error",
                description: error.message || "Failed to load requests.",
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchRequests();
            }
        });

        return () => unsubscribe();
    }, [fetchRequests])

    const handleApprove = async (request: ModuleRequest) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/module-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: request.id,
                    action: 'approve'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to approve request");
            }

            toast({
                title: "Başarılı",
                description: `${request.moduleName || request.moduleKey} talebi onaylandı.`,
                className: "bg-green-600 text-white border-green-700"
            })

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== request.id))

        } catch (error: any) {
            console.error("Error approving request:", error)
            toast({
                title: "Hata",
                description: `Talep onaylanamadı: ${error.message || "Bilinmeyen hata"}`,
                variant: "destructive",
            })
        }
    }

    const handleReject = async (request: ModuleRequest) => {
        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/module-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: request.id,
                    action: 'reject'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to reject request");
            }

            toast({
                title: "Reddedildi",
                description: "Talep reddedildi.",
            })

            setRequests(prev => prev.filter(r => r.id !== request.id))
        } catch (error: any) {
            console.error("Error rejecting request:", error)
            toast({
                title: "Hata",
                description: `Talep reddedilemedi: ${error.message || "Bilinmeyen hata"}`,
                variant: "destructive",
            })
        }
    }

    const handleForceDelete = async (request: ModuleRequest) => {
        if (!confirm("Bu talebi kalıcı olarak silmek istediğinize emin misiniz?")) return

        try {
            const token = await auth.currentUser?.getIdToken();
            const response = await fetch("/api/admin/module-requests", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    requestId: request.id,
                    action: 'delete'
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete request");
            }

            toast({
                title: "Silindi",
                description: "Talep kalıcı olarak silindi.",
            })

            setRequests(prev => prev.filter(r => r.id !== request.id))
        } catch (error: any) {
            console.error("Error deleting request:", error)
            toast({
                title: "Hata",
                description: `Talep silinemedi: ${error.message || "Bilinmeyen hata"}`,
                variant: "destructive",
            })
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">{t('moduleRequests') || "Modül Erişim Talepleri"}</h2>
                <p className="text-muted-foreground">{t('moduleRequestsDesc') || "Kullanıcıların modül taleplerini yönetin."}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('pendingRequests') || "Bekleyen Talepler"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Kullanıcı</TableHead>
                                    <TableHead>Modül</TableHead>
                                    <TableHead>Talep Tarihi</TableHead>
                                    <TableHead className="text-right">İşlemler</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((request) => (
                                    <TableRow key={request.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{request.userEmail}</span>
                                                <span className="text-xs text-muted-foreground">{request.userId}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-indigo-500 border-indigo-200 bg-indigo-50">
                                                {request.moduleName || request.moduleKey || "Bilinmeyen Modül"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center text-muted-foreground text-sm">
                                                <Clock className="mr-1 h-3 w-3" />
                                                {(() => {
                                                    if (!request.requestedAt) return '-';
                                                    try {
                                                        const date = typeof request.requestedAt.toDate === 'function'
                                                            ? request.requestedAt.toDate()
                                                            : new Date(request.requestedAt.seconds ? request.requestedAt.seconds * 1000 : request.requestedAt);
                                                        return date.toLocaleDateString('tr-TR');
                                                    } catch (e) {
                                                        return '-';
                                                    }
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    className="bg-green-600 hover:bg-green-700"
                                                    onClick={() => handleApprove(request)}
                                                >
                                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                                    Onayla
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleReject(request)}
                                                >
                                                    <XCircle className="h-4 w-4 mr-1" />
                                                    Reddet
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-gray-500 hover:text-red-600 hover:border-red-300"
                                                    onClick={() => handleForceDelete(request)}
                                                    title="Kalıcı olarak sil"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {requests.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                            Bekleyen talep bulunamadı.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
