import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
   host: "smtp.mailer91.com",
  port: 587,
  secure: false,
  auth: {
    user: "emailer@atiitglobal.com",
    pass: "nop5PDPOLYqyYKHk",
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: `"PRO CONNECT" <${process.env.EMAIL_FROM}>`,
    to,
    subject,
    html,
  });
};

export default sendEmail;