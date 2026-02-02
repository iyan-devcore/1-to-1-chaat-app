import { useState } from 'react';
import { updateProfile } from '../services/api';
import { KeyRound, User, Save, ArrowLeft, Shield, Bell } from 'lucide-react';


export default function Settings({ user, onBack, onUpdateUser }) {
    const [newUsername, setNewUsername] = useState(user.username);
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [notifications, setNotifications] = useState(() => {
        return localStorage.getItem('notifications') === 'true';
    });

    const toggleNotifications = async () => {
        if (!('Notification' in window)) {
            alert("Notifications are not supported on this device.");
            return;
        }

        const newState = !notifications;

        if (newState) {
            try {
                // We request permission
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    setNotifications(true);
                    localStorage.setItem('notifications', 'true');

                    // Optional: Try to send a test notification immediately so the user sees it works
                    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
                        navigator.serviceWorker.ready.then(reg => {
                            reg.showNotification('Notifications Enabled', {
                                body: 'You will now receive message alerts.',
                                icon: '/vite.svg',
                                vibrate: [100]
                            });
                        });
                    } else {
                        new Notification('Notifications Enabled', {
                            body: 'You will now receive message alerts.'
                        });
                    }

                } else {
                    // If denied (or default/dismissed)
                    alert('Notifications permission was not granted. Please enable it in your browser settings.');
                    setNotifications(false);
                    localStorage.setItem('notifications', 'false');
                }
            } catch (error) {
                console.warn("Notification permission error:", error);
                // Fallback for some browsers that might throw
                setNotifications(false);
                localStorage.setItem('notifications', 'false');
            }
        } else {
            setNotifications(false);
            localStorage.setItem('notifications', 'false');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const result = await updateProfile({
                newUsername,
                newPassword: newPassword || undefined,
                currentPassword
            }, user.token);

            setSuccess(result.message);
            onUpdateUser(result.username);
            setNewPassword('');
            setCurrentPassword('');

        } catch (err) {
            setError(err.response?.data?.error || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-dark p-4 animate-fade-in relative">
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>

            <div className="w-full max-w-md bg-dark-lighter p-8 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm relative">
                <button
                    onClick={onBack}
                    className="absolute top-4 left-4 text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-full transition"
                >
                    <ArrowLeft size={20} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-center text-white flex items-center justify-center gap-2">
                    <Shield className="text-primary" /> Account Settings
                </h2>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm text-center">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm text-center">
                        {success}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                                placeholder="Username"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">New Password (Optional)</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                                placeholder="New password"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-700/50">
                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                            <Bell size={16} /> Preferences
                        </h3>
                        <div
                            className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700 cursor-pointer active:bg-slate-800 transition touch-manipulation"
                            onClick={toggleNotifications}
                        >
                            <div className="flex flex-col pointer-events-none">
                                <span className="text-white font-medium text-sm">Enable Notifications</span>
                                <span className="text-xs text-slate-400">Get alerts for new messages</span>
                            </div>
                            <div className="relative p-2 -mr-2">
                                <button
                                    type="button"
                                    className={`w-11 h-6 rounded-full transition-colors relative pointer-events-none ${notifications ? 'bg-primary' : 'bg-slate-700'}`}
                                >
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>

                        {/* Debug / Info Section */}
                        {!window.isSecureContext && (
                            <div className="mt-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-start gap-2">
                                <div className="text-yellow-500 text-xs mt-0.5">⚠️</div>
                                <p className="text-xs text-yellow-200/80">
                                    Notifications may fail because you are not using HTTPS. iOS requires a secure connection (HTTPS or localhost).
                                </p>
                            </div>
                        )}

                        {notifications && (
                            <button
                                type="button"
                                onClick={() => {
                                    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                                        navigator.serviceWorker.controller.postMessage({ type: 'TEST_NOTIFICATION' });

                                        // Also try direct
                                        navigator.serviceWorker.ready.then(reg => {
                                            reg.showNotification('Test Notification', {
                                                body: 'If you see this, it works!',
                                                icon: '/vite.svg',
                                                vibrate: [200, 100, 200]
                                            }).catch(err => alert("Test failed: " + err.message));
                                        });
                                    } else {
                                        alert("Service Worker not active. Try reloading the page.");
                                    }
                                }}
                                className="mt-3 w-full py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition"
                            >
                                Send Test Notification
                            </button>
                        )}
                    </div>

                    <div className="pt-4 border-t border-slate-700/50">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300 ml-1">Current Password (Required)</label>
                            <div className="relative">
                                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                                    placeholder="Enter current password to save"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Saving...' : <><Save size={20} /> Save Changes</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
