require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Resend } = require('resend');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ================== ENV CHECK ================== */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI missing in .env');
  process.exit(1);
}
if (!process.env.RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY missing in .env');
  process.exit(1);
}
if (!process.env.GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY missing in .env');
  process.exit(1);
}

/* ================== SERVICES ================== */
const resend = new Resend(process.env.RESEND_API_KEY);
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/* ================== MIDDLEWARE ================== */
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ================== DB CONNECT ================== */
mongoose.connect(process.env.MONGO_URI, {
  family: 4,
  serverSelectionTimeoutMS: 10000
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB error:', err.message));

/* ================== MODEL ================== */
const Message = mongoose.model('Message', {
  name:      String,
  email:     String,
  message:   String,
  createdAt: { type: Date, default: Date.now }
});

/* ================== CONTACT API ================== */
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: 'All fields required.' });
  }

  try {
    await Message.create({ name, email, message });
    console.log('✅ Saved to DB');
  } catch (err) {
    console.error('⚠️ DB error:', err.message);
  }

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'yogeshkr914@gmail.com',
      subject: `New message from ${name}`,
      html: `
        <h3>Portfolio Contact</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b> ${message}</p>
      `
    });
    console.log('✅ Email sent');
  } catch (err) {
    console.error('⚠️ Email error:', err.message);
  }

  res.status(200).json({ message: 'Sent successfully!' });
});

/* ================== AI CHAT ================== */
const SYSTEM_PROMPT = `
You are Yogesh Kumar's personal AI assistant embedded in his portfolio website.

Keep answers short (2-4 sentences max).
If unknown, tell user to email yogeshkr914@gmail.com.
Stay friendly and professional.
`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Invalid request.' });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const userMessage = messages[messages.length - 1].content;

    const result = await model.generateContent(
      `${SYSTEM_PROMPT}\n\nUser: ${userMessage}`
    );

    const reply = result.response.text();

    res.status(200).json({ reply });

  } catch (err) {
    console.error('❌ AI error:', err);
    res.status(500).json({
      reply: "I'm having trouble right now. Please email yogeshkr914@gmail.com"
    });
  }
});

/* ================== FRONTEND ================== */
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ================== SERVER ================== */
app.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});