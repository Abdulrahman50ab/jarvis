export {};

declare global {
  type JarvisApiProvider = "groq" | "openai" | "gemini";

  interface JarvisChatMessage {
    role: "user" | "assistant";
    content: string;
  }

  interface JarvisModelSettings {
    provider?: "groq" | "openai" | "gemini" | "local";
    model: string;
    temperature: number;
    topP: number;
    maxTokens: number;
    systemPrompt: string;
    backendUrl?: string;
  }

  interface JarvisChatEvent {
    requestId: string;
    type: "chunk" | "done" | "error" | "cancelled";
    value: string;
  }

  interface JarvisChatResult {
    success: boolean;
    requestId: string;
    cancelled?: boolean;
    error?: string;
  }

  interface JarvisApiKeyStatus {
    encryptionAvailable: boolean;
    providers: Record<JarvisApiProvider, boolean>;
  }

  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    electronAPI?: {
      platform: string;
      getApiKeyStatus: (
        provider?: JarvisApiProvider,
      ) => Promise<JarvisApiKeyStatus | { configured: boolean; encryptionAvailable: boolean }>;
      setApiKey: (
        apiKey: string,
      ) => Promise<{ success: boolean; provider?: JarvisApiProvider; error?: string }>;
      removeApiKey: (
        provider: JarvisApiProvider,
      ) => Promise<{ success: boolean; error?: string }>;
      transcribeAudio: (
        audioBytes: ArrayBuffer | Uint8Array,
        mimeType: string,
        filename?: string,
        language?: string,
      ) => Promise<{ success: boolean; transcript?: string; error?: string }>;
      streamChat: (
        payload: {
          messages: JarvisChatMessage[];
          modelSettings: JarvisModelSettings;
        },
        onEvent: (event: JarvisChatEvent) => void,
      ) => Promise<JarvisChatResult>;
      cancelChat: () => Promise<{ success: boolean }>;
    };
  }
}
