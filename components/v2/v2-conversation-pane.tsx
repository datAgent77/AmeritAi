import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface V2Message {
  id: string
  role: "user" | "assistant"
  content: string
}

interface V2ConversationPaneProps {
  title: string
  messages: V2Message[]
  className?: string
}

export function V2ConversationPane({ title, messages, className }: V2ConversationPaneProps) {
  return (
    <section className={cn("v2-card flex h-full min-h-[520px] flex-col overflow-hidden", className)}>
      <div className="border-b border-zinc-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      </div>
      <ScrollArea className="flex-1 px-6 py-5">
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
                  message.role === "user"
                    ? "rounded-br-md bg-zinc-900 text-white"
                    : "rounded-bl-md border border-zinc-200 bg-zinc-50 text-zinc-900"
                )}
              >
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </section>
  )
}
