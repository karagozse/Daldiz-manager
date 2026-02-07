import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webpush from 'web-push';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@Injectable()
export class NotificationsService {
  private vapidConfigured = false;

  constructor(private prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT || 'mailto:admin@daldiz.com';

    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
      this.vapidConfigured = true;
    } else {
      console.warn('VAPID config eksik, push bildirimleri devre dışı.');
    }
  }

  /**
   * Get current user's notification settings. Create with defaults if none exist.
   */
  async getSettings(userId: number) {
    let settings = await this.prisma.user_notification_settings.findUnique({
      where: { userId },
    });
    if (!settings) {
      const createdAt = new Date();
      settings = await this.prisma.user_notification_settings.create({
        data: {
          userId,
          campusBelek: true,
          campusCandir: true,
          campusManavgat: true,
          enableNewEvaluation: true,
          enableNewPrescription: true,
          enableNewCriticalWarning: true,
          updatedAt: createdAt,
        },
      });
    }
    return settings;
  }

  /**
   * Upsert current user's notification settings.
   */
  async updateSettings(userId: number, dto: UpdateSettingsDto) {
    const now = new Date();
    return this.prisma.user_notification_settings.upsert({
      where: { userId },
      update: {
        ...dto,
        updatedAt: now,
      },
      create: {
        userId,
        ...dto,
        updatedAt: now,
      },
    });
  }

  /**
   * Register or update a web push subscription for the current user.
   * When a new subscription is created for a user, old subscriptions from the same user are removed
   * to avoid sending notifications to invalid endpoints.
   * On unique constraint / DB errors, logs and returns { success: false }; does not throw.
   */
  async createSubscription(userId: number, dto: CreateSubscriptionDto) {
    try {
      const now = new Date();
      
      // First, upsert the new subscription
      await this.prisma.web_push_subscriptions.upsert({
        where: { endpoint: dto.endpoint },
        update: {
          p256dh: dto.p256dh,
          auth: dto.auth,
          userId,
          userAgent: dto.userAgent ?? null,
          updatedAt: now,
        },
        create: {
          endpoint: dto.endpoint,
          p256dh: dto.p256dh,
          auth: dto.auth,
          userId,
          userAgent: dto.userAgent ?? null,
          updatedAt: now,
        },
      });

      // Remove old subscriptions for the same user (except the one we just created/updated)
      // This ensures we don't accumulate invalid subscriptions when user switches devices/domains
      const deletedCount = await this.prisma.web_push_subscriptions.deleteMany({
        where: {
          userId,
          endpoint: { not: dto.endpoint },
        },
      });

      if (deletedCount.count > 0) {
        console.log('createSubscription: removed old subscriptions', {
          userId,
          deletedCount: deletedCount.count,
          newEndpoint: dto.endpoint.substring(0, 50) + '...',
        });
      }

      return { success: true };
    } catch (error) {
      console.error('createSubscription failed:', error);
      return { success: false };
    }
  }

  /**
   * Send web push notification when a prescription is approved
   * This function is called after prescription approval is successfully saved to DB
   * Errors are logged but never thrown to avoid breaking the main flow
   */
  async notifyPrescriptionApproved(prescription: {
    id: number;
    campusId: string;
    campuses?: { name: string } | null;
  }): Promise<void> {
    try {
      console.log('NOTIFY_PRESCRIPTION_APPROVED: called', {
        prescriptionId: prescription.id,
        campusId: prescription.campusId,
        campusName: prescription.campuses?.name || prescription.campusId,
        vapidConfigured: this.vapidConfigured,
      });

      if (!this.vapidConfigured) {
        console.log('NOTIFY_PRESCRIPTION_APPROVED: VAPID not configured, skipping');
        return;
      }

      // Get campus name for notification
      const campusName = prescription.campuses?.name || prescription.campusId;

      // Find users who should receive notifications for this campus
      const usersToNotify = await this.prisma.user_notification_settings.findMany({
        where: {
          enableNewPrescription: true,
          ...(prescription.campusId === 'belek' && { campusBelek: true }),
          ...(prescription.campusId === 'candir' && { campusCandir: true }),
          ...(prescription.campusId === 'manavgat' && { campusManavgat: true }),
        },
        include: {
          users: {
            include: {
              web_push_subscriptions: true,
            },
          },
        },
      });

      console.log('NOTIFY_PRESCRIPTION_APPROVED: found user_notification_settings', {
        totalUsers: usersToNotify.length,
        campusId: prescription.campusId,
      });

      if (usersToNotify.length === 0) {
        console.log('NOTIFY_PRESCRIPTION_APPROVED: no users to notify, skipping');
        return;
      }

      // Count total subscriptions
      let totalSubscriptions = 0;
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        totalSubscriptions += subscriptions.length;
      }

      console.log('NOTIFY_PRESCRIPTION_APPROVED: total subscriptions found', {
        totalSubscriptions,
        usersWithSubscriptions: usersToNotify.filter(
          (u) => (u.users?.web_push_subscriptions?.length || 0) > 0,
        ).length,
      });

      if (totalSubscriptions === 0) {
        console.log('NOTIFY_PRESCRIPTION_APPROVED: no subscriptions, skipping');
        return;
      }

      const notificationPayload = JSON.stringify({
        title: 'Yeni Reçete Yayınlandı',
        body: `${campusName} yeni reçete yayınlandı.`,
        icon: '/icons/daldiz-192.png',
        badge: '/icons/daldiz-192.png',
        data: {
          type: 'prescription_approved',
          prescriptionId: prescription.id,
          campusId: prescription.campusId,
        },
      });

      const sendPromises: Promise<{ success: boolean; subscriptionId?: number; userId?: number; error?: any }>[] = [];
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        for (const subscription of subscriptions) {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          };
          sendPromises.push(
            webpush
              .sendNotification(pushSubscription, notificationPayload)
              .then(() => {
                return { success: true, subscriptionId: subscription.id, userId: userSetting.userId };
              })
              .catch((error) => {
                console.error('NOTIFY_PRESCRIPTION_APPROVED send error', {
                  endpoint: subscription.endpoint.substring(0, 50) + '...',
                  subscriptionId: subscription.id,
                  userId: userSetting.userId,
                  error: error.message || error,
                });
                return { success: false, subscriptionId: subscription.id, userId: userSetting.userId, error };
              }),
          );
        }
      }

      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log('NOTIFY_PRESCRIPTION_APPROVED: send results', {
        total: results.length,
        successful,
        failed,
        prescriptionId: prescription.id,
        campusId: prescription.campusId,
      });
    } catch (error) {
      // Never throw - this is a non-critical background operation
      console.error('NOTIFY_PRESCRIPTION_APPROVED: unexpected error', error);
    }
  }

  /**
   * Send web push notification when an evaluation is completed (inspection scored)
   * This function is called after inspection status is set to SCORED
   * Errors are logged but never thrown to avoid breaking the main flow
   */
  async notifyEvaluationCompleted(inspection: {
    id: string;
    gardenId: number;
    garden?: { name: string; campus?: { id: string; name: string } | null } | null;
  }): Promise<void> {
    try {
      console.log('NOTIFY_EVALUATION_COMPLETED: called', {
        inspectionId: inspection.id,
        gardenId: inspection.gardenId,
        gardenName: inspection.garden?.name || `Garden-${inspection.gardenId}`,
        campusId: inspection.garden?.campus?.id || 'unknown',
        campusName: inspection.garden?.campus?.name || 'unknown',
        vapidConfigured: this.vapidConfigured,
      });

      if (!this.vapidConfigured) {
        console.log('NOTIFY_EVALUATION_COMPLETED: VAPID not configured, skipping');
        return;
      }

      // Get campus and garden names for notification
      const campusId = inspection.garden?.campus?.id;
      const campusName = inspection.garden?.campus?.name || campusId || 'Bilinmeyen Kampüs';
      const gardenName = inspection.garden?.name || `Bahçe-${inspection.gardenId}`;

      if (!campusId) {
        console.log('NOTIFY_EVALUATION_COMPLETED: no campusId found, skipping');
        return;
      }

      // Find users who should receive notifications for this campus
      const usersToNotify = await this.prisma.user_notification_settings.findMany({
        where: {
          enableNewEvaluation: true,
          ...(campusId === 'belek' && { campusBelek: true }),
          ...(campusId === 'candir' && { campusCandir: true }),
          ...(campusId === 'manavgat' && { campusManavgat: true }),
        },
        include: {
          users: {
            include: {
              web_push_subscriptions: true,
            },
          },
        },
      });

      console.log('NOTIFY_EVALUATION_COMPLETED: found user_notification_settings', {
        totalUsers: usersToNotify.length,
        campusId,
      });

      if (usersToNotify.length === 0) {
        console.log('NOTIFY_EVALUATION_COMPLETED: no users to notify, skipping');
        return;
      }

      // Count total subscriptions
      let totalSubscriptions = 0;
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        totalSubscriptions += subscriptions.length;
      }

      console.log('NOTIFY_EVALUATION_COMPLETED: total subscriptions found', {
        totalSubscriptions,
        usersWithSubscriptions: usersToNotify.filter(
          (u) => (u.users?.web_push_subscriptions?.length || 0) > 0,
        ).length,
      });

      if (totalSubscriptions === 0) {
        console.log('NOTIFY_EVALUATION_COMPLETED: no subscriptions, skipping');
        return;
      }

      const notificationPayload = JSON.stringify({
        title: 'Yeni Denetim Raporu',
        body: `${campusName}, ${gardenName} bahçe yeni denetim raporu oluşturuldu.`,
        icon: '/icons/daldiz-192.png',
        badge: '/icons/daldiz-192.png',
        data: {
          type: 'evaluation_completed',
          inspectionId: inspection.id,
          gardenId: inspection.gardenId,
          campusId,
        },
      });

      const sendPromises: Promise<{ success: boolean; subscriptionId?: number; userId?: number; error?: any }>[] = [];
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        for (const subscription of subscriptions) {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          };
          sendPromises.push(
            webpush
              .sendNotification(pushSubscription, notificationPayload)
              .then(() => {
                return { success: true, subscriptionId: subscription.id, userId: userSetting.userId };
              })
              .catch(async (error) => {
                const errorMessage = error.message || String(error);
                const statusCode = error.statusCode || error.status;
                
                console.error('NOTIFY_EVALUATION_COMPLETED send error', {
                  endpoint: subscription.endpoint.substring(0, 50) + '...',
                  subscriptionId: subscription.id,
                  userId: userSetting.userId,
                  error: errorMessage,
                  statusCode,
                });

                // If subscription is invalid (410 Gone, 404 Not Found), remove it from DB
                if (statusCode === 410 || statusCode === 404) {
                  try {
                    await this.prisma.web_push_subscriptions.delete({
                      where: { id: subscription.id },
                    });
                    console.log('NOTIFY_EVALUATION_COMPLETED: removed invalid subscription', {
                      subscriptionId: subscription.id,
                      userId: userSetting.userId,
                      statusCode,
                    });
                  } catch (deleteError) {
                    console.error('NOTIFY_EVALUATION_COMPLETED: failed to delete invalid subscription', {
                      subscriptionId: subscription.id,
                      error: deleteError instanceof Error ? deleteError.message : deleteError,
                    });
                  }
                }

                return { success: false, subscriptionId: subscription.id, userId: userSetting.userId, error };
              }),
          );
        }
      }

      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log('NOTIFY_EVALUATION_COMPLETED: send results', {
        total: results.length,
        successful,
        failed,
        inspectionId: inspection.id,
        gardenId: inspection.gardenId,
        campusId,
      });
    } catch (error) {
      // Never throw - this is a non-critical background operation
      console.error('NOTIFY_EVALUATION_COMPLETED: unexpected error', error);
    }
  }

  /**
   * Send web push notification when a critical warning is created
   * This function is called after critical warning is successfully saved to DB
   * Errors are logged but never thrown to avoid breaking the main flow
   */
  async notifyCriticalWarningCreated(warning: {
    id: string;
    gardenId: number;
    garden?: { name: string; campus?: { id: string; name: string } | null } | null;
  }): Promise<void> {
    try {
      console.log('NOTIFY_CRITICAL_WARNING_CREATED: called', {
        warningId: warning.id,
        gardenId: warning.gardenId,
        gardenName: warning.garden?.name || `Garden-${warning.gardenId}`,
        campusId: warning.garden?.campus?.id || 'unknown',
        campusName: warning.garden?.campus?.name || 'unknown',
        vapidConfigured: this.vapidConfigured,
      });

      if (!this.vapidConfigured) {
        console.log('NOTIFY_CRITICAL_WARNING_CREATED: VAPID not configured, skipping');
        return;
      }

      // Get campus and garden names for notification
      const campusId = warning.garden?.campus?.id;
      const campusName = warning.garden?.campus?.name || campusId || 'Bilinmeyen Kampüs';
      const gardenName = warning.garden?.name || `Bahçe-${warning.gardenId}`;

      if (!campusId) {
        console.log('NOTIFY_CRITICAL_WARNING_CREATED: no campusId found, skipping');
        return;
      }

      // Find users who should receive notifications for this campus
      const usersToNotify = await this.prisma.user_notification_settings.findMany({
        where: {
          enableNewCriticalWarning: true,
          ...(campusId === 'belek' && { campusBelek: true }),
          ...(campusId === 'candir' && { campusCandir: true }),
          ...(campusId === 'manavgat' && { campusManavgat: true }),
        },
        include: {
          users: {
            include: {
              web_push_subscriptions: true,
            },
          },
        },
      });

      console.log('NOTIFY_CRITICAL_WARNING_CREATED: found user_notification_settings', {
        totalUsers: usersToNotify.length,
        campusId,
      });

      if (usersToNotify.length === 0) {
        console.log('NOTIFY_CRITICAL_WARNING_CREATED: no users to notify, skipping');
        return;
      }

      // Count total subscriptions
      let totalSubscriptions = 0;
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        totalSubscriptions += subscriptions.length;
      }

      console.log('NOTIFY_CRITICAL_WARNING_CREATED: total subscriptions found', {
        totalSubscriptions,
        usersWithSubscriptions: usersToNotify.filter(
          (u) => (u.users?.web_push_subscriptions?.length || 0) > 0,
        ).length,
      });

      if (totalSubscriptions === 0) {
        console.log('NOTIFY_CRITICAL_WARNING_CREATED: no subscriptions, skipping');
        return;
      }

      const notificationPayload = JSON.stringify({
        title: 'Yeni Kritik Uyarı',
        body: `${campusName}, ${gardenName} bahçe yeni kritik uyarı oluşturuldu.`,
        icon: '/icons/daldiz-192.png',
        badge: '/icons/daldiz-192.png',
        data: {
          type: 'critical_warning_created',
          warningId: warning.id,
          gardenId: warning.gardenId,
          campusId,
        },
      });

      const sendPromises: Promise<{ success: boolean; subscriptionId?: number; userId?: number; error?: any }>[] = [];
      for (const userSetting of usersToNotify) {
        const subscriptions = userSetting.users?.web_push_subscriptions || [];
        for (const subscription of subscriptions) {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          };
          sendPromises.push(
            webpush
              .sendNotification(pushSubscription, notificationPayload)
              .then(() => {
                return { success: true, subscriptionId: subscription.id, userId: userSetting.userId };
              })
              .catch(async (error) => {
                const errorMessage = error.message || String(error);
                const statusCode = error.statusCode || error.status;
                
                console.error('NOTIFY_CRITICAL_WARNING_CREATED send error', {
                  endpoint: subscription.endpoint.substring(0, 50) + '...',
                  subscriptionId: subscription.id,
                  userId: userSetting.userId,
                  error: errorMessage,
                  statusCode,
                });

                // If subscription is invalid (410 Gone, 404 Not Found), remove it from DB
                if (statusCode === 410 || statusCode === 404) {
                  try {
                    await this.prisma.web_push_subscriptions.delete({
                      where: { id: subscription.id },
                    });
                    console.log('NOTIFY_CRITICAL_WARNING_CREATED: removed invalid subscription', {
                      subscriptionId: subscription.id,
                      userId: userSetting.userId,
                      statusCode,
                    });
                  } catch (deleteError) {
                    console.error('NOTIFY_CRITICAL_WARNING_CREATED: failed to delete invalid subscription', {
                      subscriptionId: subscription.id,
                      error: deleteError instanceof Error ? deleteError.message : deleteError,
                    });
                  }
                }

                return { success: false, subscriptionId: subscription.id, userId: userSetting.userId, error };
              }),
          );
        }
      }

      const results = await Promise.allSettled(sendPromises);
      const successful = results.filter((r) => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      console.log('NOTIFY_CRITICAL_WARNING_CREATED: send results', {
        total: results.length,
        successful,
        failed,
        warningId: warning.id,
        gardenId: warning.gardenId,
        campusId,
      });
    } catch (error) {
      // Never throw - this is a non-critical background operation
      console.error('NOTIFY_CRITICAL_WARNING_CREATED: unexpected error', error);
    }
  }

  /**
   * Send a test notification to the current user (for debugging/testing purposes)
   * This endpoint should be protected by admin/super admin guard
   */
  async sendTestNotification(userId: number) {
    if (!this.vapidConfigured) {
      console.log('NOTIFICATIONS DEBUG: VAPID not configured, skipping test notification');
      return;
    }

    const subscriptions = await this.prisma.web_push_subscriptions.findMany({
      where: { userId },
    });

    console.log('NOTIFICATIONS DEBUG: sendTestNotification subscriptions count', subscriptions.length);

    if (subscriptions.length === 0) {
      console.log('NOTIFICATIONS DEBUG: no subscriptions found for user', userId);
      return;
    }

    const payload = JSON.stringify({
      title: 'DALDIZ Test',
      body: 'Bu bir test bildirimidir.',
      icon: '/icons/daldiz-192.png',
      badge: '/icons/daldiz-192.png',
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    });

    const sendResults = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush
          .sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          )
          .then(() => ({ success: true, subscriptionId: sub.id }))
          .catch((error) => {
            console.error('NOTIFICATIONS DEBUG: sendTestNotification error', {
              subscriptionId: sub.id,
              error: error.message || error,
            });
            return { success: false, subscriptionId: sub.id, error };
          }),
      ),
    );

    const successful = sendResults.filter((r) => r.status === 'fulfilled' && r.value.success).length;
    const failed = sendResults.length - successful;

    console.log('NOTIFICATIONS DEBUG: sendTestNotification results', {
      total: sendResults.length,
      successful,
      failed,
      userId,
    });
  }
}
