import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2, Wallet, User, Calendar, Copy, ExternalLink, History, Download, Filter } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import * as XLSX from 'xlsx';
// Add this import for getting all withdrawal history
import { getAllWithdrawalHistory } from '@/data/firestore/adminActions';

const PendingWithdrawTab = ({ pendingWithdrawals = [], onApprove, onReject }) => {
  const [processing, setProcessing] = useState({});
  const [showHistoryPopup, setShowHistoryPopup] = useState(false);
  const [withdrawalHistory, setWithdrawalHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'approved', 'rejected', 'pending'
  const { toast } = useToast();

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: 'Wallet address copied to clipboard',
        className: 'bg-[#1a1a1a] text-white',
      });
    } catch (err) {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    }
  };

  const stonToTon = (ston) => {
    const amount = parseFloat(ston) || 0;
    const stonToTonRate = adminConfig?.stonToTonRate || 0.0000001; // Default: 10M STON = 1 TON
    return (amount * stonToTonRate).toFixed(6);
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const openTonScan = (address) => {
    window.open(`https://tonscan.org/address/${address}`, '_blank');
  };

  // Updated function to fetch all withdrawal history for admin
  const fetchWithdrawalHistory = async () => {
    setLoadingHistory(true);
    try {
      const history = await getAllWithdrawalHistory();
      setWithdrawalHistory(history || []);
    } catch (error) {
      console.error('Error fetching withdrawal history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load withdrawal history',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      setWithdrawalHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleShowHistory = () => {
    setShowHistoryPopup(true);
    fetchWithdrawalHistory();
  };

  const getFilteredHistory = () => {
    if (historyFilter === 'all') return withdrawalHistory;
    return withdrawalHistory.filter(item => item.status === historyFilter);
  };

  // Helper function to calculate processing time
  const calculateProcessingTime = (createdAt, processedAt) => {
    if (!createdAt || !processedAt) return 'N/A';
    try {
      const created = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
      const processed = processedAt.toDate ? processedAt.toDate() : new Date(processedAt);
      const diffInHours = Math.abs(processed - created) / (1000 * 60 * 60);
      return diffInHours.toFixed(2);
    } catch (error) {
      return 'N/A';
    }
  };

  // Helper function to generate summary data for Excel
  const generateSummaryData = (data) => {
    const totalWithdrawals = data.length;
    const approvedCount = data.filter(item => item.status === 'approved').length;
    const rejectedCount = data.filter(item => item.status === 'rejected').length;
    const pendingCount = data.filter(item => item.status === 'pending').length;
    
    const totalSTON = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const approvedSTON = data.filter(item => item.status === 'approved')
                           .reduce((sum, item) => sum + (item.amount || 0), 0);
    
    return [
      { 'Metric': 'Total Withdrawals', 'Value': totalWithdrawals },
      { 'Metric': 'Approved Withdrawals', 'Value': approvedCount },
      { 'Metric': 'Rejected Withdrawals', 'Value': rejectedCount },
      { 'Metric': 'Pending Withdrawals', 'Value': pendingCount },
      { 'Metric': 'Total STON Requested', 'Value': totalSTON.toLocaleString() },
      { 'Metric': 'Total TON Requested', 'Value': stonToTon(totalSTON) },
      { 'Metric': 'Approved STON', 'Value': approvedSTON.toLocaleString() },
      { 'Metric': 'Approved TON', 'Value': stonToTon(approvedSTON) },
      { 'Metric': 'Approval Rate', 'Value': totalWithdrawals > 0 ? `${((approvedCount / totalWithdrawals) * 100).toFixed(2)}%` : '0%' },
      { 'Metric': 'Report Generated', 'Value': new Date().toLocaleString() }
    ];
  };

  // Enhanced download function with better data structure
  const downloadExcel = () => {
    const filteredData = getFilteredHistory();
    
    if (filteredData.length === 0) {
      toast({
        title: 'No Data',
        description: 'No withdrawal history to download',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
      return;
    }

    // Prepare data for Excel with comprehensive information
    const excelData = filteredData.map((item, index) => ({
      'S.No': index + 1,
      'Withdrawal ID': item.id,
      'User ID': item.userId,
      'Username': item.username || 'N/A',
      'Amount (STON)': item.amount,
      'Amount (TON)': stonToTon(item.amount),
      'Wallet Address': item.walletAddress,
      'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
      'Request Date': formatDate(item.createdAt),
      'Approved Date': item.status === 'approved' && item.approvedAt ? formatDate(item.approvedAt) : 'N/A',
      'Rejected Date': item.status === 'rejected' && item.rejectedAt ? formatDate(item.rejectedAt) : 'N/A',
      'User Balance at Request': item.userBalance || 'N/A',
      'Processing Time (Hours)': item.status !== 'pending' ? 
        calculateProcessingTime(item.createdAt, item.approvedAt || item.rejectedAt) : 'N/A'
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths for better readability
    const colWidths = [
      { wch: 8 },  // S.No
      { wch: 20 }, // Withdrawal ID
      { wch: 15 }, // User ID
      { wch: 20 }, // Username
      { wch: 15 }, // Amount STON
      { wch: 15 }, // Amount TON
      { wch: 50 }, // Wallet Address
      { wch: 12 }, // Status
      { wch: 20 }, // Request Date
      { wch: 20 }, // Approved Date
      { wch: 20 }, // Rejected Date
      { wch: 20 }, // User Balance
      { wch: 18 }  // Processing Time
    ];
    ws['!cols'] = colWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Withdrawal History');

    // Add summary sheet
    const summaryData = generateSummaryData(filteredData);
    const summaryWs = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    // Generate filename with current date and filter
    const currentDate = new Date().toISOString().split('T')[0];
    const filterText = historyFilter === 'all' ? 'All' : historyFilter.charAt(0).toUpperCase() + historyFilter.slice(1);
    const filename = `Admin_Withdrawal_History_${filterText}_${currentDate}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);

    toast({
      title: 'Download Complete',
      description: `${filteredData.length} records downloaded successfully`,
      variant: 'success',
      className: 'bg-[#1a1a1a] text-white',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-600/20 text-green-300 border border-green-600">
            <Check className="h-3 w-3 mr-1" />
            Approved & Paid
          </span>
        );
      case 'payout_failed':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-600/20 text-orange-300 border border-orange-600">
            <X className="h-3 w-3 mr-1" />
            Payout Failed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-600/20 text-red-300 border border-red-600">
            <X className="h-3 w-3 mr-1" />
            Rejected
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-600/20 text-yellow-300 border border-yellow-600">
            <Loader2 className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-600/20 text-gray-300 border border-gray-600">
            Unknown
          </span>
        );
    }
  };

  const handleApprove = async (withdrawal) => {
    if (!window.confirm(`Approve withdrawal of ${withdrawal.amount} STON (${stonToTon(withdrawal.amount)} TON) for ${withdrawal.username || withdrawal.userId}?`)) {
      return;
    }
    
    setProcessing(prev => ({ ...prev, [withdrawal.id]: 'approving' }));
    
    try {
      const result = await onApprove(withdrawal.id, withdrawal.userId, withdrawal.amount);
      
      if (result.success) {
        toast({
          title: 'Withdrawal Approved ✅',
          description: `${withdrawal.amount} STON (${stonToTon(withdrawal.amount)} TON) withdrawal approved and payout initiated for ${withdrawal.username || withdrawal.userId}`,
          variant: 'success',
          className: 'bg-[#1a1a1a] text-white',
        });
      } else {
        // Format detailed error message
        let errorDescription = `Withdrawal approved but payout failed for ${withdrawal.username || withdrawal.userId}.`;
        
        if (result.oxapayDetails?.error) {
          const oxError = result.oxapayDetails.error;
          errorDescription += `\n\n🚨 OxaPay Error: ${oxError.message || oxError.key || 'Unknown error'}`;
          
          if (oxError.key === 'amount_exceeds_balance') {
            errorDescription += '\n💡 Solution: Check OxaPay wallet balance and fund if necessary.';
          } else if (oxError.key === 'invalid_address') {
            errorDescription += '\n💡 Solution: Verify the recipient wallet address format.';
          } else if (oxError.key === 'invalid_amount') {
            errorDescription += '\n💡 Solution: Check the withdrawal amount and limits.';
          }
        } else if (result.error) {
          errorDescription += `\n\n❌ Error: ${result.error}`;
        }
        
        errorDescription += '\n\n📋 Check admin notifications for full details.';
        
        toast({
          title: 'Payout Failed ❌',
          description: errorDescription,
          variant: 'destructive',
          className: 'bg-[#1a1a1a] text-white max-w-md',
          duration: 8000, // Show longer for detailed error
        });
      }
    } catch (error) {
      console.error(`Error approving withdrawal:`, error);
      toast({
        title: 'Approval Error ❌',
        description: `Failed to approve withdrawal: ${error.message || 'Unknown error'}`,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    } finally {
      setProcessing(prev => ({ ...prev, [withdrawal.id]: null }));
    }
  };

  const handleReject = async (withdrawal) => {
    if (!window.confirm(`Reject withdrawal request for ${withdrawal.username || withdrawal.userId}?`)) {
      return;
    }
    
    setProcessing(prev => ({ ...prev, [withdrawal.id]: 'rejecting' }));
    
    try {
      await onReject(withdrawal.id);
      toast({
        title: 'Withdrawal Rejected',
        description: `Withdrawal request rejected for ${withdrawal.username || withdrawal.userId}`,
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    } catch (error) {
      console.error(`Error rejecting withdrawal:`, error);
      toast({
        title: 'Error',
        description: 'Failed to reject withdrawal',
        variant: 'destructive',
        className: 'bg-[#1a1a1a] text-white',
      });
    } finally {
      setProcessing(prev => ({ ...prev, [withdrawal.id]: null }));
    }
  };

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-4 mb-2">
          <h2 className="text-xl font-bold text-[#FFD429]">Pending Withdrawals</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShowHistory}
            className="bg-blue-900/20 hover:bg-blue-900/30 text-blue-400 border-blue-900/30"
          >
            <History className="h-4 w-4 mr-2" />
            All History
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Review withdrawal requests submitted by users</p>
      </div>

      {pendingWithdrawals.length === 0 ? (
        <div className="text-center text-muted-foreground py-8">
          No pending withdrawals.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {pendingWithdrawals.map((withdrawal) => {
            const isProcessing = processing[withdrawal.id];
            const isApproving = isProcessing === 'approving';
            const isRejecting = isProcessing === 'rejecting';

            return (
              <Card 
                key={withdrawal.id}
                className="bg-white/10 border-none shadow-md overflow-hidden"
              >
                <CardContent className="p-4 bg-[#483D8B] space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-[#FFD429] truncate pr-2">
                        <Wallet className="inline h-4 w-4 mr-1" />
                        Withdrawal Request
                      </h3>
                    </div>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3 w-3 text-blue-400" />
                        <span className="text-[#BCCCDC]">User: </span>
                        <span className="text-sky-300 font-semibold">
                          {withdrawal.username ? `@${withdrawal.username}` : `User ${withdrawal.userId}`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#BCCCDC]">Amount: </span>
                        <span className="text-green-400 font-semibold">{withdrawal.amount?.toLocaleString()} STON</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#BCCCDC]">TON: </span>
                        <span className="text-blue-400 font-semibold">{stonToTon(withdrawal.amount)} TON</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-[#BCCCDC]">Date: </span>
                        <span className="text-white text-xs">{formatDate(withdrawal.createdAt)}</span>
                      </div>
                      
                      {withdrawal.userBalance !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#BCCCDC]">Balance: </span>
                          <span className="text-yellow-400">{withdrawal.userBalance?.toLocaleString()} STON</span>
                          {withdrawal.amount > (withdrawal.userBalance || 0) && (
                            <span className="text-red-400 text-xs">⚠️ Exceeds balance!</span>
                          )}
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#BCCCDC]">Wallet: </span>
                        </div>
                        <div className="bg-black/20 p-2 rounded flex items-center justify-between">
                          <span className="font-mono text-white text-xs break-all pr-2">
                            {withdrawal.walletAddress}
                          </span>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(withdrawal.walletAddress)}
                              className="h-6 w-6 p-0 hover:bg-gray-700"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openTonScan(withdrawal.walletAddress)}
                              className="h-6 w-6 p-0 hover:bg-gray-700"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Payout Information */}
                      {(withdrawal.payoutTrackId || withdrawal.payoutError) && (
                        <div className="mt-3 pt-3 border-t border-white/10">
                          <h5 className="font-semibold text-white flex items-center gap-2 mb-2">
                            <ExternalLink className="h-4 w-4 text-purple-400" />
                            Payout Information
                          </h5>
                          {withdrawal.payoutTrackId && (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Track ID:</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-purple-300 font-mono text-xs">
                                    {withdrawal.payoutTrackId}
                                  </span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(withdrawal.payoutTrackId)}
                                    className="h-6 w-6 p-0 hover:bg-gray-700"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {withdrawal.tonAmount && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400">Payout Amount:</span>
                                  <span className="text-purple-300 font-medium">
                                    {withdrawal.tonAmount} TON
                                  </span>
                                </div>
                              )}
                              {withdrawal.payoutStatus && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400">Payout Status:</span>
                                  <span className="text-blue-300 font-medium">
                                    {withdrawal.payoutStatus}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                          {withdrawal.payoutError && (
                            <div className="mt-2 p-2 bg-red-900/20 border border-red-600/30 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <X className="h-4 w-4 text-red-400" />
                                <span className="text-red-300 font-medium text-sm">Payout Error</span>
                              </div>
                              <p className="text-red-200 text-xs">{withdrawal.payoutError}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pt-2 mt-2 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-8 bg-green-900/20 hover:bg-green-900/30 text-green-400 border-green-900/30"
                      onClick={() => handleApprove(withdrawal)}
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
                      onClick={() => handleReject(withdrawal)}
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

      {/* History Popup */}
      {showHistoryPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-600/50 text-white w-full max-w-7xl max-h-[90vh] rounded-2xl shadow-2xl relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-600/50 bg-gradient-to-r from-slate-800 to-slate-700">
              <div className="flex items-center gap-3">
                <History className="h-6 w-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">All Withdrawal History</h3>
                <div className="bg-blue-600/20 px-3 py-1 rounded-full">
                  <span className="text-blue-300 text-sm font-medium">
                    {withdrawalHistory.length} Total Records
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Filter Buttons */}
                <div className="flex items-center gap-2 bg-gray-700/50 rounded-lg p-1">
                  <Filter className="h-4 w-4 text-gray-400" />
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="bg-transparent text-white text-sm px-2 py-1 border-0 focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-gray-800">All Status ({withdrawalHistory.length})</option>
                    <option value="pending" className="bg-gray-800">
                      Pending ({withdrawalHistory.filter(w => w.status === 'pending').length})
                    </option>
                    <option value="approved" className="bg-gray-800">
                      Approved ({withdrawalHistory.filter(w => w.status === 'approved').length})
                    </option>
                    <option value="rejected" className="bg-gray-800">
                      Rejected ({withdrawalHistory.filter(w => w.status === 'rejected').length})
                    </option>
                  </select>
                </div>
                {/* Download Button */}
                <Button
                  onClick={downloadExcel}
                  disabled={getFilteredHistory().length === 0}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
                {/* Close Button */}
                <Button
                  onClick={() => setShowHistoryPopup(false)}
                  variant="outline"
                  className="text-gray-400 hover:text-white border-gray-600 hover:border-gray-400"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingHistory ? (
                <div className="flex justify-center items-center py-12">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
                    <span className="text-gray-400 text-lg">Loading withdrawal history...</span>
                  </div>
                </div>
              ) : getFilteredHistory().length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-800/50 border border-gray-600/50 rounded-3xl p-8 max-w-md mx-auto">
                    <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 text-lg font-medium mb-2">No withdrawal history found</p>
                    <p className="text-gray-500 text-sm">
                      {historyFilter !== 'all' 
                        ? `No ${historyFilter} withdrawals found` 
                        : 'No withdrawals have been processed yet'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid gap-4">
                  {getFilteredHistory().map((item) => (
                    <Card key={item.id} className="bg-gray-800/30 border-gray-600/30 hover:bg-gray-800/50 transition-all duration-200">
                      <CardContent className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                          {/* User & Status */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-white flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-400" />
                                User Details
                              </h4>
                              {getStatusBadge(item.status)}
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">User ID:</span>
                                <span className="text-white font-mono text-xs">{item.userId}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Username:</span>
                                <span className="text-sky-300 font-medium">
                                  {item.username ? `@${item.username}` : 'N/A'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Request ID:</span>
                                <span className="text-gray-300 font-mono text-xs">
                                  {item.id.substring(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Amount Details */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              <Wallet className="h-5 w-5 text-green-400" />
                              Amount & Balance
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">STON:</span>
                                <span className="text-green-400 font-bold">
                                  {item.amount?.toLocaleString()}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">TON:</span>
                                <span className="text-blue-400 font-bold">
                                  {stonToTon(item.amount)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">User Balance:</span>
                                <span className="text-yellow-400 font-medium">
                                  {item.userBalance?.toLocaleString() || 'N/A'}
                                </span>
                              </div>
                              {item.amount > (item.userBalance || 0) && (
                                <div className="text-red-400 text-xs flex items-center gap-1">
                                  <span>⚠️ Exceeded balance at time of request</span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Timeline */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              <Calendar className="h-5 w-5 text-purple-400" />
                              Timeline
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Requested:</span>
                                <span className="text-white text-xs">
                                  {formatDate(item.createdAt)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400">Processed:</span>
                                <span className="text-white text-xs">
                                  {item.status === 'approved' ? formatDate(item.approvedAt) : 
                                   item.status === 'rejected' ? formatDate(item.rejectedAt) : 'Pending'}
                                </span>
                              </div>
                              {item.status !== 'pending' && (
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400">Processing Time:</span>
                                  <span className="text-cyan-400 text-xs">
                                    {calculateProcessingTime(item.createdAt, item.approvedAt || item.rejectedAt)} hrs
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Wallet Address */}
                          <div className="space-y-3">
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              <ExternalLink className="h-5 w-5 text-orange-400" />
                              Wallet Address
                            </h4>
                            <div className="bg-black/30 border border-gray-600/30 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-white text-xs break-all flex-1">
                                  {item.walletAddress}
                                </span>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard(item.walletAddress)}
                                    className="h-7 w-7 p-0 hover:bg-gray-700 text-gray-400 hover:text-white"
                                    title="Copy Address"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => openTonScan(item.walletAddress)}
                                    className="h-7 w-7 p-0 hover:bg-gray-700 text-gray-400 hover:text-white"
                                    title="View on TONScan"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer with Statistics */}
            <div className="border-t border-gray-600/50 p-4 bg-gray-900/50">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <div className="text-gray-400">Showing Records</div>
                  <div className="text-white font-bold">
                    {getFilteredHistory().length} of {withdrawalHistory.length}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Total STON</div>
                  <div className="text-green-400 font-bold">
                    {getFilteredHistory().reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Total TON</div>
                  <div className="text-blue-400 font-bold">
                    {stonToTon(getFilteredHistory().reduce((sum, w) => sum + (w.amount || 0), 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400">Filter</div>
                  <div className="text-white font-bold capitalize">
                    {historyFilter === 'all' ? 'All Status' : historyFilter}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default PendingWithdrawTab;