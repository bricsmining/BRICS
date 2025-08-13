import { db } from '@/lib/firebase';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs, query, orderBy,
  deleteDoc
} from "firebase/firestore";

// Fetch all task definitions (renamed for clarity)
export const getAllTasks = async () => {
  const tasksColRef = collection(db, "tasks");
  try {
    const snapshot = await getDocs(query(tasksColRef, orderBy("title")));
    if (snapshot.empty) {
      console.log("No tasks found in Firestore.");
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

// Get a single task by ID
export const getTask = async (taskId) => {
  if (!taskId) return null;
  const taskRef = doc(db, "tasks", taskId);
  try {
    const taskSnap = await getDoc(taskRef);
    return taskSnap.exists() ? { id: taskSnap.id, ...taskSnap.data() } : null;
  } catch (error) {
    console.error(`Error fetching task ${taskId}:`, error);
    return null;
  }
};

// Add a new task
export const addTask = async (taskData) => {
  const taskId = taskData.id || `task_${taskData.title.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
  const taskRef = doc(db, "tasks", taskId);
  try {
    const dataToSet = {
      ...taskData,
      reward: Number(taskData.reward) || 0,
    };
    delete dataToSet.id;
    await setDoc(taskRef, dataToSet);
    console.log(`Task ${taskId} added successfully.`);
    return { id: taskId, ...dataToSet };
  } catch (error) {
    console.error(`Error adding task ${taskId}:`, error);
    return null;
  }
};

// Update an existing task
export const updateTask = async (taskId, updates) => {
  if (!taskId) return false;
  const taskRef = doc(db, "tasks", taskId);
  try {
    if (updates.reward !== undefined) {
      updates.reward = Number(updates.reward) || 0;
    }
    await updateDoc(taskRef, updates);
    console.log(`Task ${taskId} updated successfully.`);
    return true;
  } catch (error) {
    console.error(`Error updating task ${taskId}:`, error);
    return false;
  }
};

// Delete a task
export const deleteTask = async (taskId) => {
  if (!taskId) return false;
  const taskRef = doc(db, "tasks", taskId);
  try {
    await deleteDoc(taskRef);
    console.log(`Task ${taskId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error(`Error deleting task ${taskId}:`, error);
    return false;
  }
};
