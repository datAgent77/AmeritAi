import { BaseEcommercePlatform } from "../base-platform"
import type { EcomProduct, EcomOrder, EcomOrderStatus, EcomCoupon } from "../types"

export class TicimaxAdapter extends BaseEcommercePlatform {
    readonly platform = "ticimax" as const

    private get baseUrl(): string {
        return (this.credentials.storeUrl || "").replace(/\/$/, "")
    }

    private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
        const res = await fetch(`${this.baseUrl}/servis/api${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${this.credentials.accessToken || ""}`,
                "Content-Type": "application/json",
                ...(options.headers || {}),
            },
        })
        if (!res.ok) throw new Error(`Ticimax ${res.status}: ${res.statusText}`)
        return res.json() as Promise<T>
    }

    async testConnection(): Promise<{ ok: boolean; storeName?: string; storeUrl?: string; error?: string }> {
        try {
            const data = await this.request<{ FirmaBilgileri?: { FirmaAdi?: string } }>("/magaza/bilgi")
            return {
                ok: true,
                storeName: data.FirmaBilgileri?.FirmaAdi,
                storeUrl: this.baseUrl,
            }
        } catch (e: any) {
            return { ok: false, error: e.message }
        }
    }

    async getProducts(params?: { limit?: number; page?: number }): Promise<EcomProduct[]> {
        const qs = new URLSearchParams()
        qs.set("Limit", String(params?.limit ?? 100))
        qs.set("Page", String(params?.page ?? 1))

        const data = await this.request<{ Urunler?: any[] }>(`/urun/liste?${qs}`)
        return (data.Urunler || []).map(p => ({
            platformId: String(p.UrunId || p.Id),
            sku: p.StokKodu,
            name: p.UrunAdi,
            description: p.UrunAciklamasi || "",
            price: parseFloat(p.SatisFiyati || p.Fiyat || "0"),
            compareAtPrice: p.ListeFiyati ? parseFloat(p.ListeFiyati) : undefined,
            currency: "TRY",
            stock: parseInt(p.StokMiktari || "0"),
            images: p.ResimUrl ? [p.ResimUrl] : (p.Resimler || []).map((r: any) => r.Url || r),
            category: p.KategoriAdi || "",
            tags: [],
            variants: (p.Varyantlar || []).map((v: any) => ({
                id: String(v.VaryantId),
                sku: v.StokKodu,
                title: v.VaryantAdi,
                attributes: {},
                price: parseFloat(v.Fiyat || p.SatisFiyati || "0"),
                stock: parseInt(v.StokMiktari || "0"),
            })),
            url: p.UrunUrl ? `${this.baseUrl}${p.UrunUrl}` : undefined,
            isActive: p.Aktif !== false && p.Durum !== 0,
        }))
    }

    async getOrders(params?: { limit?: number; page?: number; status?: string; customerEmail?: string }): Promise<EcomOrder[]> {
        const qs = new URLSearchParams()
        qs.set("Limit", String(params?.limit ?? 100))
        qs.set("Page", String(params?.page ?? 1))

        const data = await this.request<{ Siparisler?: any[] }>(`/siparis/liste?${qs}`)
        const statusMap: Record<number, EcomOrderStatus> = {
            1: "pending", 2: "confirmed", 3: "processing", 4: "shipped", 5: "delivered",
            6: "cancelled", 7: "refunded",
        }

        return (data.Siparisler || []).map(o => ({
            platformId: String(o.SiparisId || o.Id),
            orderNumber: o.SiparisNo || String(o.SiparisId),
            status: statusMap[o.Durum] || "pending",
            items: (o.SiparisUrunleri || o.Urunler || []).map((li: any) => ({
                productId: String(li.UrunId),
                sku: li.StokKodu,
                name: li.UrunAdi,
                quantity: li.Adet,
                price: parseFloat(li.BirimFiyat || li.Fiyat || "0"),
                currency: "TRY",
            })),
            customer: {
                name: o.MusteriAdiSoyadi || `${o.Ad || ""} ${o.Soyad || ""}`.trim(),
                email: o.Email,
                phone: o.Telefon,
            },
            shippingAddress: {
                name: o.TeslimatAdiSoyadi || o.MusteriAdiSoyadi,
                line1: o.TeslimatAdres || "",
                city: o.TeslimatSehir || "",
                province: o.TeslimatIlce,
                postalCode: o.TeslimatPostaKodu,
                country: "TR",
                phone: o.TeslimatTelefon,
            },
            subtotal: parseFloat(o.AraToplamTutar || o.Tutar || "0"),
            shippingCost: parseFloat(o.KargoTutari || "0"),
            discount: parseFloat(o.IndirimTutari || "0"),
            total: parseFloat(o.GenelToplamTutar || o.ToplamTutar || "0"),
            currency: "TRY",
            trackingNumber: o.KargoTakipNo,
            cargoCompany: o.KargoFirmasi,
            notes: o.Not || "",
            createdAt: o.OlusturmaTarihi || o.Tarih,
            updatedAt: o.GuncellemeTarihi,
        }))
    }

    async createCoupon(coupon: EcomCoupon): Promise<{ code: string; platformCouponId?: string } | null> {
        try {
            const data = await this.request<{ KuponId?: string; Kod?: string }>("/kupon/ekle", {
                method: "POST",
                body: JSON.stringify({
                    Kod: coupon.code,
                    IndirImTip: coupon.discountType === "percent" ? 1 : 2,
                    IndirImDeger: coupon.discountValue,
                    MinSiparisTutari: coupon.minOrderAmount,
                    KullanImSayisi: coupon.usageLimit,
                    BitisT: coupon.expiresAt,
                }),
            })
            return { code: coupon.code, platformCouponId: data.KuponId }
        } catch {
            return null
        }
    }
}
