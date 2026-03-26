
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const path     = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');
require('dotenv').config();

const app    = express();
const PORT   = process.env.PORT || 3000;
const resend = new Resend(process.env.RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));


mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.log('⚠️  MongoDB error:', err.message));

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

Here is everything you know about Yogesh:

PERSONAL:
- Full name: Yogesh Kumar
- Email: yogeshkr914@gmail.com
- Location: Bengaluru, Karnataka, India
- GitHub: github.com/yo-h77
- University: Kristu Jayanti Deemed to be University, Bengaluru
- Degree: Bachelor of Computer Applications (BCA)
- Graduation year: 2026
- Currently looking for internship opportunities

SKILLS:
- HTML5 (90%) — expert at structuring web pages
- CSS3 (85%) — responsive design, dark themes, animations, Flexbox, Grid
- JavaScript ES6 (80%) — DOM manipulation, fetch API, animations, events
- Node.js (75%) — backend development, REST APIs, Express
- Python (78%) — programming fundamentals
- SQL (70%) — relational databases, queries
- MongoDB (72%) — NoSQL, Atlas, Mongoose
- C (65%) — programming fundamentals

PROJECTS:
1. Full Stack Portfolio Website
   - Built with HTML, CSS, JavaScript frontend
   - Node.js + Express backend
   - MongoDB Atlas cloud database
   - Resend API for email notifications
   - Deployed live on Render
   - GitHub: github.com/yo-h77/portfolio
   - Live: https://yogesh-portfolio-2mjk.onrender.com

2. AI Chatbot Portfolio
   - Portfolio enhanced with Claude AI chatbot (this very chatbot!)
   - Built with JavaScript frontend + Node.js backend
   - Uses Anthropic Claude API

TECH STACK USED IN PORTFOLIO:
- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB Atlas (cloud, AWS Mumbai)
- Email: Resend API
- Version control: Git + GitHub
- Deployment: Render (CI/CD, auto-deploys on git push)
- AI: Anthropic Claude API

EDUCATION:
- Pursuing BCA at Kristu Jayanti Deemed to be University, Bengaluru
- Academic year 2025-26
- Focused on full stack web development

HOW TO CONTACT:
- Email: yogeshkr914@gmail.com
- GitHub: github.com/yo-h77
- LinkedIn: linkedin.com/in/yogesh-kumar
- Contact form on this website

PERSONALITY / ABOUT:
- Passionate about building real-world web applications
- Enjoys full stack development from frontend to backend
- Self-learner who built and deployed a complete web app
- Interested in internships to gain industry experience
- Solved real deployment issues (switched from Nodemailer to Resend when Render blocked SMTP)

RULES:
- Keep answers short, friendly and professional (2-4 sentences max)
- If asked something you don't know, say "Yogesh hasn't shared that with me yet, but you can email him at yogeshkr914@gmail.com"
- Never make up information not listed above
- Always stay in character as Yogesh's assistant
- You can suggest visiting sections of the portfolio (Skills, Projects, Contact)`;

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'Invalid request.' });
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: messages.slice(-10) 
    });

    const reply = response.content[0].text;
    return res.status(200).json({ reply });
  } catch (err) {
    console.log('⚠️ AI chat error:', err.message);
    return res.status(500).json({ reply: 'I\'m having trouble right now. Please email Yogesh at yogeshkr914@gmail.com' });
  }
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running → http://localhost:${PORT}`);
});
