const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

// Manually load environment variables from .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
        if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
        }
    });
}

const app = express();
app.use(cors());
app.use(express.json());

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

app.post('/api/chat', async (req, res) => {
    const { message, transcript, history } = req.body;
    
    if (!message) {
        return res.status(400).json({ error: "Message is required." });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: "GROQ_API_KEY environment variable is not set on the server." });
    }

    try {
        // Construct System Prompt incorporating context if available
        let systemPrompt = `You are Kage, a Lead Project Architect and expert AI Meeting Analyst. 
Your goal is to help team members analyze transcripts, trace technical details, explain action items, resolve blockers, and clarify contradictions.

`;

        if (transcript) {
            systemPrompt += `You have full access to the context of the active meeting:
Meeting Title: "${transcript.title || 'Selected Meeting'}"
Timestamp: ${transcript.timestamp || 'N/A'}

SUMMARY INFORMATION:
- Executive Summary:
${transcript.summary?.executive_summary ? transcript.summary.executive_summary.map(s => `  * ${s.speaker}: ${s.text}`).join('\n') : 'No executive summary.'}
- Keywords: ${transcript.summary?.keywords ? transcript.summary.keywords.join(', ') : 'N/A'}

ACTION ITEMS:
${transcript.action_items ? transcript.action_items.map(item => `  * Assigned to ${item.assigned_to}: ${item.task} (Priority: ${item.priority || 'Medium'}, Deadlines: ${item.deadlines?.join(', ') || 'None'})`).join('\n') : 'No action items.'}

CONFLICTS & BLOCKERS:
- Technical Contradictions:
${transcript.conflicts?.contradictions ? transcript.conflicts.contradictions.join('\n') : 'None'}
- Unresolved Issues:
${transcript.conflicts?.unresolved ? transcript.conflicts.unresolved.join('\n') : 'None'}

SPEAKERS & ANALYTICS:
${transcript.analytics ? Object.entries(transcript.analytics).map(([speaker, info]) => `  * ${speaker}: Role: ${info.role || 'N/A'}, Participation: ${info.participation}, Sentiment: ${info.sentiment}`).join('\n') : 'N/A'}

FULL TRANSCRIPT:
${transcript.transcript?.segments ? transcript.transcript.segments.map(seg => `  [${seg.time}] ${seg.speaker}: ${seg.text}`).join('\n') : 'No transcript segments.'}

Use this rich context to answer the user's questions in detail. When referring to speakers or commitments, make sure to base your answers EXACTLY on the facts inside this transcript. Do not hallucinate statements.`;
        } else {
            systemPrompt += `Currently, there is no active meeting context selected. 
Politely guide the user: "Select a meeting from the Archives or upload a transcript to chat about meeting specifics! I can also help you with general software engineering, system design, or meeting analysis guidelines."

Answer the user's general questions as a Lead Architect and expert AI Meeting Analyst.`;
        }

        systemPrompt += `\n\nFormat your responses in clean, beautiful Markdown. Keep answers professional, precise, and highly actionable.`;

        // Assemble messages array for Groq API
        const messages = [
            { role: "system", content: systemPrompt }
        ];

        // Append historical turns if present
        if (history && Array.isArray(history)) {
            history.forEach(turn => {
                messages.push({
                    role: turn.sender === 'user' ? 'user' : 'assistant',
                    content: turn.text
                });
            });
        }

        // Append latest user message
        messages.push({ role: "user", content: message });

        const url = "https://api.groq.com/openai/v1/chat/completions";
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey.trim()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: messages,
                temperature: 0.4
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Groq Chat Error Status:", response.status, errText);
            return res.status(response.status).json({ error: "Groq API error", details: errText });
        }

        const data = await response.json();
        const reply = data.choices[0].message.content;
        res.json({ success: true, reply });

    } catch (err) {
        console.error("Chat Router Failure:", err);
        res.status(500).json({ error: "Internal Server Error in chat backend", details: err.message });
    }
});

app.listen(5000, () => console.log('Backend running on port 5000'));