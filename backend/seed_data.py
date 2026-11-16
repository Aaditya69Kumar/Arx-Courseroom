"""
Seed real initial academic courses, announcements, materials, and assignments.
"""
from apps.accounts.models import User
from apps.courses.models import Course, Enrollment, Announcement
from apps.materials.models import CourseMaterial
from apps.assessments.models import Assignment
from django.utils import timezone
from datetime import timedelta

# Ensure Users exist
student, _ = User.objects.get_or_create(
    email="student@arx.edu",
    defaults={
        "first_name": "Aarav",
        "last_name": "Patel",
        "role": "student",
        "institution_id": "2026-CS-101",
        "department": "Computer Science & Engineering",
    }
)
if not student.has_usable_password():
    student.set_password("student123")
    student.save()

prof, _ = User.objects.get_or_create(
    email="prof@arx.edu",
    defaults={
        "first_name": "Vikram",
        "last_name": "Sen",
        "role": "instructor",
        "institution_id": "FAC-CS-01",
        "department": "Computer Science & Engineering",
    }
)
if not prof.has_usable_password():
    prof.set_password("prof12345")
    prof.save()

# Course 1: Distributed Systems
c1, _ = Course.objects.update_or_create(
    code="CS-401",
    defaults={
        "title": "Distributed Systems & Cloud Computing",
        "section": "Section A",
        "semester": "Fall 2026",
        "year": 2026,
        "instructor": prof,
        "status": "active",
        "is_active": True,
        "join_code": "DIST-401",
        "allow_code_join": True,
        "max_students": 60,
        "cover_color": "#4F46E5",
        "schedule_info": "Mon, Wed • 10:00 AM - 11:30 AM",
        "room_location": "Hall 3B, Ramanujan Academic Block",
        "description": "Fundamental models and algorithms for decentralized computation, replication, Paxos/Raft consensus, and Byzantine fault tolerance in modern clouds.",
    }
)

# Course 2: Advanced Kernel Design
c2, _ = Course.objects.update_or_create(
    code="CS-601",
    defaults={
        "title": "Advanced Operating Systems & Kernel Design",
        "section": "Section B",
        "semester": "Fall 2026",
        "year": 2026,
        "instructor": prof,
        "status": "active",
        "is_active": True,
        "join_code": "KERN-601",
        "allow_code_join": True,
        "max_students": 45,
        "cover_color": "#7C3AED",
        "schedule_info": "Tue, Thu • 02:00 PM - 03:30 PM",
        "room_location": "Lab 102, Turing Computing Wing",
        "description": "Kernel architecture, memory subsystems, scheduler internals, lock-free synchronization, and device driver engineering.",
    }
)

# Course 3: Database Systems (Available to join with code "DATA-305")
c3, _ = Course.objects.update_or_create(
    code="CS-305",
    defaults={
        "title": "High-Performance Database Internals",
        "section": "Section C",
        "semester": "Fall 2026",
        "year": 2026,
        "instructor": prof,
        "status": "active",
        "is_active": True,
        "join_code": "DATA-305",
        "allow_code_join": True,
        "max_students": 70,
        "cover_color": "#059669",
        "schedule_info": "Fri • 11:30 AM - 01:00 PM",
        "room_location": "Seminar Hall C",
        "description": "B+ tree storage engines, LSM trees, Write-Ahead Logging (WAL), transaction isolation levels, and vector indexing with pgvector.",
    }
)

# Enroll student in CS-401 and CS-601 by default (CS-305 left open to join with code DATA-305)
Enrollment.objects.get_or_create(student=student, course=c1, defaults={"status": "active"})
Enrollment.objects.get_or_create(student=student, course=c2, defaults={"status": "active"})

# Announcements for CS-401
Announcement.objects.get_or_create(
    course=c1,
    title="Welcome to Distributed Systems Fall 2026",
    defaults={
        "author": prof,
        "content": "Welcome all! Please review the syllabus and make sure your Go/Rust development environment is configured. Lecture 1 slides and Raft specification have been uploaded to the Materials tab.",
        "is_pinned": True,
    }
)
Announcement.objects.get_or_create(
    course=c1,
    title="Lab 1 Raft Leader Election Announcement",
    defaults={
        "author": prof,
        "content": "Lab 1 skeleton repository is now live. Please submit your test logs and code review answers before the Friday deadline.",
        "is_pinned": False,
    }
)

# Course Materials for CS-401
CourseMaterial.objects.get_or_create(
    course=c1,
    title="Unit 1: Foundations of Distributed Computation",
    defaults={
        "uploader": prof,
        "topic": "Unit 1: Fundamentals",
        "description": "Covers logical clocks, Lamport timestamps, vector clocks, and causal ordering in distributed message passing systems.",
        "material_type": "document",
        "file_name": "CS401_Unit1_LogicalClocks.pdf",
        "file_size": 2450820,
        "file_type": "application/pdf",
        "is_published": True,
        "ai_indexed": True,
        "ai_indexed_at": timezone.now(),
        "page_count": 28,
    }
)

CourseMaterial.objects.get_or_create(
    course=c1,
    title="Unit 2: The Raft Consensus Algorithm Specification",
    defaults={
        "uploader": prof,
        "topic": "Unit 2: Consensus",
        "description": "Original In Search of an Understandable Consensus Algorithm paper by Ongaro & Ousterhout. Key reading for Lab 1 and Lab 2.",
        "material_type": "document",
        "file_name": "Raft_Consensus_Spec.pdf",
        "file_size": 1820400,
        "file_type": "application/pdf",
        "is_published": True,
        "ai_indexed": True,
        "ai_indexed_at": timezone.now(),
        "page_count": 18,
    }
)

CourseMaterial.objects.get_or_create(
    course=c1,
    title="Lecture 4 Slides: Leader Election & Log Replication",
    defaults={
        "uploader": prof,
        "topic": "Unit 2: Consensus",
        "description": "Visual slide deck analyzing split votes, term increments, and heartbeat intervals.",
        "material_type": "slides",
        "file_name": "CS401_Lec4_RaftSlides.pdf",
        "file_size": 4120900,
        "file_type": "application/pdf",
        "is_published": True,
        "ai_indexed": True,
        "ai_indexed_at": timezone.now(),
        "page_count": 36,
    }
)

# Assignments for CS-401
now = timezone.now()
a1, _ = Assignment.objects.get_or_create(
    course=c1,
    title="Lab 1: Raft Leader Election & Heartbeats",
    defaults={
        "description": "Implement request vote RPCs, election timers, and heartbeat dissemination in Python/Go according to Figure 2 of the Raft paper.",
        "assessment_type": "lab",
        "submission_format": "both",
        "due_date": now + timedelta(days=2),
        "max_score": 100,
        "is_published": True,
        "late_submissions_allowed": True,
    }
)

a2, _ = Assignment.objects.get_or_create(
    course=c1,
    title="Problem Set 1: Distributed Clocks & Consistency",
    defaults={
        "description": "Solve analytical proofs on vector clocks, causal delivery guarantees, and CAP theorem trade-offs.",
        "assessment_type": "assignment",
        "submission_format": "file",
        "due_date": now + timedelta(days=5),
        "max_score": 50,
        "is_published": True,
        "late_submissions_allowed": False,
    }
)


# Quizzes & Questions
from apps.assessments.models import Quiz, QuizQuestion, CodingProblem, CodingSubmission
q1, _ = Quiz.objects.get_or_create(
    course=c1,
    title="Quiz 1: Distributed Time & Consensus Fundamentals",
    defaults={
        "description": "Timed evaluation on Lamport clocks, state machine replication, and election safety.",
        "duration_minutes": 20,
        "max_attempts": 2,
        "due_date": now + timedelta(days=4),
        "is_published": True,
        "release_results": True,
    }
)


QuizQuestion.objects.get_or_create(
    quiz=q1,
    question_text="In the Raft consensus algorithm, which condition is mandatory for a candidate node to win an election?",
    defaults={
        "question_type": "mcq",
        "options": [
            "It must receive votes from a majority of servers in the cluster",
            "It must possess the highest IP address among active peers",
            "It must immediately commit all unapplied log entries",
            "It must wait for the current leader's lease to expire"
        ],
        "correct_answer": "It must receive votes from a majority of servers in the cluster",
        "explanation": "A candidate wins an election when it receives votes from a majority (quorum) of the servers in the cluster for the same term.",
        "marks": 5,
        "order": 1,
    }
)

QuizQuestion.objects.get_or_create(
    quiz=q1,
    question_text="Lamport timestamps provide a strict total ordering of all events across independent concurrent processes without tying.",
    defaults={
        "question_type": "true_false",
        "options": ["True", "False"],
        "correct_answer": "False",
        "explanation": "Lamport timestamps only define a partial order unless process IDs are appended as arbitrary tie-breakers.",
        "marks": 5,
        "order": 2,
    }
)

# Coding Problem
cp1, _ = CodingProblem.objects.get_or_create(
    course=c1,
    title="Lab Problem: Find Maximum Quorum Size",
    defaults={
        "description": "Given a list of cluster node responses (1 for healthy, 0 for failure), calculate the maximum consecutive healthy nodes forming an unbroken quorum.\n\nInput: First line contains integers separated by spaces.\nOutput: Maximum consecutive healthy nodes.",
        "supported_languages": ["python"],
        "time_limit_sec": 3,
        "memory_limit_mb": 128,
        "max_score": 25,
        "sample_input": "1 1 0 1 1 1 0 1",
        "sample_output": "3",
        "hidden_test_cases": [
            {"input": "1 1 1 1 1", "output": "5"},
            {"input": "0 0 0", "output": "0"},
            {"input": "1 0 1 0 1 0", "output": "1"}
        ],
        "due_date": now + timedelta(days=7),
    }
)


# Interactive Notebook Material
CourseMaterial.objects.get_or_create(
    course=c1,
    title="Interactive Notebook: Vector Clocks in Python",
    defaults={
        "uploader": prof,
        "topic": "Unit 1: Fundamentals",
        "description": "Hands-on Jupyter notebook simulating message passing and clock updates between 3 virtual nodes.",
        "material_type": "notebook",
        "file_name": "vector_clocks_simulation.ipynb",
        "notebook_content": {
            "cells": [
                {
                    "cell_type": "markdown",
                    "source": "# Vector Clock Implementation\nThis notebook demonstrates vector clock increments on local and send/receive events."
                },
                {
                    "cell_type": "code",
                    "source": "import numpy as np\nclass Node:\n    def __init__(self, id, size=3):\n        self.id = id\n        self.clock = np.zeros(size, dtype=int)\n    def tick(self):\n        self.clock[self.id] += 1\n        return self.clock.copy()\n\nn0 = Node(0)\nprint('Node 0 local event clock:', n0.tick())"
                }
            ]
        },
        "is_published": True,
    }
)

# Forum & Discussions
from apps.communication.models import (
    ForumTopic, ForumReply, ShortActivity, ShortResponse,
    CourseForm, FormResponse, AnonymousFeedback, Notification, HelpDeskTicket
)

t1, _ = ForumTopic.objects.get_or_create(
    course=c1,
    title="Clarification on Log Compaction & Snapshotting in Raft",
    defaults={
        "author": student,
        "content": "When creating a snapshot of the state machine, should the index and term of the last included entry be recorded before or after saving the state file?",
        "is_pinned": True,
        "is_resolved": True,
    }
)

ForumReply.objects.get_or_create(
    topic=t1,
    author=prof,
    defaults={
        "content": "Great question! The lastIncludedIndex and lastIncludedTerm must be atomic with the snapshot state so that on crash recovery the state machine and log start from an identical checkpoint.",
        "is_accepted_answer": True,
    }
)

# Shorts / Quick Classroom Poll
sa1, _ = ShortActivity.objects.get_or_create(
    course=c1,
    title="Mid-Lecture Check: Quorum Overlap",
    defaults={
        "author": prof,
        "prompt": "If a cluster has 5 nodes, how many node failures can the cluster tolerate while maintaining full consensus safety?",
        "options": ["1 node", "2 nodes", "3 nodes", "4 nodes"],
        "is_active": True,
    }
)

# Anonymous Feedback Sample
AnonymousFeedback.objects.get_or_create(
    course=c1,
    category=AnonymousFeedback.Category.PACING,
    defaults={
        "rating": 5,
        "feedback_text": "The visual walk-throughs of the election protocol in lecture were extremely clear and effective.",
    }
)

# Attendance Session & Records
from apps.attendance.models import AttendanceSession, AttendanceRecord
today = now.date()
att_session, _ = AttendanceSession.objects.get_or_create(
    course=c1,
    date=today,
    defaults={
        "topic": "Lecture 12: Raft Consensus Protocol Internals",
        "created_by": prof,
    }
)

AttendanceRecord.objects.get_or_create(
    session=att_session,
    student=student,
    defaults={
        "status": AttendanceRecord.Status.PRESENT,
        "remarks": "On time, engaged in Q&A",
    }
)

# Scheduling / Timetable & Calendar
from apps.scheduling.models import TimetableSlot, CalendarEvent
import datetime

TimetableSlot.objects.get_or_create(
    course=c1,
    day="Monday",
    defaults={
        "start_time": datetime.time(10, 0),
        "end_time": datetime.time(11, 30),
        "room": "Hall 3B",
        "building": "Ramanujan Academic Block",
    }
)

TimetableSlot.objects.get_or_create(
    course=c1,
    day="Wednesday",
    defaults={
        "start_time": datetime.time(10, 0),
        "end_time": datetime.time(11, 30),
        "room": "Hall 3B",
        "building": "Ramanujan Academic Block",
    }
)

CalendarEvent.objects.get_or_create(
    title="Mid-Term Examination Window",
    defaults={
        "event_type": "exam",
        "start_time": now + timedelta(days=14),
        "end_time": now + timedelta(days=21),
        "location": "Central Examination Hall",
        "description": "Comprehensive semester assessment for all engineering departments.",
    }
)

# Notifications
Notification.objects.get_or_create(
    recipient=student,
    title="New Assignment: Lab 1 Raft Consensus",
    defaults={
        "message": "Prof. Vikram Sen has published Lab 1. Submission deadline is in 2 days.",
        "link": f"/classes/{c1.id}?tab=assignments",
        "notification_type": "assignment",
        "is_read": False,
    }
)

# Help Desk Ticket
HelpDeskTicket.objects.get_or_create(
    user=student,
    subject="SSH Key authorization for CS computing cluster",
    defaults={
        "ticket_type": "help",
        "description": "Need public key registered on the Turing GPU cluster for distributed training lab exercises.",
        "status": "in_progress",
        "resolution_notes": "Ticket routed to Academic Systems Admin team.",
    }
)

print("Academic CourseRoom Part 3 complete seed finished successfully.")

