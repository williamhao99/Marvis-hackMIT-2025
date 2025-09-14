# Expert Detail Questions - AI Handyman Assistant

## Q1: Should the system use OpenAI's new Responses API with built-in file search for instruction retrieval instead of building a custom RAG pipeline?
**Default if unknown:** Yes (OpenAI's hosted solution reduces complexity, provides better PDF parsing with GPT-4o, and offers single API call RAG implementation)

## Q2: Should we implement real-time RTMP streaming from Mentra Live to a phone app for remote assistance scenarios?
**Default if unknown:** No (adds complexity and bandwidth requirements; focus on core AR guidance first, add livestream as future enhancement)

## Q3: Should the wake word detection run on-device using Porcupine SDK or in the cloud through the MentraOS platform?
**Default if unknown:** On-device (Porcupine provides sub-100ms response times, works offline, and reduces privacy concerns with always-listening)

## Q4: Should visual overlays be rendered directly on Even G1's 640x200 display or projected as AR elements through the Mentra Live glasses?
**Default if unknown:** Even G1 display (simpler implementation, established SDK, monochromatic display perfect for text instructions and simple graphics)

## Q5: Should the system cache instruction manuals locally on the glasses or retrieve them in real-time from the cloud?
**Default if unknown:** Real-time cloud retrieval (ensures up-to-date instructions, leverages cloud AI for contextual step matching, reduces local storage requirements)

---

**Questions Status:** All written, ready to ask
**Next Step:** Begin asking questions one at a time with technical context