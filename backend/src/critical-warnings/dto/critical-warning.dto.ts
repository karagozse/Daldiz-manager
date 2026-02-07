export enum CriticalWarningStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum CriticalWarningSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export class CriticalWarningDto {
  id: string;
  topicId: number;
  title: string;
  description: string;
  status: CriticalWarningStatus;
  openedDate: string; // ISO string
  closedDate?: string; // ISO string
  closureNote?: string;
  gardenId: string; // string to match frontend expectations (number as string)
  gardenName: string;
  campusId: string;
  campusName: string;
  severity?: CriticalWarningSeverity;
}