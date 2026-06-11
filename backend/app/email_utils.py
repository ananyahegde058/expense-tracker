import os
import json
import urllib.request
import urllib.error
import logging

logger = logging.getLogger(__name__)

APP_NAME = "Smart Expense Tracker"


def _get_config():
    return {
        "api_key": os.getenv("BREVO_API_KEY", ""),
        "from_email": os.getenv("FROM_EMAIL", ""),
        "from_name": os.getenv("APP_NAME", APP_NAME),
        "app_base_url": os.getenv("APP_BASE_URL", "http://localhost:8000"),
    }


def _send_via_brevo_api(to_email: str, subject: str, html_body: str) -> bool:
    """Send email using Brevo HTTP API — works on Render free tier."""
    cfg = _get_config()

    if not cfg["api_key"]:
        logger.warning(
            f"[DEV MODE] Email not sent — BREVO_API_KEY not set.\n"
            f"  To: {to_email}\n  Subject: {subject}"
        )
        return False

    payload = json.dumps({
        "sender": {"name": cfg["from_name"], "email": cfg["from_email"]},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_body
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.brevo.com/v3/smtp/email",
        data=payload,
        headers={
            "accept": "application/json",
            "content-type": "application/json",
            "api-key": cfg["api_key"],
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            logger.info(f"Email sent to {to_email} via Brevo API: {subject}")
            return True
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        logger.error(f"Brevo API error {e.code}: {body}")
        return False
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_verification_email(to_email: str, token: str) -> bool:
    cfg = _get_config()
    verify_url = f"{cfg['app_base_url']}/?verify_token={token}"
    subject = f"Verify your {cfg['from_name']} account"
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
        <h2 style="color:#818cf8;margin-bottom:8px;">Verify your email</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">Thanks for signing up for {cfg['from_name']}. Click the button below to verify your email address.</p>
        <a href="{verify_url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">
            Verify Email
        </a>
        <p style="color:#64748b;font-size:13px;">This link expires in 24 hours.</p>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Or copy: <a href="{verify_url}" style="color:#818cf8;">{verify_url}</a></p>
    </div>
    """
    return _send_via_brevo_api(to_email, subject, html)


def send_password_reset_email(to_email: str, token: str) -> bool:
    cfg = _get_config()
    reset_url = f"{cfg['app_base_url']}/?reset_token={token}"
    subject = f"Reset your {cfg['from_name']} password"
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#0f172a;color:#f1f5f9;border-radius:12px;">
        <h2 style="color:#818cf8;margin-bottom:8px;">Reset your password</h2>
        <p style="color:#94a3b8;margin-bottom:24px;">We received a request to reset your {cfg['from_name']} password.</p>
        <a href="{reset_url}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin-bottom:24px;">
            Reset Password
        </a>
        <p style="color:#64748b;font-size:13px;">This link expires in 1 hour.</p>
        <p style="color:#64748b;font-size:12px;margin-top:16px;">Or copy: <a href="{reset_url}" style="color:#818cf8;">{reset_url}</a></p>
    </div>
    """
    return _send_via_brevo_api(to_email, subject, html)