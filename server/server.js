const { spawn } = require('child_process');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

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

// Google OAuth & Calendar Setup
const oauth2Client = (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI)
  ? new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  : null;

// Temporary in-memory stores for sandbox mode
let sandboxAuthenticated = false;
let sandboxEvents = [
  {
    id: "g1",
    title: "✨ Sprint Sync with Client",
    description: "Weekly milestone review and feedback collection.",
    timestamp: new Date(new Date().getFullYear(), new Date().getMonth(), 12, 10, 0).toLocaleString(),
    isGoogleEvent: true
  },
  {
    id: "g2",
    title: "⚡ Core Architecture Handshake",
    description: "Aligning frontend telemetry with backend Express socket configurations.",
    timestamp: new Date(new Date().getFullYear(), new Date().getMonth(), 15, 14, 0).toLocaleString(),
    isGoogleEvent: true
  },
  {
    id: "g3",
    title: "🚀 Production Deployment Audit",
    description: "Final checklist audit before launching the new sprint build.",
    timestamp: new Date(new Date().getFullYear(), new Date().getMonth(), 24, 16, 30).toLocaleString(),
    isGoogleEvent: true
  }
];

// Token storage (In-memory for simplicity/sandbox)
let googleTokens = null;

// 1. Connection Status
app.get('/api/calendar/status', (req, res) => {
  const isRealAuth = !!(oauth2Client && googleTokens);
  const isSandboxAuth = !oauth2Client && sandboxAuthenticated;
  
  res.json({
    connected: isRealAuth || isSandboxAuth,
    mode: oauth2Client ? "production" : "sandbox"
  });
});

// 2. Start OAuth Flow
app.get('/api/auth/google', (req, res) => {
  const clientOrigin = req.query.origin || process.env.FRONTEND_URL || 'http://localhost:3000';
  if (oauth2Client) {
    const scopes = ['https://www.googleapis.com/auth/calendar.events'];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
    res.json({ url });
  } else {
    // Sandbox mode: redirect directly to a simulated callback
    res.json({ url: `${clientOrigin}?sandbox_connect=true` });
  }
});

// 3. OAuth Callback
app.get('/api/auth/google/callback', async (req, res) => {
  const code = req.query.code;
  const isSandbox = req.query.sandbox === 'true' || code === 'sandbox';
  const clientOrigin = req.query.origin || process.env.FRONTEND_URL || 'http://localhost:3000';

  if (isSandbox) {
    sandboxAuthenticated = true;
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, mode: "sandbox" });
    }
    return res.redirect(`${clientOrigin}?google_auth=success`);
  }

  if (!code) {
    return res.status(400).send("Authorization code is missing.");
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    googleTokens = tokens;
    oauth2Client.setCredentials(tokens);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.json({ success: true, mode: "production" });
    }
    res.redirect(`${clientOrigin}?google_auth=success`);
  } catch (error) {
    console.error("Error exchanging OAuth code:", error);
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(500).json({ error: error.message });
    }
    res.redirect(`${clientOrigin}?google_auth=failed&error=${encodeURIComponent(error.message)}`);
  }
});

// 4. Disconnect Google Calendar
app.post('/api/auth/google/disconnect', (req, res) => {
  googleTokens = null;
  sandboxAuthenticated = false;
  if (oauth2Client) {
    oauth2Client.setCredentials(null);
  }
  res.json({ success: true });
});

// 5. Fetch Calendar Events
app.get('/api/calendar/events', async (req, res) => {
  const isRealAuth = !!(oauth2Client && googleTokens);
  const isSandboxAuth = !oauth2Client && sandboxAuthenticated;

  if (!isRealAuth && !isSandboxAuth) {
    return res.status(401).json({ error: "Google Calendar not connected." });
  }

  if (isSandboxAuth) {
    return res.json({ success: true, events: sandboxEvents });
  }

  try {
    oauth2Client.setCredentials(googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Fetch events from current month
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items.map(item => {
      const startStr = item.start.dateTime || item.start.date;
      const startDate = new Date(startStr);
      return {
        id: item.id,
        title: item.summary || "Untitled Event",
        description: item.description || "",
        timestamp: startDate.toLocaleString(),
        isGoogleEvent: true
      };
    });

    res.json({ success: true, events });
  } catch (error) {
    console.error("Error fetching Google Calendar events:", error);
    res.status(500).json({ error: "Failed to fetch calendar events", details: error.message });
  }
});

// 6. Create Calendar Event
app.post('/api/calendar/create', async (req, res) => {
  const isRealAuth = !!(oauth2Client && googleTokens);
  const isSandboxAuth = !oauth2Client && sandboxAuthenticated;

  if (!isRealAuth && !isSandboxAuth) {
    return res.status(401).json({ error: "Google Calendar not connected." });
  }

  const { title, date, startTime, endTime, description, attendees } = req.body;
  if (!title || !date || !startTime || !endTime) {
    return res.status(400).json({ error: "Title, date, startTime, and endTime are required." });
  }

  // Parse date and times
  const startDateTime = new Date(`${date}T${startTime}:00`).toISOString();
  const endDateTime = new Date(`${date}T${endTime}:00`).toISOString();

  if (isSandboxAuth) {
    const newEvent = {
      id: `sandbox_${Date.now()}`,
      title,
      description: description || "",
      timestamp: new Date(startDateTime).toLocaleString(),
      isGoogleEvent: true
    };
    sandboxEvents.push(newEvent);
    return res.json({ success: true, event: newEvent });
  }

  try {
    oauth2Client.setCredentials(googleTokens);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const attendeesArray = attendees 
      ? attendees.split(',').map(email => ({ email: email.trim() })).filter(a => a.email)
      : [];

    const event = {
      summary: title,
      description: description || "",
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      attendees: attendeesArray
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    const createdEvent = {
      id: response.data.id,
      title: response.data.summary || title,
      description: response.data.description || "",
      timestamp: new Date(startDateTime).toLocaleString(),
      isGoogleEvent: true
    };

    res.json({ success: true, event: createdEvent });
  } catch (error) {
    console.error("Error creating Google Calendar event:", error);
    res.status(500).json({ error: "Failed to create calendar event", details: error.message });
  }
});

app.listen(5000, () => console.log('Backend running on port 5000'));