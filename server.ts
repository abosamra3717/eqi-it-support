import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import nodemailer from 'nodemailer';
import multer from 'multer';

// Use memory storage for multer so we don't need to persist to disk
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } }); // 25MB limit per file

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Email sending endpoint
  app.post('/api/send-email', upload.array('attachments'), async (req, res) => {
    try {
      const { name, email, phone, organization, subject, message, seqId } = req.body;
      const files = req.files as Express.Multer.File[];

      if (!name || !email || !subject || !message || !seqId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('SMTP details not configured in environment variables. Please add them in AI Studio Secrets.');
      }

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Prepare attachments for Nodemailer
      const mailAttachments = files ? files.map(file => ({
        filename: Buffer.from(file.originalname, 'latin1').toString('utf8'), // Fix encoding for arabic names
        content: file.buffer
      })) : [];

      // Email to Admin
      const mailOptionsAdmin = {
        from: `"Support Portal" <noreply@eqi-it.com>`,
        replyTo: email,
        to: 'asamir@eqi-it.com',
        subject: `New Support Request #${seqId}: ${subject}`,
        text: `You have received a new support request.\n\nRequest ID: ${seqId}\nName: ${name}\nOrganization: ${organization}\nPhone: ${phone}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h3>New Support Request #${seqId}</h3>
            <p><strong>Request ID:</strong> ${seqId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Organization:</strong> ${organization || 'N/A'}</p>
            <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br/>')}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><em>مرفق مع هذا البريد ${mailAttachments.length} ملف/ملفات.</em></p>
          </div>
        `,
        attachments: mailAttachments
      };

      // Email to User
      const mailOptionsUser = {
        from: `"EQI IT Support" <noreply@eqi-it.com>`,
        to: email,
        subject: `تم استلام طلبك رقم #${seqId}`,
        text: `مرحباً ${name}،\n\nلقد استلمنا طلبك بنجاح. رقم الطلب الخاص بك هو: ${seqId}.\n\nسيتواصل معك فريق الدعم قريباً.\n\nتفاصيل الطلب:\nالموضوع: ${subject}\nعدد المرفقات: ${mailAttachments.length}\n\nشكراً لتواصلك معنا.\nفريق EQI IT`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h3>مرحباً ${name}،</h3>
            <p>لقد استلمنا طلبك بنجاح وسيتم مراجعته من قبل فريق الدعم الفني.</p>
            <p><strong>رقم الطلب الخاص بك:</strong> <span style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${seqId}</span></p>
            <p>سيتواصل معك فريق الدعم قريباً.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>تفاصيل الطلب:</strong></p>
            <p>الموضوع: ${subject}</p>
            <p>المرفقات: تم استلام ${mailAttachments.length} ملف/ملفات.</p>
            <br/>
            <p>شكراً لتواصلك معنا،<br/>فريق EQI IT</p>
          </div>
        `
      };

      await Promise.all([
        transporter.sendMail(mailOptionsAdmin),
        transporter.sendMail(mailOptionsUser)
      ]);

      res.status(200).json({ success: true, message: 'Emails sent successfully' });
    } catch (error) {
      console.error('Error sending email:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to send email' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Support Express v4 syntax
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
