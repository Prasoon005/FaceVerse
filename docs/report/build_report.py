"""
Builds docs/FaceVerse_Project_Report.pdf (academic project report).

Fill in the DETAILS below (college, guide, roll number...) and run:
    python docs/report/build_report.py
Requires: pip install reportlab   (uses Segoe UI / Consolas from Windows, falls back to Helvetica)
"""

import os
from datetime import date

from reportlab.graphics.shapes import Drawing, Line, Polygon, Rect, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.tableofcontents import TableOfContents

# --------------------------------------------------------------------------------------------
# DETAILS: edit these, then re-run the script.
# --------------------------------------------------------------------------------------------
DETAILS = {
    "title": "FaceVerse",
    "subtitle": "A Privacy-First Multi-Modal Biometric Identity and Smart Attendance Platform",
    "author": "Prasoon Katiyar",
    "roll_no": "____________________",
    "degree": "Bachelor of Technology (Computer Science and Engineering)",
    "college": "____________________________________",
    "university": "____________________________________",
    "guide": "____________________",
    "guide_designation": "Assistant Professor, Department of CSE",
    "session": "2025 - 2026",
    "live_url": "https://face-verse-two.vercel.app",
    "repo_url": "https://github.com/Prasoon005/FaceVerse",
}

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "docs", "FaceVerse_Project_Report.pdf")

# --------------------------------------------------------------------------------------------
# Fonts and colours
# --------------------------------------------------------------------------------------------
FONT_DIR = r"C:\Windows\Fonts"
try:
    pdfmetrics.registerFont(TTFont("Body", os.path.join(FONT_DIR, "segoeui.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Bold", os.path.join(FONT_DIR, "segoeuib.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Italic", os.path.join(FONT_DIR, "segoeuii.ttf")))
    pdfmetrics.registerFont(TTFont("Body-Semi", os.path.join(FONT_DIR, "seguisb.ttf")))
    pdfmetrics.registerFont(TTFont("Mono", os.path.join(FONT_DIR, "consola.ttf")))
    pdfmetrics.registerFontFamily(
        "Body", normal="Body", bold="Body-Bold", italic="Body-Italic", boldItalic="Body-Bold"
    )
    BODY, BOLD, SEMI, ITALIC, MONO = "Body", "Body-Bold", "Body-Semi", "Body-Italic", "Mono"
except Exception:  # Not on Windows: built-in fonts.
    BODY, BOLD, SEMI, ITALIC, MONO = (
        "Helvetica",
        "Helvetica-Bold",
        "Helvetica-Bold",
        "Helvetica-Oblique",
        "Courier",
    )

INK = colors.HexColor("#1d1d1f")
MUTED = colors.HexColor("#6e6e73")
BLUE = colors.HexColor("#0071e3")
BLUE_SOFT = colors.HexColor("#e8f1fc")
PURPLE = colors.HexColor("#8944ab")
GREEN = colors.HexColor("#248a3d")
LINE = colors.HexColor("#d2d2d7")
ZEBRA = colors.HexColor("#f5f5f7")

# --------------------------------------------------------------------------------------------
# Styles
# --------------------------------------------------------------------------------------------
S = {
    "body": ParagraphStyle(
        "body", fontName=BODY, fontSize=10.5, leading=16, textColor=INK, alignment=TA_JUSTIFY,
        spaceAfter=7,
    ),
    "bullet": ParagraphStyle(
        "bullet", fontName=BODY, fontSize=10.5, leading=15.5, textColor=INK, leftIndent=14,
        bulletIndent=2, spaceAfter=3,
    ),
    "h1": ParagraphStyle(
        "h1", fontName=BOLD, fontSize=22, leading=28, textColor=INK, spaceBefore=0, spaceAfter=14,
    ),
    "h2": ParagraphStyle(
        "h2", fontName=BOLD, fontSize=14, leading=19, textColor=INK, spaceBefore=12, spaceAfter=6,
    ),
    "h3": ParagraphStyle(
        "h3", fontName=SEMI, fontSize=11.5, leading=16, textColor=BLUE, spaceBefore=8,
        spaceAfter=4,
    ),
    "eyebrow": ParagraphStyle(
        "eyebrow", fontName=SEMI, fontSize=9, leading=12, textColor=BLUE, spaceAfter=2,
    ),
    "caption": ParagraphStyle(
        "caption", fontName=ITALIC, fontSize=9, leading=12, textColor=MUTED, alignment=TA_CENTER,
        spaceBefore=4, spaceAfter=12,
    ),
    "cell": ParagraphStyle("cell", fontName=BODY, fontSize=9, leading=12.5, textColor=INK),
    "cellb": ParagraphStyle("cellb", fontName=SEMI, fontSize=9, leading=12.5, textColor=INK),
    "head": ParagraphStyle("head", fontName=SEMI, fontSize=8.5, leading=11, textColor=colors.white),
    "code": ParagraphStyle(
        "code", fontName=MONO, fontSize=8.6, leading=12, textColor=INK, backColor=ZEBRA,
        borderPadding=(6, 8, 6, 8), spaceBefore=4, spaceAfter=10, leftIndent=4, rightIndent=4,
    ),
    "center": ParagraphStyle(
        "center", fontName=BODY, fontSize=11, leading=17, textColor=INK, alignment=TA_CENTER,
    ),
    "toc1": ParagraphStyle("toc1", fontName=SEMI, fontSize=11, leading=20, leftIndent=0),
    "toc2": ParagraphStyle(
        "toc2", fontName=BODY, fontSize=10, leading=16, leftIndent=18, textColor=MUTED
    ),
}


def P(text, style="body"):
    return Paragraph(text, S[style])


def bullets(items):
    return [Paragraph(t, S["bullet"], bulletText="\u2022") for t in items]


def table(rows, widths, header=True, zebra=True):
    data = []
    for i, row in enumerate(rows):
        style = "head" if (header and i == 0) else "cell"
        data.append([c if not isinstance(c, str) else Paragraph(c, S[style]) for c in row])
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0)
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("LINEBELOW", (0, 0), (-1, -1), 0.4, LINE),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), INK)]
    if zebra:
        for r in range(1 if header else 0, len(rows)):
            if r % 2 == 0:
                cmds.append(("BACKGROUND", (0, r), (-1, r), ZEBRA))
    t.setStyle(TableStyle(cmds))
    return t


# --------------------------------------------------------------------------------------------
# Diagrams (drawn, so they stay sharp)
# --------------------------------------------------------------------------------------------
def box(d, x, y, w, h, title, lines=(), fill=BLUE_SOFT, stroke=BLUE):
    d.add(Rect(x, y, w, h, rx=8, ry=8, fillColor=fill, strokeColor=stroke, strokeWidth=0.8))
    d.add(String(x + w / 2, y + h - 15, title, fontName=SEMI, fontSize=9.5, fillColor=INK,
                 textAnchor="middle"))
    for i, ln in enumerate(lines):
        d.add(String(x + w / 2, y + h - 29 - i * 11.5, ln, fontName=BODY, fontSize=7.8,
                     fillColor=MUTED, textAnchor="middle"))


def arrow(d, x1, y1, x2, y2, label=None, color=INK):
    d.add(Line(x1, y1, x2, y2, strokeColor=color, strokeWidth=1))
    import math

    a = math.atan2(y2 - y1, x2 - x1)
    s = 6
    d.add(Polygon([x2, y2, x2 - s * math.cos(a - 0.4), y2 - s * math.sin(a - 0.4),
                   x2 - s * math.cos(a + 0.4), y2 - s * math.sin(a + 0.4)],
                  fillColor=color, strokeColor=color))
    if label:
        d.add(String((x1 + x2) / 2, (y1 + y2) / 2 + 4, label, fontName=BODY, fontSize=7.5,
                     fillColor=MUTED, textAnchor="middle"))


def architecture_diagram():
    d = Drawing(460, 250)
    box(d, 0, 140, 140, 100, "Browser (client)",
        ["Camera / microphone", "Next.js React UI", "Glass design system"])
    box(d, 0, 10, 140, 100, "Web Workers",
        ["Human: face 1024-d", "WavLM: voice 512-d", "Liveness, quality"], fill=colors.HexColor("#f3e8fa"),
        stroke=PURPLE)
    box(d, 175, 75, 120, 100, "Next.js on Vercel",
        ["Server Components", "Server Actions", "API routes, proxy.ts"], fill=ZEBRA, stroke=MUTED)
    box(d, 330, 10, 130, 230, "Supabase",
        ["Auth (email, Google)", "Postgres + pgvector", "match_faces, verify_face",
         "Row Level Security", "Storage (private)", "Realtime"], fill=colors.HexColor("#e9f7ee"),
        stroke=GREEN)
    arrow(d, 70, 140, 70, 112, "frames")
    arrow(d, 140, 60, 175, 105, "embeddings")
    arrow(d, 140, 190, 175, 150, "requests")
    arrow(d, 295, 125, 330, 125, "SQL / RPC")
    arrow(d, 330, 210, 142, 222, "realtime events")
    return d


def attendance_flow_diagram():
    d = Drawing(460, 120)
    steps = [
        ("Open page", "own phone"),
        ("Liveness", "blink, turn"),
        ("Face vector", "Web Worker"),
        ("Location", "if geofence on"),
        ("Verify", "score >= 0.65"),
        ("Record", "in/out, late"),
    ]
    w, gap = 70, 8
    for i, (t, sub) in enumerate(steps):
        x = i * (w + gap)
        box(d, x, 30, w, 62, t, [sub])
        if i < len(steps) - 1:
            arrow(d, x + w, 61, x + w + gap, 61)
    d.add(String(230, 8, "Every step runs on the device except the final verification and write.",
                 fontName=ITALIC, fontSize=8, fillColor=MUTED, textAnchor="middle"))
    return d


def er_diagram():
    d = Drawing(460, 210)
    ents = [
        (0, 120, "profiles", ["id, full_name, role", "phone, department"]),
        (160, 120, "people", ["owner_id, linked_user_id", "approval_status, locked"]),
        (320, 120, "face/voice_embeddings", ["person_id", "vector(1024 / 512)"]),
        (0, 10, "attendance", ["user_id, day", "check_in_at, check_out_at"]),
        (160, 10, "absence_reviews / leave", ["user_id, day(s)", "status, reason"]),
        (320, 10, "holidays / settings", ["day, name", "work days, rules, geofence"]),
    ]
    for x, y, t, l in ents:
        box(d, x, y, 140, 72, t, l, fill=colors.white, stroke=INK)
    arrow(d, 140, 156, 160, 156, "1 : n")
    arrow(d, 300, 156, 320, 156, "1 : n")
    arrow(d, 70, 120, 70, 82, "1 : n")
    arrow(d, 140, 46, 160, 46)
    d.add(String(230, 200, "Simplified: see supabase/migrations for every table and policy.",
                 fontName=ITALIC, fontSize=8, fillColor=MUTED, textAnchor="middle"))
    return d


# --------------------------------------------------------------------------------------------
# Document template with header/footer and a table of contents
# --------------------------------------------------------------------------------------------
class ReportDoc(BaseDocTemplate):
    def __init__(self, path):
        super().__init__(
            path, pagesize=A4, leftMargin=22 * mm, rightMargin=22 * mm, topMargin=24 * mm,
            bottomMargin=22 * mm, title=f"{DETAILS['title']}: Project Report",
            author=DETAILS["author"], subject=DETAILS["subtitle"],
        )
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="f")
        self.addPageTemplates([
            PageTemplate(id="cover", frames=[frame], onPage=self._cover),
            PageTemplate(id="front", frames=[frame], onPage=self._front),
            PageTemplate(id="main", frames=[frame], onPage=self._main),
        ])

    main_start = None
    _chapter = None

    def beforeDocument(self):
        # multiBuild runs several passes; page numbering must restart each time.
        self.main_start = None
        self._chapter = None

    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph) or self.pageTemplate.id != "main":
            return
        name = flowable.style.name
        if name == "eyebrow" and flowable.getPlainText().startswith("CHAPTER"):
            self._chapter = flowable.getPlainText().split()[-1]
            return
        if name not in ("h1", "h2"):
            return
        level = 0 if name == "h1" else 1
        text = flowable.getPlainText()
        if level == 0 and self._chapter:
            text = f"{self._chapter}. {text}"
            self._chapter = None
        key = f"k{self.seq.nextf('toc')}"
        self.canv.bookmarkPage(key)
        self.canv.addOutlineEntry(text, key, level=level, closed=level > 0)
        self.notify("TOCEntry", (level, text, self.page - (self.main_start or 1) + 1, key))

    def _cover(self, c, doc):
        w, h = A4
        c.saveState()
        c.setFillColor(colors.HexColor("#f5f5f7"))
        c.rect(0, 0, w, h, fill=1, stroke=0)
        c.setFillColor(BLUE)
        c.rect(0, h - 10 * mm, w, 10 * mm, fill=1, stroke=0)
        c.restoreState()

    def _front(self, c, doc):
        c.saveState()
        c.setFont(BODY, 8.5)
        c.setFillColor(MUTED)
        c.drawCentredString(A4[0] / 2, 12 * mm, self._roman(doc.page))
        c.restoreState()

    def _main(self, c, doc):
        if self.main_start is None:
            self.main_start = doc.page
        w, h = A4
        c.saveState()
        c.setStrokeColor(LINE)
        c.setLineWidth(0.5)
        c.line(22 * mm, h - 15 * mm, w - 22 * mm, h - 15 * mm)
        c.setFont(BODY, 8.5)
        c.setFillColor(MUTED)
        c.drawString(22 * mm, h - 12.5 * mm, "FaceVerse: Project Report")
        c.drawRightString(w - 22 * mm, h - 12.5 * mm, DETAILS["author"])
        c.line(22 * mm, 16 * mm, w - 22 * mm, 16 * mm)
        c.drawRightString(w - 22 * mm, 11 * mm, f"Page {doc.page - self.main_start + 1}")
        c.drawString(22 * mm, 11 * mm, DETAILS["session"])
        c.restoreState()

    @staticmethod
    def _roman(n):
        vals = [(10, "x"), (9, "ix"), (5, "v"), (4, "iv"), (1, "i")]
        out = ""
        for v, s in vals:
            while n >= v:
                out += s
                n -= v
        return out


# --------------------------------------------------------------------------------------------
# Content
# --------------------------------------------------------------------------------------------
def chapter(story, number, title):
    story.append(PageBreak())
    story.append(P(f"CHAPTER {number}", "eyebrow"))
    story.append(P(title, "h1"))


def build():
    D = DETAILS
    story = []

    # ---------------- Cover ----------------
    story += [
        Spacer(1, 30 * mm),
        P("PROJECT REPORT", "eyebrow"),
        Paragraph(D["title"], ParagraphStyle("t", fontName=BOLD, fontSize=44, leading=50,
                                             textColor=INK)),
        Spacer(1, 4),
        Paragraph(D["subtitle"], ParagraphStyle("st", fontName=BODY, fontSize=15, leading=21,
                                                textColor=MUTED)),
        Spacer(1, 22 * mm),
        Paragraph(f"Submitted in partial fulfilment of the requirements for the degree of<br/>"
                  f"<b>{D['degree']}</b>", ParagraphStyle("c1", fontName=BODY, fontSize=11,
                                                          leading=17, textColor=INK)),
        Spacer(1, 12 * mm),
    ]
    cover_rows = [
        ["Submitted by", f"<b>{D['author']}</b><br/>Roll No.: {D['roll_no']}"],
        ["Under the guidance of", f"<b>{D['guide']}</b><br/>{D['guide_designation']}"],
        ["Institution", f"{D['college']}<br/>{D['university']}"],
        ["Session", D["session"]],
        ["Live application", D["live_url"]],
        ["Source code", D["repo_url"]],
    ]
    story.append(table(cover_rows, [42 * mm, 120 * mm], header=False, zebra=False))
    story.append(NextPageTemplate("front"))

    # ---------------- Certificate ----------------
    story += [PageBreak(), P("Certificate", "h1"), Spacer(1, 6)]
    story.append(P(
        f"This is to certify that the project report entitled <b>\"{D['title']}: "
        f"{D['subtitle']}\"</b> submitted by <b>{D['author']}</b> (Roll No. {D['roll_no']}) "
        f"in partial fulfilment of the requirements for the award of the degree of "
        f"<b>{D['degree']}</b> is a record of bona fide work carried out under my supervision "
        f"during the session {D['session']}."))
    story.append(P("The matter embodied in this report has not been submitted elsewhere for the "
                   "award of any other degree or diploma."))
    story += [Spacer(1, 30 * mm)]
    story.append(table([
        ["<b>Project Guide</b><br/><br/><br/>____________________<br/>" + D["guide"],
         "<b>Head of Department</b><br/><br/><br/>____________________<br/>Department of CSE"],
    ], [83 * mm, 83 * mm], header=False, zebra=False))

    # ---------------- Declaration & Acknowledgement ----------------
    story += [PageBreak(), P("Declaration", "h1")]
    story.append(P(
        f"I hereby declare that the work presented in this report, entitled \"{D['title']}\", "
        "is my own and has been carried out by me. Wherever I have used material (open-source "
        "libraries, models, documentation) from other sources, it has been duly acknowledged in "
        "the references."))
    story += [Spacer(1, 14 * mm), P(f"<b>{D['author']}</b><br/>Date: {date.today():%d %B %Y}")]
    story += [Spacer(1, 14 * mm), P("Acknowledgement", "h1")]
    story.append(P(
        f"I would like to express my sincere gratitude to my guide, <b>{D['guide']}</b>, for the "
        "guidance and encouragement throughout this project, and to the Head of Department and "
        "faculty members for their support. I am also thankful to the open-source community "
        "behind Next.js, Supabase, Human, Transformers.js and the many libraries this work "
        "builds upon, and to my friends and family for testing the application on their "
        "devices."))

    # ---------------- Abstract ----------------
    story += [PageBreak(), P("Abstract", "h1")]
    story.append(P(
        "Organisations still rely on registers, ID cards and fingerprint machines to identify "
        "people and record attendance. These methods are slow, easy to misuse (proxy attendance) "
        "and, in the case of shared fingerprint scanners, unhygienic. Cloud face-recognition "
        "services solve some of these problems but require uploading people's faces to a third "
        "party, which raises serious privacy concerns."))
    story.append(P(
        "<b>FaceVerse</b> is a web-based, privacy-first, multi-modal biometric identity platform "
        "that runs face and voice recognition <b>entirely on the user's device</b>. Faces are "
        "converted into 1024-dimensional embeddings by the Human library (WebGL/WASM) and voices "
        "into 512-dimensional speaker embeddings by a WavLM model through Transformers.js, both "
        "inside Web Workers. Only these numeric vectors are stored in a PostgreSQL database with "
        "the pgvector extension, protected by Row Level Security, and matched with cosine "
        "similarity."))
    story.append(P(
        "On top of this identity layer the system provides passwordless biometric login with a "
        "liveness challenge, face-based attendance with late marks, leave, holidays, absence "
        "reasons and a configurable deduction score, an office geofence, a shared kiosk mode, a "
        "smart visitor log, an event photo finder, announcements and real-time messaging. A "
        "separate admin console offers approvals, analytics, exports (CSV and PDF) and an audit "
        "log. The application is built with Next.js 16, TypeScript, Tailwind CSS and Supabase, "
        "is installable as a Progressive Web App, and is deployed on free tiers (Vercel and "
        "Supabase). 137 automated unit tests, linting and type checking run on every change."))
    story.append(P("<b>Keywords:</b> face recognition, speaker verification, biometrics, on-device "
                   "AI, attendance system, pgvector, Next.js, Supabase, privacy by design."))

    # ---------------- Table of contents ----------------
    story += [PageBreak(), P("Contents", "h1")]
    toc = TableOfContents()
    toc.levelStyles = [S["toc1"], S["toc2"]]
    toc.dotsMinLevel = 0
    story.append(toc)
    story.append(NextPageTemplate("main"))

    # ================= Chapter 1 =================
    chapter(story, 1, "Introduction")
    story.append(P("1.1 Background", "h2"))
    story.append(P(
        "Identity verification is part of everyday life: entering an office or hostel, marking "
        "attendance, signing in to an application or finding oneself in event photographs. "
        "Biometrics, measurable physical or behavioural traits such as the face and the voice, "
        "make these interactions faster because the person themselves is the credential. Recent "
        "advances in browser technology (WebGL, WebAssembly, Web Workers) now allow deep learning "
        "models to run directly on phones and laptops, which makes it possible to build biometric "
        "systems that never send raw images or audio to a server."))
    story.append(P("1.2 Problem statement", "h2"))
    story += bullets([
        "Manual registers and ID cards are slow and allow proxy attendance.",
        "Fingerprint devices are costly, shared by everyone (hygiene) and tied to one location.",
        "Cloud face-recognition APIs require uploading faces and incur recurring cost.",
        "Existing tools rarely combine identity, attendance, leave, approvals and communication in "
        "one place with clear rules for late arrivals and absences.",
    ])
    story.append(P("1.3 Objectives", "h2"))
    story += bullets([
        "Run face and voice recognition fully on the device, storing only embeddings.",
        "Provide secure sign-in options: email/password, Google and opt-in biometric login.",
        "Build a face-based attendance system with liveness, late marks, leave, holidays, "
        "absence reasons and a transparent, configurable score.",
        "Give administrators a separate console for approvals, analytics, reports and messaging.",
        "Enforce privacy and security with Row Level Security, consent, data export and deletion.",
        "Deliver a modern, responsive and accessible interface that works on phones, tablets and "
        "desktops, at zero hosting cost.",
    ])
    story.append(P("1.4 Scope", "h2"))
    story.append(P(
        "The system targets small and medium organisations such as colleges, hostels, offices and "
        "housing societies. It is a web application, so any modern browser on Android, iOS, "
        "Windows or macOS can use it without installing native software. Biometric verification "
        "is positioned as a convenient, demo-grade second factor rather than a replacement for "
        "bank-grade security; password and Google sign-in always remain available."))

    # ================= Chapter 2 =================
    chapter(story, 2, "Literature Survey and Technology Review")
    story.append(P("2.1 Existing systems", "h2"))
    story.append(table([
        ["System", "Approach", "Limitations"],
        ["Paper register / ID card", "Manual signature or card swipe", "Slow, proxy attendance, no analytics"],
        ["Fingerprint terminal", "Dedicated hardware at the door", "Cost, hygiene, single location, vendor lock-in"],
        ["Cloud face APIs", "Images uploaded to a provider", "Privacy risk, recurring cost, internet dependent"],
        ["QR / OTP attendance", "Code scanned on a phone", "Codes can be shared, no identity proof"],
        ["<b>FaceVerse</b>", "On-device face + voice, embeddings only", "Browser liveness is demo-grade (see Chapter 8)"],
    ], [38 * mm, 58 * mm, 70 * mm]))
    story.append(P("2.2 Face recognition", "h2"))
    story.append(P(
        "Modern face recognition maps a face image to a fixed-length embedding vector such that "
        "images of the same person lie close together. FaceVerse uses <b>Human</b> by Vladimir "
        "Mandic, which bundles face detection, a 468-point mesh, iris tracking, emotion and a "
        "<b>1024-dimensional descriptor</b>. Two embeddings are compared with cosine similarity; "
        "after L2-normalisation this is a simple dot product, which pgvector can index."))
    story.append(P("2.3 Speaker verification", "h2"))
    story.append(P(
        "Speaker verification decides whether two recordings come from the same speaker. "
        "<b>WavLM</b> is a self-supervised speech model; its speaker-verification head "
        "(Xenova/wavlm-base-plus-sv) outputs a 512-dimensional x-vector. Transformers.js runs the "
        "ONNX version in the browser. Audio is resampled to 16 kHz and silence-trimmed, and at "
        "least two seconds of speech are required."))
    story.append(P("2.4 Liveness detection", "h2"))
    story.append(P(
        "To resist photo or video replay, the user must complete random challenges: blink, turn "
        "the head left or right, or smile. These are detected from the face mesh (eye aspect "
        "ratio, yaw angle and mouth shape) frame by frame."))
    story.append(P("2.5 Technology stack", "h2"))
    story.append(table([
        ["Layer", "Technology", "Why it was chosen"],
        ["Framework", "Next.js 16 (App Router), React 19, TypeScript strict", "Server Components, Server Actions, fast routing, type safety"],
        ["Styling", "Tailwind CSS v4, shadcn/ui (Radix), Geist font", "Accessible primitives, design tokens, dark and light themes"],
        ["Motion", "Framer Motion", "Smooth, interruptible animations that respect reduced motion"],
        ["Face AI", "@vladmandic/human in a Web Worker", "Runs on WebGL/WASM, rich face analysis, no server GPU"],
        ["Voice AI", "Transformers.js (WavLM) in a Web Worker", "Speaker embeddings in the browser"],
        ["Database", "Supabase Postgres + pgvector", "Vector similarity search with SQL and Row Level Security"],
        ["Auth / Storage / Live", "Supabase Auth, Storage, Realtime", "Email, Google OAuth, private buckets, live updates"],
        ["State and forms", "TanStack Query, Zustand, react-hook-form, zod", "Caching, small client state, validated forms"],
        ["Charts", "Recharts", "Composable charts, validated colourblind-safe palette"],
        ["Testing / CI", "Vitest, Testing Library, GitHub Actions", "Unit tests, lint, format and type checks on every push"],
        ["Hosting", "Vercel Hobby, Supabase Free", "Zero cost, global CDN, automatic deploys"],
    ], [28 * mm, 62 * mm, 76 * mm]))

    # ================= Chapter 3 =================
    chapter(story, 3, "System Requirements and Analysis")
    story.append(P("3.1 Hardware requirements", "h2"))
    story.append(table([
        ["Component", "Minimum", "Recommended"],
        ["Device", "Phone, tablet or laptop with a browser", "Mid-range phone or laptop (2020+)"],
        ["Camera", "Front camera, 640x480", "720p front camera"],
        ["Microphone", "Built-in (only for voice features)", "Headset or good built-in mic"],
        ["Memory", "3 GB RAM", "4 GB RAM or more"],
        ["Network", "Internet for sign-in and sync", "Broadband; models are cached after first load"],
    ], [34 * mm, 64 * mm, 68 * mm]))
    story.append(P("3.2 Software requirements", "h2"))
    story += bullets([
        "Users: Chrome, Edge, Safari or Firefox (latest two versions); camera and location "
        "permissions when used.",
        "Development: Node.js 20.9+, npm, Git, a Supabase project, a code editor.",
        "Deployment: Vercel (frontend and server), Supabase (database, auth, storage, realtime).",
    ])
    story.append(P("3.3 Functional requirements", "h2"))
    story.append(table([
        ["ID", "Requirement"],
        ["FR-1", "Users can sign up and sign in with email/password or Google; email confirmation shows a confirmation page."],
        ["FR-2", "Users can enroll their face (guided, quality-checked) and optionally their voice; the identity is locked after confirmation."],
        ["FR-3", "Admins approve enrollments and identity change requests."],
        ["FR-4", "Users can opt in to biometric login: liveness, face and voice verified by the server, rate-limited."],
        ["FR-5", "Users mark attendance with a face scan; first scan checks in, second checks out; late arrivals are detected."],
        ["FR-6", "Attendance can be restricted to a radius around the office (geofence); a kiosk mode serves a shared device."],
        ["FR-7", "Users request leave and explain absences or late days; admins decide; holidays never count as absences."],
        ["FR-8", "A deduction score is computed from configurable company rules."],
        ["FR-9", "Admins see analytics, a users-by-days report, and export CSV (daily, summary) and PDF."],
        ["FR-10", "Announcements, real-time member-admin messaging and notifications."],
        ["FR-11", "Live multi-face recognition, visitor log, event photo finder and privacy tools."],
        ["FR-12", "Users manage their profile, theme and accent colour, export or delete their biometric data."],
    ], [16 * mm, 150 * mm]))
    story.append(P("3.4 Non-functional requirements", "h2"))
    story += bullets([
        "<b>Privacy:</b> raw images and audio never leave the device; only embeddings are stored.",
        "<b>Security:</b> Row Level Security on every table, service-role access only after server "
        "checks, strict Content Security Policy and Permissions-Policy, audit logging.",
        "<b>Performance:</b> recognition in under one second on mid-range devices; heavy work in Web "
        "Workers keeps the interface responsive.",
        "<b>Usability and accessibility:</b> responsive layout, keyboard navigation, screen-reader "
        "labels, colour never the only signal, reduced-motion support.",
        "<b>Cost:</b> runs entirely on free tiers.",
        "<b>Maintainability:</b> TypeScript strict mode, linting, formatting and unit tests in CI.",
    ])

    # ================= Chapter 4 =================
    chapter(story, 4, "System Design")
    story.append(P("4.1 Architecture", "h2"))
    story.append(P(
        "FaceVerse follows a client-heavy architecture. All machine learning happens in the "
        "browser inside Web Workers. The Next.js server (on Vercel) renders pages, runs Server "
        "Actions and a few API routes that need the service role (attendance, kiosk, biometric "
        "login). Supabase provides authentication, the Postgres database with pgvector, private "
        "storage buckets and realtime change feeds."))
    story.append(KeepTogether([architecture_diagram(),
                               P("Figure 4.1: High-level architecture", "caption")]))
    story.append(P("4.2 Modules", "h2"))
    story.append(table([
        ["Module", "Responsibilities"],
        ["Authentication", "Sign-up, sign-in, Google OAuth, email confirmation, session refresh in proxy.ts, separate admin sign-in"],
        ["Identity", "Guided face capture with quality checks, optional voice, lock after confirmation, change requests"],
        ["Recognition engine", "Face detection, embeddings, liveness, multi-face tracking, matching through pgvector RPCs"],
        ["Attendance", "Self check-in/out, kiosk, geofence, late marks, holidays, leave, absence reviews, score, heatmap and streaks"],
        ["Admin console", "Overview with live activity, users and drawer, approvals, reports and exports, analytics, settings, audit log"],
        ["Communication", "Announcements, real-time messaging, notification bell, sound and visual cues"],
        ["Visitors and albums", "Visitor log with recognition of returning visitors; event photo finder with share links"],
        ["Privacy and settings", "Consent, export, delete biometrics, profile, appearance (theme, accent), security"],
        ["UI system", "Glass panels, floating sidebar and top bar, ambient backdrop, dark-mode glow, PWA, splash, tour"],
    ], [36 * mm, 130 * mm]))
    story.append(P("4.3 Database design", "h2"))
    story.append(P(
        "The schema is created by eleven SQL migrations. Every table has Row Level Security: "
        "members can read and write only their own rows, admins (checked by an "
        "<font face='%s'>is_admin()</font> security-definer function) can read everything, and "
        "database triggers stop members from approving their own identity." % MONO))
    story.append(KeepTogether([er_diagram(), P("Figure 4.2: Core entities (simplified)", "caption")]))
    story.append(table([
        ["Migration", "Main objects"],
        ["0001-0002", "Extensions, profiles, people, face/voice embeddings, recognition events, audit logs, RLS"],
        ["0003-0004", "match_faces, verify_face, verify_voice RPCs, avatars bucket, auth attempts"],
        ["0005-0006", "Approvals, attendance, absence reviews, settings, locked identity, change requests, announcements, leave"],
        ["0007-0008", "Visitor log and snapshots; office hours, late grace and deduction rules"],
        ["0009-0010", "Albums, photo faces, share links; member-admin messages"],
        ["0011", "Holidays, office geofence, phone and department on profiles"],
    ], [28 * mm, 138 * mm]))
    story.append(P("4.4 Attendance flow", "h2"))
    story.append(KeepTogether([attendance_flow_diagram(),
                               P("Figure 4.3: Face attendance sequence", "caption")]))
    story.append(P("4.5 Security design", "h2"))
    story += bullets([
        "The browser never receives the service-role key; privileged writes happen on the server "
        "only after <font face='%s'>requireAdmin()</font> or an equivalent check." % MONO,
        "Attendance and biometric login are re-verified on the server against the user's own "
        "approved embeddings; failed logins are rate-limited (5 per 15 minutes).",
        "Private storage buckets are read through short-lived signed URLs.",
        "HTTP headers: Content-Security-Policy, Permissions-Policy (camera, microphone, "
        "geolocation for the site only), Referrer-Policy and nosniff.",
        "Every admin action is written to an audit log.",
    ])

    # ================= Chapter 5 =================
    chapter(story, 5, "Implementation")
    story.append(P("5.1 Face pipeline", "h2"))
    story += bullets([
        "The camera stream is drawn to an offscreen frame and transferred to a Web Worker (via "
        "Comlink) running Human with a WebGL backend and a WASM fallback.",
        "Quality chips check face size, sharpness, pose, confidence and that only one face is "
        "present before auto-capture; three angles are captured at enrollment.",
        "Embeddings are L2-normalised and matched in Postgres with cosine similarity.",
    ])
    story.append(P(
        "Decision rule: a match requires similarity &#8805; <b>0.65</b> and a margin of at least "
        "<b>0.10</b> over the next-best person; scores between 0.55 and 0.65 are shown as "
        "uncertain. The thresholds were calibrated from real live-recognition scores (same person "
        "about 0.69-0.77, next best about 0.49-0.52)."))
    story.append(P("similarity(a, b) = (a \u00b7 b) / (|a| |b|)     decision = sim &#8805; 0.65 and "
                   "(sim - next_best) &#8805; 0.10", "code"))
    story.append(P("5.2 Voice pipeline", "h2"))
    story.append(P(
        "The microphone recorder shows a live waveform, resamples audio to 16 kHz and trims "
        "silence by energy. Challenge phrases (three random words and two digits) are checked "
        "with the Web Speech API where available. The WavLM embedding must reach a cosine "
        "similarity of <b>0.80</b>, calibrated from real logins with laptop microphones. Because "
        "speech recognition is unreliable on some Android devices, voice was made optional for "
        "identity and attendance."))
    story.append(P("5.3 Attendance rules and score", "h2"))
    story.append(P(
        "Each day is classified as present, late, absent, excused, on leave, holiday, pending, "
        "day off, today or upcoming. A check-in after the office start time plus the grace period "
        "is late. Approved leave and holidays never count as absences. The monthly score starts "
        "at a base and subtracts points per the company's rules:"))
    story.append(P("score = max(0, base - absent x d_absent - late x d_late - excused x d_excused "
                   "- late_excused x d_late_excused)     defaults: base 100, absent 10, late 2", "code"))
    story.append(P(
        "The office geofence uses the haversine formula on the phone's GPS position and allows "
        "up to 150 m of reported GPS uncertainty on top of the configured radius. The kiosk at "
        "the door is exempt."))
    story.append(P("5.4 Admin console and real-time features", "h2"))
    story.append(P(
        "Admin pages are Server Components that load data with the service role after an admin "
        "check, and mutations are Server Actions that write an audit entry and refresh the page. "
        "Supabase Realtime pushes changes to attendance, approvals, leave and messages; the "
        "overview shows a live activity feed and today's check-ins with avatar status rings. "
        "Reports can be exported as a daily CSV, a payroll-ready summary CSV or a printable PDF."))
    story.append(P("5.5 User interface", "h2"))
    story.append(P(
        "The interface follows an Apple-inspired glassmorphism design: frosted glass panels over "
        "a soft ambient colour field, Apple system colours (blue for members, purple for admins), "
        "a floating glass sidebar and top bar, and the Geist typeface. Glow effects are applied "
        "only in dark mode. Members can choose light, dark or automatic theme and one of seven "
        "accent colours. The app is a Progressive Web App with an install prompt, a splash "
        "screen, a first-visit welcome tour, a command palette (Ctrl + K), a mobile bottom tab "
        "bar, shimmer loading skeletons and friendly 404 and error pages. Every animation honours "
        "the operating system's reduced-motion setting."))
    story.append(P("5.6 Project statistics", "h2"))
    story.append(table([
        ["Metric", "Value"],
        ["Pages (routes)", "43 user, admin, auth and public pages"],
        ["API routes", "6 (attendance, kiosk attendance, biometric login, identity, share finder, health)"],
        ["React components", "about 160"],
        ["Database migrations", "11"],
        ["Automated unit tests", "137 across 17 suites"],
        ["Development history", "46 commits"],
    ], [50 * mm, 116 * mm]))

    # ================= Chapter 6 =================
    chapter(story, 6, "Testing")
    story.append(P("6.1 Strategy", "h2"))
    story.append(P(
        "Testing combined automated unit tests (Vitest and React Testing Library), static "
        "analysis (ESLint, TypeScript strict, Prettier) run in GitHub Actions on every push, a "
        "production build check, and manual testing on Android (Chrome), iOS (Safari) and "
        "Windows (Chrome, Edge) using per-phase checklists in docs/phases."))
    story.append(P("6.2 Automated test suites", "h2"))
    story.append(table([
        ["Suite", "What it verifies"],
        ["vector", "Normalisation, cosine similarity, pgvector serialisation"],
        ["liveness", "Blink, head-turn and smile challenge detection"],
        ["quality-tracker", "Capture quality gates and multi-face tracking"],
        ["biometric, phrase, audio", "Biometric decision rules, challenge phrases, resampling and silence trimming"],
        ["attendance-days, score", "Day classification, leave ranges, streaks, late minutes and deduction score"],
        ["holidays-streak, geo", "Holiday handling, best streak, password strength, haversine distance"],
        ["auth-validation, visitors", "Form validation, safe redirects, visitor helpers"],
        ["nav, command-menu, sound", "Navigation config, command palette rendering, sound feedback"],
        ["calibration, dashboard-format", "Threshold calibration helpers and formatting"],
    ], [48 * mm, 118 * mm]))
    story.append(P("6.3 Sample test cases", "h2"))
    story.append(table([
        ["#", "Test case", "Expected result", "Status"],
        ["TC1", "Sign up with email, open confirmation link on another device", "\"Email confirmed\" page with Continue to sign in", "Pass"],
        ["TC2", "Enroll face, confirm as final", "Identity locked; awaiting admin approval", "Pass"],
        ["TC3", "Mark attendance with approved face", "Check-in recorded; second scan checks out", "Pass"],
        ["TC4", "Attendance with a photo held to the camera", "Liveness challenge fails", "Pass"],
        ["TC5", "Check-in after start + grace", "Day shown as late; score reduced", "Pass"],
        ["TC6", "Workday added as a holiday", "Shown as holiday, not absent; no deduction", "Pass"],
        ["TC7", "Geofence on, check-in far from office", "Rejected with distance message", "Pass"],
        ["TC8", "Member opens an /admin URL", "404 (console not revealed)", "Pass"],
        ["TC9", "Six wrong biometric logins", "Account locked for 15 minutes", "Pass"],
        ["TC10", "Admin exports summary CSV and PDF", "Files contain totals per member", "Pass"],
        ["TC11", "UI on phone, tablet and desktop", "No horizontal scroll; bottom tab bar on phones", "Pass"],
    ], [12 * mm, 62 * mm, 72 * mm, 20 * mm]))
    story.append(P("6.4 Results", "h2"))
    story.append(P(
        "All 137 unit tests pass, the TypeScript and ESLint checks report no errors, and the "
        "production build succeeds. Issues found during manual testing, such as speech "
        "recognition returning nothing on Android, the email link falling back to localhost, and "
        "layout overflow on small phones, were fixed and are recorded in docs/CHANGELOG.md."))

    # ================= Chapter 7 =================
    chapter(story, 7, "Results and Discussion")
    story.append(P("7.1 Delivered features", "h2"))
    story.append(table([
        ["Phase", "Delivered"],
        ["1 Foundation", "Landing page, auth (email, Google), app shell, database with RLS, CI, health check"],
        ["2 Face engine", "Enrollment wizard, people directory, live multi-face recognition, liveness"],
        ["3 Voice", "Voice engine, challenge phrases, biometric login with server re-verification"],
        ["4A Admin + attendance", "Separate admin portal, locked identity, attendance, leave, announcements, kiosk"],
        ["4B Visitors and scoring", "Smart visitor log, late arrivals, reasons page, deduction score"],
        ["5-7 Extras", "Photo finder, privacy controls, tools, messaging, mobile fit"],
        ["UI and features", "Glass redesign, holidays, heatmap and streaks, exports, geofence, PWA, profile, accents"],
    ], [42 * mm, 124 * mm]))
    story.append(P("7.2 Discussion", "h2"))
    story.append(P(
        "Running recognition in the browser removed the need for GPU servers and kept the "
        "running cost at zero while preserving privacy. Calibrating thresholds with real scores "
        "was essential: the voice threshold suggested by the model card (0.86) rejected most "
        "genuine users on laptop microphones, so it was lowered to 0.80; for faces, the margin "
        "rule matters as much as the absolute threshold. Separating the admin console and "
        "locking identities closed the main abuse paths (approving oneself, swapping a face)."))
    story.append(P(
        "First use downloads about 12 MB of face models and about 100 MB for voice, after which "
        "the browser caches them. On mid-range phones a face check completes in under a second."))

    # ================= Chapter 8 =================
    chapter(story, 8, "Conclusion and Future Scope")
    story.append(P("8.1 Conclusion", "h2"))
    story.append(P(
        "FaceVerse shows that a complete biometric identity and attendance platform can be built "
        "with on-device AI and free cloud services, without sacrificing privacy. It replaces "
        "registers and fingerprint machines with a two-second face check on the user's own phone, "
        "applies fair and configurable attendance rules, and gives administrators real-time "
        "visibility, approvals and reports, all in a modern, accessible interface."))
    story.append(P("8.2 Limitations", "h2"))
    story += bullets([
        "Liveness runs on the client, so a determined attacker with a modified browser could "
        "bypass it; biometric login is therefore an opt-in convenience factor.",
        "Recognition accuracy depends on lighting, camera quality and pose.",
        "Free-tier limits (database size, storage, bandwidth) cap very large deployments.",
    ])
    story.append(P("8.3 Future scope", "h2"))
    story += bullets([
        "Server-side or hardware-backed liveness (depth, passive anti-spoofing models).",
        "Offline mode with a service worker and background sync for attendance.",
        "Group-photo auto-tagging and two-person verification for sensitive actions.",
        "Push notifications and reminders; shift scheduling and per-team rules.",
        "End-to-end tests with Playwright and load testing.",
        "Integration with payroll and HR systems through an API.",
    ])

    # ================= References =================
    story += [PageBreak(), P("References", "h1")]
    refs = [
        "V. Mandic, <i>Human: AI-powered 3D face detection and recognition</i>, "
        "github.com/vladmandic/human.",
        "S. Chen et al., \"WavLM: Large-Scale Self-Supervised Pre-Training for Full Stack Speech "
        "Processing\", IEEE JSTSP, 2022.",
        "Hugging Face, <i>Transformers.js documentation</i>, huggingface.co/docs/transformers.js.",
        "F. Schroff, D. Kalenichenko, J. Philbin, \"FaceNet: A Unified Embedding for Face "
        "Recognition and Clustering\", CVPR, 2015.",
        "J. Deng et al., \"ArcFace: Additive Angular Margin Loss for Deep Face Recognition\", "
        "CVPR, 2019.",
        "Vercel, <i>Next.js documentation</i>, nextjs.org/docs.",
        "Supabase, <i>Documentation: Auth, Database, Row Level Security, Realtime, Storage</i>, "
        "supabase.com/docs.",
        "pgvector, <i>Open-source vector similarity search for Postgres</i>, "
        "github.com/pgvector/pgvector.",
        "W3C, <i>Web Content Accessibility Guidelines (WCAG) 2.2</i>, w3.org/TR/WCAG22.",
        "OWASP, <i>Application Security Verification Standard</i>, owasp.org.",
    ]
    for i, r in enumerate(refs, 1):
        story.append(Paragraph(f"[{i}] {r}", ParagraphStyle(
            "ref", parent=S["body"], alignment=TA_LEFT, leftIndent=22, firstLineIndent=-22)))

    # ================= Appendix =================
    story += [PageBreak(), P("Appendix A: Application Routes", "h1")]
    story.append(table([
        ["Area", "Routes"],
        ["Public", "/ (landing), /login, /signup, /biometric-login, /auth/confirmed, /share/[code]"],
        ["Member", "/dashboard, /attendance, /leave, /reasons, /announcements, /messages, /identity, "
                   "/live, /people, /people/[id], /enroll, /visitors, /activity, /albums, /albums/[id], "
                   "/tools, /focus, /profile, /settings, /settings/security, /settings/privacy"],
        ["Admin", "/admin/login, /admin, /admin/analytics, /admin/kiosk, /admin/users, /admin/users/[id], "
                  "/admin/approvals, /admin/change-requests, /admin/visitors, /admin/attendance, "
                  "/admin/reviews, /admin/leaves, /admin/messages, /admin/announcements, /admin/audit, "
                  "/admin/settings, /admin/profile"],
        ["API", "/api/attendance, /api/kiosk/attendance, /api/biometric-login, /api/identity, "
                "/api/share/[code]/find, /api/health"],
    ], [24 * mm, 142 * mm]))
    story.append(P("Appendix B: Running the Project", "h1"))
    story.append(P("npm install<br/>cp .env.example .env.local   (add Supabase URL, anon key, "
                   "service role key, site URL)<br/>run supabase/migrations/0001 ... 0011 in the "
                   "SQL editor<br/>npm run dev   (http://localhost:3000)<br/>npm test   |   npm run "
                   "lint   |   npm run typecheck   |   npm run build", "code"))

    doc = ReportDoc(OUT)
    doc.multiBuild(story)
    print("Wrote", OUT)


if __name__ == "__main__":
    build()
