import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = "Assam Goods Carrier";

function buildOtpHtml({ otp, purpose, userName }) {
  const title =
    purpose === "forgot_password" ? "Reset Your Password" : "Verify Your Email";

  const message =
    purpose === "forgot_password"
      ? "You requested a password reset. Use the OTP below to continue."
      : "Thank you for signing up! Use the OTP below to verify your email.";

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
    </head>
    <body style="margin:0;padding:0;background:#f5f7fa;font-family:Arial,sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa;padding:40px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="480" cellspacing="0" cellpadding="0" border="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
              <tr>
                <td style="background:#071B34;padding:24px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Assam Goods Carrier</h1>
                  <p style="margin:6px 0 0;color:#F97316;font-size:11px;letter-spacing:1.5px;font-weight:600;">LOGISTICS PORTAL</p>
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 16px;">
                  <h2 style="margin:0 0 12px;color:#071B34;font-size:22px;">${title}</h2>
                  <p style="margin:0 0 20px;color:#475569;font-size:15px;line-height:1.6;">
                    ${userName ? `Hi ${userName},` : "Hi there,"}<br/>
                    ${message}
                  </p>
                  <div style="background:#f0f9ff;border:2px dashed #F97316;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <p style="margin:0 0 8px;color:#64748b;font-size:12px;letter-spacing:1.5px;font-weight:600;">YOUR OTP</p>
                    <div style="font-family:'Courier New',monospace;font-size:36px;font-weight:800;color:#071B34;letter-spacing:8px;">
                      ${otp}
                    </div>
                  </div>
                  <p style="margin:0 0 8px;color:#64748b;font-size:13px;">
                    ⏱ This OTP is valid for <strong>10 minutes</strong>.
                  </p>
                  <p style="margin:0 0 24px;color:#64748b;font-size:13px;">
                    🔒 Do not share this OTP with anyone.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 32px 32px;border-top:1px solid #e2e8f0;">
                  <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                    If you didn't request this, you can safely ignore this email.<br/>
                    Need help? Call us at <strong>8847428801</strong>.
                  </p>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;color:#94a3b8;font-size:11px;">
              © ${new Date().getFullYear()} Assam Goods Carrier. All rights reserved.
            </p>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export async function sendOtpEmail({ to, otp, purpose, userName }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not set in environment variables.");
  }

  const subject =
    purpose === "forgot_password"
      ? `Reset Password OTP: ${otp}`
      : `Verify Email OTP: ${otp}`;

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [to],
    subject,
    html: buildOtpHtml({ otp, purpose, userName }),
  });

  if (error) {
    console.error("[emailService] Resend error:", error);
    throw new Error(error.message || "Failed to send email.");
  }

  return { id: data?.id || "" };
}

export function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}