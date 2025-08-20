const API_BASE_URL = 'https://feedback-app-backend-die8.onrender.com/api';

function getToken() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        forceLogout();
        throw new Error('Token de autenticação não encontrado.');
    }
    return token;
}

function forceLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('redirectAfterLogin');
    if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
    }
}

async function handleApiResponse(response) {
    const contentType = response.headers.get('content-type');

    if (!response.ok) {
        let errorData;
        // Se a resposta for JSON, tenta extrair a mensagem de erro
        if (contentType && contentType.includes('application/json')) {
            try {
                errorData = await response.json();
            } catch (e) {
                // Mantém uma mensagem de erro genérica se o JSON for inválido
                errorData = { message: `Erro ${response.status}: ${response.statusText}` };
            }
        } else {
            // Se não for JSON (ex: HTML de erro), usa o status da resposta
            errorData = { message: `Erro no servidor: ${response.status} ${response.statusText}` };
        }
        throw new Error(errorData.message || 'Ocorreu um erro na comunicação com o servidor.');
    }

    // Se a resposta for bem-sucedida, mas não for JSON, não tenta fazer o parse
    if (!contentType || !contentType.includes('application/json')) {
        return response.text(); // Retorna como texto ou pode ser adaptado
    }

    // Tenta fazer o parse do JSON e retorna os dados
    try {
        const responseData = await response.json();
        return responseData.data || responseData; // Compatibilidade com diferentes formatos de resposta
    } catch (error) {
        throw new Error('Falha ao processar a resposta do servidor.');
    }
}

const api = {
    async get(url) {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        const resJson = await response.json();
        if (!response.ok) {
            throw new Error(resJson.message || 'Falha ao buscar dados.');
        }
        return resJson.data || resJson;
    },

    async post(url, data, needsAuth = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (needsAuth) {
            const token = localStorage.getItem('authToken');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers: headers,
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
    async getUsers() {
        // Rota de admin para buscar todos os usuários
        return this.get('/admin/manage-users');
    },

    async getUserById(userId) {
        return this.get(`/users/${userId}`);
    },

    async createUser(userData) {
        return this.post('/admin/users', userData, true);
    },

    async updateUser(userId, userData) {
        // Assuming a generic 'put' method would be similar to 'post'
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
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
        return this.get(`/admin/teams/${id}`);
    },

    async getAllTeams() {
        // Rota de admin para buscar todas as equipes
        return this.get('/admin/manage-teams');
    },

    async createTeam(teamData) {
        return this.post('/admin/teams', teamData, true);
    },

    async updateTeam(id, teamData) {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/admin/teams/${id}`, {
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
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_BASE_URL}/admin/teams/${id}`, {
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
    },

    // --- Reports ---
    async getGeneralReport() {
        return this.get('/reports/general');
    },

    async getEngagementReport() {
        return this.get('/reports/user-engagement');
    }
};
