const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

app.post('/api/upload', upload.single('transcript'), (req, res) => {
    let uploadedFilePath;
    let isTempFile = false;

    if (req.file) {
        uploadedFilePath = path.join(__dirname, req.file.path);
    } else if (req.body.text) {
        // Handle pasted text
        const title = req.body.title || "Meeting";
        const content = `Meeting Transcript: ${title}\n\n${req.body.text}`;
        uploadedFilePath = path.join(__dirname, 'uploads', `temp_${Date.now()}.txt`);
        fs.writeFileSync(uploadedFilePath, content);
        isTempFile = true;
    } else {
        return res.status(400).json({ error: "No file or text provided" });
    }

    const pythonExecutable = path.join(__dirname, 'venv', 'Scripts', 'python.exe');
    // 1. Trigger the Python Intelligence Engine with the uploaded file
    const pythonProcess = spawn(pythonExecutable, ['intelligence.py', uploadedFilePath]);

    let resultData = "";
    let errorData = "";

    // 2. Collect the output
    pythonProcess.stdout.on('data', (data) => {
        resultData += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
    });

    pythonProcess.on('close', (code) => {
        // Clean up the uploaded file after processing
        fs.unlink(uploadedFilePath, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
        });

        if (code === 0) {
            try {
                const cleanResult = resultData.trim();
                const parsed = JSON.parse(cleanResult);
                res.json({ success: true, data: parsed });
            } catch (err) {
                console.error("Failed to parse Python output. Raw output:", resultData);
                res.status(500).json({ error: "Failed to parse Python output", details: resultData });
            }
        } else {
            console.error("Python Error:", errorData);
            res.status(500).json({ error: "NLP Processing Failed", details: errorData });
        }
    });
});

app.listen(5000, () => console.log('Backend running on port 5000'));