import { apiGet, apiPut } from '@/lib/api';

export interface NotificationSettings {
  campusBelek: boolean;
  campusCandir: boolean;
  campusManavgat: boolean;
  enableNewEvaluation: boolean;
  enableNewPrescription: boolean;
  enableNewCriticalWarning: boolean;
}

export async function fetchNotificationSettings(): Promise<NotificationSettings> {
  return apiGet<NotificationSettings>('/notifications/settings');
}

export async function updateNotificationSettings(
  settings: NotificationSettings
): Promise<NotificationSettings> {
  return apiPut<NotificationSettings>('/notifications/settings', settings);
}
