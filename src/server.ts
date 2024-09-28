import config from "./config";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import https from "https";
import ffmpeg from "fluent-ffmpeg"

const app = express();
const agent = new https.Agent({ rejectUnauthorized: false });

const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: (arg0: null, arg1: string) => void) => {
    cb(null, config.videosFolder);
  },
  filename: (req: any, file: { originalname: any; }, cb: (arg0: null, arg1: any) => void) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

// Authentication middleware
app.use((req, res, next) => {
  const auth = { name: config.server_username, password: config.server_password };

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (username === auth.name && password === auth.password) {
    next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="My Realm"');
    res.status(401).send('Invalid credentials');
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
                --bs-body-bg: #fff;
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
              animation: slideInDown 0.5s ease-in-out forwards;
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

        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
        <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.5.4/dist/umd/popper.min.js"></script>
        <script>
            // Theme toggle functionality
            const themeToggle = document.getElementById('themeToggle');
            const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');

            function setTheme(isDark) {
                document.body.classList.toggle('dark-mode', isDark);
                themeToggle.innerHTML = isDark
                    ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-sun-fill" viewBox="0 0 16 16"><path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z"/></svg>'
                    : '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-moon-stars-fill" viewBox="0 0 16 16"><path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.734 1.734 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.734 1.734 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.734 1.734 0 0 0 1.097-1.097l.387-1.162zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.156 1.156 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.156 1.156 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732L13.863.1z"/></svg>';
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
        </script>
    </body>
    </html>
  `;
};

app.get("/", (req, res) => {
  fs.readdir(config.videosFolder, (err, files) => {
    if (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const fileList = files.map((file) => {
      const stats = fs.statSync(path.join(config.videosFolder, file));
      return { name: file, size: prettySize(stats.size) };
    });

    const content = `
      <div class="container my-5">
        <h1 class="mb-4">StreamBot Video Manager</h1>
        
        <ul class="nav nav-tabs mb-3" id="myTab" role="tablist">
          <li class="nav-item" role="presentation">
            <button class="nav-link active" id="list-tab" data-bs-toggle="tab" data-bs-target="#list" type="button" role="tab" aria-controls="list" aria-selected="true">File List</button>
          </li>
          <li class="nav-item" role="presentation">
            <button class="nav-link" id="upload-tab" data-bs-toggle="tab" data-bs-target="#upload" type="button" role="tab" aria-controls="upload" aria-selected="false">Upload</button>
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
                            <a href="/preview/${file.name}" class="btn btn-sm btn-outline-primary me-1">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-eye" viewBox="0 0 16 16">
                                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
                                <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
                              </svg>
                            </a>
                            <button class="btn btn-sm btn-outline-secondary me-1" onclick="copyFileName('${file.name}')">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
                              </svg>
                            </button>
                            <a href="/delete/${file.name}" class="btn btn-sm btn-outline-danger">
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
                      <input type="file" class="form-control" id="localFileInput" name="file">
                      <button type="submit" class="btn btn-primary mt-2">Upload</button>
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
                      <input type="url" class="form-control mb-2" name="link" placeholder="Enter URL" required>
                      <button type="submit" class="btn btn-primary">Upload</button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <script>
        function copyFileName(name) {
            // Copy the file name to clipboard
            navigator.clipboard.writeText(name).then(() => {
                const toast = $('#toast');
                toast.text(name + " copied to clipboard!");
                toast.css('display', 'block');
                
                setTimeout(() => {
                    toast.css('opacity', 1);
                }, 100);

                setTimeout(() => {
                    toast.css('opacity', 0);
                    setTimeout(() => toast.css('display', 'none'), 300);
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    </script>
    `;

    res.send(generateHtmlTemplate(content));
  });
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  res.redirect("/");
});

app.post("/api/remote_upload", upload.single("link"), async (req, res) => {
  const link = req.body.link;
  const filename = link.substring(link.lastIndexOf('/') + 1);
  const filepath = path.join(config.videosFolder, filename);

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
  if (!fs.existsSync(path.join(config.videosFolder, file))) {
    res.status(404).send("Not Found");
    return;
  }

  ffmpeg.ffprobe(`${config.videosFolder}/${file}`, (err, metadata) => {
    if (err) {
      console.log(err);
      res.status(500).send("Internal Server Error");
      return;
    }

    const content = `
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
        <a href="/" class="btn btn-primary mt-4">Back to File List</a>
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
  const previewFile = path.resolve(config.previewCache, `${file}-${id}.jpg`);
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
  const filePath = path.join(config.videosFolder, file);

  if (!fs.existsSync(filePath)) {
    res.status(404).send("File not found");
    return;
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(err);
      res.status(500).send("Error deleting file");
      return;
    }

    res.redirect("/");
  });
});

let ffmpegRunning = {};

async function ffmpegScreenshot(video) {
  return new Promise<void>((resolve, reject) => {
    if (ffmpegRunning[video]) {
      // wait for ffmpeg to finish
      let wait = () => {
        if (ffmpegRunning[video] == false) {
          resolve();
        }
        setTimeout(wait, 100);
      }
      wait();
      return;
    }
    ffmpegRunning[video] = true
    const ts = ['10%', '30%', '50%', '70%', '90%'];
    const takeOne = (i) => {
      if (i >= ts.length) {
        ffmpegRunning[video] = false;
        resolve();
        return;
      }
      console.log(`Taking screenshot ${i + 1} of ${video} at ${ts[i]}`)
      ffmpeg(`${config.videosFolder}/${video}`).on("end", () => {
        takeOne(i + 1);
      }).on("error", (err) => {
        ffmpegRunning[video] = false;
        reject(err);
      })
        .screenshots({
          count: 1,
          filename: `${video}-${i + 1}.jpg`,
          timestamps: [ts[i]],
          folder: config.previewCache,
          // take screenshot at 640x480
          size: "640x480"
        });
    }
    takeOne(0);
  });
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

const prettySize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
};

app.use("/videos", express.static(config.videosFolder));

// Create necessary folders
if (!fs.existsSync(config.videosFolder)) {
  fs.mkdirSync(config.videosFolder);
}

if (!fs.existsSync(config.previewCache)) {
  fs.mkdirSync(config.previewCache);
}

app.listen(config.server_port, () => {
  console.log(`Server is running on port ${config.server_port}`);
});