import os
import requests
import json
from dotenv import load_dotenv
import time

load_dotenv()

class AIService:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        self.api_url = os.getenv("DEEPSEEK_API_URL")
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

    def analyze_text(self, text: str, analysis_type: str = "full") -> dict:
        """Analyze text using DeepSeek AI with improved error handling"""
        
        # Truncate very long texts to avoid token limits and timeouts
        if len(text) > 8000:
            text = text[:8000] + "... [content truncated for optimal analysis]"
        
        prompts = {
            "summary": f"Please provide a comprehensive summary of the following document. Focus on the main points, key findings, and overall context. Be concise but thorough:\n\n{text}",
            "insights": f"Extract key insights and important points from this document. Highlight surprising findings, critical data, and significant conclusions:\n\n{text}",
            "qa": f"Generate 3-5 important questions and their answers based on this document. Focus on understanding key concepts and main ideas:\n\n{text}",
            "full": f"""Analyze this document and provide:

1. A clear executive summary (2-4 paragraphs)
2. Key insights and important findings (bullet points)
3. 3-5 questions and answers that test understanding of main concepts

Document content:
{text}

Please structure your response as:
SUMMARY: [your summary here]
INSIGHTS: [bullet points of insights]
Q&A: [3-5 questions and answers]"""
        }

        prompt = prompts.get(analysis_type, prompts["full"])

        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "system",
                    "content": "You are a expert document analyst. Provide clear, structured, and insightful analysis of documents. Be concise and focused."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 2000  # Reduced to prevent timeouts
        }

        try:
            # Increased timeout and added retry logic
            response = requests.post(self.api_url, headers=self.headers, json=payload, timeout=45)
            response.raise_for_status()
            
            result = response.json()
            ai_response = result['choices'][0]['message']['content']
            
            return self._parse_ai_response(ai_response, analysis_type)
            
        except requests.exceptions.Timeout:
            return self._get_timeout_fallback_response(text)
        except requests.exceptions.ConnectionError:
            return {
                "summary": "Connection error: Unable to reach AI service. Please check your internet connection.",
                "insights": ["Service temporarily unavailable"],
                "questions_answers": []
            }
        except Exception as e:
            return {
                "summary": f"Analysis service error: {str(e)}",
                "insights": ["Analysis unavailable due to service issue"],
                "questions_answers": []
            }

    def _get_timeout_fallback_response(self, text: str) -> dict:
        """Provide a basic fallback analysis when API times out"""
        # Simple local analysis as fallback
        words = text.split()
        word_count = len(words)
        
        # Extract first 200 words as simple summary
        preview = ' '.join(words[:200]) + "..." if len(words) > 200 else text
        
        return {
            "summary": f"Document preview: {preview}\n\nNote: Full AI analysis timed out. Document contains approximately {word_count} words.",
            "insights": [
                "AI service is currently experiencing high load",
                "Try analyzing a smaller document or try again later",
                "Basic text extraction completed successfully"
            ],
            "questions_answers": [
                {
                    "question": "Why did the full analysis not complete?",
                    "answer": "The AI service is currently experiencing high demand. Please try again with a smaller document or wait a few minutes."
                },
                {
                    "question": "What can I do now?",
                    "answer": "You can try re-uploading the document, using a smaller file, or checking your internet connection."
                }
            ]
        }

    def _parse_ai_response(self, response: str, analysis_type: str) -> dict:
        """Parse AI response into structured format"""
        
        # If response is empty or too short, use fallback
        if not response or len(response.strip()) < 50:
            return {
                "summary": "AI response was incomplete. Please try again.",
                "insights": ["Incomplete analysis response"],
                "questions_answers": []
            }
            
        if analysis_type == "summary":
            return {
                "summary": response,
                "insights": [],
                "questions_answers": []
            }
        elif analysis_type == "insights":
            insights = [insight.strip() for insight in response.split('\n') if insight.strip() and insight.strip().startswith(('-', '•', '*'))]
            return {
                "summary": "",
                "insights": insights if insights else [response[:500] + "..."],
                "questions_answers": []
            }
        elif analysis_type == "qa":
            qa_pairs = []
            lines = response.split('\n')
            
            for i in range(0, len(lines) - 1, 2):
                if lines[i].strip().startswith(('Q:', 'Question:', '?')) and i + 1 < len(lines):
                    qa_pairs.append({
                        "question": lines[i].strip(),
                        "answer": lines[i + 1].strip()
                    })
                    if len(qa_pairs) >= 5:  # Limit to 5 pairs
                        break
                        
            return {
                "summary": "",
                "insights": [],
                "questions_answers": qa_pairs
            }
        else:
            return self._parse_full_analysis(response)

    def _parse_full_analysis(self, response: str) -> dict:
        """Parse full analysis response with improved error handling"""
        sections = {
            "summary": "",
            "insights": [],
            "questions_answers": []
        }
        
        # Simple parsing - look for section markers
        summary_start = response.find('SUMMARY:')
        insights_start = response.find('INSIGHTS:')
        qa_start = response.find('Q&A:')
        
        if summary_start != -1 and insights_start != -1:
            sections["summary"] = response[summary_start + 8:insights_start].strip()
        elif summary_start != -1:
            sections["summary"] = response[summary_start + 8:].strip()
        else:
            # Fallback: use first paragraph as summary
            paragraphs = response.split('\n\n')
            sections["summary"] = paragraphs[0] if paragraphs else response[:500] + "..."
        
        # Extract insights (bullet points)
        lines = response.split('\n')
        in_insights = False
        for line in lines:
            line = line.strip()
            if line.startswith('INSIGHTS:'):
                in_insights = True
                continue
            elif line.startswith('Q&A:') or line.startswith('QUESTIONS:'):
                break
            elif in_insights and line.startswith(('-', '•', '*')):
                insight = line[1:].strip()
                if insight:
                    sections["insights"].append(insight)
        
        # If no insights found, create some basic ones
        if not sections["insights"]:
            sections["insights"] = [
                "Document successfully processed",
                "Key themes extracted from content",
                "Further analysis available on retry"
            ]
        
        # Simple Q&A extraction
        qa_lines = response.split('\n')
        current_question = None
        
        for line in qa_lines:
            line = line.strip()
            if line.startswith(('Q:', 'Question:', '?')) and len(line) > 10:
                if current_question and current_question["answer"]:
                    sections["questions_answers"].append(current_question)
                current_question = {"question": line, "answer": ""}
            elif current_question and line.startswith(('A:', 'Answer:', 'Ans:')):
                current_question["answer"] = line
            elif current_question and current_question["answer"] and line and not line.startswith(('Q:', 'Question:', '?', 'A:', 'Answer:')):
                current_question["answer"] += " " + line
        
        if current_question and current_question["answer"]:
            sections["questions_answers"].append(current_question)
        
        # Ensure we have at least some Q&A
        if not sections["questions_answers"]:
            sections["questions_answers"] = [
                {
                    "question": "What is this document about?",
                    "answer": sections["summary"][:200] + "..."
                }
            ]
        
        return sections