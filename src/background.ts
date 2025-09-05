import browser from "webextension-polyfill";
import { WakaTimeSettings, HeartbeatData } from "./types";

class WakaTimeBackground {
  private defaultSettings: WakaTimeSettings = {
    apiKey: "",
    apiUrl: "https://api.wakatime.com/api/v1",
    enabled: true,
  };

  constructor() {
    this.init();
  }

  private init(): void {
    // Listen for messages from content script
    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.type === "SEND_HEARTBEAT") {
        this.sendHeartbeat(request.data);
      } else if (request.type === "TEST_API") {
        this.testAPI().then(sendResponse);
        return true; // Will respond asynchronously
      }
    });

    // Initialize default settings if not exists
    this.initializeSettings();
  }

  private async initializeSettings(): Promise<void> {
    try {
      const result = await browser.storage.sync.get(["wakatimeSettings"]);
      if (!result.wakatimeSettings) {
        await browser.storage.sync.set({
          wakatimeSettings: this.defaultSettings,
        });
      }
    } catch (error) {
      console.error("Failed to initialize settings:", error);
    }
  }

  private async sendHeartbeat(heartbeatData: HeartbeatData): Promise<void> {
    try {
      const result = await browser.storage.sync.get(["wakatimeSettings"]);
      const settings: WakaTimeSettings =
        result.wakatimeSettings || this.defaultSettings;

      if (!settings.enabled || !settings.apiKey) {
        console.log("[WakaTime ShaderToy] WakaTime not configured or disabled");
        return;
      }

      const url = `${settings.apiUrl}/users/current/heartbeats`;

      console.log("[WakaTime ShaderToy] Sending heartbeat to API:", {
        url,
        entity: heartbeatData.entity,
        project: heartbeatData.project,
        line: heartbeatData.lineno,
        cursorPos: heartbeatData.cursorpos,
        totalLines: heartbeatData.lines,
        isWrite: heartbeatData.is_write,
        language: heartbeatData.language,
        timestamp: new Date(heartbeatData.time * 1000).toISOString(),
      });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
          "User-Agent": "wakatime-shadertoy-extension/1.0.0",
        },
        body: JSON.stringify(heartbeatData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[WakaTime ShaderToy] WakaTime API error:",
          response.status,
          errorText
        );

        // Show notification for auth errors
        if (response.status === 401) {
          this.showNotification(
            "WakaTime API key is invalid",
            "Please check your API key in the extension settings."
          );
        } else if (response.status >= 500) {
          this.showNotification(
            "WakaTime API error",
            "Server error occurred. Please try again later."
          );
        }
      } else {
        console.log(
          "[WakaTime ShaderToy] Heartbeat sent successfully - Status:",
          response.status
        );
      }
    } catch (error) {
      console.error("[WakaTime ShaderToy] Failed to send heartbeat:", error);
      if (error instanceof Error && error.message.includes("fetch")) {
        this.showNotification(
          "Network error",
          "Failed to connect to WakaTime API. Please check your internet connection."
        );
      }
    }
  }

  private async testAPI(): Promise<{ success: boolean; message: string }> {
    try {
      const result = await browser.storage.sync.get(["wakatimeSettings"]);
      const settings: WakaTimeSettings =
        result.wakatimeSettings || this.defaultSettings;

      if (!settings.apiKey) {
        return { success: false, message: "API key is required" };
      }

      // Test by sending a simple heartbeat request to validate API key
      const url = `${settings.apiUrl}/users/current/heartbeats`;

      console.log("[WakaTime ShaderToy] Testing API connection to:", url);

      const testHeartbeat = {
        entity: "wakatime-shadertoy-extension/test",
        type: "app",
        category: "coding",
        time: Math.floor(Date.now() / 1000),
        project: "wakatime-shadertoy-test",
        language: "text",
      };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.apiKey}`,
          "User-Agent": "wakatime-shadertoy-extension/1.0.0",
        },
        body: JSON.stringify(testHeartbeat),
      });

      if (response.ok) {
        return {
          success: true,
          message: `Connected successfully! API key is valid.`,
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: `Invalid API key. Please check your WakaTime API key.`,
        };
      } else if (response.status === 402) {
        return {
          success: false,
          message: `WakaTime plan limit reached. Please upgrade your plan.`,
        };
      } else {
        const errorText = await response.text();
        console.log(
          "[WakaTime ShaderToy] Test API response:",
          response.status,
          errorText
        );
        return {
          success: false,
          message: `API Error ${response.status}. Check if your API server URL is correct.`,
        };
      }
    } catch (error) {
      console.error("[WakaTime ShaderToy] Test API error:", error);
      return {
        success: false,
        message: `Connection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      };
    }
  }

  private showNotification(title: string, message: string): void {
    if (browser.notifications) {
      browser.notifications.create({
        type: "basic",
        iconUrl: "icons/icon-48.png",
        title: title,
        message: message,
      });
    }
  }
}

new WakaTimeBackground();
