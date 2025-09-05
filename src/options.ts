import browser from "webextension-polyfill";
import { WakaTimeSettings } from "./types";

class OptionsManager {
  private enabledCheckbox: HTMLInputElement | null = null;
  private apiKeyInput: HTMLInputElement | null = null;
  private apiUrlInput: HTMLInputElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private testButton: HTMLButtonElement | null = null;
  private statusMessage: HTMLElement | null = null;

  private settings: WakaTimeSettings = {
    apiKey: "",
    apiUrl: "https://api.wakatime.com/api/v1",
    enabled: true,
  };

  constructor() {
    this.init();
  }

  private init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      this.setupElements();
      this.setupEventListeners();
      this.loadSettings();
    });
  }

  private setupElements(): void {
    this.enabledCheckbox = document.getElementById(
      "enabled"
    ) as HTMLInputElement;
    this.apiKeyInput = document.getElementById("apiKey") as HTMLInputElement;
    this.apiUrlInput = document.getElementById("apiUrl") as HTMLInputElement;
    this.saveButton = document.getElementById("saveBtn") as HTMLButtonElement;
    this.testButton = document.getElementById("testBtn") as HTMLButtonElement;
    this.statusMessage = document.getElementById("statusMessage");
  }

  private setupEventListeners(): void {
    if (this.saveButton) {
      this.saveButton.addEventListener("click", () => this.saveSettings());
    }

    if (this.testButton) {
      this.testButton.addEventListener("click", () => this.testConnection());
    }

    // Auto-save on changes
    [this.enabledCheckbox, this.apiKeyInput, this.apiUrlInput].forEach(
      (element) => {
        if (element) {
          element.addEventListener("change", () => this.updateSettings());
          if (element.type !== "checkbox") {
            element.addEventListener("input", () => this.updateSettings());
          }
        }
      }
    );
  }

  private async loadSettings(): Promise<void> {
    try {
      const result = await browser.storage.sync.get(["wakatimeSettings"]);
      if (result && result.wakatimeSettings) {
        this.settings = { ...this.settings, ...result.wakatimeSettings };
      }

      this.updateUI();
    } catch (error) {
      console.error("Failed to load settings:", error);
      this.showMessage("Failed to load settings", "error");
    }
  }

  private updateUI(): void {
    if (this.enabledCheckbox) {
      this.enabledCheckbox.checked = this.settings.enabled;
    }

    if (this.apiKeyInput) {
      this.apiKeyInput.value = this.settings.apiKey;
    }

    if (this.apiUrlInput) {
      this.apiUrlInput.value = this.settings.apiUrl;
    }
  }

  private updateSettings(): void {
    if (this.enabledCheckbox) {
      this.settings.enabled = this.enabledCheckbox.checked;
    }

    if (this.apiKeyInput) {
      this.settings.apiKey = this.apiKeyInput.value.trim();
    }

    if (this.apiUrlInput) {
      this.settings.apiUrl =
        this.apiUrlInput.value.trim() || "https://api.wakatime.com/api/v1";
    }
  }

  private async saveSettings(): Promise<void> {
    if (!this.saveButton) return;

    this.saveButton.disabled = true;
    this.saveButton.textContent = "Saving...";

    try {
      this.updateSettings();

      await browser.storage.sync.set({
        wakatimeSettings: this.settings,
      });

      this.showMessage("Settings saved successfully", "success");
    } catch (error) {
      console.error("Failed to save settings:", error);
      this.showMessage("Failed to save settings", "error");
    }

    this.saveButton.disabled = false;
    this.saveButton.textContent = "Save Settings";
  }

  private async testConnection(): Promise<void> {
    if (!this.testButton) return;

    this.testButton.disabled = true;
    this.testButton.textContent = "Testing...";

    try {
      // Update settings with current form values
      this.updateSettings();

      // Temporarily save current settings for test
      await browser.storage.sync.set({
        wakatimeSettings: this.settings,
      });

      const response = await browser.runtime.sendMessage({ type: "TEST_API" });

      if (response.success) {
        this.showMessage(response.message, "success");
      } else {
        this.showMessage(response.message, "error");
      }
    } catch (error) {
      this.showMessage("Failed to test connection", "error");
    }

    this.testButton.disabled = false;
    this.testButton.textContent = "Test Connection";
  }

  private showMessage(message: string, type: "success" | "error"): void {
    if (!this.statusMessage) return;

    this.statusMessage.textContent = message;
    this.statusMessage.className = `status-message ${type}`;
    this.statusMessage.style.display = "block";

    // Auto-hide success messages
    if (type === "success") {
      setTimeout(() => {
        if (this.statusMessage) {
          this.statusMessage.style.display = "none";
        }
      }, 3000);
    }
  }
}

new OptionsManager();
