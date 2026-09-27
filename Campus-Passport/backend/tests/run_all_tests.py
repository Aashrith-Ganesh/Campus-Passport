import sys
import unittest

from backend.tests.test_database import test_database_crud_and_persistence
from backend.tests.test_opportunity_wallet import (
    setup_module as setup_opp,
    test_list_and_get_opportunities,
    test_student_eligibility_scenarios,
    test_application_workflow_and_duplicate_prevention,
)
from backend.tests.test_campus_pulse import (
    setup_module as setup_pulse,
    test_campus_pulse_issue_workflow,
)
from backend.tests.test_points import (
    setup_module as setup_points,
    test_points_calculation_and_duplicate_prevention,
)
from backend.tests.test_passport import (
    setup_module as setup_passport,
    test_passport_endpoints,
)
from backend.tests.test_student_pocket_phase_b import (
    setup_module as setup_pocket,
    test_empty_student_balance,
    test_academic_and_campus_credits_and_universal_total,
    test_negative_balance_calculation_and_overrides,
    test_duplicate_idempotency_key_protection,
    test_academic_and_campus_purpose_separation_during_purchase_validation,
)
from backend.tests.test_student_pocket_final import (
    setup_module as setup_final,
    test_student_directory_endpoints,
    test_student_balance_and_transaction_history,
    test_teacher_rewards_and_role_enforcement,
    test_extracurricular_achievement_creation,
    test_deductions_and_negative_limit_allowance,
    test_nfc_card_lifecycle_and_tap,
    test_campus_purchases_and_safeguards,
    test_direct_api_issues_and_three_interview_rule,
    test_passport_snapshot_with_student_pocket_integration,
)


def run_all():
    print("=" * 60)
    print("RUNNING ALL CAMPUS PASSPORT BACKEND TESTS")
    print("=" * 60)

    # 1. Database
    print("\n[1/7] Testing Database CRUD & Persistence...")
    test_database_crud_and_persistence()
    print("✓ Database CRUD & Persistence PASSED")

    # 2. Opportunity Wallet
    print("\n[2/7] Testing Opportunity Wallet...")
    setup_opp()
    test_list_and_get_opportunities()
    test_student_eligibility_scenarios()
    test_application_workflow_and_duplicate_prevention()
    print("✓ Opportunity Wallet PASSED")

    # 3. Campus Pulse
    print("\n[3/7] Testing Campus Pulse & 3-Interview Rule...")
    setup_pulse()
    test_campus_pulse_issue_workflow()
    print("✓ Campus Pulse & 3-Interview Rule PASSED")

    # 4. Points System
    print("\n[4/7] Testing Points System & Duplicate Prevention...")
    setup_points()
    test_points_calculation_and_duplicate_prevention()
    print("✓ Points System PASSED")

    # 5. Campus Passport
    print("\n[5/7] Testing Campus Passport Endpoints...")
    setup_passport()
    test_passport_endpoints()
    print("✓ Campus Passport Endpoints PASSED")

    # 6. Student Pocket Phase B
    print("\n[6/7] Testing Student Pocket Phase B (Ledger & Balances)...")
    setup_pocket()
    test_empty_student_balance()
    test_academic_and_campus_credits_and_universal_total()
    test_negative_balance_calculation_and_overrides()
    test_duplicate_idempotency_key_protection()
    test_academic_and_campus_purpose_separation_during_purchase_validation()
    print("✓ Student Pocket Phase B PASSED")

    # 7. Student Pocket Final Integration & End-to-End
    print("\n[7/7] Testing Student Pocket Final Integration & End-to-End...")
    setup_final()
    test_student_directory_endpoints()
    test_student_balance_and_transaction_history()
    test_teacher_rewards_and_role_enforcement()
    test_extracurricular_achievement_creation()
    test_deductions_and_negative_limit_allowance()
    test_nfc_card_lifecycle_and_tap()
    test_campus_purchases_and_safeguards()
    test_direct_api_issues_and_three_interview_rule()
    test_passport_snapshot_with_student_pocket_integration()
    print("✓ Student Pocket Final Integration & End-to-End PASSED")

    print("\n" + "=" * 60)
    print("ALL 7 TEST SUITES PASSED CLEANLY!")
    print("=" * 60)


if __name__ == "__main__":
    run_all()

