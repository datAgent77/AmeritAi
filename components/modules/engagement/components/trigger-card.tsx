import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Clock, Layout, MessageCircle, Trash2, Plus } from "lucide-react"
import { EngagementSettings, BubbleMessage } from "../types"

interface TriggerCardProps {
    id: keyof EngagementSettings['triggers'] & string
    label: string
    description: string
    configInput?: React.ReactNode
    messageListKey: keyof EngagementSettings['triggers'] & string
    settings: EngagementSettings
    setSettings: React.Dispatch<React.SetStateAction<EngagementSettings>>
}

const numericTriggerDefaults: Record<string, number> = {
    scrollDepth: 50,
    inactivity: 30,
    pageRevisit: 2,
    timeOnPage: 10,
    clickCount: 3,
}

export function TriggerCard({ id, label, description, configInput, messageListKey, settings, setSettings }: TriggerCardProps) {
    const messages = (settings.triggers[messageListKey] as BubbleMessage[]) || [];
    const rawTriggerValue = (settings.triggers as Record<string, unknown>)[id]
    const numericDefault = numericTriggerDefaults[id]
    const isNumericTrigger = numericDefault !== undefined

    const addMessage = () => {
        const newMessage: BubbleMessage = {
            id: Math.random().toString(36).substr(2, 9),
            text: '',
            isActive: true,
            delay: 0
        };
        const newMessages = [...messages, newMessage];
        setSettings(p => ({
            ...p,
            triggers: {
                ...p.triggers,
                [messageListKey]: newMessages
            }
        }));
    }

    const updateMessage = (msgId: string, txt: string) => {
        const newMessages = messages.map(m => m.id === msgId ? { ...m, text: txt } : m);
        setSettings(p => ({
            ...p,
            triggers: { ...p.triggers, [messageListKey]: newMessages }
        }));
    }

    const deleteMessage = (msgId: string) => {
        const newMessages = messages.filter(m => m.id !== msgId);
        setSettings(p => ({
            ...p,
            triggers: { ...p.triggers, [messageListKey]: newMessages }
        }));
    }

    const toggleEnable = (checked: boolean) => {
        setSettings(p => {
            const currentValue = (p.triggers as Record<string, unknown>)[id]
            const currentNumber = typeof currentValue === 'number' ? currentValue : 0
            return {
                ...p,
                triggers: {
                    ...p.triggers,
                    [id]: isNumericTrigger
                        ? (checked ? (currentNumber > 0 ? currentNumber : numericDefault) : 0)
                        : checked
                }
            }
        })
    }

    const isEnabled = isNumericTrigger
        ? (rawTriggerValue === true || (typeof rawTriggerValue === 'number' && rawTriggerValue > 0))
        : rawTriggerValue === true;

    // Action Type key
    const actionTypeKey = `${id}ActionType` as keyof EngagementSettings['triggers'];
    const currentActionType = (settings.triggers[actionTypeKey] as 'bubble' | 'openWidget') || 'bubble';

    const setActionType = (type: 'bubble' | 'openWidget') => {
        setSettings(p => ({
            ...p,
            triggers: {
                ...p.triggers,
                [actionTypeKey]: type
            }
        }));
    };

    return (
        <div className="flex flex-col gap-4 p-5 bg-card border rounded-xl shadow-sm transition-all hover:border-primary/20">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <div className="font-semibold text-base flex items-center gap-2">
                        {label}
                        {messages.length > 0 && <Badge variant="secondary" className="text-[10px] h-5 px-1.5">{messages.length}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
                <div className="flex items-center gap-4">
                    {configInput}
                    <Switch checked={isEnabled} onCheckedChange={toggleEnable} />
                </div>
            </div>

            {isEnabled && (
                <div className="mt-2 pl-4 border-l-2 border-muted space-y-3 animate-in fade-in slide-in-from-top-2">
                    {/* Action Type Selector */}
                    <div className="flex items-center gap-3 text-sm">
                        <span className="text-muted-foreground">Ne Olsun?</span>
                        <div className="flex gap-1 bg-muted/50 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setActionType('bubble')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentActionType === 'bubble' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <MessageCircle className="w-3 h-3 inline-block mr-1.5" />
                                Baloncuk
                            </button>
                            <button
                                type="button"
                                onClick={() => setActionType('openWidget')}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${currentActionType === 'openWidget' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <Layout className="w-3 h-3 inline-block mr-1.5" />
                                Widget Aç
                            </button>
                        </div>
                    </div>

                    {/* Message List (Only shown if actionType is 'bubble') */}
                    {currentActionType === 'bubble' && (
                        <>
                            <div className="space-y-2">
                                {messages.map((msg, idx) => (
                                    <div key={msg.id || idx} className="flex gap-2 items-start group">
                                        <div className="pt-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5"></div>
                                        </div>
                                        <Textarea
                                            value={msg.text}
                                            onChange={(e) => updateMessage(msg.id, e.target.value)}
                                            placeholder="Ziyaretçiye ne söylemek istersiniz?"
                                            className="min-h-[60px] text-sm resize-none bg-background/50 focus:bg-background flex-1"
                                        />
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-1 bg-background/50 border rounded-md px-2 h-8" title="Görüntülenme Süresi (sn)">
                                                <Clock className="w-3 h-3 text-muted-foreground" />
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="w-8 text-xs bg-transparent border-none focus:outline-none text-center p-0"
                                                    value={msg.duration !== undefined ? msg.duration : 5}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        const newMessages = messages.map(m => m.id === msg.id ? { ...m, duration: val >= 0 ? val : 0 } : m);
                                                        setSettings(p => ({
                                                            ...p,
                                                            triggers: { ...p.triggers, [messageListKey]: newMessages }
                                                        }));
                                                    }}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => deleteMessage(msg.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <Button
                                variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground"
                                onClick={addMessage}
                            >
                                <Plus className="w-3 h-3 mr-1.5" />
                                Mesaj Ekle
                            </Button>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}
