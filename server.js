const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================
// Middleware
// ============================
app.use(cors());
app.use(bodyParser.json());

// ============================
// Resend Client
// ============================
const resend = new Resend(process.env.RESEND_API_KEY);

// ============================
// Multer Setup
// ============================
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ];

    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Only PDF, DOC, DOCX allowed"));
    } else {
      cb(null, true);
    }
  }
});

// ===================================================
// CONTACT FORM
// ===================================================
app.post('/send-email', async (req, res) => {

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }

  try {

    await resend.emails.send({
      from: "NBTech <no-reply@updates.navabharathtechnologies.com>",
      to: "contact@navabharathtechnologies.com",
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `
    });

    return res.json({
      success: true,
      message: "Email sent successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to send email"
    });
  }
});

// ===================================================
// CAREER FORM
// ===================================================
app.post('/send-career-email', upload.single("resume"), async (req, res) => {

  let filePath = null;

  try {

    const { name, email, phone, jobRole, experience, message } = req.body;
    const resume = req.file;

    if (!name || !email || !phone || !jobRole || !resume) {
      if (resume) fs.unlinkSync(resume.path);

      return res.status(400).json({
        success: false,
        message: "All required fields must be filled"
      });
    }

    filePath = resume.path;
    const fileBuffer = fs.readFileSync(filePath);

    await resend.emails.send({
      from: "NBTech <no-reply@updates.navabharathtechnologies.com>",
      to: "hr@navabharathtechnologies.com",
      subject: "New Job Application - Career Page",
      html: `
        <h2>New Job Application</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Role:</b> ${jobRole}</p>
        <p><b>Experience:</b> ${experience || "Not provided"}</p>
        <p><b>Message:</b> ${message || "N/A"}</p>
      `,
      attachments: [
        {
          filename: resume.originalname,
          content: fileBuffer
        }
      ]
    });

    fs.unlinkSync(filePath);

    return res.json({
      success: true,
      message: "Application submitted successfully"
    });

  } catch (error) {

    console.error(error);

    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit application"
    });
  }
});

// ===================================================
// HEALTH CHECK
// ===================================================
app.get("/", (req, res) => {
  res.json({
    status: "Server Running",
    endpoints: ["/send-email", "/send-career-email"]
  });
});

// ===================================================
// START SERVER
// ===================================================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
