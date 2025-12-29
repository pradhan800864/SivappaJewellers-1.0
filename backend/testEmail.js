// testEmail.js
require("dotenv").config(); // ✅ LOAD .env first

const nodemailer = require("nodemailer");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.error("❌ Missing EMAIL_USER / EMAIL_PASS in environment");
  console.error("EMAIL_USER =", process.env.EMAIL_USER);
  console.error("EMAIL_PASS exists? =", !!process.env.EMAIL_PASS);
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

(async () => {
  await transporter.sendMail({
    from: `"Sivappa Jewellery" <${process.env.EMAIL_USER}>`,
    to: "nagapavan009@gmail.com",
    subject: "SMTP Test",
    text: "Email service is working ✅",
  });

  console.log("✅ Email sent successfully");
})().catch((err) => {
  console.error("❌ Send failed:", err);
});
