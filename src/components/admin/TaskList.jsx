import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Link, Target, Award, CheckCircle2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TaskList = ({ tasks, onEditClick, onDeleteTask, isEditing, tokenName = 'STON' }) => {
  return (
    <div className="w-full">
      {tasks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="bg-white/10 border-none shadow-md overflow-hidden">
              <CardContent className="p-4 bg-[#483D8B]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-sky-300 truncate pr-2">{task.title}</h3>
                  <Badge variant={task.active ? 'success' : 'secondary'} className={task.active ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30' : ''}>
                    {task.active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="text-xs text-[#BCCCDC] line-clamp-2 mb-2">
                    {task.description || 'No description provided.'}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-2 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
                      <div>
                        <span className="text-[#BCCCDC]">Type: </span>
                        <span className="text-[#FFD429] capitalize">{task.type.replace('_', ' ')}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <Award className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
                      <div>
                        <span className="text-[#BCCCDC]">Reward: </span>
                        <span className="text-green-400 font-semibold">{task.reward} {tokenName}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Link className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
                      <div className="overflow-hidden">
                        <span className="text-[#BCCCDC]">Target: </span>
                        <span className="text-[#FFD429] truncate">{task.target || 'N/A'}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 col-span-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                      <div>
                        <span className="text-[#BCCCDC]">Verification: </span>
                        <span className="text-[#FFD429] capitalize">{task.verificationType || 'manual'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 bg-white/5 border-white/10 hover:bg-white/10 text-white"
                      onClick={() => onEditClick(task)}
                      disabled={isEditing}
                    >
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="sm"
                          className="h-8 bg-red-900/25 hover:bg-red-900/30 text-red-600" 
                          disabled={isEditing}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-[#1a1a1a] border-white/10 text-white">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription className="text-muted-foreground">
                            This will permanently delete "{task.title}".
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-white/5 text-white hover:bg-white/10 border-white/10">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => onDeleteTask(task.id)}
                            className="bg-red-900/20 hover:bg-red-900/30 text-red-400"
                          >
                            Delete Task
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks created yet.</p>
          <p className="text-xs mt-1">Create your first task using the form on the left.</p>
        </div>
      )}
    </div>
  );
};

export default TaskList;
