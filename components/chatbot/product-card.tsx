import React from 'react';
import { ExternalLink, Package } from 'lucide-react';
import Image from "next/image";

interface Product {
    name: string;
    price: string | number;
    currency?: string;
    imageUrl?: string;
    url?: string;
    description?: string;
    stockQuantity?: number;
    inStock?: boolean;
    lowStockThreshold?: number;
}

interface ProductCardProps {
    product: Product;
    brandColor?: string;
    language?: string;
}

type SupportedLang = 'tr' | 'en' | 'de' | 'fr' | 'es';

const LABELS: Record<SupportedLang, { viewDetails: string; detailsUnavailable: string; viewProductTitle: string }> = {
    tr: {
        viewDetails: "Ürün Detayı",
        detailsUnavailable: "Detay Bulunamadı",
        viewProductTitle: "Ürünü Gör"
    },
    en: {
        viewDetails: "View Details",
        detailsUnavailable: "Details Unavailable",
        viewProductTitle: "View Product"
    },
    de: {
        viewDetails: "Details ansehen",
        detailsUnavailable: "Keine Details",
        viewProductTitle: "Produkt ansehen"
    },
    fr: {
        viewDetails: "Voir le détail",
        detailsUnavailable: "Détails indisponibles",
        viewProductTitle: "Voir le produit"
    },
    es: {
        viewDetails: "Ver detalle",
        detailsUnavailable: "Detalle no disponible",
        viewProductTitle: "Ver producto"
    }
};

function resolveLanguage(language?: string): SupportedLang {
    const normalized = (language || "").toLowerCase();
    if (normalized.startsWith("tr")) return "tr";
    if (normalized.startsWith("de")) return "de";
    if (normalized.startsWith("fr")) return "fr";
    if (normalized.startsWith("es")) return "es";
    return "en";
}

function formatPrice(price: string | number | undefined, currency?: string): string {
    if (price === undefined || price === null || price === "") return "";
    const value = String(price);
    const curr = (currency || "TRY").trim();
    const symbolLike = ["₺", "$", "€", "£"].includes(curr);
    return symbolLike ? `${curr}${value}` : `${value} ${curr}`;
}

export function ProductCard({ product, brandColor = '#000000', language }: ProductCardProps) {
    const lang = resolveLanguage(language);
    const copy = LABELS[lang];
    const hasProductUrl = typeof product.url === "string" && product.url.trim().length > 0;

    return (
        <div className="flex flex-col w-full max-w-[240px] bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow duration-300 my-2">
            <div className="relative h-32 w-full bg-gray-100 overflow-hidden group">
                {product.imageUrl ? (
                    <div className="relative w-full h-full">
                        <Image
                            src={product.imageUrl}
                            alt={product.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            sizes="(max-width: 768px) 100vw, 240px"
                            unoptimized
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-400">
                        <Package className="w-8 h-8 opacity-20" />
                    </div>
                )}
                {product.price && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md">
                        {formatPrice(product.price, product.currency)}
                    </div>
                )}
                {product.inStock === false && (
                    <div className="absolute top-2 left-2 bg-zinc-800/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Tükendi
                    </div>
                )}
                {product.inStock !== false && product.stockQuantity != null && product.stockQuantity <= (product.lowStockThreshold ?? 5) && product.stockQuantity > 0 && (
                    <div className="absolute top-2 left-2 bg-amber-500/90 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Son {product.stockQuantity} adet
                    </div>
                )}
            </div>

            <div className="p-3 flex flex-col flex-1">
                <h4 className="font-semibold text-sm text-gray-800 line-clamp-2 mb-1" title={product.name}>
                    {product.name}
                </h4>

                {product.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3 flex-1">
                        {product.description}
                    </p>
                )}

                <div className="mt-auto">
                    {hasProductUrl ? (
                        <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-1 w-full py-2 px-3 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: brandColor }}
                            title={copy.viewProductTitle}
                        >
                            <ExternalLink className="w-3 h-3" />
                            {copy.viewDetails}
                        </a>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="flex items-center justify-center gap-1 w-full py-2 px-3 rounded-lg text-xs font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
                        >
                            {copy.detailsUnavailable}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
