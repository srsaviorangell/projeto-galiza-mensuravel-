import Dexie from 'dexie';
import { initialProjects, initialTasks, initialUsers } from '../data/mockData';

export const db = new Dexie('GalizaSystemDB_v2');

db.version(4).stores({
  projects: '++id, name, status, difficulty',
  tasks: '++id, projectId, status, priority, assigneeId',
  users: '++id, email, role, phone, status',
  history: '++id, entityType, entityId, timestamp'
});

// Populate initial data if empty
db.on('populate', () => {
  db.projects.bulkAdd(initialProjects);
  db.tasks.bulkAdd(initialTasks);
  db.users.bulkAdd(initialUsers);
  db.history.bulkAdd([]);
});

// Initialize data on first load
(async () => {
  const userCount = await db.users.count();
  if (userCount === 0) {
    await db.users.bulkAdd(initialUsers);
    await db.projects.bulkAdd(initialProjects);
    await db.tasks.bulkAdd(initialTasks);
  }
})();
