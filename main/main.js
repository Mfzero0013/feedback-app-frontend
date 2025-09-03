// Importa os servi�os necess�rios
import { api } from './services/api.service.js';
import notificationService from './services/notification.service.js';
import { 
    getAuthData, 
    redirectToLogin, 
    getAndClearRedirectUrl, 
    isAuthenticated, 
    setAuthData, 
    clearAuthData 
} from './services/auth.service.js';
import { ERROR_MESSAGES } from './constants/index.js';

/**
 * Valida os campos de um formul�rio
 * @param {HTMLFormElement} form - Elemento do formul�rio
 * @param {Object} fields - Objeto com configura��es dos campos
 * @returns {{isValid: boolean, data: Object}} Resultado da valida��o e dados do formul�rio
 */
function validateForm(form, fields) {
    const formData = new FormData(form);
    const data = {};
    let isValid = true;

    // Valida cada campo do formul�rio
    for (const [fieldName, config] of Object.entries(fields)) {
        const input = form.querySelector(`[name="${fieldName}"]`);
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (errorElement) {
            errorElement.textContent = '';
        }

        const value = formData.get(fieldName)?.toString().trim() || '';
        data[fieldName] = value;

        // Valida��o de campo obrigat�rio
        if (config.required && !value) {
            if (errorElement) {
                errorElement.textContent = config.message || 'Este campo � obrigat�rio.';
            }
            isValid = false;
            continue;
        }

        // Valida��o de formato de e-mail
        if (fieldName.toLowerCase() === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                if (errorElement) {
                    errorElement.textContent = 'Por favor, insira um e-mail v�lido.';
                }
                isValid = false;
            }
        }

        // Valida��o de senha
        if (fieldName.toLowerCase() === 'senha' && value) {
            if (value.length < 6) {
                if (errorElement) {
                    errorElement.textContent = 'A senha deve ter pelo menos 6 caracteres.';
                }
                isValid = false;
            }
        }
    }

    return { isValid, data };
}

/**
 * Escapa caracteres especiais para prevenir XSS
 * @param {string} unsafe - String n�o segura
 * @returns {string} String segura para HTML
 */
function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return '';
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Inicializa os servi�os
notificationService.show('Bem-vindo ao Feedback App!', 'info', 3000);

/**
 * Inicializa a aplicao quando o DOM estiver pronto
 */
async function initializeApp() {
    try {
        const authData = getAuthData();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        // Se no estiver autenticado e no estiver na pgina de login ou cadastro, redireciona para o login
        if (!authData && !['index.html', 'cadastro.html', 'recuperar.html'].includes(currentPage)) {
            redirectToLogin(currentPage);
            return;
        }

        // Se estiver autenticado e tentando acessar pginas de autenticao, redireciona para o dashboard
        if (authData && ['index.html', 'cadastro.html', 'recuperar.html'].includes(currentPage)) {
            window.location.href = 'dashboard.html';
            return;
        }

        // Configuraes especficas por pgina
        switch (currentPage) {
            case 'index.html':
                setupLoginForm();
                if (authData) {
                    try {
                        const userProfile = await api.auth.getProfile();
                        updateUserUI(userProfile);
                    } catch (error) {
                        console.error('Erro ao carregar perfil:', error);
                        notificationService.error(ERROR_MESSAGES.UNAUTHORIZED);
                        redirectToLogin(currentPage);
                    }
                }
                break;
            
            case 'profile.html':
                setupProfilePage();
                break;
                
            case 'reports.html':
                setupReportsPage();
                break;
                
            case 'feedback.html':
                setupFeedbackPage();
                break;
                
            case 'dashboard.html':
                loadDashboardData();
                break;
                
            case 'cadastro.html':
                setupRegistrationForm();
                break;
        }
        
    } catch (error) {
        console.error('Erro na inicializao da aplicao:', error);
        notificationService.error(ERROR_MESSAGES.SERVER_ERROR);
    }
}

// Inicializa a aplicao quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);

// Remove any duplicate event listeners
const existingScript = document.querySelector('script[src*="main.js"]');
if (existingScript && existingScript.onload) {
    existingScript.onload = null;
}

/**
 * Configura o formul�rio de login
 */
function setupLoginForm() {
    // Constantes para mensagens
    const MESSAGES = {
        EMAIL_REQUIRED: 'Por favor, insira seu e-mail',
        EMAIL_INVALID: 'E-mail inv�lido. Exemplo: nome@exemplo.com',
        PASSWORD_REQUIRED: 'Por favor, insira sua senha',
        PASSWORD_TOO_SHORT: 'A senha deve ter no m�nimo 8 caracteres',
        LOGIN_SUCCESS: 'Login realizado com sucesso!',
        LOGIN_ERROR: 'E-mail ou senha incorretos',
        SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
        NETWORK_ERROR: 'Erro de conex�o. Verifique sua internet.'
    };
    
    // Constantes para classes CSS
    const CLASSES = {
        ERROR: 'error',
        SUCCESS: 'success',
        LOADING: 'loading',
        HIDDEN: 'hidden'
    };
    // Elementos do DOM
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    const loginButton = loginForm.querySelector('button[type="submit"]');
    const originalButtonText = loginButton ? loginButton.innerHTML : '';
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('toggle-password');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const formFeedback = document.getElementById('form-feedback');

    // Fun��o para verificar for�a da senha
    const getPasswordStrength = (password) => {
        if (!password) return { score: 0, label: 'Fraca', color: 'red-500' };
        
        let score = 0;
        const hasMinLength = password.length >= 8;
        const hasNumber = /\d/.test(password);
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasLower = /[a-z]/.test(password);
        
        if (hasMinLength) score++;
        if (hasNumber) score++;
        if (hasLetter) score++;
        if (hasSpecialChar) score++;
        if (hasUpper && hasLower) score++;
        
        if (score <= 2) return { score, label: 'Fraca', color: 'red-500' };
        if (score <= 3) return { score, label: 'M�dia', color: 'yellow-500' };
        if (score <= 4) return { score, label: 'Forte', color: 'green-500' };
        return { score, label: 'Muito Forte', color: 'green-700' };
    };
    
    // Fun��es de valida��o
    const validateEmail = (email) => {
        if (!email) return { isValid: false, message: MESSAGES.EMAIL_REQUIRED };
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return { isValid: false, message: MESSAGES.EMAIL_INVALID };
        }
        return { isValid: true };
    };

    const validatePassword = (password) => {
        if (!password) return { isValid: false, message: MESSAGES.PASSWORD_REQUIRED };
        if (password.length < 8) return { isValid: false, message: MESSAGES.PASSWORD_TOO_SHORT };
        return { isValid: true };
    };

    // Fun��es de feedback
    const showError = (element, message) => {
        if (!element) return;
        element.textContent = message;
        element.classList.remove(CLASSES.HIDDEN);
        element.setAttribute('role', 'alert');
        element.setAttribute('aria-live', 'assertive');
    };

    const clearError = (element) => {
        if (!element) return;
        element.textContent = '';
        element.classList.add(CLASSES.HIDDEN);
        element.removeAttribute('role');
        element.removeAttribute('aria-live');
    };

    const setLoading = (isLoading) => {
        if (!loginButton) return;
        
        if (isLoading) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            loginButton.setAttribute('aria-busy', 'true');
        } else {
            loginButton.disabled = false;
            loginButton.innerHTML = originalButtonText;
            loginButton.setAttribute('aria-busy', 'false');
        }
    };

    // Valida��o em tempo real
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            const { isValid, message } = validateEmail(emailInput.value);
            if (!isValid && emailInput.value) {
                showError(emailError, message);
            } else {
                clearError(emailError);
            }
        });
    }

    if (passwordInput) {
        const passwordStrength = document.getElementById('password-strength');
        const strengthMeter = document.getElementById('strength-meter');
        const strengthLabel = document.getElementById('strength-label');
        
        passwordInput.addEventListener('input', () => {
            const password = passwordInput.value;
            const { isValid, message } = validatePassword(password);
            
            // Atualizar mensagem de erro
            if (!isValid && password) {
                showError(passwordError, message);
            } else {
                clearError(passwordError);
            }
            
            // Atualizar indicador de for�a
            if (password) {
                const { score, label, color } = getPasswordStrength(password);
                const width = (score / 4) * 100;
                
                passwordStrength.classList.remove('hidden');
                strengthMeter.style.width = `${width}%`;
                strengthMeter.className = `h-1.5 rounded-full transition-all duration-300 bg-${color}`;
                strengthLabel.textContent = label;
                strengthLabel.className = `text-xs font-medium text-${color}`;
            } else {
                passwordStrength.classList.add('hidden');
            }
        });
    }

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.setAttribute('aria-label', 'Mostrar senha');
        togglePassword.addEventListener('click', () => {
            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';
            togglePassword.classList.toggle('fa-eye');
            togglePassword.classList.toggle('fa-eye-slash');
            togglePassword.setAttribute('aria-label', isPassword ? 'Ocultar senha' : 'Mostrar senha');
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpar erros anteriores
        clearError(emailError);
        clearError(passwordError);
        
        // Obter valores dos campos
        const email = emailInput ? emailInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        
        // Validar campos
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);
        
        let isValid = emailValidation.isValid && passwordValidation.isValid;
        
        // Mostrar erros de valida��o
        if (!emailValidation.isValid) {
            showError(emailError, emailValidation.message);
            emailInput?.focus();
        }
        
        if (!passwordValidation.isValid) {
            showError(passwordError, passwordValidation.message);
            if (isValid) passwordInput?.focus();
        }
        
        if (!isValid) {
            // Animar o formul�rio para indicar erro
            loginForm.classList.add('shake');
            setTimeout(() => loginForm.classList.remove('shake'), 500);
            return;
        }
        
        // Iniciar estado de carregamento
        setLoading(true);
        
        // Disable button and show loading state
        if (loginButton) {
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
        }
        
        try {
            const response = await api.auth.login(email, password);
            
            if (!response?.user || !response?.token) {
                throw new Error('Resposta de login inv�lida');
            }
            
            setAuthData(response.user, response.token);
            notificationService.success(MESSAGES.LOGIN_SUCCESS);
            
            // Redirecionar ap�s pequeno atraso
            const redirectUrl = getAndClearRedirectUrl() || 'dashboard.html';
            setTimeout(() => window.location.href = redirectUrl, 800);
            
        } catch (error) {
            console.error('Erro no login:', error);
            
            let errorMessage = MESSAGES.LOGIN_ERROR;
            
            if (error.response) {
                if (error.response.status === 401) {
                    errorMessage = MESSAGES.LOGIN_ERROR;
                } else if (error.response.status >= 500) {
                    errorMessage = MESSAGES.SERVER_ERROR;
                } else if (error.response.data?.message) {
                    errorMessage = error.response.data.message;
                }
            } else if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
                errorMessage = MESSAGES.NETWORK_ERROR;
            }
            
            notificationService.error(errorMessage);
            
        } finally {
            setLoading(false);
        }
    });
}

/**
 * Atualiza a interface do usurio com os dados do perfil
 * @param {Object} userData - Dados do usurio
 */
function updateUserUI(userData) {
    if (!userData) return;

    const firstName = userData.nome ? userData.nome.split(' ')[0] : 'Usurio';
    const userAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome || 'User')}&background=random&color=fff`;

    const elementsToUpdate = {
        'user-name-display': userData.nome || 'Usurio',
        'user-firstname-display': firstName,
        'user-role-display': userData.cargo || 'Perfil no definido'
    };

    for (const id in elementsToUpdate) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = elementsToUpdate[id];
        }
    }

    const avatarElement = document.getElementById('user-avatar-display');
    if (avatarElement) {
        avatarElement.src = userAvatarUrl;
    }
}

/**
 * Configura o boto de logout
 */
function setupLogoutButton() {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await api.auth.logout();
                clearAuthData();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Erro ao fazer logout:', error);
                notificationService.error('Erro ao fazer logout. Tente novamente.');
            }
        });
    }
}

/**
 * Configura a navegao da aplicao
 * @param {string} currentPage - Pgina atual
 */
function setupNavigation(currentPage) {
    const links = document.querySelectorAll("nav a");
    links.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("bg-indigo-900");
        }
    });
}

/**
 * Configura o formulrio de cadastro
 */
function setupRegistrationForm() {
    const registrationForm = document.getElementById('registration-form');
    if (!registrationForm) return;

    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fields = {
            nome: { required: true, message: 'O nome  obrigatrio.' },
            email: { required: true, message: 'O e-mail  obrigatrio.' },
            senha: { required: true, message: 'A senha  obrigatria.' },
            departamento: { required: true, message: 'O departamento  obrigatrio.' },
            accountType: { required: true, message: 'O tipo de conta  obrigatrio.' },
        };

        const { isValid, data } = validateForm(registrationForm, fields);
        if (!isValid) {
            notificationService.warning('Por favor, preencha todos os campos obrigatrios.');
            return;
        }

        // Mapeamento de tipo de conta para o valor esperado pelo backend
        const accountTypeMapping = {
            'colaborador': 'user',
            'gestor': 'admin',
            'rh': 'admin',
            'diretoria': 'admin'
        };

        const backendAccountType = accountTypeMapping[data.accountType];
        if (!backendAccountType) {
            notificationService.error('Tipo de conta selecionado no  reconhecido.');
            return;
        }

        data.accountType = backendAccountType;

        try {
            await api.auth.register(data);
            notificationService.success('Cadastro realizado com sucesso! Redirecionando...');
            setTimeout(() => { window.location.href = 'index.html'; }, 2000);
        } catch (error) {
            console.error('Erro no cadastro:', error);
            notificationService.error(error.message || 'N�o foi poss�vel realizar o cadastro.');
        }

// Fun��o para exibir notifica��es
function showNotification(message, type = 'info') {
    // Remover notificaes existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Criar nova notificao
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    let bgColor, textColor, icon;
    
    switch(type) {
      case 'success':
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        icon = '';
        break;
      case 'error':
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        icon = '';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        textColor = 'text-white';
        icon = '';
        break;
      default:
        bgColor = 'bg-blue-500';
        textColor = 'text-white';
        icon = '';
    }
    
    notification.innerHTML = `
      <div class="flex items-center space-x-3">
        <span class="text-lg">${icon}</span>
        <p class="${textColor}">${message}</p>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    notification.classList.add(bgColor);
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Auto-remover aps 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.classList.add('translate-x-full');
        setTimeout(() => {
          if (notification.parentElement) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  // --- Funes de Loader ---

function showLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.remove('hidden');
    }
}

function hideLoader() {
    const loader = document.getElementById('loader');
    if (loader) {
        loader.classList.add('hidden');
    }
}

/**
 * Exibe um modal de confirmao genrico.
 * @param {string} title - O ttulo do modal.
 * @param {string} message - A mensagem de confirmao.
 * @param {function} onConfirm - A funo a ser executada se o usurio confirmar.
 */
function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) {
        console.error('Modal de confirmao no encontrado no DOM.');
        return;
    }

    const modalTitle = document.getElementById('confirmation-modal-title');
    const modalMessage = document.getElementById('confirmation-modal-message');
    const confirmButton = document.getElementById('confirmation-modal-confirm-button');
    const cancelButton = document.getElementById('confirmation-modal-cancel-button');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Remove event listeners antigos para evitar mltiplas execues
    const newConfirmButton = confirmButton.cloneNode(true);
    confirmButton.parentNode.replaceChild(newConfirmButton, confirmButton);

    const newCancelButton = cancelButton.cloneNode(true);
    cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);

    // Adiciona os novos event listeners
    newConfirmButton.addEventListener('click', () => {
        onConfirm();
        hideConfirmationModal();
    });

    newCancelButton.addEventListener('click', hideConfirmationModal);

    modal.classList.remove('hidden');
}

/**
 * Oculta o modal de confirmao.
 */
function hideConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}


// --- Funes da Pgina de Administrao ---

// Vari�veis globais para armazenar dados da p�gina de admin
let adminUsers = [];

// Adiciona os event listeners para os elementos da pgina de admin
function setupAdminEventListeners() {
    // Botes e formulrios de Equipes
    document.getElementById('add-team-button')?.addEventListener('click', () => openTeamModal());
    document.getElementById('team-form')?.addEventListener('submit', saveTeam);
    document.getElementById('cancel-team-modal')?.addEventListener('click', () => closeTeamModal());

    // Bot�es e formul�rios de Usu�rios
    document.getElementById('add-user-button')?.addEventListener('click', () => openUserModal());
    document.getElementById('user-form')?.addEventListener('submit', saveUser);
    document.getElementById('cancel-user-modal')?.addEventListener('click', () => closeUserModal());
    
    // Adicionar manipuladores de eventos para busca e filtros
    const searchInput = document.getElementById('users-search');
    const statusFilter = document.getElementById('users-status-filter');
    const teamFilter = document.getElementById('users-team-filter');
    
    // Debounce para evitar m�ltiplas requisi��es durante a digita��o
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1; // Resetar para a primeira p�gina ao buscar
                renderUsersTable();
            }, 300);
        });
    }
    
    // Atualizar tabela quando os filtros forem alterados
    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            currentPage = 1; // Resetar para a primeira p�gina ao filtrar
            renderUsersTable();
        });
    }
    
    if (teamFilter) {
        teamFilter.addEventListener('change', () => {
            currentPage = 1; // Resetar para a primeira p�gina ao filtrar
            renderUsersTable();
        });
    }
}

// Fun��es auxiliares

/**
 * Escapa caracteres HTML para prevenir XSS
 * @param {string} unsafe - String n�o segura
 * @returns {string} String segura para HTML
 */
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Fun��es de renderiza��o

// Vari�veis para controle de pagina��o e ordena��o
let currentPage = 1;
const itemsPerPage = 10;
let sortConfig = { key: 'nome', direction: 'asc' };

/**
 * Renderiza a tabela de usu�rios com pagina��o e ordena��o
 * @param {Array} users - Lista de usu�rios a serem exibidos (opcional, busca do servidor se n�o fornecido)
 */
async function renderUsersTable(users = null) {
    const tableBody = document.getElementById('users-table-body');
    const paginationContainer = document.getElementById('users-pagination');
    const searchInput = document.getElementById('users-search');
    const statusFilter = document.getElementById('users-status-filter');
    const teamFilter = document.getElementById('users-team-filter');
    
    if (!tableBody) return;

    // Fun��o para mostrar estado de carregamento
    const showLoadingState = () => {
        // Adicionar classe de transi��o suave
        tableBody.style.transition = 'opacity 200ms ease-in-out';
        tableBody.style.opacity = '0.7';
        
        // Criar elemento de carregamento
        const loadingHtml = `
            <tr class="table-loader">
                <td colspan="5" class="text-center py-12">
                    <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                        <p class="text-gray-600 font-medium">Carregando usu�rios...</p>
                        <p class="text-sm text-gray-400">Isso pode levar alguns instantes</p>
                    </div>
                </td>
            </tr>`;
        
        // Manter o conte�do existente, mas adicionar o loader por cima
        const existingContent = tableBody.innerHTML;
        tableBody.innerHTML = loadingHtml + existingContent;
        
        // Mostrar loader global se existir
        const globalLoader = document.getElementById('loader');
        if (globalLoader) {
            globalLoader.classList.remove('hidden');
            globalLoader.classList.add('flex');
        }
    };
    
    // Mostrar estado de carregamento inicial
    showLoadingState();
    
    // Adicionar classe de transi��o para a tabela
    if (tableBody) {
        tableBody.style.transition = 'opacity 200ms ease-in-out';
    }
    
    try {
        // Buscar usu�rios se n�o foram fornecidos
        if (!users) {
            const response = await api.get('/admin/users');
            adminUsers = response?.data || [];
        } else {
            adminUsers = users;
        }
        
        // Aplicar filtros
        let filteredUsers = [...adminUsers];
        
        // Filtro de busca
        const searchTerm = searchInput?.value?.toLowerCase() || '';
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(user => 
                user.nome.toLowerCase().includes(searchTerm) || 
                user.email.toLowerCase().includes(searchTerm) ||
                (user.jobTitle && user.jobTitle.toLowerCase().includes(searchTerm))
            );
        }
        
        // Filtro por status
        const statusFilterValue = statusFilter?.value;
        if (statusFilterValue && statusFilterValue !== 'TODOS') {
            filteredUsers = filteredUsers.filter(user => user.status === statusFilterValue);
        }
        
        // Filtro por equipe
        const teamFilterValue = teamFilter?.value;
        if (teamFilterValue && teamFilterValue !== 'TODAS') {
            filteredUsers = filteredUsers.filter(user => user.equipeId === teamFilterValue);
        }
        
        // Ordena��o
        filteredUsers.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            // Tratamento para ordena��o de valores aninhados
            if (sortConfig.key === 'equipe') {
                aValue = a.equipe?.nome || '';
                bValue = b.equipe?.nome || '';
            }
            
            // Converter para string para garantir compara��o
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Pagina��o
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        currentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
        
        // Renderizar tabela
        tableBody.innerHTML = '';
        
        if (paginatedUsers.length === 0) {
            const noResultsMessage = filteredUsers.length === 0 && adminUsers.length > 0 
                ? 'Nenhum usu�rio encontrado com os filtros atuais.' 
                : 'Nenhum usu�rio cadastrado.';
                
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users-slash text-4xl text-gray-300 mb-2"></i>
                            <p>${noResultsMessage}</p>
                            ${filteredUsers.length === 0 && adminUsers.length > 0 ? 
                                '<button onclick="resetFilters()" class="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">
                                    Limpar filtros
                                </button>' : ''
                            }
                        </div>
                    </td>
                </tr>`;
        } else {
            paginatedUsers.forEach((user, index) => {
                const row = document.createElement('tr');
                row.className = index % 2 === 0 ? 'bg-white' : 'bg-gray-50';
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                ${user.nome.charAt(0).toUpperCase()}
                            </div>
                            <div class="ml-4">
                                <div class="text-sm font-medium text-gray-900">${escapeHtml(user.nome)}</div>
                                <div class="text-sm text-gray-500">${escapeHtml(user.email)}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.jobTitle ? escapeHtml(user.jobTitle) : '<span class="text-gray-400">N/A</span>'}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${user.equipe?.nome ? 
                            `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                ${escapeHtml(user.equipe.nome)}
                            </span>` : 
                            '<span class="text-gray-400">Sem equipe</span>'
                        }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${user.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                            ${user.status === 'ATIVO' ? 'Ativo' : 'Inativo'}
                        </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onclick="openUserModal('${user.id}')" 
                                class="text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded"
                                title="Editar usu�rio">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUser('${user.id}', this)" 
                                class="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded"
                                title="Remover usu�rio">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        
        // Atualizar controles de pagina��o
        updatePaginationControls(filteredUsers.length);
        
        // Atualizar contador de resultados
        updateResultsCounter(filteredUsers.length, adminUsers.length);
        
    } catch (error) {
        console.error('Erro ao carregar usu�rios:', error);
        let errorMessage = 'Falha ao carregar usu�rios.';
        let showRetry = true;
        let redirectToLogin = false;
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Sess�o expirada. Redirecionando para login...';
                showRetry = false;
                redirectToLogin = true;
            } else if (error.response.status === 403) {
                errorMessage = 'Voc� n�o tem permiss�o para visualizar usu�rios.';
            } else if (error.response.status === 404) {
                errorMessage = 'Recurso n�o encontrado. Por favor, recarregue a p�gina.';
            } else if (error.response.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response.status >= 500) {
                errorMessage = 'Erro no servidor. Por favor, tente novamente mais tarde.';
            }
        } else if (error.request) {
            errorMessage = 'N�o foi poss�vel conectar ao servidor. Verifique sua conex�o com a internet.';
        }
        
        // Usar a fun��o de notifica��o global se dispon�vel
        if (window.showNotification) {
            showNotification(errorMessage, 'error');
        }
        
        // Exibir mensagem de erro na tabela
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-12">
                    <div class="max-w-md mx-auto">
                        <div class="text-red-500">
                            <div class="flex justify-center mb-3">
                                <i class="fas fa-exclamation-triangle text-4xl"></i>
                            </div>
                            <p class="text-lg font-medium mb-2">Ocorreu um erro</p>
                            <p class="text-gray-600 mb-4">${errorMessage}</p>
                            ${showRetry ? `
                            <button onclick="renderUsersTable()" 
                                    class="mt-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 
                                           text-sm font-medium transition-colors focus:outline-none focus:ring-2 
                                           focus:ring-offset-2 focus:ring-indigo-500">
                                <i class="fas fa-sync-alt mr-2"></i>Tentar novamente
                            </button>` : ''}
                        </div>
                    </div>
                </td>
            </tr>`;
            
        // Redirecionar para login se necess�rio
        if (redirectToLogin) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    } finally {
        hideLoader();
    }
}

/**
 * Atualiza os controles de pagina��o
 * @param {number} totalItems - N�mero total de itens
 */
function updatePaginationControls(totalItems) {
    const paginationContainer = document.getElementById('users-pagination');
    if (!paginationContainer) return;
    
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    currentPage = Math.min(Math.max(1, currentPage), totalPages);
    
    // Bot�es de navega��o
    const prevDisabled = currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50';
    const nextDisabled = currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50';
    
    // Gerar bot�es de p�gina
    let pageButtons = '';
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // Bot�o primeira p�gina
    if (startPage > 1) {
        pageButtons += `
            <button onclick="changePage(1)" class="px-3 py-1 border rounded-l-md bg-white text-gray-700 hover:bg-gray-50">
                1
            </button>
            ${startPage > 2 ? '<span class="px-2 py-1">...</span>' : ''}
        `;
    }
    
    // Bot�es de p�gina
    for (let i = startPage; i <= endPage; i++) {
        const isActive = i === currentPage ? 'bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white text-gray-700 hover:bg-gray-50';
        pageButtons += `
            <button onclick="changePage(${i})" 
                    class="px-3 py-1 border-t border-b ${isActive}">
                ${i}
            </button>
        `;
    }
    
    // Bot�o �ltima p�gina
    if (endPage < totalPages) {
        pageButtons += `
            ${endPage < totalPages - 1 ? '<span class="px-2 py-1">...</span>' : ''}
            <button onclick="changePage(${totalPages})" 
                    class="px-3 py-1 border rounded-r-md bg-white text-gray-700 hover:bg-gray-50">
                ${totalPages}
            </button>
        `;
    }
    
    // Atualizar HTML
    paginationContainer.innerHTML = `
        <div class="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
            <div class="flex-1 flex justify-between sm:hidden">
                <button onclick="changePage(${currentPage - 1})" 
                        ${currentPage <= 1 ? 'disabled' : ''}
                        class="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${prevDisabled} bg-white text-gray-700">
                    Anterior
                </button>
                <button onclick="changePage(${currentPage + 1})" 
                        ${currentPage >= totalPages ? 'disabled' : ''}
                        class="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${nextDisabled} bg-white text-gray-700">
                    Pr�xima
                </button>
            </div>
            <div class="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                    <p class="text-sm text-gray-700">
                        Mostrando <span class="font-medium">${Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}</span> 
                        a <span class="font-medium">${Math.min(currentPage * itemsPerPage, totalItems)}</span> 
                        de <span class="font-medium">${totalItems}</span> resultados
                    </p>
                </div>
                <div>
                    <nav class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <button onclick="changePage(${currentPage - 1})" 
                                ${currentPage <= 1 ? 'disabled' : ''}
                                class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${prevDisabled}">
                            <span class="sr-only">Anterior</span>
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        
                        ${pageButtons}
                        
                        <button onclick="changePage(${currentPage + 1})" 
                                ${currentPage >= totalPages ? 'disabled' : ''}
                                class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${nextDisabled}">
                            <span class="sr-only">Pr�xima</span>
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </nav>
                </div>
            </div>
        </div>
    `;
}

/**
 * Atualiza o contador de resultados
 * @param {number} filteredCount - N�mero de itens filtrados
 * @param {number} totalCount - N�mero total de itens
 */
function updateResultsCounter(filteredCount, totalCount) {
    const counterElement = document.getElementById('users-results-count');
    if (!counterElement) return;
    
    if (filteredCount === totalCount) {
        counterElement.textContent = `${totalCount} usu�rio${totalCount !== 1 ? 's' : ''} no total`;
    } else {
        counterElement.textContent = `Mostrando ${filteredCount} de ${totalCount} usu�rio${totalCount !== 1 ? 's' : ''}`;
    }
}

/**
 * Muda para uma p�gina espec�fica
 * @param {number} page - N�mero da p�gina
 */
function changePage(page) {
    const tableContainer = document.querySelector('[data-table-container]');
    if (tableContainer) {
        tableContainer.scrollIntoView({ behavior: 'smooth' });
    }
    
    currentPage = page;
    renderUsersTable();
}

/**
 * Aplica os filtros e renderiza a tabela
 */
function applyFilters() {
    currentPage = 1; // Resetar para a primeira p�gina
    renderUsersTable();
}

/**
 * Limpa todos os filtros
 */
function resetFilters() {
    const searchInput = document.getElementById('users-search');
    const statusFilter = document.getElementById('users-status-filter');
    const teamFilter = document.getElementById('users-team-filter');
    
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = 'TODOS';
    if (teamFilter) teamFilter.value = 'TODAS';
    
    currentPage = 1;
    renderUsersTable();
}

/**
 * Ordena a tabela por uma coluna
 * @param {string} key - Chave para ordena��o
 */
function sortTable(key) {
    if (sortConfig.key === key) {
        sortConfig.direction = sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
        sortConfig = { key, direction: 'asc' };
    }
    
    // Atualizar indicadores de ordena��o
    document.querySelectorAll('[data-sortable]').forEach(header => {
        header.classList.remove('text-indigo-600');
        const icon = header.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-sort ml-1 text-gray-400';
        }
    });
    
    const activeHeader = document.querySelector(`[data-sortable="${key}"]`);
    if (activeHeader) {
        activeHeader.classList.add('text-indigo-600');
        const icon = activeHeader.querySelector('i');
        if (icon) {
            icon.className = `fas fa-sort-${sortConfig.direction === 'asc' ? 'up' : 'down'} ml-1`;
        }
    }
    
    // Reordenar e renderizar
    renderUsersTable(adminUsers);
}

/**
 * Renderiza a tabela de equipes
 */
/**
 * Renderiza a tabela de equipes
 */
async function renderTeamsTable() {
    const tableBody = document.getElementById('teams-table-body');
    if (!tableBody) return;

    showLoader();
    try {
        // Usar o servi�o de equipes para buscar os dados
        const response = await api.teams.getAllTeams();
        const teams = response?.data || [];
        
        tableBody.innerHTML = '';
        
        if (teams.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center py-4">
                        Nenhuma equipe encontrada.
                    </td>
                </tr>`;
            return;
        }
        
        // Ordenar equipes por nome
        const sortedTeams = [...teams].sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Renderizar cada equipe na tabela
        sortedTeams.forEach(team => {
            const row = document.createElement('tr');
            row.className = 'hover:bg-gray-50';
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="text-sm font-medium text-gray-900">
                            ${escapeHtml(team.nome || 'Sem nome')}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-500">
                        ${team.gestor ? escapeHtml(team.gestor.nome) : 'Sem gestor'}
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${team.membros ? team.membros.length : 0} membros
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button 
                        onclick="openTeamModal('${escapeHtml(team.id)}')" 
                        class="text-indigo-600 hover:text-indigo-900 hover:underline"
                        title="Editar equipe"
                    >
                        Editar
                    </button>
                    <button 
                        onclick="deleteTeam('${escapeHtml(team.id)}')" 
                        class="text-red-600 hover:text-red-900 hover:underline"
                        title="Remover equipe"
                    >
                        Remover
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Atualizar selects que dependem das equipes
        populateTeamSelect();
        
    } catch (error) {
        console.error('Erro ao carregar equipes:', error);
        showNotification(
            error.message || 'Falha ao carregar a lista de equipes.', 
            'error'
        );
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="text-center py-4 text-red-500">
                    Erro ao carregar os dados. Tente novamente mais tarde.
                </td>
            </tr>`;
    } finally {
        hideLoader();
    }
}

// Fun��es de CRUD para Equipes

/**
 * Abre o modal de equipe para criar ou editar
 * @param {string|null} teamId - ID da equipe para edi��o ou null para criar nova
 */
async function openTeamModal(teamId = null) {
    const form = document.getElementById('team-form');
    const modal = document.getElementById('team-modal');
    const modalTitle = document.getElementById('team-modal-title');
    const nameField = document.getElementById('team-name');
    const descriptionField = document.getElementById('team-description');
    const managerSelect = document.getElementById('team-manager');
    const errorElement = document.getElementById('name-error');
    
    if (!form || !modal || !modalTitle || !nameField || !descriptionField || !managerSelect || !errorElement) {
        console.error('Elementos do formul�rio n�o encontrados');
        showNotification(ERROR_MESSAGES.SERVER_ERROR, 'error');
        return;
    }
    
    // Resetar formul�rio e mensagens de erro
    form.reset();
    document.getElementById('teamId').value = '';
    errorElement.textContent = '';
    
    showLoader();
    try {
        // Carregar lista de gestores dispon�veis
        const usersResponse = await api.users.getUsers();
        if (!usersResponse || !Array.isArray(usersResponse.data)) {
            throw new Error(ERROR_MESSAGES.USERS_LOAD_ERROR);
        }
        
        const managers = usersResponse.data.filter(user => 
            user && (user.role === 'admin' || user.role === 'manager')
        );
        
        // Preencher select de gestores
        managerSelect.innerHTML = '<option value="">Selecione um gestor</option>';
        managers.forEach(user => {
            if (user && user.id && user.nome && user.email) {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${escapeHtml(user.nome)} (${escapeHtml(user.email)})`;
                managerSelect.appendChild(option);
            }
        });

        if (teamId) {
            // Modo edi��o - carregar dados da equipe
            modalTitle.textContent = 'Editar Equipe';
            const teamResponse = await api.teams.getTeamById(teamId);
            
            if (!teamResponse || !teamResponse.data) {
                throw new Error(ERROR_MESSAGES.TEAM_NOT_FOUND);
            }
            
            const team = teamResponse.data;
            if (team.id) document.getElementById('teamId').value = team.id;
            if (team.nome) nameField.value = escapeHtml(team.nome);
            if (team.descricao) descriptionField.value = escapeHtml(team.descricao);
            
            // Selecionar gestor atual se existir
            if (team.gestorId) {
                managerSelect.value = team.gestorId;
            }
        } else {
            // Modo cria��o
            modalTitle.textContent = 'Adicionar Nova Equipe';
        }
        
        // Exibir modal
        modal.classList.remove('hidden');
        nameField.focus();
        
    } catch (error) {
        console.error('Erro ao abrir formul�rio de equipe:', error);
        notificationService.error(
            error.message || ERROR_MESSAGES.SERVER_ERROR
        );
        closeTeamModal();
    } finally {
        hideLoader();
    }
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.add('hidden');
}

/**
 * Valida os dados da equipe antes do envio
 * @param {Object} data - Dados da equipe a serem validados
 * @returns {{isValid: boolean, errors: Object}} Resultado da valida��o
 */
function validateTeamData(data) {
    const errors = {};
    
    // Validar nome
    if (!data.nome || !data.nome.trim()) {
        errors.name = ERROR_MESSAGES.TEAM_NAME_REQUIRED;
    } else if (data.nome.length < 3) {
        errors.name = 'O nome da equipe deve ter pelo menos 3 caracteres';
    } else if (data.nome.length > 100) {
        errors.name = 'O nome da equipe n�o pode ter mais de 100 caracteres';
    }
    
    // Validar descri��o
    if (data.descricao) {
        if (data.descricao.length > 500) {
            errors.description = 'A descri��o n�o pode ter mais de 500 caracteres';
        } else if (data.descricao.trim().length === 0) {
            errors.description = 'A descri��o n�o pode conter apenas espa�os em branco';
        }
    }
    
    // Validar gestor (opcional, mas se fornecido, deve ser um ID v�lido)
    if (data.gestorId && !/^\d+$/.test(data.gestorId)) {
        errors.managerId = 'ID do gestor inv�lido';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Salva uma equipe (cria ou atualiza)
 * @param {Event} event - Evento de submit do formul�rio
 */
async function saveTeam(event) {
    event.preventDefault();
    
    // Obter refer�ncias dos elementos
    const form = event.target;
    const teamId = document.getElementById('teamId')?.value || '';
    const nameField = document.getElementById('team-name');
    const descriptionField = document.getElementById('team-description');
    const managerSelect = document.getElementById('team-manager');
    const nameError = document.getElementById('name-error');
    const descriptionError = document.getElementById('description-error');
    
    // Validar elementos do DOM
    if (!form || !nameField || !descriptionField || !managerSelect || !nameError) {
        console.error('Elementos do formul�rio n�o encontrados');
        notificationService.error(ERROR_MESSAGES.SERVER_ERROR);
        return;
    }
    
    // Verificar se o formul�rio est� em um modal
    const modal = form.closest('.modal');
    if (modal && modal.style.display === 'none') {
        console.error('Tentativa de envio de formul�rio em modal fechado');
        return;
    }
    
    // Limpar mensagens de erro
    nameError.textContent = '';
    if (descriptionError) descriptionError.textContent = '';
    
    // Preparar dados com valida��o
    const teamData = {
        nome: (nameField.value || '').trim(),
        descricao: (descriptionField.value || '').trim(),
        gestorId: managerSelect.value || null
    };
    
    // Validar dados
    const { isValid, errors } = validateTeamData(teamData);
    if (!isValid) {
        if (errors.name) {
            nameError.textContent = errors.name;
            nameField.focus();
        }
        if (errors.description && descriptionError) {
            descriptionError.textContent = errors.description;
            if (!errors.name) descriptionField.focus();
        }
        if (errors.managerId && managerSelect) {
            managerSelect.focus();
        }
        
        // Adicionar classe de erro aos campos inv�lidos
        if (errors.name) nameField.classList.add('border-red-500');
        if (errors.description) descriptionField?.classList.add('border-red-500');
        if (errors.managerId) managerSelect.classList.add('border-red-500');
        
        // Rolagem suave para o primeiro erro
        const firstErrorElement = nameError.textContent ? nameField : 
                               (descriptionError?.textContent ? descriptionField : 
                               (errors.managerId ? managerSelect : null));
        firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        return;
    }
    
    // Configurar manipuladores de eventos para limpar erros ao digitar
    const clearErrorOnInput = (element, errorElement) => {
        if (!element || !errorElement) return;
        
        const handler = () => {
            errorElement.textContent = '';
            element.classList.remove('border-red-500');
            element.removeEventListener('input', handler);
        };
        
        element.addEventListener('input', handler, { once: true });
    };
    
    // Configurar limpeza de erros para cada campo
    if (nameError.textContent) {
        clearErrorOnInput(nameField, nameError);
    }
    if (descriptionError?.textContent) {
        clearErrorOnInput(descriptionField, descriptionError);
    }
    
    // Adicionar timeout para evitar m�ltiplos envios
    const now = Date.now();
    const lastSubmitTime = form.dataset.lastSubmitTime || 0;
    const timeSinceLastSubmit = now - lastSubmitTime;
    
    // Se j� houve um envio nos �ltimos 2 segundos, ignorar
    if (timeSinceLastSubmit < 2000) {
        console.log('Tentativa de envio muito r�pida, ignorando...');
        return;
    }
    
    // Registrar o hor�rio do envio atual
    form.dataset.lastSubmitTime = now;
    
    // Configurar bot�o de envio
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.innerHTML || 'Salvar';
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
    }
    
    showLoader();
    
    try {
        let response;
        const isEditMode = !!teamId;
        
        if (isEditMode) {
            // Atualizar equipe existente
            response = await api.teams.updateTeam(teamId, teamData);
            
            if (!response?.success) {
                throw new Error(response?.message || ERROR_MESSAGES.TEAM_UPDATE_ERROR);
            }
            
            notificationService.success('Equipe atualizada com sucesso!');
        } else {
            // Criar nova equipe
            response = await api.teams.createTeam(teamData);
            
            if (!response?.success) {
                throw new Error(response?.message || ERROR_MESSAGES.TEAM_CREATE_ERROR);
            }
            
            notificationService.success('Equipe criada com sucesso!');
        }
        
        // Fechar modal e limpar formul�rio
        closeTeamModal();
        
        // Limpar campos do formul�rio
        if (form) {
            form.reset();
            // Remover classes de erro
            const errorElements = form.querySelectorAll('.border-red-500');
            errorElements.forEach(el => el.classList.remove('border-red-500'));
        }
        
        // Atualizar tabela de equipes
        try {
            await renderTeamsTable();
        } catch (error) {
            console.error('Erro ao atualizar a tabela de equipes:', error);
            notificationService.error('Equipe salva, mas houve um erro ao atualizar a lista.');
        }
        
        // Disparar evento personalizado para notificar sobre a atualiza��o
        const updatedTeamId = response?.data?.id || teamId;
        if (updatedTeamId) {
            document.dispatchEvent(new CustomEvent('teamUpdated', {
                detail: { 
                    teamId: updatedTeamId,
                    action: isEditMode ? 'updated' : 'created'
                }
            }));
        }
        
    } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        
        // Tratar erros espec�ficos
        if (error.response?.status === 409) {
            const errorMsg = 'J� existe uma equipe com este nome. Por favor, escolha outro nome.';
            notificationService.error(errorMsg);
            if (nameError) {
                nameError.textContent = errorMsg;
                nameError.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            if (nameField) {
                nameField.focus();
                nameField.select();
            }
        } else if (error.response?.status === 401) {
            notificationService.error(ERROR_MESSAGES.UNAUTHORIZED);
            // Redirecionar ap�s um curto atraso para permitir que o usu�rio veja a mensagem
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else if (error.response?.status === 403) {
            notificationService.error(ERROR_MESSAGES.FORBIDDEN);
            // Fechar o modal se o usu�rio n�o tiver permiss�o
            closeTeamModal();
        } else if (error.response?.status === 400) {
            // Erro de valida��o do servidor
            const serverErrors = error.response.data?.errors || {};
            
            // Mapear erros do servidor para os campos do formul�rio
            if (serverErrors.nome) {
                nameError.textContent = serverErrors.nome[0];
                nameField.classList.add('border-red-500');
            }
            if (serverErrors.descricao && descriptionError) {
                descriptionError.textContent = serverErrors.descricao[0];
                descriptionField.classList.add('border-red-500');
            }
            if (serverErrors.gestorId) {
                const managerError = document.getElementById('manager-error');
                if (managerError) {
                    managerError.textContent = serverErrors.gestorId[0];
                }
                managerSelect.classList.add('border-red-500');
            }
            
            // Rolar para o primeiro erro
            const firstError = Object.keys(serverErrors)[0];
            if (firstError) {
                const element = firstError === 'nome' ? nameField : 
                              (firstError === 'descricao' ? descriptionField : 
                              (firstError === 'gestorId' ? managerSelect : null));
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element?.focus();
            }
        } else {
            // Erro gen�rico
            const errorMessage = error.message || 
                (teamId ? ERROR_MESSAGES.TEAM_UPDATE_ERROR : ERROR_MESSAGES.TEAM_CREATE_ERROR);
            notificationService.error(errorMessage);
        }
    } finally {
        // Restaurar estado do bot�o e loader
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        hideLoader();
    }
}

/**
 * Remove uma equipe ap�s confirma��o do usu�rio
 * @param {string} teamId - ID da equipe a ser removida
 */
// Cache para controlar o tempo entre exclus�es
const lastDeleteTime = new WeakMap();

/**
 * Remove uma equipe ap�s confirma��o do usu�rio
 * @param {string} teamId - ID da equipe a ser removida
 * @param {HTMLElement} [triggerElement=null] - Elemento que acionou a exclus�o (opcional)
 */
async function deleteTeam(teamId, triggerElement = null) {
    // Verificar se h� uma exclus�o recente
    const now = Date.now();
    const lastTime = lastDeleteTime.get(deleteTeam) || 0;
    const timeSinceLastDelete = now - lastTime;
    
    if (timeSinceLastDelete < 2000) {
        console.log('Tentativa de exclus�o muito r�pida, ignorando...');
        return;
    }
    lastDeleteTime.set(deleteTeam, now);
    
    // Mostrar feedback visual no elemento que acionou a exclus�o, se fornecido
    const originalButtonContent = triggerElement?.innerHTML;
    if (triggerElement) {
        triggerElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        triggerElement.disabled = true;
    }
    
    try {
        // Buscar dados da equipe para mostrar no modal de confirma��o
        const response = await api.teams.getTeamById(teamId);
        if (!response?.success || !response.data) {
            throw new Error(response?.message || ERROR_MESSAGES.TEAM_NOT_FOUND);
        }
        
        const team = response.data;
        const memberCount = team.membros?.length || 0;
        
        // Mensagem de confirma��o personalizada
        let message = `Tem certeza que deseja remover a equipe <strong>${escapeHtml(team.nome)}</strong>?`;
        
        if (memberCount > 0) {
            message += `<br><br><span class="text-yellow-700">Aten��o: Esta equipe possui ${memberCount} membro(s). 
                      Todos os membros ser�o desvinculados da equipe.</span>`;
        }
        
        message += "<br><br>Esta a��o n�o pode ser desfeita.";
        
        showConfirmationModal(
            'Confirmar Exclus�o', 
            message, 
            async () => {
                const modal = document.getElementById('confirmation-modal');
                const confirmButton = modal?.querySelector('[data-confirm-button]');
                const originalButtonText = confirmButton?.innerHTML;
                
                try {
                    // Atualizar bot�o de confirma��o
                    if (confirmButton) {
                        confirmButton.disabled = true;
                        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
                    }
                    
                    // Executar exclus�o
                    const deleteResponse = await api.teams.deleteTeam(teamId);
                    
                    if (!deleteResponse?.success) {
                        throw new Error(deleteResponse?.message || ERROR_MESSAGES.TEAM_DELETE_ERROR);
                    }
                    
                    showNotification('Equipe removida com sucesso!', 'success');
                    
                    // Fechar modal e atualizar a tabela
                    hideConfirmationModal();
                    await renderTeamsTable();
                    
                    // Disparar evento personalizado para notificar sobre a exclus�o
                    document.dispatchEvent(new CustomEvent('teamDeleted', {
                        detail: { teamId }
                    }));
                    
                } catch (error) {
                    console.error('Erro ao remover equipe:', error);
                    
                    // Tratar erros espec�ficos
                    if (error.response?.status === 403) {
                        showNotification('Voc� n�o tem permiss�o para remover esta equipe.', 'error');
                    } else if (error.response?.status === 404) {
                        showNotification('A equipe n�o foi encontrada ou j� foi removida.', 'error');
                        await renderTeamsTable(); // Atualizar tabela se a equipe n�o existir mais
                    } else {
                        showNotification(
                            error.message || ERROR_MESSAGES.TEAM_DELETE_ERROR, 
                            'error'
                        );
                    }
                } finally {
                    // Restaurar bot�o de confirma��o
                    if (confirmButton) {
                        confirmButton.disabled = false;
                        confirmButton.innerHTML = originalButtonText;
                    }
                    
                    // Restaurar o bot�o que acionou a exclus�o, se fornecido
                    if (triggerElement) {
                        triggerElement.innerHTML = originalButtonContent;
                        triggerElement.disabled = false;
                    }
                }
            },
            'Excluir',
            'Cancelar',
            'bg-red-600 hover:bg-red-700',
            'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
        );
        
    } catch (error) {
        console.error('Erro ao carregar dados da equipe para exclus�o:', error);
        
        // Tratar erros espec�ficos
        let errorMessage = 'N�o foi poss�vel carregar os dados da equipe para exclus�o.';
        
        if (error.response) {
            if (error.response.status === 403) {
                errorMessage = 'Voc� n�o tem permiss�o para acessar esta equipe.';
            } else if (error.response.status === 404) {
                errorMessage = 'A equipe n�o foi encontrada ou j� foi removida.';
                // Atualizar a tabela para refletir que a equipe n�o existe mais
                try {
                    await renderTeamsTable();
                } catch (e) {
                    console.error('Erro ao atualizar a tabela de equipes:', e);
                }
            } else if (error.response.data?.message) {
                errorMessage = error.response.data.message;
            }
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showNotification(errorMessage, 'error');
    } finally {
        // Garantir que o bot�o seja restaurado em caso de erro
        if (triggerElement) {
            triggerElement.innerHTML = originalButtonContent;
            triggerElement.disabled = false;
        }
    }
}

// Funes de CRUD para Usurios

function openUserModal(userId = null) {
    const form = document.getElementById('user-form');
    const modalTitle = document.getElementById('user-modal-title');
    form.reset();
    document.getElementById('userId').value = '';
    document.getElementById('user-password').parentElement.style.display = 'block';

    if (userId) {
        const user = adminUsers.find(u => u.id === userId);
        if (!user) return;
        modalTitle.textContent = 'Editar Usurio';
        document.getElementById('userId').value = user.id;
        document.getElementById('user-name').value = user.nome;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-jobtitle').value = user.jobTitle;
        document.getElementById('user-role').value = user.cargo;
        document.getElementById('user-team').value = user.equipeId || '';
        document.getElementById('user-status').value = user.status;
        document.getElementById('user-password').parentElement.style.display = 'none'; // No se edita senha aqui
    } else {
        modalTitle.textContent = 'Adicionar Novo Usurio';
    }
    document.getElementById('user-modal').classList.remove('hidden');
}

function closeUserModal() {
    document.getElementById('user-modal').classList.add('hidden');
}

// Cache para controlar o tempo entre envios
const lastSaveTime = new WeakMap();

async function saveUser(event) {
    event.preventDefault();
    
    // Elementos do formul�rio
    const form = event.target.closest('form');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonText = submitButton?.innerHTML || 'Salvar';
    
    try {
        // Validar tempo entre envios
        const now = Date.now();
        const lastTime = lastSaveTime.get(saveUser) || 0;
        if (now - lastTime < 2000) {
            console.log('Tentativa de salvamento muito r�pida, ignorando...');
            return;
        }
        lastSaveTime.set(saveUser, now);
        
        // Atualizar UI durante o processamento
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';
        }
        
        // Obter dados do formul�rio
        const userId = document.getElementById('userId').value;
        const passwordField = document.getElementById('user-password');
        const data = {
            nome: document.getElementById('user-name').value.trim(),
            email: document.getElementById('user-email').value.trim().toLowerCase(),
            senha: passwordField.value,
            jobTitle: document.getElementById('user-jobtitle').value.trim(),
            cargo: document.getElementById('user-role').value,
            equipeId: document.getElementById('user-team').value || null,
            status: document.getElementById('user-status').value,
        };
        
        // Valida��o dos campos
        const errors = {};
        
        // Validar nome
        if (!data.nome) {
            errors.name = 'O nome � obrigat�rio';
        } else if (data.nome.length < 3) {
            errors.name = 'O nome deve ter pelo menos 3 caracteres';
        } else if (data.nome.length > 100) {
            errors.name = 'O nome n�o pode ter mais de 100 caracteres';
        }
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!data.email) {
            errors.email = 'O email � obrigat�rio';
        } else if (!emailRegex.test(data.email)) {
            errors.email = 'Por favor, insira um email v�lido';
        }
        
        // Validar senha apenas para novos usu�rios
        if (!userId && !data.senha) {
            errors.password = 'A senha � obrigat�ria';
        } else if (data.senha && data.senha.length < 6) {
            errors.password = 'A senha deve ter pelo menos 6 caracteres';
        }
        
        // Exibir erros de valida��o, se houver
        const nameError = document.getElementById('user-name-error');
        const emailError = document.getElementById('user-email-error');
        const passwordError = document.getElementById('user-password-error');
        
        // Limpar erros anteriores
        [nameError, emailError, passwordError].forEach(el => {
            if (el) el.textContent = '';
        });
        
        if (Object.keys(errors).length > 0) {
            // Exibir erros
            if (errors.name && nameError) nameError.textContent = errors.name;
            if (errors.email && emailError) emailError.textContent = errors.email;
            if (errors.password && passwordError) passwordError.textContent = errors.password;
            
            // Rolar at� o primeiro erro
            const firstErrorField = errors.name ? 'user-name' : 
                                  errors.email ? 'user-email' : 
                                  'user-password';
            const firstErrorElement = document.getElementById(firstErrorField);
            firstErrorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstErrorElement?.focus();
            
            return;
        }
        
        // Remover senha se for atualiza��o e n�o foi alterada
        if (userId) delete data.senha;
        
        // Preparar requisi��o
        const url = userId ? `/admin/users/${userId}` : '/admin/users';
        const method = userId ? 'PUT' : 'POST';
        
        // Enviar dados
        const response = await api.request(url, { method, data });
        
        if (!response?.success) {
            throw new Error(response?.message || ERROR_MESSAGES.VALIDATION_ERROR);
        }
        
        // Feedback de sucesso
        showNotification(
            `Usu�rio ${userId ? 'atualizado' : 'criado'} com sucesso!`,
            'success'
        );
        
        // Fechar modal e atualizar tabela
        closeUserModal();
        await renderUsersTable();
        
        // Disparar evento personalizado
        document.dispatchEvent(new CustomEvent('userUpdated', {
            detail: { userId: response.data?.id || userId }
        }));
        
    } catch (error) {
        console.error('Erro ao salvar usu�rio:', error);
        
        // Tratar erros espec�ficos
        let errorMessage = error.message || 'Ocorreu um erro ao salvar o usu�rio.';
        
        if (error.response) {
            // Erros de valida��o do servidor (status 400)
            if (error.response.status === 400 && error.response.data?.errors) {
                const serverErrors = error.response.data.errors;
                errorMessage = Object.values(serverErrors)
                    .flat()
                    .join('\n');
            }
            // Conflito de email (status 409)
            else if (error.response.status === 409) {
                errorMessage = 'Este email j� est� em uso. Por favor, utilize outro.';
                const emailField = document.getElementById('user-email');
                const emailError = document.getElementById('user-email-error');
                if (emailField && emailError) {
                    emailError.textContent = errorMessage;
                    emailField.focus();
                }
            }
            // N�o autorizado (status 401)
            else if (error.response.status === 401) {
                errorMessage = 'Sess�o expirada. Por favor, fa�a login novamente.';
                redirectToLogin();
            }
            // Acesso negado (status 403)
            else if (error.response.status === 403) {
                errorMessage = 'Voc� n�o tem permiss�o para realizar esta a��o.';
            }
        }
        
        showNotification(errorMessage, 'error');
        
    } finally {
        // Restaurar estado do bot�o
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    }
}

// Cache para controlar o tempo entre exclus�es de usu�rio
const lastUserDeleteTime = new WeakMap();

/**
 * Remove um usu�rio ap�s confirma��o
 * @param {string} userId - ID do usu�rio a ser removido
 * @param {HTMLElement} [triggerElement=null] - Elemento que acionou a exclus�o (opcional)
 */
async function deleteUser(userId, triggerElement = null) {
    try {
        // Verificar se h� uma exclus�o recente
        const now = Date.now();
        const lastTime = lastUserDeleteTime.get(deleteUser) || 0;
        const timeSinceLastDelete = now - lastTime;
        
        if (timeSinceLastDelete < 2000) {
            console.log('Tentativa de exclus�o muito r�pida, ignorando...');
            return;
        }
        lastUserDeleteTime.set(deleteUser, now);
        
        // Mostrar feedback visual no elemento que acionou a exclus�o, se fornecido
        const originalButtonContent = triggerElement?.innerHTML;
        if (triggerElement) {
            triggerElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            triggerElement.disabled = true;
        }
        
        // Buscar dados do usu�rio para mostrar no modal de confirma��o
        let userName = 'este usu�rio';
        try {
            const userResponse = await api.get(`/admin/users/${userId}`);
            if (userResponse?.success && userResponse.data) {
                userName = userResponse.data.nome || 'este usu�rio';
            }
        } catch (error) {
            console.error('Erro ao buscar dados do usu�rio:', error);
            // Continuar mesmo se n�o conseguir buscar o nome
        }
        
        // Verificar se o usu�rio est� tentando se auto-excluir
        const currentUser = getAuthData();
        const isSelfDelete = currentUser?.id === userId;
        
        // Mensagem de confirma��o personalizada
        let message = `Tem certeza que deseja remover <strong>${escapeHtml(userName)}</strong>?`;
        
        if (isSelfDelete) {
            message += '<br><br><span class="text-red-600 font-semibold">Aten��o: Esta � a sua pr�pria conta! Voc� ser� desconectado imediatamente ap�s a exclus�o.</span>';
        }
        
        message += '<br><br>Esta a��o n�o pode ser desfeita.';
        
        showConfirmationModal(
            'Confirmar Exclus�o',
            message,
            async () => {
                const modal = document.getElementById('confirmation-modal');
                const confirmButton = modal?.querySelector('[data-confirm-button]');
                const originalConfirmButtonText = confirmButton?.innerHTML;
                
                try {
                    // Atualizar bot�o de confirma��o
                    if (confirmButton) {
                        confirmButton.disabled = true;
                        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
                    }
                    
                    // Executar exclus�o
                    const response = await api.del(`/admin/users/${userId}`);
                    
                    if (!response?.success) {
                        throw new Error(response?.message || 'Falha ao excluir o usu�rio');
                    }
                    
                    // Feedback de sucesso
                    showNotification('Usu�rio removido com sucesso!', 'success');
                    
                    // Se o usu�rio estiver se auto-excluindo, redirecionar para login
                    if (isSelfDelete) {
                        // Limpar dados de autentica��o
                        clearAuthData();
                        // Redirecionar para a p�gina de login ap�s um curto atraso
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 1500);
                        return;
                    }
                    
                    // Atualizar a tabela de usu�rios
                    await renderUsersTable();
                    
                    // Disparar evento personalizado
                    document.dispatchEvent(new CustomEvent('userDeleted', {
                        detail: { userId }
                    }));
                    
                } catch (error) {
                    console.error('Erro ao remover usu�rio:', error);
                    
                    // Tratar erros espec�ficos
                    let errorMessage = 'Ocorreu um erro ao remover o usu�rio.';
                    
                    if (error.response) {
                        if (error.response.status === 403) {
                            errorMessage = 'Voc� n�o tem permiss�o para remover este usu�rio.';
                        } else if (error.response.status === 404) {
                            errorMessage = 'O usu�rio n�o foi encontrado ou j� foi removido.';
                            // Atualizar a tabela para refletir que o usu�rio n�o existe mais
                            try {
                                await renderUsersTable();
                            } catch (e) {
                                console.error('Erro ao atualizar a tabela de usu�rios:', e);
                            }
                        } else if (error.response.data?.message) {
                            errorMessage = error.response.data.message;
                        }
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    showNotification(errorMessage, 'error');
                    
                } finally {
                    // Restaurar bot�o de confirma��o
                    if (confirmButton) {
                        confirmButton.disabled = false;
                        confirmButton.innerHTML = originalConfirmButtonText;
                    }
                }
            },
            'Excluir',
            'Cancelar',
            'bg-red-600 hover:bg-red-700',
            'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
        );
        
    } catch (error) {
        console.error('Erro ao preparar a exclus�o do usu�rio:', error);
        showNotification(
            'Ocorreu um erro ao preparar a exclus�o do usu�rio. Por favor, tente novamente.',
            'error'
        );
    } finally {
        // Restaurar o bot�o que acionou a exclus�o, se fornecido
        if (triggerElement) {
            triggerElement.innerHTML = originalButtonContent;
            triggerElement.disabled = false;
        }
    }
}

// Cache para armazenar a lista de equipes
let teamsCache = {
    data: [],
    timestamp: 0,
    CACHE_DURATION: 5 * 60 * 1000 // 5 minutos de cache
};

/**
 * Limpa o cache de equipes
 */
function clearTeamsCache() {
    teamsCache = {
        data: [],
        timestamp: 0,
        CACHE_DURATION: 5 * 60 * 1000
    };
}

/**
 * Busca equipes do servidor ou do cache
 * @param {boolean} forceRefresh - For�a atualiza��o do cache
 * @returns {Promise<Array>} Lista de equipes
 */
async function fetchTeams(forceRefresh = false) {
    const now = Date.now();
    const isCacheValid = (now - teamsCache.timestamp) < teamsCache.CACHE_DURATION;
    
    if (!forceRefresh && teamsCache.data.length > 0 && isCacheValid) {
        return [...teamsCache.data]; // Retorna c�pia do cache
    }
    
    try {
        const response = await api.teams.getAllTeams();
        if (!response?.success) {
            throw new Error(response?.message || 'Erro ao carregar equipes');
        }
        
        // Atualizar cache
        teamsCache.data = response.data || [];
        teamsCache.timestamp = now;
        
        return [...teamsCache.data]; // Retorna c�pia
        
    } catch (error) {
        console.error('Erro ao buscar equipes:', error);
        
        // Se houver erro mas tivermos dados em cache, usamos os dados antigos
        if (teamsCache.data.length > 0) {
            console.warn('Usando dados em cache devido ao erro na requisi��o');
            return [...teamsCache.data]; // Retorna c�pia
        }
        
        throw error; // Propaga o erro se n�o houver cache
    }
}

/**
 * Popula os selects de equipe na aplica��o
 * @param {string} selectId - ID do elemento select a ser preenchido (opcional)
 * @param {boolean} forceRefresh - For�a atualiza��o do cache
 * @returns {Promise<Array>} Lista de equipes carregadas
 */
async function populateTeamSelect(selectId = null, forceRefresh = false) {
    // Se n�o for especificado um select, atualiza todos os selects de equipe
    const selectors = selectId 
        ? [document.getElementById(selectId)]
        : document.querySelectorAll('select[data-team-select]');

    // Se n�o houver selects para preencher, retorna
    if (!selectors.length || (selectId && !selectors[0])) {
        console.warn('Nenhum seletor de equipe encontrado');
        return [];
    }
    
    const loadingIndicator = document.getElementById('teams-loading');
    if (loadingIndicator) {
        loadingIndicator.classList.remove('hidden');
    }

    try {
        // Buscar equipes (do cache ou servidor)
        const teams = await fetchTeams(forceRefresh);
        
        // Ordenar equipes por nome
        const sortedTeams = [...teams].sort((a, b) => a.nome.localeCompare(b.nome));
        
        // Para cada select encontrado
        const selects = Array.from(selectors).filter(Boolean);
        for (const select of selects) {
            // Salvar o valor atual para restaurar depois
            const currentValue = select.value;
            const isRequired = select.required;
            const placeholder = select.dataset.placeholder || 'Selecione uma equipe';
            
            // Limpar op��es atuais, mantendo a primeira op��o se existir
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = firstOption ? firstOption.outerHTML : '';
            
            // Se n�o houver op��o padr�o, adiciona uma
            if (select.querySelectorAll('option').length === 0) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = isRequired ? placeholder : 'Todas as equipes';
                if (isRequired) defaultOption.disabled = true;
                select.appendChild(defaultOption);
            }
            
            // Adicionar equipes como op��es
            sortedTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.nome;
                option.dataset.managerId = team.gestorId || '';
                option.dataset.teamName = team.nome || '';
                select.appendChild(option);
            });
            
            // Restaurar o valor anterior se ainda for v�lido
            const hasCurrentValue = sortedTeams.some(team => team.id === currentValue);
            if (hasCurrentValue) {
                select.value = currentValue;
            } else if (isRequired) {
                select.selectedIndex = 0;
            }
            
            // Disparar evento de mudan�a para atualizar depend�ncias
            select.dispatchEvent(new CustomEvent('teamSelectUpdated', {
                detail: { 
                    teamId: select.value,
                    teamName: select.options[select.selectedIndex]?.dataset.teamName || ''
                }
            }));
        }
        
        return sortedTeams;
        
    } catch (error) {
        console.error('Erro ao carregar lista de equipes:', error);
        
        // Mostrar mensagem de erro apenas se n�o houver cache
        if (teamsCache.data.length === 0) {
            showNotification(
                error.message || 'N�o foi poss�vel carregar a lista de equipes.', 
                'error'
            );
        }
        
        return [];
        
    } finally {
        if (loadingIndicator) {
            loadingIndicator.classList.add('hidden');
        }
    }
}

// Evento para limpar o cache quando uma equipe for atualizada
document.addEventListener('teamUpdated', () => {
    clearTeamsCache();
    populateTeamSelect();
});

// Evento para limpar o cache quando uma equipe for exclu�da
document.addEventListener('teamDeleted', () => {
    clearTeamsCache();
    populateTeamSelect();
});

// Make function available globally in browser environment
if (typeof window !== 'undefined') {
    window.populateTeamSelect = populateTeamSelect;
}