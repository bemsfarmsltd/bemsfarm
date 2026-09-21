#!/usr/bin/env python3
"""
BEMS FARMS — CHEF BEMS FLOW DIAGRAM & WEBHOOK SPECIFICATION (PDF GENERATOR)
Clean, concise 2-page engineering sheet containing ONLY:
1. The Webhook Endpoint URL
2. The System Architecture Diagram
3. The Multi-Turn Chat & Add-to-Cart Sequence Diagram
4. The Exact Webhook Request & Response JSON Contracts
"""

import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.pdfgen import canvas

PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#115E59") # Teal 800
SECONDARY = colors.HexColor("#0F172A")    # Slate 900
TEXT_MAIN = colors.HexColor("#334155")    # Slate 700
BORDER_COL = colors.HexColor("#CBD5E1")   # Slate 300
CODE_BG = colors.HexColor("#F8FAFC")      # Slate 50
SUCCESS_BG = colors.HexColor("#ECFDF5")   # Emerald 50
WARN_BG = colors.HexColor("#FEF9C3")      # Yellow 50
BLUE_BG = colors.HexColor("#EFF6FF")      # Blue 50

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
        self.drawString(36, 758, "BEMS FARMS — CHEF BEMS DIAGRAM & WEBHOOK SPECIFICATION")
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "Engineering Reference Sheet")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)

        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "© 2026 Bems Farms Ltd. • AI Automation & Cart Integration")
        self.drawRightString(576, 26, f"Page {self._pageNumber} of {page_count}")
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
        fontSize=15,
        leading=18,
        textColor=PRIMARY_DARK,
        spaceAfter=2
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
        fontSize=8,
        leading=10.5,
        textColor=TEXT_MAIN
    )

    bold_body_style = ParagraphStyle(
        'BoldBody_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=SECONDARY
    )

    code_style = ParagraphStyle(
        'Code_Custom',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0F172A"),
        backColor=CODE_BG,
        borderColor=BORDER_COL,
        borderWidth=0.5,
        borderPadding=3,
        spaceBefore=1,
        spaceAfter=2
    )

    diag_style = ParagraphStyle(
        'Diag_Custom',
        parent=styles['Normal'],
        fontName='Courier-Bold',
        fontSize=6.8,
        leading=8.2,
        textColor=colors.HexColor("#0F172A"),
        backColor=CODE_BG,
        borderColor=colors.HexColor("#99F6E4"),
        borderWidth=1,
        borderPadding=5,
        spaceBefore=2,
        spaceAfter=4
    )

    story = []

    # Title & Webhook Banner
    story.append(Paragraph("👨‍🍳 Chef Bems AI — Flow Diagram & Webhook Contract", title_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=4))

    # WEBHOOK TARGET BOX
    wb_box = [
        [
            Paragraph("<b>Production n8n Webhook URL:</b>", bold_body_style),
            Paragraph("<b>Trigger Method:</b>", bold_body_style)
        ],
        [
            Paragraph("<code>https://n8n.srv1987482.hstgr.cloud/webhook/chef-bems</code>", ParagraphStyle('WbCode', parent=code_style, fontSize=8, leading=10, textColor=PRIMARY_DARK)),
            Paragraph("<code>POST (Content-Type: application/json)</code>", ParagraphStyle('WbCode2', parent=code_style, fontSize=8, leading=10))
        ]
    ]
    t_wb = Table(wb_box, colWidths=[360, 180])
    t_wb.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F0FDFA")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#99F6E4")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CCFBF1")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_wb)
    story.append(Spacer(1, 4))

    # DIAGRAM 1: THREE-TIER SYSTEM ARCHITECTURE
    story.append(Paragraph("1. Three-Tier System Architecture Diagram", h1_style))
    
    diag_1 = """                    THE REQUEST (GOING OUT)
  [ Customer Frontend ] ─────────────► [ Bems Farms Backend ] ─────────────► [ Timi's n8n Chef Bems ]
     1. User types prompt                2. Checks login auth                  3. LLM processes prompt
        & attaches JWT token                & passes user ID + cart               & selects ingredients

                    THE RESPONSE (COMING BACK)
  [ Customer Frontend ] ◄───────────── [ Bems Farms Backend ] ◄───────────── [ Timi's n8n Chef Bems ]
     6. Renders recipe reply             5. Saves chat to DB                   4. Returns JSON with:
     7. Auto-injects items to cart          & forwards response                   • Recipe text
     8. Updates Badge: 🛒 0 ➔ 🛒 4                                                • Ingredient items
                                                                                  • "AUTO_ADD_TO_CART" """
    
    story.append(Paragraph(diag_1.replace("\n", "<br/>").replace(" ", "&nbsp;"), diag_style))
    story.append(Spacer(1, 4))

    # DIAGRAM 2: MULTI-TURN CONVERSATION & ADD-TO-CART LIFECYCLE
    story.append(Paragraph("2. Multi-Turn Conversation & Add-to-Cart Flow Diagram", h1_style))

    diag_2 = """┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: GENERAL DISCOVERY (NORMAL CHAT)                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
 [ Customer ] ─── "What healthy soup can I cook for high blood sugar?" ───► [ Backend ➔ n8n ]
                                                                                   │
 [ Customer ] ◄── "I recommend Okro or Afang Soup with high fiber..." ◄────────────┘
                            (Normal Chat Advice • Cart is Untouched)

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  STAGE 2: RECIPE REFINEMENT & SUBSTITUTIONS (NORMAL CHAT)              │
└────────────────────────────────────────────────────────────────────────────────────────┘
 [ Customer ] ─── "How do I make Okro Soup for 5 people? Can I use Catfish?" ─► [ Backend ➔ n8n ]
                                                                                   │
 [ Customer ] ◄── "Yes! Use 1kg Okro and 2 fresh Catfish. Here are the steps..." ◄┘
                   (Cooking Steps Given • Conversation History Preserved)

┌────────────────────────────────────────────────────────────────────────────────────────┐
│                  STAGE 3: THE "ADD TO CART" INTENT TRIGGER                             │
└────────────────────────────────────────────────────────────────────────────────────────┘
 [ Customer ] ─── "Awesome! Add all those ingredients to my cart now." ───► [ Backend ➔ n8n ]
                                                                                   │
                                                                                   ▼
                                                                           [ Timi's n8n AI ]
                                                                             • Detects "Add to Cart"
                                                                             • Sets AUTO_ADD_TO_CART
                                                                             • Attaches 4 Products
                                                                                   │
 [ Customer ] ◄── Returns: Recipe + [ Okro, Catfish, Palm Oil, Ugu ] ◄─────────────┘
      │
      ├─► 1. Chat displays: "I've added the 4 ingredients directly to your cart!"
      ├─► 2. Frontend CartContext auto-injects [Okro, Catfish, Palm Oil, Ugu]
      ├─► 3. Green Toast pops up: "✨ 4 items added to your cart!"
      └─► 4. Navbar Cart Badge updates: 🛒 0 ➔ 🛒 4 (₦13,500) """

    story.append(Paragraph(diag_2.replace("\n", "<br/>").replace(" ", "&nbsp;"), diag_style))
    story.append(Spacer(1, 4))

    # SECTION 3: WEBHOOK CONTRACTS (INPUT & OUTPUT)
    story.append(Paragraph("3. Webhook Input & Output JSON Specifications", h1_style))
    
    in_sample = """// A. What Bems Farms Backend Sends to n8n:
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

    out_sample = """// B. What Timi's n8n Webhook Must Return (To Add Items to Cart):
{
  "reply": "I've added all 4 fresh ingredients for Okro Soup directly to your cart!",
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
    print(f"✅ Generated Diagram & Webhook PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
