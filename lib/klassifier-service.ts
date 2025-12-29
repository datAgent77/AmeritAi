
export class KlassifierService {
    private static STT_ENDPOINT = 'https://api.klassifier.com/stt/transcribe';
    private static TTS_ENDPOINT = 'https://api.klassifier.com/text-to-speech/generate-realtime';
    private static BASE_URL = 'https://api.klassifier.com';

    /**
     * Transcribes audio using Klassifier STT API
     * @param audioFile The audio blob/file to transcribe
     * @returns The transcribed text
     */
    static async transcribeAudio(audioFile: Blob): Promise<string> {
        const formData = new FormData();
        formData.append('audio_file', audioFile, 'recording.wav');
        formData.append('language', 'tr');
        formData.append('model_name', 'large-v2');

        try {
            const response = await fetch('/api/voice/klassifier?action=transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`STT API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.segments && Array.isArray(data.segments)) {
                return data.segments.map((s: any) => s.text).join(' ').trim();
            } else if (data.text) {
                return data.text;
            }

            return "";
        } catch (error) {
            console.error('Klassifier STT Error:', error);
            throw error;
        }
    }

    static async generateSpeech(text: string): Promise<HTMLAudioElement> {
        const payload = {
            text: text,
            voice_id: "derya",
            session_id: `vion-${Date.now()}`,
            target_language: "tr",
            tts_service: "voicifier",
            emotion: "happy",
            speed: 1.0
        };

        try {
            const response = await fetch('/api/voice/klassifier?action=generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`TTS API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            if (data.file_path) {
                const relativePath = data.file_path.startsWith('/') ? data.file_path : `/${data.file_path}`;
                const audioUrl = data.file_path.startsWith('http')
                    ? data.file_path
                    : `${this.BASE_URL}${relativePath}`;

                const audio = new Audio(audioUrl);
                return audio;
            }

            throw new Error("No file_path in TTS response");

        } catch (error) {
            console.error('Klassifier TTS Error:', error);
            throw error;
        }
    }
}
