"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Gift, Mail, Calendar, Trophy, Users, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Winner {
    id: string
    email: string
    prize: string
    couponCode: string | null
    playedAt: string
    sessionId?: string
}

export default function GamificationWinnersPage() {
    const { user } = useAuth()
    const [winners, setWinners] = useState<Winner[]>([])
    const [isLoading, setIsLoading] = useState(true)

    const fetchWinners = async () => {
        if (!user) return
        setIsLoading(true)
        try {
            const token = await user.getIdToken()
            const response = await fetch(`/api/gamification/winners?chatbotId=${user.uid}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (response.ok) {
                const data = await response.json()
                setWinners(data.winners || [])
            }
        } catch (error) {
            console.error("Failed to fetch winners", error)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => { fetchWinners() }, [user])

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    const totalWinners = winners.length
    const uniqueEmails = new Set(winners.map(w => w.email).filter(e => e !== "Anonim")).size

    return (
        <div className="flex-1 space-y-8 p-8 pt-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-violet-500" />
                        Oyun Katılımcıları ve Kazananlar
                    </h2>
                    <p className="text-muted-foreground mt-1">Oyunu oynayan ve ödül kazanan kullanıcıların listesi</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchWinners}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Yenile
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-violet-100 dark:border-violet-900/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
                                <Gift className="w-6 h-6 text-violet-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{totalWinners}</div>
                                <div className="text-sm text-muted-foreground">Toplam Katılım</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                                <Users className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{uniqueEmails}</div>
                                <div className="text-sm text-muted-foreground">Benzersiz Kullanıcı</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-blue-100 dark:border-blue-900/20">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                                <Trophy className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <div className="text-2xl font-bold">{winners.filter(w => w.couponCode).length}</div>
                                <div className="text-sm text-muted-foreground">Kupon Verildi</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle>Katılımcı Listesi</CardTitle>
                    <CardDescription>
                        E-posta zorunluluğu açık oyunlarda iletişim bilgilerini bırakan ve ödül kazanan kullanıcılar. 
                        Bu bilgiler otomatik olarak kayıt altına alınır.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {winners.length === 0 ? (
                        <div className="text-center py-16 space-y-3">
                            <Gift className="w-12 h-12 text-zinc-300 mx-auto" />
                            <div className="text-lg font-medium text-zinc-500">Henüz katılımcı yok</div>
                            <div className="text-sm text-muted-foreground max-w-sm mx-auto">
                                Oyunlaştırma modülünü aktifleştirip ziyaretçilerin oynamasını bekleyin. 
                                Kazananlar burada görünecektir.
                            </div>
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-hidden">
                            <Table>
                                <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                                    <TableRow>
                                        <TableHead className="pl-4">E-posta</TableHead>
                                        <TableHead>Kazanılan Ödül</TableHead>
                                        <TableHead>Kupon Kodu</TableHead>
                                        <TableHead>Tarih</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {winners.map((winner) => (
                                        <TableRow key={winner.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                                            <TableCell className="pl-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                                                        <Mail className="w-3.5 h-3.5 text-violet-500" />
                                                    </div>
                                                    <span className="font-medium text-sm">{winner.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Gift className="w-4 h-4 text-violet-500 shrink-0" />
                                                    <span className="font-semibold text-violet-700 dark:text-violet-400">{winner.prize}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {winner.couponCode ? (
                                                    <span className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded font-bold tracking-wider">
                                                        {winner.couponCode}
                                                    </span>
                                                ) : (
                                                    <span className="text-zinc-400 text-sm">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-zinc-500 text-sm">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {new Date(winner.playedAt).toLocaleDateString("tr-TR", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
