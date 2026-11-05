"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface VoiceSettings {
  voice: string;
  rate: number;
  pitch: number;
  volume: number;
  autoSpeak: boolean;
  skipCodeBlocks: boolean;
  language: string;
  continuousListening: boolean;
  interimResults: boolean;
  microphoneSensitivity: number;
  echoCancellation: boolean;
  autoGainControl: boolean;
  noiseSuppression: boolean;
}

interface AIModelSettings {
  provider: 'groq' | 'openai' | 'gemini' | 'local';
  model: string;
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  systemPrompt: string;
  backendUrl: string;
  streamResponses: boolean;
  requestTimeout: number;
}

interface PrivacySettings {
  storageBackend: 'localStorage' | 'indexedDB' | 'postgresql';
  encryptLocalData: boolean;
  syncAcrossDevices: boolean;
  analytics: boolean;
  errorReporting: boolean;
}

interface SettingsState {
  // Voice & Audio
  voice: VoiceSettings;
  // AI Model & Backend
  aiModel: AIModelSettings;
  // Privacy & Data
  privacy: PrivacySettings;
  // Keyboard Shortcuts (action -> key binding string)
  shortcuts: Record<string, string>;
  setShortcuts: (shortcuts: Record<string, string>) => void;
  // UI/UX
  compactMode: boolean;
  showTimestamps: boolean;
  showMessageMetadata: boolean;
  themeMode: 'dark' | 'light' | 'system';
  accentColor: string;
  backgroundOpacity: number;
  // Animation & Visual
  animations: boolean;
  reducedMotion: boolean;
  orbAnimationIntensity: 'low' | 'medium' | 'high';
  fontFamily: 'monospace' | 'system' | 'custom';
  fontSize: number;
  lineHeight: number;
  // Voice Call
  autoAnswerOnWakeWord: boolean;
  wakeWord: string;
  endCallOnSilence: boolean;
  silenceThreshold: number;
  autoResumeAfterTTS: boolean;
  // Dev/Debug
  debugMode: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  showNetworkRequests: boolean;
  mockBackendResponses: boolean;
  // Experimental
  enableExperimental: boolean;
  enableWebGPU: boolean;
  enableBackgroundSync: boolean;

  // Utilities
  lastUpdated: number;
  version: string;

  // Voice & Audio Actions
  setVoiceSettings: (updates: Partial<VoiceSettings>) => void;
  setVoiceProperty: <K extends keyof VoiceSettings>(property: K, value: VoiceSettings[K]) => void;

  // AI Model Actions
  setAIModelSettings: (updates: Partial<AIModelSettings>) => void;
  setAIModelProperty: <K extends keyof AIModelSettings>(property: K, value: AIModelSettings[K]) => void;

  // Privacy Actions
  setPrivacySettings: (updates: Partial<PrivacySettings>) => void;
  setPrivacyProperty: <K extends keyof PrivacySettings>(property: K, value: PrivacySettings[K]) => void;

  // UI/UX Actions
  setCompactMode: (enabled: boolean) => void;
  setShowTimestamps: (enabled: boolean) => void;
  setShowMessageMetadata: (enabled: boolean) => void;
  setThemeMode: (mode: 'dark' | 'light' | 'system') => void;
  setAccentColor: (color: string) => void;
  setBackgroundOpacity: (opacity: number) => void;

  // Animation & Visual Actions
  setAnimations: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setOrbAnimationIntensity: (intensity: 'low' | 'medium' | 'high') => void;
  setFontSettings: (family: 'monospace' | 'system' | 'custom', size: number, height: number) => void;

  // Voice Call Actions
  setVoiceCallSettings: (updates: Partial<Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>>) => void;
  setVoiceCallProperty: <K extends keyof Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>>(property: K, value: Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>[K]) => void;

  // Dev/Debug Actions
  setDebugMode: (enabled: boolean) => void;
  setLogLevel: (level: 'error' | 'warn' | 'info' | 'debug') => void;
  setDebugProperty: (property: 'showNetworkRequests' | 'mockBackendResponses', value: boolean) => void;

  // Experimental Actions
  setExperimentalFeatures: (enabled: boolean) => void;
  setWebGPU: (enabled: boolean) => void;
  setBackgroundSync: (enabled: boolean) => void;

  // Utility Actions
  resetToDefaults: () => void;
  updateVersion: (version: string) => void;
}

const defaultVoiceSettings: VoiceSettings = {
  voice: 'Google US English',
  rate: 1.05,
  pitch: 0.95,
  volume: 0.8,
  autoSpeak: true,
  skipCodeBlocks: true,
  language: 'en-US',
  continuousListening: false,
  interimResults: false,
  microphoneSensitivity: 0.7,
  echoCancellation: true,
  autoGainControl: true,
  noiseSuppression: true,
};

const defaultAIModelSettings: AIModelSettings = {
  provider: 'groq',
  model: 'openai/gpt-oss-20b',
  temperature: 0.7,
  topP: 0.9,
  topK: 40,
  maxTokens: 2048,
  systemPrompt: 'You are JARVIS, a capable and thoughtful AI assistant. Help with everyday questions, planning, writing, learning, technical work, and problem solving. Give clear, accurate, and practical answers, adapt to the user\'s language and level of detail, and ask a concise clarifying question only when it is genuinely needed.',
  backendUrl: 'http://localhost:11434',
  streamResponses: true,
  requestTimeout: 30000,
};

const defaultPrivacySettings: PrivacySettings = {
  storageBackend: 'localStorage',
  encryptLocalData: false,
  syncAcrossDevices: false,
  analytics: false,
  errorReporting: true,
};

type SettingsData = Omit<SettingsState,
  | 'setVoiceSettings' | 'setVoiceProperty'
  | 'setAIModelSettings' | 'setAIModelProperty'
  | 'setPrivacySettings' | 'setPrivacyProperty'
  | 'setCompactMode' | 'setShowTimestamps' | 'setShowMessageMetadata'
  | 'setThemeMode' | 'setAccentColor' | 'setBackgroundOpacity'
  | 'setAnimations' | 'setReducedMotion' | 'setOrbAnimationIntensity' | 'setFontSettings'
  | 'setVoiceCallSettings' | 'setVoiceCallProperty' | 'setShortcuts'
  | 'setDebugMode' | 'setLogLevel' | 'setDebugProperty'
  | 'setExperimentalFeatures' | 'setWebGPU' | 'setBackgroundSync'
  | 'resetToDefaults' | 'updateVersion'>;

export const defaultShortcuts: Record<string, string> = {
  focusInput: "/",
  newChat: "Ctrl+N",
  toggleSidebar: "Ctrl+B",
  toggleVoice: "Ctrl+Shift+V",
  toggleVoiceCall: "Ctrl+Shift+C",
  muteUnmute: "Ctrl+M",
  clearChat: "Ctrl+Shift+X",
  openSettings: "Ctrl+,",
};

const defaultSettings: SettingsData = {
  // Voice & Audio
  voice: defaultVoiceSettings,
  // AI Model & Backend
  aiModel: defaultAIModelSettings,
  // Privacy & Data
  privacy: defaultPrivacySettings,
  // Keyboard Shortcuts
  shortcuts: defaultShortcuts,
  // UI/UX
  compactMode: false,
  showTimestamps: true,
  showMessageMetadata: false,
  themeMode: 'light',
  accentColor: '#dc2626',
  backgroundOpacity: 0.1,
  // Animation & Visual
  animations: true,
  reducedMotion: false,
  orbAnimationIntensity: 'medium',
  fontFamily: 'system',
  fontSize: 14,
  lineHeight: 1.6,
  // Voice Call
  autoAnswerOnWakeWord: false,
  wakeWord: 'Hey JARVIS',
  endCallOnSilence: true,
  silenceThreshold: 15000,
  autoResumeAfterTTS: true,
  // Dev/Debug
  debugMode: false,
  logLevel: 'info',
  showNetworkRequests: false,
  mockBackendResponses: false,
  // Experimental
  enableExperimental: false,
  enableWebGPU: false,
  enableBackgroundSync: false,
  
  // Utilities
  lastUpdated: Date.now(),
  version: '1.0.0',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      // Voice & Audio Actions
      setVoiceSettings: (updates: Partial<VoiceSettings>) => set(
        (state) => ({
          ...state,
          voice: { ...state.voice, ...updates },
          lastUpdated: Date.now(),
        })
      ),
      
      setVoiceProperty: <K extends keyof VoiceSettings>(property: K, value: VoiceSettings[K]) => set(
        (state) => ({
          ...state,
          voice: { ...state.voice, [property]: value },
          lastUpdated: Date.now(),
        })
      ),
      
      // AI Model Actions
      setAIModelSettings: (updates: Partial<AIModelSettings>) => set(
        (state) => ({
          ...state,
          aiModel: { ...state.aiModel, ...updates },
          lastUpdated: Date.now(),
        })
      ),
      
      setAIModelProperty: <K extends keyof AIModelSettings>(property: K, value: AIModelSettings[K]) => set(
        (state) => ({
          ...state,
          aiModel: { ...state.aiModel, [property]: value },
          lastUpdated: Date.now(),
        })
      ),
      
      // Privacy Actions
      setPrivacySettings: (updates: Partial<PrivacySettings>) => set(
        (state) => ({
          ...state,
          privacy: { ...state.privacy, ...updates },
          lastUpdated: Date.now(),
        })
      ),
      
      setPrivacyProperty: <K extends keyof PrivacySettings>(property: K, value: PrivacySettings[K]) => set(
        (state) => ({
          ...state,
          privacy: { ...state.privacy, [property]: value },
          lastUpdated: Date.now(),
        })
      ),
      
      // UI/UX Actions
      setCompactMode: (enabled: boolean) => set(
        (state) => ({
          ...state,
          compactMode: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setShowTimestamps: (enabled: boolean) => set(
        (state) => ({
          ...state,
          showTimestamps: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setShowMessageMetadata: (enabled: boolean) => set(
        (state) => ({
          ...state,
          showMessageMetadata: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setThemeMode: (mode: 'dark' | 'light' | 'system') => set(
        (state) => ({
          ...state,
          themeMode: mode,
          lastUpdated: Date.now(),
        })
      ),

      setShortcuts: (shortcuts: Record<string, string>) => set(
        (state) => ({
          ...state,
          shortcuts,
          lastUpdated: Date.now(),
        })
      ),
      
      setAccentColor: (color: string) => set(
        (state) => ({
          ...state,
          accentColor: color,
          lastUpdated: Date.now(),
        })
      ),
      
      setBackgroundOpacity: (opacity: number) => set(
        (state) => ({
          ...state,
          backgroundOpacity: opacity,
          lastUpdated: Date.now(),
        })
      ),
      
      // Animation & Visual Actions
      setAnimations: (enabled: boolean) => set(
        (state) => ({
          ...state,
          animations: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setReducedMotion: (enabled: boolean) => set(
        (state) => ({
          ...state,
          reducedMotion: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setOrbAnimationIntensity: (intensity: 'low' | 'medium' | 'high') => set(
        (state) => ({
          ...state,
          orbAnimationIntensity: intensity,
          lastUpdated: Date.now(),
        })
      ),
      
      setFontSettings: (family: 'monospace' | 'system' | 'custom', size: number, height: number) => set(
        (state) => ({
          ...state,
          fontFamily: family,
          fontSize: size,
          lineHeight: height,
          lastUpdated: Date.now(),
        })
      ),
      
      // Voice Call Actions
      setVoiceCallSettings: (updates: Partial<Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>>) => set(
        (state) => ({
          ...state,
          ...updates,
          lastUpdated: Date.now(),
        })
      ),
      
      setVoiceCallProperty: <K extends keyof Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>>(property: K, value: Omit<SettingsState, keyof VoiceSettings | keyof AIModelSettings | keyof PrivacySettings>[K]) => set(
        (state) => ({
          ...state,
          [property]: value,
          lastUpdated: Date.now(),
        })
      ),
      
      // Dev/Debug Actions
      setDebugMode: (enabled: boolean) => set(
        (state) => ({
          ...state,
          debugMode: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setLogLevel: (level: 'error' | 'warn' | 'info' | 'debug') => set(
        (state) => ({
          ...state,
          logLevel: level,
          lastUpdated: Date.now(),
        })
      ),
      
      setDebugProperty: (property: 'showNetworkRequests' | 'mockBackendResponses', value: boolean) => set(
        (state) => ({
          ...state,
          [property]: value,
          lastUpdated: Date.now(),
        })
      ),
      
      // Experimental Actions
      setExperimentalFeatures: (enabled: boolean) => set(
        (state) => ({
          ...state,
          enableExperimental: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setWebGPU: (enabled: boolean) => set(
        (state) => ({
          ...state,
          enableWebGPU: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      setBackgroundSync: (enabled: boolean) => set(
        (state) => ({
          ...state,
          enableBackgroundSync: enabled,
          lastUpdated: Date.now(),
        })
      ),
      
      // Utility Actions
      resetToDefaults: () => set(defaultSettings),
      updateVersion: (version: string) => set(
        (state) => ({
          ...state,
          version,
          lastUpdated: Date.now(),
        })
      ),
    }),
    {
      name: 'jarvis-settings',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState || {}) as Partial<SettingsData>;
        const persistedAIModel = {
          ...currentState.aiModel,
          ...persisted.aiModel,
        } as AIModelSettings & { customEndpoint?: string };
        delete persistedAIModel.customEndpoint;
        const retiredGroqModels = new Set([
          'llama-3.1-8b-instant',
          'llama-3.3-70b-versatile',
          'mixtral-8x7b-32768',
        ]);
        if (persistedAIModel.provider === 'groq' && retiredGroqModels.has(persistedAIModel.model)) {
          persistedAIModel.model = defaultAIModelSettings.model;
        }
        if (!['groq', 'openai', 'gemini', 'local'].includes(persistedAIModel.provider)) {
          persistedAIModel.provider = defaultAIModelSettings.provider;
          persistedAIModel.model = defaultAIModelSettings.model;
        }
        const legacyCyanColors = new Set([
          '#00f0ff', '#06b6d4', '#22d3ee', '#0891b2', '#00ffff', '#38bdf8', '#0284c7'
        ]);
        let resolvedAccent = persisted.accentColor || defaultSettings.accentColor;
        if (legacyCyanColors.has(resolvedAccent.toLowerCase())) {
          resolvedAccent = '#dc2626';
        }
        return {
          ...currentState,
          ...persisted,
          accentColor: resolvedAccent,
          voice: { ...currentState.voice, ...persisted.voice },
          aiModel: persistedAIModel,
          privacy: { ...currentState.privacy, ...persisted.privacy },
          shortcuts: { ...currentState.shortcuts, ...persisted.shortcuts },
        };
      },
      partialize: (state) => ({
        voice: state.voice,
        aiModel: state.aiModel,
        privacy: state.privacy,
        shortcuts: state.shortcuts,
        compactMode: state.compactMode,
        showTimestamps: state.showTimestamps,
        showMessageMetadata: state.showMessageMetadata,
        themeMode: state.themeMode,
        accentColor: state.accentColor,
        backgroundOpacity: state.backgroundOpacity,
        animations: state.animations,
        reducedMotion: state.reducedMotion,
        orbAnimationIntensity: state.orbAnimationIntensity,
        fontFamily: state.fontFamily,
        fontSize: state.fontSize,
        lineHeight: state.lineHeight,
        autoAnswerOnWakeWord: state.autoAnswerOnWakeWord,
        wakeWord: state.wakeWord,
        endCallOnSilence: state.endCallOnSilence,
        silenceThreshold: state.silenceThreshold,
        autoResumeAfterTTS: state.autoResumeAfterTTS,
        debugMode: state.debugMode,
        logLevel: state.logLevel,
        showNetworkRequests: state.showNetworkRequests,
        mockBackendResponses: state.mockBackendResponses,
        enableExperimental: state.enableExperimental,
        enableWebGPU: state.enableWebGPU,
        enableBackgroundSync: state.enableBackgroundSync,
      }),
    }
  )
);
