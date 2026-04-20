export interface Prize {
    name: string
    probability: number  // 0-100, must sum to 100
    couponCode?: string
    discountType?: "percent" | "fixed"
    discountValue?: number
    color?: string       // hex for wheel segment
}

export interface SpinResult {
    prizeIndex: number
    prize: Prize
    couponCode?: string
}

export function pickPrize(prizes: Prize[]): SpinResult {
    if (!prizes.length) throw new Error("No prizes configured")

    const total = prizes.reduce((s, p) => s + (p.probability ?? 0), 0)
    if (total <= 0) throw new Error("Invalid prize probabilities")

    const rand = Math.random() * total
    let cumulative = 0

    for (let i = 0; i < prizes.length; i++) {
        cumulative += prizes[i].probability
        if (rand < cumulative) {
            return {
                prizeIndex: i,
                prize: prizes[i],
                couponCode: prizes[i].couponCode,
            }
        }
    }

    // Fallback to last
    const last = prizes[prizes.length - 1]
    return { prizeIndex: prizes.length - 1, prize: last, couponCode: last.couponCode }
}

export function normalizeProbabilities(prizes: Prize[]): Prize[] {
    const total = prizes.reduce((s, p) => s + (p.probability ?? 0), 0)
    if (total === 0) return prizes
    return prizes.map(p => ({ ...p, probability: (p.probability / total) * 100 }))
}
