
// File List and Upload to config.videosFolder
import config from "./config.json";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import axios from "axios";
import https from "https";

const app = express();
const agent = new https.Agent({ rejectUnauthorized: false });


const user = config.server.username || 'admin';
const pass = config.server.password || 'admin';
const port = config.server.port || '8080';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, config.videosFolder);
    }, 
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    },
});

const upload = multer({ storage: storage });


app.use((req, res, next) => {
  const auth = {name: user, password: pass};

  const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
  const [username, password] = Buffer.from(b64auth, 'base64').toString().split(':');

  if (username === auth.name && password === auth.password) {
    next();
  } else {
    res.set('WWW-Authenticate', 'Basic realm="My Realm"');
    res.status(401).send('Invalid credentials');
  }
});

// file upload
app.post("/api/upload", upload.single("file"), (req, res) => {

    // provide a return button
    const template = `
        ${template_style}
        <div class="container">
            <h1>File Uploaded</h1>
            <a href="/" class="btn btn-primary">Return</a>
        </div>
    `;
    res.send(template);
})

// remote upload
app.post("/api/remote_upload", upload.single("link"), async (req, res) => {
    const link = req.body.link;
    const filename = link.substring(link.lastIndexOf('/') + 1);
    const filepath = path.join(config.videosFolder, filename);
  
    try {
      const response = await axios.get(link, { responseType: 'stream', httpsAgent: agent });
      const writer = fs.createWriteStream(filepath);
  
      response.data.pipe(writer);
  
      writer.on('finish', () => {
        const template = `
          ${template_style}
          <div class="container">
            <h1>File Uploaded successfully: ${filename}</h1>
            <a href="/" class="btn btn-primary">Return</a>
          </div>
        `;
        res.send(template);
      });
  
      writer.on('error', (err) => {
        console.error(err);
        const template = `
          ${template_style}
          <div class="container">
            <h1>Error uploading file</h1>
            <a href="/" class="btn btn-primary">Return</a>
          </div>
        `;
        res.send(template);
      });
    } catch (err) {
      console.error(err);
      const template = `
        ${template_style}
        <div class="container">
          <h1>Error uploading file</h1>
          <a href="/" class="btn btn-primary">Return</a>
        </div>
      `;
      res.send(template);
    }
})

// Simple UI to show all files in config.videosFolder
const template_style = `
    <!-- provide a bootstrap style by using CDN -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.1/css/bootstrap.min.css" integrity="sha512-Z/def5z5u2aR89OuzYcxmDJ0Bnd5V1cKqBEbvLOiUNWdg9PQeXVvXLI90SE4QOHGlfLqUnDNVAYyZi8UwUTmWQ==" crossorigin="anonymous" referrerpolicy="no-referrer" />
    <style>
        body {
        background-color: #f8f8f8;
        color: #333;
        font-family: "Arial", sans-serif;
        }
    
        h1 {
        color: #555;
        margin-bottom: 20px;
        }
    
        .container {
        margin: 20px auto;
        max-width: 800px;
        }
    
        .table {
        background-color: #fff;
        border: 1px solid #ddd;
        border-collapse: collapse;
        width: 100%;
        }
    
        .table th,
        .table td {
        padding: 10px;
        }
    
        .table th {
        font-weight: bold;
        background-color: #f5f5f5;
        border-top: 1px solid #ddd;
        border-bottom: 1px solid #ddd;
        }
    
        .table tr:hover {
        background-color: #f9f9f9;
        }
    
        .form-group {
        margin-bottom: 20px;
        }
    
        .form-control {
        width: 100%;
        padding: 8px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        }
    
        .btn-primary {
        background-color: #007bff;
        color: #fff;
        border: none;
        }
    
        .btn-primary:hover {
        background-color: #0069d9;
        }
    
        .btn-success {
        background-color: #28a745;
        color: #fff;
        border: none;
        }
    
        .btn-success:hover {
        background-color: #218838;
        }
    </style>
    `

const prettySize = (size) => {
    if (size < 1024) {
        return `${size} B`;
    } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
    } else if (size < 1024 * 1024 * 1024) {
        return `${(size / 1024 / 1024).toFixed(2)} MB`;
    } else {
        return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }
}

app.get("/", (req, res) => {
    fs.readdir(config.videosFolder, (err, files) => {
        if (err) {
            console.log(err);
        } else {
            // template to show all files with links and a form to upload a file
            const template = `
            ${template_style}
            <div class="container">
              <h1>Video List</h1>
              <div class="table-responsive">
                <table class="table table-striped table-sm">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Preview</th>
                      <th>Copy</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${files.map(file => {
                      const stats = fs.statSync(path.join(config.videosFolder, file));
                      return `
                        <tr>
                          <td>${file}</td>
                          <td>${prettySize(stats.size)}</td>
                          <td><a href="/preview/${file}">Preview</a></td>
                          <td>
                            <button class="btn btn-sm btn-primary copy-button" data-clipboard-text="${path.parse(file).name.replace(/\s/g, '')}">
                              Copy
                            </button>
                          </td>
                          <td><a href="/delete/${file}">Delete</a></td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              </div>
              
              <h1>Upload File</h1>
              <form action="/api/upload" method="post" enctype="multipart/form-data">
                <div class="form-group">
                  <label for="fileInput">Select File:</label>
                  <input type="file" id="fileInput" name="file" required />
                </div>
                <div class="form-group">
                  <button type="submit" class="btn btn-primary">Upload</button>
                </div>
              </form>
              
              <form action="/api/remote_upload" method="post" enctype="multipart/form-data">
                <div class="form-group">
                  <label for="linkInput">Remote Upload:</label>
                  <input type="text" class="form-control" id="linkInput" name="link" placeholder="Link" required />
                </div>
                <div class="form-group">
                  <button type="submit" class="btn btn-primary">Upload</button>
                </div>
              </form>
            </div>
            
            <script>
            const copyButtons = document.querySelectorAll('.copy-button');
            copyButtons.forEach(button => {
              button.addEventListener('click', () => {
                const clipboardText = button.getAttribute('data-clipboard-text');
                navigator.clipboard.writeText(clipboardText)
                  .then(() => {
                    button.textContent = 'Copied';
                    button.classList.remove('btn-primary');
                    button.classList.add('btn-success');
                  })
                  .catch(error => {
                    console.error('Unable to copy text:', error);
                  });
              });
            });
            </script>            
            `;
            res.send(template);
        }
    })
})

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
        ffmpegRunning[video] =  true
        const ffmpeg = require("fluent-ffmpeg");
        const ts = ['10%', '30%', '50%', '70%', '90%'];
        const takeOne = (i) => {
            if (i >= ts.length) {
                ffmpegRunning[video] = false;
                resolve();
                return;
            }
            console.log(`Taking screenshot ${i+1} of ${video} at ${ts[i]}`)
            ffmpeg(`${config.videosFolder}/${video}`).on("end", () => {
                takeOne(i + 1);
            }).on("error", (err) => {
                ffmpegRunning[video] = false;
                reject(err);
            })
            .screenshots({
                count: 1,
                filename: `${video}-${i+1}.jpg`,
                timestamps: [ts[i]],
                folder: config.previewCache,
                // take screenshot at 640x480
                size: "640x480"
            });
        }
        takeOne(0);
    });
}

// generate preview of video file using ffmpeg, cache it to previewCache and serve it
app.get("/api/preview/:file/:id", async (req, res) => {
    const file = req.params.file;
    const id = req.params.id;
    // id should be 1, 2, 3, 4 or 5
    if (id < 1 || id > 5) {
        res.status(404).send("Not Found");
        return;
    }
    // check if preview exists `${file}-%i.jpg`
    const previewFile = path.join(config.previewCache, `${file}-${id}.jpg`);
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


// page to show preview
app.get("/preview/:file", (req, res) => {
    const file = req.params.file;
    // check if file exists
    if (!fs.existsSync(path.join(config.videosFolder, file))) {
        res.status(404).send("Not Found");
        return;
    }

    // get metadata of the file and format it to a table with bootstrap using node-fluent-ffmpeg
    const ffmpeg = require("fluent-ffmpeg");
    ffmpeg.ffprobe(`${config.videosFolder}/${file}`, (err, metadata) => {
        if (err) {
            console.log(err);
            res.status(500).send("Internal Server Error");
            return;
        }
        // template to show metadata using bootstrap
        const template = `
            ${template_style}
            <div class="container">
                <h1>Metadata</h1>
                <div class="table-responsive">
                    <table class="table table-striped table-sm">
                        <thead>
                            <tr>
                                <th>Key</th>
                                <th>Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.keys(metadata.format).map(key => {
                                return `
                                    <tr>
                                        <td>${key}</td>
                                        <td>${stringify(metadata.format[key])}</td>
                                    </tr>
                                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
                <h1>Preview</h1>
                <!-- waterfall layout the preview images -->
                <div class="row">
                    <div class="col-6 col-md-4 col-lg-3">
                        <a href="/api/preview/${file}/1"><img src="/api/preview/${file}/1" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/2"><img src="/api/preview/${file}/2" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/3"><img src="/api/preview/${file}/3" class="img-fluid" /></a>
                    </div>
                    <div class="col-6 col-md-4 col-lg-3">
                        <a href="/api/preview/${file}/4"><img src="/api/preview/${file}/4" class="img-fluid" /></a>
                        <a href="/api/preview/${file}/5"><img src="/api/preview/${file}/5" class="img-fluid" /></a>
                    </div>
                </div>
                <a href="/" class="btn btn-primary">Return</a>
            </div>
        `;
        res.send(template);
    });
})

// page to delete file
app.get("/delete/:file", (req, res) => {
    const file = req.params.file;
    // check if file exists
    if (!fs.existsSync(path.join(config.videosFolder, file))) {
        res.status(404).send("Not Found");
        return;
    }

    fs.unlink(path.join(config.videosFolder, file) ,function(err){
        if(err) return console.log(err);
        console.log('file ( ' + file + ' ) deleted successfully');
        const template = `
            ${template_style}
            <div class="container">
                <h1>file deleted successfully</h1>
                <a href="/" class="btn btn-primary">Return</a>
            </div>
        `;
        res.send(template);

    });  


})

// create cache folder if not exists
if (!fs.existsSync(config.previewCache)) {
    fs.mkdirSync(config.previewCache);
}

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})