"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PenTool, Loader2, Copy, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { BrandKnowledge } from "@/components/brand-knowledge"

export default function CopywriterPage() {
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [generatedContent, setGeneratedContent] = useState("")
    const [isCopied, setIsCopied] = useState(false)

    const [formData, setFormData] = useState({
        topic: "",
        type: "blog_post",
        tone: "professional",
        audience: "",
        language: "Turkish"
    })

    const handleGenerate = async () => {
        if (!formData.topic) {
            toast({
                title: "Error",
                description: "Please enter a topic.",
                variant: "destructive"
            })
            return
        }

        setIsLoading(true)
        setGeneratedContent("")

        try {
            const response = await fetch("/api/copywriter/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            const data = await response.json()

            if (response.ok) {
                setGeneratedContent(data.content)
                toast({
                    title: "Success",
                    description: "Content generated successfully."
                })
            } else {
                throw new Error(data.error || "Failed to generate")
            }
        } catch (error) {
            console.error("Generation error:", error)
            toast({
                title: "Error",
                description: "Failed to generate content. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedContent)
        setIsCopied(true)
        setTimeout(() => setIsCopied(false), 2000)
        toast({
            title: "Copied",
            description: "Content copied to clipboard."
        })
    }

    return (
        <div className="p-8 space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">AI Copywriter</h1>
                <p className="text-muted-foreground">Generate high-quality content for your business in seconds.</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* Left: Input Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Content Details</CardTitle>
                        <CardDescription>Tell us what you want to write about.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Topic / Title</Label>
                            <Input
                                placeholder="e.g. The Future of AI in E-commerce"
                                value={formData.topic}
                                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Content Type</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="blog_post">Blog Post</SelectItem>
                                        <SelectItem value="social_media">Social Media Caption</SelectItem>
                                        <SelectItem value="product_description">Product Description</SelectItem>
                                        <SelectItem value="email_newsletter">Email Newsletter</SelectItem>
                                        <SelectItem value="ad_copy">Ad Copy</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Tone</Label>
                                <Select
                                    value={formData.tone}
                                    onValueChange={(val) => setFormData({ ...formData, tone: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="professional">Professional</SelectItem>
                                        <SelectItem value="friendly">Friendly</SelectItem>
                                        <SelectItem value="witty">Witty</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                        <SelectItem value="luxury">Luxury</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Language</Label>
                                <Select
                                    value={formData.language}
                                    onValueChange={(val) => setFormData({ ...formData, language: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Turkish">Turkish</SelectItem>
                                        <SelectItem value="English">English</SelectItem>
                                        <SelectItem value="Spanish">Spanish</SelectItem>
                                        <SelectItem value="German">German</SelectItem>
                                        <SelectItem value="French">French</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Target Audience (Optional)</Label>
                                <Input
                                    placeholder="e.g. Small Business Owners"
                                    value={formData.audience}
                                    onChange={(e) => setFormData({ ...formData, audience: e.target.value })}
                                />
                            </div>
                        </div>

                        <Button className="w-full mt-4" onClick={handleGenerate} disabled={isLoading || !formData.topic}>
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <PenTool className="mr-2 h-4 w-4" />
                                    Generate Content
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Right: Output */}
                <Card className="flex flex-col h-full min-h-[500px]">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <div className="space-y-1">
                            <CardTitle>Generated Content</CardTitle>
                            <CardDescription>Your AI-written text will appear here.</CardDescription>
                        </div>
                        {generatedContent && (
                            <Button variant="outline" size="sm" onClick={handleCopy}>
                                {isCopied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                {isCopied ? "Copied" : "Copy"}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="flex-1 p-6 bg-muted/30 rounded-b-lg overflow-y-auto">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <p>Writing your content...</p>
                            </div>
                        ) : generatedContent ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <ReactMarkdown>{generatedContent}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                                <PenTool className="h-12 w-12 mb-4" />
                                <p>Ready to write.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Brand AI Training Resources */}
            <Card>
                <CardHeader>
                    <CardTitle>Brand AI Training Resources</CardTitle>
                    <CardDescription>
                        Add brand information and marketing resources to train your AI Copywriter.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="brand" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="brand">Brand Information</TabsTrigger>
                            <TabsTrigger value="knowledge">AI Training Resources</TabsTrigger>
                        </TabsList>
                        <TabsContent value="brand" className="space-y-4">
                            <BrandKnowledge />
                        </TabsContent>
                        <TabsContent value="knowledge" className="space-y-4">
                            <div className="rounded-lg border bg-card p-6 text-center">
                                <PenTool className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="font-semibold mb-2">Marketing Content Training</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Add marketing materials, brand guidelines, and sample content to train your AI Copywriter.
                                </p>
                                <Link href="/console/knowledge">
                                    <Button variant="outline" size="sm">
                                        View Training Resources
                                    </Button>
                                </Link>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
