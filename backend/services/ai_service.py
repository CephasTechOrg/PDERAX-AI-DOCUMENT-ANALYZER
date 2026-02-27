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

    def generate_flashcards(self, text: str, count: int = 10, difficulty: str = "medium", focus_topics: list = None) -> dict:
        """Generate flashcards from text using DeepSeek AI."""
        import json
        
        text = (text or "").strip()
        
        if not text or len(text) < 50:
            return self._build_fallback_flashcards(text, reason="Insufficient text for flashcard generation.")
        
        # Truncate very long texts
        if len(text) > 6000:
            text = text[:6000] + "... [content truncated]"
        
        # Check AI credentials
        if not self.api_key or not self.api_url:
            return self._build_fallback_flashcards(text, reason="AI credentials not configured.")
        
        # Build flashcard-specific prompt
        difficulty_instructions = {
            "easy": "Use simple, straightforward questions with clear, concise answers. Focus on basic definitions and key facts.",
            "medium": "Create balanced questions that test understanding. Include some conceptual questions.",
            "hard": "Create challenging questions that test deep understanding, application, and analysis of concepts."
        }
        
        focus_instruction = ""
        if focus_topics:
            focus_instruction = f"\nFocus particularly on these topics: {', '.join(focus_topics)}"
        
        prompt = f"""Generate exactly {count} educational flashcards from the following text.
        
Difficulty level: {difficulty}
{difficulty_instructions.get(difficulty, difficulty_instructions["medium"])}
{focus_instruction}

IMPORTANT: Return ONLY a valid JSON array with no additional text. Each flashcard must have:
- "front": The question or term (string)
- "back": The answer or definition (string)  
- "category": The topic/category this relates to (string)

Example format:
[
  {{"front": "What is photosynthesis?", "back": "The process by which plants convert sunlight into energy.", "category": "Biology"}},
  {{"front": "Define GDP", "back": "Gross Domestic Product - the total value of goods and services produced by a country.", "category": "Economics"}}
]

Source text:
{text}

Generate {count} flashcards as a JSON array:"""

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert educator creating study flashcards. Always respond with valid JSON only, no markdown or extra text."
                },
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.4,
            "max_tokens": 2000,
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
                .get("content", "")
            )
            
            if not ai_response:
                return self._build_fallback_flashcards(text, reason="Empty response from AI service.")
            
            # Parse the JSON response
            flashcards = self._parse_flashcard_response(ai_response)
            
            if not flashcards:
                return self._build_fallback_flashcards(text, reason="Could not parse AI response into flashcards.")
            
            # Generate a brief summary of the source
            words = text.split()
            source_summary = " ".join(words[:50]) + "..." if len(words) > 50 else text
            
            return {
                "flashcards": flashcards,
                "source_summary": source_summary,
                "total_count": len(flashcards),
                "source": "ai",
                "difficulty": difficulty
            }
            
        except requests.exceptions.Timeout:
            return self._build_fallback_flashcards(text, reason="AI service timed out.")
        except requests.exceptions.RequestException as exc:
            return self._build_fallback_flashcards(text, reason=f"AI service unavailable: {exc}")
        except Exception as exc:
            return self._build_fallback_flashcards(text, reason=f"Flashcard generation error: {exc}")
    
    def _parse_flashcard_response(self, response: str) -> list:
        """Parse AI response into flashcard list."""
        import json
        import re
        
        # Clean up the response - remove markdown code blocks if present
        response = response.strip()
        response = re.sub(r'^```json\s*', '', response)
        response = re.sub(r'^```\s*', '', response)
        response = re.sub(r'\s*```$', '', response)
        
        try:
            flashcards = json.loads(response)
            if isinstance(flashcards, list):
                # Validate and clean each flashcard
                valid_cards = []
                for card in flashcards:
                    if isinstance(card, dict) and "front" in card and "back" in card:
                        valid_cards.append({
                            "front": str(card.get("front", "")).strip(),
                            "back": str(card.get("back", "")).strip(),
                            "category": str(card.get("category", "General")).strip()
                        })
                return valid_cards
        except json.JSONDecodeError:
            pass
        
        # Fallback: try to extract flashcards from text format
        flashcards = []
        lines = response.split('\n')
        current_card = {}
        
        for line in lines:
            line = line.strip()
            if line.lower().startswith(('front:', 'q:', 'question:')):
                if current_card.get('front') and current_card.get('back'):
                    flashcards.append(current_card)
                current_card = {'front': line.split(':', 1)[1].strip() if ':' in line else '', 'category': 'General'}
            elif line.lower().startswith(('back:', 'a:', 'answer:')):
                current_card['back'] = line.split(':', 1)[1].strip() if ':' in line else ''
            elif line.lower().startswith(('category:', 'topic:')):
                current_card['category'] = line.split(':', 1)[1].strip() if ':' in line else 'General'
        
        if current_card.get('front') and current_card.get('back'):
            flashcards.append(current_card)
        
        return flashcards
    
    def _build_fallback_flashcards(self, text: str, reason: str = "") -> dict:
        """Generate basic flashcards without AI when service is unavailable."""
        words = text.split()
        
        # Create simple flashcards from the text
        flashcards = []
        
        if len(words) >= 20:
            # Create a basic "what is this about" card
            preview = " ".join(words[:30])
            flashcards.append({
                "front": "What is the main topic of this document?",
                "back": preview + "...",
                "category": "Overview"
            })
            
            # Add a card about document length
            flashcards.append({
                "front": "How long is this document?",
                "back": f"Approximately {len(words)} words",
                "category": "Document Info"
            })
            
            flashcards.append({
                "front": "Why are these flashcards limited?",
                "back": reason or "AI service was unavailable for full flashcard generation.",
                "category": "System"
            })
        
        source_summary = " ".join(words[:50]) + "..." if len(words) > 50 else text
        
        return {
            "flashcards": flashcards,
            "source_summary": source_summary,
            "total_count": len(flashcards),
            "source": "fallback",
            "notice": reason,
            "difficulty": "easy"
        }
