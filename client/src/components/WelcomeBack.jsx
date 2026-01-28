import { useState } from 'react';
import { login } from '../services/api';
import { KeyRound, User, History, ArrowRight } from 'lucide-react';

export default function WelcomeBack({ username, onLogin, onSwitchAccount }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await login(username, password);
            onLogin(data);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-dark p-4 animate-fade-in relative overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-10"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>

            <div className="w-full max-w-md bg-dark-lighter p-8 rounded-2xl shadow-xl border border-slate-700/50 backdrop-blur-sm text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-3xl font-bold text-white mx-auto mb-4 shadow-lg">
                    {username[0].toUpperCase()}
                </div>

                <h2 className="text-2xl font-bold mb-2 text-white">
                    Welcome back, {username}!
                </h2>
                <p className="text-slate-400 text-sm mb-6">Please enter your password to continue.</p>

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 text-left">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
                                placeholder="Enter password"
                                required
                                autoFocus
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white font-bold py-3 rounded-xl shadow-lg shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? 'Verifying...' : <>Continue <ArrowRight size={20} /></>}
                    </button>

                    <div className="text-center mt-4">
                        <button
                            type="button"
                            onClick={onSwitchAccount}
                            className="text-slate-400 hover:text-white text-sm transition flex items-center justify-center gap-2 mx-auto"
                        >
                            <History size={16} /> Not you? Switch account
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
