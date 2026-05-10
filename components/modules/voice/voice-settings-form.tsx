"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  Check,
  Gauge,
  Loader2,
  Mic,
  Play,
  Volume2,
} from "lucide-react";

interface VoiceSettingsFormProps {
  targetUserId: string;
  isSuperAdmin?: boolean;
}

type HealthPayload = {
  provider: "openai" | "elevenlabs";
  selected: {
    status: "ready" | "warning" | "blocked";
    message: string;
    details?: Record<string, unknown>;
  };
  openAi?: { status: string; message: string };
  elevenLabs?: {
    status: string;
    message: string;
    details?: Record<string, unknown>;
  };
  checkedAt: string;
};

export function VoiceSettingsForm({
  targetUserId,
  isSuperAdmin = false,
}: VoiceSettingsFormProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [enableVoiceAssistant, setEnableVoiceAssistant] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [enableElevenLabs, setEnableElevenLabs] = useState(false);
  const [voiceInteractionMode, setVoiceInteractionMode] = useState<
    "legacy" | "realtime"
  >("legacy");
  const [elevenLabsAgentId, setElevenLabsAgentId] = useState("");
  const [elevenLabsServerLocation, setElevenLabsServerLocation] = useState<
    "global" | "eu-residency" | "us" | "in-residency"
  >("global");
  const [preferredVoice, setPreferredVoice] = useState("sage");
  const [voiceLowLatencyMode, setVoiceLowLatencyMode] = useState(true);
  const [voiceInputSensitivity, setVoiceInputSensitivity] = useState<
    "low" | "normal" | "high"
  >("normal");
  const [voiceResponseLength, setVoiceResponseLength] = useState<
    "short" | "balanced" | "detailed"
  >("short");
  const [voiceProfile, setVoiceProfile] = useState<
    "support" | "sales" | "appointments" | "restaurant"
  >("support");
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const [healthPayload, setHealthPayload] = useState<HealthPayload | null>(
    null,
  );
  const [lastPerf, setLastPerf] = useState<{
    ttsMs?: number;
    provider?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const openAiVoiceOptions = [
    { value: "sage", label: "Sage" },
    { value: "alloy", label: "Alloy" },
    { value: "ash", label: "Ash" },
    { value: "ballad", label: "Ballad" },
    { value: "coral", label: "Coral" },
    { value: "echo", label: "Echo" },
    { value: "fable", label: "Fable" },
    { value: "nova", label: "Nova" },
    { value: "onyx", label: "Onyx" },
    { value: "shimmer", label: "Shimmer" },
    { value: "verse", label: "Verse" },
  ];

  useEffect(() => {
    const fetchSettings = async () => {
      if (!targetUserId || !user) return;
      setIsLoading(true);
      try {
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/console/settings?chatbotId=${targetUserId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (!response.ok) throw new Error("Failed to fetch settings");
        const data = await response.json();

        setEnableVoiceAssistant(data.enableVoiceAssistant === true);
        setApiKey(data.elevenLabsApiKey || "");
        setVoiceId(data.elevenLabsVoiceId || "");
        setEnableElevenLabs(
          data.enableElevenLabs ?? data.voiceProvider === "elevenlabs",
        );
        setVoiceInteractionMode(
          data.voiceInteractionMode === "realtime" ? "realtime" : "legacy",
        );
        setElevenLabsAgentId(
          typeof data.elevenLabsAgentId === "string"
            ? data.elevenLabsAgentId
            : "",
        );
        setElevenLabsServerLocation(
          ["global", "eu-residency", "us", "in-residency"].includes(
            data.elevenLabsServerLocation,
          )
            ? data.elevenLabsServerLocation
            : "global",
        );
        setPreferredVoice(data.preferredVoice || "sage");
        setVoiceLowLatencyMode(data.voiceLowLatencyMode !== false);
        setVoiceInputSensitivity(
          ["low", "normal", "high"].includes(data.voiceInputSensitivity)
            ? data.voiceInputSensitivity
            : "normal",
        );
        setVoiceResponseLength(
          ["short", "balanced", "detailed"].includes(data.voiceResponseLength)
            ? data.voiceResponseLength
            : "short",
        );
        setVoiceProfile(
          ["support", "sales", "appointments", "restaurant"].includes(
            data.voiceProfile,
          )
            ? data.voiceProfile
            : "support",
        );
      } catch (error) {
        console.error("Error fetching settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [user, targetUserId]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    const token = await user.getIdToken();
    const voiceProvider = enableElevenLabs ? "elevenlabs" : "openai";

    try {
      const response = await fetch("/api/console/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatbotId: targetUserId,
          userSettings: {
            elevenLabsApiKey: apiKey,
            elevenLabsVoiceId: voiceId,
            enableElevenLabs,
            enableVoiceAssistant,
            voiceProvider,
            voiceInteractionMode,
            realtimeVoiceProvider: "elevenlabs",
            elevenLabsAgentId,
            elevenLabsServerLocation,
            preferredVoice,
            voiceLowLatencyMode,
            voiceInputSensitivity,
            voiceResponseLength,
            voiceProfile,
          },
          chatbotSettings: {
            enableVoiceAssistant,
            voiceProvider,
            enableElevenLabs,
            elevenLabsVoiceId: voiceId,
            voiceInteractionMode,
            realtimeVoiceProvider: "elevenlabs",
            elevenLabsAgentId,
            elevenLabsServerLocation,
            preferredVoice,
            voiceLowLatencyMode,
            voiceInputSensitivity,
            voiceResponseLength,
            voiceProfile,
          },
        }),
      });

      if (!response.ok) throw new Error("Failed to save settings");

      toast({
        title: t("saveSuccess"),
        description: t("saveSuccessDesc"),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("error"),
        description: t("saveFailedDesc"),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCheckHealth = async () => {
    if (!user) return;
    setIsCheckingHealth(true);
    setHealthPayload(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/voice/health", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatbotId: targetUserId,
          voiceProvider: enableElevenLabs ? "elevenlabs" : "openai",
          enableElevenLabs,
          elevenLabsApiKey: apiKey,
          elevenLabsVoiceId: voiceId,
          elevenLabsAgentId,
        }),
      });
      const payload = await response.json();
      if (!response.ok)
        throw new Error(payload?.error || "Health check failed");
      setHealthPayload(payload);
    } catch (error) {
      setHealthPayload({
        provider: enableElevenLabs ? "elevenlabs" : "openai",
        selected: {
          status: "blocked",
          message: error instanceof Error ? error.message : String(error),
        },
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleTestVoice = async () => {
    if (!user) return;
    setIsTestingVoice(true);
    setLastPerf(null);
    const startedAt = performance.now();
    const provider = enableElevenLabs ? "elevenlabs" : "openai";

    try {
      const sampleText =
        voiceProfile === "sales"
          ? "Merhaba, size en uygun çözümü hızlıca bulalım."
          : voiceProfile === "appointments"
            ? "Merhaba, randevu için size yardımcı olabilirim."
            : voiceProfile === "restaurant"
              ? "Merhaba, siparişiniz için size yardımcı olayım."
              : "Merhaba, Vion sesli asistan hazır.";

      const response = await fetch("/api/voice/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: sampleText,
                chatbotId: targetUserId,
                provider,
                voiceId,
                preferredVoice,
                language: "tr",
                strictProvider: false,
            }),
        });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.details ||
            payload?.error ||
            `Voice test failed: ${response.status}`,
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      audio.onerror = () => URL.revokeObjectURL(url);
      await audio.play();

        setLastPerf({
            provider: provider === "elevenlabs" ? "elevenlabs / fallback" : provider,
            ttsMs: Math.round(performance.now() - startedAt),
            message: "Ses testi başarılı.",
        });
    } catch (error) {
      setLastPerf({
        provider,
        ttsMs: Math.round(performance.now() - startedAt),
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsTestingVoice(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6 px-8 py-8 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            {t("widgetVoiceSettingsTitle") || "Widget Voice"}
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {t("widgetVoiceSettingsDesc") ||
              "Manage browser-based voice conversations for the web widget."}
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {t("save")}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Genel</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
          <TabsTrigger value="engine">Ses Motoru</TabsTrigger>
          <TabsTrigger value="test">Test</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                {t("voiceSettingsTitle") || "Voice Assistant"}
              </CardTitle>
              <CardDescription>
                {t("voiceAssistantSettingsDesc") ||
                  "Enable browser voice input and spoken responses in the widget."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <div>
                <Label
                  htmlFor="voice-assistant-enabled"
                  className="text-base font-medium"
                >
                  Sesli asistanı aktif et
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Aktif olduğunda widget içinde mikrofonla konuşma ve sesli
                  yanıt deneyimi açılır.
                </p>
              </div>
              <Switch
                id="voice-assistant-enabled"
                checked={enableVoiceAssistant}
                onCheckedChange={setEnableVoiceAssistant}
              />
            </CardContent>
          </Card>

          {/* Summary Section */}
          <div className="rounded-lg border bg-muted/30 p-4 flex items-start gap-4 text-sm text-muted-foreground">
            <div className="p-2 bg-background rounded-full border shadow-sm">
              <Check className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                {t("configSummary")}
              </p>
              <p>
                {enableVoiceAssistant
                  ? voiceInteractionMode === "realtime"
                    ? "Sesli asistan direkt ElevenLabs realtime agent ile yanit verecek."
                    : enableElevenLabs
                      ? t("configElevenLabsOnly")
                      : t("configOpenAiVoice") ||
                        "Voice assistant is active with the default OpenAI speech engine."
                  : t("configNoEngine")}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Konuşma Performansı
              </CardTitle>
              <CardDescription>
                Algılama hızı, yanıt uzunluğu ve konuşma profili.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="voiceInteractionMode">Sesli yanıt modu</Label>
                <select
                  id="voiceInteractionMode"
                  value={voiceInteractionMode}
                  onChange={(event) =>
                    setVoiceInteractionMode(
                      event.target.value === "realtime" ? "realtime" : "legacy",
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="legacy">Legacy - kayıt, chat ve TTS</option>
                  <option value="realtime">Direkt realtime voice</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Realtime modda widget yanıtları ElevenLabs Conversational AI
                  agent tarafından canlı sesle üretilir.
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label>Düşük gecikme modu</Label>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Daha kısa sessizlik bekleme ve hızlı kayıt parçaları
                    kullanır.
                  </p>
                </div>
                <Switch
                  checked={voiceLowLatencyMode}
                  onCheckedChange={setVoiceLowLatencyMode}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceSensitivity">
                  Konuşma algılama hassasiyeti
                </Label>
                <select
                  id="voiceSensitivity"
                  value={voiceInputSensitivity}
                  onChange={(event) =>
                    setVoiceInputSensitivity(
                      event.target.value as typeof voiceInputSensitivity,
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="low">Düşük - gürültülü ortam</option>
                  <option value="normal">Normal</option>
                  <option value="high">Yüksek - sesi erken yakala</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceResponseLength">
                  Varsayılan yanıt uzunluğu
                </Label>
                <select
                  id="voiceResponseLength"
                  value={voiceResponseLength}
                  onChange={(event) =>
                    setVoiceResponseLength(
                      event.target.value as typeof voiceResponseLength,
                    )
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="short">Kısa</option>
                  <option value="balanced">Dengeli</option>
                  <option value="detailed">Detaylı</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceProfile">Hazır ses profili</Label>
                <select
                  id="voiceProfile"
                  value={voiceProfile}
                  onChange={(event) =>
                    setVoiceProfile(event.target.value as typeof voiceProfile)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="support">Destek Asistanı</option>
                  <option value="sales">Satış Asistanı</option>
                  <option value="appointments">Randevu Asistanı</option>
                  <option value="restaurant">Restoran Asistanı</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engine" className="space-y-6">
          {/* ElevenLabs Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Volume2 className="h-5 w-5" />
                {t("elevenLabsTitle")}
              </CardTitle>
              <CardDescription>
                {t("elevenLabsDesc")} Turkce web voice varsayilan olarak daha
                dusuk gecikmeli konusma preset&apos;i kullanir.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label
                    htmlFor="elevenlabs-enabled"
                    className="text-base font-medium"
                  >
                    ElevenLabs motorunu kullan
                  </Label>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Kapalıysa sesli yanıtlar varsayılan OpenAI ses motoruyla
                    üretilir.
                  </p>
                </div>
                <Switch
                  id="elevenlabs-enabled"
                  checked={enableElevenLabs}
                  onCheckedChange={setEnableElevenLabs}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">{t("apiKey")}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_..."
                  disabled={!enableElevenLabs && voiceInteractionMode !== "realtime"}
                  className={!enableElevenLabs && voiceInteractionMode !== "realtime" ? "opacity-50" : ""}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="elevenLabsAgentId">ElevenLabs Agent ID</Label>
                  <Input
                    id="elevenLabsAgentId"
                    value={elevenLabsAgentId}
                    onChange={(e) => setElevenLabsAgentId(e.target.value)}
                    placeholder="agent_..."
                    disabled={voiceInteractionMode !== "realtime"}
                    className={voiceInteractionMode !== "realtime" ? "opacity-50" : ""}
                  />
                  <p className="text-xs text-muted-foreground">
                    Direkt realtime voice için Conversational AI agent ID.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="elevenLabsServerLocation">Server location</Label>
                  <select
                    id="elevenLabsServerLocation"
                    value={elevenLabsServerLocation}
                    onChange={(event) =>
                      setElevenLabsServerLocation(
                        event.target.value as typeof elevenLabsServerLocation,
                      )
                    }
                    disabled={voiceInteractionMode !== "realtime"}
                    className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${voiceInteractionMode !== "realtime" ? "opacity-50" : ""}`}
                  >
                    <option value="global">Global</option>
                    <option value="eu-residency">EU residency</option>
                    <option value="us">US</option>
                    <option value="in-residency">India residency</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="voiceId">{t("voiceId")}</Label>
                <Input
                  id="voiceId"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="21m00Tcm4TlvDq8ikWAM"
                  disabled={!enableElevenLabs}
                  className={!enableElevenLabs ? "opacity-50" : ""}
                />
                {enableElevenLabs && (
                  <p className="text-xs text-muted-foreground">
                    Örnek: Rachel (21m00Tcm4TlvDq8ikWAM)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredVoice">
                  {t("preferredVoice") || "Preferred Voice"}
                </Label>
                <select
                  id="preferredVoice"
                  value={preferredVoice}
                  onChange={(e) => setPreferredVoice(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {openAiVoiceOptions.map((voice) => (
                    <option key={voice.value} value={voice.value}>
                      {voice.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  ElevenLabs kullanilamazsa web voice bu sesi OpenAI ile uretir.
                  Turkce konusmada once gercek zamanli ElevenLabs preset&apos;i
                  kullanilir; OpenAI fallback icin en guvenli secenek yine
                  `sage`.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Test ve Sağlık Kontrolü
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Provider bağlantısını kontrol edin ve seçili sesi dinleyin.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCheckHealth}
                    disabled={isCheckingHealth}
                  >
                    {isCheckingHealth ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Activity className="mr-2 h-4 w-4" />
                    )}
                    Kontrol Et
                  </Button>
                  <Button
                    type="button"
                    onClick={handleTestVoice}
                    disabled={isTestingVoice || !enableVoiceAssistant}
                  >
                    {isTestingVoice ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Sesi Test Et
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {healthPayload && (
                <div
                  className={`rounded-lg border p-4 text-sm ${
                    healthPayload.selected.status === "ready"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : healthPayload.selected.status === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-red-200 bg-red-50 text-red-800"
                  }`}
                >
                  <div className="flex items-start gap-2 font-medium">
                    {healthPayload.selected.status === "ready" ? (
                      <Check className="mt-0.5 h-4 w-4" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                    )}
                    <span>{healthPayload.selected.message}</span>
                  </div>
                  {typeof healthPayload.selected.details?.latencyMs ===
                    "number" && (
                    <p className="mt-1 text-xs opacity-80">
                      Bağlantı süresi:{" "}
                      {healthPayload.selected.details.latencyMs} ms
                    </p>
                  )}
                </div>
              )}
              {lastPerf && (
                <div
                  className={`rounded-lg border p-4 text-sm ${lastPerf.error ? "border-red-200 bg-red-50 text-red-800" : "border-blue-200 bg-blue-50 text-blue-800"}`}
                >
                  <div className="font-medium">
                    {lastPerf.error ? "Ses testi başarısız" : lastPerf.message}
                  </div>
                  <p className="mt-1 text-xs opacity-80">
                    Provider: {lastPerf.provider}{" "}
                    {lastPerf.ttsMs ? `- TTS: ${lastPerf.ttsMs} ms` : ""}
                  </p>
                  {lastPerf.error && (
                    <p className="mt-2 break-words text-xs">{lastPerf.error}</p>
                  )}
                </div>
              )}
              {enableElevenLabs && (
                <p className="text-xs text-muted-foreground">
                  Not: Normal widget kullanımında ElevenLabs hata verirse OpenAI
                  fallback devreye girer. Sağlık kontrolü ElevenLabs
                  bağlantısını doğrudan doğrular.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
