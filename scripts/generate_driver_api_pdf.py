#!/usr/bin/env python3
"""
BEMS FARMS — DRIVER MOBILE APP API SPECIFICATION (PDF GENERATOR)
Comprehensive, publication-grade technical documentation for React Native, Flutter, iOS & Android.
100% EXCLUSIVE TO THE DRIVER MOBILE APPLICATION (/api/driver/*).
Includes all 24 driver endpoints, full request/response payloads, authentication,
wallet system, bank resolution, push tokens, incident reporting, POD uploads, and emergency SOS.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

# Palette definition
PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#115E59") # Teal 800
SECONDARY = colors.HexColor("#0F172A")    # Slate 900
ACCENT = colors.HexColor("#F59E0B")       # Amber 500
TEXT_MAIN = colors.HexColor("#334155")    # Slate 700
BORDER_COL = colors.HexColor("#E2E8F0")   # Slate 200
CODE_BG = colors.HexColor("#F8FAFC")      # Slate 50
SUCCESS = colors.HexColor("#10B981")      # Emerald 500
DANGER = colors.HexColor("#EF4444")       # Red 500

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
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — DRIVER MOBILE APPLICATION API SPECIFICATION")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "API Version 2.0 • Confidential Engineering Reference")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)

        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "© 2026 Bems Farms Ltd. • Driver Logistics & Dispatch Platform")
        self.drawRightString(576, 26, f"Page {self._pageNumber} of {page_count}")
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_DRIVER_MOBILE_APP_API_SPECIFICATION.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=54,
        bottomMargin=48
    )

    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=PRIMARY_DARK,
        spaceAfter=2
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=TEXT_MAIN,
        spaceAfter=5
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=13,
        textColor=PRIMARY_DARK,
        spaceBefore=7,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=SECONDARY,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=9.5,
        textColor=TEXT_MAIN
    )

    bold_body_style = ParagraphStyle(
        'BoldBody_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=9.5,
        textColor=SECONDARY
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6.5,
        leading=8.2,
        textColor=colors.HexColor("#0F172A"),
        backColor=CODE_BG,
        borderColor=BORDER_COL,
        borderWidth=0.5,
        borderPadding=3,
        spaceBefore=1,
        spaceAfter=2
    )

    story = []

    # Title & Metadata Banner
    story.append(Paragraph("🚚 Bems Farms — Driver Mobile App API Specification", title_style))
    story.append(Paragraph("Official Engineering Guide for Mobile App Developers (React Native, Flutter, iOS & Android) • Version 2.0.0", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=4))

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
            Paragraph("<b>Payload Standard:</b> application/json & multipart/form-data", body_style),
            Paragraph("<b>Driver Wallet &amp; DVA:</b> Monnify Virtual NUBAN + Zone-Based Earnings", body_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 4))

    # SECTION 1: MASTER ROUTING DIRECTORY (ALL 24 DRIVER ENDPOINTS)
    story.append(Paragraph("1. Driver API Directory & Endpoint Index (24 Endpoints)", h1_style))
    
    d_rows = [
        [Paragraph("<b>Category</b>", bold_body_style), Paragraph("<b>Method &amp; Endpoint</b>", bold_body_style), Paragraph("<b>Auth</b>", bold_body_style), Paragraph("<b>Description &amp; Mobile Trigger</b>", bold_body_style)],
        [Paragraph("Onboarding", body_style), Paragraph("<code>GET /onboarding/verify?token=...</code>", body_style), Paragraph("Public", body_style), Paragraph("Verify invite token & pre-populate driver signup details", body_style)],
        [Paragraph("Onboarding", body_style), Paragraph("<code>POST /onboarding/submit</code>", body_style), Paragraph("Public", body_style), Paragraph("Submit driver KYC, NIN, vehicle details & settlement bank", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/login</code>", body_style), Paragraph("Public", body_style), Paragraph("Driver email/phone + password authentication & JWT token", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/forgot-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Send password reset token via SMS / Email", body_style)],
        [Paragraph("Auth", body_style), Paragraph("<code>POST /auth/reset-password</code>", body_style), Paragraph("Public", body_style), Paragraph("Confirm reset token and configure new driver password", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>GET /auth/me</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Retrieve driver profile, rating, stats & Monnify Virtual Account", body_style)],
        [Paragraph("Profile", body_style), Paragraph("<code>PATCH /auth/profile</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Update driver phone number, profile photo, or vehicle details", body_style)],
        [Paragraph("Availability", body_style), Paragraph("<code>PATCH /availability</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Toggle duty state: Online (ready for dispatch) vs Offline", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch assigned active deliveries with customer addresses & items", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>GET /deliveries/:orderId</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch full itemized breakdown for a specific delivery drop", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>POST /deliveries/:orderId/accept</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Explicitly accept an assigned delivery drop within countdown", body_style)],
        [Paragraph("Deliveries", body_style), Paragraph("<code>POST /deliveries/:orderId/decline</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Decline delivery with reason so dispatch can reassign", body_style)],
        [Paragraph("Milestones", body_style), Paragraph("<code>PATCH /deliveries/:orderId/status</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Progress milestone (accepted, en_route, arrived, delivered)", body_style)],
        [Paragraph("Incidents", body_style), Paragraph("<code>POST /deliveries/:orderId/report-issue</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Report mid-trip issue (customer unreachable, wrong address)", body_style)],
        [Paragraph("Incidents", body_style), Paragraph("<code>GET /incidents</code>", body_style), Paragraph("Bearer", body_style), Paragraph("List past incident reports and resolution statuses", body_style)],
        [Paragraph("History", body_style), Paragraph("<code>GET /deliveries/history</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch paginated past delivery drops and completed trips", body_style)],
        [Paragraph("POD Upload", body_style), Paragraph("<code>POST /upload/proof</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Upload camera photo proof of delivery (multipart/form-data)", body_style)],
        [Paragraph("Telemetry", body_style), Paragraph("<code>POST /location</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Background GPS coordinate stream ping (every 10–15s)", body_style)],
        [Paragraph("Wallet", body_style), Paragraph("<code>GET /earnings</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Live wallet balance, Monnify DVA NUBAN, zone rate card & history", body_style)],
        [Paragraph("Bank Directory", body_style), Paragraph("<code>GET /banks</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Directory of Nigerian commercial banks & fintechs with codes", body_style)],
        [Paragraph("Bank Resolve", body_style), Paragraph("<code>POST /bank/resolve</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Verify 10-digit NUBAN account number & resolve legal account name", body_style)],
        [Paragraph("Withdrawal", body_style), Paragraph("<code>POST /withdraw</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Request payout of unwithdrawn earnings to personal bank account", body_style)],
        [Paragraph("Push Tokens", body_style), Paragraph("<code>POST /device-token</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Register / update device Expo / FCM push notification token", body_style)],
        [Paragraph("Notifications", body_style), Paragraph("<code>GET /notifications</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Fetch in-app notification inbox with unread count", body_style)],
        [Paragraph("Notifications", body_style), Paragraph("<code>PATCH /notifications/:id/read</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Mark single notification as read", body_style)],
        [Paragraph("Notifications", body_style), Paragraph("<code>PATCH /notifications/read-all</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Mark all notifications in inbox as read", body_style)],
        [Paragraph("Performance", body_style), Paragraph("<code>GET /stats</code> | <code>/performance</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Driver scorecard, rating (⭐), on-time rate & badges", body_style)],
        [Paragraph("Emergency SOS", body_style), Paragraph("<code>POST /emergency</code>", body_style), Paragraph("Bearer", body_style), Paragraph("🚨 1-Tap SOS panic alert broadcasting live GPS to dispatch", body_style)],
        [Paragraph("Emergency SOS", body_style), Paragraph("<code>POST /emergency/:id/cancel</code>", body_style), Paragraph("Bearer", body_style), Paragraph("Cancel emergency false alarm", body_style)],
    ]
    t_d = Table(d_rows, colWidths=[65, 185, 40, 250])
    t_d.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 1.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 1.5),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_d)
    story.append(Spacer(1, 6))

    # SECTION 2: AUTHENTICATION, ONBOARDING & PROFILE
    story.append(Paragraph("2. Driver Authentication, Onboarding & Profile APIs", h1_style))
    story.append(Paragraph("<b>2.1 Driver Login (`POST /api/driver/auth/login`)</b>", h2_style))
    story.append(Paragraph("Authenticates driver by phone number or email and password. Returns JWT token and driver profile with Dedicated Virtual Account (DVA).", body_style))
    
    login_req = '{\n  "emailOrPhone": "08123456789",\n  "password": "Password123!"\n}'
    login_res = '{\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "message": "Login successful",\n  "driver": {\n    "id": 6,\n    "name": "Victor Kalu",\n    "phone": "08123456789",\n    "email": "victor.kalu@bemsfarms.com",\n    "wallet_account_number": "3397202109",\n    "wallet_bank_name": "Monnify / Wema Bank",\n    "wallet_account_name": "BEMS - VICTOR KALU",\n    "bank_name": "GTBank",\n    "account_number": "0123456789",\n    "wallet_balance": 16500.00,\n    "is_available": true\n  }\n}'
    
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
    story.append(Spacer(1, 4))

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
    story.append(Spacer(1, 6))

    # SECTION 3: DISPATCH DELIVERIES, ACCEPT/DECLINE & MILESTONES
    story.append(Paragraph("3. Dispatch Deliveries, Accept/Decline & Milestones", h1_style))
    story.append(Paragraph("When an order is dispatched, the driver has endpoints to explicitly Accept or Decline, progress through 5 status milestones, and capture photo proof of delivery.", body_style))
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>3.1 Accept Delivery Drop (`POST /api/driver/deliveries/:orderId/accept`)</b>", h2_style))
    acc_res = '{\n  "status": "success",\n  "message": "Delivery accepted successfully",\n  "delivery_id": 482,\n  "order_id": 1092,\n  "order_ref": "BEMS-ORD-8819",\n  "status": "accepted"\n}'
    story.append(Paragraph(acc_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>3.2 Decline Delivery Drop (`POST /api/driver/deliveries/:orderId/decline`)</b>", h2_style))
    dec_req = '{\n  "reason": "vehicle_breakdown",\n  "notes": "Flat tyre along Airport Road, fixing at repair shop."\n}'
    dec_res = '{\n  "status": "success",\n  "message": "Delivery declined. Returned to dispatch pool for reassignment.",\n  "order_id": 1092,\n  "order_ref": "BEMS-ORD-8819"\n}'
    t_dec = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(dec_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(dec_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_dec.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_dec)
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>3.3 Milestone Progression Lifecycle</b>", h2_style))
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

    story.append(Paragraph("<b>3.4 Update Milestone (`PATCH /api/driver/deliveries/:orderId/status`)</b>", h2_style))
    status_sample = '{\n  "status": "delivered",\n  "proof_note": "Handed directly to customer Mrs. Ngozi.",\n  "proof_photo": "https://api.bemsfarms.com/uploads/proofs/POD_17899_a8b9.jpg"\n}'
    status_res = '{\n  "message": "Delivery status updated to delivered",\n  "delivery": { "id": 482, "status": "delivered", "arrived_at": "2026-09-21T10:14:00Z" },\n  "order_id": 1092,\n  "status": "delivered"\n}'
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
    story.append(Spacer(1, 6))

    # SECTION 4: PROOF OF DELIVERY (POD) CAMERA PHOTO UPLOAD
    story.append(Paragraph("4. Proof of Delivery (POD) Photo Upload API", h1_style))
    story.append(Paragraph("<b>4.1 Upload POD Photo (`POST /api/driver/upload/proof`)</b>", h2_style))
    story.append(Paragraph("Accepts multipart/form-data with image file or JSON body with base64 data URI. Returns public image URL for use in milestone status updates.", body_style))
    
    upload_res = """{
  "status": "success",
  "message": "Proof photo uploaded successfully",
  "url": "https://api.bemsfarms.com/uploads/proofs/POD_178992819_3c8f.jpg",
  "filename": "POD_178992819_3c8f.jpg",
  "size": 184520,
  "mimetype": "image/jpeg"
}"""
    story.append(Paragraph(upload_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 6))

    # SECTION 5: DRIVER WALLET, BANK VERIFICATION & WITHDRAWALS
    story.append(Paragraph("5. Driver Wallet, Bank Verification & Withdrawal System", h1_style))
    story.append(Paragraph("Provides live wallet balance, Monnify Dedicated Virtual Accounts (DVA NUBAN), Nigerian commercial bank directory, live NIP account name resolution, and withdrawal processing.", body_style))
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>5.1 Get Driver Wallet & Earnings (`GET /api/driver/earnings`)</b>", h2_style))
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
      "account_name": "BEMS - VICTOR KALU"
    },
    "withdrawal_bank": {
      "bank_name": "GTBank",
      "account_number": "0123456789",
      "account_name": "VICTOR KALU"
    }
  },
  "zone_rates": [
    { "zone_id": "ZONE001", "zone_name": "Zone 1 - Maitama & Asokoro", "driver_earning_fee": 700.00, "commission_percent": 70, "estimated_eta": "20 - 35 mins" },
    { "zone_id": "ZONE002", "zone_name": "Zone 2 - Garki, Wuse, Central Area", "driver_earning_fee": 1750.00, "commission_percent": 70, "estimated_eta": "25 - 45 mins" },
    { "zone_id": "ZONE003", "zone_name": "Zone 3 - Utako, Jabi, Mabushi", "driver_earning_fee": 2450.00, "commission_percent": 70, "estimated_eta": "30 - 50 mins" },
    { "zone_id": "ZONE004", "zone_name": "Zone 4 - Gwarinpa, Kubwa", "driver_earning_fee": 3500.00, "commission_percent": 70, "estimated_eta": "40 - 65 mins" },
    { "zone_id": "ZONE005", "zone_name": "Zone 5 - Lugbe, Airport Road", "driver_earning_fee": 5600.00, "commission_percent": 70, "estimated_eta": "45 - 75 mins" },
    { "zone_id": "ZONE006", "zone_name": "Zone 6 - Interstate Express", "driver_earning_fee": 24500.00, "commission_percent": 70, "estimated_eta": "Same Day" }
  ]
}"""
    story.append(Paragraph(earnings_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>5.2 List Nigerian Commercial Banks & Fintechs (`GET /api/driver/banks`)</b>", h2_style))
    story.append(Paragraph("Returns official directory of 33+ Nigerian banks (Access, GTBank, Zenith, OPay, PalmPay, Kuda, Moniepoint, Wema, etc.) with codes for populating bank picker modals.", body_style))
    story.append(Spacer(1, 2))

    story.append(Paragraph("<b>5.3 Resolve & Verify Bank Account Name (`POST /api/driver/bank/resolve`)</b>", h2_style))
    story.append(Paragraph("Validates 10-digit NUBAN account number against the bank code via NIP name enquiry. The app calls this as soon as 10 digits are typed to display the verified account holder name.", body_style))
    resolve_req = '{\n  "account_number": "0123456789",\n  "bank_code": "058",\n  "bank_name": "Guaranty Trust Bank (GTBank)"\n}'
    resolve_res = '{\n  "status": "success",\n  "account_number": "0123456789",\n  "bank_code": "058",\n  "bank_name": "Guaranty Trust Bank (GTBank)",\n  "account_name": "VICTOR KALU",\n  "is_valid": true,\n  "message": "Account name successfully resolved: VICTOR KALU"\n}'
    t_resolve = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(resolve_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(resolve_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_resolve.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_resolve)
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>5.4 Request Withdrawal (`POST /api/driver/withdraw`)</b>", h2_style))
    with_req = '{\n  "amount": 10000.00,\n  "bank_name": "Guaranty Trust Bank (GTBank)",\n  "bank_code": "058",\n  "account_number": "0123456789",\n  "account_name": "VICTOR KALU",\n  "notes": "Weekly earnings withdrawal"\n}'
    with_res = '{\n  "message": "Withdrawal request submitted successfully.",\n  "payout": {\n    "payout_ref": "PAY-MNFY-99201",\n    "amount": 10000.00,\n    "bank_name": "Guaranty Trust Bank (GTBank)",\n    "account_number": "0123456789",\n    "account_name": "VICTOR KALU",\n    "status": "pending"\n  },\n  "remaining_available_balance": 6500.00\n}'
    t_with = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (201 Created)</b>", bold_body_style)],
        [Paragraph(with_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(with_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_with.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_with)
    story.append(Spacer(1, 6))

    # SECTION 6: PUSH NOTIFICATIONS & IN-APP ALERTS
    story.append(Paragraph("6. Push Notifications & In-App Feed System", h1_style))
    story.append(Paragraph("<b>6.1 Register Device Push Token (`POST /api/driver/device-token`)</b>", h2_style))
    story.append(Paragraph("Registers the mobile device's Expo or Firebase (FCM) push token so the server can push delivery alerts when the app is in the background.", body_style))
    
    token_req = '{\n  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",\n  "platform": "expo",\n  "device_info": { "os": "iOS 17.4", "model": "iPhone 15 Pro" }\n}'
    token_res = '{\n  "status": "success",\n  "message": "Device push token registered successfully"\n}'
    t_token = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (200 OK)</b>", bold_body_style)],
        [Paragraph(token_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(token_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_token.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_token)
    story.append(Spacer(1, 4))

    story.append(Paragraph("<b>6.2 Fetch In-App Notifications (`GET /api/driver/notifications`)</b>", h2_style))
    notif_res = """{
  "status": "success",
  "total": 14,
  "unread_count": 2,
  "notifications": [
    { "id": 101, "title": "New Dispatch Assigned", "body": "Order #BEMS-9901 is ready for pickup at Hub.", "type": "dispatch", "is_read": false, "created_at": "2026-09-21T10:05:00Z" },
    { "id": 98, "title": "Withdrawal Approved", "body": "₦10,000.00 has been paid to your GTBank account.", "type": "payout", "is_read": true, "created_at": "2026-09-20T16:20:00Z" }
  ]
}"""
    story.append(Paragraph(notif_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 6))

    # SECTION 7: MID-TRIP INCIDENT & PROBLEM REPORTING
    story.append(Paragraph("7. Mid-Trip Incident & Problem Reporting", h1_style))
    story.append(Paragraph("<b>7.1 Report Delivery Problem (`POST /api/driver/deliveries/:orderId/report-issue`)</b>", h2_style))
    story.append(Paragraph("Allows drivers to open an operational problem ticket directly with dispatch when encountering issues on the road.", body_style))
    
    inc_req = '{\n  "issue_type": "customer_unreachable",\n  "description": "Called customer 4 times, phone switched off at gate.",\n  "latitude": 9.0765,\n  "longitude": 7.3986,\n  "photo_urls": ["https://api.bemsfarms.com/uploads/proofs/gate_photo.jpg"]\n}'
    inc_res = '{\n  "status": "success",\n  "message": "Incident report submitted to dispatch operations",\n  "incident": {\n    "incident_ref": "INC-MNFY-7712",\n    "issue_type": "customer_unreachable",\n    "status": "open"\n  }\n}'
    t_inc = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (201 Created)</b>", bold_body_style)],
        [Paragraph(inc_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(inc_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_inc.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_inc)
    story.append(Spacer(1, 6))

    # SECTION 8: 1-TAP EMERGENCY SOS / PANIC ALERTS
    story.append(Paragraph("8. Emergency SOS / Safety Panic System", h1_style))
    story.append(Paragraph("<b>8.1 Trigger Emergency SOS (`POST /api/driver/emergency`)</b>", h2_style))
    story.append(Paragraph("High-priority safety endpoint that instantly alerts the Operations Control Room with the driver's exact coordinates and vehicle details.", body_style))
    
    sos_req = '{\n  "latitude": 9.0765,\n  "longitude": 7.3986,\n  "address": "Maitama Junction, Near Transcorp Hilton",\n  "battery_level": 42,\n  "emergency_type": "vehicle_accident",\n  "notes": "Rear-ended by another vehicle, need immediate assistance."\n}'
    sos_res = '{\n  "status": "success",\n  "message": "🚨 Emergency SOS alert activated. Dispatch Operations team has been notified immediately.",\n  "emergency": {\n    "emergency_ref": "SOS-MNFY-9910",\n    "status": "active"\n  }\n}'
    t_sos = Table([
        [Paragraph("<b>Request Payload</b>", bold_body_style), Paragraph("<b>Success Response (201 Created)</b>", bold_body_style)],
        [Paragraph(sos_req.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(sos_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[240, 300])
    t_sos.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    story.append(t_sos)
    story.append(Spacer(1, 6))

    # SECTION 9: PERFORMANCE SCORECARD & RATINGS
    story.append(Paragraph("9. Driver Performance Scorecard & Customer Ratings", h1_style))
    story.append(Paragraph("<b>9.1 Get Performance Scorecard (`GET /api/driver/stats`)</b>", h2_style))
    
    stats_res = """{
  "status": "success",
  "scorecard": {
    "customer_rating": 4.92,
    "total_ratings_count": 84,
    "acceptance_rate": 97.5,
    "on_time_delivery_rate": 98.2,
    "total_km_driven": 412.80
  },
  "deliveries_summary": {
    "completed_today": 6,
    "completed_this_week": 28,
    "completed_this_month": 112,
    "total_completed": 112
  },
  "badges": [
    { "id": "top_rated", "name": "Top Rated Star", "earned": true, "icon": "⭐" },
    { "id": "century_rider", "name": "100 Deliveries Club", "earned": true, "icon": "🏆" },
    { "id": "speedy_courier", "name": "Fast Dispatcher", "earned": true, "icon": "⚡" }
  ]
}"""
    story.append(Paragraph(stats_res.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 6))

    # SECTION 10: ZONE RATE CARD
    story.append(Paragraph("10. Zone-Based Compensation Rate Schedule (Zones 1–6)", h1_style))
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
    story.append(Spacer(1, 6))

    # SECTION 11: MOBILE IMPLEMENTATION CHECKLIST
    story.append(Paragraph("11. Mobile Client Engineering Checklist", h1_style))
    chk_items = [
        "<b>1. Secure Storage:</b> Store the JWT token securely using <code>SecureStore</code> (Expo) / <code>EncryptedSharedPreferences</code> (Android) / <code>Keychain</code> (iOS).",
        "<b>2. Push Token Registration:</b> Call <code>POST /api/driver/device-token</code> upon app launch and notification permission grant.",
        "<b>3. Background GPS Streaming:</b> When duty state is online (<code>is_available: true</code>), stream GPS coordinates to <code>POST /api/driver/location</code> every 10–15s.",
        "<b>4. Navigation Deep Linking:</b> Deep-link customer coordinates to Google Maps (<code>geo:${lat},${lng}?q=${lat},${lng}</code>) or Apple Maps (<code>maps://?daddr=${lat},${lng}</code>).",
        "<b>5. Direct Customer Contact:</b> Provide 1-tap dialer (<code>tel:${phone}</code>) and WhatsApp quick chat (<code>https://wa.me/234${phone}</code>).",
        "<b>6. Live Bank Validation:</b> Call <code>POST /api/driver/bank/resolve</code> dynamically upon entering 10 digits in the withdrawal modal to preview verified account name.",
        "<b>7. POD Camera Capture:</b> Upload handover pictures via <code>POST /api/driver/upload/proof</code> prior to calling <code>PATCH /status</code> with status `delivered`.",
        "<b>8. 1-Tap SOS Button:</b> Provide a persistent SOS panic button on active delivery screens linking to <code>POST /api/driver/emergency</code>."
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
