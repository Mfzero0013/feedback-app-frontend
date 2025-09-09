// Importa os módulos necessários
import { notificationService, modalManager } from './modules/ui.js';
import { initForm, validators } from './modules/form.js';
import { protectRoute, setupLoginForm, setupLogoutButton } from './modules/auth.js';
import { api } from './services/api.service.js';

// Configurações globais
const APP_CONFIG = {
    apiBaseUrl: process.env.API_BASE_URL || '/api',
    defaultPageSize: 10,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    theme: {
        primaryColor: '#4f46e5',
        secondaryColor: '#6b7280',
        successColor: '#10b981',
        dangerColor: '#ef4444',
        warningColor: '#f59e0b',
        infoColor: '#3b82f6'
    }
};

// Objeto global da aplicação
const App = {
    // Inicializa a aplicação
    init() {
        this.setupGlobalHandlers();
        this.setupServiceWorker();
        this.setupTheme();
        this.setupAnalytics();
        this.setupErrorHandling();
        
        // Inicializa os componentes conforme a página atual
        this.initPage();
    },
    
    // Configura manipuladores globais
    setupGlobalHandlers() {
        // Previne envio de formulários com validação HTML5
        document.addEventListener('submit', (e) => {
            if (e.target.checkValidity && !e.target.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();
            }
            e.target.classList.add('was-validated');
        }, true);
        
        // Adiciona classe para estilização de campos inválidos
        document.addEventListener('invalid', (e) => {
            e.target.classList.add('is-invalid');
        }, true);
    },
    
    // Configura o Service Worker para PWA
    setupServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('ServiceWorker registrado com sucesso:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Falha ao registrar o ServiceWorker:', error);
                    });
            });
        }
    },
    
    // Configura o tema da aplicação
    setupTheme() {
        // Tenta carregar o tema salvo
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Configura o botão de alternar tema
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                
                // Atualiza o ícone do botão
                const icon = themeToggle.querySelector('i');
                if (icon) {
                    icon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
                }
            });
            
            // Configura o ícone inicial
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
    },
    
    // Configura o Google Analytics (opcional)
    setupAnalytics() {
        // Substitua 'UA-XXXXX-Y' pelo seu ID de acompanhamento
        window.dataLayer = window.dataLayer || [];
        function gtag() { dataLayer.push(arguments); }
        gtag('js', new Date());
        gtag('config', 'UA-XXXXX-Y');
        
        // Adiciona o script do Google Analytics
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=UA-XXXXX-Y';
        document.head.appendChild(script);
    },
    
    // Configura o tratamento global de erros
    setupErrorHandling() {
        // Tratamento de erros não capturados
        window.addEventListener('error', (event) => {
            console.error('Erro não capturado:', event.error || event.message);
            notificationService.error('Ocorreu um erro inesperado. Por favor, recarregue a página.');
        });
        
        // Tratamento de rejeições de promessas não tratadas
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Promessa rejeitada não tratada:', event.reason);
            notificationService.error('Ocorreu um erro ao processar sua solicitação.');
        });
    },
    
    // Inicializa componentes específicos da página atual
    initPage() {
        const body = document.body;
        
        // Página de login
        if (body.classList.contains('login-page')) {
            setupLoginForm('login-form');
            this.initPasswordToggle();
        }
        
        // Páginas que requerem autenticação
        if (!body.classList.contains('public-page')) {
            // Protege rotas que requerem autenticação
            const allowedRoles = []; // Adicione as roles permitidas se necessário
            protectRoute(allowedRoles);
            
            // Configura o botão de logout
            setupLogoutButton('logout-button');
            
            // Configura o menu responsivo
            this.initResponsiveMenu();
        }
        
        // Página de cadastro
        if (body.classList.contains('register-page')) {
            this.initRegistrationForm();
            this.initPasswordToggle();
        }
        
        // Páginas de administração
        if (body.classList.contains('admin-page')) {
            this.initAdminComponents();
        }
        
        // Inicializa tooltips e popovers do Bootstrap
        this.initBootstrapComponents();
    },
    
    // Inicializa o formulário de cadastro
    initRegistrationForm() {
        const form = initForm('#registration-form', {
            fields: {
                name: {
                    required: true,
                    message: 'Por favor, informe seu nome completo.'
                },
                email: {
                    required: true,
                    validate: validators.email
                },
                password: {
                    required: true,
                    validate: validators.password
                },
                confirmPassword: {
                    required: true,
                    validate: validators.match('password', 'As senhas não conferem')
                },
                terms: {
                    required: true,
                    message: 'Você deve aceitar os termos de uso.'
                }
            },
            onSubmit: async (formData) => {
                // Remove o campo de confirmação de senha antes de enviar
                const { confirmPassword, terms, ...userData } = formData;
                
                // Envia os dados para a API
                const response = await api.auth.register(userData);
                
                if (response.success) {
                    // Redireciona para a página de login com mensagem de sucesso
                    notificationService.success('Cadastro realizado com sucesso! Faça login para continuar.');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                }
                
                return response;
            }
        });
    },
    
    // Inicializa componentes de administração
    initAdminComponents() {
        // Inicializa a tabela de usuários
        this.initUsersTable();
        
        // Inicializa a tabela de equipes
        this.initTeamsTable();
        
        // Inicializa os filtros
        this.initFilters();
    },
    
    // Inicializa a tabela de usuários
    initUsersTable() {
        // Implemente a lógica da tabela de usuários aqui
        console.log('Inicializando tabela de usuários...');
    },
    
    // Inicializa a tabela de equipes
    initTeamsTable() {
        // Implemente a lógica da tabela de equipes aqui
        console.log('Inicializando tabela de equipes...');
    },
    
    // Inicializa os filtros
    initFilters() {
        // Implemente a lógica dos filtros aqui
        console.log('Inicializando filtros...');
    },
    
    // Inicializa o menu responsivo
    initResponsiveMenu() {
        const menuToggle = document.querySelector('[data-toggle="sidebar"]');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuToggle && sidebar) {
            menuToggle.addEventListener('click', () => {
                sidebar.classList.toggle('show');
                document.body.classList.toggle('sidebar-open');
            });
        }
        
        // Fecha o menu ao clicar fora
        document.addEventListener('click', (e) => {
            if (sidebar && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
                sidebar.classList.remove('show');
                document.body.classList.remove('sidebar-open');
            }
        });
    },
    
    // Inicializa o toggle de senha
    initPasswordToggle() {
        document.querySelectorAll('.password-toggle').forEach(toggle => {
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const input = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.remove('fa-eye');
                    icon.classList.add('fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.remove('fa-eye-slash');
                    icon.classList.add('fa-eye');
                }
            });
        });
    },
    
    // Inicializa componentes do Bootstrap
    initBootstrapComponents() {
        // Inicializa tooltips
        const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
        tooltipTriggerList.map(function (tooltipTriggerEl) {
            return new bootstrap.Tooltip(tooltipTriggerEl);
        });
        
        // Inicializa popovers
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    },
    
    // Utilitários globais
    utils: {
        formatDate,
        formatCurrency,
        formatCPF,
        formatPhone,
        debounce,
        throttle
    }
};

// Funções auxiliares
function formatDate(date, format = 'DD/MM/YYYY') {
    if (!date) return '';
    const d = new Date(date);
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year)
        .replace('HH', hours)
        .replace('mm', minutes)
        .replace('ss', seconds);
}

function formatCurrency(value) {
    if (value === undefined || value === null) return 'R$ 0,00';
    
    const number = typeof value === 'string' 
        ? parseFloat(value.replace(/[^0-9,-]+/g, '').replace(',', '.')) 
        : Number(value);
    
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(isNaN(number) ? 0 : number);
}

function formatCPF(cpf) {
    if (!cpf) return '';
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatPhone(phone) {
    if (!phone) return '';
    
    // Remove tudo que não for dígito
    const numbers = phone.replace(/\D/g, '');
    
    // Formata como (99) 99999-9999
    if (numbers.length === 11) {
        return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    
    // Formata como (99) 9999-9999
    if (numbers.length === 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    
    // Retorna o valor original se não for um telefone válido
    return phone;
}

function debounce(func, wait = 300) {
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

function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Inicializa a aplicação quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => App.init());
} else {
    // DOM já está pronto
    App.init();
}

// Expõe a aplicação globalmente para acesso via console
window.App = App;
