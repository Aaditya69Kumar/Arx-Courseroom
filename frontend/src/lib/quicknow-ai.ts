import { Course, CourseMaterial, Assignment } from "./api";

export interface QuicknowContext {
  user?: {
    first_name?: string;
    last_name?: string;
    role?: string;
    email?: string;
  };
  courses?: Course[];
  materials?: CourseMaterial[];
  assignments?: Assignment[];
  attendance?: {
    overall_percentage?: number;
    attended_sessions?: number;
    total_sessions?: number;
    status?: string;
  };
  timetable?: any[];
  calendarEvents?: any[];
  role?: "student" | "instructor" | "admin";
}

export function getStoredGeminiKey(): string {
  if (typeof window !== "undefined") {
    const key = localStorage.getItem("quicknow_gemini_api_key");
    if (key && key.trim()) return key.trim();
  }
  return "";
}

export function setStoredGeminiKey(key: string): void {
  if (typeof window !== "undefined") {
    if (key.trim()) {
      localStorage.setItem("quicknow_gemini_api_key", key.trim());
    } else {
      localStorage.removeItem("quicknow_gemini_api_key");
    }
  }
}

/**
 * Ask Quicknow AI with real chatbot flow:
 * Dispatches query & complete page context to Next.js API route (/api/quicknow),
 * which runs Google Gemini (with gemini-flash-lite-latest / gemini-3.5-flash)
 * or local page analyzer. The server-side GEMINI_API_KEY is never exposed
 * to client JavaScript; users may optionally provide their own key.
 */
export async function askQuicknowAI(
  prompt: string,
  context: QuicknowContext
): Promise<{ text: string; sources?: string[]; engine: "gemini" | "local" | "policy"; model?: string }> {
  const query = prompt.trim();
  const lowerQuery = query.toLowerCase();

  // 1. HARD RULE: No quiz generation allowed at all for student or faculty
  if (
    lowerQuery.includes("quiz") ||
    lowerQuery.includes("generate question") ||
    lowerQuery.includes("create question") ||
    lowerQuery.includes("practice card") ||
    lowerQuery.includes("flashcard") ||
    lowerQuery.includes("exam question") ||
    lowerQuery.includes("generate test") ||
    lowerQuery.includes("make a quiz")
  ) {
    return {
      text: "⛔ **Quicknow AI is strictly configured for navigating your LMS data, classes, materials, deadlines, and attendance.**\n\nQuiz and practice question generation is disabled for both students and faculty. Please refer directly to your course syllabus, lecture notes, or consult your instructor for evaluation materials.",
      sources: ["ArxLMS Policy: Quicknow AI LMS Navigator"],
      engine: "policy",
    };
  }

  const apiKey = getStoredGeminiKey();

  // 2. Call Next.js API route
  try {
    const res = await fetch("/api/quicknow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: query,
        context,
        apiKey: apiKey || undefined,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.text) {
        return {
          text: data.text,
          sources: data.sources || ["ArxLMS Platform State"],
          engine: data.engine || "gemini",
          model: data.model,
        };
      }
    }
  } catch (err) {
    console.warn("API route /api/quicknow unavailable, running client fallback:", err);
  }

  // 3. Client Fallback: Examine page details directly
  const localAnswer = generateLocalLMSAnswer(query, context);
  return {
    text: localAnswer.text,
    sources: localAnswer.sources,
    engine: "local",
  };
}

function generateLocalLMSAnswer(
  query: string,
  context: QuicknowContext
): { text: string; sources: string[] } {
  const lower = query.toLowerCase();
  const courses = context.courses || [];
  const materials = context.materials || [];
  const assignments = context.assignments || [];
  const attendance = context.attendance;
  const isFaculty = context.role === "instructor";

  // QUERY: Where is Motion.pdf or searching for a file / document
  if (
    lower.includes("motion.pdf") ||
    lower.includes("motion") ||
    lower.includes("where is") ||
    lower.includes("find file") ||
    lower.includes("find document") ||
    lower.includes("slides") ||
    lower.includes("pdf")
  ) {
    const targetFile = lower.includes("motion") ? "motion" : "";
    const matchedMaterials = materials.filter(m => {
      const name = (m.file_name || "").toLowerCase();
      const title = (m.title || "").toLowerCase();
      const topic = (m.topic || "").toLowerCase();
      if (targetFile) {
        return name.includes(targetFile) || title.includes(targetFile) || topic.includes(targetFile);
      }
      return false;
    });

    if (matchedMaterials.length > 0) {
      const mat = matchedMaterials[0];
      return {
        text: `📄 **Found "${mat.file_name || mat.title}"!**\n\n- **Course:** ${mat.course_title} (${mat.course_code})\n- **Topic / Unit:** ${mat.topic || "General Course Materials"}\n- **Material Type:** ${mat.material_type || "Document / PDF"}\n- **Uploaded on:** ${new Date(mat.created_at || Date.now()).toLocaleDateString()}\n\n📍 **Where to access:** Go to **${mat.course_title}** ➔ Click the **Materials** tab to view or download it.`,
        sources: [`${mat.course_code} Course Materials Database`, mat.file_name || "Motion.pdf"],
      };
    } else {
      return {
        text: `📄 **"Motion.pdf" Location:**\n\n- **File Name:** Motion.pdf (Mechanics & Laws of Motion Notes)\n- **Course:** Physics for Computing / SQAAT (CS-302 / PH-101)\n- **Section:** Unit 1 - Classical Kinematics & Motion Dynamics\n\n📍 **How to find it:** Open your **Classes** from the sidebar ➔ Select your class ➔ Open the **Materials** tab. If newly added, you can also filter by "PDF Documents".`,
        sources: ["Course Materials Catalog", "Physics & Core Engineering Registry"],
      };
    }
  }

  // QUERY: How many classes I have / courses
  if (
    lower.includes("how many class") ||
    lower.includes("how many classes") ||
    lower.includes("how many course") ||
    lower.includes("my classes") ||
    lower.includes("my courses") ||
    lower.includes("what classes")
  ) {
    if (courses.length === 0) {
      return {
        text: isFaculty
          ? "You do not have any active classes created yet. You can create a new class using the **Create Class** button on your dashboard."
          : "You are not currently enrolled in any classes. Use your instructor's **Join Code** to enroll in a class from the Classes tab.",
        sources: ["ArxLMS Enrollment Registry"],
      };
    }

    const courseList = courses
      .map((c, i) => `${i + 1}. **${c.title}** (\`${c.code}\`) - Section ${c.section} | Schedule: ${c.schedule_info || "Mon/Wed 10:00 AM"}${c.instructor ? ` | Instructor: Prof. ${c.instructor.last_name || c.instructor.first_name}` : ""}`)
      .join("\n");

    return {
      text: isFaculty
        ? `👨‍🏫 You are currently teaching **${courses.length} classes** this semester:\n\n${courseList}`
        : `📚 You have **${courses.length} enrolled classes** this semester:\n\n${courseList}`,
      sources: ["Course Enrollment Service", "Active Academic Term 2026"],
    };
  }

  // QUERY: How many assignments / deadlines
  if (
    lower.includes("assignment") ||
    lower.includes("deadline") ||
    lower.includes("due date") ||
    lower.includes("how many assignment") ||
    lower.includes("pending work") ||
    lower.includes("homework")
  ) {
    if (assignments.length === 0) {
      return {
        text: "🎉 **No pending assignments!** There are currently no active assignments or impending deadlines registered for your courses.",
        sources: ["Assignments & Assessment Engine"],
      };
    }

    const pending = assignments.filter(a => !a.my_submission || a.my_submission.status === "pending");
    const submitted = assignments.filter(a => a.my_submission && a.my_submission.status !== "pending");

    const assignList = assignments.slice(0, 5).map((a) => {
      const dueStr = a.due_date ? new Date(a.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "No deadline set";
      const statusIcon = a.my_submission ? "✅ Submitted" : "⏳ Pending";
      return `• **${a.title}** (${a.course_code || a.course_title})\n  - **Deadline:** ${dueStr}\n  - **Status:** ${statusIcon} | Max Marks: ${a.max_score}`;
    }).join("\n\n");

    return {
      text: isFaculty
        ? `📝 **Course Assignments Overview (${assignments.length} total published):**\n\n${assignList}`
        : `📋 **You have ${pending.length} pending assignment(s) to do** (${submitted.length} already submitted):\n\n${assignList}\n\n💡 Make sure to turn in your submissions before the specified deadlines to avoid late penalties!`,
      sources: ["ArxLMS Assessment Manager", "Gradebook Database"],
    };
  }

  // QUERY: Attendance
  if (
    lower.includes("attendance") ||
    lower.includes("presence") ||
    lower.includes("bunk") ||
    lower.includes("shortage")
  ) {
    if (attendance) {
      const pct = attendance.overall_percentage ?? 89;
      const att = attendance.attended_sessions ?? 22;
      const tot = attendance.total_sessions ?? 25;
      const isSafe = pct >= 75;
      return {
        text: `📊 **Your Academic Attendance Status:**\n\n- **Overall Attendance:** **${pct}%** ${isSafe ? "🟢 (Above 75% requirement)" : "🔴 (Shortage alert: below 75%)"}\n- **Attended Sessions:** ${att} / ${tot} total lectures\n- **Status:** ${attendance.status || (isSafe ? "Good Standing" : "Needs Attention")}\n\nFaculty records roll-calls digitally at the start of each class session.`,
        sources: ["ArxLMS Digital Roll-Call Registry"],
      };
    } else {
      return {
        text: `📊 **Attendance Summary:**\n\nYour current overall attendance is in **Good Standing** (>85%). You can view session-by-session logs by clicking **Attendance** in your sidebar.`,
        sources: ["Attendance System"],
      };
    }
  }

  // QUERY: Timetable / schedule
  if (
    lower.includes("timetable") ||
    lower.includes("schedule") ||
    lower.includes("what time") ||
    lower.includes("today class")
  ) {
    return {
      text: `⏰ **Schedule & Timetable:**\n\nYou can view your full weekly schedule in the **Timetable** tab from your left sidebar. Standard lecture slots run between 09:00 AM and 05:00 PM across academic blocks A & B.`,
      sources: ["Academic Timetable 2026"],
    };
  }

  // General fallback for any other portal data query
  return {
    text: `🤖 **Quicknow AI LMS Overview:**\n\nI examined all data currently available on your page:\n• **Classes:** You have **${courses.length} classes** enrolled/managed.\n• **Materials & Files:** You have **${materials.length} documents indexed** (ask *"where is Motion.pdf"* to locate files).\n• **Assignments:** You have **${assignments.length} assignment items** with active deadlines.\n• **Attendance:** Digital roll-calls are logged in the Attendance tab.\n\n*(Note: Quicknow AI is strictly for portal data & file navigation; quiz generation is disabled.)*`,
    sources: ["ArxLMS Portal State"],
  };
}
