export async function sendTokenEmail({
  email,
  token,
  name,
}: {
  email?: string;
  token?: string;
  name?: string;
}) {
  const EMAIL_FROM = process.env.EMAIL_FROM;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!EMAIL_FROM || !RESEND_API_KEY || !email || !token ||!name) {
    console.log("Missing parameters");
    return;
  }

  const safeName = name ? name.charAt(0).toUpperCase() + name.slice(1) : "User";

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Email Verification</title>
  </head>
  <body style="margin:0;padding:0;background:linear-gradient(135deg,#0f172a,#1e293b);font-family:Inter,Arial,sans-serif;">
    
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr>
        <td align="center">

          <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;padding:40px;box-shadow:0 10px 30px rgba(0,0,0,0.2);max-width:90%;">
            
            <tr>
              <td align="center" style="padding-bottom:20px;">
                <h1 style="margin:0;color:#0f172a;font-size:28px;">Email Verification</h1>
              </td>
            </tr>

            <tr>
              <td style="color:#334155;font-size:16px;line-height:1.6;">
                <p>Hello <strong>${safeName}</strong>,</p>
                <p>Thanks for signing up. Please use the code below to verify your email address.</p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:30px 0;">
                <div style="
                  display:inline-block;
                  padding:18px 32px;
                  background:#0f172a;
                  color:#ffffff;
                  font-size:28px;
                  letter-spacing:6px;
                  border-radius:12px;
                  font-weight:bold;
                ">
                  ${token}
                </div>
              </td>
            </tr>

            <tr>
              <td style="color:#64748b;font-size:14px;line-height:1.6;">
                <p>This code will expire in <strong>15 minutes</strong>.</p>
                <p>If you did not request this email, you can safely ignore it.</p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding-top:30px;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} Cracked. All rights reserved.
              </td>
            </tr>

          </table>

        </td>
      </tr>
    </table>

  </body>
  </html>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `Cracked <${EMAIL_FROM}>`,
        to: email,
        subject: "Verify your email",
        html,
      }),
    });
  } catch (error) {
    console.error(error);
  }
}