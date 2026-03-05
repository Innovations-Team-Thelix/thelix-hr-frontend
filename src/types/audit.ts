import { AuditLog } from './index';

export type { AuditLog };

export interface AuditQuery {
  page?: number;
  limit?: number;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  sbuId?: string;
  departmentId?: string;
  employmentStatus?: string;
  startDate?: string;
  endDate?: string;
}
