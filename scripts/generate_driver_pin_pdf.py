import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#143C2D"))
        
        # Header (pages after page 1)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 26, "BEMS FARMS LOGISTICS PLATFORM")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(8.5 * inch - 36, 11 * inch - 26, "Driver 4-Digit PIN & Payout API Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

        # Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 34, 8.5 * inch - 36, 34)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 22, "Confidential — Bems Farms Dispatch, Mobile App & Engineering Team")
        self.drawRightString(8.5 * inch - 36, 22, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()


def build_pdf(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=40,
        bottomMargin=44,
    )

    styles = getSampleStyleSheet()

    # Custom palette
    PRIMARY = colors.HexColor("#143C2D")       # Deep Bems Forest Green
    ACCENT = colors.HexColor("#16A34A")        # Emerald Green
    DARK = colors.HexColor("#0F172A")          # Slate 900
    MUTED = colors.HexColor("#475569")         # Slate 600
    BORDER = colors.HexColor("#E2E8F0")        # Slate 200
    BG_LIGHT = colors.HexColor("#F8FAFC")      # Slate 50
    CARD_BG = colors.HexColor("#F0FDF4")       # Light Emerald
    CODE_BG = colors.HexColor("#0F172A")       # Dark Editor BG
    POST_BADGE = colors.HexColor("#15803D")    # Green badge
    GET_BADGE = colors.HexColor("#1D4ED8")     # Blue badge
    WARN_BG = colors.HexColor("#FEF3C7")       # Amber light
    WARN_BORDER = colors.HexColor("#F59E0B")   # Amber border

    title_style = ParagraphStyle(
        "DocTitle",
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=MUTED,
    )
    h1_style = ParagraphStyle(
        "Heading1_Custom",
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6,
    )
    h2_style = ParagraphStyle(
        "Heading2_Custom",
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=14,
        textColor=DARK,
        spaceBefore=8,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "Body_Custom",
        fontName="Helvetica",
        fontSize=8.5,
        leading=12.5,
        textColor=DARK,
    )
    body_bold = ParagraphStyle(
        "BodyBold_Custom",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=12.5,
        textColor=DARK,
    )
    callout_style = ParagraphStyle(
        "Callout_Custom",
        fontName="Helvetica",
        fontSize=8,
        leading=11.5,
        textColor=DARK,
    )
    code_style = ParagraphStyle(
        "Code_Custom",
        fontName="Courier",
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#E2E8F0"),
    )
    table_header = ParagraphStyle(
        "TableHeader",
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
    )
    table_cell = ParagraphStyle(
        "TableCell",
        fontName="Helvetica",
        fontSize=7.5,
        leading=10,
        textColor=DARK,
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=10,
        textColor=DARK,
    )

    story = []

    # ── HEADER BANNER ──────────────────────────────────────────────
    banner_data = [
        [
            Paragraph("<b>BEMS FARMS LOGISTICS & DISPATCH PLATFORM</b><br/><font size='7' color='#CBD5E1'>OFFICIAL DRIVER APPLICATION TECHNICAL INTEGRATION MANUAL</font>", ParagraphStyle("BannerTitle", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=colors.white)),
            Paragraph("<font size='7.5' color='#CBD5E1'>DOCUMENT VERSION:</font> <b>2.0 (4-Digit PIN)</b><br/><font size='7.5' color='#CBD5E1'>EFFECTIVE DATE:</font> <b>OCTOBER 2026</b>", ParagraphStyle("BannerMeta", fontName="Helvetica", fontSize=8, leading=11, textColor=colors.white, alignment=2))
        ]
    ]
    banner_table = Table(banner_data, colWidths=[380, 160])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), PRIMARY),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 10))

    # Title
    story.append(Paragraph("Driver Payout PIN & Security Lock Integration Specification", title_style))
    story.append(Spacer(1, 3))
    story.append(Paragraph("Developer guide for mobile frontend & driver application engineers implementing 4-digit PIN authentication, cashouts, lockout handling, and email OTP recovery.", subtitle_style))
    story.append(Spacer(1, 10))

    # ── OVERVIEW & RULES CARD ───────────────────────────────────────
    rules_data = [
        [
            Paragraph("<b>Core Security Rules & Format Specifications</b>", ParagraphStyle("RuleH", fontName="Helvetica-Bold", fontSize=9, textColor=PRIMARY)),
        ],
        [
            Paragraph(
                "• <b>PIN Format:</b> Exactly <b>4 numeric digits</b> (e.g. <code>1234</code>, regex: <code>^\\d{4}$</code>).<br/>"
                "• <b>Authorization Header:</b> All requests require driver JWT: <code>Authorization: Bearer &lt;driver_token&gt;</code>.<br/>"
                "• <b>Anti-Fraud Lockout:</b> 5 consecutive incorrect PIN attempts locks the PIN for <b>15 minutes</b> and freezes payout access.<br/>"
                "• <b>Unlock Mechanism:</b> Locked payouts require an Email OTP + driver account password via <code>/api/driver/pin/verify-unlock</code>.",
                callout_style
            )
        ]
    ]
    rules_table = Table(rules_data, colWidths=[540])
    rules_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CARD_BG),
        ('BOX', (0,0), (-1,-1), 1, ACCENT),
        ('PADDING', (0,0), (-1,-1), 8),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    story.append(rules_table)
    story.append(Spacer(1, 12))

    # Helper function to create endpoint cards
    def create_endpoint_card(method, path, desc, req_body_str=None, resp_body_str=None, notes=None):
        content = []
        
        badge_bg = POST_BADGE if method == "POST" else (GET_BADGE if method == "GET" else ACCENT)
        badge_html = f"<font color='white'><b>&nbsp;{method}&nbsp;</b></font>"
        
        header_text = f"<b>{method}</b> &nbsp; <code>{path}</code>"
        header_p = Paragraph(header_text, ParagraphStyle("EPHeader", fontName="Helvetica-Bold", fontSize=9.5, leading=13, textColor=PRIMARY))
        desc_p = Paragraph(desc, body_style)
        
        ep_rows = [
            [header_p],
            [desc_p]
        ]
        
        if notes:
            notes_p = Paragraph(f"<b>Note:</b> {notes}", callout_style)
            ep_rows.append([notes_p])
            
        if req_body_str:
            req_label = Paragraph("<b>Request Body (application/json):</b>", body_bold)
            req_code = Paragraph(req_body_str.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style)
            code_t = Table([[req_code]], colWidths=[520])
            code_t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#334155")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            ep_rows.extend([[req_label], [code_t]])

        if resp_body_str:
            resp_label = Paragraph("<b>Response Sample:</b>", body_bold)
            resp_code = Paragraph(resp_body_str.replace(" ", "&nbsp;").replace("\n", "<br/>"), code_style)
            code_resp_t = Table([[resp_code]], colWidths=[520])
            code_resp_t.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), CODE_BG),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#334155")),
                ('PADDING', (0,0), (-1,-1), 6),
            ]))
            ep_rows.extend([[resp_label], [code_resp_t]])

        t = Table(ep_rows, colWidths=[540])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BG_LIGHT),
            ('BOX', (0,0), (-1,-1), 1, BORDER),
            ('LINELEFT', (0,0), (0,0), 3, badge_bg),
            ('PADDING', (0,0), (-1,-1), 5),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        return t

    # ── SECTION 1: CHECK PIN STATUS ────────────────────────────────
    story.append(Paragraph("1. Check PIN & Lockout Status", h1_style))
    story.append(Paragraph("Call on app launch, wallet screen view, or withdrawal click to determine UI state.", body_style))
    story.append(Spacer(1, 4))
    
    status_resp = """{
  "success": true,
  "has_pin": true,
  "is_locked": false,
  "payout_locked": false,
  "remaining_lock_minutes": 0,
  "locked_until": null,
  "pin_updated_at": "2026-10-13T12:00:00.000Z"
}"""
    story.append(create_endpoint_card(
        "GET",
        "/api/driver/pin/status",
        "Checks whether driver has created a 4-digit PIN and returns active lockout timer.",
        resp_body_str=status_resp,
        notes="If <code>has_pin: false</code>, show 'Create 4-Digit PIN' modal. If <code>is_locked: true</code>, disable cashout and show remaining lock minutes."
    ))
    story.append(Spacer(1, 10))

    # ── SECTION 2: SETUP & CHANGE PIN ──────────────────────────────
    story.append(Paragraph("2. Setup / Change 4-Digit PIN", h1_style))
    story.append(Paragraph("Used for first-time PIN onboarding or updating an existing PIN.", body_style))
    story.append(Spacer(1, 4))

    setup_req = """// First-Time Setup:
{
  "pin": "1234",
  "confirm_pin": "1234"
}

// Change Existing PIN (requires current_pin):
{
  "current_pin": "1234",
  "new_pin": "5678",
  "confirm_pin": "5678"
}"""
    setup_resp = """{
  "success": true,
  "message": "PIN set up successfully",
  "has_pin": true
}"""
    story.append(create_endpoint_card(
        "POST",
        "/api/driver/pin/setup",
        "Creates or updates the 4-digit PIN. Also aliased at: <code>/api/driver/pin/create</code>, <code>/api/driver/pin/change</code>.",
        req_body_str=setup_req,
        resp_body_str=setup_resp,
        notes="Validation requires exactly 4 numeric digits. Mismatched confirmation returns 400 Bad Request."
    ))
    story.append(Spacer(1, 10))

    # ── SECTION 3: VERIFY PIN ───────────────────────────────────────
    story.append(Paragraph("3. Verify PIN (App Unlock / Pre-Cashout)", h1_style))
    story.append(Paragraph("Verifies driver's 4-digit PIN and issues a short-lived session token (15 mins).", body_style))
    story.append(Spacer(1, 4))

    verify_req = """{
  "pin": "1234",
  "action": "cashout" // Optional: "cashout" | "unlock"
}"""
    verify_resp = """// Success (200 OK):
{
  "success": true,
  "valid": true,
  "message": "PIN verified successfully",
  "pin_token": "eyJhbGciOi..."
}

// Failed Attempt (401 Unauthorized):
{
  "success": false,
  "valid": false,
  "remaining_attempts": 3,
  "message": "Incorrect PIN. 3 attempt(s) remaining."
}"""
    story.append(create_endpoint_card(
        "POST",
        "/api/driver/pin/verify",
        "Validates PIN. Increments failed attempts counter. On 5th failure, triggers lockout. Aliased at: <code>/api/driver/pin/validate</code>.",
        req_body_str=verify_req,
        resp_body_str=verify_resp
    ))
    story.append(Spacer(1, 10))

    # Page Break for clean 2-page document
    story.append(PageBreak())

    # ── SECTION 4: WITHDRAWAL / CASHOUT ────────────────────────────
    story.append(Paragraph("4. Cashout / Bank Withdrawal", h1_style))
    story.append(Paragraph("Direct payout request from wallet to registered or selected bank account.", body_style))
    story.append(Spacer(1, 4))

    withdraw_req = """{
  "amount": 5000,
  "bank_name": "Guaranty Trust Bank",
  "account_number": "0123456789",
  "account_name": "Sunday Nwosu",
  "pin": "1234" // Or pass "pin_token" received from /api/driver/pin/verify
}"""
    withdraw_resp = """// Success (200 OK):
{
  "success": true,
  "message": "Withdrawal request submitted successfully",
  "payout": {
    "reference": "WD-17682910-482",
    "amount": 5000,
    "status": "pending",
    "bank_name": "Guaranty Trust Bank",
    "account_number": "0123456789"
  }
}

// Lockout Error (423 Locked / 403 Forbidden):
{
  "payout_locked": true,
  "requires_verification": true,
  "message": "Security PIN is locked due to too many failed attempts. Try again in 15 minute(s).",
  "unlock_endpoint": "/api/driver/security/verify-unlock",
  "otp_endpoint": "/api/driver/security/send-unlock-otp"
}"""
    story.append(create_endpoint_card(
        "POST",
        "/api/driver/withdraw",
        "Submits a wallet withdrawal. Verifies 4-digit PIN or pin_token before deducting commission balance.",
        req_body_str=withdraw_req,
        resp_body_str=withdraw_resp,
        notes="If payout is locked due to failed PIN attempts, requests are blocked with status 423 or 403."
    ))
    story.append(Spacer(1, 12))

    # ── SECTION 5: ACCOUNT LOCK & OTP RECOVERY ──────────────────────
    story.append(Paragraph("5. Security Lockout & Email OTP Recovery", h1_style))
    story.append(Paragraph("Anti-fraud workflow triggered after 5 failed PIN attempts, or accessible when driver forgets PIN.", body_style))
    story.append(Spacer(1, 4))

    # Step 1: Send OTP
    otp_resp = """{
  "success": true,
  "message": "Security verification OTP sent to driver@example.com. Valid for 15 minutes.",
  "expires_in_minutes": 15
}"""
    story.append(create_endpoint_card(
        "POST",
        "/api/driver/pin/send-unlock-otp",
        "Step 1: Generates a secure 6-digit OTP and sends branded email to driver's registered email address. Aliased at: <code>/api/driver/security/send-unlock-otp</code>.",
        req_body_str="{}",
        resp_body_str=otp_resp
    ))
    story.append(Spacer(1, 8))

    # Step 2: Verify OTP and Unlock
    unlock_req = """{
  "password": "driver_account_password",
  "otp_code": "481920",
  "new_pin": "1234",
  "confirm_pin": "1234"
}"""
    unlock_resp = """{
  "success": true,
  "message": "Security lock removed and new PIN set successfully. Payout access has been restored."
}"""
    story.append(create_endpoint_card(
        "POST",
        "/api/driver/pin/verify-unlock",
        "Step 2: Authenticates account password + email OTP, unlocks payout access, unfreezes wallet, and sets new 4-digit PIN. Aliased at: <code>/api/driver/security/verify-unlock</code>.",
        req_body_str=unlock_req,
        resp_body_str=unlock_resp
    ))
    story.append(Spacer(1, 12))

    # ── SUMMARY TABLE ──────────────────────────────────────────────
    story.append(Paragraph("6. Quick Reference Table", h1_style))
    story.append(Spacer(1, 4))

    table_data = [
        [
            Paragraph("Endpoint", table_header),
            Paragraph("Method", table_header),
            Paragraph("Description", table_header),
            Paragraph("Key Body / Params", table_header),
        ],
        [
            Paragraph("<code>/api/driver/pin/status</code>", table_cell),
            Paragraph("<b>GET</b>", table_cell_bold),
            Paragraph("Check PIN presence & lock timer", table_cell),
            Paragraph("None", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/pin/setup</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Set or update 4-digit PIN", table_cell),
            Paragraph("<code>pin, confirm_pin, [current_pin]</code>", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/pin/verify</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Verify PIN & get session token", table_cell),
            Paragraph("<code>pin, [action]</code>", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/withdraw</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Cashout wallet funds with PIN", table_cell),
            Paragraph("<code>amount, bank details, pin</code>", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/pin/reset</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Reset PIN with account password", table_cell),
            Paragraph("<code>password, new_pin, confirm_pin</code>", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/pin/send-unlock-otp</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Send 6-digit OTP to driver email", table_cell),
            Paragraph("None (Auth header)", table_cell),
        ],
        [
            Paragraph("<code>/api/driver/pin/verify-unlock</code>", table_cell),
            Paragraph("<b>POST</b>", table_cell_bold),
            Paragraph("Verify OTP + password, unfreeze & set PIN", table_cell),
            Paragraph("<code>password, otp_code, new_pin</code>", table_cell),
        ],
    ]

    ref_table = Table(table_data, colWidths=[150, 45, 175, 170])
    ref_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BG_LIGHT]),
        ('PADDING', (0,0), (-1,-1), 4),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(ref_table)

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {output_path}")

if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else "/Volumes/HENOVATE/Bems Farms project/Documentation/API_Specifications/BEMS_FARMS_DRIVER_PIN_AND_PAYOUT_API_SPECIFICATION.pdf"
    build_pdf(out)
