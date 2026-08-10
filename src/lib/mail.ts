import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendOtpEmail(email: string, otp: string, firstName?: string | null) {
  await transporter.sendMail({
    from: '"Dughu" <info@dughu.com>',
    to: email,
    subject: 'Votre code de vérification Dughu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto;">
        <h2 style="color: #B87333;">Vérification de votre compte</h2>
        <p>Bonjour ${firstName || ''},</p>
        <p>Voici votre code à 4 chiffres :</p>
        <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; margin: 20px 0; color: #B87333;">
          ${otp}
        </div>
        <p style="color: #6b7280; font-size: 14px;">Expire dans 3 minutes.</p>
      </div>
    `,
  })
}