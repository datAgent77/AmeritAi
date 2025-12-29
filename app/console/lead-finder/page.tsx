"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Download, Loader2, MapPin, Globe, Phone, Star } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"

interface Lead {
    title: string
    address: string
    phoneNumber?: string
    website?: string
    rating?: number
    reviews?: number
    category?: string
}

export default function LeadFinderPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [leads, setLeads] = useState<Lead[]>([])

    const [searchParams, setSearchParams] = useState({
        keyword: "",
        location: ""
    })

    const handleSearch = async () => {
        if (!searchParams.keyword || !searchParams.location) {
            toast({
                title: "Missing Information",
                description: "Please enter both a keyword and a location.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        setLeads([])

        try {
            const response = await fetch("/api/lead-finder/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(searchParams)
            })

            const data = await response.json()

            if (response.ok) {
                setLeads(data.leads || [])
                toast({
                    title: "Search Complete",
                    description: `Found ${data.leads?.length || 0} leads.`
                })
            } else {
                throw new Error(data.error || "Failed to fetch leads")
            }
        } catch (error) {
            console.error("Search error:", error)
            toast({
                title: "Error",
                description: "Failed to find leads. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleExport = () => {
        if (leads.length === 0) return

        // Convert to CSV
        const headers = ["Name", "Address", "Phone", "Website", "Rating", "Reviews"]
        const csvContent = [
            headers.join(","),
            ...leads.map(lead => [
                `"${lead.title}"`,
                `"${lead.address}"`,
                `"${lead.phoneNumber || ''}"`,
                `"${lead.website || ''}"`,
                lead.rating || 0,
                lead.reviews || 0
            ].join(","))
        ].join("\n")

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", `leads_${searchParams.keyword}_${searchParams.location}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Lead Finder</h1>
                <p className="text-muted-foreground">Find potential B2B customers and extract contact details from Google Maps.</p>
            </div>

            {/* Search Section */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Criteria</CardTitle>
                    <CardDescription>Enter your target industry and location to find leads.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] items-end">
                        <div className="space-y-2">
                            <Label>Keyword / Industry</Label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="e.g. Dentists, Real Estate Agents, Pizza"
                                    className="pl-9"
                                    value={searchParams.keyword}
                                    onChange={(e) => setSearchParams({ ...searchParams, keyword: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <div className="relative">
                                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="e.g. Istanbul, New York, London"
                                    className="pl-9"
                                    value={searchParams.location}
                                    onChange={(e) => setSearchParams({ ...searchParams, location: e.target.value })}
                                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                />
                            </div>
                        </div>
                        <Button onClick={handleSearch} disabled={isLoading} className="w-full md:w-auto">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    Find Leads
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Section */}
            {leads.length > 0 && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle>Results ({leads.length})</CardTitle>
                            <CardDescription>Leads found for &quot;{searchParams.keyword}&quot; in &quot;{searchParams.location}&quot;</CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleExport}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Address</TableHead>
                                        <TableHead>Rating</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leads.map((lead, index) => (
                                        <TableRow key={index}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{lead.title}</span>
                                                    <span className="text-xs text-muted-foreground">{lead.category}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col space-y-1">
                                                    {lead.phoneNumber && (
                                                        <div className="flex items-center text-sm text-muted-foreground">
                                                            <Phone className="mr-2 h-3 w-3" />
                                                            {lead.phoneNumber}
                                                        </div>
                                                    )}
                                                    {lead.website && (
                                                        <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-500 hover:underline">
                                                            <Globe className="mr-2 h-3 w-3" />
                                                            Website
                                                        </a>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground" title={lead.address}>
                                                {lead.address}
                                            </TableCell>
                                            <TableCell>
                                                {lead.rating ? (
                                                    <Badge variant="secondary" className="flex w-fit items-center gap-1">
                                                        <Star className="h-3 w-3 fill-primary text-primary" />
                                                        {lead.rating} <span className="text-xs text-muted-foreground">({lead.reviews})</span>
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm">Details</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
