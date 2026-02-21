import sys
import re

file_path = "/Users/yasincelenk/Desktop/Works/_Ai Project/Vion Ai/vion-ai/components/widget-settings/tabs/appearance-tab.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to extract Accordion items
# <AccordionItem value="xxxx" ... > ... </AccordionItem>
def extract_accordion(value):
    pattern = r'<AccordionItem value="' + value + r'".*?</AccordionItem>'
    match = re.search(pattern, content, flags=re.DOTALL)
    if match:
        return match.group(0)
    return ""

brand_settings = extract_accordion("brand-settings")
suggested_questions = extract_accordion("suggested-questions")
business_hours = extract_accordion("business-hours")

widget_position = extract_accordion("widget-position")
header_customization = extract_accordion("header-customization")
launcher_settings = extract_accordion("launcher-settings")
effects_spacing = extract_accordion("effects-spacing")

# Clean up widget_position (Remove Chat Mode and Ambient parts)
# The Chat Modu label block:
chat_mode_pattern = r'<div className="grid gap-2">\s*<Label>\{language === \'tr\' \? \'Chat Modu\' : \'Chat Mode\'\}</Label>.*?</div>'
widget_position = re.sub(chat_mode_pattern, '', widget_position, flags=re.DOTALL)

ambient_sliders_pattern = r'\{isAmbientMode && \(\s*<div className="grid md:grid-cols-2 gap-4">.*?</div>\s*\)\}'
widget_position = re.sub(ambient_sliders_pattern, '', widget_position, flags=re.DOTALL)


# Create the new return block
new_return = f"""
    return (
        <div className="space-y-8">
            {{/* Chat Mode Selection */}}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                <div className="mb-4">
                    <Label className="text-base font-semibold block">{{language === 'tr' ? 'Görünüm Modu' : 'Display Mode'}}</Label>
                    <p className="text-sm text-muted-foreground">{{language === 'tr' ? 'Chatbotun web sitenizde nasıl görüneceğini seçin.' : 'Choose how the chatbot will appear on your website.'}}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button onClick={{() => applyDisplayPreset("classic_launcher")}} className={{`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left ${{!isAmbientMode && !isAlwaysOpenMode ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 bg-background'}}`}}>
                        <span className="font-semibold text-sm mb-1">{{language === 'tr' ? 'Klasik + Başlatıcı' : 'Classic + Launcher'}}</span>
                        <span className="text-xs text-muted-foreground text-center">{{language === 'tr' ? 'Standart ikon ile açılır pencere.' : 'Standard popup window with an icon.'}}</span>
                    </button>
                    <button onClick={{() => applyDisplayPreset("classic_always_open")}} className={{`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left ${{!isAmbientMode && isAlwaysOpenMode ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 bg-background'}}`}}>
                        <span className="font-semibold text-sm mb-1">{{language === 'tr' ? 'Klasik + Hep Açık' : 'Classic + Always Open'}}</span>
                        <span className="text-xs text-muted-foreground text-center">{{language === 'tr' ? 'Başlatıcı yok, doğrudan standart boyutta açık.' : 'No launcher, always opened in standard size.'}}</span>
                    </button>
                    <button onClick={{() => applyDisplayPreset("ambient_always_open")}} className={{`flex flex-col items-center p-4 rounded-xl border-2 transition-all text-left ${{isAmbientMode ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30 bg-background'}}`}}>
                        <span className="font-semibold text-sm mb-1">{{language === 'tr' ? 'Ambient Mod' : 'Ambient Mode'}}</span>
                        <span className="text-xs text-muted-foreground text-center">{{language === 'tr' ? 'Altta yatan devasa geniş premium chat arayüzü.' : 'Wide, premium bottom-fixed chat.'}}</span>
                    </button>
                </div>
            </div>

            {{/* Common Settings */}}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">{{language === 'tr' ? 'Ortak Ayarlar' : 'Common Settings'}}</h3>
                <Accordion type="multiple" defaultValue={{["brand-settings"]}} className="w-full space-y-2">
                    {brand_settings}
                    {suggested_questions}
                    {business_hours}
                </Accordion>
            </div>

            {{/* Mode-Specific Settings */}}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    {{isAmbientMode ? (language === 'tr' ? 'Ambient Ayarları' : 'Ambient Settings') : (language === 'tr' ? 'Klasik Ayarlar' : 'Classic Settings')}}
                </h3>
                
                {{isAmbientMode ? (
                    <Accordion type="single" collapsible defaultValue="ambient-position" className="w-full space-y-2">
                        <AccordionItem value="ambient-position" className="border rounded-lg px-4 bg-card">
                            <AccordionTrigger className="hover:no-underline">
                                <span className="text-sm font-medium">{{t('positionLayout') || 'Pozisyon & Efektler'}}</span>
                            </AccordionTrigger>
                            <AccordionContent className="pt-4 pb-6">
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>{{language === 'tr' ? 'Mesaj Alan Yüksekliği (px)' : 'Message Rail Height (px)'}}</Label>
                                        <Input
                                            type="number"
                                            min={{180}}
                                            max={{420}}
                                            value={{settings.ambientMaxHeight}}
                                            onChange={{(e) => {{
                                                const nextValue = Number(e.target.value) || 260
                                                const clamped = Math.max(180, Math.min(420, nextValue))
                                                setSettings(prev => ({{ ...prev, ambientMaxHeight: clamped }}))
                                            }}}}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>{{language === 'tr' ? 'Arka Plan Siyahlığı (%)' : 'Overlay Opacity (%)'}}</Label>
                                        <Input
                                            type="number"
                                            min={{0}}
                                            max={{90}}
                                            value={{Math.round((settings.ambientOverlayOpacity || 0.55) * 100)}}
                                            onChange={{(e) => {{
                                                const nextValue = Number(e.target.value) || 55
                                                const clamped = Math.max(0, Math.min(90, nextValue))
                                                setSettings(prev => ({{ ...prev, ambientOverlayOpacity: clamped / 100 }}))
                                            }}}}
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                ) : (
                    <Accordion type="single" collapsible defaultValue="widget-position" className="w-full space-y-2">
                        {widget_position}
                        {header_customization}
                        {launcher_settings}
                        {effects_spacing}
                    </Accordion>
                )}}
            </div>
        </div>
    )
}}
"""

# Replace the old return block
# We find the `return (` that is immediately followed by `<Accordion type="single"` 
return_pattern = r'return \(\s*<Accordion type="single" collapsible defaultValue="brand-settings" className="w-full space-y-2">.*?</Accordion>\s*\)\s*\}'
new_content = re.sub(return_pattern, new_return, content, flags=re.DOTALL)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("SUCCESS")
