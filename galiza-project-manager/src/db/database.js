import Dexie from 'dexie';
import { initialProjects, initialTasks, initialUsers } from '../data/mockData';

export const db = new Dexie('GalizaSystemDB_v2');

db.version(4).stores({
  projects: '++id, name, status, difficulty',
  tasks: '++id, projectId, status, priority, assigneeId',
  users: '++id, email, role, phone, status',
  history: '++id, entityType, entityId, timestamp'
});
