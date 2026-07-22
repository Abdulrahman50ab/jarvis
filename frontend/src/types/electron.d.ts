export {};

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    electronAPI?: {
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      createFile: (path: string, content?: string) => Promise<{ success: boolean; error?: string }>;
      deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
      createFolder: (path: string) => Promise<{ success: boolean; error?: string }>;
      listFiles: (dirPath: string) => Promise<{ success: boolean; files?: any[]; error?: string }>;
      readFolderTree: (dirPath: string) => Promise<{ success: boolean; tree?: any[]; error?: string }>;
      openFolder: () => Promise<{ canceled?: boolean; filePaths?: string[]; error?: string }>;
      openFile: () => Promise<{ canceled?: boolean; filePaths?: string[]; error?: string }>;
      executeCommand: (command: string, cwd?: string) => Promise<{ success: boolean; output: string; error?: string }>;
      getGitStatus: (dirPath?: string) => Promise<{ success: boolean; isRepo: boolean; branch?: string; modifiedCount?: number; statusRaw?: string }>;
    };
  }
}
