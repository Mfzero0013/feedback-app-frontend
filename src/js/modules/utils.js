/**
 * Módulo de utilidades gerais
 */

export const CLASSES = {
    HIDDEN: 'hidden',
    ACTIVE: 'active',
    DISABLED: 'disabled',
    ERROR: 'error',
    SUCCESS: 'success',
    WARNING: 'warning',
    INFO: 'info'
};

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} unsafe - String não segura
 * @returns {string} String segura para HTML
 */
export function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
}

/**
 * Formata uma data para o formato brasileiro
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
}

/**
 * Formata um CPF
 * @param {string} cpf - CPF a ser formatado
 * @returns {string} CPF formatado
 */
export function formatCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Remove formatação de CPF/CNPJ
 * @param {string} value - Valor formatado
 * @returns {string} Valor sem formatação
 */
export function removeFormatting(value) {
    return value.replace(/[^\d]/g, '');
}

/**
 * Valida um e-mail
 * @param {string} email - E-mail a ser validado
 * @returns {boolean} Verdadeiro se for um e-mail válido
 */
export function isValidEmail(email) {
    if (!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Valida uma senha
 * @param {string} password - Senha a ser validada
 * @returns {{isValid: boolean, message: string}} Resultado da validação
 */
export function validatePassword(password) {
    if (!password) return { isValid: false, message: 'A senha é obrigatória' };
    if (password.length < 6) return { isValid: false, message: 'A senha deve ter pelo menos 6 caracteres' };
    return { isValid: true, message: '' };
}

/**
 * Cria um elemento HTML com atributos e filhos
 * @param {string} tag - Nome da tag
 * @param {Object} attributes - Atributos do elemento
 * @param {Array|string} children - Filhos do elemento
 * @returns {HTMLElement} Elemento criado
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);
    
    // Adiciona atributos
    Object.entries(attributes).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            element.setAttribute(key, value);
        }
    });
    
    // Adiciona filhos
    if (Array.isArray(children)) {
        children.forEach(child => {
            if (child) element.appendChild(child);
        });
    } else if (typeof children === 'string') {
        element.textContent = children;
    }
    
    return element;
}

/**
 * Remove todos os filhos de um elemento
 * @param {HTMLElement} element - Elemento a ter os filhos removidos
 */
export function removeAllChildren(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

/**
 * Debounce para limitar chamadas de função
 * @param {Function} func - Função a ser executada
 * @param {number} wait - Tempo de espera em milissegundos
 * @returns {Function} Função com debounce aplicado
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
