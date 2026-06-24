import type { Metadata } from "next";
import { getModule } from "@/lib/modules-registry";

const baseUrl = "https://www.ameritai.com";

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const moduleDef = getModule(params.slug as any);

    if (!moduleDef) {
        return {
            title: "Product | AmeritAI",
            description: "Explore AmeritAI product capabilities.",
            alternates: {
                canonical: `${baseUrl}/products/${params.slug}`
            }
        };
    }

    return {
        title: `${moduleDef.name.en} | AmeritAI`,
        description: moduleDef.description.en,
        alternates: {
            canonical: `${baseUrl}/products/${params.slug}`
        },
        openGraph: {
            title: `${moduleDef.name.en} | AmeritAI`,
            description: moduleDef.description.en,
            url: `${baseUrl}/products/${params.slug}`,
            type: "website",
            siteName: "AmeritAI"
        },
        twitter: {
            card: "summary_large_image",
            title: `${moduleDef.name.en} | AmeritAI`,
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
