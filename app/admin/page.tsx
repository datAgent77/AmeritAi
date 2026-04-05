import { permanentRedirect } from "next/navigation"

export default function AdminRootPage() {
  permanentRedirect("/console/chatbot")
}
