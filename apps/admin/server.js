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

dotenv.config();

// Generate session secret if not exists
async function ensureSessionSecret() {
  const envPath = '/.env';
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    if (!envContent.includes('SESSION_SECRET=') || process.env.SESSION_SECRET === 'portfolio-session-secret-key-please-change-this') {
      const sessionSecret = crypto.randomBytes(64).toString('hex');
      let newEnvContent = envContent;
      
      if (envContent.includes('SESSION_SECRET=')) {
        // Replace existing SESSION_SECRET
        newEnvContent = envContent.replace(/SESSION_SECRET=.*$/m, `SESSION_SECRET=${sessionSecret}`);
      } else {
        // Add new SESSION_SECRET
        newEnvContent += `\nSESSION_SECRET=${sessionSecret}`;
      }
      
      await fs.writeFile(envPath, newEnvContent);
      process.env.SESSION_SECRET = sessionSecret;
      console.log('Generated new session secret');
    }
  } catch (error) {
    console.log('Could not update .env file for session secret:', error.message);
  }
}

await ensureSessionSecret();

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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(UPLOADS_DIR));

app.use(session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(64).toString('hex'),
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
    blogEnabled: setupData.blogEnabled !== undefined ? setupData.blogEnabled : data.blogEnabled
  };
  
  const success = await writeData(updatedData);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ success: false, error: 'Failed to save setup data' });
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
      .filter(file => !file.startsWith('thumb-') && /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
      .map(file => ({
        filename: file,
        url: `/uploads/${file}`,
        thumbnailUrl: `/uploads/thumb-${file}`
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