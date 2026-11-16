# Arx CourseRoom — Architectural Documentation & Deployment Guide

## Overview
**Arx CourseRoom** is a university Learning Management System built for students, instructors, and administrators, engineered with curriculum-locked Retrieval-Augmented Generation (RAG) and strict server-side role governance.

---

## 1. System Architecture

```
                    ┌──────────────────────────────────────────┐
                    │          Next.js App Router              │
                    │   (TypeScript, Tailwind CSS, shadcn/ui)  │
                    │         http://localhost:3000            │
                    └─────────────────────┬────────────────────┘
                                          │
                                   REST API (JWT)
                                          │
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │           Django REST Framework          │
                    │         http://127.0.0.1:8000/api/v1/    │
                    │  - Authentication, Throttling & Roles    │
                    │  - Coursework, Join Codes & Grading      │
                    │  - Vector Embedding & Query Routing      │
                    └──────────────┬───────────────────┬───────┘
                                   │                   │
                        Supabase PostgreSQL       Supabase Storage
                        (pgvector RAG vault)    (Private Materials)
```

> **Security Boundary**: The browser client **never** connects directly to PostgreSQL or Supabase storage buckets. All operations pass through Django API endpoints where role permissions and institutional policies are strictly enforced.

---

## 2. Directory Structure

```
ArxLMSXceed/
├── frontend/                     # Next.js App Router (TypeScript + Tailwind CSS)
│   ├── public/
│   │   └── campus-bg.jpg         # Campus aerial background (Home page only)
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Landing page (hero, academic pillars, portal entry)
│   │   │   ├── login/
│   │   │   │   ├── student/      # Student login & self-registration
│   │   │   │   └── instructor/   # Faculty login (strict institutional policy)
│   │   │   ├── classes/
│   │   │   │   ├── page.tsx      # My Classes (Grid/List, Filter tabs, Join Class dialog)
│   │   │   │   └── [classId]/
│   │   │   │       └── page.tsx  # Dedicated Classroom Workspace (15 navigation tabs)
│   │   │   └── dashboard/
│   │   │       ├── student/      # Real derived metrics, To-do list, Timetable, Materials
│   │   │       ├── instructor/   # Faculty metrics, Course roster, Create Class modal
│   │   │       └── admin/        # Institutional user directory & security logs
│   │   ├── components/
│   │   │   ├── dashboard-shell.tsx  # Full responsive sidebar (Learning, Operations, AI)
│   │   │   ├── join-class-modal.tsx # Code-based student enrollment dialog
│   │   │   ├── create-class-modal.tsx # Instructor classroom creation dialog
│   │   │   ├── theme-provider.tsx   # Next-themes wrapper
│   │   │   └── theme-toggle.tsx     # Light/Dark mode switcher
│   │   └── lib/
│   │       ├── api.ts            # Typed client API (Courses, Materials, Announcements)
│   │       ├── auth.ts           # Authentication helper & session storage
│   │       └── utils.ts          # Class merging utility (clsx + tailwind-merge)
├── backend/                      # Django REST Framework
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py           # Shared settings, SimpleJWT, Throttling, Supabase, RAG
│   │   │   ├── development.py    # Local dev settings (SQLite fallback, debug)
│   │   │   └── production.py     # Hardened security (SSL, HSTS, secure cookies)
│   │   ├── api_router.py         # Versioned /api/v1/ route aggregation
│   │   ├── urls.py               # Root URL configuration
│   │   └── .env.example & .env
│   ├── apps/
│   │   ├── core/                 # Health check, exception handler, role permissions
│   │   ├── accounts/             # Custom User model (UUID), JWT auth, change password
│   │   ├── courses/              # Course, Enrollment, Announcement models & Join Code API
│   │   ├── materials/            # CourseMaterial models with pgvector indexing status
│   │   ├── assessments/          # Assignment & Submission models
│   │   ├── scheduling/           # Timetables & lectures
│   │   ├── attendance/           # Roll-call tracking
│   │   ├── communication/        # Discussion forums & announcements
│   │   └── ai_assistant/         # Curriculum RAG & pgvector embedding pipelines
└── docs/
    └── architecture.md           # This document
```

---

## 3. Seeded Accounts & Live Test Data

| Role | Email | Password | Allowed Portal |
|---|---|---|---|
| **Student** | `student@arx.edu` | `student123` | Student Entrance (`/login/student`) |
| **Faculty** | `prof@arx.edu` | `prof12345` | Faculty Portal (`/login/instructor`) |
| **Administrator** | `admin@arx.edu` | `admin12345` | Django Admin (`/admin/`) & Admin Console |

### Ready Join Codes for Testing
- **`DATA-305`**: *CS-305: High-Performance Database Internals* (Open for enrollment testing).
- **`DIST-401`**: *CS-401: Distributed Systems & Cloud Computing*.
- **`KERN-601`**: *CS-601: Advanced Operating Systems & Kernel Design*.

---

## 4. Part 2 REST API Endpoints (`/api/v1/`)

| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/auth/login/` | Authenticate and obtain JWT tokens + actual verified role | Public |
| `POST` | `/auth/register/` | Self-register student account (subject to policy) | Public |
| `GET` | `/auth/me/` | Retrieve current authenticated user profile | Any Authenticated |
| `POST` | `/auth/change-password/` | Change password with old password verification | Any Authenticated |
| `GET` | `/courses/` | List accessible courses (enrolled for student, taught for instructor) | Any Authenticated |
| `POST` | `/courses/` | Create a classroom with section, schedule, and join code | Instructor / Admin |
| `GET` | `/courses/<id>/` | Course details and enrollment status | Enrolled Student or Instructor |
| `PATCH` | `/courses/<id>/` | Edit course metadata, section, or status | Course Instructor / Admin |
| `DELETE` | `/courses/<id>/` | Archive course | Course Instructor / Admin |
| `POST` | `/courses/join/` | Join a classroom via unique class code | Student Only |
| `GET` | `/courses/<id>/participants/` | List instructor and enrolled students | Enrolled or Instructor |
| `GET` | `/courses/<id>/announcements/` | List course announcements | Enrolled or Instructor |
| `POST` | `/courses/<id>/announcements/` | Post course announcement | Course Instructor / Admin |
| `GET` | `/courses/dashboard-summary/` | Derived live metrics for student or faculty | Any Authenticated |
| `GET` | `/materials/` | List course materials (drafts hidden from students) | Enrolled or Instructor |
| `POST` | `/materials/` | Upload PDF / lecture note with title, topic, and type | Course Instructor / Admin |
| `PATCH` | `/materials/<id>/` | Update material metadata or replace document | Course Instructor / Admin |
| `DELETE` | `/materials/<id>/` | Delete resource from vault | Course Instructor / Admin |
| `POST` | `/materials/<id>/index/` | Vectorize PDF into pgvector curriculum store | Course Instructor / Admin |
| `GET` | `/assessments/` | List assignments and quizzes for enrolled courses | Any Authenticated |
| `POST` | `/assessments/<id>/submit/` | Submit assignment answer or file | Student Only |

---

## 5. Verification & Test Commands

### Run Full Backend Test Suite
```powershell
cd backend
.\venv\Scripts\python manage.py test apps.courses apps.accounts
```
*Result: 17/17 tests passing (role gating, cross-role restriction, join codes, material upload authorization).*

### Run Frontend Production Build
```powershell
cd frontend
npm run build
```
*Result: 11 static/dynamic App Router pages compiled cleanly with zero TypeScript errors.*
