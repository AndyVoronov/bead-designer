import { prisma } from "@/lib/prisma";

interface WaitlistNotification {
  productName: string;
  email: string;
}

export async function sendWaitlistNotifications(productId: number): Promise<{ sent: number; failed: number }> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true, slug: true },
  });

  if (!product) return { sent: 0, failed: 0 };

  const entries = await prisma.waitlistEntry.findMany({
    where: { productId, notified: false },
  });

  if (entries.length === 0) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      // Reuse the email transport from email.ts
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.yandex.ru",
        port: Number(process.env.SMTP_PORT || 465),
        secure: true,
        auth: {
          user: process.env.SMTP_USER || "",
          pass: process.env.SMTP_PASS || "",
        },
      });

      await transporter.sendMail({
        from: `"5 минут тишины" <${process.env.SMTP_USER}>`,
        to: entry.email,
        subject: `Товар "${product.name}" снова в наличии!`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2 style="color: #f43f5e;">Хорошая новость!</h2>
            <p>Товар <strong>${product.name}</strong>, который вы ждали, снова в наличии.</p>
            <p>
              <a href="https://5minutesofsilence.ru/catalog/${product.slug}"
                 style="display: inline-block; padding: 12px 24px; background: #f43f5e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                Перейти к товару
              </a>
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-top: 20px;">
              Вы получили это письмо, потому что подписались на уведомление о поступлении.<br>
              <a href="https://5minutesofsilence.ru" style="color: #9ca3af;">5minutesofsilence.ru</a>
            </p>
          </div>
        `,
      });

      await prisma.waitlistEntry.update({
        where: { id: entry.id },
        data: { notified: true },
      });
      sent++;
    } catch (err) {
      console.error(`Failed to send waitlist notification to ${entry.email}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

export async function getProductWaitlistCount(productId: number): Promise<number> {
  return prisma.waitlistEntry.count({
    where: { productId, notified: false },
  });
}
