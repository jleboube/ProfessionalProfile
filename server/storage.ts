import {
  users,
  apiKeys,
  userActivity,
  type User,
  type UpsertUser,
  type ApiKey,
  type InsertApiKey,
  type UserActivity,
  type InsertUserActivity,
  type UpdateProfile,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, and, like, or } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";

export interface IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Profile operations
  updateProfile(userId: string, profile: UpdateProfile): Promise<User>;
  updateProfilePicture(userId: string, imageUrl: string): Promise<User>;
  
  // Admin operations
  getAllUsers(page?: number, limit?: number, search?: string): Promise<{ users: User[], total: number }>;
  toggleUserStatus(userId: string, isActive: boolean): Promise<User>;
  getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    apiCallsToday: number;
  }>;
  
  // API Key operations
  generateApiKey(userId: string, name?: string): Promise<{ key: string; apiKey: ApiKey }>;
  validateApiKey(key: string): Promise<User | null>;
  getUserApiKeys(userId: string): Promise<ApiKey[]>;
  regenerateApiKey(userId: string, keyId: string): Promise<{ key: string; apiKey: ApiKey }>;
  
  // Activity tracking
  logUserActivity(activity: InsertUserActivity): Promise<UserActivity>;
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT) these user operations are mandatory for Replit Auth.
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Profile operations
  async updateProfile(userId: string, profile: UpdateProfile): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...profile,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateProfilePicture(userId: string, imageUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        profileImageUrl: imageUrl,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Admin operations
  async getAllUsers(page: number = 1, limit: number = 10, search?: string): Promise<{ users: User[], total: number }> {
    const offset = (page - 1) * limit;
    
    let whereClause;
    if (search) {
      whereClause = or(
        like(users.firstName, `%${search}%`),
        like(users.lastName, `%${search}%`),
        like(users.email, `%${search}%`)
      );
    }

    const [usersList, totalResult] = await Promise.all([
      db.select()
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(users)
        .where(whereClause)
    ]);

    return {
      users: usersList,
      total: totalResult[0].count
    };
  }

  async toggleUserStatus(userId: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
    apiCallsToday: number;
  }> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [totalUsersResult, activeUsersResult, newUsersResult, apiCallsResult] = await Promise.all([
      db.select({ count: count() }).from(users),
      db.select({ count: count() }).from(users).where(eq(users.isActive, true)),
      db.select({ count: count() }).from(users).where(and(
        eq(users.isActive, true),
        eq(users.createdAt, startOfMonth)
      )),
      db.select({ count: count() }).from(userActivity).where(and(
        eq(userActivity.action, "api_call"),
        eq(userActivity.createdAt, startOfDay)
      ))
    ]);

    return {
      totalUsers: totalUsersResult[0].count,
      activeUsers: activeUsersResult[0].count,
      newUsersThisMonth: newUsersResult[0].count,
      apiCallsToday: apiCallsResult[0].count,
    };
  }

  // API Key operations
  async generateApiKey(userId: string, name: string = "Default API Key"): Promise<{ key: string; apiKey: ApiKey }> {
    const key = `pk_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    
    const [apiKey] = await db
      .insert(apiKeys)
      .values({
        id: randomBytes(16).toString('hex'),
        userId,
        keyHash,
        name,
      })
      .returning();

    return { key, apiKey };
  }

  async validateApiKey(key: string): Promise<User | null> {
    const keyHash = createHash('sha256').update(key).digest('hex');
    
    const result = await db
      .select({
        user: users,
        apiKey: apiKeys,
      })
      .from(apiKeys)
      .innerJoin(users, eq(apiKeys.userId, users.id))
      .where(and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.isActive, true),
        eq(users.isActive, true)
      ));

    if (result.length === 0) return null;

    // Update last used timestamp
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.keyHash, keyHash));

    return result[0].user;
  }

  async getUserApiKeys(userId: string): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.userId, userId),
        eq(apiKeys.isActive, true)
      ))
      .orderBy(desc(apiKeys.createdAt));
  }

  async regenerateApiKey(userId: string, keyId: string): Promise<{ key: string; apiKey: ApiKey }> {
    const key = `pk_live_${randomBytes(32).toString('hex')}`;
    const keyHash = createHash('sha256').update(key).digest('hex');
    
    const [apiKey] = await db
      .update(apiKeys)
      .set({
        keyHash,
        createdAt: new Date(),
      })
      .where(and(
        eq(apiKeys.id, keyId),
        eq(apiKeys.userId, userId)
      ))
      .returning();

    return { key, apiKey };
  }

  // Activity tracking
  async logUserActivity(activity: InsertUserActivity): Promise<UserActivity> {
    const [userActivityRecord] = await db
      .insert(userActivity)
      .values({
        ...activity,
        id: randomBytes(16).toString('hex'),
      })
      .returning();
    return userActivityRecord;
  }
}

export const storage = new DatabaseStorage();
