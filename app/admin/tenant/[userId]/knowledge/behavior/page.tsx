import { KnowledgeBehaviorContent } from "@/components/knowledge/content/knowledge-behavior-content"

interface PageProps {
    params: {
        userId: string
    }
}

export default function KnowledgeBehaviorPage({ params }: PageProps) {
    return <KnowledgeBehaviorContent userId={params.userId} />
}
