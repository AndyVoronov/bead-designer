import nodemailer from "nodemailer";

const transporter =
  process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

interface SendOrderConfirmationParams {
  to: string;
  customerName: string;
  orderId: number;
  totalAmount: number;
  items: Array<{ name: string; price: number; quantity: number }>;
  discount?: number;
}

export async function sendOrderConfirmation({
  to,
  customerName,
  orderId,
  totalAmount,
  items,
  discount,
}: SendOrderConfirmationParams): Promise<boolean> {
  if (!transporter) {
    console.log("[email] SMTP not configured — skipping order confirmation");
    return false;
  }

  const formatPrice = (n: number) =>
    new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB" }).format(n);

  const itemsHtml = items
    .map(
      (item) => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px">${item.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:center">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right">${formatPrice(item.price)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600">${formatPrice(item.price * item.quantity)}</td>
    </tr>`,
    )
    .join("");

  const html = `
    <div style="max-width:600px;margin:0 auto;font-family:'Helvetica Neue',Arial,sans-serif;color:#333">
      <div style="background:#FFF8F5;padding:32px 24px;border-radius:16px">
        <h1 style="font-size:24px;font-weight:700;margin:0 0 8px;color:#1a1a1a">Заказ оформлен!</h1>
        <p style="font-size:14px;color:#666;margin:0 0 24px">${customerName}, ваш заказ №${orderId} успешно создан.</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <thead>
            <tr style="font-size:12px;color:#999;text-transform:uppercase;letter-spacing:0.05em">
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #eee">Товар</th>
              <th style="text-align:center;padding:8px 0;border-bottom:2px solid #eee">Кол-во</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eee">Цена</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #eee">Сумма</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        ${discount && discount > 0 ? `<p style="text-align:right;font-size:14px;color:#10b981;margin:0">Скидка: −${formatPrice(discount)}</p>` : ""}
        <p style="text-align:right;font-size:18px;font-weight:700;margin:8px 0 24px">Итого: ${formatPrice(totalAmount)}</p>

        <div style="background:#f8f8f8;border-radius:12px;padding:16px;font-size:13px;color:#666">
          <p style="margin:0 0 4px">Мы свяжемся с вами для подтверждения заказа.</p>
          <p style="margin:0">С уважением, <strong>5 минут тишины</strong></p>
        </div>

        <p style="font-size:12px;color:#999;text-align:center;margin-top:24px">
          <a href="https://5minutesofsilence.ru/catalog" style="color:#f43f5e;text-decoration:none">Перейти в каталог</a>
        </p>
      </div>
    </div>`;

  try {
    await transporter.sendMail({
      from: `"5 минут тишины" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
      to,
      subject: `Заказ №${orderId} оформлен — 5 минут тишины`,
      html,
    });
    return true;
  } catch (error) {
    console.error("[email] Failed to send order confirmation:", error);
    return false;
  }
}
