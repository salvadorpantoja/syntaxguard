# SyntaxSentinel - AI Editorial Assistant

[![Live Demo](https://img.shields.io/badge/demo-online-green.svg)](https://salvadorpantoja.dev/syntax-sentinel/)
[![Architecture: Cloudflare Workers](https://img.shields.io/badge/Backend-Cloudflare_Workers-orange.svg)](https://workers.cloudflare.com/)
[![Built with AI](https://img.shields.io/badge/workflow-AI--Accelerated-blueviolet)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A specialized editorial tool that enforces strict corporate style guides using LLMs. It features a **Serverless Proxy Architecture** to ensure API security and data privacy.

## 🚀 Live Demo
**[View Live Project Here](https://salvadorpantoja.dev/syntax-sentinel/)**

## 💡 The Problem
Mainstream grammar checkers (like Grammarly) catch spelling errors but fail to enforce **company-specific branding rules**. For example, a legal firm might strictly forbid the word "expert" due to liability reasons, or require specific formatting for job titles.

## 🛠 The Solution
I built a custom AI wrapper that:
1.  Accepts raw text input.
2.  Injects a **Custom System Prompt** (containing the specific Style Guide rules).
3.  Returns a diff of corrections and "Editor's Notes" explaining *why* the change was made.

## 🏗 Technical Architecture (The Security Layer)
Instead of exposing the Google Gemini API key in the client-side code (a common security flaw in AI apps), I architected a **Backend-for-Frontend (BFF)** pattern using **Cloudflare Workers**.

### The Request Flow:
1.  **Client:** The Vanilla JS frontend sends the user's text to my custom Cloudflare Worker endpoint.
2.  **Edge Compute:** The Worker (running at the edge) validates the request.
3.  **Secret Injection:** The Worker retrieves the API key from Cloudflare's encrypted environment variables.
4.  **Proxy:** The Worker constructs the authenticated request to Google and streams the response back to the client.

**Result:** The browser never sees the API key, and the application is protected against quota theft.

## 💻 Tech Stack
*   **Frontend:** HTML5, Vanilla JavaScript, Tailwind CSS (via CDN for lightweight loading).
*   **Backend:** Cloudflare Workers (Serverless JS).
*   **AI Model:** Google Gemini 2.5 Flash.
*   **Analytics:** Google Analytics 4.

## 🤖 AI-Accelerated Workflow ("Vibe Coding")
This project utilizes an AI-assisted development workflow.
*   **My Role:** System Architect & Prompt Engineer. I designed the Cloudflare security layer and defined the prompt constraints for the style guide.
*   **AI Role:** I used Google AI Studio to generate the initial DOM manipulation logic and Tailwind class structures, speeding up the UI build time by ~80%.

## 📄 License
MIT License