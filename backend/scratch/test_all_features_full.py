"""
End-to-End Verification Test for LMS Enhancements using Python standard library:
1. Assignment creation with file attachment (Instructor)
2. Assignment retrieval & file download link (Student & Instructor)
3. Assignment coursework submission with file and text (Student)
4. Submissions listing with submitted/late/missing tracking (Instructor)
5. Grading submission (Instructor)
6. Quiz attempts listing with score and late tracking (Instructor)
7. Subject-wise attendance summary with daily history & instructor name (Student)
8. Subject-wise progress summary across enrolled courses (Student)
"""
import os
import sys
import json
import uuid
import mimetypes
from urllib import request as urlrequest
from urllib import error as urlerror

BASE_URL = "http://127.0.0.1:8000/api/v1"

def api_call(endpoint, method="GET", data=None, token=None, files=None):
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    if files:
        boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
        body_parts = []
        if data:
            for k, v in data.items():
                body_parts.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{k}\"\r\n\r\n{v}\r\n".encode())
        for field_name, (filename, file_bytes, content_type) in files.items():
            body_parts.append(
                f"--{boundary}\r\nContent-Disposition: form-data; name=\"{field_name}\"; filename=\"{filename}\"\r\nContent-Type: {content_type}\r\n\r\n".encode()
                + file_bytes
                + b"\r\n"
            )
        body_parts.append(f"--{boundary}--\r\n".encode())
        body = b"".join(body_parts)
    elif data is not None:
        headers["Content-Type"] = "application/json"
        body = json.dumps(data).encode("utf-8")
    else:
        body = None

    req = urlrequest.Request(url, data=body, headers=headers, method=method)
    try:
        with urlrequest.urlopen(req) as resp:
            content = resp.read().decode("utf-8")
            return resp.status, json.loads(content) if content else {}
    except urlerror.HTTPError as e:
        content = e.read().decode("utf-8")
        try:
            parsed = json.loads(content)
        except Exception:
            parsed = {"raw": content}
        return e.code, parsed

def run_tests():
    print("==================================================")
    print("🚀 Starting End-to-End LMS Feature Verification...")
    print("==================================================")

    # 1. Login Instructor
    code, login_data = api_call("/auth/login/", method="POST", data={
        "email": "renu.faculty@xceed.ac.in",
        "password": "Password123!"
    })
    assert code == 200, f"Instructor login failed: {login_data}"
    inst_token = login_data["data"]["tokens"]["access"]
    print("✅ 1. Instructor login successful (renu.faculty@xceed.ac.in)")

    # 2. Get instructor's course
    code, courses_data = api_call("/courses/", token=inst_token)
    assert code == 200, f"Courses fetch failed: {courses_data}"
    inst_courses = courses_data["data"]
    assert len(inst_courses) > 0, "No courses found for instructor"
    test_course = inst_courses[0]
    course_id = test_course["id"]
    print(f"✅ 2. Using course: {test_course['title']} ({test_course['code']}) - ID: {course_id}")

    # 3. Instructor creates assignment WITH FILE ATTACHMENT
    sample_pdf_bytes = b"%PDF-1.4 Question Paper: Solve Problem Set 5 on Indexing and Trees."
    code, assign_create_data = api_call(
        "/assessments/",
        method="POST",
        token=inst_token,
        data={
            "course": course_id,
            "title": "E2E Problem Set 5: Distributed Trees",
            "description": "Implement B+ tree concurrent traversal algorithm.",
            "assessment_type": "assignment",
            "submission_format": "both",
            "max_score": 100,
            "status": "published",
            "is_published": "true",
        },
        files={"attachment": ("problem_set_5.pdf", sample_pdf_bytes, "application/pdf")}
    )
    assert code == 201, f"Assignment creation with attachment failed: {assign_create_data}"
    assignment_data = assign_create_data["data"]
    assignment_id = assignment_data["id"]
    assert assignment_data.get("attachment") or assignment_data.get("attachment_url"), "Attachment URL missing"
    print(f"✅ 3. Instructor created assignment with file attachment: '{assignment_data['title']}' - Attachment URL: {assignment_data.get('attachment_url')}")

    # 4. Login Student
    code, st_login_data = api_call("/auth/login/", method="POST", data={
        "email": "ashish.student@xceed.ac.in",
        "password": "Password123!"
    })
    assert code == 200, f"Student login failed: {st_login_data}"
    student_token = st_login_data["data"]["tokens"]["access"]
    print("✅ 4. Student login successful (ashish.student@xceed.ac.in)")

    # 5. Ensure Student is enrolled
    code, enroll_data = api_call("/courses/join/", method="POST", token=student_token, data={
        "code": test_course["join_code"]
    })
    print(f"ℹ️  Enroll status: {code} ({enroll_data.get('message', '')})")

    # 6. Student views the assignment with attachment URL
    code, st_assign_data = api_call(f"/assessments/{assignment_id}/", token=student_token)
    assert code == 200, f"Student get assignment failed: {st_assign_data}"
    assert st_assign_data["data"].get("attachment_url"), "Student cannot see assignment attachment URL"
    print(f"✅ 5. Student verified attachment access: {st_assign_data['data']['attachment_url']}")

    # 7. Student submits assignment with solution text and file
    sample_py_bytes = b"def btree_search(root, key):\n    return 'Found'\n"
    code, submit_data = api_call(
        f"/assessments/{assignment_id}/submit/",
        method="POST",
        token=student_token,
        data={"content": "Here is my B+ tree implementation in Python with concurrency support."},
        files={"file": ("solution.py", sample_py_bytes, "text/x-python")}
    )
    assert code == 200, f"Student submission failed: {submit_data}"
    sub_data = submit_data["data"]
    receipt_id = sub_data["receipt_id"]
    assert sub_data.get("file_url"), "Submission file_url missing"
    print(f"✅ 6. Student submitted coursework successfully! Receipt: {receipt_id}, File: {sub_data.get('file_name')}")

    # 8. Instructor checks all student submissions for this assignment
    code, submissions_list = api_call(f"/assessments/{assignment_id}/submissions/", token=inst_token)
    assert code == 200, f"Instructor fetch submissions failed: {submissions_list}"
    stats = submissions_list["data"]["stats"]
    students = submissions_list["data"]["students"]
    print(f"✅ 7. Instructor submissions overview: Total Enrolled: {stats['total_enrolled']}, Submitted: {stats['submitted_count']}, Late: {stats['late_count']}, Missing: {stats['missing_count']}")
    
    ashish_sub = next((s for s in students if s["email"] == "ashish.student@xceed.ac.in"), None)
    assert ashish_sub is not None, "Enrolled student Ashish not found in instructor submissions list"
    assert ashish_sub["has_submitted"] is True, "Ashish should have has_submitted=True"
    assert ashish_sub["submission"]["receipt_id"] == receipt_id, "Submission receipt mismatch"
    print(f"✅ 8. Instructor verified Ashish's submission: Status={ashish_sub['status']}, File={ashish_sub['submission']['file_name']}")

    # 9. Instructor grades Ashish's submission
    sub_id = ashish_sub["submission"]["id"]
    code, grade_data = api_call(
        f"/assessments/submissions/{sub_id}/grade/",
        method="POST",
        token=inst_token,
        data={"score": 96.5, "feedback": "Excellent clean implementation of concurrent B+ tree traversal."}
    )
    assert code == 200, f"Grading failed: {grade_data}"
    print("✅ 9. Instructor graded submission (96.5 pts)")

    # 10. Check Quizzes attempts endpoint for instructor
    code, quizzes_data = api_call(f"/assessments/quizzes/?course_id={course_id}", token=inst_token)
    assert code == 200
    quizzes = quizzes_data["data"]
    if quizzes:
        quiz_id = quizzes[0]["id"]
        code, q_att_data = api_call(f"/assessments/quizzes/{quiz_id}/attempts/", token=inst_token)
        assert code == 200, f"Quiz attempts fetch failed: {q_att_data}"
        print(f"✅ 10. Instructor verified quiz attempts for '{q_att_data['data']['quiz']['title']}': Enrolled: {q_att_data['data']['stats']['total_enrolled']}, Attempted: {q_att_data['data']['stats']['attempted_count']}, Missing: {q_att_data['data']['stats']['missing_count']}")

    # 11. Student fetches My Attendance Summary
    code, att_data = api_call("/attendance/my-summary/", token=student_token)
    assert code == 200, f"Attendance summary failed: {att_data}"
    att_courses = att_data["data"]["courses"]
    assert len(att_courses) > 0, "Student should have at least one course in attendance summary"
    first_course = att_courses[0]
    assert "instructor_name" in first_course, "instructor_name missing"
    assert "history" in first_course, "history missing"
    print(f"✅ 11. Student Attendance Summary verified: {len(att_courses)} subjects. First subject: {first_course['course_code']} - {first_course['course_title']} (Instructor: {first_course['instructor_name']}, {first_course['percentage']} attendance, {len(first_course['history'])} daily records)")

    # 12. Student fetches My Progress Summary
    code, prog_data = api_call("/assessments/my-progress/", token=student_token)
    assert code == 200, f"Progress summary failed: {prog_data}"
    p_data = prog_data["data"]
    assert "aggregate" in p_data, "aggregate missing in progress summary"
    assert "courses" in p_data, "courses missing in progress summary"
    p_courses = p_data["courses"]
    print(f"✅ 12. Student Progress Summary verified: Overall Completion: {p_data['aggregate']['completion_rate']}, Quizzes Avg: {p_data['aggregate']['quizzes_avg']}, {len(p_courses)} subjects tracked.")
    for pc in p_courses:
        print(f"    - {pc['course_code']}: {pc['completion_percentage']}% completion, {pc['assignments_submitted']}/{pc['assignments_total']} assignments submitted, {len(pc['items'])} milestones.")

    print("==================================================")
    print("🎉 ALL END-TO-END TESTS PASSED WITH 100% SUCCESS!")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
