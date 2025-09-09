import { CLASSES, createElement, escapeHtml } from './utils.js';

// Configurações padrão
const DEFAULT_CONFIG = {
    position: 'top-right',
    autoClose: 5000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: 'light'
};

// Mapeamento de tipos de notificação para classes CSS
const NOTIFICATION_TYPES = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info'
};

/**
 * Serviço de notificações
 */
class NotificationService {
    constructor() {
        this.container = null;
        this.initializeContainer();
    }

    /**
     * Inicializa o container de notificações
     */
    initializeContainer() {
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        document.body.appendChild(this.container);
    }

    /**
     * Exibe uma notificação
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de notificação (success, error, warning, info)
     * @param {number} duration - Duração em milissegundos (opcional)
     */
    show(message, type = 'info', duration = 5000) {
        if (!message) return;

        const notification = createElement('div', {
            class: `notification notification-${NOTIFICATION_TYPES[type] || 'info'}`,
            role: 'alert',
            'aria-live': 'assertive'
        }, [
            createElement('div', { class: 'notification-message' }, escapeHtml(message)),
            createElement('button', {
                class: 'notification-close',
                'aria-label': 'Fechar notificação'
            }, '×')
        ]);

        // Adiciona evento de clique no botão de fechar
        const closeButton = notification.querySelector('.notification-close');
        closeButton.addEventListener('click', () => this.removeNotification(notification));

        // Adiciona a notificação ao container
        this.container.appendChild(notification);

        // Remove a notificação após o tempo definido
        if (duration > 0) {
            setTimeout(() => {
                this.removeNotification(notification);
            }, duration);
        }

        return notification;
    }

    /**
     * Remove uma notificação
     * @param {HTMLElement} notification - Elemento da notificação a ser removida
     */
    removeNotification(notification) {
        if (!notification || !notification.parentNode) return;
        
        notification.classList.add('fade-out');
        notification.addEventListener('transitionend', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, { once: true });
    }

    // Métodos auxiliares para tipos de notificação
    success(message, duration) {
        return this.show(message, 'success', duration);
    }

    error(message, duration) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration) {
        return this.show(message, 'info', duration);
    }
}

/**
 * Gerenciador de modais
 */
class ModalManager {
    constructor() {
        this.currentModal = null;
        this.closeOnOutsideClick = true;
        this.onCloseCallbacks = [];
    }

    /**
     * Abre um modal
     * @param {string|HTMLElement} content - Conteúdo do modal ou ID do elemento
     * @param {Object} options - Opções do modal
     */
    open(content, options = {}) {
        // Fecha o modal atual se existir
        this.close();

        // Opções padrão
        const {
            title = '',
            size = 'md', // sm, md, lg, xl
            closeButton = true,
            closeOnOutsideClick = true,
            onClose = null,
            className = ''
        } = options;

        // Cria o elemento do modal
        const modal = document.createElement('div');
        modal.className = `modal ${className}`;
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');
        
        // Se o conteúdo for uma string, assume que é um ID
        const modalContent = typeof content === 'string' 
            ? document.getElementById(content)?.cloneNode(true)
            : content;

        if (!modalContent) {
            console.error('Conteúdo do modal não encontrado ou inválido');
            return null;
        }

        // Remove o ID para evitar duplicação
        if (modalContent.id) {
            modalContent.removeAttribute('id');
        }

        // Monta a estrutura do modal
        modal.innerHTML = `
            <div class="modal-dialog modal-${size}">
                <div class="modal-content">
                    ${title ? `
                    <div class="modal-header">
                        <h5 id="modal-title" class="modal-title">${escapeHtml(title)}</h5>
                        ${closeButton ? '
                        <button type="button" class="btn-close" data-dismiss="modal" aria-label="Fechar">
                            <span aria-hidden="true">&times;</span>
                        </button>' : ''}
                    </div>
                    ` : ''}
                    <div class="modal-body"></div>
                </div>
            </div>
        `;

        // Adiciona o conteúdo ao corpo do modal
        const modalBody = modal.querySelector('.modal-body');
        modalBody.appendChild(modalContent);

        // Adiciona o modal ao documento
        document.body.appendChild(modal);
        document.body.classList.add('modal-open');

        // Armazena referência ao modal atual
        this.currentModal = modal;
        this.closeOnOutsideClick = closeOnOutsideClick;

        // Adiciona evento de fechar ao clicar fora
        if (closeOnOutsideClick) {
            modal.addEventListener('click', this.handleOutsideClick);
        }

        // Adiciona evento de teclado
        document.addEventListener('keydown', this.handleEscapeKey);

        // Adiciona callback de fechamento
        if (onClose) {
            this.onCloseCallbacks.push(onClose);
        }

        // Foca no primeiro elemento interativo
        this.focusFirstInteractiveElement();

        // Dispara evento de abertura
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);

        return modal;
    }

    /**
     * Fecha o modal atual
     */
    close() {
        if (!this.currentModal) return;

        // Remove eventos
        this.currentModal.removeEventListener('click', this.handleOutsideClick);
        document.removeEventListener('keydown', this.handleEscapeKey);

        // Remove a classe de exibição
        this.currentModal.classList.remove('show');

        // Aguarda a animação terminar antes de remover o modal
        const handleTransitionEnd = () => {
            this.currentModal.removeEventListener('transitionend', handleTransitionEnd);
            
            // Remove o modal do DOM
            if (this.currentModal && this.currentModal.parentNode) {
                this.currentModal.parentNode.removeChild(this.currentModal);
            }
            
            // Remove a classe do body
            document.body.classList.remove('modal-open');
            
            // Executa callbacks de fechamento
            this.executeCloseCallbacks();
            
            // Limpa a referência
            this.currentModal = null;
        };

        this.currentModal.addEventListener('transitionend', handleTransitionEnd);
    }

    /**
     * Executa os callbacks de fechamento
     */
    executeCloseCallbacks() {
        while (this.onCloseCallbacks.length) {
            const callback = this.onCloseCallbacks.pop();
            if (typeof callback === 'function') {
                try {
                    callback();
                } catch (e) {
                    console.error('Erro ao executar callback de fechamento:', e);
                }
            }
        }
    }

    /**
     * Manipula o clique fora do modal
     * @param {Event} event - Evento de clique
     */
    handleOutsideClick = (event) => {
        if (!this.closeOnOutsideClick || !this.currentModal) return;
        
        const modalContent = this.currentModal.querySelector('.modal-dialog');
        if (modalContent && !modalContent.contains(event.target)) {
            this.close();
        }
    };

    /**
     * Manipula a tecla ESC
     * @param {KeyboardEvent} event - Evento de teclado
     */
    handleEscapeKey = (event) => {
        if (event.key === 'Escape' && this.currentModal) {
            this.close();
        }
    };

    /**
     * Foca no primeiro elemento interativo do modal
     */
    focusFirstInteractiveElement() {
        if (!this.currentModal) return;
        
        const focusableElements = this.currentModal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
}

// Exporta instâncias únicas
export const notificationService = new NotificationService();
export const modalManager = new ModalManager();

// Inicializa os estilos CSS dinâmicos
const initStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        /* Estilos para notificações */
        .notifications-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            max-width: 400px;
            width: 100%;
            pointer-events: none;
        }
        
        .notification {
            position: relative;
            padding: 15px 20px;
            margin-bottom: 10px;
            border-radius: 4px;
            color: #fff;
            background-color: #333;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            opacity: 0;
            transform: translateX(100%);
            transition: opacity 0.3s, transform 0.3s;
            pointer-events: auto;
        }
        
        .notification.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .notification.fade-out {
            opacity: 0;
            transform: translateX(100%);
        }
        
        .notification-close {
            position: absolute;
            top: 5px;
            right: 10px;
            background: none;
            border: none;
            color: inherit;
            font-size: 20px;
            cursor: pointer;
            padding: 0;
            line-height: 1;
        }
        
        .notification-success { background-color: #28a745; }
        .notification-error { background-color: #dc3545; }
        .notification-warning { background-color: #ffc107; color: #212529; }
        .notification-info { background-color: #17a2b8; }
        
        /* Estilos para modais */
        .modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1050;
            display: none;
            overflow: hidden;
            outline: 0;
            background-color: rgba(0, 0, 0, 0.5);
            opacity: 0;
            transition: opacity 0.15s linear;
        }
        
        .modal.show {
            display: block;
            opacity: 1;
        }
        
        .modal-dialog {
            position: relative;
            width: auto;
            margin: 0.5rem;
            pointer-events: none;
            transition: transform 0.3s ease-out;
            transform: translateY(-50px);
        }
        
        .modal.show .modal-dialog {
            transform: translateY(0);
        }
        
        .modal-content {
            position: relative;
            display: flex;
            flex-direction: column;
            width: 100%;
            pointer-events: auto;
            background-color: #fff;
            background-clip: padding-box;
            border: 1px solid rgba(0, 0, 0, 0.2);
            border-radius: 0.3rem;
            outline: 0;
        }
        
        .modal-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            padding: 1rem;
            border-bottom: 1px solid #dee2e6;
            border-top-left-radius: calc(0.3rem - 1px);
            border-top-right-radius: calc(0.3rem - 1px);
        }
        
        .modal-body {
            position: relative;
            flex: 1 1 auto;
            padding: 1rem;
        }
        
        .modal-footer {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            padding: 1rem;
            border-top: 1px solid #dee2e6;
            border-bottom-right-radius: calc(0.3rem - 1px);
            border-bottom-left-radius: calc(0.3rem - 1px);
        }
        
        .btn-close {
            padding: 0.5rem 0.5rem;
            margin: -0.5rem -0.5rem -0.5rem auto;
            background-color: transparent;
            border: 0;
            border-radius: 0.25rem;
            opacity: 0.5;
            font-size: 1.5rem;
            font-weight: 700;
            line-height: 1;
            color: #000;
            text-shadow: 0 1px 0 #fff;
            cursor: pointer;
        }
        
        .btn-close:hover {
            opacity: 0.75;
        }
        
        /* Tamanhos de modal */
        @media (min-width: 576px) {
            .modal-dialog {
                max-width: 500px;
                margin: 1.75rem auto;
            }
            
            .modal-sm { max-width: 300px; }
        }
        
        .modal-md { max-width: 800px; }
        .modal-lg { max-width: 1000px; }
        .modal-xl { max-width: 1200px; }
        
        /* Classe para o body quando um modal está aberto */
        .modal-open {
            overflow: hidden;
            padding-right: 15px; /* Evita quebra de layout ao rolar */
        }
    `;
    
    document.head.appendChild(style);
};

// Inicializa os estilos quando o módulo for carregado
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initStyles);
} else {
    initStyles();
}
