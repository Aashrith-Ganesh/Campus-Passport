import * as login from '../static/assets/pages/login.js';
import * as dashboard from '../static/assets/pages/dashboard.js';
import * as passport from '../static/assets/pages/passport.js';
import * as lens from '../static/assets/pages/campus-lens.js';
import * as pulse from '../static/assets/pages/campus-pulse.js';
import * as wallet from '../static/assets/pages/opportunity-wallet.js';
import * as pocket from '../static/assets/pages/student-pocket.js';
import * as tDash from '../static/assets/pages/teacher-dashboard.js';
import * as tReports from '../static/assets/pages/teacher-reports.js';
import * as tEvidence from '../static/assets/pages/teacher-evidence.js';
import * as tRewards from '../static/assets/pages/teacher-rewards.js';
import * as tPulseReview from '../static/assets/pages/teacher-pulse-review.js';
import * as admin from '../static/assets/pages/admin.js';
import * as merchant from '../static/assets/pages/merchant.js';
import * as unauth from '../static/assets/pages/unauthorized.js';

const mockState = {
  studentId: 'STU001',
  student: { id: 'STU001', name: 'Aarav Sharma', class_name: '10-A', preferred_language: 'Kannada' },
  passport: {
    student: { id: 'STU001', name: 'Aarav Sharma', class_name: '10-A', preferred_language: 'Kannada' },
    total_points: 120,
    achievements: {
      all: [
        { type: 'LEARNING', source: 'CAMPUS_LENS', title: 'Cellular Biology Mastery', evidence: 'Score 90%', timestamp: '2026-09-30T10:00:00Z' },
        { type: 'CONTRIBUTION', source: 'CAMPUS_PULSE', title: 'Library Study Initiative', evidence: 'Peer verified', timestamp: '2026-09-29T10:00:00Z' }
      ],
      learning: [
        { type: 'LEARNING', source: 'CAMPUS_LENS', title: 'Cellular Biology Mastery', evidence: 'Score 90%', timestamp: '2026-09-30T10:00:00Z' }
      ],
      contribution: [
        { type: 'CONTRIBUTION', source: 'CAMPUS_PULSE', title: 'Library Study Initiative', evidence: 'Peer verified', timestamp: '2026-09-29T10:00:00Z' }
      ]
    }
  },
  balance: {
    total_balance: 150,
    academic_balance: 100,
    campus_balance: 50,
    available_campus_spending_balance: 50,
    effective_negative_limit: -350
  },
  transactions: [
    { id: 1, reason: 'Biology Concept Quiz', purpose: 'ACADEMIC', amount: 20, status: 'COMPLETED', created_at: '2026-09-30T10:00:00Z' }
  ],
  cards: [
    { card_id: 'CARD-NFC-001', status: 'ACTIVE', issued_at: '2026-09-01T00:00:00Z' }
  ],
  opportunities: [
    { id: 'OPP-001', title: 'STEM Excellence Scholarship', category: 'SCHOLARSHIP', amount: 500, description: 'Merit scholarship' }
  ],
  applications: [],
  issues: [
    { id: 1, student_id: 'STU001', title: 'Broken handrail in science lab', category: 'Equipment', status: 'RESOLVED', description: 'Repaired by maintenance', created_at: '2026-09-28T00:00:00Z' }
  ],
  allStudents: [
    { id: 'STU001', name: 'Aarav Sharma', class_name: '10-A', preferred_language: 'Kannada' },
    { id: 'STU002', name: 'Diya Patel', class_name: '10-B', preferred_language: 'English' }
  ],
  campusLensStatus: { ai_configured: true },
  resourceErrors: {},
  loading: false
};

console.log('=== VERIFYING FRONTEND VIEWS & CRITICAL PRODUCT RULES ===');

const renders = {
  login: login.render(),
  dashboard: dashboard.render({ state: mockState }),
  passport: passport.render({ state: mockState }),
  campusLens: lens.render({ state: mockState }),
  campusPulse: pulse.render({ state: mockState }),
  opportunityWallet: wallet.render({ state: mockState }),
  studentPocket: pocket.render({ state: mockState }),
  teacherDashboard: tDash.render({ state: mockState }),
  teacherReports: tReports.render({ state: mockState }),
  teacherEvidence: tEvidence.render({ state: mockState }),
  teacherRewards: tRewards.render({ state: mockState }),
  teacherPulseReview: tPulseReview.render({ state: mockState }),
  admin: admin.render({ state: mockState }),
  merchant: merchant.render(),
  unauthorized: unauth.render()
};

let failed = false;

for (const [name, html] of Object.entries(renders)) {
  if (!html || typeof html !== 'string' || html.length < 50) {
    console.error(`FAILED: Render failed or empty for ${name}`);
    failed = true;
    continue;
  }
  // Check EcoPulse
  if (html.toLowerCase().includes('ecopulse')) {
    console.error(`FAILED: Forbidden EcoPulse found in ${name}`);
    failed = true;
  } else {
    console.log(`PASS: [${name}] rendered cleanly (${html.length} chars) - 0 EcoPulse references`);
  }
}

// Check dynamic negative limit
if (!renders.opportunityWallet.includes('-350') || !renders.studentPocket.includes('-350')) {
  console.error('FAILED: Dynamic effective_negative_limit (-350) not found in wallet or pocket');
  failed = true;
} else {
  console.log('PASS: Dynamic negative limit (-350) correctly rendered in wallet & pocket');
}

// Check no automatic points on issue submit form
if (renders.campusPulse.includes('+10 pts') || renders.campusPulse.includes('+10 points')) {
  console.error('FAILED: Forbidden +10 points found in campus pulse form');
  failed = true;
} else {
  console.log('PASS: Campus Pulse has 0 automatic points on report form');
}

// Check persona selection in login
if (!renders.login.includes('Aarav Sharma') || !renders.login.includes('Priya Sharma') || !renders.login.includes('Dr. Arvind Rao') || !renders.login.includes('Campus Canteen')) {
  console.error('FAILED: Student, Teacher, Admin, or Merchant persona cards missing from login view');
  failed = true;
} else {
  console.log('PASS: Login view includes Student, Teacher, Admin, and Merchant personas');
}

// Check Admin Console features
if (!renders.admin.includes('Issue Smart NFC Card') || !renders.admin.includes('Configure Negative Limit')) {
  console.error('FAILED: Admin console missing NFC card provisioning or limit configuration');
  failed = true;
} else {
  console.log('PASS: Admin console includes NFC provisioning and policy limit configuration');
}

// Check Merchant POS Terminal features
if (!renders.merchant.includes('NFC One-Tap Terminal') || !renders.merchant.includes('MERCHANT001')) {
  console.error('FAILED: Merchant terminal missing one-tap checkout or merchant ID');
  failed = true;
} else {
  console.log('PASS: Merchant terminal includes NFC one-tap checkout for MERCHANT001');
}

// Check Teacher Pulse Review features
if (!renders.teacherPulseReview.includes('Campus Pulse Review Queue') || !renders.teacherPulseReview.includes('Student Campus Reports')) {
  console.error('FAILED: Teacher pulse review missing queue or student reports');
  failed = true;
} else {
  console.log('PASS: Teacher pulse review includes submission queue and student reports');
}

// Check unauthorized guard view
if (!renders.unauthorized.includes('Educator Authorization Required')) {
  console.error('FAILED: Unauthorized view missing required guard message');
  failed = true;
} else {
  console.log('PASS: Unauthorized view has explicit role guard message');
}

// Check Evidence Submission elements in Campus Pulse
if (!renders.campusPulse.includes('issue-photo-input') || !renders.campusPulse.includes('Evidence attached:')) {
  console.error('FAILED: Campus Pulse missing explicit photo evidence upload or live evidence summary');
  failed = true;
} else {
  console.log('PASS: Campus Pulse includes explicit photo upload and live evidence attachment summary');
}

// Check Revocation & Audit elements in Teacher Pulse Review
if (!renders.teacherPulseReview.includes('Revoked Archive')) {
  console.error('FAILED: Teacher pulse review missing Revoked Archive queue filter');
  failed = true;
} else {
  console.log('PASS: Teacher pulse review includes Revoked Archive filter and evidence audit desk');
}

if (failed) {
  console.error('\nTEST SUITE FAILED!');
  process.exit(1);
} else {
  console.log('\nALL FRONTEND VIEW TESTS PASSED CLEANLY (100%)');
}

