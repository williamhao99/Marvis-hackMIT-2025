# Expert Detail Answers - AI Handyman Assistant

## Q1: Should the system use OpenAI's new Responses API with built-in file search for instruction retrieval instead of building a custom RAG pipeline?
**Answer:** No - each manual has different formats and structures that need custom handling
**Impact:** Build custom RAG pipeline with manual-specific parsing logic and format handlers

## Q2: Should we implement real-time RTMP streaming from Mentra Live to a phone app for remote assistance scenarios?
**Answer:** Yes
**Impact:** Include RTMP streaming capability for remote assistance and supervision during complex repairs

## Q3: Should the wake word detection run on-device using Porcupine SDK or in the cloud through the MentraOS platform?
**Answer:** Default (On-device)
**Impact:** Implement Porcupine SDK locally for sub-100ms response times and offline operation

## Q4: Should visual overlays be rendered directly on Even G1's 640x200 display or projected as AR elements through the Mentra Live glasses?
**Answer:** Rendered directly via images on Even G1 display
**Impact:** Focus on image generation and rendering for 640x200 monochromatic display

## Q5: Should the system cache instruction manuals locally on the glasses or retrieve them in real-time from the cloud?
**Answer:** Real-time cloud retrieval
**Impact:** Cloud-based instruction processing with AI-powered contextual step matching

---

**Answers Recorded:** 2025-09-13
**Next Phase:** Requirements Documentation