import React from 'react';
import { ShoppingCart, ExternalLink } from 'lucide-react';
import Image from "next/image";

interface Product {
    name: string;
    price: string | number;
    currency?: string;
    imageUrl?: string;
    url?: string;
    description?: string;
}

interface ProductCardProps {
    product: Product;
    onAddToCart?: (product: Product) => void;
    brandColor?: string;
}

export function ProductCard({ product, onAddToCart, brandColor = '#000000' }: ProductCardProps) {
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
                        <ShoppingCart className="w-8 h-8 opacity-20" />
                    </div>
                )}
                {product.price && (
                    <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-md">
                        {product.currency || '$'}{product.price}
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

                <div className="mt-auto flex gap-2">
                    {product.url && (
                        <a
                            href={product.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex-1"
                            title="View Product"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    )}
                    <button
                        onClick={() => onAddToCart && onAddToCart(product)}
                        className="flex items-center justify-center gap-1 flex-[3] py-2 px-3 rounded-lg text-white text-xs font-medium transition-opacity hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: brandColor }}
                    >
                        <ShoppingCart className="w-3 h-3" />
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    );
}
