
import React from 'react';
import { db } from '@/lib/firebase';
import {
  doc, collection, getDocs, writeBatch, query, limit
} from "firebase/firestore";

// Seed tasks if the collection is empty
export const seedInitialTasks = async (defaultTasks) => {
    const tasksColRef = collection(db, "tasks");
    try {
        const snapshot = await getDocs(query(tasksColRef, limit(1)));
        if (snapshot.empty) {
            console.log("Tasks collection is empty. Seeding initial tasks...");
            const batch = writeBatch(db);
            defaultTasks.forEach(task => {
                const taskRef = doc(db, "tasks", task.id);
                const taskData = { ...task };
                delete taskData.id;
                batch.set(taskRef, taskData);
            });
            await batch.commit();
            console.log("Initial tasks seeded successfully.");
        } else {
            console.log("Tasks collection already contains data. Skipping seed.");
        }
    } catch (error) {
        console.error("Error seeding tasks:", error);
    }
};
  