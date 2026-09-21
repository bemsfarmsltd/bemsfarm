#!/usr/bin/env python3
"""
BEMS FARMS — CHEF BEMS FLOWCHART & WEBHOOK SPECIFICATION (PDF GENERATOR)
Publication-grade visual flowchart with graphical process cards, visual step badges,
flow connectors, and side-by-side JSON webhook contracts.
"""

import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

# Palette definition
PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#115E59") # Teal 800
SECONDARY = colors.HexColor("#0F172A")    # Slate 900
TEXT_MAIN = colors.HexColor("#334155")    # Slate 700
BORDER_COL = colors.HexColor("#CBD5E1")   # Slate 300
CODE_BG = colors.HexColor("#F8FAFC")      # Slate 50

# Stage Colors
DISCOVERY_BG = colors.HexColor("#F0F9FF")   # Sky 50
DISCOVERY_BORDER = colors.HexColor("#BAE6FD")

REFINEMENT_BG = colors.HexColor("#FEFCE8")  # Yellow 50
REFINEMENT_BORDER = colors.HexColor("#FEF08A")

CART_BG = colors.HexColor("#ECFDF5")        # Emerald 50
CART_BORDER = colors.HexColor("#A7F3D0")

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
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — CHEF BEMS AI VISUAL FLOWCHART & SPECIFICATION")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "Visual Engineering Flowchart • Page " + str(self._pageNumber) + f" of {page_count}")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)

        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "© 2026 Bems Farms Ltd. • AI Automation & Cart Integration")
        self.drawRightString(576, 26, "Confidential Engineering Specification")
        self.restoreState()

def build_pdf(filename="BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"):
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
        fontSize=13,
        leading=16,
        textColor=PRIMARY_DARK,
        spaceAfter=2
    )
    
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=11.5,
        textColor=PRIMARY_DARK,
        spaceBefore=4,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=TEXT_MAIN
    )

    bold_body_style = ParagraphStyle(
        'BoldBody_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7,
        leading=9,
        textColor=SECONDARY
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=6,
        leading=7.5,
        textColor=colors.HexColor("#0F172A"),
        backColor=CODE_BG,
        borderColor=BORDER_COL,
        borderWidth=0.5,
        borderPadding=2.5,
        spaceBefore=1,
        spaceAfter=1
    )

    story = []

    # Title & Header
    story.append(Paragraph("👨‍🍳 Chef Bems AI — Visual Flowchart & Webhook Architecture", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=3))

    # WEBHOOK TARGET BOX (Top Banner)
    wb_box = [
        [
            Paragraph("<b>Production n8n Webhook Target:</b>", bold_body_style),
            Paragraph("<b>Trigger Method:</b>", bold_body_style)
        ],
        [
            Paragraph("<code>https://n8n.srv1987482.hstgr.cloud/webhook/chef-bems</code>", ParagraphStyle('WbCode', parent=code_style, fontSize=7, leading=9, textColor=PRIMARY_DARK)),
            Paragraph("<code>POST (Content-Type: application/json)</code>", ParagraphStyle('WbCode2', parent=code_style, fontSize=7, leading=9))
        ]
    ]
    t_wb = Table(wb_box, colWidths=[370, 170])
    t_wb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_wb)
    story.append(Spacer(1, 3))

    # SECTION 1: THREE-TIER VISUAL ARCHITECTURE FLOWCHART
    story.append(Paragraph("1. System Architecture & Topology Flowchart", h1_style))
    
    tier_rows = [
        [
            Paragraph("<b>CLIENT TIER</b><br/><font color='#0D9488'><b>React Web / Mobile</b></font>", ParagraphStyle('T1H', parent=bold_body_style, alignment=1)),
            Paragraph("<font size=12 color='#0D9488'><b>➔</b></font><br/><font size=5.5 color='#64748B'>1. POST</font>", ParagraphStyle('Arr1', alignment=1)),
            Paragraph("<b>BACKEND BRIDGE</b><br/><font color='#115E59'><b>Express API Server</b></font>", ParagraphStyle('T2H', parent=bold_body_style, alignment=1)),
            Paragraph("<font size=12 color='#0D9488'><b>➔</b></font><br/><font size=5.5 color='#64748B'>2. Forward</font>", ParagraphStyle('Arr2', alignment=1)),
            Paragraph("<b>AI ENGINE</b><br/><font color='#047857'><b>Timi's n8n Agent</b></font>", ParagraphStyle('T3H', parent=bold_body_style, alignment=1)),
        ],
        [
            Paragraph("• User types prompt<br/>• Attaches JWT token<br/>• Holds active `CartContext`<br/>• Real-time toast & badge", ParagraphStyle('T1B', parent=body_style, fontSize=6.5, leading=8)),
            Paragraph("<font size=12 color='#0D9488'><b>⬅</b></font><br/><font size=5.5 color='#64748B'>4. Injects Cart</font>", ParagraphStyle('Arr1b', alignment=1)),
            Paragraph("• Verifies user identity<br/>• Injects user & cart context<br/>• Logs DB conversation<br/>• Local Gemini fallback", ParagraphStyle('T2B', parent=body_style, fontSize=6.5, leading=8)),
            Paragraph("<font size=12 color='#0D9488'><b>⬅</b></font><br/><font size=5.5 color='#64748B'>3. JSON Reply</font>", ParagraphStyle('Arr2b', alignment=1)),
            Paragraph("• Processes LLM prompt<br/>• Retains chat memory<br/>• Detects cart intent<br/>• Formats `recipeBundle`", ParagraphStyle('T3B', parent=body_style, fontSize=6.5, leading=8)),
        ]
    ]
    t_topo = Table(tier_rows, colWidths=[150, 45, 150, 45, 150])
    t_topo.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (0,-1), colors.HexColor("#F0FDF4")),
        ('BACKGROUND', (2,0), (2,-1), colors.HexColor("#F8FAFC")),
        ('BACKGROUND', (4,0), (4,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (0,-1), 1, colors.HexColor("#BBF7D0")),
        ('BOX', (2,0), (2,-1), 1, BORDER_COL),
        ('BOX', (4,0), (4,-1), 1, colors.HexColor("#99F6E4")),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 3),
        ('RIGHTPADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_topo)
    story.append(Spacer(1, 4))

    # SECTION 2: MULTI-TURN CONVERSATION & ADD-TO-CART FLOWCHART
    story.append(Paragraph("2. Multi-Turn Conversational Lifecycle & Add-to-Cart Flowchart", h1_style))

    # CARD 1: STAGE 1 DISCOVERY
    card1_data = [
        [
            Paragraph("<font color='#0369A1'><b>STAGE 1: MEAL EXPLORATION & DISCOVERY (ROUND 1)</b></font>", ParagraphStyle('St1H', parent=bold_body_style, fontSize=7.5, leading=9.5)),
            Paragraph("<font color='#64748B'>Cart Status: <b>🛒 0 items (₦0)</b></font>", ParagraphStyle('St1C', parent=bold_body_style, alignment=2))
        ],
        [
            Paragraph("<b>👤 Customer:</b> <i>'What healthy Nigerian soup can I cook for someone managing blood sugar?'</i><br/>"
                      "<b>👨‍🍳 Chef Bems:</b> <i>'I recommend Okro Soup or Afang Soup! They are rich in fiber and have a low glycemic index. Which one would you prefer?'</i>", body_style),
            Paragraph("<font color='#0284C7'><b>Normal Chat Advice</b><br/>• History logged<br/>• Cart untouched</font>", ParagraphStyle('St1R', parent=body_style, fontSize=6.5, leading=8, alignment=1))
        ]
    ]
    t_c1 = Table(card1_data, colWidths=[400, 140])
    t_c1.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), DISCOVERY_BG),
        ('BOX', (0,0), (-1,-1), 1, DISCOVERY_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, DISCOVERY_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_c1)
    story.append(Spacer(1, 1))

    # CONNECTOR 1
    story.append(Paragraph("<font color='#64748B' size=9><b>⬇  Customer continues conversation & refines recipe options</b></font>", ParagraphStyle('C1', alignment=1)))
    story.append(Spacer(1, 1))

    # CARD 2: STAGE 2 REFINEMENT
    card2_data = [
        [
            Paragraph("<font color='#A16207'><b>STAGE 2: RECIPE REFINEMENT & SUBSTITUTIONS (ROUND 2)</b></font>", ParagraphStyle('St2H', parent=bold_body_style, fontSize=7.5, leading=9.5)),
            Paragraph("<font color='#64748B'>Cart Status: <b>🛒 0 items (₦0)</b></font>", ParagraphStyle('St2C', parent=bold_body_style, alignment=2))
        ],
        [
            Paragraph("<b>👤 Customer:</b> <i>'How do I make the Okro Soup for 5 people? Can I use fresh Catfish instead of beef?'</i><br/>"
                      "<b>👨‍🍳 Chef Bems:</b> <i>'Yes! Fresh Catfish pairs wonderfully with Okro and Ugu leaves. Here is the step-by-step preparation for 5 servings...'</i>", body_style),
            Paragraph("<font color='#D97706'><b>Context Retained</b><br/>• Scaled to 5 servings<br/>• Catfish substituted</font>", ParagraphStyle('St2R', parent=body_style, fontSize=6.5, leading=8, alignment=1))
        ]
    ]
    t_c2 = Table(card2_data, colWidths=[400, 140])
    t_c2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), REFINEMENT_BG),
        ('BOX', (0,0), (-1,-1), 1, REFINEMENT_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, REFINEMENT_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_c2)
    story.append(Spacer(1, 1))

    # CONNECTOR 2
    story.append(Paragraph("<font color='#10B981' size=9><b>⬇  Customer reaches purchase decision & explicitly triggers intent</b></font>", ParagraphStyle('C2', alignment=1)))
    story.append(Spacer(1, 1))

    # CARD 3: STAGE 3 CART TRIGGER
    card3_data = [
        [
            Paragraph("<font color='#047857'><b>STAGE 3: THE 'ADD TO CART' INTENT TRIGGER (ROUND 3)</b></font>", ParagraphStyle('St3H', parent=bold_body_style, fontSize=7.5, leading=9.5)),
            Paragraph("<font color='#10B981'><b>⚡ Cart Updated: 🛒 4 items (₦13,500)</b></font>", ParagraphStyle('St3C', parent=bold_body_style, alignment=2))
        ],
        [
            Paragraph("<b>👤 Customer:</b> <i>'Awesome! Please add all those ingredients to my cart now.'</i><br/>"
                      "<b>👨‍🍳 Chef Bems:</b> <i>'I have added all 4 fresh ingredients for Okro Soup directly to your shopping cart!'</i><br/>"
                      "<font color='#047857'><b>⚡ System Action:</b> `action: 'AUTO_ADD_TO_CART'` ➔ Injects [Okro, Catfish, Palm Oil, Ugu] ➔ Shows Toast ➔ Updates Cart Badge</font>", body_style),
            Paragraph("<font color='#047857'><b>Automatic Cart Injection</b><br/>• 1kg Okro (₦2,500)<br/>• 2x Catfish (₦6,200)<br/>• 1L Palm Oil (₦2,800)<br/>• 2x Ugu (₦2,000)</font>", ParagraphStyle('St3R', parent=body_style, fontSize=6.5, leading=8, alignment=1))
        ]
    ]
    t_c3 = Table(card3_data, colWidths=[400, 140])
    t_c3.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), CART_BG),
        ('BOX', (0,0), (-1,-1), 1, CART_BORDER),
        ('LINEBELOW', (0,0), (-1,0), 0.5, CART_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_c3)
    story.append(Spacer(1, 4))

    # SECTION 3: WEBHOOK REQUEST & RESPONSE JSON CONTRACTS
    story.append(Paragraph("3. Webhook Request & Response JSON Contracts", h1_style))
    
    in_sample = """// A. Payload Sent by Bems Farms Backend to n8n:
{
  "chatInput": "Add all those ingredients to my cart.",
  "message": "Add all those ingredients to my cart.",
  "userId": 42,
  "customerId": 42,
  "customerEmail": "customer@example.com",
  "sessionId": "user-42",
  "conversationHistory": [
    { "role": "user", "content": "How do I make Okro soup for 5 people?" },
    { "role": "assistant", "content": "Use 1kg Okro and 2 fresh Catfish..." }
  ],
  "cartItems": []
}"""

    out_sample = """// B. Required JSON Returned by n8n (To Add to Cart):
{
  "reply": "I have added all 4 fresh ingredients for Okro Soup directly into your shopping cart!",
  "action": "AUTO_ADD_TO_CART",
  "recipeBundle": {
    "recipe_name": "Nutritious Okro Soup (Serves 5)",
    "servings": 5,
    "items": [
      { "name": "Fresh Okro", "quantity": 1, "unit": "1kg", "price": 2500 },
      { "name": "Fresh Catfish", "quantity": 2, "unit": "1kg", "price": 6200 },
      { "name": "Pure Palm Oil", "quantity": 1, "unit": "1 Litre", "price": 2800 },
      { "name": "Fresh Ugu Leaves", "quantity": 2, "unit": "1 bunch", "price": 2000 }
    ]
  }
}"""

    t_contracts = Table([
        [Paragraph("<b>1. Webhook Input Payload (From Backend)</b>", bold_body_style), Paragraph("<b>2. Webhook Output Payload (From n8n)</b>", bold_body_style)],
        [Paragraph(in_sample.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style), Paragraph(out_sample.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style)]
    ], colWidths=[270, 270])
    t_contracts.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_contracts)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Visual Flowchart PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
