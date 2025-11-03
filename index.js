const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = express();
const PORT =  process.env.PORT ||5000;

// Middleware
app.use(cors({
  origin: ["https://think-bot-frontend.vercel.app", "http://localhost:3000"],
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

const upload = multer({ dest: "uploads/" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 📩 Route: Text Prompt
app.post("/generatefromtext", async (req, res) => {
  const { input } = req.body;
  if (!input?.trim()) {
    return res.status(400).json({ error: "Input required" });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(input);
    const reply = await result.response.text();

    res.json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching from Gemini API" });
  }
});

app.post("/generatefromfile", upload.single("file"), async (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const fileBuffer = fs.readFileSync(file.path);//Sync means blocking behavviour

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      { text: "Analyze this file and provide insights." },
      {
        inlineData: {
          mimeType: file.mimetype,// It’s a string that tells what kind of file something is — like whether it’s a text file, image, PDF, video, etc.
          data: fileBuffer.toString("base64"), // base64 required
        },
      },
    ]);

    const reply = await result.response.text();

    // Clean up uploaded file
    fs.unlinkSync(file.path);
    
    res.json({ result: reply });
} catch (err) {
    console.error("Error:", err);
    fs.unlinkSync(file.path);
    res.status(500).json({ error: "Error processing file with Gemini API" });
  }
});


// 🔌 Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
