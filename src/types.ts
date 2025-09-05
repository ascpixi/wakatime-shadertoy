export interface WakaTimeSettings {
  apiKey: string;
  apiUrl: string;
  enabled: boolean;
}

export interface ProjectSettings {
  enabled: boolean;
  name: string;
}

export interface HeartbeatData {
  time: number;
  entity: string;
  type: "file" | "url" | "app" | "domain";
  category: "coding";
  project?: string;
  language: "glsl";
  lines: number;
  lineno: number;
  cursorpos: number;
  is_write: boolean;
}

export interface ShaderToyEditor {
  getCursor(): { line: number; ch: number };
  lastLine(): number;
  getValue(): string;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

declare global {
  interface Window {
    gShaderToy: {
      mCodeEditor: ShaderToyEditor;
    };
  }
}
