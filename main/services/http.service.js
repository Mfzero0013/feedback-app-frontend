import { getAuthData, clearAuthData } from './auth.service';

const API_BASE_URL = 'https://feedback-app-backend-x87n.onrender.com/api';

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
        
        // Tratamento de erros de autenticação
        if (response.status === 401) {
            clearAuthData();
            window.location.href = 'index.html';
            throw new Error('Sessão expirada. Por favor, faça login novamente.');
        }

        let data;
        try {
            data = isJson ? await response.json() : await response.text();
        } catch (error) {
            console.error('Erro ao processar resposta:', error);
            throw new Error('Erro ao processar a resposta do servidor.');
        }

        if (!response.ok) {
            const errorMessage = data?.message || `Erro ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
        }

        return data.data || data;
    }

    /**
     * Realiza uma requisição GET
     * @param {string} url - Endpoint da API
     * @param {Object} params - Parâmetros de consulta
     */
    async get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = `${API_BASE_URL}${url}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: this.getDefaultHeaders(),
        });

        return this.handleResponse(response);
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
