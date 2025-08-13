import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { getAdminConfig } from '@/data/firestore/adminConfig';

const PendingVerificationTab = ({ pendingItems = [], tasks = [], onApprove, onReject }) => {
  const [processing, setProcessing] = useState({});
  const [adminChatId, setAdminChatId] = useState('');

  useEffect(() => {
    const loadAdminConfig = async () => {
      try {
        const config = await getAdminConfig();
        setAdminChatId(config.adminChatId || '');
      } catch (error) {
        console.error('Error loading admin config:', error);
      }
    };
    loadAdminConfig();
  }, []);

  const sendMessage = async (chatId, message) => {
    if (!chatId) {
      sendAdminLog("Error: Missing chat ID for notification");
      return false;
    }
    try {
      await fetch(`https://api.telegram.org/bot${import.meta.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      return true;
    } catch (err) {
      sendAdminLog(`Error sending message to ${chatId}: ${err.message}`);
      return false;
    }
  };

  const sendAdminLog = async (message) => {
    try {
      await fetch(`https://api.telegram.org/bot${import.meta.env.VITE_TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: `🔍 <b>Debug Log</b>:\n${message}`,
          parse_mode: 'HTML'
        })
      });
    } catch (error) {
      console.error("Failed to send admin log:", error);
    }
  };

  const getItemInfo = (item) => {
    const userId = item.userId || item.user?.id || item.telegramId || item.user?.telegramId || null;
    const taskId = item.taskId || item.task?.id || null;
    const task = tasks.find(t => t.id === taskId);

    const taskTitle = item.title || (task ? task.title : "Unknown Task");
    const taskTarget = item.target || (task ? task.target : "");
    const reward = item.reward || (task ? task.reward : 0);

    const username = item.username ||
      item.user?.username ||
      item.firstName ||
      item.user?.firstName ||
      `User ${userId}`;

    return { userId, taskId, taskTitle, taskTarget, reward, username };
  };

  const generateLink = (target) => {
    if (!target) return null;
    if (target.startsWith('@')) return `https://t.me/${target.replace('@', '')}`;
    if (target.startsWith('http')) return target;
    try {
      const url = new URL(`https://${target}`);
      return url.href;
    } catch {
      return null;
    }
  };

  const handleApprove = async (item) => {
    const { userId, taskId, taskTitle, reward } = getItemInfo(item);
    if (!userId || !taskId) {
      sendAdminLog(`Cannot approve: Missing user ID or task ID. userId: ${userId}, taskId: ${taskId}`);
      return;
    }

    setProcessing({ userId, taskId, action: 'approve' });

    const message = `✅ <b>Task Approved!</b>\n\nYour task "<b>${taskTitle}</b>" has been verified and approved.\n\n<b>+${reward} STON</b> has been added to your balance.`;
    await sendMessage(userId, message);

    try {
      await onApprove(userId, taskId);
      sendAdminLog(`Approval process initiated for user ${userId}`);
    } catch (error) {
      sendAdminLog(`Error during approval: ${error.message}`);
    } finally {
      setProcessing({});
    }
  };

  const handleReject = async (item) => {
    const { userId, taskId, taskTitle } = getItemInfo(item);
    if (!userId || !taskId) {
      sendAdminLog(`Cannot reject: Missing user ID or task ID. userId: ${userId}, taskId: ${taskId}`);
      return;
    }

    setProcessing({ userId, taskId, action: 'reject' });

    const message = `❌ <b>Task Rejected</b>\n\nYour task "<b>${taskTitle}</b>" verification request has been rejected.\n\nPlease make sure you've completed the task correctly and try again.`;
    await sendMessage(userId, message);

    try {
      await onReject(userId, taskId);
      sendAdminLog(`Rejection process initiated for user ${userId}`);
    } catch (error) {
      sendAdminLog(`Error during rejection: ${error.message}`);
    } finally {
      setProcessing({});
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-[#FFD429]">Pending Manual Verifications</h2>
        <p className="text-sm text-muted-foreground">Review tasks submitted by users that need manual approval</p>
      </div>

      {pendingItems.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No tasks pending manual verification.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pendingItems.map((item) => {
            const { userId, taskId, taskTitle, taskTarget, reward, username } = getItemInfo(item);
            const link = generateLink(taskTarget);
            const isProcessing = processing.userId === userId && processing.taskId === taskId;
            const isApproving = isProcessing && processing.action === 'approve';
            const isRejecting = isProcessing && processing.action === 'reject';

            return (
              <Card 
                key={`${userId}-${taskId}`}
                className="bg-white/10 border-none shadow-md overflow-hidden"
              >
                <CardContent className="p-4 bg-[#483D8B] space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#FFD429] truncate pr-2">{taskTitle}</h3>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div>
                          <span className="text-[#BCCCDC]">User: </span>
                          <span className="text-sky-300">
                            <a
                              href={`https://t.me/${username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline break-all">
                              @{username}
                          </a></span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <div>
                          <span className="text-[#BCCCDC]">Reward: </span>
                          <span className="text-green-400 font-semibold">{reward} STON</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 col-span-2">
                        <div className="overflow-hidden">
                          <span className="text-[#BCCCDC]">Target: </span>
                          {link ? (
                            <a
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline break-all"
                            >
                              {taskTarget}
                            </a>
                          ) : (
                            <span className="text-white">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 bg-green-900/20 hover:bg-green-900/30 text-green-400 border-green-900/30"
                      onClick={() => handleApprove(item)}
                      disabled={isProcessing}
                    >
                      {isApproving ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Approving...
                        </>
                      ) : (
                        <>
                          <Check className="mr-1 h-3.5 w-3.5" /> Approve
                        </>
                      )}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 h-8 bg-red-900/20 hover:bg-red-900/30 text-red-400"
                      onClick={() => handleReject(item)}
                      disabled={isProcessing}
                    >
                      {isRejecting ? (
                        <>
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> Rejecting...
                        </>
                      ) : (
                        <>
                          <X className="mr-1 h-3.5 w-3.5" /> Reject
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingVerificationTab;
