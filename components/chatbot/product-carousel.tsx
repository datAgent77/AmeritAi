import React from "react";
import { ProductCard } from "@/components/chatbot/product-card";

type ProductItem = {
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
};

interface ProductCarouselProps {
    products: ProductItem[];
    brandColor?: string;
    language?: string;
}

export function ProductCarousel({ products, brandColor = "#000000", language }: ProductCarouselProps) {
    if (!products.length) return null;

    return (
        <div className="my-3 w-full max-w-full overflow-hidden">
            <div
                className="flex w-full max-w-full gap-3 overflow-x-auto overflow-y-hidden pb-2 snap-x snap-mandatory scroll-smooth [overscroll-behavior-x:contain] [touch-action:pan-x] [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]"
            >
                {products.map((product, idx) => (
                    <div key={`${product.name}-${idx}`} className="snap-start shrink-0 w-[200px] sm:w-[220px]">
                        <ProductCard product={product} brandColor={brandColor} language={language} />
                    </div>
                ))}
            </div>
        </div>
    );
}
