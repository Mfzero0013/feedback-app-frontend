import { NOTIFICATION_TYPES } from '../constants';

// Elemento de notificação
let notificationContainer = null;

/**
 * Inicializa o serviço de notificações
 */
function init() {
    // Cria o container de notificações se não existir
    if (!notificationContainer) {
        notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        notificationContainer.className = 'fixed top-4 right-4 z-50 space-y-2 w-80';
        document.body.appendChild(notificationContainer);
    }
}

/**
 * Exibe uma notificação
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação (success, error, warning, info)
 * @param {number} duration - Duração em milissegundos (0 para não fechar automaticamente)
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Garante que o container está inicializado
    init();

    // Cria o elemento da notificação
    const notification = document.createElement('div');
    const typeClasses = {
        [NOTIFICATION_TYPES.SUCCESS]: 'bg-green-100 border-green-400 text-green-700',
        [NOTIFICATION_TYPES.ERROR]: 'bg-red-100 border-red-400 text-red-700',
        [NOTIFICATION_TYPES.WARNING]: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        [NOTIFICATION_TYPES.INFO]: 'bg-blue-100 border-blue-400 text-blue-700',
    };

    notification.className = `border-l-4 p-4 rounded shadow-lg ${typeClasses[type] || typeClasses[NOTIFICATION_TYPES.INFO]}`;
    notification.role = 'alert';
    
    // Adiciona o ícone baseado no tipo
    const icons = {
        [NOTIFICATION_TYPES.SUCCESS]: '✅',
        [NOTIFICATION_TYPES.ERROR]: '❌',
        [NOTIFICATION_TYPES.WARNING]: '⚠️',
        [NOTIFICATION_TYPES.INFO]: 'ℹ️',
    };

    notification.innerHTML = `
        <div class="flex items-center">
            <span class="text-xl mr-2">${icons[type] || 'ℹ️'}</span>
            <p class="flex-1">${message}</p>
            <button class="ml-2 text-gray-500 hover:text-gray-700" aria-label="Fechar">
                &times;
            </button>
        </div>
    `;

    // Adiciona a notificação ao container
    notificationContainer.appendChild(notification);

    // Configura o botão de fechar
    const closeButton = notification.querySelector('button');
    const closeNotification = () => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s ease-in-out';
        
        setTimeout(() => {
            notification.remove();
        }, 500);
    };

    closeButton.addEventListener('click', closeNotification);

    // Remove a notificação após o tempo definido
    if (duration > 0) {
        setTimeout(closeNotification, duration);
    }

    // Retorna uma função para fechar manualmente
    return closeNotification;
}

// Métodos auxiliares para cada tipo de notificação
const notificationService = {
    success: (message, duration) => showNotification(message, NOTIFICATION_TYPES.SUCCESS, duration),
    error: (message, duration) => showNotification(message, NOTIFICATION_TYPES.ERROR, duration),
    warning: (message, duration) => showNotification(message, NOTIFICATION_TYPES.WARNING, duration),
    info: (message, duration) => showNotification(message, NOTIFICATION_TYPES.INFO, duration),
    // Método genérico
    show: showNotification,
};

export default notificationService;
