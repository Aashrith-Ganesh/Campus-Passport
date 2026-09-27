# HackBlitz

# Campus Passport

> One student identity. Real contributions. Real opportunities.

## Overview

Campus Passport is a unified student-centered campus platform built for **ALLEN Global HackBlitz 2.0**.

The idea is simple:

A student's campus journey should not be represented only by marks or attendance. What they learn, contribute, and improve should also become **verifiable achievements** that can unlock opportunities.

### Core Loop

**LEARN → CONTRIBUTE → IMPROVE → UNLOCK**

- **Learn** through Campus Lens
- **Contribute** through Campus Pulse
- **Improve** the campus through EcoPulse
- **Unlock opportunities** through Opportunity Wallet

---

# The Problem

Students interact with their campus through many disconnected systems.

Learning, school contributions, sustainability, and financial support are often treated as separate problems.

Campus Passport connects them into one system.

Instead of creating four independent applications, we are building one campus ecosystem where activity in one part of the system can create meaningful outcomes in another.

---

# The Four Missions

## 1. Campus Lens

### Learn

Campus Lens helps students understand academic concepts in the language they are most comfortable with.

A student can:

- Capture a textbook page
- Get the concept explained in Kannada or Hindi
- Generate a quiz
- Demonstrate their understanding
- Earn a verified learning achievement

### Beyond Translation

Campus Lens is not just a translation tool.

Campus data from EcoPulse can become learning material.

For example:

> "Your campus used 18% less electricity this month."

That real campus event can become the basis for a science lesson, explanation, or quiz.

The campus itself becomes part of the textbook.

---

# 2. Campus Pulse

### Contribute

Students often notice problems in school before administrators do.

Campus Pulse gives students a structured way to report and track those problems.

Examples:

- Broken equipment
- Water leaks
- Classroom issues
- Bus delays
- Attendance problems
- Other problems students actually encounter

Issues move through a simple lifecycle:

**Reported → Verified → Resolved**

For the HackBlitz mission, the system is also backed by real user research from students or staff.

A student's contribution can become a verified achievement on their Campus Passport.

---

# 3. EcoPulse

### Improve

EcoPulse makes the campus's environmental impact visible.

It provides:

- Energy monitoring
- Water monitoring
- Solar savings calculations
- Carbon tracking
- Class-level sustainability comparisons
- AI-generated saving suggestions

The important part is that environmental actions produce measurable evidence.

For example:

> A student reports a leaking tap.

The issue is processed through Campus Pulse.

EcoPulse can estimate the resulting water waste and, once resolved, show the potential savings.

That creates a connection between:

**Student action → Campus improvement → Measurable impact**

---

# 4. Opportunity Wallet

### Unlock

Opportunity Wallet addresses situations where students may need financial support despite their families not having traditional credit histories.

The HackBlitz scenario is a student who needs **₹2,000 for an Olympiad fee**.

Instead of relying on traditional credit history, Opportunity Wallet can use verified achievements from the Campus Passport as part of a **simulated eligibility system**.

Potential inputs include:

- Learning achievements
- Attendance
- School contributions
- Sustainability contributions

The result is an opportunity layer where achievement can help unlock support.

> **Important:** This is a hackathon simulation, not a real lending or financial-credit system.

---

# Campus Passport

Campus Passport is the central **identity and evidence layer** connecting the four products.

It records **evidence**, rather than reducing a student to one arbitrary "trust score."

Students build a living record of what they have:

- **Learned**
- **Contributed**
- **Improved**

Those verified achievements can then contribute to opportunities made available through Opportunity Wallet.

---

# System Architecture

Campus Passport is implemented as a unified web application.

The frontend is served directly by the FastAPI backend, allowing the entire application to run from a single origin.

```text
                         CAMPUS PASSPORT
                    Identity + Evidence Layer
                              │
             ┌────────────────┼────────────────┐
             │                │                │
             ▼                ▼                ▼
        CAMPUS LENS      CAMPUS PULSE       ECOPULSE
           LEARN           CONTRIBUTE         IMPROVE
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                    VERIFIED ACHIEVEMENTS
                              │
                              ▼
                         OPPORTUNITIES
                              │
                              ▼
                    OPPORTUNITY WALLET
```

### Application Architecture

```text
Browser
   │
   ▼
FastAPI Application
   │
   ├── Campus Passport Frontend
   │
   ├── Student APIs
   │
   ├── Teacher APIs
   │
   ├── Rewards & Deductions
   │
   ├── NFC Transactions
   │
   ├── Campus Lens AI APIs
   │
   └── Database
```

The frontend and backend are therefore distributed as a single application rather than requiring separate frontend and backend servers.

---

# Technology Stack

### Frontend

- HTML
- CSS
- JavaScript
- Campus Passport / Student Pocket interface

### Backend

- Python
- FastAPI
- Uvicorn
- Pydantic
- SQLAlchemy

### Database

- SQLite

### AI

- Groq API
- Campus Lens AI analysis
- AI-generated explanations and quizzes

### Architecture

- REST APIs
- Single-origin frontend + backend deployment
- Environment-based API key configuration

---

# Core Backend APIs

The application exposes APIs for the major Campus Passport functions.

### Health

```text
GET /health
```

### Students

```text
GET /api/students
GET /api/students/{id}
GET /api/student/{id}/balance
GET /api/student/{id}/transactions
GET /api/student/{id}/cards
```

### Teacher

```text
GET /api/teacher/rewards/categories
POST /api/rewards
POST /api/deductions
```

### NFC

```text
POST /api/nfc/tap
```

### Campus Lens

```text
GET /api/campus-lens/status
POST /api/campus-lens/analyze
POST /api/campus-lens/quiz
POST /api/campus-lens/quiz/submit
POST /api/campus-lens/teacher-report
```

---

# Project Structure

```text
Campus-Passport/
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── models.py
│   │   ├── ...
│   │   └── routes/
│   │       ├── campus_lens.py
│   │       ├── student_pocket.py
│   │       └── ...
│   │
│   ├── static/
│   │   └── index.html
│   │
│   ├── requirements.txt
│   ├── .env.example
│   └── run.sh
│
├── Start Campus Passport.bat
│
└── README.md
```

---

# Running the Application

## Windows

The Windows version includes an automated launcher.

Extract the project and double-click:

```text
Start Campus Passport.bat
```

The launcher automatically:

- Detects Python
- Creates the virtual environment
- Installs dependencies
- Configures the Python import path
- Creates `.env` from `.env.example` if required
- Starts the FastAPI server
- Opens the application in the default browser

The application will be available at:

```text
http://localhost:8000/
```

### Groq API Key

Campus Lens AI requires a Groq API key.

Create:

```text
backend/.env
```

from:

```text
backend/.env.example
```

and configure:

```text
GROQ_API_KEY=your_api_key_here
```

Do not commit `.env` or API keys to Git.

---

## macOS / Linux

From the `backend` directory:

```bash
./run.sh
```

Then open:

```text
http://localhost:8000/
```

---

# Demo Credentials

### Student

```text
Student ID: STU001
```

### Teacher

```text
Teacher ID: TCH-001
```

### PIN

```text
1234
```

These credentials are for the hackathon demonstration environment.

---

# Evidence-Based Student Identity

Campus Passport is designed around an important distinction:

> **Evidence is more useful than a single arbitrary score.**

A student's record can contain multiple forms of verified evidence:

```text
                    STUDENT
                       │
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
       LEARNING    CONTRIBUTION   IMPACT
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
             VERIFIED ACHIEVEMENTS
                       │
                       ▼
                  OPPORTUNITIES
```

This allows a student's broader campus participation to become part of their identity.

---

# Core Philosophy

Campus Passport is built around four principles:

### 1. Learn

Academic understanding should be accessible and personalized.

### 2. Contribute

Students should have a structured way to participate in improving their campus.

### 3. Improve

Student actions should create measurable real-world impact.

### 4. Unlock

Verified achievements should create pathways to opportunities.

---

# HackBlitz Vision

Campus Passport turns everyday student activity into a connected evidence system.

A student does not simply attend school and receive marks.

They can:

**Learn something → contribute something → improve something → prove it → unlock an opportunity.**

That is the Campus Passport.
