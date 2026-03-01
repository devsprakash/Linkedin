import nodemailer from 'nodemailer';
import logger from '../config/logger.js';

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  async sendMail({ to, subject, html, text }) {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  async sendEmailVerification(to, verificationUrl) {
    const subject = 'Verify Your Email Address';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1565c0;">Welcome to ProConnect!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1565c0; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a>
        <p>Or copy and paste this link: ${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendPasswordReset(to, resetUrl) {
    const subject = 'Password Reset Request';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1565c0;">Reset Your Password</h2>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1565c0; color: white; text-decoration: none; border-radius: 4px;">Reset Password</a>
        <p>Or copy and paste this link: ${resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendWelcomeEmail(to, name) {
    const subject = 'Welcome to ProConnect!';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1565c0;">Welcome ${name}!</h2>
        <p>We're excited to have you on board. Start exploring courses, connecting with peers, and advancing your career.</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display: inline-block; padding: 12px 24px; background-color: #1565c0; color: white; text-decoration: none; border-radius: 4px;">Go to Dashboard</a>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendCourseCompletion(to, courseName, certificateUrl) {
    const subject = `Congratulations! You've Completed ${courseName}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1565c0;">Course Completed!</h2>
        <p>Congratulations on completing "${courseName}"!</p>
        <p>You've earned a certificate. Download it below:</p>
        <a href="${certificateUrl}" style="display: inline-block; padding: 12px 24px; background-color: #1565c0; color: white; text-decoration: none; border-radius: 4px;">Download Certificate</a>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }

  async sendJobAlert(to, jobs) {
    const subject = 'New Job Opportunities Matching Your Profile';
    const jobsHtml = jobs.map(job => `
      <div style="margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0;">${job.title}</h3>
        <p style="margin: 5px 0;"><strong>Company:</strong> ${job.company}</p>
        <p style="margin: 5px 0;"><strong>Location:</strong> ${job.location}</p>
        <p style="margin: 5px 0;"><strong>Salary:</strong> ${job.salary}</p>
        <a href="${process.env.CLIENT_URL}/jobs/${job.id}" style="color: #1565c0;">View Job</a>
      </div>
    `).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1565c0;">New Job Opportunities</h2>
        <p>Here are some jobs that match your profile:</p>
        ${jobsHtml}
        <hr>
        <p style="color: #666; font-size: 12px;">You're receiving this because you have job alerts enabled.</p>
      </div>
    `;

    return this.sendMail({ to, subject, html });
  }
}

export default new EmailService();