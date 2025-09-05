import browser from "webextension-polyfill";
import { WakaTimeSettings } from "./types";

class PopupManager {
  private statusElement: HTMLElement | null = null;
  private testButton: HTMLButtonElement | null = null;
  private optionsButton: HTMLButtonElement | null = null;
  private testResult: HTMLElement | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    document.addEventListener("DOMContentLoaded", () => {
      this.setupElements();
      this.setupEventListeners();
      this.updateStatus();
    });
  }

  private setupElements(): void {
    this.statusElement = document.getElementById("status");
    this.testButton = document.getElementById("testBtn") as HTMLButtonElement;
    this.optionsButton = document.getElementById(
      "optionsBtn"
    ) as HTMLButtonElement;
    this.testResult = document.getElementById("testResult");
  }

  private setupEventListeners(): void {
    if (this.testButton) {
      this.testButton.addEventListener("click", () => this.testConnection());
    }

    if (this.optionsButton) {
      this.optionsButton.addEventListener("click", () => this.openOptions());
    }
  }

  private async updateStatus(): Promise<void> {
    try {
      const result = await browser.storage.sync.get(["wakatimeSettings"]);
      const settings: WakaTimeSettings = result.wakatimeSettings;

      if (this.statusElement) {
        if (settings && settings.apiKey && settings.enabled) {
          this.statusElement.className = "status connected";
          this.statusElement.innerHTML =
            '<div class="status-indicator"></div><span>Configured and enabled</span>';
        } else if (settings && settings.apiKey) {
          this.statusElement.className = "status disconnected";
          this.statusElement.innerHTML =
            '<div class="status-indicator"></div><span>Configured but disabled</span>';
        } else {
          this.statusElement.className = "status disconnected";
          this.statusElement.innerHTML =
            '<div class="status-indicator"></div><span>Not configured</span>';
        }
      }
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  }

  private async testConnection(): Promise<void> {
    if (!this.testButton || !this.testResult) return;

    this.testButton.disabled = true;
    this.testButton.textContent = "Testing...";

    try {
      const response = await browser.runtime.sendMessage({ type: "TEST_API" });

      this.testResult.style.display = "block";
      this.testResult.className = response.success
        ? "test-result success"
        : "test-result error";
      this.testResult.textContent = response.message;
    } catch (error) {
      this.testResult.style.display = "block";
      this.testResult.className = "test-result error";
      this.testResult.textContent = "Failed to test connection";
    }

    this.testButton.disabled = false;
    this.testButton.textContent = "Test Connection";
  }

  private openOptions(): void {
    browser.runtime.openOptionsPage();
  }
}

new PopupManager();
