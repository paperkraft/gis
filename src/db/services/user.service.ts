import { db } from "../index";
import { users, projects, projectShares } from "../schema";
import { eq, or, and } from "drizzle-orm";

/**
 * Get all projects accessible by a user (owned or shared)
 */
export async function getUserProjects(userId: string) {
    // 1. Get projects owned by user
    // 2. Get projects shared with user
    
    const result = await db.query.projects.findMany({
        where: or(
            eq(projects.ownerId, userId),
            eq(db.select({ id: projectShares.projectId })
                .from(projectShares)
                .where(eq(projectShares.userId, userId)), 
            projects.id)
        ),
        with: {
            // Include owner info or share info if needed
        }
    });

    // Alternatively, using a more standard JOIN approach if preferred
    // For now, let's use a simpler query pattern that Drizzle supports well
    
    // Actually, the above subquery in 'where' might be tricky with current Drizzle syntax for 'findMany'
    // Let's use the explicit 'db.select' with joins for clarity
    
    const ownedProjects = await db.select()
        .from(projects)
        .where(eq(projects.ownerId, userId));

    const sharedProjects = await db.select({
        project: projects
    })
    .from(projectShares)
    .innerJoin(projects, eq(projectShares.projectId, projects.id))
    .where(eq(projectShares.userId, userId));

    return [
        ...ownedProjects.map(p => ({ ...p, access: 'owner' })),
        ...sharedProjects.map(s => ({ ...s.project, access: 'shared' }))
    ];
}

/**
 * Create a new project for a user
 */
export async function createProject(userId: string, title: string, description?: string) {
    const [newProject] = await db.insert(projects).values({
        title,
        description,
        ownerId: userId,
    }).returning();
    
    return newProject;
}

/**
 * Share a project with another user
 */
export async function shareProject(projectId: string, targetUserId: string, role: string = 'viewer') {
    const [share] = await db.insert(projectShares).values({
        projectId,
        userId: targetUserId,
        role,
    }).returning();
    
    return share;
}

/**
 * Dummy logic to find or create a user by email
 */
export async function getOrCreateUser(name: string, email: string) {
    const existing = await db.query.users.findFirst({
        where: eq(users.email, email)
    });

    if (existing) return existing;

    const [newUser] = await db.insert(users).values({
        name,
        email,
    }).returning();

    return newUser;
}
