import { httpService } from './http.service';
import { setAuthData, getAuthData, clearAuthData } from './auth.service';

/**
 * Serviço de API para autenticação
 */
const authService = {
    /**
     * Realiza o login do usuário
     * @param {string} email - Email do usuário
     * @param {string} password - Senha do usuário
     */
    async login(email, password) {
        try {
            const response = await httpService.post('/auth/login', { email, password });
            
            if (response.token && response.user) {
                setAuthData(response.user, response.token);
                return response.user;
            }
            
            throw new Error('Resposta de login inválida');
        } catch (error) {
            console.error('Erro no login:', error);
            throw new Error(error.message || 'Falha no login. Verifique suas credenciais.');
        }
    },

    /**
     * Realiza o logout do usuário
     */
    logout() {
        clearAuthData();
    },

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated() {
        return !!getAuthData();
    },

    /**
     * Obtém o perfil do usuário atual
     */
    async getProfile() {
        try {
            return await httpService.get('/users/me');
        } catch (error) {
            console.error('Erro ao obter perfil:', error);
            throw error;
        }
    },
};

/**
 * Serviço de API para feedbacks
 */
const feedbackService = {
    /**
     * Obtém os feedbacks do usuário
     * @param {string} type - Tipo de feedback ('received' ou 'sent')
     */
    async getFeedbacks(type = 'received') {
        try {
            return await httpService.get(`/feedbacks?type=${type}`);
        } catch (error) {
            console.error('Erro ao obter feedbacks:', error);
            throw error;
        }
    },

    /**
     * Envia um novo feedback
     * @param {Object} feedbackData - Dados do feedback
     */
    async sendFeedback(feedbackData) {
        try {
            return await httpService.post('/feedbacks', feedbackData);
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            throw error;
        }
    },
};

/**
 * Serviço de API para usuários
 */
const userService = {
    /**
     * Obtém a lista de usuários
     */
    async getUsers() {
        try {
            return await httpService.get('/users');
        } catch (error) {
            console.error('Erro ao obter usuários:', error);
            throw error;
        }
    },

    /**
     * Atualiza os dados do usuário
     * @param {string} userId - ID do usuário
     * @param {Object} userData - Novos dados do usuário
     */
    async updateUser(userId, userData) {
        try {
            return await httpService.put(`/users/${userId}`, userData);
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            throw error;
        }
    },
};

// Exporta todos os serviços agrupados
export const api = {
    auth: authService,
    feedbacks: feedbackService,
    users: userService,
    // Adicione outros serviços conforme necessário
};
