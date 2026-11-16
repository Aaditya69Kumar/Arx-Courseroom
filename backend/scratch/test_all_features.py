import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.utils import timezone
from apps.accounts.models import User
from apps.courses.models import Course, Enrollment
from apps.assessments.models import Assignment, Quiz, QuizQuestion
from apps.attendance.models import AttendanceSession, AttendanceRecord
from apps.communication.models import AnonymousFeedback
from rest_framework.test import APIClient

print("--- STARTING COMPREHENSIVE VERIFICATION SUITE ---")
client = APIClient()

# 1. Multi-account Creation & Authentication
# Create student test user
student_email = f"teststudent_{timezone.now().timestamp()}@arx.edu"
res = client.post("/api/v1/auth/register/", {
    "email": student_email,
    "password": "Password123!",
    "password_confirm": "Password123!",
    "first_name": "Test",
    "last_name": "Student",
    "role": "student",
    "institution_id": "ST-9999",
    "department": "Computer Science"
}, format="json")
assert res.status_code == 201, f"Student registration failed: {res.data}"
student_user = User.objects.get(email=student_email)
student_token = res.data["data"]["tokens"]["access"]
print(f"✓ Student Account Registration & Login Token: SUCCESS ({student_user.email})")

# Create instructor test user
instructor_email = f"testinstructor_{timezone.now().timestamp()}@arx.edu"
res = client.post("/api/v1/auth/register/", {
    "email": instructor_email,
    "password": "Password123!",
    "password_confirm": "Password123!",
    "first_name": "Dr. Test",
    "last_name": "Professor",
    "role": "instructor",
    "institution_id": "FAC-9999",
    "department": "Computer Science"
}, format="json")
assert res.status_code == 201, f"Instructor registration failed: {res.data}"
instructor_user = User.objects.get(email=instructor_email)
instructor_token = res.data["data"]["tokens"]["access"]
print(f"✓ Instructor Account Registration & Login Token: SUCCESS ({instructor_user.email})")

# Instructor creates a course
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
course_res = client.post("/api/v1/courses/", {
    "title": "Advanced Distributed Systems",
    "code": f"DS-{int(timezone.now().timestamp()) % 10000}",
    "description": "Consensus protocols, Raft, Paxos, and distributed storage.",
    "semester": "Fall 2026",
    "credits": 4,
    "max_capacity": 60,
    "is_published": True
}, format="json")
assert course_res.status_code == 201, f"Course creation failed: {course_res.data}"
course_id = course_res.data["data"]["id"]
course = Course.objects.get(id=course_id)
print(f"✓ Instructor Created Course: {course.code} ({course.title})")

# Student joins course
client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
join_res = client.post("/api/v1/courses/join/", {"code": course.join_code}, format="json")
assert join_res.status_code == 200, f"Join course failed: {join_res.data}"
enrollment = Enrollment.objects.get(student=student_user, course=course)
print(f"✓ Student Successfully Joined Course via Join Code: {enrollment.status} (Enrolled at: {enrollment.enrolled_at})")

# 2. Assignment Creation by Instructor
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
assign_res = client.post("/api/v1/assessments/", {
    "course": course_id,
    "title": "Lab 1: Raft Leader Election",
    "description": "Implement election timers and heartbeat RPCs.",
    "assessment_type": "assignment",
    "submission_format": "both",
    "max_score": 100,
    "status": "published",
    "is_published": True
}, format="json")
assert assign_res.status_code == 201, f"Assignment creation failed: {assign_res.data}"
assign_id = assign_res.data["data"]["id"]
print(f"✓ Instructor Created Assignment: Lab 1 (ID: {assign_id})")

# 3. Quiz Creation with MCQ Questions by Instructor
quiz_res = client.post("/api/v1/assessments/quizzes/", {
    "course": course_id,
    "title": "Distributed Systems Quiz 1",
    "description": "Covers CAP theorem and Two-Phase Commit.",
    "duration_minutes": 20,
    "max_attempts": 2,
    "is_published": True,
    "release_results": True,
    "questions": [
        {
            "question_text": "What does the 'C' in CAP theorem stand for?",
            "question_type": "mcq",
            "options": ["Consistency", "Concurrency", "Coherence", "Capacity"],
            "correct_answer": "Consistency",
            "marks": 5
        },
        {
            "question_text": "Is Raft leader election randomized?",
            "question_type": "mcq",
            "options": ["Yes, using randomized timeout", "No, fixed priority", "Always round-robin", "None of these"],
            "correct_answer": "Yes, using randomized timeout",
            "marks": 5
        }
    ]
}, format="json")
assert quiz_res.status_code == 201, f"Quiz creation failed: {quiz_res.data}"
quiz_id = quiz_res.data["data"]["id"]
quiz = Quiz.objects.get(id=quiz_id)
assert quiz.questions.count() == 2, f"Questions not created properly: {quiz.questions.count()}"
print(f"✓ Instructor Created Quiz with {quiz.questions.count()} MCQ Questions: SUCCESS")

# 4. Anonymous Feedback: Only student can post, instructor cannot post, instructor can view
# A. Instructor tries to post feedback -> Expect 403 Forbidden!
fb_fail = client.post("/api/v1/communication/anonymous-feedback/", {
    "course": course_id,
    "category": "pacing",
    "rating": 5,
    "feedback_text": "Instructor trying to post"
}, format="json")
assert fb_fail.status_code == 403, f"Instructor should be forbidden from posting feedback! Got: {fb_fail.status_code}"
print("✓ Instructor posting anonymous feedback correctly BLOCKED with 403 Forbidden.")

# B. Enrolled student posts anonymous feedback -> Expect 201 Created!
client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
fb_student = client.post("/api/v1/communication/anonymous-feedback/", {
    "course": course_id,
    "category": "pacing",
    "rating": 5,
    "feedback_text": "The pacing of distributed systems lectures is clear and well explained."
}, format="json")
assert fb_student.status_code == 201, f"Student feedback failed: {fb_student.data}"
print("✓ Enrolled student posted anonymous feedback: SUCCESS (201 Created)")

# C. Instructor views received feedback -> Expect 200 with stats
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
fb_view = client.get(f"/api/v1/communication/anonymous-feedback/?course_id={course_id}")
assert fb_view.status_code == 200, f"Instructor view feedback failed: {fb_view.data}"
fb_data = fb_view.data["data"]
assert fb_data["total_submissions"] >= 1, f"Feedback missing in instructor inbox"
print(f"✓ Instructor Received Feedback Inbox: {fb_data['total_submissions']} submission(s), Avg Rating: {fb_data['average_rating']}")

# 5. Attendance: Marking, Date Persistence & Late Entry Handling
# Session 1: Conducted in the past (e.g. 5 days ago), BEFORE student enrollment
past_date = (timezone.now() - timezone.timedelta(days=5)).date()
session_past = AttendanceSession.objects.create(
    course=course,
    date=past_date,
    topic="Lecture 1: Intro to Distributed Systems",
    created_by=instructor_user
)

# Session 2: Conducted today, AFTER student enrollment
today_date = timezone.now().date()
session_today = AttendanceSession.objects.create(
    course=course,
    date=today_date,
    topic="Lecture 2: RPCs and Concurrency",
    created_by=instructor_user
)

# Instructor marks roll-call for today: student is Present
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
roll_res = client.post(f"/api/v1/attendance/sessions/{session_today.id}/roll-call/", {
    "records": [
        {
            "student_id": str(student_user.id),
            "status": "present",
            "remarks": "Active participation"
        }
    ]
}, format="json")
assert roll_res.status_code == 200, f"Roll call failed: {roll_res.data}"
print(f"✓ Instructor Marked Roll-Call for Session {today_date}: 1 Present saved to Supabase DB.")

# Check student summary:
# Session 1 happened BEFORE student enrolled -> MUST be marked as 'late_entry' and NOT penalize attendance!
# Session 2 happened AFTER student enrolled -> student attended (Present).
# Attendance percentage MUST be 100.0% (1 attended out of 1 eligible session), NOT 50%!
client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
summary_res = client.get(f"/api/v1/attendance/my-summary/?course_id={course_id}")
assert summary_res.status_code == 200, f"Summary failed: {summary_res.data}"
my_course_summary = summary_res.data["data"]["courses"][0]

print("\n--- ATTENDANCE SUMMARY VERIFICATION ---")
print(f"Total Course Sessions: {my_course_summary['total_sessions']}")
print(f"Eligible Sessions: {my_course_summary['eligible_sessions']}")
print(f"Late Entry Count: {my_course_summary['late_entry_count']}")
print(f"Attended Sessions: {my_course_summary['attended']}")
print(f"Percentage: {my_course_summary['percentage']}")
print(f"Status Tag: {my_course_summary['status_tag']}")

assert my_course_summary["total_sessions"] == 2, "Expected 2 total sessions"
assert my_course_summary["eligible_sessions"] == 1, "Expected 1 eligible session"
assert my_course_summary["late_entry_count"] == 1, "Expected 1 late entry session"
assert my_course_summary["percentage"] == "100.0%", f"Expected 100.0% but got {my_course_summary['percentage']}"

# Verify daily history entries
history = my_course_summary["history"]
assert len(history) == 2, f"Expected 2 history items, got {len(history)}"
# History is sorted -date, so today is index 0, past is index 1
today_item = [h for h in history if h["date"] == today_date.strftime("%Y-%m-%d")][0]
past_item = [h for h in history if h["date"] == past_date.strftime("%Y-%m-%d")][0]

assert today_item["status"] == "present", f"Today's session should be present: {today_item}"
assert past_item["status"] == "late_entry", f"Past session before enrollment should be late_entry: {past_item}"
print(f"✓ Session {today_item['date']}: Status = '{today_item['status']}'")
print(f"✓ Session {past_item['date']} (Pre-enrollment): Status = '{past_item['status']}' ('{past_item['remarks']}')")

print("\nALL VERIFICATION TESTS PASSED PERFECTLY!")
