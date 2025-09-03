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
    if (!token) {
        console.error('Nenhum token fornecido para setAuthData');
        return;
    }
    
    try {
        // Remove o prefixo 'Bearer ' se existir para armazenar apenas o token
        const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
        localStorage.setItem(TOKEN_KEY, cleanToken);
        
        if (userData) {
            localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
        }
        
        console.log('Token armazenado com sucesso');
    } catch (error) {
        console.error('Erro ao armazenar dados de autenticação:', error);
        throw new Error('Falha ao armazenar os dados de autenticação');
    }
}

/**
 * Obtém os dados do usuário autenticado
 * @returns {Object|null} Dados do usuário ou null se não autenticado
 */
export function getAuthData() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const userData = localStorage.getItem(USER_DATA_KEY);
        
        if (!token) {
            console.log('Nenhum token encontrado no localStorage');
            return null;
        }
        
        // Verifica se o token é válido (formato básico)
        if (typeof token !== 'string' || token.trim() === '') {
            console.error('Token inválido encontrado no localStorage');
            clearAuthData();
            return null;
        }
        
        // Se não houver dados do usuário, mas houver token, tenta obter o perfil
        if (!userData) {
            console.log('Token encontrado, mas sem dados do usuário');
            return { token };
        }
        
        // Tenta fazer parse dos dados do usuário
        try {
            const parsedUserData = JSON.parse(userData);
            return {
                token,
                user: parsedUserData
            };
        } catch (e) {
            console.error('Erro ao analisar dados do usuário:', e);
            // Mantém o token mesmo se os dados do usuário estiverem corrompidos
            return { token };
        }
    } catch (error) {
        console.error('Erro ao obter dados de autenticação:', error);
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
