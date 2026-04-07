import WidgetTestClient from "./widget-test-client"

type WidgetTestPageProps = {
    searchParams?: {
        id?: string | string[]
    }
}

export default function WidgetTestPage({ searchParams }: WidgetTestPageProps) {
    const rawId = searchParams?.id
    const chatbotId = Array.isArray(rawId) ? rawId[0] : rawId

    return <WidgetTestClient chatbotId={chatbotId ?? null} />
}
