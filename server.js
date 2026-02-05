const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        // Create uploads directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

// File filter to accept only PDF, DOC, DOCX
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed.'), false);
    }
};

// Multer configuration
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// ============================================
// EXISTING CONTACT FORM ENDPOINT (UNCHANGED)
// ============================================
app.post('/send-email', async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    try {
        const emailData = await resend.emails.send({
            from: "NBTech <no-reply@updates.navabharathtechnologies.com>",
            to: "contact@navabharathtechnologies.com",
            subject: New Contact Form Submission from ${name},
            html: `
                <h2>New Contact Form Message</h2>
                <p><strong>Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Message:</strong></p>
                <p>${message}</p>
            `
        });

        console.log("✔ Email Sent:", emailData);

        return res.status(200).json({
            success: true,
            message: "Email sent successfully!"
        });

    } catch (error) {
        console.error("❌ Email Send Error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to send email."
        });
    }
});

// ============================================
// NEW CAREER APPLICATION ENDPOINT
// ============================================
app.post('/send-career-email', upload.single('resume'), async (req, res) => {
    let uploadedFilePath = null;

    try {
        const { name, email, phone, jobRole, experience, message } = req.body;
        const resumeFile = req.file;

        // Validate required fields
        if (!name || !email || !phone || !jobRole) {
            if (resumeFile) {
                fs.unlinkSync(resumeFile.path); // Clean up uploaded file
            }
            return res.status(400).json({
                success: false,
                message: "Name, email, phone, and job role are required."
            });
        }

        // Validate resume file
        if (!resumeFile) {
            return res.status(400).json({
                success: false,
                message: "Resume file is required."
            });
        }

        uploadedFilePath = resumeFile.path;

        // Read file and convert to base64 for attachment
        const fileContent = fs.readFileSync(resumeFile.path);
        const base64Content = fileContent.toString('base64');

        // Prepare email HTML content
        const emailHTML = `
            <h2>New Job Application - Career Page</h2>
            <div style="font-family: Arial, sans-serif; line-height: 1.6;">
                <p><strong>Full Name:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone Number:</strong> ${phone}</p>
                <p><strong>Applying For:</strong> ${jobRole}</p>
                <p><strong>Years of Experience:</strong> ${experience || 'Not specified'}</p>
                ${message ? `
                <p><strong>Message / Cover Letter:</strong></p>
                <p style="white-space: pre-wrap;">${message}</p>
                ` : ''}
                <hr style="margin: 20px 0;">
                <p style="color: #666; font-size: 12px;">Resume is attached to this email.</p>
            </div>
        `;

        // Send email with resume attachment
        const emailData = await resend.emails.send({
            from: "NBTech <no-reply@updates.navabharathtechnologies.com>",
            to: "hr@navabharathtechnologies.com",
            subject: "New Job Application - Career Page",
            html: emailHTML,
            attachments: [
                {
                    filename: resumeFile.originalname,
                    content: base64Content
                }
            ]
        });

        console.log("✔ Career Application Email Sent:", emailData);

        // Delete temporary file after successful email send
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
            console.log("✔ Temporary file deleted:", uploadedFilePath);
        }

        return res.status(200).json({
            success: true,
            message: "Application submitted successfully!"
        });

    } catch (error) {
        console.error("❌ Career Application Error:", error);

        // Clean up uploaded file in case of error
        if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
            fs.unlinkSync(uploadedFilePath);
            console.log("✔ Temporary file deleted after error:", uploadedFilePath);
        }

        // Handle specific multer errors
        if (error instanceof multer.MulterError) {
            if (error.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: "File size exceeds 5MB limit."
                });
            }
            return res.status(400).json({
                success: false,
                message: File upload error: ${error.message}
            });
        }

        // Handle file type validation error
        if (error.message.includes('Invalid file type')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Failed to submit application. Please try again."
        });
    }
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'Server is running',
        endpoints: ['/send-email', '/send-career-email']
    });
});

// Start server
app.listen(PORT, () => {
    console.log(🚀 Server running on port ${PORT});
});
