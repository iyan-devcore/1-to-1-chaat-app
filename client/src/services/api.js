import axios from 'axios';

const api = axios.create({
    baseURL: '/', // Proxy handles the rest
});

export const login = async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
};

export const register = async (username, password) => {
    const response = await api.post('/auth/register', { username, password });
    return response.data;
};

export const updateProfile = async (data, token) => {
    // data: { newUsername, newPassword, currentPassword }
    const response = await api.put('/auth/profile', data, {
        headers: { Authorization: token }
    });
    return response.data;
};

export const getUsers = async (token) => {
    const response = await api.get('/auth/users', {
        headers: { Authorization: token }
    });
    return response.data;
};

export const uploadFile = async (file, token) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/api/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': token
        }
    });
    return response.data;
};

export default api;
