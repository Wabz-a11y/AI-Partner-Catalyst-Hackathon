Brenda Al — Technical Overview & Developer Documentation
Version: 2.0  PROFESSIONAL AGENT
Author: IAN WABWIRE — Creator & Lead Developer
Purpose: This PDF serves as a comprehensive guide to Brenda Al, including architecture, code structure, functionality, challenges faced during development, and the real-world problems it solves. Use this document when discussing technical details with Brenda during simulations (e.g., upload it for vision analysis in Software Development Lab).
1.	Introduction & Problems Solved
Brenda Al is a full-stack, multimodal professional simulation platform built to democratize high-stakes skill practice.
Core Problems Addressed:
•	Limited access to realistic training (e.g., mock trials, patient consultations, design
 
•	High risk/cost of real-world practice (ethical, legal, financial consequences).
•	Lack of personalized, on-demand feedback.
•	Difficulty interpreting complex documents/diagrams without expert review.
Brenda provides risk-free, adaptive role-play with voice interaction and Gemini-powered vision analysis for documents, diagrams, scans, etc.
2.	High-Level Architecture
•	Frontend: Vite + React + TypeScript + shadcn/ui (fast, modern SPA).
•	Backend: Express.js proxy (secure Gemini API calls ).
•	Al Integration:
•	Voice: Elevenlabs Agent.
•	Vision: Gemini 2.5-flash.
•	State: localStorage + LZString compression for sessions/history.
•	Deployment: Single app (Vite build served by Express in production).
•	Key Flow: User uploads file Frontend hook Backend proxy Gemini Structured response Transcript/Ul.
Critical Files:
•	useVisionAna1ysis.ts : Handles file base64 prompt backend call structured analysis.
•	Smart prompt detection (photo vs. document) for optimal Gemini output.
•	Memory-safe thumbnail revocation.
Tech Stack:
•	React 18, TypeScript, Tailwind/shadcn
•	Gemini API (via @google/generative-ai SDK)
•	localStorage persistence
•	MediaRecorder API for voice
3.	Functionality Highlights
•	Professional Portals: 10+ domains (Law, Medicine, Engineering, etc.) with custom simulations/roles.
•	Vision Analysis: Upload images/PDFs/diagrams Structured reports (Overview, Description, Insights, Notable Elements for photos; Document Type, Summary, Key
Details, Explanation, Conclusion for docs).
•	Voice Simulation: Real-time recording, transcript, multi-role play.
•	History/Dashboard: Save/share sessions with audio/transcript/vision results.
4.	Development Challenges & Solutions
•	Document vs. Photo Detection: Gemini treated scans as photos. Solved: File type/name heuristics + dual prompts.
•	Memory Leaks: Object URLs not revoked. Solved: Cleanup in clear/remove hooks.
•	Concurrent Dev: Manual dual terminals. Solved: Concurrently scripts + Vite proxy.
•	Voice Recording: System audio capture tricky. Solved: getDisplayMedia + mixing.
•	Code debugging: this wasn’t that easy but with enough and rest, things just worked out.
5.	Future Roadmap
•	Dedicated Al/ML Portal
•	Multi-page PDF support
•	Exportable reports
•	Cloud sync for sessions
Brenda is open for contributions — let's make professional mastery accessible to everyone!
