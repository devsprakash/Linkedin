import Stripe from 'stripe';
import * as Paypal from '@paypal/checkout-server-sdk';
import crypto from 'crypto';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Subscription from '../models/Subscription.js';
import logger from '../config/logger.js';
import AppError from '../utils/AppError.js';
import notificationService from './notification.service.js';

class PaymentService {
  constructor() {
    this.stripe = null;
    this.paypalClient = null;
    this.initializePaymentGateways();
  }

  initializePaymentGateways() {
    // Initialize Stripe
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
        maxNetworkRetries: 3,
        timeout: 30000,
      });
    }

    // Initialize PayPal
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
      const environment = process.env.NODE_ENV === 'production'
        ? new Paypal.core.LiveEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
          )
        : new Paypal.core.SandboxEnvironment(
            process.env.PAYPAL_CLIENT_ID,
            process.env.PAYPAL_CLIENT_SECRET
          );
      
      this.paypalClient = new Paypal.core.PayPalHttpClient(environment);
    }
  }

  // Create payment intent (Stripe)
  async createStripePaymentIntent(data) {
    try {
      const {
        amount,
        currency = 'usd',
        userId,
        courseId,
        metadata = {},
      } = data;

      // Create payment intent
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        metadata: {
          userId: userId.toString(),
          courseId: courseId?.toString(),
          ...metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Save payment record
      const payment = await Payment.create({
        user: userId,
        course: courseId,
        amount,
        currency,
        paymentMethod: 'stripe',
        stripePaymentIntentId: paymentIntent.id,
        status: 'pending',
        metadata,
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentId: payment._id,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      logger.error('Stripe payment intent creation error:', error);
      throw new AppError('Failed to create payment', 500);
    }
  }

  // Confirm payment (Stripe webhook)
  async confirmStripePayment(paymentIntentId) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      const payment = await Payment.findOne({
        stripePaymentIntentId: paymentIntentId,
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.status = paymentIntent.status === 'succeeded' ? 'completed' : 'failed';
      payment.stripePaymentIntent = paymentIntent;
      payment.completedAt = paymentIntent.status === 'succeeded' ? new Date() : null;
      await payment.save();

      // If payment successful, enroll user in course
      if (payment.status === 'completed' && payment.course) {
        await this.enrollUserInCourse(payment.user, payment.course);
        
        // Send notification
        await notificationService.send(
          payment.user,
          'payment_success',
          {
            amount: payment.amount,
            currency: payment.currency,
            courseId: payment.course,
          },
          { channels: ['email', 'in-app'] }
        );
      }

      return payment;
    } catch (error) {
      logger.error('Stripe payment confirmation error:', error);
      throw error;
    }
  }

  // Create PayPal order
  async createPayPalOrder(data) {
    try {
      const { amount, currency = 'USD', userId, courseId, metadata = {} } = data;

      const request = new Paypal.orders.OrdersCreateRequest();
      request.prefer('return=representation');
      request.requestBody({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: currency,
              value: amount.toFixed(2),
            },
            description: `Course enrollment: ${courseId}`,
            custom_id: `${userId}|${courseId}`,
          },
        ],
        application_context: {
          brand_name: 'ProConnect',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: `${process.env.CLIENT_URL}/payment/success`,
          cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
        },
      });

      const order = await this.paypalClient.execute(request);

      // Save payment record
      const payment = await Payment.create({
        user: userId,
        course: courseId,
        amount,
        currency,
        paymentMethod: 'paypal',
        paypalOrderId: order.result.id,
        status: 'pending',
        metadata,
      });

      // Find approval URL
      const approvalUrl = order.result.links.find(
        link => link.rel === 'approve'
      ).href;

      return {
        approvalUrl,
        orderId: order.result.id,
        paymentId: payment._id,
      };
    } catch (error) {
      logger.error('PayPal order creation error:', error);
      throw new AppError('Failed to create PayPal order', 500);
    }
  }

  // Capture PayPal order
  async capturePayPalOrder(orderId) {
    try {
      const request = new Paypal.orders.OrdersCaptureRequest(orderId);
      request.requestBody({});

      const capture = await this.paypalClient.execute(request);

      const payment = await Payment.findOne({ paypalOrderId: orderId });

      if (!payment) {
        throw new Error('Payment not found');
      }

      payment.status = capture.result.status === 'COMPLETED' ? 'completed' : 'failed';
      payment.paypalOrder = capture.result;
      payment.completedAt = capture.result.status === 'COMPLETED' ? new Date() : null;
      await payment.save();

      // If payment successful, enroll user in course
      if (payment.status === 'completed' && payment.course) {
        await this.enrollUserInCourse(payment.user, payment.course);
        
        // Send notification
        await notificationService.send(
          payment.user,
          'payment_success',
          {
            amount: payment.amount,
            currency: payment.currency,
            courseId: payment.course,
          },
          { channels: ['email', 'in-app'] }
        );
      }

      return payment;
    } catch (error) {
      logger.error('PayPal order capture error:', error);
      throw error;
    }
  }

  // Enroll user in course after successful payment
  async enrollUserInCourse(userId, courseId) {
    try {
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Check if already enrolled
      const existingEnrollment = await Enrollment.findOne({
        user: userId,
        course: courseId,
      });

      if (existingEnrollment) {
        return existingEnrollment;
      }

      // Create enrollment
      const enrollment = await Enrollment.create({
        user: userId,
        course: courseId,
        enrolledAt: new Date(),
        progress: 0,
        status: 'active',
      });

      // Update course stats
      course.stats.enrollments += 1;
      await course.save();

      // Update user stats
      await User.findByIdAndUpdate(userId, {
        $inc: { 'stats.coursesEnrolled': 1 },
      });

      // Send welcome email
      const user = await User.findById(userId);
      await notificationService.send(
        userId,
        'course_enrolled',
        {
          courseName: course.title,
          courseId: course._id,
        },
        { channels: ['email', 'in-app'] }
      );

      return enrollment;
    } catch (error) {
      logger.error('Course enrollment error:', error);
      throw error;
    }
  }

  // Process refund
  async processRefund(paymentId, reason = '') {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Cannot refund incomplete payment');
      }

      let refundResult;

      if (payment.paymentMethod === 'stripe') {
        refundResult = await this.stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          reason: 'requested_by_customer',
        });

        payment.status = 'refunded';
        payment.refundData = {
          id: refundResult.id,
          amount: refundResult.amount / 100,
          reason,
          processedAt: new Date(),
        };
      } else if (payment.paymentMethod === 'paypal') {
        // PayPal refund logic
        const request = new Paypal.payments.CapturesRefundRequest(
          payment.paypalCaptureId
        );
        request.requestBody({
          amount: {
            currency_code: payment.currency,
            value: payment.amount.toFixed(2),
          },
          note_to_payer: reason,
        });

        refundResult = await this.paypalClient.execute(request);

        payment.status = 'refunded';
        payment.refundData = {
          id: refundResult.result.id,
          amount: payment.amount,
          reason,
          processedAt: new Date(),
        };
      }

      await payment.save();

      // Remove course enrollment
      if (payment.course) {
        await Enrollment.deleteOne({
          user: payment.user,
          course: payment.course,
        });

        await Course.findByIdAndUpdate(payment.course, {
          $inc: { 'stats.enrollments': -1 },
        });
      }

      // Send refund notification
      await notificationService.send(
        payment.user,
        'payment_refunded',
        {
          amount: payment.amount,
          currency: payment.currency,
          reason,
        },
        { channels: ['email', 'in-app'] }
      );

      return payment;
    } catch (error) {
      logger.error('Refund processing error:', error);
      throw error;
    }
  }

  // Create subscription
  async createSubscription(data) {
    try {
      const { userId, planId, paymentMethodId } = data;

      // Get or create Stripe customer
      const user = await User.findById(userId);
      let stripeCustomerId = user.stripeCustomerId;

      if (!stripeCustomerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: user.name,
          metadata: {
            userId: userId.toString(),
          },
        });
        stripeCustomerId = customer.id;
        user.stripeCustomerId = stripeCustomerId;
        await user.save();
      }

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: planId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          planId,
        },
      });

      // Save subscription record
      const subscriptionRecord = await Subscription.create({
        user: userId,
        stripeSubscriptionId: subscription.id,
        planId,
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });

      return {
        subscriptionId: subscription.id,
        clientSecret: subscription.latest_invoice.payment_intent.client_secret,
        subscription: subscriptionRecord,
      };
    } catch (error) {
      logger.error('Subscription creation error:', error);
      throw error;
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId) {
    try {
      const subscription = await Subscription.findOne({
        stripeSubscriptionId: subscriptionId,
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      const canceledSubscription = await this.stripe.subscriptions.update(
        subscriptionId,
        {
          cancel_at_period_end: true,
        }
      );

      subscription.cancelAtPeriodEnd = true;
      await subscription.save();

      return subscription;
    } catch (error) {
      logger.error('Subscription cancellation error:', error);
      throw error;
    }
  }

  // Handle Stripe webhook
  async handleStripeWebhook(signature, body) {
    try {
      const event = this.stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.confirmStripePayment(event.data.object.id);
          break;

        case 'payment_intent.payment_failed':
          await this.handleFailedPayment(event.data.object);
          break;

        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionUpdate(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePayment(event.data.object);
          break;

        case 'invoice.payment_failed':
          await this.handleFailedInvoice(event.data.object);
          break;
      }

      return { received: true };
    } catch (error) {
      logger.error('Stripe webhook error:', error);
      throw error;
    }
  }

  // Handle failed payment
  async handleFailedPayment(paymentIntent) {
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntent.id,
    });

    if (payment) {
      payment.status = 'failed';
      payment.metadata = {
        ...payment.metadata,
        failureReason: paymentIntent.last_payment_error?.message,
      };
      await payment.save();

      // Send failure notification
      await notificationService.send(
        payment.user,
        'payment_failed',
        {
          amount: payment.amount,
          currency: payment.currency,
          reason: paymentIntent.last_payment_error?.message,
        },
        { channels: ['email', 'in-app'] }
      );
    }
  }

  // Handle subscription update
  async handleSubscriptionUpdate(stripeSubscription) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
      subscription.status = stripeSubscription.status;
      subscription.currentPeriodStart = new Date(
        stripeSubscription.current_period_start * 1000
      );
      subscription.currentPeriodEnd = new Date(
        stripeSubscription.current_period_end * 1000
      );
      subscription.cancelAtPeriodEnd = stripeSubscription.cancel_at_period_end;
      await subscription.save();
    }
  }

  // Handle invoice payment
  async handleInvoicePayment(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    });

    if (subscription) {
      // Create payment record for invoice
      await Payment.create({
        user: subscription.user,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        paymentMethod: 'stripe',
        stripePaymentIntentId: invoice.payment_intent,
        status: 'completed',
        type: 'subscription',
        metadata: {
          invoiceId: invoice.id,
          subscriptionId: invoice.subscription,
        },
      });

      // Send payment success notification
      await notificationService.send(
        subscription.user,
        'payment_success',
        {
          amount: invoice.amount_paid / 100,
          currency: invoice.currency,
          type: 'subscription',
        },
        { channels: ['email', 'in-app'] }
      );
    }
  }

  // Handle failed invoice
  async handleFailedInvoice(invoice) {
    const subscription = await Subscription.findOne({
      stripeSubscriptionId: invoice.subscription,
    }).populate('user');

    if (subscription) {
      await notificationService.send(
        subscription.user,
        'payment_failed',
        {
          amount: invoice.amount_due / 100,
          currency: invoice.currency,
          type: 'subscription',
        },
        { channels: ['email', 'in-app'] }
      );
    }
  }

  // Get payment history for user
  async getUserPayments(userId, options = {}) {
    const {
      page = 1,
      limit = 10,
      status,
      startDate,
      endDate,
    } = options;

    const query = { user: userId };
    
    if (status) {
      query.status = status;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('course', 'title thumbnail');

    const total = await Payment.countDocuments(query);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  // Get payment statistics
  async getPaymentStats(userId = null, period = 'month') {
    const query = userId ? { user: userId } : {};
    
    const groupBy = {
      day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
      week: { $week: '$createdAt' },
      month: { $month: '$createdAt' },
      year: { $year: '$createdAt' },
    };

    const stats = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: groupBy[period],
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
          minAmount: { $min: '$amount' },
          maxAmount: { $max: '$amount' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    const byStatus = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    const byMethod = await Payment.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return {
      overview: {
        totalRevenue: stats.reduce((acc, s) => acc + s.totalAmount, 0),
        totalTransactions: stats.reduce((acc, s) => acc + s.count, 0),
        averageTransaction: stats.reduce((acc, s) => acc + s.avgAmount, 0) / stats.length || 0,
      },
      byPeriod: stats,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s._id]: s }), {}),
      byMethod: byMethod.reduce((acc, s) => ({ ...acc, [s._id]: s }), {}),
    };
  }

  // Generate payment receipt
  async generateReceipt(paymentId) {
    const payment = await Payment.findById(paymentId)
      .populate('user')
      .populate('course');

    if (!payment) {
      throw new Error('Payment not found');
    }

    const receipt = {
      receiptNumber: `RCP-${payment._id.toString().slice(-8).toUpperCase()}`,
      date: payment.completedAt || payment.createdAt,
      customer: {
        name: payment.user.name,
        email: payment.user.email,
        id: payment.user._id,
      },
      payment: {
        id: payment._id,
        method: payment.paymentMethod,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
      },
      items: [],
    };

    if (payment.course) {
      receipt.items.push({
        type: 'course',
        name: payment.course.title,
        price: payment.amount,
        quantity: 1,
      });
    }

    if (payment.metadata?.items) {
      receipt.items.push(...payment.metadata.items);
    }

    // Calculate totals
    receipt.subtotal = receipt.items.reduce((acc, item) => acc + item.price, 0);
    receipt.tax = receipt.subtotal * 0.1; // 10% tax
    receipt.total = receipt.subtotal + receipt.tax;

    return receipt;
  }
}

export default new PaymentService();