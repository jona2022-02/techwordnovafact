// lib/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: string;
  data?: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isClient = typeof window !== 'undefined';

  private formatMessage(level: LogLevel, message: string, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const emoji = this.getEmoji(level);
    return `${emoji} ${timestamp} ${contextStr} ${message}`;
  }

  private getEmoji(level: LogLevel): string {
    switch (level) {
      case 'debug': return '🔍';
      case 'info': return 'ℹ️';
      case 'warn': return '⚠️';
      case 'error': return '🚨';
      default: return '📝';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error') return true; // Always log errors
    return this.isDevelopment; // Only log other levels in development
  }

  debug(message: string, data?: any, context?: string): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context), data || '');
    }
  }

  info(message: string, data?: any, context?: string): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context), data || '');
    }
  }

  warn(message: string, data?: any, context?: string): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context), data || '');
    }
  }

  error(message: string, error?: any, context?: string): void {
    const formattedMessage = this.formatMessage('error', message, context);
    console.error(formattedMessage, error || '');
    
    // En producción, aquí podrías enviar a un servicio de monitoreo
    if (!this.isDevelopment && this.isClient) {
      this.sendToMonitoring({ level: 'error', message, timestamp: new Date(), context, data: error });
    }
  }

  private sendToMonitoring(entry: LogEntry): void {
    // Placeholder para servicio de monitoreo (Sentry, LogRocket, etc.)
    // fetch('/api/monitoring/log', {
    //   method: 'POST',
    //   body: JSON.stringify(entry)
    // });
  }

  // Métodos específicos para contextos comunes
  service(serviceName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, serviceName),
      info: (message: string, data?: any) => this.info(message, data, serviceName),
      warn: (message: string, data?: any) => this.warn(message, data, serviceName),
      error: (message: string, error?: any) => this.error(message, error, serviceName),
    };
  }

  component(componentName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, `Component:${componentName}`),
      info: (message: string, data?: any) => this.info(message, data, `Component:${componentName}`),
      warn: (message: string, data?: any) => this.warn(message, data, `Component:${componentName}`),
      error: (message: string, error?: any) => this.error(message, error, `Component:${componentName}`),
    };
  }

  hook(hookName: string) {
    return {
      debug: (message: string, data?: any) => this.debug(message, data, `Hook:${hookName}`),
      info: (message: string, data?: any) => this.info(message, data, `Hook:${hookName}`),
      warn: (message: string, data?: any) => this.warn(message, data, `Hook:${hookName}`),
      error: (message: string, error?: any) => this.error(message, error, `Hook:${hookName}`),
    };
  }
}

// Export singleton instance
export const logger = new Logger();

// Export specialized loggers for common use cases
export const serviceLogger = (serviceName: string) => logger.service(serviceName);
export const componentLogger = (componentName: string) => logger.component(componentName);
export const hookLogger = (hookName: string) => logger.hook(hookName);