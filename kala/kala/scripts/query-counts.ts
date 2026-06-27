import { getDb } from '../server/db.js';
import { tasks, projects, reflections, projectNotes } from '../drizzle/schema.js';
import { desc, count } from 'drizzle-orm';

async function run() {
  const db = await getDb();

  const [taskCount] = await db.select({ count: count() }).from(tasks);
  const [projectCount] = await db.select({ count: count() }).from(projects);
  const [reflectionCount] = await db.select({ count: count() }).from(reflections);
  const [noteCount] = await db.select({ count: count() }).from(projectNotes);

  console.log('=== TABLE COUNTS ===');
  console.log(`task_count:       ${taskCount.count}`);
  console.log(`project_count:    ${projectCount.count}`);
  console.log(`reflection_count: ${reflectionCount.count}`);
  console.log(`note_count:       ${noteCount.count}`);

  console.log('\n=== RECENT TASKS (last 20) ===');
  const recentTasks = await db
    .select({ id: tasks.id, userId: tasks.userId, title: tasks.title, createdAt: tasks.createdAt })
    .from(tasks)
    .orderBy(desc(tasks.createdAt))
    .limit(20);
  console.table(recentTasks);

  console.log('\n=== RECENT PROJECTS (last 20) ===');
  const recentProjects = await db
    .select({ id: projects.id, userId: projects.userId, name: projects.name, createdAt: projects.createdAt })
    .from(projects)
    .orderBy(desc(projects.createdAt))
    .limit(20);
  console.table(recentProjects);

  process.exit(0);
}

run().catch(console.error);
