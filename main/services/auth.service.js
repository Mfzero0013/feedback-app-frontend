/**
 * Serviço de autenticação e gerenciamento de estado do usuário
 */

const TOKEN_KEY = 'authToken';
const USER_DATA_KEY = 'userData';
const REDIRECT_KEY = 'redirectAfterLogin';

/**
 * Armazena os dados do usuário no localStorage
 * @param {Object} userData - Dados do usuário
 * @param {string} token - Token de autenticação
 */
export function setAuthData(userData, token) {
    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }
    if (userData) {
        localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    }
}

/**
 * Obtém os dados do usuário autenticado
 * @returns {Object|null} Dados do usuário ou null se não autenticado
 */
export function getAuthData() {
    const token = localStorage.getItem(TOKEN_KEY);
    const userData = localStorage.getItem(USER_DATA_KEY);
    
    if (!token || !userData) {
        return null;
    }
    
    try {
        return {
            token,
            user: JSON.parse(userData)
        };
    } catch (e) {
        console.error('Erro ao analisar dados do usuário:', e);
        return null;
    }
}

/**
 * Remove os dados de autenticação do usuário
 */
export function clearAuthData() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_DATA_KEY);
}

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean}
 */
export function isAuthenticated() {
    return !!getAuthData()?.token;
}

/**
 * Redireciona para a página de login, armazenando a URL atual
 * @param {string} redirectUrl - URL para redirecionar após o login
 */
export function redirectToLogin(redirectUrl = window.location.pathname) {
    if (!['/index.html', '/'].includes(redirectUrl)) {
        localStorage.setItem(REDIRECT_KEY, redirectUrl);
    }
    window.location.href = 'index.html';
}

/**
 * Obtém a URL de redirecionamento pós-login e a remove do storage
 * @returns {string} URL para redirecionamento ou '/' como padrão
 */
export function getAndClearRedirectUrl() {
    const url = localStorage.getItem(REDIRECT_KEY) || '/';
    localStorage.removeItem(REDIRECT_KEY);
    return url;
}

/**
 * Atualiza os dados do usuário no storage
 * @param {Object} userData - Novos dados do usuário
 */
export function updateUserData(userData) {
    if (!userData) return;
    
    const currentData = getAuthData();
    if (currentData) {
        setAuthData({ ...currentData.user, ...userData }, currentData.token);
    }
}
