"use client"

import { useEffect, useState } from "react"
import { collection, query, getDocs, doc, updateDoc, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Clock, User, MessageSquare, ShieldCheck, Search, Filter } from "lucide-react"
import { format } from "date-fns"
import { tr, enUS } from 'date-fns/locale'
import { useToast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"

interface Appointment {
    id: string
    chatbotId: string
    customerName: string
    customerEmail: string
    customerPhone: string
    date: string
    time: string
    type: string
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
    createdAt: any
}

export default function AdminAppointmentsPage() {
    const { role } = useAuth()
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")

    useEffect(() => {
        if (role !== 'SUPER_ADMIN') return

        const fetchAppointments = async () => {
            try {
                const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"))
                const snapshot = await getDocs(q)
                const data = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Appointment[]
                setAppointments(data)
                setIsLoading(false)
            } catch (error) {
                console.error("Error fetching all appointments:", error)
                setIsLoading(false)
            }
        }

        fetchAppointments()
        const interval = setInterval(fetchAppointments, 60000) // 1 minute polling for global admin view

        return () => clearInterval(interval)
    }, [role])

    const filteredAppointments = appointments.filter(appt =>
        appt.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.chatbotId.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStatusBadge = (status: Appointment['status']) => {
        switch (status) {
            case 'confirmed':
                return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">{t('confirmed') || "Confirmed"}</Badge>
            case 'cancelled':
                return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">{t('cancelled') || "Cancelled"}</Badge>
            case 'completed':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">{t('completed') || "Completed"}</Badge>
            default:
                return <Badge variant="outline" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200">{t('pending') || "Pending"}</Badge>
        }
    }

    if (role !== 'SUPER_ADMIN') {
        return <div className="p-8">Access Denied</div>
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('globalAppointments') || "Global Appointments"}</h2>
                    <p className="text-muted-foreground">{t('globalAppointmentsDesc') || "Monitor all appointments across all tenants."}</p>
                </div>
                <div className="relative w-72">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('searchAppointments') || "Search name, email or tenant ID..."}
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('totalAppointments') || "Total Appointments"}</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{appointments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('pendingAppointments') || "Pending"}</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                            {appointments.filter(a => a.status === 'pending').length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{t('confirmedAppointments') || "Confirmed"}</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                            {appointments.filter(a => a.status === 'confirmed').length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="pt-6">
                    {isLoading ? (
                        <div className="flex justify-center p-8">Loading...</div>
                    ) : filteredAppointments.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            {t('noResults') || "No appointments found matching your search."}
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('tenant') || "Tenant ID"}</TableHead>
                                        <TableHead>{t('customer') || "Customer"}</TableHead>
                                        <TableHead>{t('dateTime') || "Date & Time"}</TableHead>
                                        <TableHead>{t('type') || "Type"}</TableHead>
                                        <TableHead>{t('status') || "Status"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAppointments.map((appt) => (
                                        <TableRow key={appt.id}>
                                            <TableCell className="font-mono text-xs max-w-[120px] truncate">
                                                {appt.chatbotId}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{appt.customerName}</span>
                                                    <span className="text-xs text-muted-foreground">{appt.customerEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{appt.date}</span>
                                                    <span className="text-xs text-muted-foreground">{appt.time}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{appt.type}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                {getStatusBadge(appt.status)}
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
