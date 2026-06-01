import React from "react";
import Image from "next/image";
import { ExternalLink, Package } from "lucide-react";

interface Product {
    name: string;
    price: string | number;
    currency?: string;
    imageUrl?: string;
    url?: string;
    sourceUrl?: string;
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

type SupportedLang = "tr" | "en" | "de" | "fr" | "es";

const LABELS: Record<SupportedLang, { viewDetails: string; detailsUnavailable: string; viewProductTitle: string; soldOut: string; lastItems: (count: number) => string }> = {
    tr: {
        viewDetails: "Ürün Detayı",
        detailsUnavailable: "Detay Bulunamadı",
        viewProductTitle: "Ürünü Gör",
        soldOut: "Tükendi",
        lastItems: (count) => `Son ${count} adet`,
    },
    en: {
        viewDetails: "View Details",
        detailsUnavailable: "Details Unavailable",
        viewProductTitle: "View Product",
        soldOut: "Sold out",
        lastItems: (count) => `Only ${count} left`,
    },
    de: {
        viewDetails: "Details ansehen",
        detailsUnavailable: "Keine Details",
        viewProductTitle: "Produkt ansehen",
        soldOut: "Ausverkauft",
        lastItems: (count) => `Nur ${count} übrig`,
    },
    fr: {
        viewDetails: "Voir le détail",
        detailsUnavailable: "Détails indisponibles",
        viewProductTitle: "Voir le produit",
        soldOut: "Épuisé",
        lastItems: (count) => `Plus que ${count}`,
    },
    es: {
        viewDetails: "Ver detalle",
        detailsUnavailable: "Detalle no disponible",
        viewProductTitle: "Ver producto",
        soldOut: "Agotado",
        lastItems: (count) => `Solo quedan ${count}`,
    },
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

export function ProductCard({ product, brandColor = "#000000", language }: ProductCardProps) {
    const lang = resolveLanguage(language);
    const copy = LABELS[lang];
    const productUrl = product.url || product.sourceUrl || "";
    const hasProductUrl = typeof productUrl === "string" && productUrl.trim().length > 0;

    return (
        <div className="my-2 flex w-full max-w-[240px] flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md transition-shadow duration-300 hover:shadow-lg">
            <div className="group relative h-32 w-full overflow-hidden bg-gray-100">
                {product.imageUrl ? (
                    <div className="relative h-full w-full">
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
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                        <Package className="h-8 w-8 opacity-20" />
                    </div>
                )}
                {product.price && (
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                        {formatPrice(product.price, product.currency)}
                    </div>
                )}
                {product.inStock === false && (
                    <div className="absolute left-2 top-2 rounded-full bg-zinc-800/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {copy.soldOut}
                    </div>
                )}
                {product.inStock !== false && product.stockQuantity != null && product.stockQuantity <= (product.lowStockThreshold ?? 5) && product.stockQuantity > 0 && (
                    <div className="absolute left-2 top-2 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {copy.lastItems(product.stockQuantity)}
                    </div>
                )}
            </div>

            <div className="flex flex-1 flex-col p-3">
                <h4 className="mb-1 line-clamp-2 text-sm font-semibold text-gray-800" title={product.name}>
                    {product.name}
                </h4>

                {product.description && (
                    <p className="mb-3 line-clamp-2 flex-1 text-xs text-gray-500">
                        {product.description}
                    </p>
                )}

                <div className="mt-auto">
                    {hasProductUrl ? (
                        <a
                            href={productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex w-full items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 active:scale-95"
                            style={{ backgroundColor: brandColor }}
                            title={copy.viewProductTitle}
                        >
                            <ExternalLink className="h-3 w-3" />
                            {copy.viewDetails}
                        </a>
                    ) : (
                        <button
                            type="button"
                            disabled
                            className="flex w-full cursor-not-allowed items-center justify-center gap-1 rounded-lg bg-gray-200 px-3 py-2 text-xs font-medium text-gray-500"
                        >
                            {copy.detailsUnavailable}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
