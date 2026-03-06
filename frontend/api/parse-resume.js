// =============================================================================
// api/parse-resume.js — Vercel Serverless Function for Resume Analysis
// =============================================================================
// Uses Groq API (LLama 3 70B) for fast, free resume parsing.
// Groq provides an OpenAI-compatible REST API — no SDK needed.
//
// ENDPOINT: POST /api/parse-resume
// BODY:     { "text": "raw resume text..." }
// RETURNS:  { name, domain, skills[], email, location, college }
// =============================================================================

export default async function handler(req, res) {
    // Only accept POST requests
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { text } = req.body;

    if (!text || text.trim().length === 0) {
        return res.status(400).json({ error: "No resume text provided" });
    }

    const apiKey = process.env.GROQ_API_KEY;

    // If no API key is configured, fall back to regex extraction
    if (!apiKey) {
        console.log("ℹ️ No Groq API key — using regex extraction");
        return res.status(200).json(extractWithRegex(text));
    }

    try {
        // ── Call Groq API (OpenAI-compatible) ──
        const truncatedText = text.substring(0, 8000);

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

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a resume parser. You extract structured data from resume text and return ONLY valid JSON. No markdown, no explanation, just the JSON object.",
                    },
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.1,
                max_tokens: 1024,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const responseText = data.choices[0].message.content.trim();

        // Parse JSON — strip markdown code blocks if present
        let jsonStr = responseText;
        if (jsonStr.startsWith("```")) {
            jsonStr = jsonStr
                .replace(/^```(?:json)?\s*/, "")
                .replace(/```\s*$/, "");
        }

        const parsed = JSON.parse(jsonStr);

        return res.status(200).json({
            name: (parsed.name || "Not specified").trim(),
            domain: (parsed.domain || "Not specified").trim(),
            skills: Array.isArray(parsed.skills)
                ? parsed.skills
                    .map((s) => String(s).trim())
                    .filter((s) => s.length > 0 && s.length < 40)
                    .slice(0, 12)
                : ["General"],
            email: (parsed.email || "").trim(),
            location: (parsed.location || "").trim(),
            college: (parsed.college || "").trim(),
        });
    } catch (error) {
        console.error("Groq failed, falling back to regex:", error.message);
        // Fall back to regex if Groq fails
        return res.status(200).json(extractWithRegex(text));
    }
}

// =============================================================================
// Regex Fallback — Same logic from the original backend
// =============================================================================

function extractWithRegex(rawText) {
    const lines = rawText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const name = extractName(lines);
    const domain = extractDomain(lines, rawText);
    const skills = extractSkills(lines, rawText);

    const emailMatch = rawText.match(/[\w.+\-]+@[\w\-]+\.[a-z]{2,}/i);
    const email = emailMatch ? emailMatch[0] : "";

    const locMatch = rawText.match(
        /([A-Z][a-zA-Z\s]+,\s*(?:India|[A-Z][a-zA-Z]+))/
    );
    const location = locMatch ? locMatch[1].trim() : "";

    const collegeMatch = rawText.match(
        /([A-Z][a-zA-Z\s]+(College|University|Institute)[a-zA-Z\s]*)/
    );
    const college = collegeMatch ? collegeMatch[1].trim() : "";

    return { name, domain, skills, email, location, college };
}

function extractName(lines) {
    for (const line of lines) {
        const nameMatch = line.match(/^name\s*[:\-–]\s*(.+)$/i);
        if (nameMatch) return nameMatch[1].trim();
    }
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
}

function extractDomain(lines, rawText) {
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
                return match[1]
                    .trim()
                    .replace(/[.,;]+$/, "")
                    .trim();
            }
        }
    }
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
}

function extractSkills(lines, rawText) {
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
}
