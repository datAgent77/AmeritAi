"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { browserLocalPersistence, setPersistence, signInWithEmailAndPassword, signOut, type User } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { Eye, EyeOff, Loader2, Bot, ShieldCheck, Zap, Globe2 } from "lucide-react"
import { SocialAuthButtons } from "@/components/auth/social-auth-buttons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { auth, db } from "@/lib/firebase"
import { VionOmniLogo } from "@/components/ui/vion-omni-logo"

function isSafeRedirect(value: string | null) {
    return Boolean(value && value.startsWith("/") && !value.startsWith("//"))
}

async function resolveUserAccess(user: User) {
    const snapshot = await getDoc(doc(db, "users", user.uid))
    const data = snapshot.exists() ? snapshot.data() || {} : {}
    return {
        isActive: data.isActive !== false,
    }
}

export function OmniLoginForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const redirectTarget = useMemo(() => {
        const redirect = searchParams.get("redirect")
        return isSafeRedirect(redirect) ? redirect! : "/omni/app"
    }, [searchParams])

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handlePostAuth = async (user: User) => {
        const access = await resolveUserAccess(user)
        if (!access.isActive) {
            await signOut(auth)
            throw new Error("Your account is pending approval.")
        }

        router.push(redirectTarget)
    }

    const handleEmailLogin = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            await setPersistence(auth, browserLocalPersistence)
            const credential = await signInWithEmailAndPassword(auth, email, password)
            await credential.user.reload()

            if (!credential.user.emailVerified) {
                await signOut(auth)
                throw new Error("Verify your email before opening Omni.")
            }

            await handlePostAuth(credential.user)
        } catch (authError: any) {
            const nextError =
                authError?.code === "auth/invalid-credential"
                    ? "Invalid email or password."
                    : authError?.message || "Unable to sign in right now."
            setError(nextError)
            toast({
                title: "Omni sign-in failed",
                description: nextError,
                variant: "destructive",
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSocialSuccess = async (user: User) => {
        try {
            await handlePostAuth(user)
        } catch (socialError: any) {
            const nextError = socialError?.message || "Unable to sign in right now."
            setError(nextError)
            toast({
                title: "Omni sign-in failed",
                description: nextError,
                variant: "destructive",
            })
        }
    }

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-zinc-900 font-sans selection:bg-zinc-200">
            {/* Minimal Header */}
            <header className="absolute top-0 inset-x-0 z-50 p-6">
                <Link href="/omni" className="inline-flex items-center group">
                    <VionOmniLogo className="h-8 transition-opacity group-hover:opacity-80" />
                </Link>
            </header>

            <div className="grid min-h-screen lg:grid-cols-[1fr_500px] xl:grid-cols-[1fr_560px]">
                
                {/* Left Side - Visual/Value Prop (Hidden on mobile) */}
                <div className="hidden lg:flex flex-col justify-center p-12 lg:p-20 xl:p-24 relative overflow-hidden bg-zinc-50 border-r border-zinc-200">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e2e8f0_0%,_transparent_60%)] opacity-50" />
                    
                    <div className="relative z-10 max-w-xl">
                        <h1 className="text-4xl xl:text-5xl font-semibold tracking-tight text-zinc-900 mb-6 leading-[1.1]">
                            The workspace for your AI agents.
                        </h1>
                        <p className="text-lg text-zinc-600 mb-12 leading-relaxed">
                            Jump into a dedicated environment for testing, conversations, versioning, and live deployment posture.
                        </p>

                        <div className="grid gap-6">
                            {[
                                { icon: Zap, title: "Dedicated Workspace", desc: "A product-first environment distinct from admin configuration." },
                                { icon: Globe2, title: "Multimodal Deployments", desc: "Manage voice, web, WhatsApp, and Instagram from one place." },
                                { icon: ShieldCheck, title: "Enterprise Controls", desc: "Console remains the source of truth for partner and site management." }
                            ].map((feature, i) => (
                                <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white border border-zinc-200 shadow-sm">
                                    <div className="w-12 h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
                                        <feature.icon className="w-6 h-6 text-zinc-700" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-zinc-900">{feature.title}</h3>
                                        <p className="text-sm text-zinc-600 mt-1 leading-relaxed">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side - Login Form */}
                <div className="flex flex-col justify-center px-6 py-20 sm:px-12 md:px-16 lg:px-20 bg-white">
                    <div className="mx-auto w-full max-w-sm">
                        <div className="mb-10 text-center lg:text-left">
                            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900 mb-3">Welcome back</h2>
                            <p className="text-zinc-600">
                                Sign in to your AmeritAI Omni account
                            </p>
                        </div>

                        <div className="space-y-6">
                            <SocialAuthButtons mode="login" onSuccess={(user) => void handleSocialSuccess(user)} />

                            <div className="flex items-center gap-3">
                                <span className="h-px flex-1 bg-zinc-200" />
                                <span className="text-xs uppercase tracking-widest text-zinc-400 font-medium">or</span>
                                <span className="h-px flex-1 bg-zinc-200" />
                            </div>

                            <form className="space-y-5" onSubmit={handleEmailLogin}>
                                <div className="space-y-2">
                                    <Label htmlFor="omni-email" className="text-sm font-medium text-zinc-700">
                                        Email address
                                    </Label>
                                    <Input
                                        id="omni-email"
                                        value={email}
                                        onChange={(event) => setEmail(event.target.value)}
                                        type="email"
                                        placeholder="name@company.com"
                                        className="h-12 rounded-xl border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900 focus-visible:border-zinc-900"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="omni-password" className="text-sm font-medium text-zinc-700">
                                            Password
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="omni-password"
                                            value={password}
                                            onChange={(event) => setPassword(event.target.value)}
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter your password"
                                            className="h-12 rounded-xl border-zinc-200 bg-white pr-12 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900 focus-visible:border-zinc-900"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-400 hover:text-zinc-700 transition-colors"
                                            onClick={() => setShowPassword((current) => !current)}
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {error ? (
                                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-2">
                                        <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                ) : null}

                                <Button 
                                    type="submit" 
                                    className="h-12 w-full rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 transition-all font-medium text-base mt-2" 
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sign in to Omni"}
                                </Button>
                            </form>

                            <div className="pt-6 text-center text-sm text-zinc-500">
                                <p className="mb-2">
                                    Don&apos;t have an account?{" "}
                                    <Link href="/signup" className="font-medium text-zinc-900 hover:underline">
                                        Sign up
                                    </Link>
                                </p>
                                <p>
                                    Looking for Console?{" "}
                                    <Link href="/login" className="font-medium text-zinc-900 hover:underline">
                                        Go to Console login
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
