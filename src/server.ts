import config from "./config.js";
import express from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import https from "https";
import ffmpeg from "fluent-ffmpeg"
import { ffmpegScreenshot } from "./utils/ffmpeg.js";

const app = express();
const agent = new https.Agent({ rejectUnauthorized: false });

app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'streambot-2024',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Create the videosFolder dir if it doesn't exist
if (!fs.existsSync(config.videosDir)) {
  fs.mkdirSync(config.videosDir);
}

// Create previewCache parent dir if it doesn't exist
if (!fs.existsSync(path.dirname(config.previewCacheDir))) {
  fs.mkdirSync(path.dirname(config.previewCacheDir), { recursive: true });
}

// Create the previewCache dir if it doesn't exist
if (!fs.existsSync(config.previewCacheDir)) {
  fs.mkdirSync(config.previewCacheDir);
}

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => void) => {
    cb(null, config.videosDir);
  },
  filename: (req: any, file: { originalname: any; }, cb: (arg0: null, arg1: any) => void) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if ((req.session as any).user) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.use((req, res, next) => {
  if (req.path === "/login") {
    next();
  } else {
    authMiddleware(req, res, next);
  }
});

const generateHtmlTemplate = (content: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>StreamBot Video Manager</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
        <style>
            :root {
                --bs-body-color: #212529;
                --bs-body-bg: #f8f9fa;
                --bs-border-color: #dee2e6;
            }
            .dark-mode {
                --bs-body-color: #f8f9fa;
                --bs-body-bg: #212529;
                --bs-border-color: #495057;
            }
            body {
                color: var(--bs-body-color);
                background-color: var(--bs-body-bg);
                transition: background-color 0.3s ease, color 0.3s ease;
            }
            .card, .modal-content {
                background-color: var(--bs-body-bg);
                border-color: var(--bs-border-color);
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
            }
            .table {
                color: var(--bs-body-color);
            }
            .upload-progress {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            }
            .theme-toggle {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1001;
            }
            .logout-button {
                position: fixed;
                top: 20px;
                right: 90px;
                z-index: 1001;
            }
            .dark-mode .nav-tabs .nav-link.active {
                color: #fff;
                background-color: #495057;
                border-color: #495057;
            }
            .dark-mode .table-striped > tbody > tr:nth-of-type(odd) {
                color: #fff;
            }
            .dark-mode .btn-outline-primary,
            .dark-mode .btn-outline-secondary,
            .dark-mode .btn-outline-danger {
                color: #fff;
            }
            .dark-mode input[type="file"] {
                color: var(--bs-body-color);
            }
            .dark-mode input[type="file"]::file-selector-button {
                color: var(--bs-body-color);
                background-color: var(--bs-body-bg);
                border-color: var(--bs-border-color);
            }
            .dark-mode input::placeholder {
                color: #6c757d;
            }
            .card {
              border: 1px solid rgba(255, 255, 255, 0.125);
              transition: transform 0.3s ease-in-out;
            }
            .card:hover {
              transform: translateY(-5px);
            }
            .table {
              font-size: 0.875rem;
            }
            .table td {
              word-break: break-word;
            }
            #imageSlider {
              max-width: 100%;
              height: auto;
            }
            .carousel-item img {
              object-fit: contain;
              height: 400px;
              background-color: #000;
            }
            #toast {
              position: fixed;
              top: 20px;
              right: 20px;
              background-color: #4CAF50;
              color: white;
              padding: 15px 20px;
              border-radius: 5px;
              box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
              z-index: 9999;
              opacity: 0;
              transition: opacity 0.3s ease-in-out;
            }
            .btn-icon {
              padding: 0.25rem 0.5rem;
              font-size: 0.875rem;
              line-height: 1.5;
              border-radius: 0.2rem;
            }
            .btn-icon svg {
              width: 1rem;
              height: 1rem;
            }
            .login-bg {
                background-color: var(--bs-body-bg);
                min-height: 100vh;
            }
            .login-card {
                background-color: var(--bs-body-bg);
                border-color: var(--bs-border-color);
            }
            .login-card .card-body {
                padding: 2rem;
            }
            .login-logo {
                width: 64px;
                height: 64px;
                margin-bottom: 1rem;
            }
            .form-control, .input-group-text {
                background-color: var(--bs-body-bg);
                border-color: var(--bs-border-color);
                color: var(--bs-body-color);
            }
            .form-control:focus {
                background-color: var(--bs-body-bg);
                color: var(--bs-body-color);
            }
            .btn-primary {
                background-color: #007bff;
                border-color: #007bff;
            }
            .btn-primary:hover {
                background-color: #0056b3;
                border-color: #0056b3;
            }
        </style>
    </head>
    <body>
        <div id="toast" style="display: none;"></div>
        <div class="theme-toggle">
            <button id="themeToggle" class="btn btn-outline-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon-stars-fill" viewBox="0 0 16 16">
                    <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/>
                    <path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/>
                </svg>
            </button>
        </div>

        ${content}

        <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/js/bootstrap.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/2.11.8/umd/popper.min.js"></script>
        <script>
            // Theme toggle functionality
            const themeToggle = document.getElementById('themeToggle');
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

            function setTheme(isDark) {
                document.body.classList.toggle('dark-mode', isDark);
                themeToggle.innerHTML = isDark
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sun-fill" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon-stars-fill" viewBox="0 0 16 16"><path d="M6 .278a.768.768  0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/></svg>';
            }

            // Set initial theme based on user's preference
            setTheme(prefersDarkScheme.matches);

            // Toggle theme when the button is clicked
            themeToggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                setTheme(document.body.classList.contains('dark-mode'));
            });

            // Listen for changes in the user's preference
            prefersDarkScheme.addListener((e) => setTheme(e.matches));

            // Function to show toast message
            function showToast(message) {
                const toast = document.getElementById('toast');
                toast.textContent = message;
                toast.style.display = 'block';
                toast.style.opacity = '1';
                setTimeout(() => {
                    toast.style.opacity = '0';
                    setTimeout(() => toast.style.display = 'none', 300);
                }, 3000);
            }

            // Function to copy file name
            function copyFileName(name) {
                navigator.clipboard.writeText(name).then(() => {
                    showToast(name + " copied to clipboard!");
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            }
        </script>
    </body>
    </html>
  `;
};

// Login route
app.get("/login", (req, res) => {
  const content = `
    <div class="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5" style="background: var(--bs-body-bg);">
      <div class="card shadow-lg" style="max-width: 400px; width: 100%;">
        <div class="card-body p-5">
          <div class="text-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" class="bi bi-camera-reels text-primary" viewBox="0 0 16 16">
              <path d="M6 3a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM1 3a2 2 0 1 0 4 0 2 2 0 0 0-4 0z"/>
              <path d="M9 6h.5a2 2 0 0 1 1.983 1.738l3.11-1.382A1 1 0 0 1 16 7.269v7.462a1 1 0 0 1-1.406.913l-3.111-1.382A2 2 0 0 1 9.5 16H2a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h7zm6 8.73V7.27l-3.5 1.555v4.35l3.5 1.556zM1 8v6a1 1 0 0 0 1 1h7.5a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1z"/>
              <path d="M9 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM7 3a2 2 0 1 1 4 0 2 2 0 0 1-4 0z"/>
            </svg>
            <h2 class="mt-3 mb-0 font-weight-bold">StreamBot Video Manager</h2>
            <p class="text-muted">Please sign in to continue</p>
          </div>
          ${req.query.error ? '<div class="alert alert-danger" role="alert">Invalid username or password</div>' : ''}
          <form action="/login" method="POST">
            <div class="mb-3">
              <label for="username" class="form-label">Username</label>
              <div class="input-group">
                <span class="input-group-text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person" viewBox="0 0 16 16">
                    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z"/>
                  </svg>
                </span>
                <input type="text" class="form-control" id="username" name="username" required autofocus>
              </div>
            </div>
            <div class="mb-3">
              <label for="password" class="form-label">Password</label>
              <div class="input-group">
                <span class="input-group-text">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-lock" viewBox="0 0 16 16">
                    <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2zM5 8h6a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/>
                  </svg>
                </span>
                <input type="password" class="form-control" id="password" name="password" required>
              </div>
            </div>
            <div class="d-grid">
              <button type="submit" class="btn btn-primary btn-lg">Sign In</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `;

  res.send(generateHtmlTemplate(content));
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === config.server_username && bcrypt.compareSync(password, config.server_password)) {
    (req.session as any).user = username;
    res.redirect("/");
  } else {
    res.redirect("/login?error=1");
  }
});

// Logout route
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
    }
    res.redirect("/login");
  });
});

// Main route
app.get("/", (req, res) => {
  fs.readdir(config.videosDir, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const fileList = files.map((file) => {
      const stats = fs.statSync(path.join(config.videosDir, file));
      return { name: file, size: prettySize(stats.size) };
    });

    const content = `
      <div class="logout-button">
        <a href="/logout" class="btn btn-danger">Logout</a>
      </div>
      <div class="container my-5">
        <div class="d-flex justify-content-between align-items-center mb-4">
          <h1 class="mb-0">StreamBot Video Manager</h1>
        </div>
        
        <ul class="nav nav-tabs mb-3" id="myTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="list-tab" 
              data-bs-toggle="tab" data-bs-target="#list" type="button" role="tab"
              aria-controls="list" aria-selected="true">File List</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="upload-tab"
              data-bs-toggle="tab" data-bs-target="#upload" type="button" role="tab"
              aria-controls="upload" aria-selected="false">Upload</button>
          </li>
        </ul>
        
        <div class="tab-content" id="myTabContent">
          <div class="tab-pane fade show active" id="list" role="tabpanel" aria-labelledby="list-tab">
            <div class="card">
              <div class="card-header">
                <h5 class="card-title mb-0">Video Files</h5>
              </div>
              <div class="card-body">
                <div class="table-responsive">
                  <table class="table table-striped">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Size</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fileList
        .map(
          (file) => `
                        <tr>
                          <td>${file.name}</td>
                          <td>${file.size}</td>
                          <td>
                            <a href="/preview/${file.name}" class="btn btn-sm btn-outline-primary me-1 btn-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            </a>
                            <button class="btn btn-sm btn-outline-secondary me-1 btn-icon" onclick="copyFileName('${file.name}')">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                              </svg>
                            </button>
                            <a href="/delete/${file.name}" class="btn btn-sm btn-outline-danger btn-icon">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                                <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                                <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                              </svg>
                            </a>
                          </td>
                        </tr>
                      `
        )
        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="tab-pane fade" id="upload" role="tabpanel" aria-labelledby="upload-tab">
            <div class="row">
              <div class="col-md-6 mb-3">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Upload</h5>
                  </div>
                  <div class="card-body">
                    <form action="/api/upload" method="post" enctype="multipart/form-data">
                      <div class="mb-3">
                        <label for="localFileInput" class="form-label">Choose file</label>
                        <input type="file" class="form-control" id="localFileInput" name="file">
                      </div>
                      <button type="submit" class="btn btn-primary">Upload</button>
                    </form>
                  </div>
                </div>
              </div>
              <div class="col-md-6 mb-3">
                <div class="card">
                  <div class="card-header">
                    <h5 class="card-title mb-0">Remote Upload</h5>
                  </div>
                  <div class="card-body">
                    <form action="/api/remote_upload" method="post" enctype="multipart/form-data">
                      <div class="mb-3">
                        <label for="remoteFileInput" class="form-label">Enter URL</label>
                        <input type="url" class="form-control" id="remoteFileInput" name="link" placeholder="https://example.com/video.mp4" required>
                      </div>
                      <button type="submit" class="btn btn-primary">Upload</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    res.send(generateHtmlTemplate(content));
  });
});

// Upload route
app.post("/api/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

app.post("/api/remote_upload", upload.single("link"), async (req, res) => {
  const link = req.body.link;
  const filename = link.substring(link.lastIndexOf('/') + 1);
  const filepath = path.join(config.videosDir, filename);

  try {
    const response = await axios.get(link, { responseType: "stream", httpsAgent: agent });
    const writer = fs.createWriteStream(filepath);

    response.data.pipe(writer);

    writer.on("finish", () => {
      res.redirect("/");
    });

    writer.on("error", (err) => {
      console.error(err);
      res.status(500).send("Error uploading file");
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading file");
  }
});

app.get("/preview/:file", (req, res) => {
  const file = req.params.file;
  if (!fs.existsSync(path.join(config.videosDir, file))) {
    res.status(404).send("Not Found");
    return;
  }

  ffmpeg.ffprobe(`${config.videosDir}/${file}`, (err, metadata) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const content = `
      <div class="logout-button">
        <a href="/logout" class="btn btn-danger">Logout</a>
      </div>
      <div class="container-fluid py-4">
        <h1 class="h3 mb-4">File Preview</h1>
        <h2 class="h5 mb-4">${file}</h2>
        <div class="row">
          <div class="col-lg-4 mb-4">
            <div class="card">
              <div class="card-header">
                <h3 class="h5 mb-0">Metadata</h3>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-striped table-sm mb-0">
                    <tbody>
                      ${Object.entries(metadata.format)
        .map(([key, value]) => `
                          <tr>
                            <td class="fw-bold">${key}</td>
                            <td>${stringify(value)}</td>
                          </tr>
                        `)
        .join("")}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div class="col-lg-8">
            <div class="card">
              <div class="card-header">
                <h3 class="h5 mb-0">Preview</h3>
              </div>
              <div class="card-body p-0">
                <div id="imageSlider" class="carousel slide" data-bs-ride="carousel">
                  <div class="carousel-inner">
                    ${[1, 2, 3, 4, 5].map((num, index) => `
                      <div class="carousel-item ${index === 0 ? 'active' : ''}">
                        <img src="/api/preview/${file}/${num}" class="d-block w-100" alt="Preview ${num}">
                      </div>
                    `).join('')}
                  </div>
                  <button class="carousel-control-prev" type="button" data-bs-target="#imageSlider" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                  </button>
                  <button class="carousel-control-next" type="button" data-bs-target="#imageSlider" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="mt-4">
          <a href="/" class="btn btn-primary">Back to File List</a>
        </div>
      </div>
    `;

    res.send(generateHtmlTemplate(content));
  });
});

// generate preview of video file using ffmpeg, cache it to previewCache and serve it
app.get("/api/preview/:file/:id", async (req, res) => {
  const file = req.params.file;
  const id = parseInt(req.params.id, 10);

  // id should be 1, 2, 3, 4 or 5
  if (id < 1 || id > 5) {
    res.status(404).send("Not Found");
    return;
  }

  // check if preview exists
  const previewFile = path.resolve(config.previewCacheDir, `${file}-${id}.jpg`);
  if (fs.existsSync(previewFile)) {
    res.sendFile(previewFile);
  } else {
    try {
      await ffmpegScreenshot(file);
    } catch (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }
    res.sendFile(previewFile);
  }
})

app.get("/delete/:file", (req, res) => {
  const file = req.params.file;
  const filePath = path.join(config.videosDir, file);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(err);
        res.status(500).send("Internal Server Error");
      } else {
        res.redirect("/");
      }
    });
  } else {
    res.status(404).send("Not Found");
  }
});

function prettySize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(2)} ${units[i]}`;
}

// stringify object to <ul><li>...</li></ul>
const stringify = (obj) => {
  // if string, return it
  if (typeof obj == "string") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return `<ul>${obj.map(item => {
      return `<li>${stringify(item)}</li>`;
    }).join("")}</ul>`;
  } else {
    if (typeof obj == "object") {
      return `<ul>${Object.keys(obj).map(key => {
        return `<li>${key}: ${stringify(obj[key])}</li>`;
      }).join("")}</ul>`;
    } else {
      return obj;
    }

  }
}

app.listen(config.server_port, () => {
  console.log(`Server is running on port ${config.server_port}`);
});