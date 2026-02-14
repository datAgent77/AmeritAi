import type { Metadata } from "next";
import { getModule } from "@/lib/modules-registry";

const baseUrl = "https://www.getvion.com";

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const moduleDef = getModule(params.slug as any);

    if (!moduleDef) {
        return {
            title: "Product | Vion AI",
            description: "Explore Vion AI product capabilities.",
            alternates: {
                canonical: `${baseUrl}/products/${params.slug}`
            }
        };
    }

    return {
        title: `${moduleDef.name.en} | Vion AI`,
        description: moduleDef.description.en,
        alternates: {
            canonical: `${baseUrl}/products/${params.slug}`
        },
        openGraph: {
            title: `${moduleDef.name.en} | Vion AI`,
            description: moduleDef.description.en,
            url: `${baseUrl}/products/${params.slug}`,
            type: "website",
            siteName: "Vion AI"
        },
        twitter: {
            card: "summary_large_image",
            title: `${moduleDef.name.en} | Vion AI`,
            description: moduleDef.description.en
        }
    };
}

export default function ProductSlugLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
