import { useState, useEffect } from 'react';
import Login from './components/Login';
import Register from './components/Register';
import Chat from './components/Chat';
import Settings from './components/Settings';
import WelcomeBack from './components/WelcomeBack';

function App() {
    const [user, setUser] = useState(null);
    const [view, setView] = useState('login'); // login | register | chat | settings | welcome_back
    const [savedUsername, setSavedUsername] = useState('');

    useEffect(() => {
        const storedName = localStorage.getItem('chat_username');
        if (storedName) {
            setSavedUsername(storedName);
            setView('welcome_back');
        }
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('chat_username', userData.username);
        setSavedUsername(userData.username);
        setView('chat');
    };

    const handleLogout = () => {
        setUser(null);
        // We do NOT clear localStorage on logout, so they see Welcome Back next time
        // If we wanted to "Forget", that's a different action (Switch Account)
        setView('welcome_back');
    };

    const handleSwitchAccount = () => {
        localStorage.removeItem('chat_username');
        setSavedUsername('');
        setView('login');
    };

    const handleUpdateUser = (newUsername) => {
        setUser(prev => ({ ...prev, username: newUsername }));
        localStorage.setItem('chat_username', newUsername);
        setSavedUsername(newUsername);
    };

    const renderView = () => {
        // If authenticated, show authorized views
        if (user) {
            if (view === 'settings') {
                return <Settings user={user} onBack={() => setView('chat')} onUpdateUser={handleUpdateUser} />;
            }
            return <Chat user={user} onLogout={handleLogout} onSettings={() => setView('settings')} />;
        }

        // If not authenticated
        switch (view) {
            case 'register':
                return <Register onLogin={handleLogin} onSwitchToLogin={() => setView('login')} />;
            case 'welcome_back':
                return <WelcomeBack username={savedUsername} onLogin={handleLogin} onSwitchAccount={handleSwitchAccount} />;
            case 'login':
            default:
                return <Login onLogin={handleLogin} onSwitchToRegister={() => setView('register')} />;
        }
    };

    return (
        <div>
            {renderView()}
        </div>
    );
}

export default App;
