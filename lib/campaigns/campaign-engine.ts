// Campaign Sihirbazı evaluation engine
// Evaluates which campaigns are active based on time, weather, and config

export interface CampaignConfig {
    rainyDay?: {
        enabled: boolean
        discount: number
    }
    happyHour?: {
        enabled: boolean
        startTime: string  // "HH:MM"
        endTime: string    // "HH:MM"
        discount?: number
        message?: string
    }
    flashSale?: {
        enabled: boolean
        prompt: string
        discount?: number
        expiresAt?: string  // ISO string
    }
}

export interface ActiveCampaign {
    type: "rainyDay" | "happyHour" | "flashSale"
    label: string
    discount?: number
    message?: string
    expiresAt?: string
}

export interface WeatherResult {
    isRainy: boolean
    description?: string
    city?: string
}

function isTimeInRange(startHHMM: string, endHHMM: string, nowDate: Date = new Date()): boolean {
    const [sh, sm] = startHHMM.split(":").map(Number)
    const [eh, em] = endHHMM.split(":").map(Number)
    const [nh, nm] = [nowDate.getHours(), nowDate.getMinutes()]
    const now = nh * 60 + nm
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (start <= end) return now >= start && now <= end
    // Crosses midnight
    return now >= start || now <= end
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherResult> {
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) return { isRainy: false }

    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`,
            { next: { revalidate: 1800 } } // cache 30 min
        )
        if (!res.ok) return { isRainy: false }
        const data = await res.json()
        const weatherId: number = data.weather?.[0]?.id ?? 800
        // Weather IDs: 2xx=thunderstorm, 3xx=drizzle, 5xx=rain, 6xx=snow
        const isRainy = weatherId >= 200 && weatherId < 700
        return {
            isRainy,
            description: data.weather?.[0]?.description,
            city: data.name,
        }
    } catch {
        return { isRainy: false }
    }
}

export async function fetchWeatherByCity(city: string): Promise<WeatherResult> {
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) return { isRainy: false }

    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`,
            { next: { revalidate: 1800 } }
        )
        if (!res.ok) return { isRainy: false }
        const data = await res.json()
        const weatherId: number = data.weather?.[0]?.id ?? 800
        const isRainy = weatherId >= 200 && weatherId < 700
        return {
            isRainy,
            description: data.weather?.[0]?.description,
            city: data.name,
        }
    } catch {
        return { isRainy: false }
    }
}

export function evaluateCampaigns(
    config: CampaignConfig,
    weather?: WeatherResult,
    now: Date = new Date()
): ActiveCampaign[] {
    const active: ActiveCampaign[] = []

    // Happy Hour
    if (config.happyHour?.enabled) {
        const { startTime, endTime, discount, message } = config.happyHour
        if (startTime && endTime && isTimeInRange(startTime, endTime, now)) {
            active.push({
                type: "happyHour",
                label: `Happy Hour (${startTime}–${endTime})`,
                discount,
                message: message || `Happy hour aktif! ${startTime}–${endTime} arası özel fiyatlar geçerli.`,
            })
        }
    }

    // Rainy Day
    if (config.rainyDay?.enabled && weather?.isRainy) {
        active.push({
            type: "rainyDay",
            label: "Yağmurlu Gün İndirimi",
            discount: config.rainyDay.discount,
            message: `Bugün hava yağmurlu! ${config.rainyDay.discount ? `%${config.rainyDay.discount} ` : ""}özel indirimden faydalanın.`,
        })
    }

    // Flash Sale
    if (config.flashSale?.enabled) {
        const { prompt, discount, expiresAt } = config.flashSale
        if (expiresAt && new Date(expiresAt) < now) {
            // expired
        } else if (prompt) {
            active.push({
                type: "flashSale",
                label: "Flash İndirim",
                discount,
                message: prompt,
                expiresAt,
            })
        }
    }

    return active
}

export function buildCampaignSystemPromptBlock(activeCampaigns: ActiveCampaign[]): string {
    if (activeCampaigns.length === 0) return ""

    const lines = activeCampaigns.map(c => {
        let line = `- **${c.label}**`
        if (c.discount) line += ` (%${c.discount} indirim)`
        if (c.message) line += `\n  Mesaj: "${c.message}"`
        if (c.expiresAt) line += `\n  Bitiş: ${new Date(c.expiresAt).toLocaleString("tr-TR")}`
        return line
    }).join("\n")

    return `\n\n# AKTİF KAMPANYALAR (Campaign Sihirbazı)
Aşağıdaki kampanyalar şu an aktif. Kullanıcı alışveriş, indirim veya fiyat sorarsa bu bilgileri MUTLAKA paylaş. Uygun bir konuşmada proaktif olarak da belirtebilirsin:

${lines}

KURAL: Kampanya bilgilerini doğal ve samimi bir şekilde ilet. "Şu an özel bir indirimiz var" gibi açıcı ifadeler kullan.`
}
