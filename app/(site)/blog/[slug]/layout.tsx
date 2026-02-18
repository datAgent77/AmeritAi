import type { Metadata } from "next";
import { SEED_BLOG_POSTS } from "@/lib/seed-cms-data";

const baseUrl = "https://www.getvion.com";
const BLOG_IMAGE_FALLBACK = "/blog/customer-service-ai.jpg";

function resolveBlogImage(image: string | undefined) {
    if (!image || !image.trim()) return BLOG_IMAGE_FALLBACK;
    return image;
}

export async function generateMetadata(
    { params }: { params: { slug: string } }
): Promise<Metadata> {
    const post = SEED_BLOG_POSTS.find((item) => item.slug === params.slug);

    if (!post) {
        return {
            title: "Blog | Vion AI",
            description: "Insights and updates from Vion AI.",
            alternates: {
                canonical: `${baseUrl}/blog/${params.slug}`
            }
        };
    }

    return {
        title: post.title.en,
        description: post.excerpt.en,
        alternates: {
            canonical: `${baseUrl}/blog/${post.slug}`
        },
        openGraph: {
            type: "article",
            title: post.title.en,
            description: post.excerpt.en,
            url: `${baseUrl}/blog/${post.slug}`,
            siteName: "Vion AI",
            images: [
                {
                    url: `${baseUrl}${resolveBlogImage(post.image)}`,
                    alt: post.title.en
                }
            ],
            publishedTime: post.date
        },
        twitter: {
            card: "summary_large_image",
            title: post.title.en,
            description: post.excerpt.en,
            images: [`${baseUrl}${resolveBlogImage(post.image)}`]
        }
    };
}

export default function BlogPostLayout({
    children
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
