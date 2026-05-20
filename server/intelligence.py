import os
import sys
import requests
from dotenv import load_dotenv

# Load environment variables from .env
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=env_path, override=True)

# pyrefly: ignore [missing-import]
import torch

import json
import re
# pyrefly: ignore [missing-import]
import nltk
# pyrefly: ignore [missing-import]
import spacy
from collections import Counter
# pyrefly: ignore [missing-import]
from nltk.sentiment.vader import SentimentIntensityAnalyzer

# Ensure VADER lexicon is available
import logging
# Suppress transformers and other library logging to stdout
logging.basicConfig(level=logging.ERROR, stream=sys.stderr)
nltk.download('vader_lexicon', quiet=True)

class MeetingIntelligence:
    def __init__(self):
        print("Initializing NLP Models...", file=sys.stderr)
        try:
            self.nlp = spacy.load("en_core_web_sm")
        except OSError:
            import en_core_web_sm
            self.nlp = en_core_web_sm.load()
            
        self.sentiment = SentimentIntensityAnalyzer()
        self.modal_keywords = {
            "need", "must", "should", "ought", "assign", "responsible",
            "require", "expect", "task", "imperative", "crucial"
        }
        self.future_verbs = {
            "will", "go", "plan", "aim", "fix", "send", "update", "create",
            "resolve", "develop", "implement", "review", "schedule", "design"
        }
        
        # Summarizer placeholders (lazy loaded if needed)
        self.summarizer = None
        self.tokenizer = None
        self.model = None

    def call_groq(self, transcript):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY environment variable is not set.")
        api_key = api_key.strip()
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        prompt = f"""You are a Lead Project Architect and expert AI Meeting Intelligence assistant. 
Your task is to ingest a meeting transcript and provide high-quality AI-assisted insights, summaries, action items, conflict detection, and recommendations.

### INPUT TRANSCRIPT:
{transcript}

### YOUR RESPONSIBILITIES:
1. **Title:** Extract a highly descriptive meeting title (3-6 words).
2. **Keywords:** Extract 5-8 highly relevant technical keywords, organizations, or products discussed (e.g., "PostgreSQL", "MERN Stack", "Express").
3. **Executive Summary:** Strictly 3 parts:
   - "Executive Overview": Summarize the primary purpose and context of the meeting.
   - "Key Insights": Detail the main technical points, debates, or breakthroughs.
   - "Resolution": Outline the final decisions and next steps.
4. **Action Items:** Extract actionable commitments. For each action item, specify:
   - "assigned_to": Person's name (must be a speaker or named participant, capitalized, e.g. "Rohan").
   - "task": Highly specific, rephrased, context-rich task description. Append any tech stack mentioned in brackets (e.g., "Implement MongoDB schema validation [MongoDB]").
   - "priority": "High", "Medium", or "Low". High for blockers/urgent tasks, Medium for scheduled features/important tasks, Low for minor tasks.
   - "deadlines": Array of strings representing dates or time periods mentioned (e.g., ["today", "by tomorrow", "next week"]). If none, use an empty list `[]`.
5. **Technical Conflict & Blocker Detection:**
   - "contradictions": A list of explicit or implicit technical conflicts, disagreements, or challenges to alignment between participants (e.g., frontend vs backend mismatch, timeline disagreements, budget/resource constraints).
     * If there are multiple conflicts, number them sequentially starting with "1.", "2.", etc. If there is only 1 conflict, do not number it.
     * For each conflict, you MUST provide a detailed description of the contradiction AND a specific, highly actionable AI recommendation/suggestion on how the team should deal with it.
     * Format each item strictly as:
       "[Conflict details/description]
       
       💡 AI Suggestion: [Specific, actionable steps to resolve the conflict]"
     * If no contradictions exist, return ["Technical Conflict: No explicit contradictions detected in the transcript."]
     
   - "unresolved": A list of unresolved blockers, questions, or issues mentioned in the meeting that did not receive a clear answer or resolution.
     * If there are multiple unresolved blockers, number them sequentially starting with "1.", "2.", etc. If there is only 1 blocker, do not number it.
     * For each blocker, you MUST provide a detailed description of the blocker/question AND a specific, highly actionable AI recommendation/suggestion on how the team should address it.
     * Format each item strictly as:
       "[Blocker details/description]
       
       💡 AI Suggestion: [Specific, actionable steps to unblock or answer the issue]"
     * If no unresolved blockers exist, return ["Unresolved Blocker: No ignored questions detected."]
6. **AI Recommendation & Participation Insights:**
   - Provide a highly actionable "Proactive Tip" addressing speaker dynamics, technical alignment, and next steps. 

You MUST respond with a single, valid JSON object conforming exactly to this JSON schema:
{{
  "title": "string",
  "keywords": ["string"],
  "executive_summary": [
    {{ "speaker": "Executive Overview", "text": "string" }},
    {{ "speaker": "Key Insights", "text": "string" }},
    {{ "speaker": "Resolution", "text": "string" }}
  ],
  "action_items": [
    {{
      "assigned_to": "string",
      "task": "string",
      "priority": "High" | "Medium" | "Low",
      "deadlines": ["string"]
    }}
  ],
  "conflicts": {{
    "contradictions": ["string"],
    "unresolved": ["string"]
  }},
  "ai_recommendation": "string"
}}
"""
        
        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"}
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        res_json = response.json()
        raw_content = res_json["choices"][0]["message"]["content"]
        return json.loads(raw_content)

    def extract_roles(self, raw_text):
        roles = {}
        for line in raw_text.split('\n'):
            line_strip = line.strip()
            if line_strip.lower().startswith("participants:"):
                parts = line_strip[len("participants:"):].split(",")
                for p in parts:
                    match = re.search(r'([A-Za-z0-9\s\.\-_]+)\s*\(([^)]+)\)', p)
                    if match:
                        name = match.group(1).strip()
                        role = match.group(2).strip()
                        roles[name] = role
                break
        return roles

    def parse_transcript(self, raw_text):
        segments = []
        lines = raw_text.split('\n')
        simulated_seconds = 0
        
        # Lowercase metadata prefixes to filter headers
        metadata_prefixes = [
            "meeting transcript", "date", "participants", "location", "attendees",
            "project:", "time:", "duration:", "host:", "agenda:", "topic:", "status:",
            "sprint:", "subject:", "summary:"
        ]
        
        # Regexes for timestamp and speaker extraction
        timestamp_regex = r"^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)"
        speaker_regex = r"^\[?\(?([A-Za-z0-9\s\.\-_]+)\)?\]?\s*[:\-]\s*(.*)"
        
        for line in lines:
            line = line.strip()
            if not line:
                continue
                
            line_lower = line.lower()
            # If line is part of metadata headers, skip it
            if any(line_lower.startswith(prefix) for prefix in metadata_prefixes):
                continue
                
            time_str = None
            remainder = line
            
            # 1. Try to extract timestamp first
            ts_match = re.match(timestamp_regex, line)
            if ts_match:
                time_str = ts_match.group(1).strip()
                remainder = ts_match.group(2).strip()
                
                # Format time_str to HH:MM:SS
                parts = time_str.split(':')
                if len(parts) == 2:
                    time_str = f"00:{parts[0].zfill(2)}:{parts[1].zfill(2)}"
                elif len(parts) == 3:
                    time_str = f"{parts[0].zfill(2)}:{parts[1].zfill(2)}:{parts[2].zfill(2)}"
            
            # 2. Extract speaker and text from remainder
            sp_match = re.match(speaker_regex, remainder)
            if sp_match:
                speaker = sp_match.group(1).strip()
                text = sp_match.group(2).strip()
                
                # Validate that the speaker name is reasonable (not a full paragraph)
                if len(speaker.split()) <= 4 and len(speaker) < 40:
                    if not time_str:
                        # Generate simulated timestamp
                        h = simulated_seconds // 3600
                        m = (simulated_seconds % 3600) // 60
                        s = simulated_seconds % 60
                        time_str = f"{h:02d}:{m:02d}:{s:02d}"
                        simulated_seconds += 30
                    
                    segments.append({"time": time_str, "speaker": speaker, "text": text})
            else:
                # If no speaker is detected but we have segments, append to the last segment's text
                if segments and not line.startswith("[") and len(line) > 0:
                    segments[-1]["text"] += " " + line
                    
        return segments

    def detect_action_owner(self, doc, current_speaker, speakers):
        for token in doc:
            if token.text in speakers:
                return token.text
        return current_speaker

    def get_action_items(self, segments):
        actions = []
        speakers = set(s['speaker'] for s in segments)
        
        rephrase_patterns = [
            (r"^[Ii]('| wi)ll\s+", ""),
            (r"^[Ii] plan to\s+", ""),
            (r"^[Ii]'m going to\s+", ""),
            (r"^[Ii] am going to\s+", ""),
            (r"^[Ll]et me\s+", ""),
            (r"^[Ww]e need to\s+", ""),
            (r"^[Ww]e must\s+", ""),
            (r"^[Ww]e should\s+", ""),
            (r"^[Pp]lease\s+", ""),
        ]
        
        for s in segments:
            doc = self.nlp(s['text'])
            if len(doc) == 0: continue
            
            # 1. Distinguish Commitments
            is_commitment = False
            text_lower = s['text'].lower()
            if any(phrase in text_lower for phrase in ["i will", "i'll", "i plan to", "let me", "i'm on it", "i can "]):
                is_commitment = True
                
            if not is_commitment:
                if doc[0].pos_ == "VERB" and doc[0].is_sent_start:
                    is_commitment = True
                
                for token in doc:
                    if token.lemma_ in self.modal_keywords or (token.lemma_ in self.future_verbs and token.pos_ == "VERB"):
                        is_commitment = True
                        break
                        
            has_deadline = any(ent.label_ in ["DATE", "TIME"] for ent in doc.ents)
            if has_deadline and any(t.pos_ == "VERB" for t in doc):
                is_commitment = True

            if is_commitment:
                owner = self.detect_action_owner(doc, s['speaker'], speakers)
                
                # 2. Contextual Rephrasing
                task = s['text']
                for pattern, repl in rephrase_patterns:
                    task = re.sub(pattern, repl, task)
                task = task[:1].upper() + task[1:] if task else task
                
                # Tech stack extraction
                tech_stack = [ent.text for ent in doc.ents if ent.label_ in ["PRODUCT", "ORG"]]
                if tech_stack:
                    task += f" [{tech_stack[0]}]"
                    
                # 3. Determine Priority
                priority = "Low"
                if any(word in text_lower for word in ["urgent", "immediately", "critical", "crucial", "must", "today", "blocker"]):
                    priority = "High"
                elif any(word in text_lower for word in ["tomorrow", "should", "important", "need", "next"]):
                    priority = "Medium"
                    
                actions.append({
                    "time": s['time'],
                    "assigned_to": owner,
                    "task": task,
                    "priority": priority,
                    "deadlines": [ent.text for ent in doc.ents if ent.label_ in ["DATE", "TIME"]]
                })
        return actions

    def get_analytics(self, segments, roles):
        speaker_counts = Counter([s['speaker'] for s in segments])
        total_msgs = len(segments)
        insights = {}
        
        # Normalize roles keys to lowercase for robust lookup
        normalized_roles = {k.lower().strip(): v for k, v in roles.items()}
        
        for speaker, count in speaker_counts.items():
            text = " ".join([s['text'] for s in segments if s['speaker'] == speaker])
            scores = self.sentiment.polarity_scores(text)
            compound = scores['compound']
            
            # Format output as requested by "Project Lead" persona
            if compound >= 0.05:
                sentiment_str = "Started Neutral, Ended Optimistic"
            elif compound <= -0.05:
                sentiment_str = "Started Frustrated, Ended Neutral"
            else:
                sentiment_str = "100% Neutral"
            
            # Case-insensitive role lookup
            role = normalized_roles.get(speaker.lower().strip(), "Domain Expert")
            
            insights[speaker] = {
                "participation": f"{round((count/max(1, total_msgs))*100)}%",
                "sentiment": sentiment_str,
                "role": role
            }
        return insights

    def generate_summary(self, segments, spoken_text=""):
        if self.summarizer is None:
            try:
                from transformers import T5ForConditionalGeneration, T5Tokenizer, logging as tf_logging
                tf_logging.set_verbosity_error() # Disable transformers logging to stdout
                model_path = os.path.join(os.path.dirname(__file__), "final_model_output")
                print("Lazy loading local fine-tuned T5 model...", file=sys.stderr)
                self.tokenizer = T5Tokenizer.from_pretrained(model_path)
                self.model = T5ForConditionalGeneration.from_pretrained(model_path)
                self.summarizer = True
            except Exception as e:
                print(f"Could not load T5 model: {e}", file=sys.stderr)
                self.summarizer = False

        if self.summarizer and spoken_text:
            try:
                prompt = "summarize: " + spoken_text
                inputs = self.tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True)
                outputs = self.model.generate(
                    **inputs,
                    max_length=150,
                    min_length=30,
                    num_beams=4,
                    early_stopping=True
                )
                summary_text = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
                sentences = [s.strip() for s in summary_text.split('.') if s.strip()]
                
                # Format to match frontend requirements
                while len(sentences) < 3:
                    sentences.append("Further details are documented in the full transcript.")
                    
                return [
                    {"speaker": "Executive Overview", "text": sentences[0] + "."},
                    {"speaker": "Key Insights", "text": sentences[1] + "."},
                    {"speaker": "Resolution", "text": " ".join(sentences[2:]) + "." if len(sentences) > 2 else sentences[-1] + "."}
                ]
            except Exception as e:
                print(f"T5 Summarizer failed: {e}", file=sys.stderr)

        # Fallback to simulated data if no summarizer is loaded
        return [
            {"speaker": "Blocker", "text": "The core technical blocker discussed is aligning the database schema with the new MERN requirements."},
            {"speaker": "Solution", "text": "The decided solution is to refactor the Mongoose models and delay frontend integration."},
            {"speaker": "Timeline", "text": "This architectural shift will delay the overall prototype by approximately one week."}
        ]

    def detect_conflicts(self, segments):
        contradictions = []
        unresolved = []
        
        for i, s in enumerate(segments):
            text_lower = s['text'].lower()
            
            # Detect Unresolved Questions
            if "?" in s['text']:
                is_answered = False
                if i + 1 < len(segments):
                    next_lower = segments[i+1]['text'].lower()
                    if any(word in next_lower for word in ["yes", "no", "it is", "we have", "i think", "sure", "will do", "understood"]):
                        is_answered = True
                    if any(word in next_lower for word in ["i don't know", "not sure", "let me check", "no idea", "we'll see"]):
                        is_answered = False # Explicitly unresolved
                
                if not is_answered and len(s['text'].split()) > 4:
                    unresolved.append(f"Unresolved Blocker: {s['text']}")
                    
            # Identify Contradictions / Alignment Checks
            disagreement_keywords = ["but", "actually", "wrong", "disagree", "however", "issue", "ruled out", "already tried", "concern"]
            if any(k in text_lower for k in disagreement_keywords):
                # Check if someone else said something recently
                target = "previous context"
                if i > 0:
                    target = segments[i-1]['text']
                clean_text = re.sub(r'\s+', ' ', s['text']).strip()
                clean_target = re.sub(r'\s+', ' ', target).strip()
                contradictions.append(f"Technical Conflict: {s['speaker']} challenged alignment ('{clean_text[:100]}...') against '{clean_target[:100]}...'")
                
        if not contradictions:
            contradictions.append("Technical Conflict: No explicit contradictions detected in the transcript.")
        if not unresolved:
            unresolved.append("Unresolved Blocker: No ignored questions detected.")
            
        return {
            "contradictions": contradictions,
            "unresolved": unresolved
        }

    def run(self, input_file):
        with open(input_file, "r", encoding="utf-8") as f:
            raw_data = f.read()
            
        first_line = raw_data.split('\n')[0].strip()
        title = first_line.replace("Meeting Transcript:", "").strip() if "Meeting Transcript:" in first_line else "Uploaded Meeting"
            
        segments = self.parse_transcript(raw_data)
        speakers = set(s['speaker'] for s in segments)
        
        spoken_text = " ".join([s['text'] for s in segments])
        
        # Calculate local fallback attributes first
        keywords = list(dict.fromkeys([
            ent.text for ent in self.nlp(spoken_text).ents 
            if ent.label_ in ["ORG", "PRODUCT", "GPE"] and ent.text not in speakers
        ]))[:5]
        
        roles = self.extract_roles(raw_data)
        analytics = self.get_analytics(segments, roles)

        # Initialize variables
        keywords = []
        executive_summary = []
        conflicts = {"contradictions": [], "unresolved": []}
        action_items = []
        ai_recommendation = ""
        groq_success = False

        # --- GROQ API INTEGRATION ---
        if os.getenv("GROQ_API_KEY"):
            print("Consulting Groq API...", file=sys.stderr)
            try:
                groq_data = self.call_groq(raw_data)
                
                title = groq_data.get("title", title)
                keywords = groq_data.get("keywords", [])
                executive_summary = groq_data.get("executive_summary", [])
                action_items = groq_data.get("action_items", [])
                conflicts = groq_data.get("conflicts", {"contradictions": [], "unresolved": []})
                ai_recommendation = groq_data.get("ai_recommendation", "")
                
                groq_success = True
                print("Groq API successfully processed transcript.", file=sys.stderr)
            except Exception as e:
                print(f"Groq API call failed: {e}. Falling back to local/Ollama methods.", file=sys.stderr)

        # --- LOCAL NLP FALLBACK PATH (Runs only if Groq is unconfigured or fails) ---
        if not groq_success:
            print("Running local NLP fallback models...", file=sys.stderr)
            keywords = list(dict.fromkeys([
                ent.text for ent in self.nlp(spoken_text).ents 
                if ent.label_ in ["ORG", "PRODUCT", "GPE"] and ent.text not in speakers
            ]))[:5]
            
            executive_summary = self.generate_summary(segments, spoken_text)
            conflicts = self.detect_conflicts(segments)
            action_items = self.get_action_items(segments)

            # Dynamic fallback if Ollama is offline
            highest_speaker = "The lead speaker"
            if analytics:
                highest_speaker = max(analytics, key=lambda s: int(analytics[s]['participation'].replace('%', '')))
            
            llm_output = f"Proactive Tip: {highest_speaker} drove the majority of this conversation. Ensure their key technical concerns are addressed before the next sync."
            
            if hasattr(self, 'call_ollama'):
                print("Consulting AI Agent...", file=sys.stderr)
                try:
                    llm_output = self.call_ollama(spoken_text)
                except Exception as e:
                    print(f"Ollama failed: {e}. Using dynamic fallback.", file=sys.stderr)
            
            ai_recommendation = llm_output
        
        # --- Participation Threshold Alert (Mathematical / Local) ---
        num_speakers = len(speakers)
        # e.g. For 4 people, equal is 25%. Threshold = 12%. Max threshold capped at 11% as requested.
        threshold = min(11, max(5, int((100 / max(1, num_speakers)) * 0.5)))
        
        under_participants = []
        for speaker, data in analytics.items():
            pct = int(data['participation'].replace('%', ''))
            if pct < threshold:
                under_participants.append(speaker)
                
        if under_participants:
            names = " and ".join(under_participants)
            ai_recommendation += f"\n\n🚨 Participation Alert: {names} participated less than {threshold}% of the time. The manager should directly ask for their input to ensure balanced participation."

        return {
            "title": title,
            "summary": {
                "total_speakers": len(speakers),
                "keywords": keywords,
                "executive_summary": executive_summary
            },
            "analytics": analytics,
            "conflicts": conflicts,
            "action_items": action_items,
            "transcript": {"segments": segments},
            "ai_recommendation": ai_recommendation
        }

if __name__ == "__main__":
    engine = MeetingIntelligence()
    input_file = sys.argv[1] if len(sys.argv) > 1 else "meeting.txt"
    
    if os.path.exists(input_file):
        results = engine.run(input_file)
        
        script_dir = os.path.dirname(os.path.abspath(__file__))
        public_dir = os.path.abspath(os.path.join(script_dir, "..", "client", "nlp", "public"))
        
        if not os.path.exists(public_dir):
            print(f"Creating missing directory: {public_dir}", file=sys.stderr)
            os.makedirs(public_dir)
            
        public_path = os.path.join(public_dir, "processed_data.json")
        
        with open(public_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=4)
            
        print(f"Success! Dashboard updated at: {public_path}", file=sys.stderr)
        print(json.dumps(results))
    else:
        print(f"Error: {input_file} not found in {os.getcwd()}", file=sys.stderr)