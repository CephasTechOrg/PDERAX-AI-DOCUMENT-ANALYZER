import os
import requests
from dotenv import load_dotenv

load_dotenv()


class AIService:
    """Handles all AI text analysis with resilient fallbacks."""

    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL")
        # Keep the backend response faster than the frontend timeout (30s)
        self.request_timeout = int(os.getenv("AI_REQUEST_TIMEOUT", "20"))
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}" if self.api_key else "",
        }

    def analyze_text(self, text: str, analysis_type: str = "full") -> dict:
        """Analyze text using DeepSeek AI or fall back to a local summary."""
        text = (text or "").strip()

        if not text:
            return self._build_local_analysis(
                text,
                reason="No text found for analysis.",
            )

        # Truncate very long texts to avoid token limits and slow responses
        if len(text) > 6000:
            text = text[:6000] + "... [content truncated for optimal analysis]"

        # If credentials are missing, skip the network call entirely
        if not self.api_key or not self.api_url:
            return self._build_local_analysis(
                text,
                reason="AI credentials are not configured; using local fallback.",
            )

        prompt = self._build_prompt(text, analysis_type)
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an expert document analyst. Provide clear, structured, "
                        "and insightful analysis of documents. Be concise and focused."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 1600,
        }

        try:
            response = requests.post(
                self.api_url,
                headers=self.headers,
                json=payload,
                timeout=self.request_timeout,
            )
            response.raise_for_status()

            result = response.json()
            ai_response = (
                result.get("choices", [{}])[0]
                .get("message", {})
                .get("content")
            )

            if not ai_response:
                return self._build_local_analysis(
                    text,
                    reason="Empty response from AI service; using fallback.",
                )

            parsed_response = self._parse_ai_response(ai_response, analysis_type)
            parsed_response["source"] = "ai"
            return parsed_response

        except requests.exceptions.Timeout:
            return self._build_local_analysis(text, reason="AI service timed out.")
        except requests.exceptions.RequestException as exc:
            return self._build_local_analysis(
                text,
                reason=f"AI service unavailable: {exc}",
            )
        except Exception as exc:
            return self._build_local_analysis(
                text,
                reason=f"Analysis service error: {exc}",
            )

    def _build_prompt(self, text: str, analysis_type: str) -> str:
        prompts = {
            "summary": (
                "Provide a comprehensive summary of the following document. "
                "Focus on the main points, key findings, and overall context. "
                f"Be concise but thorough:\n\n{text}"
            ),
            "insights": (
                "Extract key insights and important points from this document. "
                "Highlight surprising findings, critical data, and significant conclusions:\n\n"
                f"{text}"
            ),
            "qa": (
                "Generate 3-5 important questions and their answers based on this document. "
                "Focus on understanding key concepts and main ideas:\n\n{text}"
            ),
            "full": (
                "Analyze this document and provide:\n\n"
                "1. A clear executive summary (2-4 paragraphs)\n"
                "2. Key insights and important findings (bullet points)\n"
                "3. 3-5 questions and answers that test understanding of main concepts\n\n"
                f"Document content:\n{text}\n\n"
                "Please structure your response as:\n"
                "SUMMARY: [your summary here]\n"
                "INSIGHTS: [bullet points of insights]\n"
                "Q&A: [3-5 questions and answers]"
            ),
        }
        return prompts.get(analysis_type, prompts["full"])

    def _build_local_analysis(self, text: str, reason: str = "") -> dict:
        """Generate a lightweight, deterministic analysis without external calls."""
        words = text.split()
        word_count = len(words)
        preview_words = words[:200]
        preview = " ".join(preview_words).strip()
        summary = preview if preview else "No readable text was found in the document."

        insights = []
        if word_count:
            insights.append(f"Approximate document length: {word_count} words.")
        insights.append("Local fallback summary generated because the AI service was unavailable.")
        if reason:
            insights.append(reason)

        qa_pairs = []
        if summary:
            qa_pairs = [
                {
                    "question": "What is this document about?",
                    "answer": summary[:240] + ("..." if len(summary) > 240 else ""),
                },
                {
                    "question": "Why is this a fallback summary?",
                    "answer": reason or "The remote AI service could not complete the request in time.",
                },
            ]

        return {
            "summary": summary,
            "insights": insights,
            "questions_answers": qa_pairs,
            "notice": reason or "Fallback analysis was used.",
            "source": "fallback",
        }

    def _parse_ai_response(self, response: str, analysis_type: str) -> dict:
        """Parse AI response into structured format."""

        # If response is empty or too short, use fallback
        if not response or len(response.strip()) < 50:
            return self._build_local_analysis(
                response,
                reason="AI response was incomplete.",
            )

        if analysis_type == "summary":
            return {
                "summary": response,
                "insights": [],
                "questions_answers": [],
            }
        elif analysis_type == "insights":
            insights = [
                insight.lstrip("-*• ").strip()
                for insight in response.split("\n")
                if insight.strip() and insight.strip().startswith(("-", "*", "\u2022"))
            ]
            return {
                "summary": "",
                "insights": insights if insights else [response[:500] + "..."],
                "questions_answers": [],
            }
        elif analysis_type == "qa":
            qa_pairs = []
            lines = response.split("\n")

            for i in range(0, len(lines) - 1, 2):
                if lines[i].strip().startswith(("Q:", "Question:", "?")) and i + 1 < len(lines):
                    qa_pairs.append(
                        {
                            "question": lines[i].strip(),
                            "answer": lines[i + 1].strip(),
                        }
                    )
                    if len(qa_pairs) >= 5:  # Limit to 5 pairs
                        break

            return {
                "summary": "",
                "insights": [],
                "questions_answers": qa_pairs,
            }
        else:
            return self._parse_full_analysis(response)

    def _parse_full_analysis(self, response: str) -> dict:
        """Parse full analysis response with improved error handling."""
        sections = {
            "summary": "",
            "insights": [],
            "questions_answers": [],
        }

        # Simple parsing - look for section markers
        summary_start = response.find("SUMMARY:")
        insights_start = response.find("INSIGHTS:")
        qa_start = response.find("Q&A:")

        if summary_start != -1 and insights_start != -1:
            sections["summary"] = response[summary_start + 8 : insights_start].strip()
        elif summary_start != -1:
            sections["summary"] = response[summary_start + 8 :].strip()
        else:
            # Fallback: use first paragraph as summary
            paragraphs = response.split("\n\n")
            sections["summary"] = paragraphs[0] if paragraphs else response[:500] + "..."

        # Extract insights (bullet points)
        lines = response.split("\n")
        in_insights = False
        for line in lines:
            line = line.strip()
            if line.startswith("INSIGHTS:"):
                in_insights = True
                continue
            elif line.startswith("Q&A:") or line.startswith("QUESTIONS:"):
                break
            elif in_insights and line.startswith(("-", "*", "\u2022")):
                insight = line.lstrip("-*\u2022 ").strip()
                if insight:
                    sections["insights"].append(insight)

        # If no insights found, create some basic ones
        if not sections["insights"]:
            sections["insights"] = [
                "Document successfully processed.",
                "Key themes extracted from available content.",
                "Further analysis available on retry.",
            ]

        # Simple Q&A extraction
        qa_lines = response.split("\n")
        current_question = None

        for line in qa_lines:
            line = line.strip()
            if line.startswith(("Q:", "Question:", "?")) and len(line) > 10:
                if current_question and current_question.get("answer"):
                    sections["questions_answers"].append(current_question)
                current_question = {"question": line, "answer": ""}
            elif current_question and line.startswith(("A:", "Answer:", "Ans:")):
                current_question["answer"] = line
            elif current_question and current_question.get("answer") and line and not line.startswith(
                ("Q:", "Question:", "?", "A:", "Answer:")
            ):
                current_question["answer"] += " " + line

        if current_question and current_question.get("answer"):
            sections["questions_answers"].append(current_question)

        # Ensure we have at least some Q&A
        if not sections["questions_answers"]:
            sections["questions_answers"] = [
                {
                    "question": "What is this document about?",
                    "answer": sections["summary"][:200] + "...",
                }
            ]

        return sections
