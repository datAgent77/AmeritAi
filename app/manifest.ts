import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Vion AI",
        short_name: "Vion",
        description: "AI-powered sales and support chatbot for businesses.",
        start_url: "/",
        display: "standalone",
        background_color: "#0A0A0A",
        theme_color: "#0A0A0A",
        lang: "en",
        icons: [
            {
                src: "/favicon.png",
                sizes: "512x512",
                type: "image/png"
            },
            {
                src: "/vion-logo-icon-dark.png",
                sizes: "800x800",
                type: "image/png"
            }
        ]
    };
}
