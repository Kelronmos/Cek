
export interface AlertConfig {
  webhookUrl: string;
  email: string;
  enabled: boolean;
  minStatus: 'Yellow' | 'Red';
}

export class AlertService {
  private static instance: AlertService;
  private config: AlertConfig = {
    webhookUrl: '',
    email: '',
    enabled: false,
    minStatus: 'Yellow'
  };

  private constructor() {}

  static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  updateConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
  }

  getConfig(): AlertConfig {
    return { ...this.config };
  }

  async sendAlert(details: any, avgDrift: number) {
    if (!this.config.enabled) return;

    const statusOrder = { 'Green': 0, 'Yellow': 1, 'Red': 2 };
    if (statusOrder[details.status as keyof typeof statusOrder] < statusOrder[this.config.minStatus]) {
      return;
    }

    const payload = {
      alertType: 'CEK_ALIGNMENT_DRIFT',
      severity: details.status,
      timestamp: new Date().toISOString(),
      averageDrift: avgDrift,
      evaluation: {
        text: details.text,
        vector: details.vector,
        drift: details.drift,
        status: details.status,
        sentiment: details.sentiment?.score
      },
      message: `CRITICAL: AI Alignment Drift detected. Status: ${details.status}. Average Drift: ${avgDrift}`
    };

    console.log('Sending alert:', payload);

    if (this.config.webhookUrl) {
      try {
        const response = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          console.error('Failed to send webhook alert:', response.statusText);
        }
      } catch (error) {
        console.error('Error sending webhook alert:', error);
      }
    }

    // Note: Email sending would typically require a backend or a service like EmailJS.
    // For this demo, we'll log it and simulate the intent.
    if (this.config.email) {
      console.log(`[SIMULATED EMAIL ALERT] To: ${this.config.email}\nSubject: CEK Alert - ${details.status}\nBody: ${JSON.stringify(payload, null, 2)}`);
    }
  }

  async triggerAlert(alert: { title: string, message: string, severity: string, timestamp: string, metadata?: any }) {
    if (!this.config.enabled) return;

    const payload = {
      alertType: 'IDENTITY_PROTECTION',
      ...alert
    };

    console.log('Triggering alert:', payload);

    if (this.config.webhookUrl) {
      try {
        await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (error) {
        console.error('Error triggering webhook alert:', error);
      }
    }

    if (this.config.email) {
      console.log(`[SIMULATED EMAIL ALERT] To: ${this.config.email}\nSubject: ${alert.title}\nBody: ${alert.message}\nMetadata: ${JSON.stringify(alert.metadata)}`);
    }
  }
}

export const alertService = AlertService.getInstance();
