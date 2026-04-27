"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Product } from "@/lib/products"
import { Loader2 } from "lucide-react"

interface ProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onClose: (shouldRefresh: boolean) => void
    product?: Product
    userId?: string
}

export function ProductDialog({ open, onOpenChange, onClose, product, userId }: ProductDialogProps) {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)

    // Form States
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [price, setPrice] = useState("")
    const [currency, setCurrency] = useState("USD")
    const [category, setCategory] = useState("")
    const [url, setUrl] = useState("")
    const [imageUrl, setImageUrl] = useState("")
    const [inStock, setInStock] = useState(true)

    useEffect(() => {
        if (product) {
            setName(product.name)
            setDescription(product.description)
            setPrice(product.price.toString())
            setCurrency(product.currency)
            setCategory(product.category || "")
            setUrl(product.url || "")
            setImageUrl(product.imageUrl || "")
            setInStock(product.inStock)
        } else {
            // Reset form for new product
            setName("")
            setDescription("")
            setPrice("")
            setCurrency("USD")
            setCategory("")
            setUrl("")
            setImageUrl("")
            setInStock(true)
        }
    }, [product, open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!userId) return

        setIsLoading(true)

        try {
            const productData = {
                chatbotId: userId,
                name,
                description,
                price: parseFloat(price),
                currency,
                category,
                url,
                imageUrl,
                inStock
            }

            let response;
            if (product?.id) {
                // Update
                response = await fetch("/api/shopper/products", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: product.id, ...productData })
                })
            } else {
                // Create
                response = await fetch("/api/shopper/products", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(productData)
                })
            }

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `Product ${product ? 'updated' : 'created'} successfully.`
                })
                onClose(true)
            } else {
                throw new Error("Failed to save product")
            }

        } catch (error) {
            console.error("Error saving product:", error)
            toast({
                title: "Error",
                description: "Failed to save product.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 flex flex-col max-h-[90vh]">
                <DialogHeader className="px-8 pt-8 pb-4 shrink-0 border-b">
                    <DialogTitle>{product ? "Edit Product" : "Add New Product"}</DialogTitle>
                    <DialogDescription>
                        {product ? "Update the details of your product." : "Add a new product to your catalog."}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col min-h-0">
                    <div className="grid gap-4 py-6 px-8 overflow-y-auto">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Product Name *</Label>
                            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description *</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="price">Price *</Label>
                                <Input id="price" type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Select value={currency} onValueChange={setCurrency}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select currency" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="USD">USD ($)</SelectItem>
                                        <SelectItem value="EUR">EUR (€)</SelectItem>
                                        <SelectItem value="GBP">GBP (£)</SelectItem>
                                        <SelectItem value="TRY">TRY (₺)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electronics, Clothing" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="url">Product URL</Label>
                            <Input id="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/product/123" />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="imageUrl">Image URL</Label>
                            <Input id="imageUrl" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg" />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch id="inStock" checked={inStock} onCheckedChange={setInStock} />
                            <Label htmlFor="inStock">In Stock</Label>
                        </div>
                    </div>
                    <DialogFooter className="px-8 py-6 shrink-0 border-t bg-muted/20">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Product
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
