import os

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail


def send_verification_email(to_email: str, code: str) -> None:
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("EMAIL_FROM")
    if not api_key or not from_email:
        raise RuntimeError("SendGrid is not configured (SENDGRID_API_KEY/EMAIL_FROM)")

    subject = "PDERAX Verification Code"
    html_content = (
        "<p>Your verification code is:</p>"
        f"<h2 style='letter-spacing:2px'>{code}</h2>"
        "<p>This code expires soon. If you did not request this, you can ignore this email.</p>"
    )

    message = Mail(
        from_email=from_email,
        to_emails=to_email,
        subject=subject,
        html_content=html_content,
    )

    sg = SendGridAPIClient(api_key)
    sg.send(message)
