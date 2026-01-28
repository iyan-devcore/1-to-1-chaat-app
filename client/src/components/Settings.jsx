import { useState } from 'react';
import { updateProfile } from '../services/api';
import { KeyRound, User, Save, ArrowLeft, Shield } from 'lucide-react';

export default function Settings({ user, onBack, onUpdateUser }) {
    const [newUsername, setNewUsername] = useState(user.username);
    const [newPassword, setNewPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

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
