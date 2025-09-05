import browser from "webextension-polyfill";
import { ProjectSettings, HeartbeatData, ShaderToyEditor, WakaTimeSettings } from "./types";

class ShaderToyWakaTime {
  private editor: ShaderToyEditor | null = null;
  private lastHeartbeat = 0;
  private lastActivity = 0;
  private lastFile = "";
  private heartbeatInterval = 120000; // 2 minutes as per WakaTime standard
  private maxInactivityTime = 900000; // 15 minutes of inactivity before stopping
  private cachedEditorData: any = null;
  private projectSettings: ProjectSettings = {
    enabled: false,
    name: "ShaderToy",
  };
  private wakatimeSettings: WakaTimeSettings | null = null;
  private uiContainer: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private projectCheckbox: HTMLInputElement | null = null;
  private projectInput: HTMLInputElement | null = null;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    this.createUI();
    this.loadSettings();
    this.setupEventListeners();
    this.trySetupEditor();
  }

  private trySetupEditor(): void {
    this.injectPageScript();

    document.addEventListener("wakatime-editor-ready", () => {
      this.setupEditorProxy();
    });
  }

  private injectPageScript(): void {
    const script = document.createElement("script");
    script.src = browser.runtime.getURL("injected.js");
    script.onload = () => script.remove();
    script.onerror = () => script.remove();

    (document.head || document.documentElement).appendChild(script);
  }

  private setupEditorProxy(): void {
    document.addEventListener("wakatime-editor-data-response", (event: any) => {
      this.cachedEditorData = event.detail;
    });

    document.addEventListener("wakatime-editor-change", () => {
      this.requestEditorData();
      this.sendHeartbeat();
    });

    document.addEventListener("wakatime-cursor-activity", () => {
      this.requestEditorData();
      this.sendHeartbeat();
    });

    this.editor = {
      getCursor: () => {
        return this.cachedEditorData
          ? {
              line: this.cachedEditorData.line - 1,
              ch: this.cachedEditorData.cursorPos,
            }
          : { line: 0, ch: 0 };
      },
      lastLine: () => {
        return this.cachedEditorData ? this.cachedEditorData.totalLines - 1 : 0;
      },
      on: () => {},
      off: () => {},
      getValue: () => "",
    } as ShaderToyEditor;

    this.requestEditorData();
  }

  private requestEditorData(): void {
    document.dispatchEvent(new CustomEvent("wakatime-request-editor-data"));
  }

  private createUI(): void {
    if (this.uiContainer && document.body.contains(this.uiContainer)) {
      return;
    }

    const container = document.querySelector("#content > .container > .block0");
    if (!container) {
      setTimeout(() => this.createUI(), 2000);
      return;
    }

    this.uiContainer = document.createElement("div");
    this.uiContainer.id = "wakatime-shadertoy-ui";
    this.uiContainer.classList.add("inputForm");
    this.uiContainer.style.cssText = `
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
    `;

    const title = document.createElement("div");
    title.textContent = "WakaTime Tracking";
    title.style.cssText = `
      font-weight: bold;
      margin-bottom: 8px;
    `;

    this.statusElement = document.createElement("div");
    this.statusElement.style.cssText = `
      font-size: 12px;
      margin-bottom: 8px;
      padding: 4px 8px;
      border-radius: 4px;
    `;
    this.updateStatusDisplay();

    const checkboxContainer = document.createElement("div");
    checkboxContainer.style.marginBottom = "5px";

    this.projectCheckbox = document.createElement("input");
    this.projectCheckbox.type = "checkbox";
    this.projectCheckbox.id = "wakatime-project-enabled";
    this.projectCheckbox.style.marginRight = "5px";

    const checkboxLabel = document.createElement("label");
    checkboxLabel.htmlFor = "wakatime-project-enabled";
    checkboxLabel.textContent = "Track this project";

    checkboxContainer.appendChild(this.projectCheckbox);
    checkboxContainer.appendChild(checkboxLabel);

    const inputContainer = document.createElement("div");
    inputContainer.style.marginTop = "5px";

    const inputLabel = document.createElement("label");
    inputLabel.textContent = "Project name: ";
    inputLabel.style.marginRight = "5px";

    this.projectInput = document.createElement("input");
    this.projectInput.type = "text";
    this.projectInput.placeholder = "Enter project name";
    this.projectInput.classList.add("inputForm");

    inputContainer.appendChild(inputLabel);
    inputContainer.appendChild(this.projectInput);

    this.uiContainer.appendChild(title);
    this.uiContainer.appendChild(this.statusElement);
    this.uiContainer.appendChild(checkboxContainer);
    this.uiContainer.appendChild(inputContainer);

    container.appendChild(this.uiContainer);

    this.projectCheckbox.addEventListener("change", () => {
      this.projectSettings.enabled = this.projectCheckbox!.checked;
      this.saveSettings();
    });

    this.projectInput.addEventListener("input", () => {
      this.projectSettings.name = this.projectInput!.value;
      this.saveSettings();
    });
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await browser.storage.sync.get(["projectSettings", "wakatimeSettings"]);
      if (result.projectSettings) {
        this.projectSettings = result.projectSettings;
      }
      if (result.wakatimeSettings) {
        this.wakatimeSettings = result.wakatimeSettings;
      }

      if (this.projectCheckbox) {
        this.projectCheckbox.checked = this.projectSettings.enabled;
      }
      if (this.projectInput) {
        this.projectInput.value = this.projectSettings.name;
      }

      this.updateStatusDisplay();
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  }

  private async saveSettings(): Promise<void> {
    try {
      await browser.storage.sync.set({
      projectSettings: this.projectSettings,
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  }

  private updateStatusDisplay(): void {
    if (!this.statusElement) return;

    const isConfigured = this.wakatimeSettings?.apiKey;
    const isEnabled = this.wakatimeSettings?.enabled;

    if (isConfigured && isEnabled) {
      this.statusElement.textContent = "✓ Configured and enabled";
      this.statusElement.style.cssText += `
        background: rgba(76, 175, 80, 0.1);
        color: #4CAF50;
        border: 1px solid rgba(76, 175, 80, 0.3);
      `;
    } else if (isConfigured && !isEnabled) {
      this.statusElement.textContent = "⚠ Configured but disabled";
      this.statusElement.style.cssText += `
        background: rgba(255, 193, 7, 0.1);
        color: #FFC107;
        border: 1px solid rgba(255, 193, 7, 0.3);
      `;
    } else {
      this.statusElement.textContent = "✗ Not configured - click extension icon to setup";
      this.statusElement.style.cssText += `
        background: rgba(244, 67, 54, 0.1);
        color: #f44336;
        border: 1px solid rgba(244, 67, 54, 0.3);
      `;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener("focus", () => {
      const timeSinceLastActivity = Date.now() - this.lastActivity;
      if (timeSinceLastActivity < 300000 || this.lastActivity === 0) {
        this.sendHeartbeat();
      }
    });

    document.addEventListener("mousedown", () => this.updateActivity());
    document.addEventListener("keydown", () => this.updateActivity());
    document.addEventListener("scroll", () => this.updateActivity());

    browser.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync' && changes.wakatimeSettings) {
        this.wakatimeSettings = changes.wakatimeSettings.newValue;
        this.updateStatusDisplay();
      }
    });
  }

  private updateActivity(): void {
    this.lastActivity = Date.now();
  }

  private sendHeartbeat(): void {
    if (!this.editor || !this.cachedEditorData) {
      return;
    }

    if (!this.wakatimeSettings?.enabled || !this.wakatimeSettings?.apiKey) {
      return;
    }

    const now = Date.now();
    const timeSinceLastHeartbeat = now - this.lastHeartbeat;
    const timeSinceLastActivity = now - this.lastActivity;
    const currentFile = window.location.href;

    this.lastActivity = now;

    if (
      timeSinceLastActivity > this.maxInactivityTime &&
      this.lastActivity > 0
    ) {
      return;
    }

    const enoughTimeHasPassed =
      timeSinceLastHeartbeat >= this.heartbeatInterval;
    const fileHasChanged = this.lastFile !== currentFile;

    if (!enoughTimeHasPassed && !fileHasChanged) {
      return;
    }

    const cursor = this.editor.getCursor();
    const totalLines = this.editor.lastLine() + 1;

    const isViewingShader = currentFile.includes("/view");
    const entity = isViewingShader ? currentFile : "untitled";
    const entityType = isViewingShader ? "url" : "file";

    const heartbeatData: HeartbeatData = {
      time: Math.floor(now / 1000),
      entity: entity,
      type: entityType,
      category: "coding",
      language: "glsl",
      lines: totalLines,
      lineno: cursor.line + 1,
      cursorpos: cursor.ch,
      is_write: false,
    };

    if (this.projectSettings.enabled && this.projectSettings.name) {
      heartbeatData.project = this.projectSettings.name;
    }

    console.log("[WakaTime ShaderToy] Sending heartbeat:", {
      line: heartbeatData.lineno,
      cursorPos: heartbeatData.cursorpos,
      totalLines: heartbeatData.lines,
      project: heartbeatData.project,
      timeSinceLastHeartbeat,
      fileChanged: fileHasChanged,
      enoughTimeHasPassed,
    });

    browser.runtime.sendMessage({
      type: "SEND_HEARTBEAT",
      data: heartbeatData,
    });

    this.lastHeartbeat = now;
    this.lastFile = currentFile;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => new ShaderToyWakaTime());
} else {
  new ShaderToyWakaTime();
}
