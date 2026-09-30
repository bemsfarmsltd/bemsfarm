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
        
        # Header (on pages after cover/first page)
        if self._pageNumber > 1:
            self.drawString(36, 11 * inch - 26, "BEMS FARMS LOGISTICS PLATFORM")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawRightString(8.5 * inch - 36, 11 * inch - 26, "Driver Registration & Onboarding Specification v2.2")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(36, 11 * inch - 30, 8.5 * inch - 36, 11 * inch - 30)

        # Footer
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.5)
        self.line(36, 32, 8.5 * inch - 36, 32)
        
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 20, "Confidential — Bems Farms Dispatch, Compliance & Mobile Engineering")
        self.drawRightString(8.5 * inch - 36, 20, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=38,
        bottomMargin=42
    )

    styles = getSampleStyleSheet()

    # Custom styles
    c_primary = colors.HexColor("#143C2D")
    c_accent = colors.HexColor("#D97706")
    c_dark = colors.HexColor("#0F172A")
    c_muted = colors.HexColor("#475569")
    c_bg_code = colors.HexColor("#F8FAFC")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=c_primary,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=c_muted,
        spaceAfter=12
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=c_primary,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=c_accent,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
        leftIndent=14,
        spaceAfter=3
    )

    code_style = ParagraphStyle(
        'CodeStyle',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4
    )

    table_header = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.white
    )

    table_cell = ParagraphStyle(
        'TC',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10,
        textColor=c_dark
    )

    table_cell_bold = ParagraphStyle(
        'TCB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10,
        textColor=c_dark
    )

    story = []

    # ── Header Banner ──
    story.append(Paragraph("BEMS FARMS LOGISTICS & FLEET OPERATIONS", ParagraphStyle('Badge', fontName='Helvetica-Bold', fontSize=8, textColor=c_accent, leading=10)))
    story.append(Paragraph("Driver Registration, Onboarding & Zone Selection", title_style))
    story.append(Paragraph("Comprehensive Technical Specification • Requirements Checklist • Onboarding Lifecycles • REST API Reference", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceAfter=10))

    # ── 1. Executive Summary & Pathways ──
    story.append(Paragraph("1. Executive Summary & Registration Pathways", h1_style))
    story.append(Paragraph(
        "Bems Farms operates a fresh-produce delivery network connecting cold-storage distribution hubs and retail branches with local residential and commercial consumers. To guarantee food safety, accountability, transit speed, and prompt courier payouts, the system enforces a multi-tier driver onboarding and compliance pipeline.",
        body_style
    ))

    pathways_data = [
        [Paragraph("Pathway", table_header), Paragraph("Target Channel", table_header), Paragraph("Entry Status", table_header), Paragraph("Key Purpose & Workflow", table_header)],
        [
            Paragraph("<b>Pathway 1: Self-Service Mobile/Web</b>", table_cell),
            Paragraph("Mobile App (React Native) / Web Hub", table_cell),
            Paragraph("<code>status: pending<br/>onboarding: pending_verification</code>", table_cell),
            Paragraph("Prospective riders register directly, enter vehicle and zone preferences, upload KYC documents, and await compliance team review.", table_cell)
        ],
        [
            Paragraph("<b>Pathway 2: Digital Invitation Link</b>", table_cell),
            Paragraph("Email / SMS Magic Link", table_cell),
            Paragraph("<code>status: inactive<br/>onboarding: invited</code>", table_cell),
            Paragraph("Admin sends a 7-day cryptographic invite token. Driver completes personal details, chooses their zone, sets password, and uploads KYC.", table_cell)
        ],
        [
            Paragraph("<b>Pathway 3: Direct Admin Desk Onboarding</b>", table_cell),
            Paragraph("Bems Farms Admin Portal", table_cell),
            Paragraph("<code>status: active / pending<br/>onboarding: verified</code>", table_cell),
            Paragraph("In-person walk-in registration at farm depot. Manager inputs verified physical documents, sets initial credentials, and activates immediately.", table_cell)
        ]
    ]

    t_pathways = Table(pathways_data, colWidths=[1.5*inch, 1.4*inch, 1.6*inch, 2.7*inch])
    t_pathways.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_pathways)
    story.append(Spacer(1, 10))

    # ── 2. Requirements Checklist ──
    story.append(Paragraph("2. Required Information & Documents Checklist", h1_style))
    story.append(Paragraph("All drivers must provide the following information prior to dispatch authorization:", body_style))

    req_data = [
        [Paragraph("Category", table_header), Paragraph("Required Fields", table_header), Paragraph("Validation & Storage Details", table_header)],
        [
            Paragraph("<b>1. Personal Identity</b>", table_cell_bold),
            Paragraph("• Full Legal Name<br/>• Primary Phone Number<br/>• Email Address<br/>• Residential Address, City, State<br/>• National Identity Number (NIN)", table_cell),
            Paragraph("Phone must be 10-14 digits, unique across the system.<br/>NIN must be 11 digits (stored in <code>drivers.nin_number</code>).", table_cell)
        ],
        [
            Paragraph("<b>2. Delivery Zone Selection</b>", table_cell_bold),
            Paragraph("• <b>Primary Operating Zone ID</b> (<code>primary_zone_id</code>)<br/>• Selected from active dispatch zones<br/>• Operating Hub Preference", table_cell),
            Paragraph("Drivers choose their preferred operational territory (e.g. Aba Central, Ogbor Hill, Eziukwu, Umungasi) via <code>GET /api/driver/zones</code>. Auto-dispatch matches orders inside this territory.", table_cell)
        ],
        [
            Paragraph("<b>3. Vehicle & License</b>", table_cell_bold),
            Paragraph("• Vehicle Type (<code>motorcycle</code>, <code>tricycle</code>, <code>van</code>, <code>car</code>)<br/>• License Plate Number<br/>• Driver's License Number", table_cell),
            Paragraph("Vehicle plate is normalized to uppercase (e.g., <code>ABA-123-XY</code>). License number tracked for regulatory expiration checks.", table_cell)
        ],
        [
            Paragraph("<b>4. Emergency & Guarantor</b>", table_cell_bold),
            Paragraph("• Next of Kin / Emergency Contact (Name, Phone, Relationship)<br/>• Guarantor (Name, Phone, Address)", table_cell),
            Paragraph("Required for incident triage and security vetting before vehicle possession or cash handling.", table_cell)
        ],
        [
            Paragraph("<b>5. Payout & Financials</b>", table_cell_bold),
            Paragraph("• Commercial Bank Name<br/>• 10-Digit NUBAN Account Number<br/>• Verified Account Name<br/>• 4-Digit Security Cashout PIN", table_cell),
            Paragraph("Bank account is resolved in real time via Paystack/Monnify NUBAN API. System auto-provisions a Bems Farms Internal Escrow Wallet (<code>DRV-XXXX</code>).", table_cell)
        ],
        [
            Paragraph("<b>6. Mandatory KYC Documents</b>", table_cell_bold),
            Paragraph("• Driver's License (Front & Back)<br/>• NIMC National Identity (NIN) Slip<br/>• Profile Headshot / Avatar<br/>• Vehicle Insurance / Roadworthiness", table_cell),
            Paragraph("Uploaded as JPEG/PNG/PDF via <code>POST /api/driver/upload/document</code>. Stored in <code>drivers.documents</code> JSONB payload with secure signed URLs.", table_cell)
        ]
    ]

    t_req = Table(req_data, colWidths=[1.5*inch, 2.7*inch, 3.0*inch])
    t_req.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_req)
    story.append(Spacer(1, 10))

    # ── 3. Delivery Zone Selection Feature ──
    story.append(Paragraph("3. Delivery Zone Selection Feature", h1_style))
    story.append(Paragraph(
        "<b>Operating Delivery Zones</b> are the backbone of Bems Farms' dispatch intelligence. When registering, drivers choose their preferred operating zone. This zone assignment drives:",
        body_style
    ))
    story.append(Paragraph("• <b>Geodesic Routing & Dispatch Pairing:</b> The auto-assign dispatch engine prioritizes drivers whose <code>primary_zone_id</code> covers the order's pickup cold room and customer destination polygon.", bullet_style))
    story.append(Paragraph("• <b>Zone-Specific Commission Rates:</b> Each delivery zone specifies base delivery fees and driver commission payouts (e.g. ₦700/delivery in urban Aba vs ₦1,200/delivery in extended suburban zones).", bullet_style))
    story.append(Paragraph("• <b>Shift Clustering:</b> Prevents riders from being pulled across town for minor drop-offs, maximizing fuel efficiency and on-time fresh produce delivery.", bullet_style))
    story.append(Paragraph("• <b>Dynamic Re-Zoning:</b> Drivers can view zones and update their operating territory in their profile settings as service coverage expands.", bullet_style))
    story.append(Spacer(1, 10))

    # ── 4. Credentials, Restricted Login & Email Notification Workflow ──
    story.append(Paragraph("4. Credentials, Restricted Login & Email Notification Workflow", h1_style))
    story.append(Paragraph(
        "To ensure maximum transparency while safeguarding the logistics network, Bems Farms implements a secure <b>Restricted Login & Notification</b> flow:",
        body_style
    ))

    login_flow_data = [
        [Paragraph("Step", table_header), Paragraph("Stage & Action", table_header), Paragraph("System Behavior & Security Controls", table_header)],
        [
            Paragraph("<b>Step 1</b>", table_cell_bold),
            Paragraph("<b>Password Set at Registration</b><br/><code>POST /api/driver/auth/register</code>", table_cell),
            Paragraph("During registration, the system <b>mandates a secure password</b> (min 6 characters) along with the driver's email and phone number. The password is immediately hashed via <code>bcryptjs</code> (10 salt rounds) and stored in <code>driver_auth</code>.", table_cell)
        ],
        [
            Paragraph("<b>Step 2</b>", table_cell_bold),
            Paragraph("<b>Immediate Login Access</b><br/><code>POST /api/driver/auth/login</code>", table_cell),
            Paragraph("The driver <b>does not need to wait for approval to log into the mobile app</b>. They log in immediately using the <b>Email Address and Password</b> set during registration. They receive a 30-day JWT authentication token.", table_cell)
        ],
        [
            Paragraph("<b>Step 3</b>", table_cell_bold),
            Paragraph("<b>Restricted Pending State</b><br/>(Awaiting Compliance Review)", table_cell),
            Paragraph("While in <code>pending_verification</code> status, the driver has restricted dashboard access: they can view their profile, monitor live checklist completion (<code>GET /api/driver/auth/status</code>), change their delivery zone, and upload missing KYC documents.<br/><br/><b>Crucial Restriction:</b> The driver <b>CANNOT go online or accept orders</b>. Any attempt to toggle online returns <code>403 Forbidden: Your driver account is currently awaiting admin verification</code>.", table_cell)
        ],
        [
            Paragraph("<b>Step 4</b>", table_cell_bold),
            Paragraph("<b>Compliance Approval</b><br/><code>PATCH /api/admin/deliveries/drivers/:id/approve</code>", table_cell),
            Paragraph("Once the compliance team audits the driver's license, NIN, and vehicle particulars, the admin approves the account in the portal.", table_cell)
        ],
        [
            Paragraph("<b>Step 5</b>", table_cell_bold),
            Paragraph("<b>Automated Email Notification</b><br/>(Instant Dispatch via Resend/SMTP)", table_cell),
            Paragraph("Upon approval, the system <b>automatically dispatches an official Approval Email Notification</b> directly to the driver's registered email address (via <code>sendDriverApprovedEmail</code>).<br/><br/>Simultaneously, an in-app push notification is delivered, and real-time WebSockets unlock the <b>Go Online</b> switch.", table_cell)
        ],
        [
            Paragraph("<b>Step 6</b>", table_cell_bold),
            Paragraph("<b>Go Online & Start Earning</b><br/><code>PATCH /api/driver/availability</code>", table_cell),
            Paragraph("The driver opens the app, flips their toggle to <b>Online</b>, and the auto-assign engine immediately begins pairing them with customer orders in their registered zone.", table_cell)
        ]
    ]

    t_login_flow = Table(login_flow_data, colWidths=[1.0*inch, 2.7*inch, 3.5*inch])
    t_login_flow.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_login_flow)
    story.append(Spacer(1, 10))

    # ── 5. Complete API Reference ──
    story.append(Paragraph("5. Complete API Reference", h1_style))

    apis = [
        {
            "num": "5.1",
            "name": "Fetch Available Delivery Zones",
            "method": "GET",
            "endpoint": "/api/driver/zones  (or /api/driver/onboarding/zones)",
            "auth": "Public / None",
            "desc": "Returns all currently active delivery zones for the driver to select during registration or profile setup.",
            "response": """{
  "success": true,
  "zones": [
    {
      "zone_id": "ZONE001",
      "zone_name": "Aba Urban Central",
      "delivery_fee": "700.00",
      "estimated_delivery_time": "25-40 mins",
      "coverage_areas": ["Factory Rd", "Pound Rd", "Asa Rd", "Eziukwu Market"],
      "center_lat": 5.1065,
      "center_lng": 7.3682,
      "radius_km": 6.5,
      "color_hex": "#10B981"
    },
    {
      "zone_id": "ZONE002",
      "zone_name": "Ogbor Hill & Environs",
      "delivery_fee": "1000.00",
      "estimated_delivery_time": "35-50 mins",
      "coverage_areas": ["Opobo Rd", "Ehere", "Ikpeazu Estate", "Umuola"],
      "center_lat": 5.1221,
      "center_lng": 7.3915,
      "radius_km": 8.0,
      "color_hex": "#3B82F6"
    }
  ]
}"""
        },
        {
            "num": "5.2",
            "name": "Driver Self-Service Registration",
            "method": "POST",
            "endpoint": "/api/driver/auth/register",
            "auth": "Public / None",
            "desc": "Mandates secure password, creates driver account in pending_verification status, provisions internal wallet, and returns initial JWT.",
            "payload": """{
  "name": "Chidi Nwachukwu",
  "phone": "08031234567",
  "email": "chidi.driver@example.com",
  "password": "StrongPassword123",
  "vehicle_type": "motorcycle",
  "vehicle_plate": "ABA-456-XY",
  "primary_zone_id": "ZONE001",
  "nin_number": "12345678901",
  "license_number": "DL-987654321",
  "address": "14 Factory Road, Aba",
  "emergency_contact_name": "Ngozi Nwachukwu",
  "emergency_contact_phone": "08029876543",
  "emergency_contact_relationship": "Spouse",
  "guarantor_name": "Chief E. Okafor",
  "guarantor_phone": "08039998877",
  "guarantor_address": "88 Faulks Road, Aba",
  "bank_name": "Zenith Bank",
  "account_number": "1012345678",
  "account_name": "Chidi Nwachukwu"
}""",
            "response": """{
  "status": "success",
  "message": "Driver registered successfully. Your account is currently awaiting verification by the dispatch team.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "driver": {
    "id": 14,
    "name": "Chidi Nwachukwu",
    "phone": "08031234567",
    "email": "chidi.driver@example.com",
    "primary_zone_id": "ZONE001",
    "vehicle_type": "motorcycle",
    "vehicle_plate": "ABA-456-XY",
    "status": "pending",
    "onboarding_status": "pending_verification",
    "is_available": false
  },
  "verification": {
    "status": "pending",
    "onboarding_status": "pending_verification",
    "is_verified": false,
    "can_accept_orders": false
  }
}"""
        },
        {
            "num": "5.3",
            "name": "Check Live Verification & Checklist Status",
            "method": "GET",
            "endpoint": "/api/driver/auth/status",
            "auth": "Bearer <JWT>",
            "desc": "Returns live verification progress, missing document alerts, and admin compliance review notes.",
            "response": """{
  "driver_id": 14,
  "name": "Chidi Nwachukwu",
  "status": "pending",
  "onboarding_status": "pending_verification",
  "is_verified": false,
  "can_go_online": false,
  "compliance_notes": "Please re-upload a clearer image of your driver's license front.",
  "checklist": {
    "profile_completed": true,
    "driver_license_uploaded": true,
    "nin_verified": true,
    "vehicle_registered": true,
    "payout_bank_added": true
  },
  "completion": { "completed": 5, "total": 5, "percent": 100 }
}"""
        },
        {
            "num": "5.4",
            "name": "Upload KYC Document / Driver Avatar",
            "method": "POST",
            "endpoint": "/api/driver/upload/document  (Avatar: /api/driver/upload/avatar)",
            "auth": "Bearer <JWT>",
            "desc": "Uploads binary files (JPEG/PNG/PDF, max 5MB) for verification.",
            "response": """{
  "success": true,
  "url": "https://api.bemsfarms.com/uploads/drivers/doc-14-license_front.jpg",
  "document_type": "license_front",
  "message": "Document uploaded successfully."
}"""
        },
        {
            "num": "5.5",
            "name": "Configure Cashout Security PIN",
            "method": "POST",
            "endpoint": "/api/driver/pin/setup",
            "auth": "Bearer <JWT>",
            "desc": "Sets a 4-digit or 6-digit numeric PIN required to cash out commissions from the internal wallet.",
            "payload": """{ "pin": "1234", "confirm_pin": "1234" }""",
            "response": """{ "success": true, "has_pin": true, "message": "Security PIN configured successfully." }"""
        },
        {
            "num": "5.6",
            "name": "Duty Toggle (Go Online / Offline)",
            "method": "PATCH",
            "endpoint": "/api/driver/availability",
            "auth": "Bearer <JWT>",
            "desc": "Enables order receiving. Unverified or suspended drivers are blocked with 403 Forbidden.",
            "payload": """{ "is_available": true }""",
            "response": """{
  "is_available": true,
  "status": "active",
  "message": "Driver is now ONLINE and ready for orders"
}"""
        }
    ]

    for api in apis:
        box_data = [
            [
                Paragraph(f"<b>{api['num']} {api['name']}</b>", table_header),
                Paragraph(f"<b>{api['method']}</b> &nbsp;<code>{api['endpoint']}</code>", ParagraphStyle('EP', parent=table_header, alignment=2))
            ],
            [
                Paragraph(f"<b>Authentication:</b> {api['auth']}<br/><b>Description:</b> {api['desc']}", table_cell),
                Paragraph("", table_cell)
            ]
        ]
        if "payload" in api:
            box_data.append([
                Paragraph("<b>Request Payload (JSON):</b>", table_cell_bold),
                Paragraph("", table_cell)
            ])
            box_data.append([
                Paragraph(f"<pre>{api['payload']}</pre>", code_style),
                Paragraph("", table_cell)
            ])
        if "response" in api:
            box_data.append([
                Paragraph("<b>Response Payload (JSON):</b>", table_cell_bold),
                Paragraph("", table_cell)
            ])
            box_data.append([
                Paragraph(f"<pre>{api['response']}</pre>", code_style),
                Paragraph("", table_cell)
            ])

        t_box = Table(box_data, colWidths=[4.2*inch, 3.0*inch])
        t_box.setStyle(TableStyle([
            ('SPAN', (0,0), (0,0)),
            ('SPAN', (0,1), (1,1)),
            ('BACKGROUND', (0,0), (-1,0), c_primary),
            ('BACKGROUND', (0,1), (-1,-1), colors.HexColor("#FAFAFA")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ]))
        if "payload" in api and "response" in api:
            t_box.setStyle(TableStyle([
                ('SPAN', (0,2), (1,2)),
                ('SPAN', (0,3), (1,3)),
                ('SPAN', (0,4), (1,4)),
                ('SPAN', (0,5), (1,5)),
            ]))
        elif "response" in api:
            t_box.setStyle(TableStyle([
                ('SPAN', (0,2), (1,2)),
                ('SPAN', (0,3), (1,3)),
            ]))

        story.append(KeepTogether([t_box, Spacer(1, 8)]))

    # ── 6. Admin Dispatch Endpoints ──
    story.append(Paragraph("6. Admin Dispatch & Compliance Endpoints", h1_style))
    admin_table_data = [
        [Paragraph("Action", table_header), Paragraph("Method & Path", table_header), Paragraph("Role Required", table_header), Paragraph("Operational Impact", table_header)],
        [
            Paragraph("<b>Invite Driver</b>", table_cell),
            Paragraph("<code>POST /api/admin/deliveries/drivers/invite</code>", table_cell),
            Paragraph("Delivery Manager, Admin", table_cell),
            Paragraph("Issues 7-day magic invite link with pre-assigned zone and rate.", table_cell)
        ],
        [
            Paragraph("<b>Direct Create</b>", table_cell),
            Paragraph("<code>POST /api/admin/deliveries/drivers</code>", table_cell),
            Paragraph("Admin, Superadmin", table_cell),
            Paragraph("Immediately provisions driver with zone and login password.", table_cell)
        ],
        [
            Paragraph("<b>Approve Driver</b>", table_cell),
            Paragraph("<code>PATCH /api/admin/deliveries/drivers/:id/approve</code>", table_cell),
            Paragraph("Admin, Superadmin", table_cell),
            Paragraph("Sets status to <code>active</code>, unlocks availability toggle, and triggers dispatch matching engine.", table_cell)
        ],
        [
            Paragraph("<b>Audit Compliance</b>", table_cell),
            Paragraph("<code>PATCH /api/admin/deliveries/drivers/:id/compliance</code>", table_cell),
            Paragraph("Delivery Manager, Admin", table_cell),
            Paragraph("Attaches review feedback on blurred documents or failed background checks.", table_cell)
        ],
        [
            Paragraph("<b>Suspend Driver</b>", table_cell),
            Paragraph("<code>PATCH /api/admin/deliveries/drivers/:id/suspend</code>", table_cell),
            Paragraph("Admin, Superadmin", table_cell),
            Paragraph("Forces driver offline immediately, cancels current order matches, and freezes wallet cashouts.", table_cell)
        ]
    ]

    t_admin = Table(admin_table_data, colWidths=[1.3*inch, 2.7*inch, 1.4*inch, 1.8*inch])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), c_primary),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_admin)
    story.append(Spacer(1, 12))

    # ── 7. Security & Fraud Protection ──
    story.append(Paragraph("7. Security, Escrow & Fraud Safeguards", h1_style))
    story.append(Paragraph("<b>1. Availability Gatekeeping:</b> Unapproved or pending drivers are cryptographically blocked by middleware from flipping their toggle to <code>is_available: true</code>. Any attempt returns <code>403 Forbidden</code>.", body_style))
    story.append(Paragraph("<b>2. Double Escrow Settlement:</b> Every driver receives an internal Bems Farms Wallet identifier (e.g. <code>DRV-0014</code>). Order delivery commissions accumulate safely in this ledger. Drivers can only cash out to their verified commercial NUBAN account after entering their hashed 4-digit PIN.", body_style))
    story.append(Paragraph("<b>3. Geofencing & Telemetry Heartbeat:</b> Online drivers stream real-time GPS pings via <code>POST /api/driver/location</code>. If a driver wanders far outside their registered zone, the dispatch engine warns dispatchers and adjusts proximity weighting.", body_style))
    story.append(Paragraph("<b>4. Brute-Force & Credential Lockdown:</b> 5 consecutive failed login attempts automatically locks the driver account for 30 minutes, logging telemetry to <code>driver_auth.failed_attempts</code>.", body_style))

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"SUCCESS: PDF generated at {filename}")

if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else "Bems_Farms_Driver_Registration_Documentation.pdf"
    build_pdf(out_path)
