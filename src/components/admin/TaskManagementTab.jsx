import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TaskForm from '@/components/admin/TaskForm';
import TaskList from '@/components/admin/TaskList';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// This component orchestrates TaskForm and TaskList
const TaskManagementTab = ({
  tasks = [],
  newTask,
  editingTask,
  handleNewTaskChange,
  handleNewTaskVerificationTypeChange,
  handleAddTask,
  handleEditingTaskChange,
  handleEditingTaskActiveChange,
  handleEditingTaskVerificationTypeChange,
  handleUpdateTask,
  setEditingTask,
  handleEditClick,
  handleDeleteTask,
  tokenName = 'STON'
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const openForm = () => setIsFormOpen(true);
  const closeForm = () => {
    setIsFormOpen(false);
    if (editingTask) setEditingTask(null);
  };

  // When edit is clicked, also open the form
  const handleTaskEdit = (task) => {
    handleEditClick(task);
    setIsFormOpen(true);
  };

  // Handle form submission and close the dialog
  const handleFormSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    if (editingTask) {
      handleUpdateTask(e);
    } else {
      handleAddTask(e);
    }
    closeForm();
  };

  return (
    <motion.div className="w-full min-h-[100dvh] px-4 pb-28 pt-6 bg-[#0f0f0f] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#FFD429]">Manage Tasks</h2>
          <p className="text-sm text-muted-foreground">Create and manage tasks for users</p>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Current Tasks</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#BCCCDC]">{tasks.length} task(s)</span>
            <Button 
              onClick={openForm} 
              className="bg-primary hover:bg-primary/90 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Task
            </Button>
          </div>
        </div>
        
        <TaskList
          tasks={tasks}
          onEditClick={handleTaskEdit}
          onDeleteTask={handleDeleteTask}
          isEditing={!!editingTask}
          tokenName={tokenName}
        />

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="bg-[#1a1a1a] border-white/10 text-white max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTask ? 'Edit Task' : 'Add New Task'}</DialogTitle>
              <DialogDescription>
                {editingTask
                  ? 'Modify the details of the existing task.'
                  : 'Create a new task for users to complete.'}
              </DialogDescription>
            </DialogHeader>
            
            <TaskForm
              taskData={editingTask || newTask}
              isEditing={!!editingTask}
              onChange={editingTask ? handleEditingTaskChange : handleNewTaskChange}
              onActiveChange={editingTask ? handleEditingTaskActiveChange : null}
              onVerificationTypeChange={
                editingTask
                  ? handleEditingTaskVerificationTypeChange
                  : handleNewTaskVerificationTypeChange
              }
              onSubmit={handleFormSubmit}
              onCancel={closeForm}
              tokenName={tokenName}
            />
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
};

export default TaskManagementTab;
