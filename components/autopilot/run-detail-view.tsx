
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, AlertTriangle, Sparkles } from "lucide-react";
import { TestRun } from "@/lib/services/test-run-service";
import Image from "next/image";

interface RunDetailViewProps {
    run: TestRun | null;
    isOpen: boolean;
    onClose: () => void;
}

export function RunDetailView({ run, isOpen, onClose }: RunDetailViewProps) {
    if (!run) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <DialogTitle className="text-2xl">Test Details: {run.testSuiteName}</DialogTitle>
                        <Badge variant={run.status === 'passed' ? 'default' : 'destructive'} className={run.status === 'passed' ? 'bg-green-600' : ''}>
                            {run.status.toUpperCase()}
                        </Badge>
                    </div>
                    <DialogDescription>
                        Executed on {new Date(run.timestamp).toLocaleString()} • {run.url}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="steps" className="mt-6">
                    <TabsList>
                        <TabsTrigger value="steps">Execution Steps</TabsTrigger>
                        <TabsTrigger value="analysis">
                            <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                            AI UX Analysis
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="steps" className="space-y-4 mt-4">
                        <div className="border rounded-md divide-y">
                            {run.steps.map((step: any, idx: number) => (
                                <div key={idx} className="p-3 flex items-start gap-3 text-sm">
                                    <div className="mt-0.5">
                                        {step.status === 'passed' ? (
                                            <CheckCircle className="w-5 h-5 text-green-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-foreground">
                                            {step.action.toUpperCase()} <span className="text-muted-foreground">on {step.target}</span>
                                        </div>
                                        {step.error && (
                                            <div className="mt-2 bg-red-50 text-red-700 p-2 rounded text-xs font-mono">
                                                Error: {step.error}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground font-mono">Step {idx + 1}</div>
                                </div>
                            ))}
                        </div>
                    </TabsContent>

                    <TabsContent value="analysis" className="mt-4">
                        {run.aiCritique ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-20 h-20 rounded-full border-4 border-purple-500 flex items-center justify-center text-2xl font-bold text-purple-700 bg-purple-50">
                                            {run.aiCritique.score}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-semibold">UX Quality Score</h3>
                                            <p className="text-sm text-muted-foreground">Based on visual analysis by Gemini 1.5 Pro</p>
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-lg">
                                        <h4 className="font-semibold mb-2">Summary</h4>
                                        <p className="text-sm text-slate-700">{run.aiCritique.summary}</p>
                                    </div>

                                    <div>
                                        <h4 className="font-semibold mb-2">Suggestions</h4>
                                        <ul className="space-y-2">
                                            {run.aiCritique.suggestions.map((s: string, i: number) => (
                                                <li key={i} className="flex gap-2 text-sm text-slate-700">
                                                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {run.screenshotUrl && (
                                    <div className="border rounded-lg overflow-hidden bg-black/5">
                                        <div className="relative w-full h-auto aspect-video">
                                            <Image
                                                src={run.screenshotUrl}
                                                alt="Test Screenshot"
                                                fill
                                                className="object-contain"
                                                sizes="(max-width: 768px) 100vw, 800px"
                                                unoptimized
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground">
                                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>No AI analysis available for this run.</p>
                                <p className="text-sm mt-2">AI analysis is generated automatically during test execution.</p>
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
