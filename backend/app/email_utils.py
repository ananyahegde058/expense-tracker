import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

APP_NAME = "Smart Expense Tracker"


def _get_smtp_config():
    """Read SMTP settings fresh from env each call — ensures .env values are picked up."""
    return {
        "host": os.getenv("SMTP_HOST", "smtp.gmail.com"),
        "port": int(os.getenv("SMTP_PORT", "587")),
        "user": os.getenv("SMTP_USER", ""),
        "password": os.getenv("SMTP_PASS", ""),
        "from_email": os.getenv("FROM_EMAIL", os.getenv("SMTP_USER", "")),
        "app_base_url": os.getenv("APP_BASE_URL", "http://localhost:8000"),
        "app_name": os.getenv("APP_NAME", APP_NAME),
    }


def _send_email(to_email: str, subject: str, html_body: str) -> bool:
    """Send an email via SMTP. Returns True on success, False on failure."""
    cfg = _get_smtp_config()

    if not cfg["user"] or not cfg["password"]:
        logger.warning(
            f"[DEV MODE] Email not sent — SMTP_USER / SMTP_PASS not set.\n"
            f"  To: {to_email}\n"
            f"  Subject: {subject}\n"
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{cfg['app_name']} <{cfg['from_email']}>"
        msg["To"] = to_email

        part = MIMEText(html_body, "html")
        msg.attach(part)

        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.ehlo()
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.sendmail(cfg["from_email"], to_email, msg.as_string())

        logger.info(f"Email sent to {to_email}: {subject}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error(
            f"SMTP authentication failed for {cfg['user']}. "
            "Make sure SMTP_USER and SMTP_PASS are correct. "
            "For Gmail, use an App Password from https://myaccount.google.com/apppasswords"
        )
        return False
    except smtplib.SMTPConnectError as e:
        logger.error(f"Could not connect to SMTP server {cfg['host']}:{cfg['port']} — {e}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_verification_email(to_email: str, token: str) -> bool:
    cfg = _get_smtp_config()
    verify_url = f"{cfg['app_base_url']}/?verify_token={token}"
    subject = f"Verify your {cfg['app_name']} account"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f1f5f9; border-radius: 12px;">
        <h2 style="color: #818cf8; margin-bottom: 8px;">Verify your email</h2>
        <p style="color: #94a3b8; margin-bottom: 24px;">Thanks for signing up for {cfg['app_name']}. Click the button below to verify your email address.</p>
        <a href="{verify_url}"
           style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
            Verify Email
        </a>
        <p style="color: #64748b; font-size: 13px;">This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 16px;">Or copy this link: <a href="{verify_url}" style="color: #818cf8;">{verify_url}</a></p>
    </div>
    """
    return _send_email(to_email, subject, html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    cfg = _get_smtp_config()
    reset_url = f"{cfg['app_base_url']}/?reset_token={token}"
    subject = f"Reset your {cfg['app_name']} password"
    html = f"""
    <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #0f172a; color: #f1f5f9; border-radius: 12px;">
        <h2 style="color: #818cf8; margin-bottom: 8px;">Reset your password</h2>
        <p style="color: #94a3b8; margin-bottom: 24px;">We received a request to reset the password for your {cfg['app_name']} account. Click the button below to set a new password.</p>
        <a href="{reset_url}"
           style="display: inline-block; background: #6366f1; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-bottom: 24px;">
            Reset Password
        </a>
        <p style="color: #64748b; font-size: 13px;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        <p style="color: #64748b; font-size: 12px; margin-top: 16px;">Or copy this link: <a href="{reset_url}" style="color: #818cf8;">{reset_url}</a></p>
    </div>
    """
    return _send_email(to_email, subject, html)
