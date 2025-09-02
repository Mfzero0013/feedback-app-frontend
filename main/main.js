// Importa os serviços necessários
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
 * Valida os campos de um formulário
 * @param {HTMLFormElement} form - Elemento do formulário
 * @param {Object} fields - Objeto com configurações dos campos
 * @returns {{isValid: boolean, data: Object}} Resultado da validação e dados do formulário
 */
function validateForm(form, fields) {
    const formData = new FormData(form);
    const data = {};
    let isValid = true;

    // Valida cada campo do formulário
    for (const [fieldName, config] of Object.entries(fields)) {
        const input = form.querySelector(`[name="${fieldName}"]`);
        const errorElement = document.getElementById(`${fieldName}-error`);
        
        if (errorElement) {
            errorElement.textContent = '';
        }

        const value = formData.get(fieldName)?.toString().trim() || '';
        data[fieldName] = value;

        // Validação de campo obrigatório
        if (config.required && !value) {
            if (errorElement) {
                errorElement.textContent = config.message || 'Este campo é obrigatório.';
            }
            isValid = false;
            continue;
        }

        // Validação de formato de e-mail
        if (fieldName.toLowerCase() === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                if (errorElement) {
                    errorElement.textContent = 'Por favor, insira um e-mail válido.';
                }
                isValid = false;
            }
        }

        // Validação de senha
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
 * @param {string} unsafe - String não segura
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

// Inicializa os serviços
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
 * Configura o formulário de login
 */
function setupLoginForm() {
    // Constantes para mensagens
    const MESSAGES = {
        EMAIL_REQUIRED: 'Por favor, insira seu e-mail',
        EMAIL_INVALID: 'E-mail inválido. Exemplo: nome@exemplo.com',
        PASSWORD_REQUIRED: 'Por favor, insira sua senha',
        PASSWORD_TOO_SHORT: 'A senha deve ter no mínimo 8 caracteres',
        LOGIN_SUCCESS: 'Login realizado com sucesso!',
        LOGIN_ERROR: 'E-mail ou senha incorretos',
        SERVER_ERROR: 'Erro no servidor. Tente novamente mais tarde.',
        NETWORK_ERROR: 'Erro de conexão. Verifique sua internet.'
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

    // Função para verificar força da senha
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
        if (score <= 3) return { score, label: 'Média', color: 'yellow-500' };
        if (score <= 4) return { score, label: 'Forte', color: 'green-500' };
        return { score, label: 'Muito Forte', color: 'green-700' };
    };
    
    // Funções de validação
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

    // Funções de feedback
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

    // Validação em tempo real
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
            
            // Atualizar indicador de força
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
        
        // Mostrar erros de validação
        if (!emailValidation.isValid) {
            showError(emailError, emailValidation.message);
            emailInput?.focus();
        }
        
        if (!passwordValidation.isValid) {
            showError(passwordError, passwordValidation.message);
            if (isValid) passwordInput?.focus();
        }
        
        if (!isValid) {
            // Animar o formulário para indicar erro
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
                throw new Error('Resposta de login inválida');
            }
            
            setAuthData(response.user, response.token);
            notificationService.success(MESSAGES.LOGIN_SUCCESS);
            
            // Redirecionar após pequeno atraso
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
            notificationService.error(error.message || 'Não foi possível realizar o cadastro.');
        }

// Função para exibir notificações
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

// Variáveis globais para armazenar dados da página de admin
let adminUsers = [];

// Adiciona os event listeners para os elementos da pgina de admin
function setupAdminEventListeners() {
    // Botes e formulrios de Equipes
    document.getElementById('add-team-button')?.addEventListener('click', () => openTeamModal());
    document.getElementById('team-form')?.addEventListener('submit', saveTeam);
    document.getElementById('cancel-team-modal')?.addEventListener('click', () => closeTeamModal());

    // Botes e formulrios de Usurios
    document.getElementById('add-user-button')?.addEventListener('click', () => openUserModal());
    document.getElementById('user-form')?.addEventListener('submit', saveUser);
    document.getElementById('cancel-user-modal')?.addEventListener('click', () => closeUserModal());
}

// Funes de renderizao

async function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    showLoader();
    try {
        adminUsers = await api.get('/admin/users');
        tableBody.innerHTML = '';
        if (adminUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum usurio encontrado.</td></tr>';
            return;
        }
        adminUsers.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${user.nome}</div>
                    <div class="text-sm text-gray-500">${user.email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.jobTitle || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.equipe?.nome || 'Sem equipe'}</td>
                <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ATIVO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} ">${user.status}</span></td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onclick="openUserModal('${user.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</button>
                    <button onclick="deleteUser('${user.id}')" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        showNotification('Falha ao carregar usurios.', 'error');
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-red-500">Erro ao carregar dados.</td></tr>';
    } finally {
        hideLoader();
    }
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
        // Usar o serviço de equipes para buscar os dados
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

// Funções de CRUD para Equipes

/**
 * Abre o modal de equipe para criar ou editar
 * @param {string|null} teamId - ID da equipe para edição ou null para criar nova
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
        console.error('Elementos do formulário não encontrados');
        showNotification(ERROR_MESSAGES.SERVER_ERROR, 'error');
        return;
    }
    
    // Resetar formulário e mensagens de erro
    form.reset();
    document.getElementById('teamId').value = '';
    errorElement.textContent = '';
    
    showLoader();
    try {
        // Carregar lista de gestores disponíveis
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
            // Modo edição - carregar dados da equipe
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
            // Modo criação
            modalTitle.textContent = 'Adicionar Nova Equipe';
        }
        
        // Exibir modal
        modal.classList.remove('hidden');
        nameField.focus();
        
    } catch (error) {
        console.error('Erro ao abrir formulário de equipe:', error);
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
 * @returns {{isValid: boolean, errors: Object}} Resultado da validação
 */
function validateTeamData(data) {
    const errors = {};
    
    if (!data.nome || !data.nome.trim()) {
        errors.name = ERROR_MESSAGES.TEAM_NAME_REQUIRED;
    } else if (data.nome.length > 100) {
        errors.name = 'O nome da equipe não pode ter mais de 100 caracteres';
    }
    
    if (data.descricao && data.descricao.length > 500) {
        errors.description = 'A descrição não pode ter mais de 500 caracteres';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
}

/**
 * Salva uma equipe (cria ou atualiza)
 * @param {Event} event - Evento de submit do formulário
 */
async function saveTeam(event) {
    event.preventDefault();
    
    // Obter referências dos elementos
    const form = event.target;
    const teamId = document.getElementById('teamId')?.value || '';
    const nameField = document.getElementById('team-name');
    const descriptionField = document.getElementById('team-description');
    const managerSelect = document.getElementById('team-manager');
    const nameError = document.getElementById('name-error');
    const descriptionError = document.getElementById('description-error');
    
    // Validar elementos do DOM
    if (!form || !nameField || !descriptionField || !managerSelect || !nameError) {
        console.error('Elementos do formulário não encontrados');
        notificationService.error(ERROR_MESSAGES.SERVER_ERROR);
        return;
    }
    
    // Limpar mensagens de erro
    nameError.textContent = '';
    if (descriptionError) descriptionError.textContent = '';
    
    // Preparar dados com validação
    const teamData = {
        nome: (nameField.value || '').trim(),
        descricao: (descriptionField.value || '').trim(),
        gestorId: managerSelect.value || null
    };
    
    // Validar dados
    const { isValid, errors } = validateTeamData(teamData);
    if (!isValid) {
        if (errors.name) nameError.textContent = errors.name;
        if (errors.description && descriptionError) {
            descriptionError.textContent = errors.description;
        }
        return;
    }
    
    // Configurar botão de envio
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
        
        // Fechar modal e atualizar tabela
        closeTeamModal();
        await renderTeamsTable();
        
        // Disparar evento personalizado para notificar sobre a atualização
        const updatedTeamId = response?.data?.id || teamId;
        if (updatedTeamId) {
            document.dispatchEvent(new CustomEvent('teamUpdated', {
                detail: { teamId: updatedTeamId }
            }));
        }
        
    } catch (error) {
        console.error('Erro ao salvar equipe:', error);
        
        // Tratar erros específicos
        if (error.response?.status === 409) {
            notificationService.error('Já existe uma equipe com este nome.');
            if (nameError) nameError.textContent = 'Já existe uma equipe com este nome';
            if (nameField) nameField.focus();
        } else if (error.response?.status === 401) {
            notificationService.error(ERROR_MESSAGES.UNAUTHORIZED);
            window.location.href = 'index.html';
        } else if (error.response?.status === 403) {
            notificationService.error(ERROR_MESSAGES.FORBIDDEN);
        } else {
            const errorMessage = error.message || 
                (teamId ? ERROR_MESSAGES.TEAM_UPDATE_ERROR : ERROR_MESSAGES.TEAM_CREATE_ERROR);
            notificationService.error(errorMessage);
        }
    } finally {
        // Restaurar estado do botão e loader
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
        hideLoader();
    }
}

/**
 * Remove uma equipe após confirmação do usuário
 * @param {string} teamId - ID da equipe a ser removida
 */
async function deleteTeam(teamId) {
    try {
        // Buscar dados da equipe para mostrar no modal de confirmação
        const response = await api.teams.getTeamById(teamId);
        if (!response?.success || !response.data) {
            throw new Error(response?.message || ERROR_MESSAGES.TEAM_NOT_FOUND);
        }
        
        const team = response.data;
        const memberCount = team.membros?.length || 0;
        
        // Mensagem de confirmação personalizada
        let message = `Tem certeza que deseja remover a equipe <strong>${escapeHtml(team.nome)}</strong>?`;
        
        if (memberCount > 0) {
            message += `<br><br><span class="text-yellow-700">Atenção: Esta equipe possui ${memberCount} membro(s). 
                      Todos os membros serão desvinculados da equipe.</span>`;
        }
        
        message += "<br><br>Esta ação não pode ser desfeita.";
        
        showConfirmationModal(
            'Confirmar Exclusão', 
            message, 
            async () => {
                const modal = document.getElementById('confirmation-modal');
                const confirmButton = modal?.querySelector('[data-confirm-button]');
                const originalButtonText = confirmButton?.innerHTML;
                
                try {
                    // Atualizar botão de confirmação
                    if (confirmButton) {
                        confirmButton.disabled = true;
                        confirmButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';
                    }
                    
                    // Executar exclusão
                    const deleteResponse = await api.teams.deleteTeam(teamId);
                    
                    if (!deleteResponse?.success) {
                        throw new Error(deleteResponse?.message || ERROR_MESSAGES.TEAM_DELETE_ERROR);
                    }
                    
                    showNotification('Equipe removida com sucesso!', 'success');
                    
                    // Fechar modal e atualizar a tabela
                    hideConfirmationModal();
                    await renderTeamsTable();
                    
                    // Disparar evento personalizado para notificar sobre a exclusão
                    document.dispatchEvent(new CustomEvent('teamDeleted', {
                        detail: { teamId }
                    }));
                    
                } catch (error) {
                    console.error('Erro ao remover equipe:', error);
                    
                    // Tratar erros específicos
                    if (error.response?.status === 403) {
                        showNotification('Você não tem permissão para remover esta equipe.', 'error');
                    } else if (error.response?.status === 404) {
                        showNotification('A equipe não foi encontrada ou já foi removida.', 'error');
                        await renderTeamsTable(); // Atualizar tabela se a equipe não existir mais
                    } else {
                        showNotification(
                            error.message || ERROR_MESSAGES.TEAM_DELETE_ERROR, 
                            'error'
                        );
                    }
                } finally {
                    // Restaurar botão de confirmação
                    if (confirmButton) {
                        confirmButton.disabled = false;
                        confirmButton.innerHTML = originalButtonText;
                    }
                }
            },
            'Excluir',
            'Cancelar',
            'bg-red-600 hover:bg-red-700',
            'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300'
        );
        
    } catch (error) {
        console.error('Erro ao cargar dados da equipe para exclusão:', error);
        showNotification(
            error.message || 'Não foi possível carregar os dados da equipe para exclusão.',
            'error'
        );
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

async function saveUser(event) {
    event.preventDefault();
    const userId = document.getElementById('userId').value;
    const data = {
        nome: document.getElementById('user-name').value,
        email: document.getElementById('user-email').value,
        senha: document.getElementById('user-password').value,
        jobTitle: document.getElementById('user-jobtitle').value,
        cargo: document.getElementById('user-role').value,
        equipeId: document.getElementById('user-team').value || null,
        status: document.getElementById('user-status').value,
    };

    if (userId) delete data.senha; // No enviar senha em branco na atualizao

    const url = userId ? `/admin/users/${userId}` : '/admin/users';
    const method = userId ? 'PUT' : 'POST';

    try {
        await api.request(url, { method, data });
        showNotification(`Usurio ${userId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeUserModal();
        renderUsersTable();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function deleteUser(userId) {
    showConfirmationModal('Confirmar Remoo', 'Tem certeza que deseja remover este usurio?', async () => {
        try {
            await api.del(`/admin/users/${userId}`);
            showNotification('Usurio removido com sucesso!', 'success');
            renderUsersTable();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
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
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de equipes
 */
async function fetchTeams(forceRefresh = false) {
    const now = Date.now();
    const isCacheValid = (now - teamsCache.timestamp) < teamsCache.CACHE_DURATION;
    
    if (!forceRefresh && teamsCache.data.length > 0 && isCacheValid) {
        return [...teamsCache.data]; // Retorna cópia do cache
    }
    
    try {
        const response = await api.teams.getAllTeams();
        if (!response?.success) {
            throw new Error(response?.message || 'Erro ao carregar equipes');
        }
        
        // Atualizar cache
        teamsCache.data = response.data || [];
        teamsCache.timestamp = now;
        
        return [...teamsCache.data]; // Retorna cópia
        
    } catch (error) {
        console.error('Erro ao buscar equipes:', error);
        
        // Se houver erro mas tivermos dados em cache, usamos os dados antigos
        if (teamsCache.data.length > 0) {
            console.warn('Usando dados em cache devido ao erro na requisição');
            return [...teamsCache.data]; // Retorna cópia
        }
        
        throw error; // Propaga o erro se não houver cache
    }
}

/**
 * Popula os selects de equipe na aplicação
 * @param {string} selectId - ID do elemento select a ser preenchido (opcional)
 * @param {boolean} forceRefresh - Força atualização do cache
 * @returns {Promise<Array>} Lista de equipes carregadas
 */
async function populateTeamSelect(selectId = null, forceRefresh = false) {
    // Se não for especificado um select, atualiza todos os selects de equipe
    const selectors = selectId 
        ? [document.getElementById(selectId)]
        : document.querySelectorAll('select[data-team-select]');

    // Se não houver selects para preencher, retorna
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
            
            // Limpar opções atuais, mantendo a primeira opção se existir
            const firstOption = select.querySelector('option:first-child');
            select.innerHTML = firstOption ? firstOption.outerHTML : '';
            
            // Se não houver opção padrão, adiciona uma
            if (select.querySelectorAll('option').length === 0) {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = isRequired ? placeholder : 'Todas as equipes';
                if (isRequired) defaultOption.disabled = true;
                select.appendChild(defaultOption);
            }
            
            // Adicionar equipes como opções
            sortedTeams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.nome;
                option.dataset.managerId = team.gestorId || '';
                option.dataset.teamName = team.nome || '';
                select.appendChild(option);
            });
            
            // Restaurar o valor anterior se ainda for válido
            const hasCurrentValue = sortedTeams.some(team => team.id === currentValue);
            if (hasCurrentValue) {
                select.value = currentValue;
            } else if (isRequired) {
                select.selectedIndex = 0;
            }
            
            // Disparar evento de mudança para atualizar dependências
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
        
        // Mostrar mensagem de erro apenas se não houver cache
        if (teamsCache.data.length === 0) {
            showNotification(
                error.message || 'Não foi possível carregar a lista de equipes.', 
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

// Evento para limpar o cache quando uma equipe for excluída
document.addEventListener('teamDeleted', () => {
    clearTeamsCache();
    populateTeamSelect();
});

// Make function available globally in browser environment
if (typeof window !== 'undefined') {
    window.populateTeamSelect = populateTeamSelect;
}