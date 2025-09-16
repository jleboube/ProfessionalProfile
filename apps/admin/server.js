import express from 'express';
import basicAuth from 'express-basic-auth';
import session from 'express-session';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import mammoth from 'mammoth';
import { extractText } from 'unpdf';

dotenv.config();

// Generate session secret if not exists (in-memory only, no file writing)
let sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret === 'portfolio-session-secret-key-please-change-this') {
  sessionSecret = crypto.randomBytes(64).toString('hex');
  process.env.SESSION_SECRET = sessionSecret;
  console.log('Generated new session secret for this session');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 6900;
const DATA_FILE = '/data/data.json';
const UPLOADS_DIR = '/uploads';

// Ensure uploads directory exists
try {
  await fs.access(UPLOADS_DIR);
} catch {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit for higher quality images
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Multer configuration for resume uploads
const resumeUpload = multer({
  storage: multer.diskStorage({
    destination: async function (req, file, cb) {
      cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'resume-' + uniqueSuffix + ext);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for resume files
  fileFilter: function (req, file, cb) {
    const allowedTypes = /pdf|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const allowedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const mimetype = allowedMimeTypes.includes(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'));
    }
  }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

const authMiddleware = basicAuth({
  users: { [process.env.ADMIN_USER || 'admin']: process.env.ADMIN_PASS || 'password' },
  challenge: true,
  realm: 'Portfolio Admin'
});

app.use(authMiddleware);

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading data file:', error);
    return {
      setupCompleted: false,
      profile: {
        name: '',
        title: '',
        bio: '',
        location: '',
        email: '',
        githubUsername: ''
      },
      theme: 'system',
      resume: [],
      projects: [],
      blogEnabled: false,
      blogPosts: []
    };
  }
}

async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error writing data file:', error);
    return false;
  }
}

// Resume parsing functions
async function parseResumeText(text) {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const result = {
    profile: {
      name: '',
      title: '',
      bio: '',
      location: '',
      email: '',
      phone: '',
      website: ''
    },
    experience: [],
    education: [],
    awards: []
  };

  // Extract basic profile information
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
  const phoneRegex = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/;
  const urlRegex = /https?:\/\/[^\s]+/;

  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    
    // Try to extract name (usually first few lines, exclude contact info)
    if (!result.profile.name && !emailRegex.test(line) && !phoneRegex.test(line) && !urlRegex.test(line) && line.length < 50) {
      result.profile.name = line;
      continue;
    }
    
    // Extract email
    const emailMatch = line.match(emailRegex);
    if (emailMatch && !result.profile.email) {
      result.profile.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = line.match(phoneRegex);
    if (phoneMatch && !result.profile.phone) {
      result.profile.phone = phoneMatch[0];
    }
    
    // Extract website
    const urlMatch = line.match(urlRegex);
    if (urlMatch && !result.profile.website) {
      result.profile.website = urlMatch[0];
    }
    
    // Extract location (look for patterns like "City, ST" or "City, State ZIP")
    if (line.match(/^[A-Za-z\s]+,\s*[A-Z]{2}(\s+\d{5})?$/) && !result.profile.location) {
      result.profile.location = line;
    }
  }

  // Look for title/bio in early lines
  for (let i = 1; i < Math.min(8, lines.length); i++) {
    const line = lines[i];
    if (!emailRegex.test(line) && !phoneRegex.test(line) && !urlRegex.test(line) && 
        !line.match(/^[A-Za-z\s]+,\s*[A-Z]{2}/) && line.length > 20 && line.length < 200 && 
        !result.profile.title && !result.profile.bio) {
      if (line.toLowerCase().includes('year') || line.toLowerCase().includes('experience') || 
          line.toLowerCase().includes('leader') || line.toLowerCase().includes('manager')) {
        result.profile.bio = line;
      } else {
        result.profile.title = line;
      }
    }
  }

  // Parse experience section
  let currentSection = 'none';
  let currentEntry = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upperLine = line.toUpperCase();
    
    // Detect section headers
    if (upperLine === 'EXPERIENCE' || upperLine === 'PROFESSIONAL EXPERIENCE' || upperLine === 'WORK EXPERIENCE') {
      currentSection = 'experience';
      continue;
    } else if (upperLine === 'EDUCATION') {
      currentSection = 'education';
      continue;
    } else if (upperLine === 'AWARDS' || upperLine === 'ACHIEVEMENTS' || upperLine === 'HONORS') {
      currentSection = 'awards';
      continue;
    } else if (upperLine.includes('SKILLS') || upperLine.includes('TECHNICAL')) {
      currentSection = 'skills';
      continue;
    }
    
    if (currentSection === 'experience') {
      // Look for company/role patterns
      const companyRolePattern = /^(.+?),\s*(.+?)\s*—\s*(.+?)$/;
      const datePattern = /^([A-Za-z]+\s+\d{4})\s*-\s*([A-Za-z]+\s+\d{4}|PRESENT)$/i;
      
      const companyMatch = line.match(companyRolePattern);
      if (companyMatch) {
        // Save previous entry
        if (currentEntry) {
          result.experience.push(currentEntry);
        }
        
        currentEntry = {
          type: 'experience',
          company: companyMatch[1].trim(),
          role: companyMatch[3].trim(),
          location: companyMatch[2].trim(),
          start: '',
          end: '',
          summary: ''
        };
      } else if (line.match(datePattern) && currentEntry) {
        const dateMatch = line.match(datePattern);
        currentEntry.start = dateMatch[1];
        currentEntry.end = dateMatch[2];
      } else if (line.startsWith('-') || line.startsWith('•')) {
        // Add to summary
        if (currentEntry) {
          const bulletPoint = line.substring(1).trim();
          currentEntry.summary += (currentEntry.summary ? '\n' : '') + bulletPoint;
        }
      }
    } else if (currentSection === 'education') {
      // Look for education entries
      if (line.includes('University') || line.includes('College') || line.includes('School') || 
          line.includes('Bachelor') || line.includes('Master') || line.includes('PhD') ||
          line.includes('Available Upon Request')) {
        result.education.push({
          type: 'education',
          school: line.includes('Available Upon Request') ? '' : line,
          degree: line.includes('Available Upon Request') ? 'Available Upon Request' : '',
          start: '',
          end: '',
          summary: ''
        });
      }
    } else if (currentSection === 'awards') {
      // Look for award entries
      if (line.trim().length > 0 && !line.match(/^\d+$/)) {
        const parts = line.split(',');
        result.awards.push({
          type: 'awards',
          award: parts[0].trim(),
          organization: parts.length > 1 ? parts[1].trim() : '',
          start: parts.length > 2 ? parts[2].trim() : '',
          end: '',
          summary: ''
        });
      }
    }
  }
  
  // Save final experience entry
  if (currentEntry) {
    result.experience.push(currentEntry);
  }
  
  return result;
}

async function parseResumeFile(filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    let text = '';
    
    if (ext === '.pdf') {
      try {
        const dataBuffer = await fs.readFile(filePath);
        const result = await extractText(dataBuffer);
        text = result.text || '';
        console.log('PDF parsing successful, extracted', text.length, 'characters');
      } catch (pdfError) {
        console.error('PDF parsing error:', pdfError);
        throw new Error('Failed to parse PDF file: ' + pdfError.message);
      }
    } else if (ext === '.docx') {
      try {
        const result = await mammoth.extractRawText({ path: filePath });
        text = result.value;
        console.log('DOCX parsing successful, extracted', text.length, 'characters');
      } catch (docxError) {
        console.error('DOCX parsing error:', docxError);
        throw new Error('Failed to parse DOCX file: ' + docxError.message);
      }
    } else {
      throw new Error('Unsupported file format. Please upload a PDF or DOCX file.');
    }
    
    if (!text || text.trim().length === 0) {
      throw new Error('No text content could be extracted from the file. The file may be empty or contain only images.');
    }
    
    return await parseResumeText(text);
  } catch (error) {
    console.error('Error parsing resume:', error);
    throw error;
  }
}

app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/data', async (req, res) => {
  const success = await writeData(req.body);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save data' });
  }
});

app.post('/api/setup', async (req, res) => {
  const data = await readData();
  if (data.setupCompleted) {
    return res.status(400).json({ error: 'Setup already completed' });
  }
  
  const setupData = req.body;
  const updatedData = {
    ...data,
    setupCompleted: true,
    profile: setupData.profile || data.profile,
    resume: setupData.resume || data.resume,
    projects: setupData.projects || data.projects,
    skills: setupData.skills || data.skills || [],
    blogEnabled: setupData.blogEnabled !== undefined ? setupData.blogEnabled : data.blogEnabled
  };
  
  const success = await writeData(updatedData);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save setup data' });
  }
});

// Resume upload and parsing endpoint
app.post('/api/upload-resume', resumeUpload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file uploaded' });
    }

    const parsedData = await parseResumeFile(req.file.path);
    
    // Clean up the uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (err) {
      console.log('Error deleting temporary resume file:', err);
    }

    res.json({
      success: true,
      parsedData: parsedData
    });
  } catch (error) {
    console.error('Resume parsing error:', error);
    // Clean up file on error too
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (err) {
        console.log('Error deleting temporary resume file on error:', err);
      }
    }
    res.status(500).json({ error: 'Failed to parse resume: ' + error.message });
  }
});

// Upload single image
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate thumbnail (keep low res for grid display)
    const thumbnailName = 'thumb-' + req.file.filename;
    const thumbnailPath = path.join(UPLOADS_DIR, thumbnailName);
    
    await sharp(req.file.path)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    // Generate high-quality version for profile photos
    const hqName = 'hq-' + req.file.filename;
    const hqPath = path.join(UPLOADS_DIR, hqName);
    
    await sharp(req.file.path)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ 
        quality: 100,
        mozjpeg: true 
      })
      .png({ 
        quality: 100,
        compressionLevel: 0 
      })
      .toFile(hqPath);

    res.json({
      success: true,
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: `/uploads/${req.file.filename}`,
        hqUrl: `/uploads/${hqName}`,
        thumbnailUrl: `/uploads/${thumbnailName}`,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Get all uploaded images
app.get('/api/images', async (req, res) => {
  try {
    const files = await fs.readdir(UPLOADS_DIR);
    const images = files
      .filter(file => !file.startsWith('thumb-') && !file.startsWith('hq-') && /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        url: `/uploads/${file}`,
        thumbnailUrl: `/uploads/thumb-${file}`,
        hqUrl: `/uploads/hq-${file}`
      }));
    
    res.json(images);
  } catch (error) {
    console.error('Error reading images:', error);
    res.json([]);
  }
});

// Delete image
app.delete('/api/images/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(UPLOADS_DIR, filename);
    const thumbpath = path.join(UPLOADS_DIR, 'thumb-' + filename);
    
    await fs.unlink(filepath);
    try {
      await fs.unlink(thumbpath);
    } catch {
      // Thumbnail might not exist
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Admin portal running on http://localhost:${PORT}`);
});