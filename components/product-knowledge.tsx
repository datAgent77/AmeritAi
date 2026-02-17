import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, DollarSign, Package, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
    id: string;
    name: string;
    price: number;
    currency: string;
    description: string;
    inStock: boolean;
    imageUrl?: string;
}

interface ProductKnowledgeProps {
    targetUserId?: string;
}

export function ProductKnowledge({ targetUserId }: ProductKnowledgeProps) {
    const { user } = useAuth();
    const { language } = useLanguage();
    const { toast } = useToast();
    const isTr = language === "tr";

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const effectiveUserId = targetUserId || user?.uid;

    const [newProduct, setNewProduct] = useState({
        name: "",
        price: "",
        currency: "USD",
        description: "",
        imageUrl: ""
    });

    const fetchProducts = useCallback(async () => {
        if (!effectiveUserId) return;
        setIsLoading(true);
        setFetchError(null);
        try {
            const response = await fetch(`/api/shopper/products?chatbotId=${effectiveUserId}`);
            if (!response.ok) throw new Error("Failed to fetch products");
            const data = await response.json();
            setProducts(data.products || []);
        } catch (error) {
            console.error("Error fetching products:", error);
            setFetchError(isTr ? "Ürünler yüklenirken bir hata oluştu." : "An error occurred while loading products.");
        } finally {
            setIsLoading(false);
        }
    }, [effectiveUserId, isTr]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (effectiveUserId) {
                void fetchProducts();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [effectiveUserId, fetchProducts]);

    const handleAddProduct = async () => {
        if (!effectiveUserId || !newProduct.name || !newProduct.price) return;
        setIsAdding(true);
        try {
            await addDoc(collection(db, "products"), {
                chatbotId: effectiveUserId,
                name: newProduct.name,
                price: parseFloat(newProduct.price),
                currency: newProduct.currency,
                description: newProduct.description,
                imageUrl: newProduct.imageUrl,
                inStock: true,
                createdAt: serverTimestamp()
            });

            toast({
                title: isTr ? "Başarılı" : "Success",
                description: isTr ? "Ürün kataloğa eklendi." : "Product added to catalog."
            });
            setIsAddDialogOpen(false);
            setNewProduct({ name: "", price: "", currency: "USD", description: "", imageUrl: "" });
            await fetchProducts();
        } catch (error) {
            console.error("Error adding product:", error);
            toast({
                title: isTr ? "Hata" : "Error",
                description: isTr ? "Ürün eklenemedi." : "Failed to add product.",
                variant: "destructive"
            });
        } finally {
            setIsAdding(false);
        }
    };

    const handleDeleteProduct = async (productId: string) => {
        try {
            await deleteDoc(doc(db, "products", productId));
            toast({
                title: isTr ? "Silindi" : "Deleted",
                description: isTr ? "Ürün katalogdan kaldırıldı." : "Product removed from catalog."
            });
            await fetchProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
            toast({
                title: isTr ? "Hata" : "Error",
                description: isTr ? "Ürün silinemedi." : "Failed to delete product.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-medium">{isTr ? "Ürün Kataloğu" : "Product Catalog"}</h2>
                    <p className="text-sm text-gray-500">
                        {isTr ? "AI önerileri için ürünlerinizi yönetin." : "Manage your products for AI recommendations."}
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-black text-white hover:bg-zinc-800">
                            <Plus className="mr-2 h-4 w-4" />
                            {isTr ? "Ürün Ekle" : "Add Product"}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{isTr ? "Yeni Ürün Ekle" : "Add New Product"}</DialogTitle>
                            <DialogDescription>
                                {isTr
                                    ? "AI önerilerinde kullanılmak üzere kataloğunuza ürün ekleyin."
                                    : "Add a product to your catalog for AI recommendations."}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>{isTr ? "Ürün Adı" : "Product Name"}</Label>
                                <Input
                                    value={newProduct.name}
                                    onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                                    placeholder={isTr ? "Örn: Premium Kablosuz Kulaklık" : "e.g. Premium Wireless Headphones"}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <Label>{isTr ? "Fiyat" : "Price"}</Label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            className="pl-8"
                                            type="number"
                                            value={newProduct.price}
                                            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                                            placeholder="99.99"
                                        />
                                    </div>
                                </div>
                                <div className="grid gap-2">
                                    <Label>{isTr ? "Para Birimi" : "Currency"}</Label>
                                    <Input
                                        value={newProduct.currency}
                                        onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
                                        placeholder="USD"
                                    />
                                </div>
                            </div>
                            <div className="grid gap-2">
                                <Label>{isTr ? "Açıklama" : "Description"}</Label>
                                <Textarea
                                    value={newProduct.description}
                                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                                    placeholder={isTr ? "Detaylı ürün açıklaması..." : "Detailed product description..."}
                                    rows={3}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>{isTr ? "Görsel URL (Opsiyonel)" : "Image URL (Optional)"}</Label>
                                <Input
                                    value={newProduct.imageUrl}
                                    onChange={(e) => setNewProduct({ ...newProduct, imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                />
                            </div>
                        </div>
                        <Button onClick={handleAddProduct} disabled={isAdding} className="w-full bg-black text-white hover:bg-zinc-800">
                            {isAdding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isTr ? "Ürün Ekle" : "Add Product"}
                        </Button>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{isTr ? "Ad" : "Name"}</TableHead>
                            <TableHead>{isTr ? "Fiyat" : "Price"}</TableHead>
                            <TableHead>{isTr ? "Durum" : "Status"}</TableHead>
                            <TableHead className="text-right">{isTr ? "İşlemler" : "Actions"}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        ) : fetchError ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <AlertCircle className="h-6 w-6 text-red-500" />
                                        <p>{fetchError}</p>
                                        <Button variant="outline" size="sm" onClick={() => void fetchProducts()}>
                                            {isTr ? "Tekrar Dene" : "Retry"}
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : products.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                                    {isTr ? "Ürün bulunamadı. İlk ürününüzü ekleyin." : "No products found. Add your first product."}
                                </TableCell>
                            </TableRow>
                        ) : (
                            products.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {product.imageUrl ? (
                                                <Image src={product.imageUrl} alt={product.name} width={32} height={32} className="h-8 w-8 rounded object-cover" unoptimized />
                                            ) : (
                                                <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                                    <Package className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            )}
                                            {product.name}
                                        </div>
                                    </TableCell>
                                    <TableCell>{product.price} {product.currency}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={product.inStock ? "border-zinc-300 bg-zinc-100 text-zinc-800" : "border-zinc-400 bg-zinc-200 text-zinc-800"}>
                                            {product.inStock ? (isTr ? "Stokta" : "In Stock") : (isTr ? "Stok Dışı" : "Out of Stock")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => void handleDeleteProduct(product.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
