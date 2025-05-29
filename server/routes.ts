import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${randomBytes(16).toString('hex')}${ext}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Session setup
const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
const app = express();
app.use(session({
  secret: process.env.SESSION_SECRET || "changeme-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // set to true if using HTTPS
    maxAge: sessionTtl,
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
  try {
    const user = await storage.getUserByEmail(email);
    if (!user) return done(null, false, { message: "Incorrect email or password." });
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return done(null, false, { message: "Incorrect email or password." });
    if (!user.isActive) return done(null, false, { message: "Account is inactive." });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

// Auth middleware
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated() && req.user) return next();
  return res.status(401).json({ message: "Unauthorized" });
}

// Admin middleware
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

// Registration endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password required." });
    const existing = await storage.getUserByEmail(email);
    if (existing) return res.status(400).json({ message: "Email already registered." });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUser({ email, passwordHash, firstName, lastName });
    req.login(user, err => {
      if (err) return res.status(500).json({ message: "Login after registration failed." });
      res.json(user);
    });
  } catch (err) {
    res.status(500).json({ message: "Registration failed." });
  }
});

// Login endpoint
app.post("/api/login", passport.authenticate("local"), (req, res) => {
  res.json(req.user);
});

// Logout endpoint
app.post("/api/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

// Auth user endpoint
app.get("/api/auth/user", isAuthenticated, (req, res) => {
  res.json(req.user);
});

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

// Profile routes
app.put('/api/profile', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const profileData = updateProfileSchema.parse(req.body);
    
    const user = await storage.updateProfile(userId, profileData);
    
    await storage.logUserActivity({
      id: randomBytes(16).toString('hex'),
      userId,
      action: "profile_updated",
      metadata: { fields: Object.keys(profileData) },
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

app.post('/api/profile/picture', isAuthenticated, upload.single('picture'), async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const user = await storage.updateProfilePicture(userId, imageUrl);
    
    await storage.logUserActivity({
      id: randomBytes(16).toString('hex'),
      userId,
      action: "profile_picture_updated",
      metadata: { filename: req.file.filename },
    });

    res.json({ user, imageUrl });
  } catch (error) {
    console.error("Error uploading profile picture:", error);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
});

// API Key routes
app.get('/api/keys', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const apiKeys = await storage.getUserApiKeys(userId);
    res.json(apiKeys);
  } catch (error) {
    console.error("Error fetching API keys:", error);
    res.status(500).json({ message: "Failed to fetch API keys" });
  }
});

app.post('/api/keys', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { name } = req.body;
    
    const result = await storage.generateApiKey(userId, name);
    
    await storage.logUserActivity({
      id: randomBytes(16).toString('hex'),
      userId,
      action: "api_key_generated",
      metadata: { keyName: name },
    });

    res.json(result);
  } catch (error) {
    console.error("Error generating API key:", error);
    res.status(500).json({ message: "Failed to generate API key" });
  }
});

app.post('/api/keys/:keyId/regenerate', isAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { keyId } = req.params;
    
    const result = await storage.regenerateApiKey(userId, keyId);
    
    await storage.logUserActivity({
      id: randomBytes(16).toString('hex'),
      userId,
      action: "api_key_regenerated",
      metadata: { keyId },
    });

    res.json(result);
  } catch (error) {
    console.error("Error regenerating API key:", error);
    res.status(500).json({ message: "Failed to regenerate API key" });
  }
});

// Public API routes (using API keys)
app.get('/api/v1/profile', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    res.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      linkedinProfile: user.linkedinProfile,
      profilePicture: user.profileImageUrl,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching profile via API:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

app.put('/api/v1/profile', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    const profileData = updateProfileSchema.parse(req.body);
    
    const updatedUser = await storage.updateProfile(user.id, profileData);
    
    res.json({
      id: updatedUser.id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      bio: updatedUser.bio,
      linkedinProfile: updatedUser.linkedinProfile,
      profilePicture: updatedUser.profileImageUrl,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating profile via API:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

app.post('/api/v1/profile/picture', isAuthenticated, upload.single('picture'), async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    const updatedUser = await storage.updateProfilePicture(user.id, imageUrl);
    
    res.json({
      message: "Profile picture updated successfully",
      profilePicture: updatedUser.profileImageUrl,
    });
  } catch (error) {
    console.error("Error uploading profile picture via API:", error);
    res.status(500).json({ message: "Failed to upload profile picture" });
  }
});

// Admin routes
app.get('/api/admin/users', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search;
    
    const result = await storage.getAllUsers(page, limit, search);
    res.json(result);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

app.get('/api/admin/stats', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const stats = await storage.getUserStats();
    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

app.patch('/api/admin/users/:userId/status', isAuthenticated, requireAdmin, async (req: any, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;
    
    const user = await storage.toggleUserStatus(userId, isActive);
    
    await storage.logUserActivity({
      id: randomBytes(16).toString('hex'),
      userId: req.user.claims.sub,
      action: "user_status_changed",
      metadata: { targetUserId: userId, newStatus: isActive },
    });

    res.json(user);
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

export function registerRoutes(app) {
  const httpServer = createServer(app);
  return httpServer;
}
