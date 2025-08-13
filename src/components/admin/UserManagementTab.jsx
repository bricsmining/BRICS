import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Ban, CheckCircle, User, Wallet, Calendar, Copy, SortAsc, SortDesc, Users, ShieldAlert } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const UserManagementTab = ({ users = [], searchTerm, setSearchTerm, handleBanToggle }) => {
  const [copying, setCopying] = useState(false);
  const [sortOption, setSortOption] = useState("newest");
  const { toast } = useToast();

  // Calculate user statistics
  const totalUsers = users.length;
  const totalBanned = users.filter(user => user.isBanned).length;
  const totalAdmins = users.filter(user => user.isAdmin).length;

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.username?.toLowerCase().includes(searchLower) ||
      user.firstName?.toLowerCase().includes(searchLower) ||
      user.lastName?.toLowerCase().includes(searchLower) ||
      String(user.telegramId).includes(searchLower) ||
      user.wallet?.toLowerCase().includes(searchLower)
    );
  });

  // Sort users based on selected option
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortOption) {
      case "name": {
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username || '';
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.username || '';

        const getPriorityChar = (str) => {
          const firstChar = str.trim().charAt(0).toUpperCase();
          if (firstChar >= 'A' && firstChar <= 'Z') return `1${firstChar}`;
          if (firstChar >= '0' && firstChar <= '9') return `2${firstChar}`;
          return `3${firstChar}`; // symbols and others
        };

        const priorityA = getPriorityChar(nameA);
        const priorityB = getPriorityChar(nameB);

        return priorityA.localeCompare(priorityB) || nameA.localeCompare(nameB);
      }

      case "newest": {
        const timeA = a.joinedAt instanceof Timestamp ? a.joinedAt.toMillis() : (a.joinedAt?.seconds * 1000 || 0);
        const timeB = b.joinedAt instanceof Timestamp ? b.joinedAt.toMillis() : (b.joinedAt?.seconds * 1000 || 0);
        return timeB - timeA; // Newest first
      }

      case "oldest": {
        const timeC = a.joinedAt instanceof Timestamp ? a.joinedAt.toMillis() : (a.joinedAt?.seconds * 1000 || 0);
        const timeD = b.joinedAt instanceof Timestamp ? b.joinedAt.toMillis() : (b.joinedAt?.seconds * 1000 || 0);
        return timeC - timeD; // Oldest first
      }

      case "banned":
        return (b.isBanned ? 1 : 0) - (a.isBanned ? 1 : 0); // Banned first

      case "admins":
        return (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0); // Admins first

      default:
        return 0;
    }
  });

  const handleCopyWallet = async (wallet) => {
    if (!wallet) return;
    try {
      await navigator.clipboard.writeText(wallet);
      setCopying(true);
      toast({
        title: 'Wallet copied!',
        description: wallet,
        className: 'bg-[#1a1a1a] text-white break-all whitespace-pre-line',
        variant: "success",
      });
      setTimeout(() => setCopying(false), 1200);
    } catch {
      toast({
        title: "Copy failed!",
        variant: "destructive",
        className: 'bg-[#1a1a1a] text-white',
      });
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      const ts = timestamp instanceof Timestamp
        ? timestamp
        : new Timestamp(timestamp.seconds, timestamp.nanoseconds);
      return ts.toDate().toLocaleDateString();
    } catch {
      return 'Invalid Date';
    }
  };

  return (
    <motion.div className="w-full min-h-[100dvh] px-4 pb-28 pt-6 bg-[#0f0f0f] text-white overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-[#FFD429]">Manage Users</h2>
          <p className="text-sm text-muted-foreground">Search and control user access</p>
        </div>

        <Input
          type="text"
          placeholder="Search by ID, name, username, wallet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-white/5 text-white placeholder:text-muted-foreground border-white/10 focus-visible:ring-1 focus-visible:ring-primary"
        />

        {/* User Statistics */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-300"></span>
            </div>
            <span className="text-lg font-bold text-blue-400">{totalUsers}</span>
          </div>
          <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-400" />
              <span className="text-sm text-gray-300"></span>
            </div>
            <span className="text-lg font-bold text-red-400">{totalBanned}</span>
          </div>
          <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-400" />
              <span className="text-sm text-gray-300"></span>
            </div>
            <span className="text-lg font-bold text-amber-400">{totalAdmins}</span>
          </div>
        </div>

        {/* Sorting Options */}
        <div className="flex justify-end">
          <Select value={sortOption} onValueChange={setSortOption}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="min-w-[180px] bg-[#1a1a1a] text-white border-white/10">
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="banned">Banned Users</SelectItem>
              <SelectItem value="admins">Admins First</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedUsers.length > 0 ? (
            sortedUsers.map((user) => {
              const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'N/A';
              const fallback = (user.firstName || user.username || 'U').charAt(0).toUpperCase();

              return (
                <Card key={user.telegramId} className="bg-white/10 border-none shadow-md overflow-hidden">
                  <CardContent className="p-4 bg-[#483D8B] space-y-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-white/20">
                        <AvatarImage
                          src={user.profilePicUrl || `https://avatar.vercel.sh/${user.username || user.telegramId}.png?size=32`}
                          alt={user.username || 'avatar'}
                        />
                        <AvatarFallback className="bg-purple-900 text-white">{fallback}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-sky-300">{displayName}</p>
                        <p className="text-xs text-[#BCCCDC]">@{user.username || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="text-xs text-[#FFD429] space-y-1">
                      <p className="flex items-center gap-1.5">
                        <User  className="w-3.5 h-3.5 text-[#FFD429]" />
                        <span className="font-medium text-[#BCCCDC]">User  ID:</span> {user.telegramId}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Wallet className="w-3.5 h-3.5 text-[#FFD429]" />
                        <span className="font-medium text-[#BCCCDC]">Wallet:</span> {user.wallet ? `${user.wallet.slice(0, 6)}...${user.wallet.slice(-4)}` : 'N/A'}
                        {user.wallet && user.wallet !== 'N/A' && (
                          <button
                            type="button"
                            className="flex items-center p-1.5 rounded-full transition hover:bg-sky-400/20 active:scale-95"
                            aria-label="Copy Wallet Address"
                            title={copying ? "Copied!" : "Copy Wallet Address"}
                            onClick={() => handleCopyWallet(user.wallet)}
                          >
                            <Copy className={`h-4 w-4 ${copying ? 'text-green-400' : 'text-gray-400'} transition`} />
                          </button>
                        )}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#FFD429]" />
                        <span className="font-medium text-[#BCCCDC]">Joined:</span> {formatDate(user.joinedAt)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm font-bold text-green-400">
                        {user.balance?.toLocaleString()} STON
                      </p>
                      <p className="text-sm">Refs: <span className="font-semibold text-sky-400">{user.referrals || 0}</span></p>
                    </div>

                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-white/10">
                      <div className="flex gap-1">
                        <Badge variant={user.isBanned ? 'destructive' : 'success'} 
                          className={user.isBanned ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}>
                          {user.isBanned ? 'Banned' : 'Active'}
                        </Badge>
                        {user.isAdmin && (
                          <Badge variant="secondary" className="bg-amber-600/20 text-amber-400 hover:bg-amber-600/30">Admin</Badge>
                        )}
                      </div>

                      <Button
                        variant={user.isBanned ? 'outline' : 'destructive'}
                        size="sm"
                        className={user.isBanned 
                          ? "h-8 bg-white/5 border-white/10 hover:bg-white/10 text-white" 
                          : "h-8 bg-red-900/25 hover:bg-red-900/30 text-red-600"}
                        onClick={() => handleBanToggle(user.telegramId, user.isBanned)}
                      >
                        {user.isBanned ? (
                          <>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Unban
                          </>
                        ) : (
                          <>
                            <Ban className="h-3.5 w-3.5 mr-1" /> Ban
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-center text-[#BCCCDC] col-span-2">No users match your search.</p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default UserManagementTab;
                                                                                 
