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

export const searchUsers = async (query, token) => {
    const response = await api.get(`/auth/search?q=${query}`, {
        headers: { Authorization: token }
    });
    return response.data;
};

export const addContact = async (username, token) => {
    const response = await api.post('/auth/contacts', { username }, {
        headers: { Authorization: token }
    });
    return response.data;
};

export const removeContact = async (username, token) => {
    const response = await api.delete(`/auth/contacts/${username}`, {
        headers: { Authorization: token }
    });
    return response.data;
};

export const getGroups = async (token) => {
    const response = await api.get('/api/groups', {
        headers: { Authorization: token }
    });
    return response.data;
};

export const createGroup = async (name, members, token) => {
    const response = await api.post('/api/groups', { name, members }, {
        headers: { Authorization: token }
    });
    return response.data;
};

export default api;
