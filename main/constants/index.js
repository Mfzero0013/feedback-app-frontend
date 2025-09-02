/**
 * Constantes de configuração da aplicação
 */

export const APP_NAME = 'Feedback App';
export const API_BASE_URL = 'https://feedback-app-backend-x87n.onrender.com/api';

/**
 * Chaves de armazenamento local
 */
export const STORAGE_KEYS = {
    AUTH_TOKEN: 'authToken',
    USER_DATA: 'userData',
    REDIRECT_URL: 'redirectAfterLogin',    
};

/**
 * Mensagens de erro comuns
 */
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Erro de conexão. Verifique sua internet e tente novamente.',
    UNAUTHORIZED: 'Sessão expirada. Por favor, faça login novamente.',
    FORBIDDEN: 'Você não tem permissão para acessar este recurso.',
    NOT_FOUND: 'Recurso não encontrado.',
    SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
    VALIDATION_ERROR: 'Por favor, verifique os dados informados.',
};

/**
 * Tipos de notificação
 */
export const NOTIFICATION_TYPES = {
    SUCCESS: 'success',
    ERROR: 'error',
    WARNING: 'warning',
    INFO: 'info',
};

/**
 * Perfis de usuário
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    USER: 'user',
};

/**
 * Configurações de paginação
 */
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_PAGE_SIZE: 10,
    PAGE_SIZE_OPTIONS: [5, 10, 25, 50],
};
