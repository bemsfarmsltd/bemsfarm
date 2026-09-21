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
            self.drawString(40, 762, "Bems Farms — Driver Mobile App & Enterprise Wallet Platform API Specification")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 754, 572, 754)
        
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 25, page_str)
        self.drawString(40, 25, "CONFIDENTIAL — BEMS FARMS LOGISTICS, DRIVER DVA & DOUBLE-ENTRY WALLET SPECIFICATION")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 35, 572, 35)
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_DRIVER_AND_WALLET_API_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=42,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()
    
    PRIMARY = colors.HexColor("#0F766E")   # Teal 700
    SECONDARY = colors.HexColor("#0F172A") # Slate 900
    ACCENT = colors.HexColor("#2563EB")    # Blue 600
    MUTED = colors.HexColor("#64748B")     # Slate 500
    BORDER_COL = colors.HexColor("#CBD5E1")
    SUCCESS = colors.HexColor("#166534")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=17,
        leading=21,
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
        spaceAfter=3,
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
    story.append(Paragraph("🚚 Bems Farms — Driver App & Enterprise Wallet API Specification", title_style))
    story.append(Paragraph("Complete Technical Reference: Driver Dispatch, Dedicated Virtual Accounts (DVA), Zone Earnings, Wallet Ledger & Double-Entry Accounting", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=6))

    # Architecture Overview Table
    meta_data = [
        [
            Paragraph("<b>Target Platforms:</b> React Native / Flutter / iOS / Android / Web Admin", body_style),
            Paragraph("<b>Driver Auth:</b> JWT Bearer (`Authorization: Bearer &lt;token&gt;`)", body_style)
        ],
        [
            Paragraph("<b>Driver API Base URL:</b> https://api.bemsfarms.com/api/driver", body_style),
            Paragraph("<b>Admin Wallet Base URL:</b> https://api.bemsfarms.com/api/admin/wallets", body_style)
        ],
        [
            Paragraph("<b>Payment Gateway:</b> Monnify (DVA Inflows, Batch Payouts & Webhooks)", body_style),
            Paragraph("<b>Accounting Standard:</b> GAAP/IFRS Double-Entry General Journal", body_style)
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

    # SECTION 1: DRIVER MOBILE APP API CATALOG
    story.append(Paragraph("1. Driver Mobile Application Endpoints Catalog", h1_style))
    
    d_rows = [
        [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Method &amp; Endpoint</b>", bold_body_style), Paragraph("<b>Auth</b>", bold_body_style), Paragraph("<b>Description</b>", bold_body_style)],
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
        [Paragraph("Wallet", body_style), Paragraph("<code>GET /earnings</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Driver wallet balance, zone pay & history", body_style)],
        [Paragraph("Wallet", body_style), Paragraph("<code>POST /withdraw</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Request payout disbursement to personal bank", body_style)],
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

    # SECTION 2: DRIVER WALLET & EARNINGS SPECIFICATION
    story.append(Paragraph("2. Driver Wallet, Dedicated Virtual Account (DVA) & Withdrawals", h1_style))
    story.append(Paragraph("<b>2.1 Get Driver Wallet & Earnings (`GET /api/driver/earnings`)</b>", h2_style))
    story.append(Paragraph("Returns live wallet balance, unwithdrawn earnings, pending payout amounts, Monnify Reserved Virtual Account (DVA) details, zone rates, and transaction ledger.", body_style))
    
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
    { "zone_id": "ZONE001", "zone_name": "Maitama & Asokoro", "driver_earning_fee": 700.00, "commission_percent": 70 },
    { "zone_id": "ZONE002", "zone_name": "Garki & Wuse", "driver_earning_fee": 1750.00, "commission_percent": 70 },
    { "zone_id": "ZONE006", "zone_name": "Interstate Express", "driver_earning_fee": 24500.00, "commission_percent": 70 }
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

    story.append(Paragraph("<b>2.2 Request Payout / Withdrawal (`POST /api/driver/withdraw`)</b>", h2_style))
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

    # SECTION 3: ADMIN ENTERPRISE WALLET & DISBURSEMENT APIs
    story.append(Paragraph("3. Admin Enterprise Wallet Hub & Monnify Gateway APIs", h1_style))
    
    admin_w_rows = [
        [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Method &amp; Endpoint</b>", bold_body_style), Paragraph("<b>Auth Role</b>", bold_body_style), Paragraph("<b>Description</b>", bold_body_style)],
        [Paragraph("Overview", body_style), Paragraph("<code>GET /api/admin/wallets/summary</code>", body_style), Paragraph("Superadmin / Accountant", body_style), Paragraph("Fleet floating liability, Monnify reserve (₦5B), queue size", body_style)],
        [Paragraph("Driver Fleet", body_style), Paragraph("<code>GET /api/admin/wallets/drivers</code>", body_style), Paragraph("Superadmin / Manager", body_style), Paragraph("List driver balances, unwithdrawn pay, DVA status, freeze state", body_style)],
        [Paragraph("Payout Queue", body_style), Paragraph("<code>GET /api/admin/wallets/payouts</code>", body_style), Paragraph("Superadmin / Accountant", body_style), Paragraph("Paginated driver withdrawal requests (pending, paid, rejected)", body_style)],
        [Paragraph("Disbursement", body_style), Paragraph("<code>POST /api/admin/wallets/payouts/:id/disburse</code>", body_style), Paragraph("Superadmin / Accountant", body_style), Paragraph("Instant bank transfer via Monnify API + General Ledger debit", body_style)],
        [Paragraph("Batch Payout", body_style), Paragraph("<code>POST /api/admin/wallets/payouts/batch-disburse</code>", body_style), Paragraph("Superadmin", body_style), Paragraph("Batch disburse multiple approved driver payouts in one call", body_style)],
        [Paragraph("Approval", body_style), Paragraph("<code>PATCH /api/admin/wallets/payouts/:id/status</code>", body_style), Paragraph("Superadmin / Manager", body_style), Paragraph("Approve or reject payout request with reason notes", body_style)],
        [Paragraph("Adjustment", body_style), Paragraph("<code>POST /api/admin/wallets/adjust</code>", body_style), Paragraph("Superadmin", body_style), Paragraph("Manual driver credit/debit adjustment (bonus or penalty) + Journal", body_style)],
        [Paragraph("Security", body_style), Paragraph("<code>PATCH /api/admin/wallets/drivers/:id/freeze</code>", body_style), Paragraph("Superadmin", body_style), Paragraph("Freeze or unfreeze driver wallet with security hold reason", body_style)],
        [Paragraph("Gateway", body_style), Paragraph("<code>GET /api/admin/wallets/gateway/transactions</code>", body_style), Paragraph("Superadmin / Accountant", body_style), Paragraph("Customer storefront Monnify checkouts (Gross, Fee 1.5%, Net)", body_style)],
        [Paragraph("Webhooks", body_style), Paragraph("<code>GET /api/admin/wallets/gateway/webhooks</code>", body_style), Paragraph("Superadmin", body_style), Paragraph("Monnify inbound webhook audit logs with SHA-512 signatures", body_style)],
    ]
    t_aw = Table(admin_w_rows, colWidths=[65, 195, 95, 185])
    t_aw.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_aw)
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>3.1 Single Driver Payout Disbursement Payload (`POST /api/admin/wallets/payouts/:id/disburse`)</b>", h2_style))
    disb_req = '{\n  "disbursement_method": "monnify_transfer",\n  "notes": "Approved September Batch #1"\n}'
    disb_res = '{\n  "message": "Payout of ₦12,000.00 successfully disbursed!",\n  "payout": {\n    "id": 88,\n    "payout_ref": "PAY-MNFY-99201",\n    "status": "paid",\n    "gateway_reference": "MNFY-DISB-M88X9A",\n    "session_id": "9990581789211094",\n    "bank_response_code": "00"\n  }\n}'
    t_disb = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(disb_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(disb_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_disb.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_disb)
    story.append(Spacer(1, 8))

    # SECTION 4: DOUBLE-ENTRY ACCOUNTING & TRIAL BALANCE INTEGRATION
    story.append(Paragraph("4. Double-Entry General Ledger Rules for Wallets", h1_style))
    story.append(Paragraph("All wallet transactions post automatically to the central Chart of Accounts (COA), maintaining zero variance across the company balance sheet.", body_style))
    
    coa_data = [
        [Paragraph("<b>Transaction Event</b>", bold_body_style), Paragraph("<b>Debit Entry (Dr)</b>", bold_body_style), Paragraph("<b>Credit Entry (Cr)</b>", bold_body_style), Paragraph("<b>Ledger Sub-System</b>", bold_body_style)],
        [Paragraph("Customer Online Checkout", body_style), Paragraph("<code>1120 Monnify Settlement Vault</code>", body_style), Paragraph("<code>4110 Sales Revenue</code>", body_style), Paragraph("Central General Journal", body_style)],
        [Paragraph("Order Delivery Completion", body_style), Paragraph("<code>5210 Delivery Commission Expense</code>", body_style), Paragraph("<code>2120 Driver Wallet Payable</code>", body_style), Paragraph("Driver Wallet Ledger + COA", body_style)],
        [Paragraph("Driver Bank Disbursement", body_style), Paragraph("<code>2120 Driver Wallet Payable</code>", body_style), Paragraph("<code>1120 Monnify Settlement Vault</code>", body_style), Paragraph("Central General Journal", body_style)],
        [Paragraph("Driver Bonus Award", body_style), Paragraph("<code>5220 Driver Bonus Expense</code>", body_style), Paragraph("<code>2120 Driver Wallet Payable</code>", body_style), Paragraph("Driver Wallet Ledger + COA", body_style)],
        [Paragraph("Driver Penalty Deduction", body_style), Paragraph("<code>2120 Driver Wallet Payable</code>", body_style), Paragraph("<code>4210 Penalty &amp; Other Revenue</code>", body_style), Paragraph("Driver Wallet Ledger + COA", body_style)],
    ]
    t_coa = Table(coa_data, colWidths=[120, 150, 150, 120])
    t_coa.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_coa)
    story.append(Spacer(1, 8))

    # SECTION 5: ZONE RATE SPECIFICATION (ZONES 1 TO 6)
    story.append(Paragraph("5. Zone-Based Compensation Rate Card (Zones 1–6)", h1_style))
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

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Complete Driver & Wallet API PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_DRIVER_AND_WALLET_API_SPECIFICATION.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
