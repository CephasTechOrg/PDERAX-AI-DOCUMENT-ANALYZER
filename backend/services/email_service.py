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


async def send_classroom_invitation(
    student_email: str,
    classroom_name: str,
    teacher_name: str,
    invite_code: str,
    classroom_id: str
) -> bool:
    """
    Send classroom invitation email via SendGrid
    
    Args:
        student_email: Email address of the student to invite
        classroom_name: Name of the classroom
        teacher_name: Name of the teacher inviting
        invite_code: Unique invite code for joining
        classroom_id: UUID of the classroom
    
    Returns:
        bool: True if email sent successfully
    """
    api_key = os.getenv("SENDGRID_API_KEY")
    from_email = os.getenv("EMAIL_FROM")
    
    if not api_key or not from_email:
        raise RuntimeError("SendGrid is not configured (SENDGRID_API_KEY/EMAIL_FROM)")
    
    # Get frontend URL from environment or use default
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
    
    subject = f"You've been invited to {classroom_name}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }}
            .invite-code {{ background: #fff; padding: 20px; margin: 20px 0; 
                           border: 2px solid #e5e7eb; border-radius: 8px; text-align: center; }}
            .code {{ font-size: 32px; font-weight: 700; color: #4f46e5; 
                    letter-spacing: 5px; font-family: 'Courier New', monospace; }}
            .button {{ display: inline-block; background: #4f46e5; color: white; 
                      padding: 15px 30px; text-decoration: none; border-radius: 8px; 
                      margin-top: 20px; font-weight: 600; }}
            .footer {{ text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎓 Classroom Invitation</h1>
            </div>
            <div class="content">
                <p>Hi there!</p>
                <p><strong>{teacher_name}</strong> has invited you to join their classroom on PDERAX:</p>
                
                <h2 style="color: #4f46e5; margin-top: 30px;">{classroom_name}</h2>
                
                <p style="margin-top: 20px;">Use this invite code to join:</p>
                
                <div class="invite-code">
                    <div class="code">{invite_code}</div>
                </div>
                
                <p>You can join the classroom by:</p>
                <ol>
                    <li>Visiting <a href="{frontend_url}/classrooms">PDERAX Classrooms</a></li>
                    <li>Clicking "Join Classroom"</li>
                    <li>Entering the invite code above</li>
                </ol>
                
                <p style="text-align: center;">
                    <a href="{frontend_url}/classrooms?code={invite_code}" class="button">
                        Join Classroom Now
                    </a>
                </p>
                
                <div class="footer">
                    <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                    <p>© 2026 PDERAX - AI-Powered Learning Platform</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """
    
    try:
        message = Mail(
            from_email=from_email,
            to_emails=student_email,
            subject=subject,
            html_content=html_content,
        )
        
        sg = SendGridAPIClient(api_key)
        response = sg.send(message)
        
        return response.status_code == 202
    except Exception as e:
        print(f"Failed to send classroom invitation: {e}")
        raise
