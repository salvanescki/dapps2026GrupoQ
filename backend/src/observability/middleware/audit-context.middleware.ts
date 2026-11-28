import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction } from 'express';
import {
  RequestConAuditoria,
  resolverRequestId,
  ResponseConAuditoria,
} from '../config/pino-logger.config';
import { AuditContextService } from '../services/audit-context.service';

@Injectable()
export class AuditContextMiddleware implements NestMiddleware {
  constructor(private readonly auditContext: AuditContextService) {}

  use(
    req: RequestConAuditoria,
    res: ResponseConAuditoria,
    next: NextFunction,
  ): void {
    const existingId =
      typeof req.id === 'string' && req.id.trim().length > 0 ? req.id : null;
    const requestId = existingId ?? resolverRequestId(req, res);

    req.id = requestId;
    if (
      typeof res.setHeader === 'function' &&
      !res.headersSent
    ) {
      try {
        res.setHeader('x-request-id', requestId);
      } catch {
        // fail-safe
      }
    }

    this.auditContext.ejecutarEnContexto(requestId, () => {
      next();
    });
  }
}
