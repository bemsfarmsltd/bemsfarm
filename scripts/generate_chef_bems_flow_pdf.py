#!/usr/bin/env python3
"""
BEMS FARMS — CHEF BEMS AI CHAT & ADD-TO-CART ARCHITECTURE SPECIFICATION (PDF GENERATOR)
Publication-grade engineering guide explaining the multi-turn conversational lifecycle,
backend bridge, webhook contract, and automatic cart injection.
"""

import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

PRIMARY = colors.HexColor("#0D9488")      # Teal 600
PRIMARY_DARK = colors.HexColor("#115E59") # Teal 800
SECONDARY = colors.HexColor("#0F172A")    # Slate 900
ACCENT = colors.HexColor("#F59E0B")       # Amber 500
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
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(PRIMARY_DARK)
        self.drawString(36, 758, "BEMS FARMS — CHEF BEMS AI CHAT & ADD-TO-CART SPECIFICATION")
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawRightString(576, 758, "Version 2.0 • AI Automation & Full-Stack Alignment")
        
        self.setStrokeColor(BORDER_COL)
        self.setLineWidth(0.75)
        self.line(36, 752, 576, 752)

        self.line(36, 36, 576, 36)
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(36, 26, "© 2026 Bems Farms Ltd. • Confidential Engineering Guide")
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
        fontSize=14,
        leading=17,
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
        spaceAfter=4
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=13,
        textColor=PRIMARY_DARK,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
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
        leading=8,
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
    story.append(Paragraph("👨‍🍳 Bems Farms — Chef Bems AI Chat & Add-to-Cart Flow Specification", title_style))
    story.append(Paragraph("Engineering Reference: Multi-Turn Conversational Lifecycle, Webhook Contract & Auto-Cart Injection", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=4))

    # Architecture Overview Summary Box
    meta_data = [
        [
            Paragraph("<b>Client Trigger:</b> Web Chat Widget & `/chef-bems` Page", body_style),
            Paragraph("<b>Backend Bridge:</b> Express API (`POST /api/ai/chef-chat`)", body_style)
        ],
        [
            Paragraph("<b>n8n AI Webhook:</b> `https://n8n.srv1987482.hstgr.cloud/webhook/chef-bems`", body_style),
            Paragraph("<b>Cart Mechanism:</b> Client-Side React `CartContext` Auto-Injection", body_style)
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

    # SECTION 1: SYSTEM TOPOLOGY & BRIDGE ARCHITECTURE
    story.append(Paragraph("1. System Topology & Three-Tier Architecture", h1_style))
    story.append(Paragraph("Chef Bems does not speak directly to the frontend. The Express backend acts as the secure, authenticated bridge in the middle to protect API keys, prevent browser CORS errors, record audits, and enable instant local AI failover.", body_style))
    story.append(Spacer(1, 3))

    arch_data = [
        [
            Paragraph("<b>1. Customer Frontend</b>", bold_body_style),
            Paragraph("<b>2. Bems Farms Backend</b>", bold_body_style),
            Paragraph("<b>3. n8n AI Automation Agent</b>", bold_body_style)
        ],
        [
            Paragraph("• React Web & Mobile Chat UI<br/>• Attaches JWT Bearer Auth<br/>• Manages active `CartContext`<br/>• Displays real-time toast & badge", body_style),
            Paragraph("• Verifies customer identity (ID, email)<br/>• Forwards prompt + history to n8n<br/>• Saves conversation log & audits<br/>• Auto-fails over to Gemini if offline", body_style),
            Paragraph("• Processes prompt with LLM<br/>• Maintains contextual memory<br/>• Detects 'Add to Cart' intents<br/>• Returns structured `recipeBundle`", body_style)
        ]
    ]
    t_arch = Table(arch_data, colWidths=[180, 180, 180])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 6))

    # SECTION 2: MULTI-TURN CONVERSATION & ADD-TO-CART LIFECYCLE
    story.append(Paragraph("2. Multi-Turn Conversational Lifecycle & Add-to-Cart Stages", h1_style))
    story.append(Paragraph("Customers engage in natural discussions (asking questions, modifying portions, discussing dietary health) across several rounds before explicitly deciding to add ingredients to their cart.", body_style))
    story.append(Spacer(1, 3))

    stages_data = [
        [Paragraph("<b>Stage & Turn</b>", bold_body_style), Paragraph("<b>Customer Message & Discussion</b>", bold_body_style), Paragraph("<b>n8n AI Behavior & Response</b>", bold_body_style), Paragraph("<b>Cart State</b>", bold_body_style)],
        [
            Paragraph("<b>Stage 1: Discovery</b><br/>(Round 1)", bold_body_style),
            Paragraph("<i>'What healthy soup can I cook for a diabetic family member?'</i>", body_style),
            Paragraph("Suggests Okro or Afang Soup due to low glycemic index and high fiber. Gives general nutritional advice.", body_style),
            Paragraph("<font color='#64748B'>No Action</font><br/>Cart remains 🛒 0", body_style)
        ],
        [
            Paragraph("<b>Stage 2: Refinement</b><br/>(Round 2)", bold_body_style),
            Paragraph("<i>'How do I make the Okro Soup for 5 people? Can I use Catfish instead of beef?'</i>", body_style),
            Paragraph("Refines recipe for 5 persons. Explains steps for preparing fresh Catfish and Ugu leaves. Preserves history.", body_style),
            Paragraph("<font color='#64748B'>No Action</font><br/>Cart remains 🛒 0", body_style)
        ],
        [
            Paragraph("<b>Stage 3: Cart Trigger</b><br/>(Round 3)", bold_body_style),
            Paragraph("<i>'Awesome! Please add all those ingredients to my cart now.'</i>", body_style),
            Paragraph("AI detects <b>Add to Cart Intent</b>. Sets <code>action: 'AUTO_ADD_TO_CART'</code> and returns 4 catalog items in JSON.", body_style),
            Paragraph("<font color='#10B981'><b>AUTO-INJECT</b></font><br/>Cart: 🛒 0 ➔ <b>🛒 4 (₦13,500)</b>", body_style)
        ]
    ]
    t_stages = Table(stages_data, colWidths=[90, 160, 200, 90])
    t_stages.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('BACKGROUND', (0,1), (-1,1), BLUE_BG),
        ('BACKGROUND', (0,2), (-1,2), WARN_BG),
        ('BACKGROUND', (0,3), (-1,3), SUCCESS_BG),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_stages)
    story.append(Spacer(1, 6))

    # SECTION 3: THE 3 ADD-TO-CART UI EXECUTION MODES
    story.append(Paragraph("3. The 3 Add-To-Cart UI Execution Modes", h1_style))
    story.append(Paragraph("Depending on the payload returned by n8n, the frontend handles cart operations in 3 versatile ways:", body_style))
    story.append(Spacer(1, 2))

    options_data = [
        [
            Paragraph("<b>Option</b>", bold_body_style),
            Paragraph("<b>Trigger Condition</b>", bold_body_style),
            Paragraph("<b>Frontend Behavior & UI Feedback</b>", bold_body_style)
        ],
        [
            Paragraph("<b>Option 1: 1-Click Bundle Card</b>", bold_body_style),
            Paragraph("`recipeBundle` returned with `action: null` or omitted.", body_style),
            Paragraph("Renders an interactive card with checkboxes for each ingredient. User can uncheck items they already own and tap <b>'🛒 Add Selected to Cart'</b>.", body_style)
        ],
        [
            Paragraph("<b>Option 2: Conversational Auto-Add</b>", bold_body_style),
            Paragraph("`action: 'AUTO_ADD_TO_CART'` in response.", body_style),
            Paragraph("Instantly adds all bundle items into active cart in the background. Shows animated toast: <i>'✨ Chef Bems added X items to your cart!'</i>.", body_style)
        ],
        [
            Paragraph("<b>Option 3: Instant Express Checkout</b>", bold_body_style),
            Paragraph("Customer taps <b>'⚡ Cook Tonight'</b> on Recipe Card.", body_style),
            Paragraph("Loads bundle items into cart and immediately redirects browser to `/checkout` for 1-step direct payment.", body_style)
        ]
    ]
    t_opt = Table(options_data, colWidths=[120, 150, 270])
    t_opt.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#E2E8F0")),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COL),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(t_opt)
    story.append(Spacer(1, 6))

    # SECTION 4: WEBHOOK JSON CONTRACTS (FOR AI ENGINEER)
    story.append(Paragraph("4. n8n Webhook Input & Output JSON Contracts", h1_style))
    story.append(Paragraph("<b>4.1 Payload Sent by Bems Farms Backend to n8n Webhook</b>", h2_style))
    in_json = """{
  "chatInput": "Awesome! Please add all those ingredients to my cart.",
  "message": "Awesome! Please add all those ingredients to my cart.",
  "userId": 42,
  "customerId": 42,
  "customerEmail": "ngozi@example.com",
  "sessionId": "user-42",
  "conversationHistory": [
    { "role": "user", "content": "What healthy soup can I cook for someone with high blood sugar?" },
    { "role": "assistant", "content": "I recommend Okro Soup! It is low in carbs and high in fiber." }
  ],
  "cartItems": [
    { "name": "Bems Brown Beans", "quantity": 1, "unit_price": 4500 }
  ]
}"""
    story.append(Paragraph(in_json.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 3))

    story.append(Paragraph("<b>4.2 Required JSON Output from n8n Workflow (To Trigger Cart Addition)</b>", h2_style))
    out_json = """{
  "reply": "I have added all 4 fresh ingredients for Okro Soup directly into your shopping cart!",
  "action": "AUTO_ADD_TO_CART",
  "recipeBundle": {
    "recipe_name": "Nutritious Okro Soup (Serves 5)",
    "servings": 5,
    "items": [
      { "name": "Fresh Okro Fingers", "quantity": 1, "unit": "1kg basket", "price": 2500 },
      { "name": "Fresh Catfish (Cleaned & Cut)", "quantity": 2, "unit": "1kg pack", "price": 6200 },
      { "name": "Pure Red Palm Oil", "quantity": 1, "unit": "1 Litre bottle", "price": 2800 },
      { "name": "Fresh Ugu Leaves (Pumpkin)", "quantity": 2, "unit": "1 bunch", "price": 2000 }
    ]
  }
}"""
    story.append(Paragraph(out_json.replace("\n", "<br/>").replace(" ", "&nbsp;"), code_style))
    story.append(Spacer(1, 6))

    # SECTION 5: ENGINEERING CHECKLIST FOR AI AUTOMATION TEAM
    story.append(Paragraph("5. AI Automation Engineering Checklist", h1_style))
    chk_items = [
        "<b>1. Webhook URL:</b> Configure webhook path on Hostinger Cloud to match <code>https://n8n.srv1987482.hstgr.cloud/webhook/chef-bems</code>.",
        "<b>2. Production Activation:</b> Ensure the workflow is toggled to <b>'Active'</b> in the top right corner of the n8n canvas.",
        "<b>3. Response Schema:</b> The final node in n8n must return JSON containing <code>reply</code>, <code>action</code>, and <code>recipeBundle</code>.",
        "<b>4. Intent Keyword Triggers:</b> Set <code>action: 'AUTO_ADD_TO_CART'</code> when user prompt contains: <i>'add to cart'</i>, <i>'buy these'</i>, <i>'put in cart'</i>, <i>'order ingredients'</i>.",
        "<b>5. Product Naming:</b> Match item names to Bems Farms catalog (e.g., <i>'Ofada Rice'</i>, <i>'Palm Oil'</i>, <i>'Brown Beans'</i>, <i>'Garri'</i>, <i>'Fresh Tomatoes'</i>)."
    ]
    for chk in chk_items:
        story.append(Paragraph(f"• {chk}", body_style))
        story.append(Spacer(1, 1.5))

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"✅ Generated Chef Bems Flow PDF successfully: {filename}")

if __name__ == "__main__":
    out = "BEMS_FARMS_CHEF_BEMS_ADD_TO_CART_FLOW.pdf"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    build_pdf(out)
