import html
import json

import requests

from .config import get_settings


BREVO_TRANSACTIONAL_EMAIL_URL = "https://api.brevo.com/v3/smtp/email"

PRIORITY_LABELS = {
    "normal": "Normal",
    "student_urgent": "Student",
    "travel_emergency": "Travel",
    "hospital_emergency": "Hospital",
    "vip": "VIP",
}


def send_order_confirmation_email(order, customer, restaurant=None) -> bool:
    settings = get_settings()
    if not settings.BREVO_API_KEY or not getattr(customer, "email", None):
        return False

    items = _parse_json(order.items, [])
    address = _parse_json(order.delivery_address, {})
    restaurant_name = getattr(restaurant, "name", None) or f"Restaurant #{order.restaurant_id}"
    customer_name = getattr(customer, "full_name", None) or "there"
    first_name = customer_name.strip().split(" ")[0] if customer_name.strip() else "there"
    priority_label = PRIORITY_LABELS.get(str(order.order_type or "normal").lower(), "Normal")

    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL,
        },
        "to": [{"email": customer.email, "name": customer_name}],
        "subject": f"PulseKitchen order #{order.id} confirmation",
        "htmlContent": _build_order_email_html(
            first_name=first_name,
            order=order,
            restaurant_name=restaurant_name,
            items=items,
            address=address,
            priority_label=priority_label,
        ),
    }

    response = requests.post(
        BREVO_TRANSACTIONAL_EMAIL_URL,
        headers={
            "accept": "application/json",
            "api-key": settings.BREVO_API_KEY,
            "content-type": "application/json",
        },
        json=payload,
        timeout=15,
    )
    response.raise_for_status()
    return True


def _parse_json(value, fallback):
    try:
        return json.loads(value) if isinstance(value, str) else value
    except (TypeError, json.JSONDecodeError):
        return fallback


def _build_order_email_html(*, first_name, order, restaurant_name, items, address, priority_label):
    item_rows = "".join(
        f"""
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
            {html.escape(str(item.get("name", "Menu item")))}
            <span style="color: #777;">x{html.escape(str(item.get("quantity", 1)))}</span>
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
            Rs. {_item_total(item):.2f}
          </td>
        </tr>
        """
        for item in items
    )
    if not item_rows:
        item_rows = """
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee;">Order items</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">Included</td>
        </tr>
        """

    address_text = _format_address(address)
    placed_at = order.placed_at.strftime("%d %b %Y, %I:%M %p") if order.placed_at else "Just now"

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #222; line-height: 1.5;">
        <div style="max-width: 620px; margin: 0 auto; padding: 24px;">
          <h2 style="margin-bottom: 8px;">Thanks, {html.escape(first_name)}.</h2>
          <p style="margin-top: 0;">Your PulseKitchen order has been placed.</p>

          <div style="background: #f7f7f7; border-radius: 10px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order ID:</strong> #{order.id}</p>
            <p style="margin: 8px 0 0;"><strong>Restaurant:</strong> {html.escape(restaurant_name)}</p>
            <p style="margin: 8px 0 0;"><strong>Priority:</strong> {html.escape(priority_label)}</p>
            <p style="margin: 8px 0 0;"><strong>Placed at:</strong> {html.escape(placed_at)}</p>
          </div>

          <h3>Order Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            {item_rows}
            <tr>
              <td style="padding: 14px 0; font-weight: 700;">Total</td>
              <td style="padding: 14px 0; text-align: right; font-weight: 700;">Rs. {float(order.total_amount):.2f}</td>
            </tr>
          </table>

          <h3>Delivery Address</h3>
          <p>{html.escape(address_text)}</p>
        </div>
      </body>
    </html>
    """


def _item_total(item):
    quantity = int(item.get("quantity") or 1)
    price = float(item.get("price") or 0)
    return quantity * price


def _format_address(address):
    if not isinstance(address, dict):
        return "Address unavailable"
    parts = [
        address.get("street_address_1") or address.get("line1") or address.get("address"),
        address.get("street_address_2"),
        address.get("city"),
        address.get("region_state") or address.get("region"),
        address.get("postal_code"),
    ]
    return ", ".join(str(part) for part in parts if part) or "Address unavailable"
