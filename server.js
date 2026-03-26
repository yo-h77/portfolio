const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Resend } = require('resend');
require('dotenv').config();

const app    = express();
const PORT   = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('⚠️ MongoDB error:', err.message));

const Message = mongoose.model('Message', {
  name:      String,
  email:     String,
  message:   String,
  createdAt: { type: Date, default: Date.now }
});


app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) return res.status(400).json({ message: 'All fields required.' });

  try { await Message.create({ name, email, message }); console.log('✅ Saved to DB'); }
  catch (err) { console.log('⚠️ DB error:', err.message); }

  try {
    await resend.emails.send({
      from:    'onboarding@resend.dev',
      to:      'yogeshkr914@gmail.com',
      subject: `New message from ${name}`,
      html:    `<h3>Portfolio Contact</h3><p><b>Name:</b> ${name}</p><p><b>Email:</b> ${email}</p><p><b>Message:</b> ${message}</p>`
    });
    console.log('✅ Email sent');
  } catch (err) { console.log('⚠️ Email error:', err.message); }

  return res.status(200).json({ message: 'Sent successfully!' });
});

const SYSTEM_PROMPT = `You are Yogesh Kumar's personal AI assistant embedded in his portfolio website. You answer questions about Yogesh in a friendly, professional and concise way.

PERSONAL:
- Full name: Yogesh Kumar
- Email: yogeshkr914@gmail.com
- Location: Bengaluru, Karnataka, India
- University: Kristu Jayanti Deemed to be University, Bengaluru
- Degree: Bachelor of Computer Applications (BCA)
- Graduation year: 2026

SKILLS: HTML5, CSS3, JavaScript ES6, Node.js, Python, SQL, MongoDB, C.

PROJECTS:
1. Full Stack Portfolio Website (Node.js, MongoDB, Resend API).
2. AI Chatbot Portfolio (Integrated with Gemini AI).

RULES:
- Keep answers short (2-4 sentences max).
- If unknown, say "Yogesh hasn't shared that with me yet, but you can email him at yogeshkr914@gmail.com".
- Stay in character.`;


app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Invalid request.' });
  }

  try {
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const userMessage = messages[messages.length - 1].content;

  
    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\nUser: ${userMessage}`);
    const response = await result.response;
    const reply = response.text();

    return res.status(200).json({ reply });
  } catch (err) {
    console.error('⚠️ AI chat error detailed:', err);
    return res.status(500).json({ reply: 'I\'m having trouble right now. Please email Yogesh at yogeshkr914@gmail.com' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});