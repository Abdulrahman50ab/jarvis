# JARVIS Assistant

JARVIS has two clearly separated products: a public Next.js website in `website/` and a packaged Electron desktop application in `electron-main/`. Both share the conversation interface, while personal API credentials, local models, and desktop transcription are application-only features.

## Highlights

- Full chronological chat workspace with responsive navigation
- Streaming responses with stop-generation controls
- Voice input, Groq-powered desktop transcription, and text-to-speech
- Automatic Groq, OpenAI, and Google Gemini API-key detection, plus local/Ollama models
- Desktop-only in-app credential management
- Encrypted operating-system storage in the desktop app
- Website promotion and download CTA for the desktop app
- Dark, light, system, accent, typography, density, and reduced-motion settings
- Windows installer generation with Electron Builder

## Technology

- Next.js 14, React 18, and TypeScript
- Tailwind CSS
- Zustand for local preferences
- Electron 30 with context isolation and a restricted preload bridge
- Electron `safeStorage` for encrypted desktop credentials

## Requirements

- Node.js 20 LTS recommended
- npm
- Windows 10/11 for the Windows installer
- An API key for a cloud provider, or a running OpenAI-compatible local service such as Ollama

## Quick start

Install dependencies in both projects:

```powershell
cd website
npm install

cd ..\electron-main
npm install
```

Run the web app:

```powershell
cd website
npm run dev
```

Open `http://localhost:3000`.

## Credentials and providers

Open **Settings → Connections** inside the Electron application and paste an API key. JARVIS detects Groq (`gsk_`), OpenAI (`sk-`), or Gemini (`AIza`), saves it in the correct encrypted slot, and uses the configured provider endpoint automatically. Users do not enter provider URLs.

| Runtime | Credential behavior |
| --- | --- |
| Windows desktop | Keys are encrypted through Electron `safeStorage` and saved in the current user's application-data directory. Saved values are never returned to the renderer. |
| Public website | Visitors cannot enter, view, replace, or remove personal API credentials. The website promotes the desktop application for these features. |
| Website server | Environment variables configure the provider available to website visitors without exposing secrets to the browser. |

Supported provider settings:

- **Groq** — Llama chat models and desktop speech transcription
- **OpenAI** — GPT chat models
- **Google Gemini** — Gemini chat models
- **Local** — Ollama or another local OpenAI-compatible endpoint; no cloud key required
- **Custom website provider** — an optional OpenAI-compatible endpoint controlled only by the website server owner

For a local provider, set the service URL under **Settings → Advanced**. The default is `http://localhost:11434`.

Custom website endpoints and keys remain server-controlled and are never accepted from visitors.

## Server environment variables

Copy the example file when running the web route with server-managed credentials:

```powershell
cd website
Copy-Item .env.example .env.local
```

Available variables:

```dotenv
GROQ_API_KEY=
OPENAI_API_KEY=
GEMINI_API_KEY=
CUSTOM_API_ENDPOINT=https://provider.example.com/v1/chat/completions
CUSTOM_API_KEY=
NEXT_PUBLIC_DESKTOP_APP_URL=https://github.com/Abdulrahman50ab/jarvis/releases
```

Never use a `NEXT_PUBLIC_` prefix for secrets. `NEXT_PUBLIC_DESKTOP_APP_URL` is safe because it is a public download/release link.

## Desktop development

The Electron shell loads the statically exported website UI from `website/out` and adds its secure desktop capabilities through the preload bridge.

Build the export and start Electron:

```powershell
cd electron-main
npm run build:website
npm start
```

## Production builds

Build the web application:

```powershell
cd website
npm run build
```

Create the final Windows installer:

```powershell
cd electron-main
npm run package-win
```

The installer is written to:

```text
electron-main/dist/JARVIS Assistant Setup 1.0.0.exe
```

Other available packaging commands:

```powershell
npm run package-mac
npm run package-linux
npm run package-all
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+N` | New conversation |
| `Ctrl+B` | Toggle navigation |
| `/` | Focus the message composer |
| `Ctrl+,` | Open settings |
| `Ctrl+Shift+V` | Start or stop voice input |
| `Enter` | Send message |
| `Shift+Enter` | Add a new line |

## Project structure

```text
jarvis/
├── website/
│   ├── src/app/                 Next.js routes and global styles
│   ├── src/components/          Chat workspace and settings UI
│   ├── src/lib/                 Preferences and desktop-app promotion URL
│   └── public/                  Website artwork
├── electron-main/
│   ├── main.js                  Window, secure storage, provider requests
│   ├── preload.js               Restricted renderer IPC bridge
│   ├── build-website.js         Static website export build helper
│   └── icons/                   Desktop application icons
└── README.md
```

## Security notes

- Electron renderer isolation, sandboxing, navigation restrictions, and sender validation are enabled.
- Desktop keys are encrypted before being written to disk.
- Provider errors are sanitized, and keys are redacted from desktop error messages.
- Desktop cloud-provider endpoints are built into the trusted main process rather than accepted from the renderer.
- The website never accepts personal API keys from visitors.
- Custom website endpoints are configured on the server, not accepted from arbitrary browser requests.
- Chat history is kept in memory rather than persisted by default.

## Troubleshooting

### The desktop app shows the offline page

Rebuild the exported website interface:

```powershell
cd electron-main
npm run build:website
```

### A provider reports that no key is configured

Open **Settings → Connections** and paste the API key again. JARVIS detects the provider and selects its default model automatically.

### A Next.js build reports cache deserialization or missing `.next` files

Close any running Next.js build, remove only `website/.next`, then rebuild. If the problem persists, use Node.js 20 LTS.

### Voice transcription does not work

Allow microphone access and add a Groq credential. Desktop transcription uses Groq's Whisper endpoint.
