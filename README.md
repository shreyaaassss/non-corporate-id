# Resume → Digital ID Card Generator

> Upload your resume as a PDF, and this system automatically extracts your name, skills, and domain to generate a professional digital ID card with a QR code linking to your resume.

Built as a **Dockerized full-stack application** demonstrating containerization, inter-service communication, and volume persistence.

---

## 🏗️ Architecture

```
┌─────────────────┐
│    Browser       │
│  (localhost:3000)│
└────────┬────────┘
         │ HTTP requests
         ▼
┌─────────────────┐         ┌──────────────────┐
│   Frontend      │         │   Backend        │
│   Container     │──REST──▶│   Container      │
│   (React)       │  API    │   (Express.js)   │
│   Port 3000     │         │   Port 5000      │
└─────────────────┘         └────┬────────┬────┘
                                 │        │
                    ┌────────────┘        └────────────┐
                    ▼                                  ▼
          ┌──────────────────┐              ┌─────────────────┐
          │   MongoDB        │              │  uploads/       │
          │   Container      │              │  (Bind Mount)   │
          │   Port 27017     │              │  PDFs & Photos  │
          └──────────────────┘              └─────────────────┘

          All containers connected via "idcard-network" (Docker bridge)
```

---

## 📋 Prerequisites

- **Docker Desktop** — [download here](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** — included with Docker Desktop
- **Gemini API Key** — free from [Google AI Studio](https://aistudio.google.com/app/apikey)

That's it! No Node.js, no MongoDB, no npm — Docker handles everything.

---

## 🚀 How to Run

### 1. Add your Gemini API key
Open `.env` and replace `YOUR_GEMINI_API_KEY_HERE` with your actual key:
```
GEMINI_API_KEY=AIzaSy...
```

### 2. Start the application
```bash
cd resume-idcard
docker-compose up --build
```

### 3. Open in browser
Navigate to: **http://localhost:3000**

### 4. Upload a resume
- Select a PDF file
- Optionally add a profile photo
- Click "Generate My ID Card"

### 5. Stop the application
```bash
# Press Ctrl+C in the terminal, then:
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

---

## 📁 Project Structure

```
resume-idcard/
│
├── docker-compose.yml          ← Orchestrates all 3 containers
├── .env                        ← Environment variables
├── README.md                   ← This file
├── uploads/                    ← Persistent volume for PDFs & photos
│
├── frontend/                   ← React application (Port 3000)
│   ├── Dockerfile
│   ├── package.json
│   ├── public/index.html
│   └── src/
│       ├── index.js            ← React entry point
│       ├── App.js              ← Routes & global styles
│       ├── pages/
│       │   ├── UploadPage.js   ← Upload form
│       │   └── CardPage.js     ← Card display page
│       └── components/
│           ├── IDCard.js       ← The card UI
│           └── QRDisplay.js    ← QR code renderer
│
└── backend/                    ← Express.js API (Port 5000)
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── server.js           ← Express entry point
        ├── routes/resume.js    ← API endpoint definitions
        ├── controllers/
        │   └── resumeController.js  ← Business logic
        ├── models/IDCard.js    ← MongoDB schema
        └── utils/
            ├── pdfParser.js    ← PDF text extraction
            ├── fieldExtractor.js ← Gemini AI + regex data extraction
            └── qrGenerator.js  ← QR code generation (mobile-scannable)
```

---

## 🐳 What Each Container Does

| Container | Image | Port | Role |
|-----------|-------|------|------|
| `idcard-frontend` | Node 18 + React | 3000 | Serves the web UI |
| `idcard-backend` | Node 18 + Express | 5000 | REST API, file handling, PDF parsing |
| `idcard-mongodb` | MongoDB 7 | 27017 | Stores ID card records |

---

## 🔗 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload-resume` | Upload PDF + optional photo, returns ID card data |
| `GET` | `/api/id/:id` | Fetch card data by MongoDB document ID |
| `GET` | `/api/resume/:filename` | Download the raw resume PDF |
| `GET` | `/uploads/:filename` | Static file access for uploaded files |

---

## 🎓 How to Explain This to Your Examiner

1. **Docker Compose orchestration**: "One YAML file defines three services. `docker-compose up` builds images, creates containers, sets up networking, and starts everything. No manual setup needed."

2. **Container networking**: "Containers find each other by service name, not IP address. The backend connects to `mongodb://mongodb:27017` — Docker's internal DNS resolves `mongodb` to the right container."

3. **Volume persistence**: "The `uploads/` folder is bind-mounted into the backend container. Even if the container is destroyed and recreated, uploaded files remain on the host. MongoDB uses a named volume (`mongo-data`) for the same reason."

4. **Layer caching in Dockerfiles**: "We copy `package.json` first and run `npm install` before copying source code. If only source code changes, Docker reuses the cached dependency layer — rebuilds go from minutes to seconds."

5. **Environment variables via `.env`**: "All configuration (database URL, ports, allowed origins) is externalized in the `.env` file. No secrets or config is hardcoded in the source code. This follows the 12-factor app methodology."

---

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router 6, Axios
- **Backend**: Node.js 18, Express 4, Multer, pdf-parse, qrcode
- **AI**: Google Gemini 2.0 Flash (via @google/genai SDK)
- **Database**: MongoDB 7 with Mongoose ODM
- **Infrastructure**: Docker, Docker Compose

---

## 📝 License

Academic project — free to use and modify.
