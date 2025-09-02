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

    /**
     * Registra um novo usuário
     * @param {Object} userData - Dados do usuário para registro
     */
    async register(userData) {
        try {
            const response = await httpService.post('/auth/register', userData);
            
            if (response.token && response.user) {
                setAuthData(response.user, response.token);
                return response.user;
            }
            
            throw new Error('Resposta de registro inválida');
        } catch (error) {
            console.error('Erro no registro:', error);
            throw new Error(error.message || 'Falha no registro. Por favor, tente novamente.');
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
 * Serviço de API para equipes
 */
const teamService = {
    /**
     * Obtém todas as equipes
     */
    async getAllTeams() {
        try {
            return await httpService.get('/teams');
        } catch (error) {
            console.error('Erro ao obter equipes:', error);
            throw error;
        }
    },

    /**
     * Obtém uma equipe por ID
     * @param {string} teamId - ID da equipe
     */
    async getTeamById(teamId) {
        try {
            return await httpService.get(`/teams/${teamId}`);
        } catch (error) {
            console.error('Erro ao obter equipe:', error);
            throw error;
        }
    },

    /**
     * Cria uma nova equipe
     * @param {Object} teamData - Dados da equipe
     */
    async createTeam(teamData) {
        try {
            return await httpService.post('/teams', teamData);
        } catch (error) {
            console.error('Erro ao criar equipe:', error);
            throw error;
        }
    },

    /**
     * Atualiza uma equipe existente
     * @param {string} teamId - ID da equipe
     * @param {Object} teamData - Novos dados da equipe
     */
    async updateTeam(teamId, teamData) {
        try {
            return await httpService.put(`/teams/${teamId}`, teamData);
        } catch (error) {
            console.error('Erro ao atualizar equipe:', error);
            throw error;
        }
    },

    /**
     * Remove uma equipe
     * @param {string} teamId - ID da equipe
     */
    async deleteTeam(teamId) {
        try {
            return await httpService.delete(`/teams/${teamId}`);
        } catch (error) {
            console.error('Erro ao remover equipe:', error);
            throw error;
        }
    },

    /**
     * Adiciona um membro a uma equipe
     * @param {string} teamId - ID da equipe
     * @param {string} userId - ID do usuário
     */
    async addTeamMember(teamId, userId) {
        try {
            return await httpService.post(`/teams/${teamId}/members`, { userId });
        } catch (error) {
            console.error('Erro ao adicionar membro à equipe:', error);
            throw error;
        }
    },

    /**
     * Remove um membro de uma equipe
     * @param {string} teamId - ID da equipe
     * @param {string} userId - ID do usuário
     */
    async removeTeamMember(teamId, userId) {
        try {
            return await httpService.delete(`/teams/${teamId}/members/${userId}`);
        } catch (error) {
            console.error('Erro ao remover membro da equipe:', error);
            throw error;
        }
    },

    /**
     * Obtém os membros de uma equipe
     * @param {string} teamId - ID da equipe
     */
    async getTeamMembers(teamId) {
        try {
            return await httpService.get(`/teams/${teamId}/members`);
        } catch (error) {
            console.error('Erro ao obter membros da equipe:', error);
            throw error;
        }
    }
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
    teams: teamService
};
