import nodemailer from 'nodemailer';
import logger from './logger.js';

class EmailConfig {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    // Create transporter based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production: Use actual email service
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT === '465',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
        pool: true, 
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000, 
        rateLimit: 5, 
      });
    } else {
      this.createTestAccount();
    }
    this.verifyConnection();
  }

  async createTestAccount() {
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info('Ethereal email test account created');
    } catch (error) {
      logger.error('Failed to create test email account:', error);
    }
  }

  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service connected successfully');
    } catch (error) {
      logger.error('Email service connection failed:', error);
    }
  }

  getTransporter() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }
    return this.transporter;
  }

  // Generate email templates
  getEmailTemplate(type, data) {
    const templates = {
      welcome: {
        subject: 'Welcome to ProConnect!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Welcome to ProConnect</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #1565c0 0%, #1976d2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 24px; background: #1565c0; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to ProConnect!</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.name},</h2>
                <p>We're thrilled to have you on board! ProConnect is your gateway to professional growth, learning, and networking.</p>
                <p>Here's what you can do next:</p>
                <ul>
                  <li>Complete your profile</li>
                  <li>Explore courses</li>
                  <li>Join groups</li>
                  <li>Connect with peers</li>
                </ul>
                <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
              </div>
              <div class="footer">
                <p>&copy; 2024 ProConnect. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
      verification: {
        subject: 'Verify Your Email Address',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verification</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #2e7d32 0%, #388e3c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 24px; background: #2e7d32; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Email Verification</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.name},</h2>
                <p>Please verify your email address by clicking the button below:</p>
                <a href="${data.verificationUrl}" class="button">Verify Email</a>
                <p>Or copy and paste this link: ${data.verificationUrl}</p>
                <p>This link will expire in 24 hours.</p>
                <p>If you didn't create an account, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 ProConnect. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
      passwordReset: {
        subject: 'Password Reset Request',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Password Reset</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #c62828 0%, #d32f2f 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 24px; background: #c62828; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.name},</h2>
                <p>We received a request to reset your password. Click the button below to proceed:</p>
                <a href="${data.resetUrl}" class="button">Reset Password</a>
                <p>Or copy and paste this link: ${data.resetUrl}</p>
                <p>This link will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 ProConnect. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
      courseCompletion: {
        subject: 'Congratulations on Course Completion!',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Course Completed</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #ff8f00 0%, #ffb300 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; padding: 12px 24px; background: #ff8f00; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Congratulations!</h1>
              </div>
              <div class="content">
                <h2>Amazing work, ${data.name}!</h2>
                <p>You've successfully completed "${data.courseName}". Your dedication to learning is inspiring!</p>
                <p>You've earned a certificate. Download it below:</p>
                <a href="${data.certificateUrl}" class="button">Download Certificate</a>
              </div>
              <div class="footer">
                <p>&copy; 2024 ProConnect. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
      jobAlert: {
        subject: 'New Job Opportunities',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Job Alerts</title>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #00796b 0%, #00897b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .job-card { background: white; padding: 15px; margin-bottom: 15px; border-radius: 5px; border-left: 4px solid #00796b; }
              .job-title { font-size: 18px; font-weight: bold; color: #00796b; margin-bottom: 5px; }
              .company { color: #666; margin-bottom: 5px; }
              .salary { color: #2e7d32; font-weight: 500; }
              .button { display: inline-block; padding: 8px 16px; background: #00796b; color: white; text-decoration: none; border-radius: 5px; margin-top: 10px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Job Opportunities</h1>
              </div>
              <div class="content">
                <h2>Hello ${data.name},</h2>
                <p>Here are some jobs that match your profile:</p>
                ${data.jobs.map(job => `
                  <div class="job-card">
                    <div class="job-title">${job.title}</div>
                    <div class="company">${job.company} • ${job.location}</div>
                    <div class="salary">${job.salary}</div>
                    <a href="${job.url}" class="button">View Job</a>
                  </div>
                `).join('')}
                <p style="margin-top: 20px;">You're receiving this because you have job alerts enabled.</p>
              </div>
              <div class="footer">
                <p>&copy; 2024 ProConnect. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
      },
    };

    return templates[type] || templates.welcome;
  }
}

export default new EmailConfig();