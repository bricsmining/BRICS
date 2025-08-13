import {
  getAllTasks as getTasksFromDB,
  addTask,
  updateTask,
  deleteTask
} from '@/data/firestore/taskActions';

// Fetches all task definitions from Firestore
export const getAllTasks = async () => {
  return await getTasksFromDB();
};

// Adds a new task definition to Firestore
export const addNewTask = async (newTaskData) => {
  return await addTask(newTaskData);
};

// Updates an existing task definition in Firestore
export const updateExistingTask = async (taskId, updates) => {
  return await updateTask(taskId, updates);
};

// Deletes a task definition from Firestore
export const deleteExistingTask = async (taskId) => {
  return await deleteTask(taskId);
};
