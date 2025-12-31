"use client"

import { useEffect, useState } from "react"
import { auth, db } from "@/lib/firebase"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Save, Building2, Globe, Phone, MapPin, Mail } from "lucide-react"
import { useLanguage } from "@/context/LanguageContext"

interface CompanyData {
    companyName: string
    companyWebsite: string
    companyPhone: string
    companyAddress: string
    companyEmail: string
    industry: string
}

export default function CompanySettingsPage() {
    const { t, language } = useLanguage()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [company, setCompany] = useState<CompanyData>({
        companyName: "",
        companyWebsite: "",
        companyPhone: "",
        companyAddress: "",
        companyEmail: "",
        industry: ""
    })

    useEffect(() => {
        const fetchCompanyData = async () => {
            try {
                const user = auth.currentUser
                if (!user) return

                const userDoc = await getDoc(doc(db, "users", user.uid))
                if (userDoc.exists()) {
                    const data = userDoc.data()
                    setCompany({
                        companyName: data.companyName || "",
                        companyWebsite: data.companyWebsite || "",
                        companyPhone: data.phone || "",
                        companyAddress: data.companyAddress || "",
                        companyEmail: data.email || "",
                        industry: data.industry || ""
                    })
                }
            } catch (error) {
                console.error("Error fetching company data:", error)
            } finally {
                setIsLoading(false)
            }
        }

        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                fetchCompanyData()
            } else {
                setIsLoading(false)
            }
        })

        return () => unsubscribe()
    }, [])

    const handleSave = async () => {
        try {
            setIsSaving(true)
            const user = auth.currentUser
            if (!user) throw new Error("User not authenticated")

            await updateDoc(doc(db, "users", user.uid), {
                companyName: company.companyName,
                companyWebsite: company.companyWebsite,
                phone: company.companyPhone,
                companyAddress: company.companyAddress,
                industry: company.industry,
                updatedAt: new Date().toISOString()
            })

            toast({
                title: language === 'tr' ? "Başarılı" : "Success",
                description: language === 'tr' ? "Şirket bilgileri güncellendi." : "Company details updated successfully.",
            })
        } catch (error: any) {
            console.error("Error saving company data:", error)
            toast({
                title: language === 'tr' ? "Hata" : "Error",
                description: error.message || (language === 'tr' ? "Bilgiler güncellenemedi." : "Failed to update company details."),
                variant: "destructive",
            })
        } finally {
            setIsSaving(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">
                    {language === 'tr' ? "Şirket Bilgileri" : "Company Details"}
                </h2>
                <p className="text-muted-foreground">
                    {language === 'tr'
                        ? "İşletmenizin temel bilgilerini yönetin."
                        : "Manage your business information."}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        {language === 'tr' ? "İşletme Bilgileri" : "Business Information"}
                    </CardTitle>
                    <CardDescription>
                        {language === 'tr'
                            ? "Bu bilgiler chatbot yanıtlarında ve raporlarda kullanılabilir."
                            : "This information may be used in chatbot responses and reports."}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "Şirket Adı" : "Company Name"}
                            </Label>
                            <Input
                                id="companyName"
                                value={company.companyName}
                                onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                                placeholder={language === 'tr' ? "Şirketinizin adı" : "Your company name"}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="industry" className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "Sektör" : "Industry"}
                            </Label>
                            <select
                                id="industry"
                                value={company.industry}
                                onChange={(e) => setCompany({ ...company, industry: e.target.value })}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            >
                                <option value="">{language === 'tr' ? "Seçiniz" : "Select"}</option>
                                <option value="ecommerce">{language === 'tr' ? "E-Ticaret" : "E-Commerce"}</option>
                                <option value="saas">{language === 'tr' ? "SaaS / Yazılım" : "SaaS / Software"}</option>
                                <option value="service">{language === 'tr' ? "Hizmet" : "Service"}</option>
                                <option value="restaurant">{language === 'tr' ? "Restoran" : "Restaurant"}</option>
                                <option value="healthcare">{language === 'tr' ? "Sağlık" : "Healthcare"}</option>
                                <option value="education">{language === 'tr' ? "Eğitim" : "Education"}</option>
                                <option value="finance">{language === 'tr' ? "Finans" : "Finance"}</option>
                                <option value="real_estate">{language === 'tr' ? "Emlak" : "Real Estate"}</option>
                                <option value="booking">{language === 'tr' ? "Seyahat" : "Travel"}</option>
                                <option value="agriculture">{language === 'tr' ? "Tarım" : "Agriculture"}</option>
                                <option value="automotive">{language === 'tr' ? "Otomotiv" : "Automotive"}</option>
                                <option value="insurance">{language === 'tr' ? "Sigorta" : "Insurance"}</option>
                                <option value="logistics">{language === 'tr' ? "Lojistik" : "Logistics"}</option>
                                <option value="beauty">{language === 'tr' ? "Güzellik & Wellness" : "Beauty & Wellness"}</option>
                                <option value="legal">{language === 'tr' ? "Hukuk" : "Legal"}</option>
                                <option value="fitness">{language === 'tr' ? "Spor & Fitness" : "Sports & Fitness"}</option>
                                <option value="retail">{language === 'tr' ? "Perakende" : "Retail"}</option>
                                <option value="other">{language === 'tr' ? "Diğer" : "Other"}</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyWebsite" className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "Web Sitesi" : "Website"}
                            </Label>
                            <Input
                                id="companyWebsite"
                                value={company.companyWebsite}
                                onChange={(e) => setCompany({ ...company, companyWebsite: e.target.value })}
                                placeholder="https://example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="companyPhone" className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "Telefon" : "Phone"}
                            </Label>
                            <Input
                                id="companyPhone"
                                value={company.companyPhone}
                                onChange={(e) => setCompany({ ...company, companyPhone: e.target.value })}
                                placeholder="+90 xxx xxx xxxx"
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="companyAddress" className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "Adres" : "Address"}
                            </Label>
                            <Input
                                id="companyAddress"
                                value={company.companyAddress}
                                onChange={(e) => setCompany({ ...company, companyAddress: e.target.value })}
                                placeholder={language === 'tr' ? "Şirket adresi" : "Company address"}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="companyEmail" className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                {language === 'tr' ? "İletişim E-posta" : "Contact Email"}
                            </Label>
                            <Input
                                id="companyEmail"
                                value={company.companyEmail}
                                disabled
                                className="bg-muted"
                            />
                            <p className="text-xs text-muted-foreground">
                                {language === 'tr'
                                    ? "E-posta adresi hesap ayarlarından değiştirilebilir."
                                    : "Email address can be changed from account settings."}
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            {language === 'tr' ? "Kaydet" : "Save Changes"}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
