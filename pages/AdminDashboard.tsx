import React, { useEffect, useState } from 'react';
import { getPaymentRequests, approvePayment, rejectPayment } from '../services/paymentService';
import { collection, getDocs, query, where, onSnapshot, doc, deleteDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { PaymentRequest, User } from '../types';
import { CheckCircle, XCircle, ExternalLink, Clock, ShieldCheck, Search, CheckSquare, Square, ArrowLeft, Users, TrendingUp, DollarSign, RefreshCw, Eye, Trash2, Edit2 } from 'lucide-react';

const AdminDashboard = ({ user, onBack }: { user: User; onBack: () => void }) => {
    const [requests, setRequests] = useState<PaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [totalUsers, setTotalUsers] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [autoRefreshing, setAutoRefreshing] = useState(false);

    // User Management State
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [cleaningUsers, setCleaningUsers] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        const data = await getPaymentRequests();
        setRequests(data);

        // Fetch total users count
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            setTotalUsers(usersSnapshot.size);
        } catch (e) {
            console.error('Failed to fetch user count:', e);
        }

        // Fetch total revenue from approved requests
        try {
            const approvedQuery = query(
                collection(db, 'payment_requests'),
                where('status', '==', 'approved')
            );
            const approvedSnapshot = await getDocs(approvedQuery);
            const revenue = approvedSnapshot.docs.reduce((sum, doc) => {
                return sum + (doc.data().amount || 0);
            }, 0);
            setTotalRevenue(revenue);
        } catch (e) {
            console.error('Failed to fetch revenue:', e);
        }

        setLoading(false);
    };

    useEffect(() => {
        fetchData();

        // Real-time listener for pending payment requests
        const pendingQuery = query(
            collection(db, 'payment_requests'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(pendingQuery, (snapshot) => {
            console.log('🔄 Real-time update: Payment requests changed');
            setAutoRefreshing(true);
            fetchData().then(() => {
                setTimeout(() => setAutoRefreshing(false), 1000);
            });
        });

        // Auto-refresh every 30 seconds as backup
        const refreshInterval = setInterval(() => {
            console.log('⏰ Auto-refresh triggered');
            setAutoRefreshing(true);
            fetchData().then(() => {
                setTimeout(() => setAutoRefreshing(false), 1000);
            });
        }, 30000); // 30 seconds

        return () => {
            unsubscribe();
            clearInterval(refreshInterval);
        };
    }, []);

    const fetchAllUsers = async () => {
        setLoadingUsers(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id } as User));
            // Sort by tokens (descending) by default to show most active/valuable users first
            usersList.sort((a, b) => (b.tokens || 0) - (a.tokens || 0));
            setAllUsers(usersList);
            setShowUsersModal(true);
        } catch (error) {
            console.error("Error fetching users:", error);
            alert("Failed to fetch users.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const handleAutoClean = async () => {
        if (!confirm("WARNING: This will PERMANENTLY DELETE users who have 0 tokens left AND have been inactive for over 1.5 years. This action cannot be undone. Proceed?")) {
            return;
        }

        setCleaningUsers(true);
        try {
            const usersSnapshot = await getDocs(collection(db, 'users'));
            const now = new Date();
            const cutoffDate = new Date(now.setMonth(now.getMonth() - 18)); // 1.5 years ago

            let deletedCount = 0;
            const usersToDelete: string[] = [];

            usersSnapshot.forEach((doc) => {
                const userData = doc.data() as User;
                const tokens = userData.tokens || 0;

                // Check if lastLogin is older than cutoff
                let lastLoginDate = new Date(0); // Epoch
                if (userData.lastLogin) {
                    if (userData.lastLogin instanceof Timestamp) {
                        lastLoginDate = userData.lastLogin.toDate();
                    } else if (typeof userData.lastLogin === 'string' || typeof userData.lastLogin === 'number') {
                        lastLoginDate = new Date(userData.lastLogin);
                    }
                }

                if (tokens === 0 && lastLoginDate < cutoffDate) {
                    usersToDelete.push(doc.id);
                }
            });

            if (usersToDelete.length === 0) {
                alert("No inactive users found matching the criteria (0 tokens, > 1.5 years inactive).");
                setCleaningUsers(false);
                return;
            }

            if (!confirm(`Found ${usersToDelete.length} users to delete. Confirm deletion?`)) {
                setCleaningUsers(false);
                return;
            }

            // Perform Deletions
            for (const uid of usersToDelete) {
                await deleteDoc(doc(db, 'users', uid));
                deletedCount++;
            }

            alert(`Successfully deleted ${deletedCount} inactive users.`);
            // Refresh stats
            fetchData();
            if (showUsersModal) fetchAllUsers();

        } catch (error) {
            console.error("Error cleaning users:", error);
            alert("An error occurred during cleanup.");
        } finally {
            setCleaningUsers(false);
        }
    };

    const handleEditTokens = async (targetUser: User) => {
        const newTokensStr = prompt(`Enter new token balance for ${targetUser.displayName}:`, targetUser.tokens?.toString() || "0");
        if (newTokensStr === null) return; // Cancelled
        const newTokens = parseInt(newTokensStr);
        if (isNaN(newTokens) || newTokens < 0) {
            alert("Invalid token amount. Please enter a valid non-negative number.");
            return;
        }

        const shouldBePremium = newTokens > 0;

        try {
            await updateDoc(doc(db, "users", targetUser.uid), {
                tokens: newTokens,
                isPremium: shouldBePremium
            });
            // Optimistic Update
            setAllUsers(prev => prev.map(u => u.uid === targetUser.uid ? { ...u, tokens: newTokens, isPremium: shouldBePremium } : u));
        } catch (e: any) {
            console.error("Error updating tokens:", e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: You do not have permission to edit this user. Please check your Firestore Security Rules in the Firebase Console.");
            } else {
                alert("Failed to update tokens. " + e.message);
            }
        }
    };

    const handleDeleteUser = async (targetUser: User) => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE user ${targetUser.displayName} (${targetUser.email})? This action cannot be undone.`)) return;

        try {
            await deleteDoc(doc(db, "users", targetUser.uid));
            // Optimistic Update
            setAllUsers(prev => prev.filter(u => u.uid !== targetUser.uid));
            setTotalUsers(prev => prev - 1); // approximate update
        } catch (e: any) {
            console.error("Error deleting user:", e);
            if (e.code === 'permission-denied') {
                alert("Permission Denied: Unable to delete user. Check Firestore Security Rules.");
            } else {
                alert("Failed to delete user. " + e.message);
            }
        }
    };

    const handleApprove = async (req: PaymentRequest) => {
        if (!confirm(`Approve upgrade for ${req.userEmail}?`)) return;
        try {
            await approvePayment(req.id, req.userId);
            fetchData(); // Refresh
        } catch (e) {
            alert("Approval failed");
        }
    };

    const handleReject = async (id: string) => {
        if (!confirm("Reject this request?")) return;
        try {
            await rejectPayment(id);
            fetchData();
        } catch (e) {
            alert("Rejection failed");
        }
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === requests.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(requests.map(r => r.id)));
        }
    };

    const handleBulkApprove = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Approve ${selectedIds.size} selected request(s)?`)) return;

        setBulkProcessing(true);
        try {
            const selectedRequests = requests.filter(r => selectedIds.has(r.id));
            for (const req of selectedRequests) {
                await approvePayment(req.id, req.userId);
            }
            setSelectedIds(new Set());
            fetchData();
        } catch (e) {
            alert("Some approvals failed");
        } finally {
            setBulkProcessing(false);
        }
    };

    const handleBulkReject = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Reject ${selectedIds.size} selected request(s)?`)) return;

        setBulkProcessing(true);
        try {
            for (const id of Array.from<string>(selectedIds)) {
                await rejectPayment(id);
            }
            setSelectedIds(new Set());
            fetchData();
        } catch (e) {
            alert("Some rejections failed");
        } finally {
            setBulkProcessing(false);
        }
    };

    // Helper function to shorten email for mobile display
    const shortenEmail = (email: string, maxLength: number = 15): string => {
        if (email.length <= maxLength) return email;
        const [username, domain] = email.split('@');
        if (username.length > maxLength - 3) {
            return `${username.substring(0, maxLength - 3)}...@${domain}`;
        }
        return email;
    };

    if (!user.isAdmin) {
        return (
            <div className="flex h-[80vh] items-center justify-center text-slate-500">
                Access Denied. Admin Only.
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-12 animate-fade-in-up">
            {/* Mobile-Optimized Header */}
            <div className="mb-6 sm:mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="p-2.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:scale-105 active:scale-95"
                            title="Back to Main"
                        >
                            <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5 text-slate-400" />
                        </button>
                        <div>
                            <h1 className="text-xl sm:text-3xl font-serif font-bold text-white mb-1">Admin Dashboard</h1>
                            <p className="text-slate-400 text-xs sm:text-sm hidden sm:block">Manage user upgrades and system status.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                        <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
                        <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-wider hidden sm:inline">Super Admin</span>
                        <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider sm:hidden">Admin</span>
                    </div>
                </div>

                {/* Mobile: Auto Clean Button */}
                <button
                    onClick={handleAutoClean}
                    disabled={cleaningUsers}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all text-xs sm:text-xs font-semibold flex items-center justify-center gap-2 group disabled:opacity-50"
                    title="Delete users with 0 tokens and >1.5 years inactivity"
                >
                    {cleaningUsers ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />}
                    <span className="hidden sm:inline">Auto Clean Inactive</span>
                    <span className="sm:hidden">Clean Inactive Users</span>
                </button>
            </div>

            {/* Stats - Mobile Responsive Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mb-8 sm:mb-12">
                <div
                    onClick={fetchAllUsers}
                    className="glass-panel p-4 sm:p-6 rounded-xl border border-white/5 hover:border-blue-500/40 cursor-pointer transition-all hover:scale-[1.02] group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 group-hover:scale-110 transition-transform" />
                        <ExternalLink className="w-3 h-3 sm:w-4 sm:h-4 text-slate-600 group-hover:text-blue-400" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-white mb-1">{loadingUsers ? <RefreshCw className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : totalUsers.toLocaleString()}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest group-hover:text-blue-400 transition-colors">Total Users</div>
                </div>
                <div className="glass-panel p-4 sm:p-6 rounded-xl border border-white/5 hover:border-emerald-500/20 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-emerald-400 mb-1">
                        ₹{totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">Revenue</div>
                </div>
                <div className="glass-panel p-4 sm:p-6 rounded-xl border border-white/5 hover:border-amber-500/20 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-amber-400 mb-1">{requests.length}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">Pending</div>
                </div>
                <div className="glass-panel p-4 sm:p-6 rounded-xl border border-white/5 hover:border-purple-500/20 transition-colors group">
                    <div className="flex items-center justify-between mb-2">
                        <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400 group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-purple-400 mb-1">{selectedIds.size}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest">Selected</div>
                </div>
            </div>

            <div className="glass-panel rounded-xl overflow-hidden border border-white/10">
                <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3 sm:gap-4">
                            <h3 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">Payment Queue</h3>
                            {requests.length > 0 && (
                                <button
                                    onClick={toggleSelectAll}
                                    className="text-xs text-slate-400 hover:text-white flex items-center gap-2 transition-colors"
                                >
                                    {selectedIds.size === requests.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                    <span className="hidden sm:inline">{selectedIds.size === requests.length ? 'Deselect All' : 'Select All'}</span>
                                    <span className="sm:hidden">{selectedIds.size === requests.length ? 'None' : 'All'}</span>
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            {selectedIds.size > 0 && (
                                <>
                                    <button
                                        onClick={handleBulkApprove}
                                        disabled={bulkProcessing}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="hidden sm:inline">Approve ({selectedIds.size})</span>
                                        <span className="sm:hidden">✓ {selectedIds.size}</span>
                                    </button>
                                    <button
                                        onClick={handleBulkReject}
                                        disabled={bulkProcessing}
                                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        <span className="hidden sm:inline">Reject ({selectedIds.size})</span>
                                        <span className="sm:hidden">✕ {selectedIds.size}</span>
                                    </button>
                                </>
                            )}
                            {autoRefreshing && (
                                <div className="flex items-center gap-2 text-xs text-emerald-400">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span className="hidden sm:inline">Updating...</span>
                                </div>
                            )}
                            <button onClick={fetchData} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1">
                                <RefreshCw className="w-3 h-3" />
                                <span className="hidden sm:inline">Refresh</span>
                            </button>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm">Loading requests...</div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 text-sm">No pending requests found.</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {requests.map((req) => (
                            <div key={req.id} className={`p-4 sm:p-6 transition-colors ${selectedIds.has(req.id) ? 'bg-amber-500/5' : 'hover:bg-white/[0.02]'}`}>
                                {/* Mobile-Optimized Layout */}
                                <div className="flex flex-col gap-4">
                                    {/* Header Row - Checkbox + User Info */}
                                    <div className="flex items-start gap-3">
                                        <button
                                            onClick={() => toggleSelection(req.id)}
                                            className="text-slate-400 hover:text-amber-400 transition-colors mt-1 flex-shrink-0"
                                        >
                                            {selectedIds.has(req.id) ? <CheckSquare className="w-6 h-6 sm:w-5 sm:h-5 text-amber-400" /> : <Square className="w-6 h-6 sm:w-5 sm:h-5" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                {/* Mobile: Shortened Email */}
                                                <span className="sm:hidden font-medium text-white text-sm" title={req.userEmail}>
                                                    {shortenEmail(req.userEmail, 20)}
                                                </span>
                                                {/* Desktop: Full Email */}
                                                <span className="hidden sm:inline font-medium text-white text-base break-all">
                                                    {req.userEmail}
                                                </span>
                                            </div>
                                            <div className="text-[10px] sm:text-xs text-slate-500 font-mono break-all mb-2">
                                                {/* Mobile: Shortened ID */}
                                                <span className="sm:hidden">ID: {req.userId.substring(0, 8)}...</span>
                                                {/* Desktop: Full ID */}
                                                <span className="hidden sm:inline">ID: {req.userId}</span>
                                            </div>

                                            {/* Payment Details - Stacked on Mobile */}
                                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                                <div className="flex items-center gap-1 text-slate-400">
                                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                                    <span className="text-[10px] sm:text-xs">{new Date(req.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                                                </div>
                                                <div className="font-mono text-emerald-400 font-bold">₹{req.amount}</div>
                                                <div className="font-mono text-amber-400 font-bold">{req.tokens || 0} Tokens</div>
                                                <div className="font-mono text-slate-300 text-[10px] sm:text-xs col-span-2 sm:col-span-1">UTR: {req.utr}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons - Full Width on Mobile */}
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        {req.screenshotUrl && req.screenshotUrl !== "DELETED_TO_SAVE_STORAGE" && (
                                            <button
                                                onClick={() => setSelectedImage(req.screenshotUrl!)}
                                                className="flex-1 sm:flex-none px-3 sm:px-3 py-2.5 sm:py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300 flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Search className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                                                <span>Proof</span>
                                            </button>
                                        )}

                                        <div className="flex items-center gap-2 flex-1 sm:flex-none sm:pl-4 sm:border-l sm:border-white/10">
                                            <button
                                                onClick={() => handleApprove(req)}
                                                className="flex-1 sm:flex-none p-3 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border border-emerald-500/20 transition-all active:scale-95"
                                                title="Approve & Upgrade"
                                            >
                                                <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(req.id)}
                                                className="flex-1 sm:flex-none p-3 sm:p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 transition-all active:scale-95"
                                                title="Reject"
                                            >
                                                <XCircle className="w-5 h-5 sm:w-4 sm:h-4 mx-auto" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* User List Modal */}
            {showUsersModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                    <div className="bg-[#0a0a0a] rounded-xl border border-white/10 w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Users className="w-6 h-6 text-blue-400" />
                                <h2 className="text-xl font-bold text-white">All Users ({allUsers.length})</h2>
                            </div>
                            <button
                                onClick={() => setShowUsersModal(false)}
                                className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white/5 sticky top-0 backdrop-blur-sm z-10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Email</th>
                                        <th className="px-6 py-4 text-center">Tokens</th>
                                        <th className="px-6 py-4 text-center">Plan</th>
                                        <th className="px-6 py-4 text-right">Last Login</th>
                                        <th className="px-6 py-4 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm">
                                    {allUsers.map(u => {
                                        // Format Date
                                        let lastLoginStr = "Never";
                                        if (u.lastLogin) {
                                            if (u.lastLogin instanceof Timestamp) {
                                                lastLoginStr = u.lastLogin.toDate().toLocaleDateString();
                                            } else if (typeof u.lastLogin === 'string') {
                                                lastLoginStr = new Date(u.lastLogin).toLocaleDateString();
                                            }
                                        }

                                        return (
                                            <tr key={u.uid} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 font-medium text-white">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs overflow-hidden relative">
                                                            {u.photoURL ? (
                                                                <>
                                                                    <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-400">
                                                                        {u.displayName?.charAt(0).toUpperCase() || '?'}
                                                                    </div>
                                                                    <img
                                                                        src={u.photoURL}
                                                                        alt={u.displayName}
                                                                        className="w-full h-full object-cover relative z-10"
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                </>
                                                            ) : (
                                                                <span className="font-bold text-slate-400">
                                                                    {u.displayName?.charAt(0).toUpperCase() || '?'}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {u.displayName}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-400">{u.email}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`font-mono font-bold ${u.tokens > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                        {u.tokens}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {u.isPremium ? (
                                                        <span className="px-2 py-1 rounded text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">PREMIUM</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded text-xs bg-slate-800 text-slate-400">FREE</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-500">{lastLoginStr}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditTokens(u)}
                                                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors"
                                                            title="Edit Tokens"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(u)}
                                                            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors"
                                                            title="Delete User"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Proof View Modal */}
            {selectedImage && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setSelectedImage(null)}>
                    <div className="relative max-w-2xl w-full max-h-[90vh] overflow-hidden rounded-xl border border-white/10">
                        <img
                            src={selectedImage}
                            alt="Payment Proof"
                            className="w-full h-auto object-contain bg-black"
                        />
                        <button
                            className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full"
                            onClick={() => setSelectedImage(null)}
                        >
                            <XCircle className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
