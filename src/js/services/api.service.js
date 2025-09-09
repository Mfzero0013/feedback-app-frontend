/**
 * Serviço de API para comunicação com o backend
 */

// Configuração base da API
const API_BASE_URL = process.env.API_BASE_URL || '/api';

// Utilitário para fazer requisições HTTP
async function fetchData(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  // Adiciona o token de autenticação se disponível
  const token = localStorage.getItem('authToken');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Erro na requisição');
    }

    // Verifica se a resposta tem conteúdo antes de tentar fazer parse de JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    return {};
  } catch (error) {
    console.error('Erro na requisição:', error);
    throw error;
  }
}

// Serviço de autenticação
export const authService = {
  async login(credentials) {
    return fetchData(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  async logout() {
    try {
      await fetchData(`${API_BASE_URL}/auth/logout`, {
        method: 'POST'
      });
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login.html';
    }
  },

  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem('authToken');
  }
};

// Serviço de feedbacks
export const feedbackService = {
  async getFeedbacks(params = {}) {
    const query = new URLSearchParams(params).toString();
    return fetchData(`${API_BASE_URL}/feedbacks?${query}`);
  },

  async getFeedbackById(id) {
    return fetchData(`${API_BASE_URL}/feedbacks/${id}`);
  },

  async createFeedback(feedback) {
    return fetchData(`${API_BASE_URL}/feedbacks`, {
      method: 'POST',
      body: JSON.stringify(feedback)
    });
  },

  async updateFeedback(id, updates) {
    return fetchData(`${API_BASE_URL}/feedbacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteFeedback(id) {
    return fetchData(`${API_BASE_URL}/feedbacks/${id}`, {
      method: 'DELETE'
    });
  }
};

// Serviço de usuários
export const userService = {
  async getUsers() {
    return fetchData(`${API_BASE_URL}/users`);
  },

  async getUserById(id) {
    return fetchData(`${API_BASE_URL}/users/${id}`);
  },

  async createUser(userData) {
    return fetchData(`${API_BASE_URL}/users`, {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  },

  async updateUser(id, updates) {
    return fetchData(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteUser(id) {
    return fetchData(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE'
    });
  }
};

// Serviço de equipes
export const teamService = {
  async getTeams() {
    return fetchData(`${API_BASE_URL}/teams`);
  },

  async getTeamById(id) {
    return fetchData(`${API_BASE_URL}/teams/${id}`);
  },

  async createTeam(teamData) {
    return fetchData(`${API_BASE_URL}/teams`, {
      method: 'POST',
      body: JSON.stringify(teamData)
    });
  },

  async updateTeam(id, updates) {
    return fetchData(`${API_BASE_URL}/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  async deleteTeam(id) {
    return fetchData(`${API_BASE_URL}/teams/${id}`, {
      method: 'DELETE'
    });
  },

  async getTeamMembers(teamId) {
    return fetchData(`${API_BASE_URL}/teams/${teamId}/members`);
  },

  async addTeamMember(teamId, userId) {
    return fetchData(`${API_BASE_URL}/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
  },

  async removeTeamMember(teamId, userId) {
    return fetchData(`${API_BASE_URL}/teams/${teamId}/members/${userId}`, {
      method: 'DELETE'
    });
  }
};

// Exporta todos os serviços
export const api = {
  auth: authService,
  feedbacks: feedbackService,
  users: userService,
  teams: teamService,
  fetch: fetchData
};

export default api;
