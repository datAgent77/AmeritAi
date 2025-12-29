
"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { useLanguage } from "@/context/LanguageContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Loader2, Image as ImageIcon, QrCode } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface MenuItem {
    id: string
    name: string
    description: string
    price: number
    currency: string
    category: string
    imageUrl: string
    // Time availability
    availableStart?: string // "09:00"
    availableEnd?: string // "11:00"
}

export function MenuManager() {
    const { user } = useAuth()
    const { t } = useLanguage()
    const { toast } = useToast()
    const router = useRouter()

    const [items, setItems] = useState<MenuItem[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

    // Form states
    const [formData, setFormData] = useState<Partial<MenuItem>>({
        currency: "TRY"
    })
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (user) {
            fetchItems()
        }
    }, [user])

    const fetchItems = async () => {
        try {
            const token = await user?.getIdToken()
            const res = await fetch("/api/menu", {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setItems(data.items || [])
            }
        } catch (error) {
            console.error("Failed to fetch menu items", error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm(t('confirmDelete') || "Are you sure?")) return

        try {
            const token = await user?.getIdToken()
            const res = await fetch(`/api/menu/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })

            if (res.ok) {
                setItems(items.filter(i => i.id !== id))
                toast({ title: "Deleted", description: "Item removed from menu." })
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete item.", variant: "destructive" })
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            const token = await user?.getIdToken()
            const url = editingItem ? `/api/menu/${editingItem.id}` : "/api/menu"
            const method = editingItem ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                const savedItem = await res.json()
                if (editingItem) {
                    setItems(items.map(i => i.id === savedItem.id ? savedItem : i))
                } else {
                    setItems([...items, savedItem])
                }
                setIsDialogOpen(false)
                toast({ title: "Success", description: "Menu item saved." })
            } else {
                throw new Error("Failed to save")
            }
        } catch (error) {
            toast({ title: "Error", description: "Failed to save item.", variant: "destructive" })
        } finally {
            setIsSaving(false)
        }
    }

    const openEdit = (item: MenuItem) => {
        setEditingItem(item)
        setFormData(item)
        setIsDialogOpen(true)
    }

    const openNew = () => {
        setEditingItem(null)
        setFormData({ currency: "TRY", category: "General" })
        setIsDialogOpen(true)
    }

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.push("/console/menu/qr")}>
                    <QrCode className="mr-2 h-4 w-4" />
                    {t('qrCodes') || "QR Codes"}
                </Button>
                <Button onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    {t('addMenuItem') || "Add Item"}
                </Button>
            </div>

            <div className="border rounded-lg bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    No items found. Add your first menu item.
                                </TableCell>
                            </TableRow>
                        ) : items.map((item) => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {item.imageUrl ? (
                                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <ImageIcon className="h-5 w-5 text-gray-400" />
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">
                                    {item.name}
                                    <div className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</div>
                                </TableCell>
                                <TableCell>{item.category}</TableCell>
                                <TableCell>{item.price} {item.currency}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingItem ? "Edit Item" : "New Menu Item"}</DialogTitle>
                        <DialogDescription>Add details about your dish or drink.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Price</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.price || ""}
                                    onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={formData.description || ""}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Input
                                    value={formData.category || ""}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g. Salads"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <Input
                                    value={formData.imageUrl || ""}
                                    onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
