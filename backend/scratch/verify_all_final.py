import os
import sys
import django

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
django.setup()

from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.accounts.models import User
from apps.courses.models import Course, Enrollment
from apps.assessments.models import Assignment, Submission, Quiz, QuizQuestion, QuizAttempt
from apps.attendance.models import AttendanceSession, AttendanceRecord
from rest_framework.test import APIClient

print("==================================================================")
print("🚀 RUNNING FINAL VERIFICATION TEST SUITE (ALL ENHANCEMENTS)")
print("==================================================================")

client = APIClient()

# 1. Accounts: Student & Instructor registration
ts = int(timezone.now().timestamp())
student_email = f"student_eval_{ts}@arx.edu"
res = client.post("/api/v1/auth/register/", {
    "email": student_email,
    "password": "Password123!",
    "password_confirm": "Password123!",
    "first_name": "Ashish",
    "last_name": "Kumar",
    "role": "student",
    "institution_id": f"ST-{ts % 10000}",
    "department": "Computer Science"
}, format="json")
assert res.status_code == 201, f"Student registration failed: {res.data}"
student_user = User.objects.get(email=student_email)
student_token = res.data["data"]["tokens"]["access"]
print(f"✓ 1. Student Registered: {student_user.first_name} {student_user.last_name} ({student_user.email})")

instructor_email = f"instructor_eval_{ts}@arx.edu"
res = client.post("/api/v1/auth/register/", {
    "email": instructor_email,
    "password": "Password123!",
    "password_confirm": "Password123!",
    "first_name": "Dr. Renu",
    "last_name": "Sharma",
    "role": "instructor",
    "institution_id": f"FAC-{ts % 10000}",
    "department": "Computer Science"
}, format="json")
assert res.status_code == 201, f"Instructor registration failed: {res.data}"
instructor_user = User.objects.get(email=instructor_email)
instructor_token = res.data["data"]["tokens"]["access"]
print(f"✓ 2. Instructor Registered: {instructor_user.first_name} {instructor_user.last_name} ({instructor_user.email})")

# 2. Course Creation & Student Enrollment
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
course_res = client.post("/api/v1/courses/", {
    "title": "High-Performance Database Internals",
    "code": f"DATA-{ts % 1000}",
    "description": "Storage engines, LSM-Trees, B+ Trees, and Concurrency Control.",
    "semester": "Fall 2026",
    "credits": 4,
    "max_capacity": 60,
    "is_published": True
}, format="json")
assert course_res.status_code == 201, f"Course creation failed: {course_res.data}"
course_id = course_res.data["data"]["id"]
course = Course.objects.get(id=course_id)
print(f"✓ 3. Course Created: {course.code} - {course.title} (Join Code: {course.join_code})")

client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
join_res = client.post("/api/v1/courses/join/", {"code": course.join_code}, format="json")
assert join_res.status_code == 200, f"Join course failed: {join_res.data}"
print(f"✓ 4. Student Enrolled in Course via Join Code successfully")

# 3. Instructor creates assignment with file attachment
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
pdf_file = SimpleUploadedFile("btree_assignment_brief.pdf", b"%PDF-1.4 Problem Set Brief: Implement B+ Tree in C++", content_type="application/pdf")
assign_res = client.post("/api/v1/assessments/", {
    "course": course_id,
    "title": "Problem Set 4: B+ Tree Concurrency",
    "description": "Implement thread-safe node splitting and latch crabbing.",
    "assessment_type": "assignment",
    "submission_format": "both",
    "due_date": (timezone.now() + timezone.timedelta(days=7)).isoformat(),
    "max_score": 100,
    "status": "published",
    "is_published": True,
    "attachment": pdf_file,
}, format="multipart")
assert assign_res.status_code == 201, f"Assignment creation with attachment failed: {assign_res.data}"
assign_data = assign_res.data["data"]
assign_id = assign_data["id"]
assert assign_data.get("attachment") or assign_data.get("attachment_url"), "Attachment missing on created assignment"
print(f"✓ 5. Instructor Created Assignment with File Attachment: '{assign_data['title']}', Attachment: {assign_data.get('attachment_url')}")

# 4. Student views assignment & downloads attachment
client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
st_get_assign = client.get(f"/api/v1/assessments/{assign_id}/")
assert st_get_assign.status_code == 200
assert st_get_assign.data["data"].get("attachment_url") is not None
print(f"✓ 6. Student verified access to assignment attachment: {st_get_assign.data['data']['attachment_url']}")

# 5. Student submits coursework with text and solution file
sol_file = SimpleUploadedFile("btree_solution.cpp", b"// B+ Tree Implementation\n#include <iostream>\n", content_type="text/x-c++src")
submit_res = client.post(f"/api/v1/assessments/{assign_id}/submit/", {
    "content": "Completed latch crabbing and concurrent node traversal with unit tests.",
    "file": sol_file,
}, format="multipart")
assert submit_res.status_code == 200, f"Submission failed: {submit_res.data if hasattr(submit_res, 'data') else submit_res.content}"
sub_res_data = submit_res.data["data"]
receipt_id = sub_res_data["receipt_id"]
assert sub_res_data.get("file_url") is not None, "Submission file_url missing"
print(f"✓ 7. Student Submitted Coursework: Receipt={receipt_id}, File={sub_res_data.get('file_name')}")

# 6. Student updates submission text only (file must be preserved!)
update_text_res = client.post(f"/api/v1/assessments/{assign_id}/submit/", {
    "content": "Updated notes: passed all stress benchmarks with 16 worker threads.",
}, format="json")
assert update_text_res.status_code == 200
updated_sub = update_text_res.data["data"]
assert updated_sub.get("file_url") is not None, "Previously uploaded file was erased when updating text!"
print(f"✓ 8. Student Updated Submission Text without File: Previous file preserved successfully ({updated_sub.get('file_name')})")

# 7. Instructor checks student submissions for the assignment
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
sub_list_res = client.get(f"/api/v1/assessments/{assign_id}/submissions/")
assert sub_list_res.status_code == 200, f"Get submissions list failed: {sub_list_res.data}"
sub_list = sub_list_res.data["data"]
stats = sub_list["stats"]
assert stats["total_enrolled"] == 1
assert stats["submitted_count"] == 1
assert stats["missing_count"] == 0
student_entry = sub_list["students"][0]
assert student_entry["has_submitted"] is True
assert student_entry["status"] == "submitted"
assert student_entry["submission"]["receipt_id"] == receipt_id
print(f"✓ 9. Instructor Submissions Review Endpoint: Total Enrolled={stats['total_enrolled']}, Submitted={stats['submitted_count']}, Late={stats['late_count']}, Missing={stats['missing_count']}")
print(f"     Student: {student_entry['name']} ({student_entry['email']}) -> Status: {student_entry['status']}, Receipt: {student_entry['submission']['receipt_id']}")

# 8. Instructor grades the submission
sub_id = student_entry["submission"]["id"]
grade_res = client.post(f"/api/v1/assessments/submissions/{sub_id}/grade/", {
    "score": 98.0,
    "feedback": "Outstanding concurrent B+ Tree implementation. Exceptional latch crabbing logic."
}, format="json")
assert grade_res.status_code == 200
print(f"✓ 10. Instructor Graded Submission: Score=98.0/100, Feedback='{grade_res.data['data']['feedback']}'")

# 9. Instructor creates a quiz and checks attempts endpoint
quiz_res = client.post("/api/v1/assessments/quizzes/", {
    "course": course_id,
    "title": "Storage Engines & Indexes Quiz",
    "description": "Short timed test on B+ Tree vs LSM Tree trade-offs.",
    "duration_minutes": 15,
    "max_attempts": 1,
    "is_published": True,
    "release_results": True,
    "questions": [
        {
            "question_text": "Which index structure provides O(1) random read amortized?",
            "question_type": "mcq",
            "options": ["Hash Index", "B+ Tree", "LSM Tree", "Skip List"],
            "correct_answer": "Hash Index",
            "marks": 10
        }
    ]
}, format="json")
assert quiz_res.status_code == 201
quiz_id = quiz_res.data["data"]["id"]
print(f"✓ 11. Instructor Created Quiz: '{quiz_res.data['data']['title']}' (ID: {quiz_id})")

# Student attempts quiz
client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
q_attempt_res = client.post(f"/api/v1/assessments/quizzes/{quiz_id}/attempt/", {
    "answers": {
        str(QuizQuestion.objects.filter(quiz_id=quiz_id).first().id): "Hash Index"
    }
}, format="json")
assert q_attempt_res.status_code in (200, 201), f"Quiz attempt failed: {q_attempt_res.data if hasattr(q_attempt_res, 'data') else q_attempt_res.content}"
print(f"✓ 12. Student Attempted Quiz: Score={q_attempt_res.data['data']['score']}/{q_attempt_res.data['data']['max_score']}")

# Instructor inspects quiz attempts
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
q_attempts_res = client.get(f"/api/v1/assessments/quizzes/{quiz_id}/attempts/")
assert q_attempts_res.status_code == 200
q_att_data = q_attempts_res.data["data"]
assert q_att_data["stats"]["attempted_count"] == 1
assert q_att_data["students"][0]["has_attempted"] is True
print(f"✓ 13. Instructor Checked Quiz Attempts: Attempted={q_att_data['stats']['attempted_count']}, Avg Score={q_att_data['stats']['avg_score']}")

# 10. Student checks My Attendance Summary
# Add an attendance session and mark student present
client.credentials(HTTP_AUTHORIZATION=f"Bearer {instructor_token}")
session = AttendanceSession.objects.create(
    course=course,
    date=timezone.now().date(),
    topic="B+ Tree In-Memory Benchmarks",
    created_by=instructor_user,
)
AttendanceRecord.objects.create(
    session=session,
    student=student_user,
    status=AttendanceRecord.Status.PRESENT,
    remarks="Active participation in live coding"
)

client.credentials(HTTP_AUTHORIZATION=f"Bearer {student_token}")
att_summary = client.get("/api/v1/attendance/my-summary/")
assert att_summary.status_code == 200
att_data = att_summary.data["data"]
course_att = next((c for c in att_data["courses"] if c["course_id"] == str(course.id)), None)
assert course_att is not None
assert course_att["instructor_name"] == f"{instructor_user.first_name} {instructor_user.last_name}"
assert course_att["attended"] >= 1
assert len(course_att["history"]) >= 1
print(f"✓ 14. Student Attendance Summary: {course_att['course_code']} - {course_att['course_title']}")
print(f"      Instructor: {course_att['instructor_name']}, Turnout: {course_att['percentage']}, History Count: {len(course_att['history'])} days")

# 11. Student checks My Progress Summary
prog_summary = client.get("/api/v1/assessments/my-progress/")
assert prog_summary.status_code == 200
p_data = prog_summary.data["data"]
assert "aggregate" in p_data
course_prog = next((c for c in p_data["courses"] if c["course_id"] == str(course.id)), None)
assert course_prog is not None
assert course_prog["completion_percentage"] == 100.0
assert course_prog["assignments_submitted"] == 1
assert course_prog["quizzes_attempted"] == 1
assert len(course_prog["items"]) == 2
print(f"✓ 15. Student Progress Summary: {course_prog['course_code']} - {course_prog['completion_percentage']}% Completion")
print(f"      Quizzes Avg: {course_prog['quizzes_avg_score']}, Assignments: {course_prog['assignments_submitted']}/{course_prog['assignments_total']}")
for itm in course_prog["items"]:
    print(f"      - [{itm['type'].upper()}] {itm['title']}: Status={itm['status']}, Score={itm['score']}/{itm['max_score']}")

print("==================================================================")
print("🎉 ALL 15/15 AUTOMATED TESTS PASSED WITH 100% SUCCESS!")
print("==================================================================")
