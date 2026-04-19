"use client"

import Image from "next/image"
import Link from "next/link"
import { motion, useScroll, useTransform } from "framer-motion"
import { useRef, useState } from "react"
import {
    ArrowRight,
    AudioLines,
    BriefcaseBusiness,
    CheckCircle2,
    Globe2,
    Languages,
    MessageSquareText,
    ShieldCheck,
    Sparkles,
    TestTube2,
    Wrench,
    Zap,
    Code2,
    Activity,
    Lock,
    Play,
    BookOpen,
    Puzzle,
    Volume2,
    ChevronRight,
    MessageCircle,
    PhoneCall
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { VionOmniLogo } from "@/components/ui/vion-omni-logo"

const fadeIn = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

function SectionHeading({ title, subtitle, align = "center", eyebrow }: { title: string; subtitle?: string; align?: "center" | "left", eyebrow?: string }) {
    return (
        <div className={cn("flex flex-col gap-4", align === "center" ? "items-center text-center mx-auto" : "items-start text-left")}>
            {eyebrow && (
                <span className="text-sm font-semibold tracking-wide text-zinc-500 uppercase">
                    {eyebrow}
                </span>
            )}
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900 max-w-3xl leading-[1.1]">
                {title}
            </h2>
            {subtitle && (
                <p className="text-zinc-600 text-lg md:text-xl max-w-2xl leading-relaxed">
                    {subtitle}
                </p>
            )}
        </div>
    )
}

function FeatureAccordion({ items }: { items: { title: string, content: string }[] }) {
    const [activeIndex, setActiveIndex] = useState(0);

    return (
        <div className="flex flex-col gap-2 w-full max-w-md">
            {items.map((item, i) => (
                <div 
                    key={i} 
                    className={cn(
                        "rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer",
                        activeIndex === i 
                            ? "bg-white border-zinc-200 shadow-sm" 
                            : "bg-zinc-50/50 border-transparent hover:bg-zinc-100"
                    )}
                    onClick={() => setActiveIndex(i)}
                >
                    <div className="p-5 flex items-center justify-between">
                        <h3 className="font-semibold text-zinc-900">{item.title}</h3>
                        <ChevronRight className={cn(
                            "w-5 h-5 text-zinc-400 transition-transform duration-300",
                            activeIndex === i ? "rotate-90" : ""
                        )} />
                    </div>
                    <div className={cn(
                        "px-5 overflow-hidden transition-all duration-300 text-zinc-600 leading-relaxed text-sm",
                        activeIndex === i ? "pb-5 max-h-40 opacity-100" : "max-h-0 opacity-0"
                    )}>
                        {item.content}
                    </div>
                </div>
            ))}
        </div>
    )
}

export function OmniLanding() {
    const heroRef = useRef<HTMLDivElement>(null)
    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"]
    })
    
    const opacity = useTransform(scrollYProgress, [0, 1], [1, 0])
    const scale = useTransform(scrollYProgress, [0, 1], [1, 0.95])
    const y = useTransform(scrollYProgress, [0, 1], [0, 100])

    return (
        <div className="min-h-screen bg-[#FDFDFD] text-zinc-900 font-sans overflow-x-hidden selection:bg-zinc-200">
            {/* Minimal Light Header */}
            <header className="fixed top-0 inset-x-0 z-50 border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl">
                <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6">
                    <div className="flex items-center gap-10">
                        <Link href="/omni" className="flex items-center group">
                            <VionOmniLogo className="h-8 transition-opacity group-hover:opacity-80" />
                        </Link>
                        <nav className="hidden items-center gap-8 text-sm font-medium text-zinc-600 md:flex">
                            <a href="#platform" className="hover:text-zinc-900 transition-colors">Platform</a>
                            <a href="#solutions" className="hover:text-zinc-900 transition-colors">Solutions</a>
                            <a href="#docs" className="hover:text-zinc-900 transition-colors">Docs</a>
                            <a href="#pricing" className="hover:text-zinc-900 transition-colors">Pricing</a>
                        </nav>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/omni/login" className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors hidden sm:block">
                            Log in
                        </Link>
                        <Button asChild className="h-10 rounded-full bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 transition-all hover:shadow-md">
                            <Link href="/omni/login?redirect=/omni/app">
                                Create an AI Agent
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 pt-24 pb-24">
                {/* Hero Section */}
                <section ref={heroRef} className="relative mx-auto max-w-[1400px] px-6 pt-20 pb-16 lg:pb-32 overflow-hidden">
                    <motion.div 
                        style={{ opacity, scale, y }}
                        className="grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center relative z-10"
                    >
                        <div className="flex flex-col items-start text-left max-w-2xl">
                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-600 border border-zinc-200"
                            >
                                <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
                                New: WhatsApp & Instagram Integrations
                            </motion.div>
                            
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-[-0.02em] text-zinc-900 mb-6 leading-[1.05]"
                            >
                                Deploy AI Agents in Minutes, Not Months
                            </motion.h1>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-zinc-600 mb-10 leading-relaxed max-w-xl"
                            >
                                Deploy natural, human-sounding agents across voice, web, WhatsApp, and Instagram. Connected to your business tools, Omni agents handle complex workflows instantly.
                            </motion.p>
                            
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                            >
                                <Button asChild size="lg" className="w-full sm:w-auto h-14 rounded-full bg-zinc-900 px-8 text-base font-medium text-white hover:bg-zinc-800 transition-all hover:shadow-lg">
                                    <Link href="/omni/login?redirect=/omni/app">Create an AI Agent</Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto h-14 rounded-full border-zinc-300 bg-white px-8 text-base font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm">
                                    <Link href="/console/chatbot">Talk to Sales</Link>
                                </Button>
                            </motion.div>
                        </div>

                        {/* Right side Visual - Interactive Demo Simulation */}
                        <motion.div 
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                            className="relative h-[500px] w-full rounded-2xl bg-zinc-100/50 border border-zinc-200/60 shadow-xl overflow-hidden"
                        >
                            {/* Decorative elements to mimic ElevenLabs hero visual */}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_#e2e8f0_0%,_transparent_60%)]" />
                            
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
                                <div className="bg-white rounded-xl shadow-2xl border border-zinc-100 p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                                        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                                            <VionOmniLogo className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-zinc-900">Customer Support Agent</h3>
                                            <p className="text-xs text-emerald-600 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active & Listening
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 py-2">
                                        <div className="bg-zinc-50 rounded-xl rounded-tl-sm p-4 text-sm text-zinc-700 w-[85%]">
                                            Hi there! I&apos;m your AI assistant. How can I help you today?
                                        </div>
                                        <div className="bg-blue-50 border border-blue-100 rounded-xl rounded-tr-sm p-4 text-sm text-blue-900 w-[85%] self-end ml-auto">
                                            I need to change the shipping address for my recent order.
                                        </div>
                                        <div className="bg-zinc-50 rounded-xl rounded-tl-sm p-4 text-sm text-zinc-700 w-[85%] relative">
                                            I can certainly help with that. Let me look up your order right away.
                                            <div className="absolute -bottom-2 right-4 bg-white shadow-sm border border-zinc-100 rounded-full px-2 py-1 text-[10px] text-zinc-500 font-mono flex items-center gap-1">
                                                <Zap className="w-3 h-3" /> Tool Call: getOrder()
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-2 flex items-center justify-center gap-4">
                                        <button className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                                            <Volume2 className="w-6 h-6 text-white" />
                                        </button>
                                        <button className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center hover:bg-red-200 transition-colors">
                                            <PhoneCall className="w-5 h-5 text-red-600" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Logo Cloud */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="mt-20 pt-10 border-t border-zinc-200"
                    >
                        <p className="text-center text-sm font-medium text-zinc-400 mb-8 uppercase tracking-widest">
                            Trusted by innovative teams worldwide
                        </p>
                        <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 opacity-60 grayscale">
                            <div className="text-xl font-bold font-serif text-zinc-800">Deliveroo</div>
                            <div className="text-xl font-bold font-sans text-zinc-800">CISCO</div>
                            <div className="text-xl font-bold font-sans text-zinc-800">salesforce</div>
                            <div className="text-xl font-bold font-serif text-zinc-800">meesho</div>
                            <div className="text-xl font-bold font-mono text-zinc-800">REVOLUT</div>
                        </div>
                    </motion.div>
                </section>

                {/* Multimodal Agents Section */}
                <section className="bg-zinc-50 py-32 border-y border-zinc-200">
                    <div className="mx-auto max-w-[1400px] px-6">
                        <SectionHeading 
                            eyebrow="Multimodal Agents"
                            title="AI agents that speak, read, and see" 
                            subtitle="Multimodal by design, agents understand spoken or written inputs, retrieve the right answers, and respond naturally in real time."
                        />
                        
                        <div className="mt-20 grid lg:grid-cols-2 gap-16 items-center">
                            <FeatureAccordion 
                                items={[
                                    {
                                        title: "Take action with external tool calls",
                                        content: "Connect agents to your internal tools and APIs to perform real tasks during a conversation. Fetch account data, trigger workflows, send updates, or log events in your existing systems, all in real time."
                                    },
                                    {
                                        title: "Deploy anywhere your customers are",
                                        content: "Launch voice, web, WhatsApp, and Instagram agents with one behavior layer and one operator workflow. Seamlessly maintain context across channels."
                                    },
                                    {
                                        title: "Knowledge base integration",
                                        content: "Connect internal documents, FAQs, and URLs in just a few clicks. With built-in RAG, agents provide accurate answers grounded in your own content."
                                    }
                                ]}
                            />
                            
                            <div className="relative rounded-2xl bg-white border border-zinc-200 p-8 shadow-sm h-[400px] overflow-hidden flex items-center justify-center">
                                {/* Visual representation of multimodality */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#f4f4f5_1px,transparent_1px),linear-gradient(to_bottom,#f4f4f5_1px,transparent_1px)] bg-[size:4rem_4rem]" />
                                <div className="relative z-10 flex gap-6">
                                    <div className="w-24 h-24 rounded-xl bg-white border border-zinc-200 shadow-md flex items-center justify-center animate-[bounce_3s_infinite]">
                                        <MessageCircle className="w-10 h-10 text-zinc-800" />
                                    </div>
                                    <div className="w-24 h-24 rounded-xl bg-zinc-900 border border-zinc-800 shadow-lg flex items-center justify-center animate-[bounce_3s_infinite_100ms]">
                                        <AudioLines className="w-10 h-10 text-white" />
                                    </div>
                                    <div className="w-24 h-24 rounded-xl bg-white border border-zinc-200 shadow-md flex items-center justify-center animate-[bounce_3s_infinite_200ms]">
                                        <Globe2 className="w-10 h-10 text-zinc-800" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Workflows & Testing Section */}
                <section className="py-32">
                    <div className="mx-auto max-w-[1400px] px-6">
                        <SectionHeading 
                            eyebrow="Workflows & Testing"
                            title="Create multi-agent workflows with strict guardrails" 
                            subtitle="Design rich conversational flows using intuitive visual tools. Track results with in-depth testing and analytics."
                        />

                        <div className="mt-20 grid md:grid-cols-3 gap-6">
                            {[
                                {
                                    icon: Activity,
                                    title: "Build multi-agent workflows",
                                    desc: "Combine scripted steps with dynamic agents, customize behavior at each stage, and define exactly how your AI navigates edge cases."
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Test guardrails",
                                    desc: "Validate readiness, run smoke checks, inspect blockers, and compare branch performance before rollout."
                                },
                                {
                                    icon: TestTube2,
                                    title: "Monitor performance",
                                    desc: "Treat tests, experiments, and versioning as part of the core product workflow. Operators can inspect readiness with confidence."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="bg-zinc-50 border border-zinc-200 rounded-2xl p-10 hover:bg-zinc-100 transition-colors">
                                    <div className="w-14 h-14 rounded-xl bg-white border border-zinc-200 flex items-center justify-center shadow-sm mb-8">
                                        <feature.icon className="w-6 h-6 text-zinc-800" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-zinc-900 mb-4">{feature.title}</h3>
                                    <p className="text-zinc-600 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Human-like & Multilingual */}
                <section className="bg-zinc-900 text-white py-32 rounded-3xl mx-6 my-12 overflow-hidden relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#27272a_0%,_transparent_100%)] opacity-50" />
                    
                    <div className="relative z-10 mx-auto max-w-[1400px] px-10">
                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div>
                                <span className="text-sm font-semibold tracking-wide text-zinc-400 uppercase mb-4 block">
                                    Human-like & Multilingual
                                </span>
                                <h2 className="text-4xl md:text-5xl font-semibold tracking-tight mb-6 leading-[1.1]">
                                    Global by default and human at every turn
                                </h2>
                                <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                                    Support global audiences with automatic language detection, multilingual voice synthesis, and real-time switching powered by advanced turn-taking.
                                </p>
                                
                                <div className="space-y-8">
                                    {[
                                        { title: "Automatic language detection", desc: "Agents detect and switch languages in real time based on what the user says." },
                                        { title: "1000+ voices to choose from", desc: "Pick from a wide range of expressive voices or clone your own for full control." },
                                        { title: "State of the art turn-taking", desc: "Natural interruptions, backchanneling, and human-like pacing." }
                                    ].map((item, i) => (
                                        <div key={i} className="flex gap-4">
                                            <div className="mt-1">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold">{item.title}</h4>
                                                <p className="text-zinc-400 mt-1">{item.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Decorative Language Grid */}
                            <div className="grid grid-cols-3 gap-4">
                                {['English', 'Français', 'Deutsch', 'Español', 'Italiano', '日本語', '한국어', 'हिन्दी', 'Português'].map((lang, i) => (
                                    <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl p-6 flex items-center justify-center text-center hover:bg-zinc-800 transition-colors backdrop-blur-sm">
                                        <span className="font-medium text-zinc-300">{lang}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Enterprise Ready */}
                <section className="py-32">
                    <div className="mx-auto max-w-[1400px] px-6 text-center">
                        <SectionHeading 
                            eyebrow="Enterprise Ready"
                            title="Enterprise-grade security and infrastructure" 
                            subtitle="Data is encrypted in transit and at rest, with support for SOC 2, HIPAA, and GDPR compliance."
                        />
                        
                        <div className="mt-20 flex flex-wrap justify-center gap-4">
                            <div className="px-8 py-4 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center gap-3">
                                <Lock className="w-5 h-5 text-zinc-500" />
                                <span className="font-semibold text-zinc-800">SOC 2 Compliant</span>
                            </div>
                            <div className="px-8 py-4 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center gap-3">
                                <ShieldCheck className="w-5 h-5 text-zinc-500" />
                                <span className="font-semibold text-zinc-800">GDPR Ready</span>
                            </div>
                            <div className="px-8 py-4 rounded-full border border-zinc-200 bg-white shadow-sm flex items-center gap-3">
                                <BriefcaseBusiness className="w-5 h-5 text-zinc-500" />
                                <span className="font-semibold text-zinc-800">Enterprise SLAs</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="mx-auto max-w-[1400px] px-6 py-12">
                    <div className="rounded-[32px] bg-zinc-100 p-16 md:p-24 text-center">
                        <h2 className="text-4xl md:text-6xl font-semibold tracking-tight text-zinc-900 mb-6">
                            Start in days, not months.
                        </h2>
                        <p className="text-zinc-600 text-lg max-w-2xl mx-auto mb-10">
                            Get started easily with minimal setup and hands-on support to explore what AI Agents can unlock for your business.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button asChild size="lg" className="h-14 rounded-full bg-zinc-900 px-10 text-base font-medium text-white hover:bg-zinc-800 transition-all hover:shadow-lg">
                                <Link href="/omni/login?redirect=/omni/app">Create an AI Agent</Link>
                            </Button>
                            <Button asChild size="lg" variant="outline" className="h-14 rounded-full border-zinc-300 bg-white px-10 text-base font-medium text-zinc-800 hover:bg-zinc-50 transition-all shadow-sm">
                                <Link href="/console/chatbot">Talk to Sales</Link>
                            </Button>
                        </div>
                    </div>
                </section>
            </main>

            {/* Simple Footer */}
            <footer className="border-t border-zinc-200 bg-white py-12 text-sm text-zinc-500">
                <div className="mx-auto max-w-[1400px] px-6 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <VionOmniLogo className="h-5 grayscale opacity-70" />
                    </div>
                    <div className="flex gap-8 font-medium">
                        <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">API Reference</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                        <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
