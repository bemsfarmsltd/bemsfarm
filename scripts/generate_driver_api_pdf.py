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
            self.drawString(40, 760, "Bems Farms — Driver Mobile Application & Dispatch API Specification")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(40, 752, 572, 752)
        
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 28, page_str)
        self.drawString(40, 28, "CONFIDENTIAL & PROPRIETARY — BEMS FARMS LOGISTICS & FINTECH PLATFORM")
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(40, 38, 572, 38)
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_DRIVER_MOBILE_APP_API_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=45,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F766E")   # Teal 700
    SECONDARY = colors.HexColor("#0F172A") # Slate 900
    ACCENT = colors.HexColor("#2563EB")    # Blue 600
    MUTED = colors.HexColor("#64748B")     # Slate 500
    LIGHT_BG = colors.HexColor("#F8FAFC")  # Slate 50
    CARD_BG = colors.HexColor("#FFFFFF")
    BORDER_COL = colors.HexColor("#CBD5E1")
    SUCCESS = colors.HexColor("#166534")

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=SECONDARY,
        spaceAfter=4
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=MUTED,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=SECONDARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155")
    )

    bold_body_style = ParagraphStyle(
        'BoldBody',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=12,
        textColor=SECONDARY
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.5,
        leading=10,
        textColor=colors.HexColor("#0F172A"),
        backColor=colors.HexColor("#F1F5F9"),
        borderPadding=6,
        spaceBefore=3,
        spaceAfter=5
    )

    badge_style = ParagraphStyle(
        'Badge',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9,
        textColor=colors.white
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("🚚 Bems Farms — Driver Mobile App API Specification", title_style))
    story.append(Paragraph("Official Engineering Guide & REST API Reference for React Native / Flutter / iOS & Android Mobile Developers", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=10))

    # Architecture Overview Table
    meta_data = [
        [
            Paragraph("<b>Target Platforms:</b> React Native / Flutter / iOS / Android", body_style),
            Paragraph("<b>Authentication:</b> JWT Bearer (`Authorization: Bearer &lt;token&gt;`)", body_style)
        ],
        [
            Paragraph("<b>Production Base URL:</b> https://api.bemsfarms.com/api/driver", body_style),
            Paragraph("<b>Staging/Dev URL:</b> http://localhost:5000/api/driver", body_style)
        ],
        [
            Paragraph("<b>Payload Standard:</b> application/json", body_style),
            Paragraph("<b>Live Monnify Inflows:</b> Dedicated Virtual Accounts (DVA) Connected", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[260, 260])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Section 1: Endpoints Master Matrix
    story.append(Paragraph("1. API Directory & Routing Catalog", h1_style))
    
    cat_headers = [
        Paragraph("<b>Category</b>", bold_body_style),
        Paragraph("<b>Method &amp; Endpoint</b>", bold_body_style),
        Paragraph("<b>Auth</b>", bold_body_style),
        Paragraph("<b>Description</b>", bold_body_style)
    ]
    cat_rows = [
        cat_headers,
        [Paragraph("Onboarding", body_style), Paragraph("<code>GET /onboarding/verify?token=...</code>", body_style), Paragraph("Public", body_style), Paragraph("Verify invite token & driver pre-fill data", body_style)],
        [Paragraph("Onboarding", body_style), Paragraph("<code>POST /onboarding/submit</code>", body_style), Paragraph("Public", body_style), Paragraph("Submit driver KYC, NIN, vehicle & bank info", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/login</code>", body_style), Paragraph("Public", body_style), Paragraph("Driver authentication & JWT token generation", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/forgot-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Request SMS/Email OTP for password reset", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/reset-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Confirm OTP code and set new password", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>GET /auth/me</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Retrieve driver profile, rating & Monnify DVA", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>PATCH /auth/profile</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Update phone, email, photo, or settlement bank", body_style)],
        [Paragraph("Duty", body_style), Paragraph("<code>PATCH /availability</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Toggle duty status (Online / Offline)", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch assigned active deliveries & GPS targets", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries/:orderId</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Get detailed itemized order breakdown", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>PATCH /deliveries/:orderId/status</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Update milestone (picked_up, en_route, delivered)", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries/history</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Paginated past delivery trips & metrics", body_style)],
        [Paragraph("Telemetry", body_style), Paragraph("<code>POST /location</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Background GPS coordinate stream ping", body_style)],
        [Paragraph("Fintech", body_style), Paragraph("<code>GET /earnings</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Driver wallet balance, zone pay & history", body_style)],
        [Paragraph("Fintech", body_style), Paragraph("<code>POST /withdraw</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Request payout disbursement to personal bank", body_style)],
    ]
    t_cat = Table(cat_rows, colWidths=[70, 185, 45, 220])
    t_cat.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_cat)
    story.append(Spacer(1, 12))

    # Section 2: Authentication & Profile Deep Dive
    story.append(Paragraph("2. Authentication & Dedicated Virtual Accounts (Monnify)", h1_style))
    story.append(Paragraph("<b>2.1 Driver Login (`POST /api/driver/auth/login`)</b>", h2_style))
    story.append(Paragraph("Authenticates driver by phone/email and password. Returns JWT token and driver profile with auto-provisioned Monnify Dedicated Virtual Account (DVA).", body_style))
    
    login_req = '{\n  "emailOrPhone": "08123456789",\n  "password": "Password123!"\n}'
    login_res = '{\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "message": "Login successful",\n  "driver": {\n    "id": 6,\n    "name": "Victor Kalu",\n    "phone": "08123456789",\n    "email": "victor.kalu@bemsfarms.com",\n    "wallet_account_number": "3397202109",\n    "wallet_bank_name": "Wema Bank",\n    "wallet_account_name": "BEM - Victor Kalu",\n    "bank_name": "GTBank",\n    "account_number": "0123456789",\n    "is_available": true\n  }\n}'
    
    t_login = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(login_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(login_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[200, 320])
    t_login.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_login)
    story.append(Spacer(1, 10))

    # Section 3: Delivery Milestones
    story.append(Paragraph("3. Delivery Dispatch & Milestone Lifecycle", h1_style))
    story.append(Paragraph("Drivers update delivery milestones as they progress from farm pickup to customer handover.", body_style))
    
    ms_headers = [Paragraph("<b>Milestone</b>", bold_body_style), Paragraph("<b>Action Description</b>", bold_body_style), Paragraph("<b>Customer Tracking State</b>", bold_body_style), Paragraph("<b>Financial Trigger</b>", bold_body_style)]
    ms_data = [
        ms_headers,
        [Paragraph("<code>accepted</code>", body_style), Paragraph("Driver accepts delivery assignment", body_style), Paragraph("<code>driver_assigned</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>awaiting_pickup</code>", body_style), Paragraph("Driver at store/hub loading goods", body_style), Paragraph("<code>packed_ready</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>en_route</code>", body_style), Paragraph("Driver departed with order package", body_style), Paragraph("<code>out_for_delivery</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>arrived</code>", body_style), Paragraph("Driver arrived at customer destination", body_style), Paragraph("<code>driver_arrived</code>", body_style), Paragraph("—", body_style)],
        [Paragraph("<code>delivered</code>", body_style), Paragraph("Handover complete with photo proof", body_style), Paragraph("<code>delivered</code>", body_style), Paragraph("<b>Auto-Credit Zone Commission</b>", body_style)],
        [Paragraph("<code>failed</code>", body_style), Paragraph("Delivery failed after 3 gate calls", body_style), Paragraph("<code>delivery_attempted</code>", body_style), Paragraph("—", body_style)],
    ]
    t_ms = Table(ms_data, colWidths=[80, 160, 130, 150])
    t_ms.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_ms)
    story.append(Spacer(1, 8))

    story.append(Paragraph("<b>Delivery Status Update Payload (`PATCH /api/driver/deliveries/:orderId/status`)</b>", h2_style))
    status_sample = '{\n  "status": "delivered",\n  "proof_note": "Package received directly by customer Mrs. Ngozi.",\n  "proof_photo": "https://storage.googleapis.com/.../proof_delivered.jpg"\n}'
    story.append(Paragraph(status_sample.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 10))

    # Section 4: Zone-Based Earnings & Withdrawal
    story.append(Paragraph("4. Zone-Based Earnings & Payout Disbursements", h1_style))
    story.append(Paragraph("Driver earnings are calibrated per coverage zone. When a delivery in a zone is completed, the driver is automatically credited with their zone compensation rate.", body_style))
    
    zone_data = [
        [Paragraph("<b>Zone ID</b>", bold_body_style), Paragraph("<b>Zone Coverage Area</b>", bold_body_style), Paragraph("<b>Customer Delivery Fee</b>", bold_body_style), Paragraph("<b>Driver Drop Payout (70%)</b>", bold_body_style)],
        [Paragraph("ZONE001", body_style), Paragraph("Zone 1 - Maitama &amp; Asokoro", body_style), Paragraph("₦1,000.00", body_style), Paragraph("<b>₦700.00</b>", body_style)],
        [Paragraph("ZONE002", body_style), Paragraph("Zone 2 - Garki, Wuse, Central Area", body_style), Paragraph("₦2,500.00", body_style), Paragraph("<b>₦1,750.00</b>", body_style)],
        [Paragraph("ZONE003", body_style), Paragraph("Zone 3 - Utako, Jabi, Mabushi", body_style), Paragraph("₦3,500.00", body_style), Paragraph("<b>₦2,450.00</b>", body_style)],
        [Paragraph("ZONE004", body_style), Paragraph("Zone 4 - Gwarinpa, Kubwa Expressway", body_style), Paragraph("₦5,000.00", body_style), Paragraph("<b>₦3,500.00</b>", body_style)],
        [Paragraph("ZONE005", body_style), Paragraph("Zone 5 - Lugbe, Airport Road", body_style), Paragraph("₦8,000.00", body_style), Paragraph("<b>₦5,600.00</b>", body_style)],
        [Paragraph("ZONE006", body_style), Paragraph("Zone 6 - Interstate / Regional Express", body_style), Paragraph("₦35,000.00", body_style), Paragraph("<b>₦24,500.00</b>", body_style)],
    ]
    t_zone = Table(zone_data, colWidths=[65, 195, 120, 140])
    t_zone.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_zone)
    story.append(Spacer(1, 10))

    # Section 5: Mobile Developer Checklist
    story.append(Paragraph("5. Mobile Client Implementation Checklist", h1_style))
    chk_items = [
        "<b>1. Secure Storage:</b> Store the JWT token using <code>SecureStore</code> (Expo) / <code>EncryptedSharedPreferences</code> (Android) / <code>Keychain</code> (iOS).",
        "<b>2. Background GPS Streaming:</b> Implement background location listeners to ping <code>POST /api/driver/location</code> every 10–15s while active.",
        "<b>3. Turn-by-Turn Navigation Deep Linking:</b> Deep-link customer coordinates to Google Maps (<code>geo:${lat},${lng}?q=${lat},${lng}</code>) or Apple Maps (<code>maps://?daddr=${lat},${lng}</code>).",
        "<b>4. Direct Customer Contact:</b> Provide 1-tap call (<code>tel:${phone}</code>) and WhatsApp quick chat (<code>https://wa.me/234${phone}</code>).",
        "<b>5. Offline Resilience:</b> Cache active delivery details locally so drivers can view delivery addresses even during cellular connectivity drops."
    ]
    for chk in chk_items:
        story.append(Paragraph(f"• {chk}", body_style))
        story.append(Spacer(1, 2))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_DRIVER_MOBILE_APP_API_SPECIFICATION.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
