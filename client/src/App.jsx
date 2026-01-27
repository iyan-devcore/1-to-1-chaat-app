import { useState, useEffect } from 'react';
import Login from './components/Login';
import Chat from './components/Chat';

function App() {
    const [user, setUser] = useState(null);

    useEffect(() => {
        // Check if user session exists (not implemented in storage for simplicity, but good for refresh)
    }, []);

    const handleLogin = (userData) => {
        setUser(userData);
    };

    const handleLogout = () => {
        setUser(null);
    };

    return (
        <div>
            {!user ? (
                <Login onLogin={handleLogin} />
            ) : (
                <Chat user={user} onLogout={handleLogout} />
            )}
        </div>
    );
}

export default App;
