const API_BASE_URL = 'https://feedback-app-backend-x87n.onrender.com/api';

function getToken() {
    const token = localStorage.getItem('token');
    if (!token) {
        forceLogout();
        throw new Error('Token de autenticação não encontrado.');
    }
    return token;
}

function forceLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
    }
}

async function handleApiResponse(response) {
    if (response.status === 401) {
        forceLogout();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    if (response.status === 204) {
        return;
    }
    const resJson = await response.json();
    if (!response.ok) {
        throw new Error(resJson.error?.message || resJson.message || 'Ocorreu um erro na requisição.');
    }
    // A maioria das respostas da API encapsula o resultado em uma propriedade 'data'
    return resJson.data || resJson;
}

const api = {
    async get(url) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        return handleApiResponse(response);
    },

    async post(url, data, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (needsAuth) {
            const token = localStorage.getItem('token');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data)
        });
        return handleApiResponse(response);
    },

    async loginUser(email, password) {
        return this.post('/auth/login', { email, senha: password });
    },

    async registerUser(userData) {
        return this.post('/auth/register', userData);
    },

    // --- Feedbacks ---
    async getReceivedFeedbacks() {
        return this.get('/feedback?type=received');
    },

    async sendFeedback(feedbackData) {
        return this.post('/feedback', feedbackData, true);
    },

    async getSentFeedbacks() {
        return this.get('/feedback?type=sent');
    },

    // --- Users ---
    async getAllUsers() {
        const data = await this.get('/users');
        return data.users;
    },

    async getUserById(userId) {
        return this.get(`/users/${userId}`);
    },

    async createUser(userData) {
        return this.post('/admin/users', userData, true);
    },

    async updateUser(userId, userData) {
        // Assuming a generic 'put' method would be similar to 'post'
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        return handleApiResponse(response);
    },

    // --- Teams ---
    async getTeamById(id) {
        return this.get(`/teams/${id}`);
    },

    async getAllTeams() {
        // Rota pública, não precisa de autenticação
        const response = await fetch(`${API_BASE_URL}/teams`);
        const data = await handleApiResponse(response);
        return data.teams;
    },

    async createTeam(teamData) {
        return this.post('/teams', teamData, true);
    },

    async updateTeam(id, teamData) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(teamData)
        });
        return handleApiResponse(response);
    },

    async deleteTeam(id) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/teams/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return handleApiResponse(response);
    },

    async addTeamMember(data) {
        return this.post('/teams/add-member', data, true);
    },

    async removeTeamMember(data) {
        return this.post('/teams/remove-member', data, true);
    },

    async getMyTeam() {
        return this.get('/teams/my-team');
    }
};
