// Importa os servios necessrios
import { api } from './services/api.service';
import notificationService from './services/notification.service';
import { 
    getAuthData, 
    redirectToLogin, 
    getAndClearRedirectUrl, 
    isAuthenticated, 
    setAuthData, 
    clearAuthData 
} from './services/auth.service';
import { ERROR_MESSAGES } from './constants';

// Inicializa os servios
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
            notificationService.error(error.message || 'No foi possvel realizar o cadastro.');
        }
    });
}

/**
 * Configura o formulrio de login
 */
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fields = {
            email: { required: true, message: 'O e-mail  obrigatrio.' },
            senha: { required: true, message: 'A senha  obrigatria.' },
        };

        const { isValid, data: formData } = validateForm(loginForm, fields);
        if (!isValid) {
            notificationService.warning('Por favor, preencha todos os campos obrigatrios.');
            return;
        }

        try {
            const loginButton = loginForm.querySelector('button[type="submit"]');
            const originalText = loginButton.innerHTML;
            loginButton.disabled = true;
            loginButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';

            // Realiza o login
            const response = await api.auth.login(formData.email, formData.senha);
            
            // Armazena os dados de autenticao
            setAuthData(response.user, response.token);
            
            // Redireciona para a pgina inicial ou para a URL salva
            const redirectUrl = getAndClearRedirectUrl();
            notificationService.success('Login realizado com sucesso!');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
            
        } catch (error) {
            console.error('Erro no login:', error);
            notificationService.error(error.message || 'No foi possvel fazer login. Verifique suas credenciais.');
            
                // Reativa o boto de login
            const loginButton = loginForm.querySelector('button[type="submit"]');
            if (loginButton) {
                loginButton.disabled = false;
                loginButton.innerHTML = originalText;
    try {
        // Configura a pgina de perfil se estiver na pgina correta
        if (window.location.pathname.endsWith('profile.html')) {
            setupProfilePage();
        }

        // Configura a pgina de relatrios se estiver na pgina correta
        if (window.location.pathname.endsWith('reports.html')) {
            setupReportsPage();
        }

        // Configura a pgina de feedback se estiver na pgina correta
        if (window.location.pathname.endsWith('feedback.html')) {
            setupFeedbackPage();
        }

        // Configura a pgina de administrao se estiver na pgina correta
        if (window.location.pathname.endsWith('admin.html')) {
            setupAdminPage();
        }

        // Configura a pgina de dashboard se estiver na pgina correta
        if (window.location.pathname.endsWith('dashboard.html')) {
            loadDashboardData();
            loadDashboardStatsAndCharts();
        }

        // Configura botes de colaborador se estiverem presentes na pgina
        const saveButton = document.getElementById('save-collaborator-button');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                const addCollaboratorForm = document.getElementById('add-collaborator-form');
                if (addCollaboratorForm) {
                    addCollaboratorForm.dispatchEvent(new Event('submit'));
                }
            });
        }

        const updateButton = document.getElementById('update-collaborator-button');
        if (updateButton) {
            updateButton.addEventListener('click', updateCollaborator);
        }

        const cancelDeleteButton = document.getElementById('cancel-delete-button');
        if(cancelDeleteButton) {
            cancelDeleteButton.addEventListener('click', closeDeleteConfirmModal);
        }

    } catch (error) {
        console.error('Erro ao carregar a pgina:', error);
        notificationService.error('Ocorreu um erro ao carregar a pgina. Tente novamente.');
    }
}

// Funes de pgina
function setupProfilePage() {
    // Configura a pgina de perfil
}

function setupReportsPage() {
    // Configura a pgina de relatrios
}

function setupFeedbackPage() {
    // Configura a pgina de feedback
}

function setupAdminPage() {
    // Configura a pgina de administrao
}

function loadDashboardData() {
    // Carrega os dados de feedbacks recebidos e enviados e os renderiza no dashboard.
}

function loadDashboardStatsAndCharts() {
    // Carrega as estatsticas e grficos do dashboard.
}

// Funes auxiliares
function applyPermissions() {
    const authData = getAuthData();
    if (!authData?.user) return;

    const adminElements = document.querySelectorAll('[data-role="admin"]');
    const managerElements = document.querySelectorAll('[data-role="manager"]');
    
    adminElements.forEach((el) => {
        el.style.display = authData.user.role === 'admin' ? 'block' : 'none';
    });
    
    managerElements.forEach((el) => {
        el.style.display = ['admin', 'manager'].includes(authData.user.role) ? 'block' : 'none';
    });
}

// Navegao
function novoFeedback() {
    window.location.href = "feedback.html";
}

function verDetalhes(id) {
    window.location.href = `feedback.html?id=${id}`;
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    localStorage.removeItem('redirectAfterLogin');
    showNotification('Voc foi desconectado com sucesso!', 'info');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1500);
}

function clearFilters() {
    document.getElementById('filterRole').value = '';
    document.getElementById('filterDepartment').value = '';
    document.getElementById('searchUser').value = '';
    // ... outras regras de limpeza de filtros ...

    // Mostrar todas as linhas
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      row.style.display = '';
    });
    
    updateUserCount();
}

  function updateUserCount() {
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
    const totalUsers = document.querySelector('.bg-blue-500 h3');
    
    if (totalUsers) {
      totalUsers.textContent = visibleRows.length;
    }
  }

  // Funo para exportar dados dos usurios
  function exportUsers() {
    if (!checkPermission('all')) {
      showNotification('Acesso negado. Apenas administradores podem exportar dados.', 'error');
      return;
    }
    
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
    let csvContent = 'Nome,Email,Perfil,Departamento,Status,ltimo Acesso\n';
    
    visibleRows.forEach(row => {
      const name = row.querySelector('td:nth-child(1) .font-medium').textContent;
      const email = row.querySelector('td:nth-child(1) .text-gray-500').textContent;
      const role = row.querySelector('td:nth-child(2) span').textContent;
      const department = row.querySelector('td:nth-child(3)').textContent;
      const status = row.querySelector('td:nth-child(4) span').textContent;
      const lastAccess = row.querySelector('td:nth-child(5)').textContent;
      
      csvContent += `"${name}","${email}","${role}","${department}","${status}","${lastAccess}"\n`;
    });
    
    // Criar e baixar arquivo CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'usuarios_feedbackhub.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification('Exportao realizada com sucesso!', 'success');
  }

  // Sistema de notificaes
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

// Variveis globais para armazenar dados da pgina de admin
let adminUsers = [];
let adminTeams = [];

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

async function renderTeamsTable() {
    const tableBody = document.getElementById('teams-table-body');
    if (!tableBody) return;

    showLoader();
    try {
        adminTeams = await api.get('/admin/teams');
        tableBody.innerHTML = '';
        if (adminTeams.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Nenhuma equipe encontrada.</td></tr>';
            return;
        }
        adminTeams.forEach(team => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${team.nome}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team.gestor?.nome || 'Sem gestor'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${team.membros?.length || 0}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button onclick="openTeamModal('${team.id}')" class="text-indigo-600 hover:text-indigo-900">Editar</button>
                    <button onclick="deleteTeam('${team.id}')" class="text-red-600 hover:text-red-900">Remover</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        // Popula os selects que dependem das equipes
        populateTeamSelect();
    } catch (error) {
        showNotification('Falha ao carregar equipes.', 'error');
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Erro ao carregar dados.</td></tr>';
    } finally {
        hideLoader();
    }
}

// Funes de CRUD para Equipes

function openTeamModal(teamId = null) {
    const form = document.getElementById('team-form');
    const modalTitle = document.getElementById('team-modal-title');
    form.reset();
    document.getElementById('teamId').value = '';

    if (teamId) {
        const team = adminTeams.find(t => t.id === teamId);
        if (!team) return;
        modalTitle.textContent = 'Editar Equipe';
        document.getElementById('teamId').value = team.id;
        document.getElementById('team-name').value = team.nome;
        document.getElementById('team-description').value = team.descricao;
        // TODO: Popular e selecionar gestor
    } else {
        modalTitle.textContent = 'Adicionar Nova Equipe';
    }
    document.getElementById('team-modal').classList.remove('hidden');
}

function closeTeamModal() {
    document.getElementById('team-modal').classList.add('hidden');
}

async function saveTeam(event) {
    event.preventDefault();
    const teamId = document.getElementById('teamId').value;
    const data = {
        nome: document.getElementById('team-name').value,
        descricao: document.getElementById('team-description').value,
        gestorId: null // TODO: Obter do select de gestor
    };

    const url = teamId ? `/admin/teams/${teamId}` : '/admin/teams';
    const method = teamId ? 'PUT' : 'POST';

    try {
        await api.request(url, { method, data });
        showNotification(`Equipe ${teamId ? 'atualizada' : 'criada'} com sucesso!`, 'success');
        closeTeamModal();
        renderTeamsTable();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function deleteTeam(teamId) {
    showConfirmationModal('Confirmar Remoo', 'Tem certeza que deseja remover esta equipe?', async () => {
        try {
            await api.del(`/admin/teams/${teamId}`);
            showNotification('Equipe removida com sucesso!', 'success');
            renderTeamsTable();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
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

// Funes auxiliares
function populateTeamSelect() {
    try {
        const select = document.getElementById('user-team');
        if (!select) {
            console.warn('Elemento user-team no encontrado');
            return;
        }
        
        select.innerHTML = '<option value="">Sem Equipe</option>'; // Opo padro
        
        // Check if adminTeams is defined
        if (!window.adminTeams || !Array.isArray(window.adminTeams)) {
            console.warn('adminTeams no est definido ou no  um array');
            return;
        }
        
        // Add team options
        window.adminTeams.forEach(team => {
            if (team && team.id && team.nome) {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.nome;
                select.appendChild(option);
            }
        });
    } catch (error) {
        console.error('Erro em populateTeamSelect:', error);
    }
}

// Make function available globally in browser environment
if (typeof window !== 'undefined') {
    window.populateTeamSelect = populateTeamSelect;
}