// =============================================================================
// utils/fieldExtractor.js — Extract Structured Data from Resume Text
// =============================================================================
// This utility uses TWO strategies to extract data from resume text:
//
//   1. PRIMARY: Google Gemini AI (gemini-2.0-flash)
//      → Sends the resume text to Gemini and asks it to extract name, role,
//        and skills. This is far more accurate than regex for varied formats.
//
//   2. FALLBACK: Regex patterns (if Gemini API fails or key is missing)
//      → Uses pattern matching as a backup — works offline, no API needed.
//
// WHY BOTH?
//   - Gemini gives much better results (understands context, not just patterns)
//   - But we don't want the app to break if the API key is missing or quota
//     is reached — so regex fallback ensures the app always works.
// =============================================================================

// NOTE: The @google/genai SDK is an ESM-only package.
// Our backend uses CommonJS (require). To bridge the gap, we use
// dynamic import() inside the function that needs Gemini.
// This is the standard CommonJS ↔ ESM interop pattern in Node.js.

/**
 * extractFields — Pull structured data from raw resume text
 * Tries Gemini AI first, falls back to regex if that fails.
 *
 * @param {string} rawText — Plain text extracted from a PDF resume
 * @returns {Promise<{ name: string, domain: string, skills: string[] }>}
 */
const extractFields = async (rawText) => {
    // Try Gemini AI extraction first (if API key is available)
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY_HERE") {
        try {
            console.log("🤖 Using Gemini AI for resume analysis...");
            const result = await extractWithGemini(rawText, apiKey);
            console.log("✅ Gemini extraction successful");
            return result;
        } catch (error) {
            console.warn(
                "⚠️ Gemini extraction failed, falling back to regex:",
                error.message
            );
            // Fall through to regex extraction below
        }
    } else {
        console.log(
            "ℹ️ No Gemini API key configured, using regex extraction"
        );
    }

    // Fallback to regex-based extraction
    return extractWithRegex(rawText);
};

// =============================================================================
// STRATEGY 1: Gemini AI Extraction
// =============================================================================
// Uses Google's Gemini 2.0 Flash model to intelligently parse resume text.
// The model understands context — it can figure out "John Doe" is a name
// even without a "Name:" label, and can identify skills from descriptions.

async function extractWithGemini(rawText, apiKey) {
    // Dynamic import() — required because @google/genai is ESM-only
    // and our project uses CommonJS (require). This is the official
    // Node.js way to load ESM modules from CommonJS code.
    const { GoogleGenAI } = await import("@google/genai");

    // Initialize the Google GenAI client with the API key
    const ai = new GoogleGenAI({ apiKey });

    // Truncate very long resumes to stay within token limits
    // 8000 chars is roughly 2000 tokens — well within the model's context window
    const truncatedText = rawText.substring(0, 8000);

    // The prompt tells Gemini exactly what we need and how to format the response.
    // We ask for JSON output so we can parse it programmatically.
    const prompt = `You are analyzing a resume/CV. Extract the following information from this resume text and return it as a valid JSON object (no markdown, no code blocks, just raw JSON):

{
  "name": "Full name of the person",
  "domain": "Their professional role/title/domain (e.g., 'Full Stack Developer', 'Data Scientist', 'Computer Engineer'). If not explicitly stated, infer it from their skills and experience.",
  "skills": ["array", "of", "technical", "skills", "max 12"],
  "email": "Email address",
  "location": "City, Country or City, State",
  "college": "College or University name"
}

Rules:
- For "name": Extract the person's full name. It's usually at the top of the resume.
- For "domain": Determine what this person does professionally. Look at their objective, title, experience, and skills to infer their primary domain. Be specific (not just "Engineer" but "Backend Developer" or "Machine Learning Engineer").
- For "skills": Extract up to 12 key technical skills (programming languages, frameworks, tools). Keep each skill name short (e.g., "React" not "React.js framework").
- For "email": Extract the email address if present.
- For "location": Extract their city/location if mentioned.
- For "college": Extract the name of their college, university, or educational institution.
- If you cannot determine a field, use "" (empty string) for strings or ["General"] for skills.
- Return ONLY the JSON object, nothing else.

Resume text:
${truncatedText}`;

    // Call Gemini 2.0 Flash — a fast, capable model ideal for text analysis
    // gemini-2.0-flash is the current recommended model (not deprecated)
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
    });

    // Extract the text response
    const responseText = response.text.trim();

    // Parse the JSON response from Gemini
    // Sometimes the model wraps JSON in markdown code blocks — we strip those
    let jsonStr = responseText;

    // Remove markdown code block markers if present (```json ... ```)
    if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/```\s*$/, "");
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and clean the parsed data
    return {
        name: (parsed.name || "Not specified").trim(),
        domain: (parsed.domain || "Not specified").trim(),
        skills: Array.isArray(parsed.skills)
            ? parsed.skills
                .map((s) => String(s).trim()) // Ensure all skills are strings
                .filter((s) => s.length > 0 && s.length < 40) // Remove empty or too-long entries
                .slice(0, 12) // Cap at 12 skills
            : ["General"],
        email: (parsed.email || "").trim(),
        location: (parsed.location || "").trim(),
        college: (parsed.college || "").trim(),
    };
}

// =============================================================================
// STRATEGY 2: Regex Extraction (Fallback)
// =============================================================================
// Uses pattern matching to extract fields. Less accurate than AI but works
// without any external API. Every regex pattern is explained in comments.

function extractWithRegex(rawText) {
    // Split the text into individual lines and remove empty ones
    const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const name = extractName(lines);
    const domain = extractDomain(lines, rawText);
    const skills = extractSkills(lines, rawText);

    // Email — look for email patterns
    const emailMatch = rawText.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : "";

    // Location — look for "City, India" or "City, State" pattern
    const locMatch = rawText.match(/([A-Z][a-zA-Z\s]+,\s*(?:India|[A-Z][a-zA-Z]+))/);
    const location = locMatch ? locMatch[1].trim() : "";

    // College — look for institution names
    const collegeMatch = rawText.match(/([A-Z][a-zA-Z\s]+(College|University|Institute)[a-zA-Z\s]*)/);
    const college = collegeMatch ? collegeMatch[1].trim() : "";

    return { name, domain, skills, email, location, college };
}

// --- Name Extraction (Regex) ---
// Strategy: Look for "Name: ..." label, or use the first non-header line
const extractName = (lines) => {
    // Pattern: "Name: John Doe" or "Name - John Doe"
    for (const line of lines) {
        const nameMatch = line.match(/^name\s*[:\-–]\s*(.+)$/i);
        if (nameMatch) return nameMatch[1].trim();
    }
    // Fallback: first line that looks like a name
    for (const line of lines) {
        if (
            line.length > 1 &&
            line.length < 60 &&
            !line.match(
                /^(resume|curriculum|cv|portfolio|contact|phone|email|address|http)/i
            )
        ) {
            return line;
        }
    }
    return "Not specified";
};

// --- Domain Extraction (Regex) ---
// Searches for keywords like "objective", "role", "domain"
const extractDomain = (lines, rawText) => {
    const domainKeywords = [
        "domain",
        "objective",
        "career objective",
        "role",
        "position",
        "seeking",
        "interested in",
        "profile",
        "designation",
        "title",
    ];

    for (const line of lines) {
        for (const keyword of domainKeywords) {
            const pattern = new RegExp(`${keyword}\\s*[:\\-–]?\\s*(.+)`, "i");
            const match = line.match(pattern);
            if (match && match[1].trim().length > 2) {
                return match[1].trim().replace(/[.,;]+$/, "").trim();
            }
        }
    }

    // Fallback: look for known job titles
    const jobTitles = [
        "software engineer", "web developer", "frontend developer",
        "backend developer", "full stack developer", "data scientist",
        "data analyst", "machine learning engineer", "devops engineer",
        "mobile developer", "computer engineer",
    ];
    const lowerText = rawText.toLowerCase();
    for (const title of jobTitles) {
        if (lowerText.includes(title)) {
            return title.replace(/\b\w/g, (c) => c.toUpperCase());
        }
    }
    return "Not specified";
};

// --- Skills Extraction (Regex) ---
// Finds the "Skills" section and splits its content
const extractSkills = (lines, rawText) => {
    let skillsStartIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (
            lines[i].match(
                /^(technical\s+)?skills|^technologies|^proficiencies|^competencies|^tools\s*(and|&)/i
            )
        ) {
            skillsStartIndex = i;
            break;
        }
    }

    let skillsText = "";
    if (skillsStartIndex !== -1) {
        const sectionHeaderPattern =
            /^(education|experience|work|projects|certifications|achievements|awards|hobbies|interests|references|publications|summary|objective|contact)\b/i;

        const headerLine = lines[skillsStartIndex];
        const headerContent = headerLine.replace(
            /^(technical\s+)?skills\s*[:\-–]?\s*/i,
            ""
        );
        if (headerContent.length > 2) skillsText += headerContent + ",";

        for (let i = skillsStartIndex + 1; i < lines.length; i++) {
            if (sectionHeaderPattern.test(lines[i])) break;
            skillsText += lines[i] + ",";
        }
    } else {
        const inlineMatch = rawText.match(/skills\s*[:\-–]\s*(.+)/i);
        if (inlineMatch) skillsText = inlineMatch[1];
    }

    if (skillsText.length === 0) return ["General"];

    const skills = skillsText
        .split(/[,|•·►●▪▸–/\n]+/)
        .map((s) => s.trim())
        .map((s) => s.replace(/^[-\s*]+/, ""))
        .filter((s) => s.length > 1 && s.length < 40)
        .filter(
            (s) =>
                !s.match(
                    /^(and|or|etc|including|such as|proficient|familiar|experience)$/i
                )
        );

    const unique = [...new Set(skills)];
    return unique.length > 0 ? unique.slice(0, 12) : ["General"];
};

module.exports = { extractFields };
