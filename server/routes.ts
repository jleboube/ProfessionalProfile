import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { updateProfileSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomBytes } from "crypto";

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

// API Key validation middleware
async function validateApiKey(req: any, res: any, next: any) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ message: "API key required" });
  }

  const user = await storage.validateApiKey(apiKey);
  if (!user) {
    return res.status(401).json({ message: "Invalid API key" });
  }

  req.apiUser = user;
  
  // Log API usage
  await storage.logUserActivity({
    id: randomBytes(16).toString('hex'),
    userId: user.id,
    action: "api_call",
    metadata: {
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
    },
  });

  next();
}

// Admin middleware
function requireAdmin(req: any, res: any, next: any) {
  const userId = req.user?.claims?.sub;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  storage.getUser(userId).then(user => {
    if (!user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  }).catch(() => {
    res.status(500).json({ message: "Internal server error" });
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

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
  app.get('/api/v1/profile', validateApiKey, async (req: any, res) => {
    try {
      const user = req.apiUser;
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

  app.put('/api/v1/profile', validateApiKey, async (req: any, res) => {
    try {
      const user = req.apiUser;
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

  app.post('/api/v1/profile/picture', validateApiKey, upload.single('picture'), async (req: any, res) => {
    try {
      const user = req.apiUser;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
