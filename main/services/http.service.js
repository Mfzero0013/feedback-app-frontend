import { getAuthData, clearAuthData } from './auth.service';

const API_BASE_URL = process.env.API_BASE_URL || 'https://feedback-app-backend-x87n.onrender.com/api';

/**
 * Classe para gerenciar requisições HTTP
 */
class HttpService {
    /**
     * Configuração base para as requisições
     * @private
     */
    getDefaultHeaders() {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const authData = getAuthData();
        if (authData?.token) {
            headers['Authorization'] = `Bearer ${authData.token}`;
        }

        return headers;
    }

    /**
     * Trata a resposta da API
     * @private
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        const isJson = contentType?.includes('application/json');
        
        let data;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch (error) {
            console.error('Erro ao processar resposta:', error);
            // Se não for possível processar a resposta como JSON, retornar um objeto de erro consistente
            data = { message: 'Erro ao processar a resposta do servidor.' };
        }

        // Tratamento de erros de autenticação
        if (response.status === 401) {
            clearAuthData();
            // Só redireciona se não estiver na página de login
            if (!window.location.pathname.includes('index.html') && 
                !window.location.pathname.includes('login.html')) {
                window.location.href = 'index.html?sessionExpired=true';
            }
            throw new Error(data?.message || 'Sessão expirada. Por favor, faça login novamente.');
        }

        if (!response.ok) {
            const errorMessage = data?.message || 
                              data?.error || 
                              `Erro ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        // Retorna os dados da resposta, tratando diferentes formatos de resposta
        if (data === undefined || data === null) {
            return null;
        }
        
        return data.data !== undefined ? data.data : data;
    }

    /**
     * Realiza uma requisição
     * @param {string} endpoint - Endpoint da API
     * @param {Object} options - Opções da requisição
     */
    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = this.getDefaultHeaders();

        console.log(`[HTTP] Fazendo requisição para: ${url}`, { options });
        
        const config = {
            ...options,
            headers: {
                ...headers,
                ...options.headers,
            },
            credentials: 'include', // Importante para cookies de autenticação
        };
        
        // Adiciona um timestamp para evitar cache
        if (config.method === 'GET') {
            const timestamp = new Date().getTime();
            const separator = endpoint.includes('?') ? '&' : '?';
            config.url = `${url}${separator}_t=${timestamp}`;
        } else {
            config.url = url;
        }

        const response = await fetch(config.url, config);

        return this.handleResponse(response);
    }

    /**
     * Realiza uma requisição GET
     * @param {string} url - Endpoint da API
     * @param {Object} params - Parâmetros de consulta
     */
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = `${API_BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;

        const response = await this.request(fullUrl, {
            method: 'GET',
        });

        return response;
    }

    /**
     * Realiza uma requisição POST
     * @param {string} url - Endpoint da API
     * @param {Object} data - Dados para envio
     */
    async post(url, data = {}) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'POST',
            headers: this.getDefaultHeaders(),
            body: JSON.stringify(data),
        });

        return this.handleResponse(response);
    }

    /**
     * Realiza uma requisição PUT
     * @param {string} url - Endpoint da API
     * @param {Object} data - Dados para atualização
     */
    async put(url, data = {}) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'PUT',
            headers: this.getDefaultHeaders(),
            body: JSON.stringify(data),
        });

        return this.handleResponse(response);
    }

    /**
     * Realiza uma requisição DELETE
     * @param {string} url - Endpoint da API
     * @param {Object} data - Dados opcionais para a requisição
     */
    async delete(url, data = {}) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'DELETE',
            headers: this.getDefaultHeaders(),
            body: Object.keys(data).length ? JSON.stringify(data) : undefined,
        });

        return this.handleResponse(response);
    }

    /**
     * Realiza uma requisição DELETE
     * @param {string} url - Endpoint da API
     */
    async delete(url) {
        const response = await fetch(`${API_BASE_URL}${url}`, {
            method: 'DELETE',
            headers: this.getDefaultHeaders(),
        });

        return this.handleResponse(response);
    }
}

export const httpService = new HttpService();
