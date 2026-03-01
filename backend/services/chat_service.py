"""
AI Chat Service — handles teacher-mode and helper-mode conversations.
Uses the same DeepSeek backend as AIService.
"""
import os
from typing import List, Dict

import httpx


_FORMATTING_RULES = """\

## Output Formatting Rules (MANDATORY)

Follow these rules on EVERY response — no exceptions:

1. **Structure** — Use clear sections when the response covers multiple points.
   Use `###` headings to separate sections. Never output one giant paragraph.

2. **Step-based instructions** — When giving a process, procedure, or solution:
   Use this exact format:
   **Step 1 —** Description
   **Step 2 —** Description
   (Do NOT use plain "1. 2. 3." numbered lists for instructional steps.)

3. **Spacing** — One blank line between paragraphs. One blank line before each
   section heading. NO multiple consecutive blank lines.

4. **Bullet points** — Use `•` or `-` for lists. Keep each bullet concise.

5. **Code** — Always wrap code in fenced code blocks (```language ... ```).
   Never inline multi-line code.

6. **Length** — Be complete but concise. No filler phrases ("Great question!",
   "Certainly!", "Of course!"). Start directly with the substance.

7. **No raw HTML** — Never output HTML tags.

8. **Tone** — Professional, clear, direct. University-level vocabulary is fine.

9. **Math** — For any mathematical expression, fraction, or equation, use LaTeX:
   - Inline math: $\frac{1}{2}$, $x^2 + y^2 = z^2$
   - Display math (own line): $$\int_0^\infty e^{-x}\,dx = 1$$
   Never write fractions as plain text (e.g. "1/2") — always use $\frac{1}{2}$.
"""

TEACHER_SYSTEM_PROMPT = """\
You are an expert academic tutor and learning coach named PDERAX Assistant.
Your role is to guide students to understanding through the Socratic method —
you NEVER simply give the answer. Instead you:

1. Ask clarifying questions to understand what the student already knows.
2. Break the problem into smaller, manageable steps.
3. Give hints that steer the student toward discovering the answer themselves.
4. Celebrate progress and correct misconceptions gently.
5. End EVERY response with either a follow-up question OR a mini-challenge
   that moves the student one step closer to the solution.

Rules:
- If the student asks for a direct answer, respond with: "Let's work through
  this together — what do you think the first step might be?"
- Keep responses concise (3–6 sentences + the closing question).
- Use simple, encouraging language appropriate for a university student.
- If a document/context has been provided, reference it specifically.
""" + _FORMATTING_RULES

HELPER_SYSTEM_PROMPT = """\
You are PDERAX Assistant, a knowledgeable AI study helper.
Your role is to explain concepts clearly, answer questions directly, and help
students understand their study material. You:

1. Provide clear, structured explanations with headings for multi-part answers.
2. Use concrete examples and analogies to make ideas accessible.
3. Summarise key points in bullet lists at the end when helpful.
4. Suggest related topics for further study where appropriate.
5. Are encouraging and supportive.

If a document/context has been provided, base your answers on it.
Keep responses focused, well-structured, and easy to follow.
""" + _FORMATTING_RULES


class ChatService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL")
        self.timeout = int(os.getenv("AI_REQUEST_TIMEOUT", "30"))

    def _headers(self) -> Dict:
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        }

    def _build_system_prompt(self, mode: str, document_context: str | None) -> str:
        base = TEACHER_SYSTEM_PROMPT if mode == "teacher" else HELPER_SYSTEM_PROMPT
        if document_context:
            truncated = document_context[:5000]
            base += f"\n\n--- DOCUMENT CONTEXT ---\n{truncated}\n--- END CONTEXT ---"
        return base

    async def send_message(
        self,
        mode: str,
        document_context: str | None,
        history: List[Dict],
        user_message: str,
    ) -> str:
        """
        Send a chat message and return the assistant reply.

        history: list of {"role": "user"|"assistant", "content": "..."} dicts
                 (should be the last N messages, not including the new user message)
        """
        if not self.api_key or not self.api_url:
            return self._fallback_reply(mode, user_message)

        system_prompt = self._build_system_prompt(mode, document_context)

        # Compose full message list
        messages = [{"role": "system", "content": system_prompt}]
        # Keep last 20 messages to stay within token budget
        for msg in history[-20:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
        messages.append({"role": "user", "content": user_message})

        payload = {
            "model": "deepseek-chat",
            "messages": messages,
            "temperature": 0.65 if mode == "teacher" else 0.45,
            "max_tokens": 1200,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.api_url,
                    headers=self._headers(),
                    json=payload,
                )
            response.raise_for_status()
            result = response.json()
            reply = (
                result.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "")
            )
            return reply.strip() if reply else self._fallback_reply(mode, user_message)

        except httpx.TimeoutException:
            return "I'm sorry, the AI service timed out. Please try again in a moment."
        except httpx.HTTPError as exc:
            return f"The AI service is temporarily unavailable. (Error: {exc})"
        except Exception as exc:
            return f"Something went wrong. Please try again. (Error: {exc})"

    def _fallback_reply(self, mode: str, user_message: str) -> str:
        if mode == "teacher":
            return (
                "Great question! The AI service isn't configured yet, but let's think "
                "through this together. What do you already know about this topic? "
                "Start by telling me what comes to mind first."
            )
        return (
            "The AI service isn't configured yet. Once it's set up, I'll be able to "
            "give you a detailed answer. In the meantime, try breaking your question "
            "into smaller parts and researching each one."
        )
