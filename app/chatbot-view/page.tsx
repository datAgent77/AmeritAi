import dynamic from "next/dynamic"
import { WidgetLoader } from "./components/WidgetLoader"

const ChatbotContainer = dynamic(() => import("./ChatbotContainer"), {
    ssr: false,
    loading: () => <WidgetLoader loaderStyle="skeleton" ambientBottomMargin={0} showAmbientIcon={false} />,
})

export default function ChatbotView() {
    return <ChatbotContainer />
}
