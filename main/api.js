// TODO: Mover para um arquivo de configuração ou variáveis de ambiente
const API_BASE_URL = 'https://feedback-app-backend-die8.onrender.com/api';

/**
 * Redireciona o usuário para a página de login, limpando o armazenamento local.
 */
function forceLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    if (!window.location.pathname.endsWith('index.html') && !window.location.pathname.endsWith('/')) {
        window.location.href = 'index.html';
    }
}

/**
 * Processa a resposta de uma requisição à API, tratando sucessos e erros.
 * @param {Response} response - O objeto de resposta da API.
 * @returns {Promise<any>} Os dados da resposta.
 */
async function handleApiResponse(response) {
    // Se o token for inválido ou expirado, o backend retorna 401
    if (response.status === 401) {
        forceLogout();
        throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }

    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    
    let data;
    try {
        data = isJson ? await response.json() : await response.text();
    } catch (error) {
        throw new Error('Falha ao processar a resposta do servidor.');
    }

    if (!response.ok) {
        const message = (isJson && data.message) ? data.message : `Erro ${response.status}: ${response.statusText}`;
        throw new Error(message);
    }

    // Caso especial para o login, que retorna o token no corpo principal da resposta.
    if (response.url.endsWith('/auth/login')) {
        return data; // Retorna o objeto completo com { token, data: { user } }
    }

    // Para outras requisições, retorna a propriedade `data` se existir.
    return data.data || data;
}

/**
 * Realiza uma requisição genérica para a API.
 * @param {string} url - O caminho do endpoint (ex: '/users').
 * @param {object} options - Opções da requisição (method, body, etc.).
 * @returns {Promise<any>} Os dados da resposta.
 */
async function request(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    return handleApiResponse(response);
}

// Objeto que agrupa todos os métodos da API de forma organizada
const api = {
    get: (url) => request(url, { method: 'GET' }),
    post: (url, data) => request(url, { method: 'POST', body: JSON.stringify(data) }),
    put: (url, data) => request(url, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (url) => request(url, { method: 'DELETE' }),

    // --- Auth ---
    loginUser: (email, password) => api.post('/auth/login', { email, senha: password }),
    registerUser: (userData) => api.post('/auth/register', userData),

    // --- Profile ---
    getProfile: () => api.get('/profile/me'),
    updateProfile: (profileData) => api.put('/profile/me', profileData),

    // --- Feedbacks ---
    getReceivedFeedbacks: () => api.get('/feedback?type=received'),
    sendFeedback: (feedbackData) => api.post('/feedback', feedbackData),
    getSentFeedbacks: () => api.get('/feedback?type=sent'),

    // --- Users (Admin) ---
    getUsers: () => api.get('/admin/manage-users'),
    createUser: (userData) => api.post('/admin/users', userData),
    updateUser: (userId, userData) => api.put(`/admin/users/${userId}`, userData),
    deleteUser: (userId) => api.delete(`/admin/users/${userId}`),

    // --- Teams (Admin) ---
    getTeamById: (id) => api.get(`/admin/teams/${id}`),
    getAllTeams: () => api.get('/admin/manage-teams'),
    createTeam: (teamData) => api.post('/admin/teams', teamData),
    updateTeam: (id, teamData) => api.put(`/admin/teams/${id}`, teamData),
    deleteTeam: (id) => api.delete(`/admin/teams/${id}`),

    // --- Teams (User) ---
    getMyTeam: () => api.get('/teams/my-team'),

    // --- Reports ---
    getGeneralReport: () => api.get('/reports/general'),
    getEngagementReport: () => api.get('/reports/user-engagement'),
};
