const { contextBridge, ipcRenderer } = require('electron');

const CHAT_EVENT_CHANNEL = 'jarvis:chat:event';
let activeRequestId = null;

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,

  getApiKeyStatus: (provider) => ipcRenderer.invoke('jarvis:keys:status', provider),
  setApiKey: (apiKey) => ipcRenderer.invoke('jarvis:keys:set', apiKey),
  removeApiKey: (provider) => ipcRenderer.invoke('jarvis:keys:remove', provider),
  transcribeAudio: (audioBytes, mimeType, filename, language) =>
    ipcRenderer.invoke('jarvis:audio:transcribe', {
      audioBytes,
      mimeType,
      filename,
      language,
    }),

  streamChat: async (payload, onEvent) => {
    if (activeRequestId) {
      await ipcRenderer.invoke('jarvis:chat:cancel', activeRequestId);
    }

    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    activeRequestId = requestId;
    const listener = (_event, chatEvent) => {
      if (chatEvent?.requestId !== requestId) return;
      if (typeof onEvent === 'function') {
        try {
          onEvent(chatEvent);
        } catch {
          // Renderer callback errors must not break the IPC listener.
        }
      }
    };

    ipcRenderer.on(CHAT_EVENT_CHANNEL, listener);
    try {
      return await ipcRenderer.invoke('jarvis:chat:start', {
        requestId,
        messages: payload?.messages,
        modelSettings: payload?.modelSettings,
      });
    } finally {
      ipcRenderer.removeListener(CHAT_EVENT_CHANNEL, listener);
      if (activeRequestId === requestId) activeRequestId = null;
    }
  },

  cancelChat: async () => {
    if (!activeRequestId) return { success: false };
    return ipcRenderer.invoke('jarvis:chat:cancel', activeRequestId);
  },
});
