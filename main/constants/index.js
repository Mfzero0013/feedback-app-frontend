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
    
    // Mensagens de erro para equipes
    TEAM_NOT_FOUND: 'Equipe não encontrada.',
    TEAM_CREATE_ERROR: 'Não foi possível criar a equipe. Verifique os dados e tente novamente.',
    TEAM_UPDATE_ERROR: 'Não foi possível atualizar a equipe. Verifique os dados e tente novamente.',
    TEAM_DELETE_ERROR: 'Não foi possível excluir a equipe. Tente novamente mais tarde.',
    TEAM_MEMBER_ADD_ERROR: 'Não foi possível adicionar o membro à equipe.',
    TEAM_MEMBER_REMOVE_ERROR: 'Não foi possível remover o membro da equipe.',
    TEAM_MEMBERS_LOAD_ERROR: 'Não foi possível carregar os membros da equipe.',
    TEAM_NAME_REQUIRED: 'O nome da equipe é obrigatório.',
    TEAM_MEMBER_REQUIRED: 'Selecione um membro para adicionar à equipe.',
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
