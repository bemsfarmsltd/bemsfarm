import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 762, "Bems Farms — Driver Mobile App API Specification & Engineering Guide")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 754, 576, 754)
        
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(576, 25, page_str)
        self.drawString(36, 25, "CONFIDENTIAL — BEMS FARMS DRIVER MOBILE APPLICATION (IOS & ANDROID)")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 35, 576, 35)
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_DRIVER_MOBILE_APP_API_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F766E")   # Teal 700
    SECONDARY = colors.HexColor("#0F172A") # Slate 900
    MUTED = colors.HexColor("#64748B")     # Slate 500
    BORDER_COL = colors.HexColor("#CBD5E1")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=SECONDARY,
        spaceAfter=3
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=MUTED,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=SECONDARY,
        spaceBefore=7,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=11,
        textColor=colors.HexColor("#334155")
    )

    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=11,
        textColor=SECONDARY
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.8,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F8FAFC"),
        borderPadding=4,
        spaceBefore=2,
        spaceAfter=3
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("🚚 Bems Farms — Driver Mobile App API Specification", title_style))
    story.append(Paragraph("Official Engineering Guide for Mobile App Developers (React Native, Flutter, iOS & Android)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=6))

    # Architecture Overview Table
    meta_data = [
        [
            Paragraph("<b>Target Mobile Platforms:</b> React Native / Flutter / iOS / Android", body_style),
            Paragraph("<b>Authentication:</b> JWT Bearer (`Authorization: Bearer &lt;token&gt;`)", body_style)
        ],
        [
            Paragraph("<b>Production API URL:</b> https://api.bemsfarms.com/api/driver", body_style),
            Paragraph("<b>Local Development URL:</b> http://localhost:5000/api/driver", body_style)
        ],
        [
            Paragraph("<b>Payload Standard:</b> application/json", body_style),
            Paragraph("<b>Driver Wallet &amp; DVA:</b> Monnify Virtual NUBAN + Zone-Based Earnings", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6))

    # SECTION 1: MASTER ROUTING DIRECTORY (ALL DRIVER ENDPOINTS)
    story.append(Paragraph("1. Driver API Directory & Endpoint Index", h1_style))
    
    d_rows = [
        [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Method &amp; Endpoint</b>", bold_body_style), Paragraph("<b>Auth</b>", bold_body_style), Paragraph("<b>Description &amp; Mobile Trigger</b>", bold_body_style)],
        [Paragraph("Onboarding", body_style), Paragraph("<code>GET /onboarding/verify?token=...</code>", body_style), Paragraph("Public", body_style), Paragraph("Verify invite token & pre-populate driver signup details", body_style)],
        [Paragraph("Onboarding", body_style), Paragraph("<code>POST /onboarding/submit</code>", body_style), Paragraph("Public", body_style), Paragraph("Submit driver KYC, NIN, vehicle details & settlement bank", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/login</code>", body_style), Paragraph("Public", body_style), Paragraph("Driver email/phone + password authentication & JWT token", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/forgot-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Send password reset token via SMS / Email", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/reset-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Confirm reset token and configure new driver password", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>GET /auth/me</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Retrieve driver profile, rating, stats & Monnify Virtual Account", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>PATCH /auth/profile</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Update driver phone number, profile photo, or bank details", body_style)],
        [Paragraph("Availability", body_style), Paragraph("<code>PATCH /availability</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Toggle duty state: Online (ready for dispatch) vs Offline", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch assigned active deliveries with customer addresses & items", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries/:orderId</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch full itemized breakdown for a specific delivery drop", body_style)],
        [Paragraph("Milestones", body_style), Paragraph("<code>PATCH /deliveries/:orderId/status</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Progress milestone (accepted, en_route, arrived, delivered)", body_style)],
        [Paragraph("History", body_style), Paragraph("<code>GET /deliveries/history</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch paginated past delivery drops and completed trips", body_style)],
        [Paragraph("Telemetry", body_style), Paragraph("<code>POST /location</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Background GPS coordinate stream ping (every 10–15s)", body_style)],
        [Paragraph("Wallet", body_style), Paragraph("<code>GET /earnings</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Live wallet balance, Monnify DVA NUBAN, zone rate card & history", body_style)],
        [Paragraph("Wallet", body_style), Paragraph("<code>POST /withdraw</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Request payout of unwithdrawn earnings to personal bank account", body_style)],
    ]
    t_d = Table(d_rows, colWidths=[65, 185, 45, 245])
    t_d.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_d)
    story.append(Spacer(1, 8))

    # SECTION 2: AUTHENTICATION, ONBOARDING & PROFILE
    story.append(Paragraph("2. Driver Authentication, Onboarding & Profile APIs", h1_style))
    story.append(Paragraph("<b>2.1 Driver Login (`POST /api/driver/auth/login`)</b>", h2_style))
    story.append(Paragraph("Authenticates driver by phone number or email and password. Returns JWT token and driver profile with Dedicated Virtual Account (DVA).", body_style))
    
    login_req = '{\n  "emailOrPhone": "08123456789",\n  "password": "Password123!"\n}'
    login_res = '{\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "message": "Login successful",\n  "driver": {\n    "id": 6,\n    "name": "Victor Kalu",\n    "phone": "08123456789",\n    "email": "victor.kalu@bemsfarms.com",\n    "wallet_account_number": "3397202109",\n    "wallet_bank_name": "Monnify / Wema Bank",\n    "wallet_account_name": "BEM - Victor Kalu",\n    "bank_name": "GTBank",\n    "account_number": "0123456789",\n    "wallet_balance": 16500.00,\n    "is_available": true\n  }\n}'
    
    t_login = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(login_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(login_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[220, 320])
    t_login.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_login)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>2.2 Toggle Availability State (`PATCH /api/driver/availability`)</b>", h2_style))
    avail_req = '{\n  "is_available": true,\n  "latitude": 9.0765,\n  "longitude": 7.3986\n}'
    avail_res = '{\n  "message": "Duty status updated to Online",\n  "is_available": true,\n  "status": "active"\n}'
    t_avail = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(avail_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(avail_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[220, 320])
    t_avail.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_avail)
    story.append(Spacer(1, 8))

    # SECTION 3: DELIVERIES & MILESTONES
    story.append(Paragraph("3. Dispatch Deliveries & Milestone Progression", h1_style))
    story.append(Paragraph("Drivers receive live delivery drops and progress them through 5 status milestones.", body_style))
    
    ms_headers = [Paragraph("<b>Milestone</b>", bold_body_style), Paragraph("<b>Action Description</b>", bold_body_style), Paragraph("<b>Customer Tracking State</b>", bold_body_style), Paragraph("<b>Financial Trigger</b>", bold_body_style)]
    ms_data = [
        ms_headers,
        [Paragraph("<code>accepted</code>", body_style), Paragraph("Driver accepts delivery assignment", body_style), Paragraph("<code>driver_assigned</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>awaiting_pickup</code>", body_style), Paragraph("Driver at hub/store loading goods", body_style), Paragraph("<code>packed_ready</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>en_route</code>", body_style), Paragraph("Driver departed with order package", body_style), Paragraph("<code>out_for_delivery</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>arrived</code>", body_style), Paragraph("Driver arrived at customer destination", body_style), Paragraph("<code>driver_arrived</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>delivered</code>", body_style), Paragraph("Handover complete with photo proof", body_style), Paragraph("<code>delivered</code>", body_style), Paragraph("<b>Auto-Credit Zone Commission</b>", body_style)],
        [Paragraph("<code>failed</code>", body_style), Paragraph("Delivery attempted but customer unavailable", body_style), Paragraph("<code>delivery_attempted</code>", body_style), Paragraph("—", body_style)],
    ]
    t_ms = Table(ms_data, colWidths=[80, 160, 130, 150])
    t_ms.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_ms)
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>3.1 Update Milestone (`PATCH /api/driver/deliveries/:orderId/status`)</b>", h2_style))
    status_sample = '{\n  "status": "delivered",\n  "proof_note": "Handed directly to customer Mrs. Ngozi.",\n  "proof_photo": "https://storage.googleapis.com/bems-uploads/proof_del_998.jpg"\n}'
    status_res = '{\n  "message": "Delivery completed successfully",\n  "delivery_status": "delivered",\n  "order_status": "delivered",\n  "commission_earned": 1750.00,\n  "new_wallet_balance": 18250.00\n}'
    t_status = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(status_sample.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(status_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_status.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_status)
    story.append(Spacer(1, 8))

    # SECTION 4: DRIVER WALLET & EARNINGS SYSTEM
    story.append(Paragraph("4. Driver Wallet, Dedicated Virtual Account (DVA) & Withdrawals", h1_style))
    story.append(Paragraph("<b>4.1 Get Driver Wallet & Earnings (`GET /api/driver/earnings`)</b>", h2_style))
    story.append(Paragraph("Returns live wallet balance, unwithdrawn earnings, pending payout amounts, Monnify Dedicated Virtual Account (DVA), zone rate card, and recent transaction history.", body_style))
    
    earnings_res = """{
  "wallet": {
    "total_earned": 28500.00,
    "total_paid": 12000.00,
    "pending_payouts": 0.00,
    "available_balance": 16500.00,
    "commission_per_delivery": 1750.00,
    "dedicated_virtual_account": {
      "account_number": "8559127267",
      "bank_name": "Monnify / Wema Bank",
      "account_name": "BEMS - VICTOR KALU",
      "is_frozen": false
    },
    "settlement_bank": {
      "bank_name": "GTBank",
      "account_number": "0123456789",
      "account_name": "Victor Kalu"
    }
  },
  "zone_rates": [
    { "zone_id": "ZONE001", "zone_name": "Zone 1 - Maitama & Asokoro", "driver_earning_fee": 700.00, "commission_percent": 70, "estimated_eta": "20 - 35 mins" },
    { "zone_id": "ZONE002", "zone_name": "Zone 2 - Garki, Wuse, Central Area", "driver_earning_fee": 1750.00, "commission_percent": 70, "estimated_eta": "25 - 45 mins" },
    { "zone_id": "ZONE003", "zone_name": "Zone 3 - Utako, Jabi, Mabushi", "driver_earning_fee": 2450.00, "commission_percent": 70, "estimated_eta": "30 - 50 mins" },
    { "zone_id": "ZONE004", "zone_name": "Zone 4 - Gwarinpa, Kubwa", "driver_earning_fee": 3500.00, "commission_percent": 70, "estimated_eta": "40 - 65 mins" },
    { "zone_id": "ZONE005", "zone_name": "Zone 5 - Lugbe, Airport Road", "driver_earning_fee": 5600.00, "commission_percent": 70, "estimated_eta": "45 - 75 mins" },
    { "zone_id": "ZONE006", "zone_name": "Zone 6 - Interstate Express", "driver_earning_fee": 24500.00, "commission_percent": 70, "estimated_eta": "Same Day" }
  ],
  "recent_commissions": [
    { "id": 104, "total_earned": 1750.00, "deliveries": 1, "status": "pending", "created_at": "2026-09-21T09:10:00Z" }
  ],
  "recent_payouts": [
    { "payout_ref": "PAY-MNFY-8819", "amount": 12000.00, "status": "paid", "processed_at": "2026-09-20T14:30:00Z" }
  ]
}"""
    story.append(Paragraph(earnings_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>4.2 Request Withdrawal (`POST /api/driver/withdraw`)</b>", h2_style))
    with_req = '{\n  "amount": 10000.00,\n  "bank_name": "GTBank",\n  "account_number": "0123456789",\n  "account_name": "Victor Kalu",\n  "notes": "Weekly earnings payout"\n}'
    with_res = '{\n  "message": "Withdrawal request of ₦10,000.00 submitted successfully!",\n  "payout_ref": "PAY-MNFY-99201",\n  "available_balance": 6500.00,\n  "status": "pending"\n}'
    t_with = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(with_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(with_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_with.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_with)
    story.append(Spacer(1, 8))

    # SECTION 5: ZONE RATE CARD SPECIFICATION
    story.append(Paragraph("5. Zone-Based Compensation Rate Schedule (Zones 1–6)", h1_style))
    zone_data = [
        [Paragraph("<b>Zone ID</b>", bold_body_style), Paragraph("<b>Zone Coverage Area</b>", bold_body_style), Paragraph("<b>Customer Delivery Fee</b>", bold_body_style), Paragraph("<b>Driver Drop Payout (70%)</b>", bold_body_style), Paragraph("<b>Estimated ETA</b>", bold_body_style)],
        [Paragraph("ZONE001", body_style), Paragraph("Zone 1 - Maitama &amp; Asokoro", body_style), Paragraph("₦1,000.00", body_style), Paragraph("<b>₦700.00</b>", body_style), Paragraph("20 - 35 mins", body_style)],
        [Paragraph("ZONE002", body_style), Paragraph("Zone 2 - Garki, Wuse, Central Area", body_style), Paragraph("₦2,500.00", body_style), Paragraph("<b>₦1,750.00</b>", body_style), Paragraph("25 - 45 mins", body_style)],
        [Paragraph("ZONE003", body_style), Paragraph("Zone 3 - Utako, Jabi, Mabushi", body_style), Paragraph("₦3,500.00", body_style), Paragraph("<b>₦2,450.00</b>", body_style), Paragraph("30 - 50 mins", body_style)],
        [Paragraph("ZONE004", body_style), Paragraph("Zone 4 - Gwarinpa, Kubwa Expressway", body_style), Paragraph("₦5,000.00", body_style), Paragraph("<b>₦3,500.00</b>", body_style), Paragraph("40 - 65 mins", body_style)],
        [Paragraph("ZONE005", body_style), Paragraph("Zone 5 - Lugbe, Airport Road", body_style), Paragraph("₦8,000.00", body_style), Paragraph("<b>₦5,600.00</b>", body_style), Paragraph("45 - 75 mins", body_style)],
        [Paragraph("ZONE006", body_style), Paragraph("Zone 6 - Interstate / Regional Express", body_style), Paragraph("₦35,000.00", body_style), Paragraph("<b>₦24,500.00</b>", body_style), Paragraph("Same Day / Next Day", body_style)],
    ]
    t_zone = Table(zone_data, colWidths=[55, 175, 105, 115, 90])
    t_zone.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_zone)
    story.append(Spacer(1, 8))

    # SECTION 6: MOBILE IMPLEMENTATION CHECKLIST
    story.append(Paragraph("6. Mobile Client Engineering Checklist", h1_style))
    chk_items = [
        "<b>1. Secure Storage:</b> Store the JWT token securely using <code>SecureStore</code> (Expo) / <code>EncryptedSharedPreferences</code> (Android) / <code>Keychain</code> (iOS).",
        "<b>2. Background GPS Streaming:</b> When online (<code>is_available: true</code>), stream background coordinates to <code>POST /api/driver/location</code> every 10–15s.",
        "<b>3. Navigation Deep Linking:</b> Deep-link customer coordinates to Google Maps (<code>geo:${lat},${lng}?q=${lat},${lng}</code>) or Apple Maps (<code>maps://?daddr=${lat},${lng}</code>).",
        "<b>4. Direct Customer Contact:</b> Provide 1-tap dialer (<code>tel:${phone}</code>) and WhatsApp quick chat (<code>https://wa.me/234${phone}</code>).",
        "<b>5. Live Earnings View:</b> Show driver's real-time unwithdrawn earnings and Dedicated Virtual Account (DVA) directly on the app's wallet tab.",
        "<b>6. Offline Caching:</b> Cache active deliveries locally so drivers can view delivery addresses and items even during cellular network dips."
    ]
    for chk in chk_items:
        story.append(Paragraph(f"• {chk}", body_style))
        story.append(Spacer(1, 1.5))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Driver App Only PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_DRIVER_MOBILE_APP_API_SPECIFICATION.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
