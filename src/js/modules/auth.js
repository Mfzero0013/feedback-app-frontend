import { api } from '../services/api.service.js';
import notificationService from '../services/notification.service.js';
import { CLASSES, escapeHtml } from './utils.js';

// Chaves para armazenamento local
const AUTH_KEYS = {
    TOKEN: 'auth_token',
    USER: 'user_data',
    REDIRECT: 'redirect_url'
};

/**
 * Armazena os dados de autenticação
 * @param {Object} data - Dados de autenticação
 */
export function setAuthData(data) {
    if (!data || !data.token) return;
    
    localStorage.setItem(AUTH_KEYS.TOKEN, data.token);
    
    if (data.user) {
        localStorage.setItem(AUTH_KEYS.USER, JSON.stringify(data.user));
    }
    
    // Configura o token no cabeçalho das requisições
    api.setAuthToken(data.token);
}

/**
 * Obtém os dados de autenticação
 * @returns {Object|null} Dados de autenticação ou null se não autenticado
 */
export function getAuthData() {
    const token = localStorage.getItem(AUTH_KEYS.TOKEN);
    const userJson = localStorage.getItem(AUTH_KEYS.USER);
    
    if (!token) return null;
    
    try {
        const user = userJson ? JSON.parse(userJson) : null;
        return { token, user };
    } catch (e) {
        console.error('Erro ao analisar dados do usuário:', e);
        return null;
    }
}

/**
 * Remove os dados de autenticação
 */
export function clearAuthData() {
    localStorage.removeItem(AUTH_KEYS.TOKEN);
    localStorage.removeItem(AUTH_KEYS.USER);
    api.clearAuthToken();
}

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} Verdadeiro se estiver autenticado
 */
export function isAuthenticated() {
    return !!getAuthData();
}

/**
 * Verifica se o usuário tem uma determinada função
 * @param {string} role - Função a ser verificada
 * @returns {boolean} Verdadeiro se o usuário tiver a função
 */
export function hasRole(role) {
    const authData = getAuthData();
    return authData?.user?.role === role;
}

/**
 * Redireciona para a página de login
 * @param {string} redirectUrl - URL para redirecionar após o login
 */
export function redirectToLogin(redirectUrl = null) {
    if (redirectUrl) {
        localStorage.setItem(AUTH_KEYS.REDIRECT, redirectUrl);
    }
    window.location.href = '/login.html';
}

/**
 * Obtém e limpa a URL de redirecionamento
 * @returns {string|null} URL de redirecionamento ou null
 */
export function getAndClearRedirectUrl() {
    const url = localStorage.getItem(AUTH_KEYS.REDIRECT);
    if (url) {
        localStorage.removeItem(AUTH_KEYS.REDIRECT);
        return url;
    }
    return null;
}

/**
 * Configura o formulário de login
 * @param {string} formId - ID do formulário de login
 */
/**
 * Configura o formulário de login com validação e ações
 * @param {string} formId - ID do formulário de login
 */
export function setupLoginForm(formId = 'login-form') {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const emailInput = form.querySelector('input[name="email"]');
    const passwordInput = form.querySelector('input[name="senha"]');
    const submitButton = form.querySelector('button[type="submit"]');
    const resetButton = form.querySelector('button[type="reset"]');
    
    // Função para limpar os campos do formulário
    const resetForm = () => {
        if (form) form.reset();
        if (emailInput) emailInput.value = '';
        if (passwordInput) passwordInput.value = '';
        
        // Remove as classes de erro e mensagens
        const errorElements = form.querySelectorAll('.error-message, .is-invalid');
        errorElements.forEach(el => {
            el.classList.remove('is-invalid');
            if (el.classList.contains('error-message')) {
                el.remove();
            }
        });
        
        // Remove o foco dos campos
        if (document.activeElement) {
            document.activeElement.blur();
        }
        
        // Foca no campo de email após resetar
        if (emailInput) {
            emailInput.focus();
        }
    };
    
    // Configura o botão de limpar
    if (resetButton) {
        resetButton.addEventListener('click', (e) => {
            e.preventDefault();
            resetForm();
        });
    }
    
    // Adiciona validação em tempo real
    const validateField = (input, errorId) => {
        const errorElement = document.getElementById(errorId);
        if (!errorElement) return;
        
        if (!input.value.trim()) {
            input.classList.add('border-red-500', 'is-invalid');
            errorElement.textContent = 'Este campo é obrigatório';
            return false;
        }
        
        // Validação específica para email
        if (input.type === 'email' && input.value.trim()) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(input.value.trim())) {
                input.classList.add('border-red-500', 'is-invalid');
                errorElement.textContent = 'Por favor, insira um email válido';
                return false;
            }
        }
        
        input.classList.remove('border-red-500', 'is-invalid');
        errorElement.textContent = '';
        return true;
    };
    
    // Event listeners para validação em tempo real
    if (emailInput) {
        emailInput.addEventListener('blur', () => validateField(emailInput, 'email-error'));
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('blur', () => validateField(passwordInput, 'password-error'));
    }
    
    // Manipulador de envio do formulário
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!emailInput || !passwordInput || !submitButton) return;
        
        // Valida todos os campos
        const isEmailValid = validateField(emailInput, 'email-error');
        const isPasswordValid = validateField(passwordInput, 'password-error');
        
        if (!isEmailValid || !isPasswordValid) {
            notificationService.error('Por favor, corrija os erros no formulário.');
            return;
        }
        
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        
        // Desabilita o botão durante o login
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        
        try {
            const response = await api.auth.login({ email, password });
            
            if (response.success && response.data) {
                setAuthData({
                    token: response.data.token,
                    user: response.data.user
                });
                
                // Redireciona para a URL salva ou para a página inicial
                const redirectUrl = getAndClearRedirectUrl() || '/dashboard.html';
                window.location.href = redirectUrl;
            } else {
                notificationService.error(response.message || 'Erro ao fazer login. Verifique suas credenciais.');
                // Foca no campo de senha para nova tentativa
                if (passwordInput) passwordInput.focus();
            }
        } catch (error) {
            console.error('Erro no login:', error);
            notificationService.error('Erro ao conectar ao servidor. Tente novamente mais tarde.');
            // Foca no campo de email em caso de erro
            if (emailInput) emailInput.focus();
        } finally {
            // Restaura o botão
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });
    
    // Foca no campo de email ao carregar a página
    if (emailInput) {
        emailInput.focus();
    }
}

/**
 * Configura o botão de logout
 * @param {string} buttonId - ID do botão de logout
 */
export function setupLogoutButton(buttonId = 'logout-button') {
    const button = document.getElementById(buttonId);
    if (!button) return;
    
    button.addEventListener('click', async (e) => {
        e.preventDefault();
        
        try {
            await api.auth.logout();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        } finally {
            clearAuthData();
            window.location.href = '/login.html';
        }
    });
}

/**
 * Protege rotas que requerem autenticação
 * @param {string[]} allowedRoles - Funções permitidas (opcional)
 */
export function protectRoute(allowedRoles = []) {
    const authData = getAuthData();
    
    if (!authData) {
        // Salva a URL atual para redirecionar após o login
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== '/login.html') {
            redirectToLogin(currentPath);
        }
        return;
    }
    
    // Verifica se o usuário tem uma das funções permitidas
    if (allowedRoles.length > 0 && !allowedRoles.includes(authData.user.role)) {
        window.location.href = '/403.html';
        return;
    }
    
    // Atualiza a UI com os dados do usuário
    updateUserUI(authData.user);
}

/**
 * Atualiza a interface do usuário com os dados do perfil
 * @param {Object} userData - Dados do usuário
 */
function updateUserUI(userData) {
    if (!userData) return;
    
    // Atualiza o nome do usuário
    const nameElements = document.querySelectorAll('[data-user-name]');
    nameElements.forEach(el => {
        el.textContent = userData.name || 'Usuário';
    });
    
    // Atualiza o avatar
    const avatarElements = document.querySelectorAll('[data-user-avatar]');
    const avatarUrl = userData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.name || 'User')}&background=random&color=fff`;
    
    avatarElements.forEach(el => {
        el.src = avatarUrl;
        el.alt = `Avatar de ${userData.name || 'Usuário'}`;
    });
    
    // Atualiza a visibilidade de elementos baseado nas permissões
    updateUIPermissions(userData.role);
}

/**
 * Atualiza a UI baseado nas permissões do usuário
 * @param {string} userRole - Função do usuário
 */
function updateUIPermissions(userRole) {
    // Esconde elementos que não devem ser vistos pelo usuário atual
    const adminOnlyElements = document.querySelectorAll('[data-role="admin"]');
    const managerOnlyElements = document.querySelectorAll('[data-role="manager"]');
    
    adminOnlyElements.forEach(el => {
        el.style.display = userRole === 'admin' ? '' : 'none';
    });
    
    managerOnlyElements.forEach(el => {
        el.style.display = ['admin', 'manager'].includes(userRole) ? '' : 'none';
    });
}
