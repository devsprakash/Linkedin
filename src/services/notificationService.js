import webpush from 'web-push';
import nodemailer from 'nodemailer';
import twilio from 'twilio';
import crypto from 'crypto';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import logger from '../config/logger.js';
import redisClient from '../config/redis.js';
import emailConfig from '../config/email.js';

class NotificationService {
  constructor() {
    this.initializePushNotifications();
    this.initializeSMS();
  }

  initializePushNotifications() {
    webpush.setVapidDetails(
      'mailto:' + process.env.VAPID_MAILTO,
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );
  }

  initializeSMS() {
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
  }

  // Create and send notification
  async send(to, type, data, options = {}) {
    const {
      channels = ['in-app'], // in-app, email, push, sms
      priority = 'normal', // high, normal, low
      schedule = null,
      template = null,
    } = options;

    try {
      // Get user preferences
      const user = await User.findById(to).select('preferences email phone');
      if (!user) {
        throw new Error('User not found');
      }

      // Check user preferences for each channel
      const enabledChannels = channels.filter(channel => 
        this.isChannelEnabled(user, channel)
      );

      if (enabledChannels.length === 0) {
        logger.debug('No enabled channels for user', { userId: to });
        return null;
      }

      // Create notification record
      const notification = await Notification.create({
        user: to,
        type,
        data,
        channels: enabledChannels,
        priority,
        scheduledFor: schedule,
        status: schedule ? 'scheduled' : 'pending',
      });

      // If scheduled, don't send immediately
      if (schedule) {
        return notification;
      }

      // Send through enabled channels
      const results = await Promise.allSettled(
        enabledChannels.map(channel => 
          this.sendViaChannel(channel, user, type, data, template)
        )
      );

      // Update notification status
      const failed = results.filter(r => r.status === 'rejected');
      notification.status = failed.length === enabledChannels.length ? 'failed' : 'sent';
      notification.sentAt = new Date();
      notification.metadata = {
        results: results.map(r => r.status),
        errors: failed.map(f => f.reason?.message),
      };
      await notification.save();

      return notification;
    } catch (error) {
      logger.error('Notification send error:', error);
      throw error;
    }
  }

  // Check if channel is enabled for user
  isChannelEnabled(user, channel) {
    if (!user.preferences) return true;

    switch (channel) {
      case 'email':
        return user.preferences.emailNotifications !== false;
      case 'push':
        return user.preferences.pushNotifications !== false;
      case 'sms':
        return user.preferences.smsNotifications !== false && user.phone;
      default:
        return true;
    }
  }

  // Send via specific channel
  async sendViaChannel(channel, user, type, data, template) {
    switch (channel) {
      case 'in-app':
        return this.sendInApp(user._id, type, data);
      case 'email':
        return this.sendEmail(user.email, type, data, template);
      case 'push':
        return this.sendPush(user._id, type, data);
      case 'sms':
        return this.sendSMS(user.phone, type, data);
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  // In-app notification
  async sendInApp(userId, type, data) {
    try {
      // Store in Redis for real-time delivery
      const notificationKey = `notifications:${userId}`;
      const notification = {
        id: crypto.randomBytes(8).toString('hex'),
        type,
        data,
        timestamp: new Date().toISOString(),
        read: false,
      };

      await redisClient.lPush(notificationKey, JSON.stringify(notification));
      await redisClient.lTrim(notificationKey, 0, 99); // Keep last 100
      await redisClient.expire(notificationKey, 7 * 24 * 60 * 60); // 7 days

      // Emit via WebSocket if available
      const io = (await import('../app.js')).default.get('io');
      if (io) {
        io.to(`user:${userId}`).emit('notification', notification);
      }

      return notification;
    } catch (error) {
      logger.error('In-app notification error:', error);
      throw error;
    }
  }

  // Email notification
  async sendEmail(email, type, data, template) {
    try {
      const transporter = emailConfig.getTransporter();
      
      // Get email template
      const emailTemplate = template || this.getEmailTemplate(type, data);
      
      const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
        to: email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
      };

      const info = await transporter.sendMail(mailOptions);
      logger.info('Email sent:', info.messageId);
      
      return info;
    } catch (error) {
      logger.error('Email notification error:', error);
      throw error;
    }
  }

  // Push notification
  async sendPush(userId, type, data) {
    try {
      // Get user's push subscriptions from database
      const subscriptions = await this.getPushSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        return null;
      }

      const payload = JSON.stringify({
        title: this.getPushTitle(type, data),
        body: this.getPushBody(type, data),
        icon: '/logo192.png',
        badge: '/badge.png',
        data: {
          type,
          ...data,
          timestamp: Date.now(),
        },
        actions: this.getPushActions(type),
      });

      const results = await Promise.allSettled(
        subscriptions.map(subscription =>
          webpush.sendNotification(subscription, payload).catch(error => {
            // Remove invalid subscription
            if (error.statusCode === 410) {
              this.removePushSubscription(userId, subscription.endpoint);
            }
            throw error;
          })
        )
      );

      return results;
    } catch (error) {
      logger.error('Push notification error:', error);
      throw error;
    }
  }

  // SMS notification
  async sendSMS(phone, type, data) {
    try {
      if (!this.twilioClient) {
        throw new Error('SMS not configured');
      }

      if (!phone) {
        throw new Error('No phone number provided');
      }

      const message = this.getSMSMessage(type, data);
      
      const result = await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      logger.info('SMS sent:', result.sid);
      return result;
    } catch (error) {
      logger.error('SMS notification error:', error);
      throw error;
    }
  }

  // Get push subscriptions
  async getPushSubscriptions(userId) {
    const user = await User.findById(userId).select('pushSubscriptions');
    return user?.pushSubscriptions || [];
  }

  // Add push subscription
  async addPushSubscription(userId, subscription) {
    await User.findByIdAndUpdate(userId, {
      $push: { pushSubscriptions: subscription },
    });
  }

  // Remove push subscription
  async removePushSubscription(userId, endpoint) {
    await User.findByIdAndUpdate(userId, {
      $pull: { pushSubscriptions: { endpoint } },
    });
  }

  // Get user's unread notifications
  async getUnreadNotifications(userId, limit = 50) {
    const notificationKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notificationKey, 0, limit - 1);
    
    return notifications.map(n => JSON.parse(n));
  }

  // Mark notification as read
  async markAsRead(userId, notificationId) {
    const notificationKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notificationKey, 0, -1);
    
    for (let i = 0; i < notifications.length; i++) {
      const notification = JSON.parse(notifications[i]);
      if (notification.id === notificationId) {
        notification.read = true;
        await redisClient.lSet(notificationKey, i, JSON.stringify(notification));
        break;
      }
    }
  }

  // Mark all as read
  async markAllAsRead(userId) {
    const notificationKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notificationKey, 0, -1);
    
    const updated = notifications.map(n => {
      const notification = JSON.parse(n);
      notification.read = true;
      return JSON.stringify(notification);
    });

    if (updated.length > 0) {
      await redisClient.del(notificationKey);
      await redisClient.rPush(notificationKey, ...updated);
    }
  }

  // Delete notification
  async deleteNotification(userId, notificationId) {
    const notificationKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notificationKey, 0, -1);
    
    const filtered = notifications.filter(n => {
      const notification = JSON.parse(n);
      return notification.id !== notificationId;
    });

    await redisClient.del(notificationKey);
    if (filtered.length > 0) {
      await redisClient.rPush(notificationKey, ...filtered);
    }
  }

  // Clear all notifications
  async clearAllNotifications(userId) {
    const notificationKey = `notifications:${userId}`;
    await redisClient.del(notificationKey);
  }

  // Get notification count
  async getNotificationCount(userId) {
    const notificationKey = `notifications:${userId}`;
    const notifications = await redisClient.lRange(notificationKey, 0, -1);
    
    const unread = notifications.filter(n => {
      const notification = JSON.parse(n);
      return !notification.read;
    });

    return unread.length;
  }

  // Helper methods for notification content
  getEmailTemplate(type, data) {
    const templates = {
      welcome: {
        subject: 'Welcome to ProConnect!',
        html: `
          <h1>Welcome ${data.name}!</h1>
          <p>We're excited to have you on board.</p>
        `,
      },
      course_enrolled: {
        subject: 'Course Enrollment Confirmation',
        html: `
          <h1>You're enrolled!</h1>
          <p>You have successfully enrolled in ${data.courseName}.</p>
        `,
      },
      course_completed: {
        subject: 'Congratulations on Completing the Course!',
        html: `
          <h1>Course Completed!</h1>
          <p>You've completed ${data.courseName}. Download your certificate below.</p>
        `,
      },
      job_alert: {
        subject: 'New Job Opportunities',
        html: `
          <h1>New Jobs for You</h1>
          <p>Check out these new job opportunities matching your profile.</p>
        `,
      },
      message_received: {
        subject: 'New Message',
        html: `
          <h1>You have a new message</h1>
          <p>${data.senderName} sent you a message.</p>
        `,
      },
      group_invitation: {
        subject: 'Group Invitation',
        html: `
          <h1>You're invited to join a group</h1>
          <p>${data.groupName} - ${data.inviterName} invited you.</p>
        `,
      },
      payment_success: {
        subject: 'Payment Successful',
        html: `
          <h1>Payment Successful</h1>
          <p>Your payment of ${data.amount} was successful.</p>
        `,
      },
      payment_failed: {
        subject: 'Payment Failed',
        html: `
          <h1>Payment Failed</h1>
          <p>Your payment of ${data.amount} failed. Please update your payment method.</p>
        `,
      },
      account_verified: {
        subject: 'Account Verified',
        html: `
          <h1>Account Verified</h1>
          <p>Your account has been successfully verified.</p>
        `,
      },
      password_changed: {
        subject: 'Password Changed',
        html: `
          <h1>Password Changed</h1>
          <p>Your password was successfully changed.</p>
        `,
      },
    };

    return templates[type] || templates.welcome;
  }

  getPushTitle(type, data) {
    const titles = {
      welcome: 'Welcome to ProConnect!',
      course_enrolled: 'Course Enrollment Confirmed',
      course_completed: 'Congratulations!',
      job_alert: 'New Job Opportunity',
      message_received: 'New Message',
      group_invitation: 'Group Invitation',
      payment_success: 'Payment Successful',
      payment_failed: 'Payment Failed',
      account_verified: 'Account Verified',
      password_changed: 'Password Changed',
    };

    return titles[type] || 'ProConnect Notification';
  }

  getPushBody(type, data) {
    const bodies = {
      welcome: `Welcome ${data.name}! Start exploring courses and connecting with peers.`,
      course_enrolled: `You've enrolled in ${data.courseName}. Happy learning!`,
      course_completed: `You completed ${data.courseName}! Download your certificate.`,
      job_alert: `${data.jobCount} new jobs match your profile. Check them out!`,
      message_received: `${data.senderName}: ${data.preview}`,
      group_invitation: `${data.inviterName} invited you to join ${data.groupName}`,
      payment_success: `Payment of ${data.amount} was successful.`,
      payment_failed: `Payment of ${data.amount} failed. Update payment method.`,
      account_verified: 'Your account has been successfully verified.',
      password_changed: 'Your password was successfully changed.',
    };

    return bodies[type] || 'You have a new notification';
  }

  getPushActions(type) {
    const actions = {
      message_received: [
        { action: 'reply', title: 'Reply' },
        { action: 'mark_read', title: 'Mark as Read' },
      ],
      group_invitation: [
        { action: 'accept', title: 'Accept' },
        { action: 'decline', title: 'Decline' },
      ],
      job_alert: [
        { action: 'view', title: 'View Jobs' },
      ],
    };

    return actions[type] || [];
  }

  getSMSMessage(type, data) {
    const messages = {
      welcome: `Welcome to ProConnect, ${data.name}! Start your learning journey today.`,
      course_enrolled: `You've enrolled in ${data.courseName}. Happy learning!`,
      course_completed: `Congratulations! You completed ${data.courseName}.`,
      job_alert: `${data.jobCount} new jobs match your profile. Check the app for details.`,
      payment_success: `Payment of ${data.amount} was successful.`,
      payment_failed: `Payment of ${data.amount} failed. Please update payment method.`,
      account_verified: 'Your ProConnect account has been verified.',
      password_changed: 'Your ProConnect password was changed.',
    };

    return messages[type] || 'You have a new notification from ProConnect';
  }

  // Bulk send notifications
  async bulkSend(userIds, type, data, options = {}) {
    const results = await Promise.allSettled(
      userIds.map(userId => this.send(userId, type, data, options))
    );

    return {
      total: userIds.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      errors: results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason?.message),
    };
  }

  // Send scheduled notifications
  async processScheduledNotifications() {
    const notifications = await Notification.find({
      status: 'scheduled',
      scheduledFor: { $lte: new Date() },
    }).populate('user');

    for (const notification of notifications) {
      try {
        const results = await Promise.allSettled(
          notification.channels.map(channel =>
            this.sendViaChannel(
              channel,
              notification.user,
              notification.type,
              notification.data
            )
          )
        );

        const failed = results.filter(r => r.status === 'rejected');
        notification.status = failed.length === notification.channels.length ? 'failed' : 'sent';
        notification.sentAt = new Date();
        notification.metadata = {
          results: results.map(r => r.status),
          errors: failed.map(f => f.reason?.message),
        };
        await notification.save();
      } catch (error) {
        logger.error('Scheduled notification error:', error);
        notification.status = 'failed';
        notification.metadata = { error: error.message };
        await notification.save();
      }
    }

    return notifications.length;
  }

  // Clean up old notifications
  async cleanupOldNotifications(days = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['sent', 'failed'] },
    });

    logger.info(`Cleaned up ${result.deletedCount} old notifications`);
    return result.deletedCount;
  }

  // Get notification statistics
  async getStats(userId = null) {
    const query = userId ? { user: userId } : {};
    
    const stats = await Notification.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const channelStats = await Notification.aggregate([
      { $match: query },
      { $unwind: '$channels' },
      {
        $group: {
          _id: '$channels',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      total: await Notification.countDocuments(query),
      byStatus: stats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
      byChannel: channelStats.reduce((acc, s) => ({ ...acc, [s._id]: s.count }), {}),
    };
  }
}

export default new NotificationService();