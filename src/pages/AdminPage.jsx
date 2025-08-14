import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Loader2, Users, ListChecks, CheckSquare, Wallet, Settings, Shield, Send } from 'lucide-react';
import { UserContext } from '@/App';

import AdminAuth from '@/components/admin/AdminAuth';
import AdminSettings from '@/components/admin/AdminSettings';
import UserManagementTab from '@/components/admin/UserManagementTab';
import TaskManagementTab from '@/components/admin/TaskManagementTab';
import PendingVerificationTab from '@/components/admin/PendingVerificationTab';
import PendingWithdrawTab from '@/components/admin/PendingWithdrawTab';
import BroadcastTab from '@/components/admin/BroadcastTab';

import {
  getAllUsers,
  toggleUserBanStatus
} from '@/data/firestore/userActions';
import {
  getAllTasks,
  addTask,
  updateTask,
  deleteTask
} from '@/data/firestore/taskActions';
import {
  getPendingVerifications,
  approveTask,
  rejectTask,
  getPendingWithdrawals,
  approveWithdrawal,
  rejectWithdrawal
} from '@/data/firestore/adminActions';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const AdminPage = () => {
  const context = useContext(UserContext);
  const sessionUser = JSON.parse(sessionStorage.getItem('tgUserData') || '{}');
  const user = context?.user || sessionUser;

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(true);
  const [tab, setTab] = useState('settings');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    reward: 0,
    type: 'telegram_join',
    target: '',
    verificationType: 'manual',
    active: true
  });

  const [editingTask, setEditingTask] = useState(null);

  // Check for existing admin session and Firebase auth state
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const adminAuth = localStorage.getItem('adminAuth');
        const adminSession = sessionStorage.getItem('adminSession');
        
        if (adminAuth && adminSession === 'active') {
          const parsedAdminData = JSON.parse(adminAuth);
          setAdminData(parsedAdminData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Clear invalid session data
        localStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminSession');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleAuthSuccess = (adminData) => {
    setAdminData(adminData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      try {
        // Import Firebase auth and signOut
        const { signOut } = await import('firebase/auth');
        const { auth } = await import('@/lib/firebase');
        
        // Sign out from Firebase
        await signOut(auth);
        
        // Clear local storage
        localStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminSession');
        
        // Update state
        setIsAuthenticated(false);
        setAdminData(null);
        setTab('settings');
      } catch (error) {
        console.error('Logout error:', error);
        // Even if Firebase signOut fails, clear local session
        localStorage.removeItem('adminAuth');
        sessionStorage.removeItem('adminSession');
        setIsAuthenticated(false);
        setAdminData(null);
        setTab('settings');
      }
    }
  };

  const fetchAllData = async () => {
    setLoadingUsers(true);
    setLoadingTasks(true);
    setLoadingPending(true);
    setLoadingWithdrawals(true);

    try {
      const [userList, taskList, pendingList, withdrawalList] = await Promise.all([
        getAllUsers(),
        getAllTasks(),
        getPendingVerifications(),
        getPendingWithdrawals()
      ]);

      console.log('Fetched withdrawal data:', withdrawalList); // Debug log

      setUsers(userList || []);
      setTasks(taskList || []);
      setPendingItems(pendingList || []);
      setPendingWithdrawals(withdrawalList || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoadingUsers(false);
      setLoadingTasks(false);
      setLoadingPending(false);
      setLoadingWithdrawals(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleBanToggle = async (telegramId, currentStatus) => {
    const updated = await toggleUserBanStatus(telegramId, !currentStatus);
    if (updated) {
      setUsers(prev => prev.map(u =>
        u.telegramId === telegramId ? { ...u, isBanned: !currentStatus } : u
      ));
    }
  };

  const handleNewTaskChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({ ...prev, [name]: value }));
  };

  const handleNewTaskVerificationTypeChange = (value) => {
    setNewTask(prev => ({ ...prev, verificationType: value }));
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    const success = await addTask(newTask);
    if (success) {
      const updatedTasks = await getAllTasks();
      setTasks(updatedTasks);
      setNewTask({
        title: '',
        description: '',
        reward: 0,
        type: 'telegram_join',
        target: '',
        verificationType: 'manual',
        active: true
      });
    }
  };

  const handleEditClick = (task) => setEditingTask(task);

  const handleEditingTaskChange = (e) => {
    const { name, value } = e.target;
    setEditingTask(prev => ({ ...prev, [name]: value }));
  };

  const handleEditingTaskVerificationTypeChange = (value) => {
    setEditingTask(prev => ({ ...prev, verificationType: value }));
  };

  const handleEditingTaskActiveChange = (checked) => {
    setEditingTask(prev => ({ ...prev, active: checked }));
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    const success = await updateTask(editingTask.id, editingTask);
    if (success) {
      const updatedTasks = await getAllTasks();
      setTasks(updatedTasks);
      setEditingTask(null);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    const success = await deleteTask(taskId);
    if (success) {
      const updatedTasks = await getAllTasks();
      setTasks(updatedTasks);
    }
  };

  const handleApprove = async (userId, taskId) => {
    const success = await approveTask(userId, taskId);
    if (success) {
      const updatedPending = await getPendingVerifications();
      setPendingItems(updatedPending);
    }
  };

  const handleReject = async (userId, taskId) => {
    const success = await rejectTask(userId, taskId);
    if (success) {
      const updatedPending = await getPendingVerifications();
      setPendingItems(updatedPending);
    }
  };

  const handleApproveWithdrawal = async (withdrawalId, userId, amount) => {
    const success = await approveWithdrawal(withdrawalId, userId, amount);
    if (success) {
      const updatedWithdrawals = await getPendingWithdrawals();
      setPendingWithdrawals(updatedWithdrawals);
    }
  };

  const handleRejectWithdrawal = async (withdrawalId) => {
    const success = await rejectWithdrawal(withdrawalId);
    if (success) {
      const updatedWithdrawals = await getPendingWithdrawals();
      setPendingWithdrawals(updatedWithdrawals);
    }
  };

  const handleTabChange = async (value) => {
    setTab(value);
    if (value === 'users') {
      setLoadingUsers(true);
      try {
        const userList = await getAllUsers();
        setUsers(userList || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoadingUsers(false);
      }
    } else if (value === 'tasks') {
      setLoadingTasks(true);
      try {
        const taskList = await getAllTasks();
        setTasks(taskList || []);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setLoadingTasks(false);
      }
    } else if (value === 'pending') {
      setLoadingPending(true);
      try {
        const pendingList = await getPendingVerifications();
        setPendingItems(pendingList || []);
      } catch (error) {
        console.error('Error fetching pending items:', error);
      } finally {
        setLoadingPending(false);
      }
    } else if (value === 'withdrawals') {
      setLoadingWithdrawals(true);
      try {
        const withdrawalList = await getPendingWithdrawals();
        console.log('Tab change - withdrawal data:', withdrawalList); // Debug log
        setPendingWithdrawals(withdrawalList || []);
      } catch (error) {
        console.error('Error fetching withdrawals:', error);
      } finally {
        setLoadingWithdrawals(false);
      }
    }
  };



  // Show loading spinner while checking authentication
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <AdminAuth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full min-h-[100dvh] text-white px-4 pb-28 pt-6 bg-[#0f0f0f] overflow-y-auto"
    >
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Admin Dashboard</h2>
              <p className="text-sm text-gray-400">Welcome back, {adminData?.name || adminData?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <Tabs value={tab} onValueChange={handleTabChange} className="w-full bg-[#0f0f0f]">
          <TabsList className="grid grid-cols-6 bg-[#1a1a1a] text-white rounded-lg shadow-md">
            <TabsTrigger value="settings" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
            <TabsTrigger value="broadcast" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <Send className="h-4 w-4" /> Broadcast
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <ListChecks className="h-4 w-4" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="pending" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <CheckSquare className="h-4 w-4" /> Pending
            </TabsTrigger>
            <TabsTrigger value="withdrawals" className="flex items-center justify-center gap-1 py-2 rounded-lg data-[state=active]:bg-primary/80 transition-all duration-200">
              <Wallet className="h-4 w-4" /> Withdrawals
            </TabsTrigger>
          </TabsList>

          <TabsContent value="settings" className="pt-4">
            <AdminSettings adminData={adminData} />
          </TabsContent>

          <TabsContent value="broadcast" className="pt-4">
            <BroadcastTab />
          </TabsContent>

          <TabsContent value="users" className="pt-4">
            {loadingUsers ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <UserManagementTab
                users={users}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                handleBanToggle={handleBanToggle}
              />
            )}
          </TabsContent>

          <TabsContent value="tasks" className="pt-4">
            <TaskManagementTab
              tasks={tasks}
              newTask={newTask}
              editingTask={editingTask}
              handleNewTaskChange={handleNewTaskChange}
              handleNewTaskVerificationTypeChange={handleNewTaskVerificationTypeChange}
              handleAddTask={handleAddTask}
              handleEditingTaskChange={handleEditingTaskChange}
              handleEditingTaskActiveChange={handleEditingTaskActiveChange}
              handleEditingTaskVerificationTypeChange={handleEditingTaskVerificationTypeChange}
              handleUpdateTask={handleUpdateTask}
              setEditingTask={setEditingTask}
              handleEditClick={handleEditClick}
              handleDeleteTask={handleDeleteTask}
            />
          </TabsContent>

          <TabsContent value="pending" className="pt-4">
            {loadingPending ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <PendingVerificationTab
                pendingItems={pendingItems}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            )}
          </TabsContent>

          <TabsContent value="withdrawals" className="pt-4">
            {loadingWithdrawals ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <PendingWithdrawTab
                pendingWithdrawals={pendingWithdrawals}
                onApprove={handleApproveWithdrawal}
                onReject={handleRejectWithdrawal}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </motion.div>
  );
};

export default AdminPage;
