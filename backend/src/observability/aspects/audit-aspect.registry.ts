import { AuditContextService } from '../services/audit-context.service';
import { AuditLoggerService } from '../services/audit-logger.service';

export class AuditAspectRegistry {
  private static logger: AuditLoggerService | null = null;
  private static context: AuditContextService | null = null;

  static registerLogger(logger: AuditLoggerService): void {
    AuditAspectRegistry.logger = logger;
  }

  static registerContext(context: AuditContextService): void {
    AuditAspectRegistry.context = context;
  }

  static getLogger(): AuditLoggerService | null {
    return AuditAspectRegistry.logger;
  }

  static getContext(): AuditContextService | null {
    return AuditAspectRegistry.context;
  }

  static clear(): void {
    AuditAspectRegistry.logger = null;
    AuditAspectRegistry.context = null;
  }
}
