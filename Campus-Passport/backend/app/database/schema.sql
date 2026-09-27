PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. STUDENTS
-- Canonical student table shared by every module.
-- =========================================================
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    class_name TEXT NOT NULL,
    preferred_language TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 2. ACHIEVEMENTS
-- Shared evidence of learning and contribution.
-- =========================================================
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    type TEXT NOT NULL
        CHECK (type IN ('LEARNING', 'CONTRIBUTION')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    evidence TEXT,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
);

-- =========================================================
-- 3. OPPORTUNITIES
-- Opportunity Wallet catalogue.
-- =========================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL,
    category TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================
-- 4. OPPORTUNITY APPLICATIONS
-- Connects students to opportunities.
-- =========================================================
CREATE TABLE IF NOT EXISTS opportunity_applications (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    opportunity_id TEXT NOT NULL,
    status TEXT NOT NULL,
    amount INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id),

    FOREIGN KEY (opportunity_id)
        REFERENCES opportunities(id)
);

-- =========================================================
-- 5. POINT TRANSACTIONS
-- Points are ledger transactions, not a manually editable total.
-- =========================================================
CREATE TABLE IF NOT EXISTS point_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL,
    achievement_id INTEGER,
    points INTEGER NOT NULL,
    reason TEXT NOT NULL,
    source TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id),

    FOREIGN KEY (achievement_id)
        REFERENCES achievements(id)
);

-- =========================================================
-- 6. SCHOOL ISSUES
-- Campus Pulse / My School My Fix issue records.
-- =========================================================
CREATE TABLE IF NOT EXISTS school_issues (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
);

-- =========================================================
-- 7. ISSUE INTERVIEWS
-- Interviews associated with a Campus Pulse issue.
-- =========================================================
CREATE TABLE IF NOT EXISTS issue_interviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    issue_id TEXT NOT NULL,
    participant_type TEXT NOT NULL,
    participant_name TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (issue_id)
        REFERENCES school_issues(id)
);

-- =========================================================
-- INDEXES
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_achievements_student_id
    ON achievements(student_id);

CREATE INDEX IF NOT EXISTS idx_achievements_type
    ON achievements(type);

CREATE INDEX IF NOT EXISTS idx_achievements_source
    ON achievements(source);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_student_id
    ON opportunity_applications(student_id);

CREATE INDEX IF NOT EXISTS idx_opportunity_applications_opportunity_id
    ON opportunity_applications(opportunity_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_student_id
    ON point_transactions(student_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_achievement_id
    ON point_transactions(achievement_id);

CREATE INDEX IF NOT EXISTS idx_school_issues_student_id
    ON school_issues(student_id);

CREATE INDEX IF NOT EXISTS idx_issue_interviews_issue_id
    ON issue_interviews(issue_id);
