// Este listener principal garante que todo o código que manipula o DOM só rode depois que a página estiver pronta.
document.addEventListener("DOMContentLoaded", () => {

    const token = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData'));
    const currentPage = window.location.pathname.split("/").pop() || "index.html";

    // Protege o dashboard e outras páginas que exigem login
    const protectedPages = ['dashboard.html', 'profile.html', 'feedback.html', 'reports.html', 'team.html', 'admin.html'];
    if (protectedPages.includes(currentPage) && !token) {
        // Salva a página que o usuário tentou acessar para redirecioná-lo após o login
        localStorage.setItem('redirectAfterLogin', currentPage);
        window.location.href = 'index.html';
        return; // Impede a execução do resto do script
    }

    // Exibe os dados do usuário na interface (barra lateral, cabeçalho, etc.)
    if (userData) {
        const firstName = userData.nome ? userData.nome.split(' ')[0] : 'Usuário';
        const userAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.nome || 'User')}&background=random&color=fff`;

        const elementsToUpdate = {
            'user-name-display': userData.nome || 'Usuário',
            'user-firstname-display': firstName,
            'user-role-display': userData.cargo || 'Perfil não definido'
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

    // Configura o botão de logout
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }

    // Marca o link de navegação da página atual como ativo
    const links = document.querySelectorAll("nav a");
    links.forEach(link => {
        if (link.getAttribute("href") === currentPage) {
            link.classList.add("bg-indigo-900");
        }
    });

    // Lógica para o formulário de CADASTRO
    const registrationForm = document.getElementById('registration-form');
    if (registrationForm) {
        populateTeamsDropdown(); // Popula o dropdown de equipes ao carregar a página

        registrationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fields = {
                nome: { required: true, message: 'O nome é obrigatório.' },
                email: { required: true, message: 'O e-mail é obrigatório.' },
                senha: { required: true, message: 'A senha é obrigatória.' },
                departamento: { required: true, message: 'O departamento é obrigatório.' },
                accountType: { required: true, message: 'O tipo de conta é obrigatório.' },
            };

            const { isValid, data } = validateForm(registrationForm, fields);
            if (!isValid) {
                showNotification('Por favor, preencha todos os campos obrigatórios.', 'warning');
                return;
            }

            // Mapeamento de tipo de conta para cargo
            const cargoMapping = {
                'colaborador': 'COLABORADOR',
                'gestor': 'ADMINISTRADOR',
                'rh': 'ADMINISTRADOR',
                'diretoria': 'SUPER_ADMINISTRADOR'
            };
            data.cargo = cargoMapping[data.accountType];
            delete data.accountType; // Não enviar accountType para o backend


            try {
                const response = await api.registerUser(data);
                showNotification(response.message || 'Cadastro realizado com sucesso! Redirecionando...', 'success');
                setTimeout(() => { window.location.href = 'index.html'; }, 2000);
            } catch (error) {
                showNotification(error.message || 'Não foi possível realizar o cadastro.', 'error');
            }
        });
    }

    // Lógica para o formulário de LOGIN
    const loginForm = document.getElementById('login-form');
    if (loginForm) {

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fields = {
                email: { required: true, message: 'O e-mail é obrigatório.' },
                senha: { required: true, message: 'A senha é obrigatória.' },
            };

            const { isValid, data: formData } = validateForm(loginForm, fields);
            if (!isValid) return;

            try {
                const responseData = await api.loginUser(formData.email, formData.senha);
                localStorage.setItem('authToken', responseData.token);
                localStorage.setItem('userData', JSON.stringify(responseData.user)); // Corrigido para pegar `responseData.user`
                showNotification('Login realizado com sucesso! Redirecionando...', 'success');
                
                const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'dashboard.html';
                localStorage.removeItem('redirectAfterLogin');
                setTimeout(() => { window.location.href = redirectUrl; }, 1500);
            } catch (error) {
                showNotification(error.message || 'Credenciais inválidas. Tente novamente.', 'error');
            }
        });
    }

    // Aplica permissões de visualização com base no perfil do usuário
    applyPermissions();

    // Lógica específica para a página de perfil
    if (currentPage === 'profile.html') {
        populateProfileData();
    }


    if (window.location.pathname.endsWith('reports.html')) {
        renderGeneralReport();
        renderEngagementReport();
    }

    // Lógica específica para a página de administração
    if (window.location.pathname.endsWith('admin.html')) {
        // Adiciona listeners para os modais de admin
        setupAdminEventListeners();
        // Renderiza as tabelas
        renderUsersTable();
        renderTeamsTable();
    }


    const saveButton = document.getElementById('save-collaborator-button');
    if(saveButton) {
        saveButton.addEventListener('click', () => {
            addCollaboratorForm.dispatchEvent(new Event('submit'));
        });
    }

    const updateButton = document.getElementById('update-collaborator-button');
    if(updateButton) {
        updateButton.addEventListener('click', updateCollaborator);
    }

    const cancelDeleteButton = document.getElementById('cancel-delete-button');
    if(cancelDeleteButton) {
        cancelDeleteButton.addEventListener('click', closeDeleteConfirmModal);
    }

    // Lógica específica para a página de Dashboard
    if (currentPage === 'dashboard.html') {
        loadDashboardData();
        loadDashboardStatsAndCharts();
    }
});

// --- Funções da Página de Dashboard ---

async function loadDashboardStatsAndCharts() {
    try {
        const stats = await api.get('/dashboard/stats');

        document.getElementById('stats-pending-feedbacks').textContent = stats.feedbacksAbertos;
        document.getElementById('stats-average-rating').textContent = stats.mediaAvaliacoes.toFixed(1);
        document.getElementById('stats-colleagues').textContent = stats.colegasEquipe;

    } catch (error) {
        console.error('Erro ao carregar estatísticas do dashboard:', error);
        showNotification('Não foi possível carregar as estatísticas.', 'error');
    }

    // TODO: Implementar a busca de dados para os gráficos
    const competenciasData = {
        labels: ['Comunicação', 'Proatividade', 'Colaboração', 'Liderança', 'Inovação'],
        datasets: [{
            label: 'Pontuação Média',
            data: [0, 0, 0, 0, 0],
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
        }]
    };

    const evolucaoData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [{
            label: 'Sua Evolução',
            data: [0, 0, 0, 0, 0, 0],
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1
        }]
    };

    const competenceCtx = document.getElementById('competence-chart')?.getContext('2d');
    if (competenceCtx) {
        new Chart(competenceCtx, {
            type: 'bar',
            data: competenciasData,
            options: { scales: { y: { beginAtZero: true, max: 10 } }, plugins: { legend: { display: false } } }
        });
    }

    const evolutionCtx = document.getElementById('evolution-chart')?.getContext('2d');
    if (evolutionCtx) {
        new Chart(evolutionCtx, {
            type: 'line',
            data: evolucaoData,
            options: { plugins: { legend: { display: false } } }
        });
    }
}


/**
 * Carrega os dados de feedbacks recebidos e enviados e os renderiza no dashboard.
 */
async function loadDashboardData() {
    showLoader();
    try {
        // Busca os feedbacks recebidos e enviados em paralelo para otimizar o carregamento
        const [receivedResponse, sentResponse] = await Promise.all([
            api.getFeedbacks('received'),
            api.getFeedbacks('sent')
        ]);

        // Acessa a propriedade 'data' da resposta da API
        const receivedFeedbacks = receivedResponse;
        const sentFeedbacks = sentResponse;

        renderFeedbacks('received-feedbacks-container', receivedFeedbacks, 'received');
        renderFeedbacks('sent-feedbacks-container', sentFeedbacks, 'sent');

    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        showNotification('Não foi possível carregar os feedbacks. Tente novamente mais tarde.', 'error');
    } finally {
        hideLoader();
    }
}

/**
 * Renderiza uma lista de feedbacks em um contêiner específico.
 * @param {string} containerId - O ID do elemento contêiner.
 * @param {Array} feedbacks - A lista de feedbacks a ser renderizada.
 * @param {string} type - O tipo de feedback ('received' ou 'sent').
 */
function renderFeedbacks(containerId, feedbacks, type) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ''; // Limpa o conteúdo existente

    if (!feedbacks || feedbacks.length === 0) {
        container.innerHTML = `<p class="text-gray-500">Nenhum feedback para exibir aqui.</p>`;
        return;
    }

    const feedbackList = document.createElement('div');
    feedbackList.className = 'space-y-4';

    feedbacks.forEach(fb => {
        const authorName = fb.isAnonymous ? 'Anônimo' : (fb.autor?.nome || 'Usuário desconhecido');
        const evaluatedName = fb.avaliado?.nome || 'Usuário desconhecido';
        const title = type === 'received' ? `Feedback de ${authorName}` : `Feedback para ${evaluatedName}`;

        const statusClasses = {
            PENDENTE: 'bg-yellow-100 text-yellow-800',
            EM_ANALISE: 'bg-blue-100 text-blue-800',
            CONCLUIDO: 'bg-green-100 text-green-800',
            REJEITADO: 'bg-red-100 text-red-800'
        };

        const typeClasses = {
            ELOGIO: 'bg-green-100 text-green-800',
            SUGESTAO: 'bg-purple-100 text-purple-800',
            CRITICA: 'bg-orange-100 text-orange-800'
        };

        const feedbackCard = document.createElement('div');
        feedbackCard.className = 'border border-gray-200 rounded-lg p-4';
        feedbackCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-gray-800">${fb.titulo}</h4>
                    <p class="text-sm text-gray-600">${title}</p>
                </div>
                <div class="flex items-center space-x-2">
                     <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${typeClasses[fb.tipo] || 'bg-gray-100 text-gray-800'}">${fb.tipo}</span>
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[fb.status] || 'bg-gray-100 text-gray-800'}">${fb.status.replace('_', ' ')}</span>
                </div>
            </div>
            <p class="text-gray-700 mt-2">${fb.descricao}</p>
            ${fb.observacao ? `<div class="mt-3 p-2 bg-gray-50 border-l-4 border-gray-300"><p class="text-sm text-gray-600 font-semibold">Observação do Gestor:</p><p class="text-sm text-gray-600">${fb.observacao}</p></div>` : ''}
            <div class="text-right text-xs text-gray-400 mt-2">${new Date(fb.createdAt).toLocaleDateString('pt-BR')}</div>
        `;
        feedbackList.appendChild(feedbackCard);
    });

    container.appendChild(feedbackList);
}

// --- Funções Específicas de Página ---

function populateProfileData() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (!userData) {
        console.error('Dados do usuário não encontrados para popular o perfil.');
        return;
    }

    // Função auxiliar para formatar datas (ex: '2023-10-27T10:00:00.000Z' -> '27/10/2023')
    const formatDate = (dateString) => {
        if (!dateString) return 'Não informado';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
        } catch (e) {
            return 'Data inválida';
        }
    };

    // Mapeamento de IDs para os dados do usuário
    const profileFields = {
        'profile-name': userData.name,
        'profile-job-title': userData.jobTitle || 'Cargo não definido',
        'userRole': userData.cargo || 'Perfil não definido',
        'profile-email': userData.email,
        'profile-department': userData.department || 'Departamento não informado',
        'profile-admission-date': formatDate(userData.admissionDate),
        'profile-status': userData.status || 'Status não informado'
    };

    for (const id in profileFields) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = profileFields[id];
        } else {
            console.warn(`Elemento com id '${id}' não encontrado na página de perfil.`);
        }
    }
}

// Função para renderizar o relatório geral
async function renderGeneralReport() {
    const reportContainer = document.getElementById('general-report-container');
    if (!reportContainer) return;

    try {
        const response = await api.getGeneralReport();
        const report = response.data; // Extrai os dados da propriedade 'data'

        reportContainer.innerHTML = ''; // Limpa o container

        if (!report) {
            reportContainer.innerHTML = '<p class="text-gray-500">Não há dados de relatório para exibir.</p>';
            return;
        }

        const title = document.createElement('h3');
        title.className = 'text-xl font-bold text-gray-800 mb-4';
        title.textContent = 'Visão Geral dos Feedbacks';
        reportContainer.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4';

        // Card para total de feedbacks
        const totalCard = document.createElement('div');
        totalCard.className = 'bg-white p-4 rounded-lg shadow';
        totalCard.innerHTML = `<h4 class="text-gray-500">Total de Feedbacks</h4><p class="text-2xl font-bold">${report.totalFeedbacks || 0}</p>`;
        grid.appendChild(totalCard);

        // Cards para status
        if (report.feedbacksByStatus) {
            report.feedbacksByStatus.forEach(item => {
                const card = document.createElement('div');
                card.className = 'bg-white p-4 rounded-lg shadow';
                card.innerHTML = `<h4 class="text-gray-500">${item.status.replace('_', ' ')}</h4><p class="text-2xl font-bold">${item._count.status}</p>`;
                grid.appendChild(card);
            });
        }

        reportContainer.appendChild(grid);

    } catch (error) {
        console.error('Erro ao renderizar relatório geral:', error);
        reportContainer.innerHTML = '<p class="text-red-500">Não foi possível carregar o relatório geral.</p>';
    }
}

// Função para renderizar o relatório de engajamento
async function renderEngagementReport() {
    const engagementContainer = document.getElementById('engagement-report-container');
    if (!engagementContainer) return;

    try {
        const users = await api.getEngagementReport();

        engagementContainer.innerHTML = ''; // Limpa o container

        const title = document.createElement('h3');
        title.className = 'text-xl font-bold text-gray-800 mb-4 mt-8';
        title.textContent = 'Top 10 Usuários Mais Engajados (Feedbacks Enviados)';
        engagementContainer.appendChild(title);

        const list = document.createElement('ul');
        list.className = 'bg-white p-4 rounded-lg shadow divide-y divide-gray-200';

        if (!users || users.length === 0) {
            list.innerHTML = '<li class="text-gray-500">Nenhum dado de engajamento disponível.</li>';
        } else {
            users.forEach(user => {
                const item = document.createElement('li');
                item.className = 'flex justify-between items-center py-3';
                item.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${user.nome}</p>
                        <p class="text-sm text-gray-500">${user.email}</p>
                    </div>
                    <span class="font-bold text-lg text-indigo-600">${user._count.feedbacks}</span>`;
                list.appendChild(item);
            });
        }

        engagementContainer.appendChild(list);

    } catch (error) {
        console.error('Erro ao renderizar relatório de engajamento:', error);
        engagementContainer.innerHTML = '<p class="text-red-500">Não foi possível carregar o relatório de engajamento.</p>';
    }
}

// --- Funções Auxiliares (não precisam estar no DOMContentLoaded) ---

/**
 * Valida um formulário com base em um conjunto de regras.
 * @param {HTMLFormElement} form - O elemento do formulário.
 * @param {object} fields - Um objeto onde as chaves são os `name` dos inputs e os valores são regras.
 * @returns {{isValid: boolean, data: object}} - Retorna um objeto com o status da validação e os dados do formulário.
 */
function validateForm(form, fields) {
    const data = {};
    let isValid = true;

    // Limpa erros antigos
    form.querySelectorAll('.error-message').forEach(el => el.textContent = '');

    for (const fieldName in fields) {
        const rules = fields[fieldName];
        const input = form.elements[fieldName];
        const errorEl = document.getElementById(`${fieldName}-error`);

        if (!input) continue;

        const value = input.value.trim();
        data[fieldName] = value;

        if (rules.required && value === '') {
            isValid = false;
            if (errorEl) {
                errorEl.textContent = rules.message || `O campo ${fieldName} é obrigatório.`;
            }
        }
    }

    return { isValid, data };
}

/**
 * Aplica as permissões de visualização aos elementos da página.
 * Esta função verifica o perfil do usuário logado e oculta os links de navegação
 * para os quais o usuário não tem permissão, com base no atributo `data-permission`.
 */
function applyPermissions() {
    const userData = JSON.parse(localStorage.getItem('userData'));
    const userRole = userData ? userData.cargo : null;

    // Se não houver perfil, não faz nada (a proteção de página já deve ter redirecionado)
    if (!userRole) {
        return;
    }

    // Seleciona todos os links de navegação que possuem o atributo `data-permission`
    const navLinks = document.querySelectorAll('nav a[data-permission]');

    navLinks.forEach(link => {
        const requiredPermissions = link.dataset.permission.split(',');

        // Oculta o link se o perfil do usuário não estiver na lista de permissões
        if (!requiredPermissions.includes(userRole)) {
            link.style.display = 'none';
        }
    });
}

// Navegação
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
    showNotification('Você foi desconectado com sucesso!', 'info');
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

  // Função para exportar dados dos usuários
  function exportUsers() {
    if (!checkPermission('all')) {
      showNotification('Acesso negado. Apenas administradores podem exportar dados.', 'error');
      return;
    }
    
    const visibleRows = document.querySelectorAll('tbody tr:not([style*="display: none"])');
    let csvContent = 'Nome,Email,Perfil,Departamento,Status,Último Acesso\n';
    
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
    
    showNotification('Exportação realizada com sucesso!', 'success');
  }

  // Sistema de notificações
  function showNotification(message, type = 'info') {
    // Remover notificações existentes
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Criar nova notificação
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full`;
    
    let bgColor, textColor, icon;
    
    switch(type) {
      case 'success':
        bgColor = 'bg-green-500';
        textColor = 'text-white';
        icon = '✓';
        break;
      case 'error':
        bgColor = 'bg-red-500';
        textColor = 'text-white';
        icon = '✗';
        break;
      case 'warning':
        bgColor = 'bg-yellow-500';
        textColor = 'text-white';
        icon = '⚠';
        break;
      default:
        bgColor = 'bg-blue-500';
        textColor = 'text-white';
        icon = 'ℹ';
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
    
    // Auto-remover após 5 segundos
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

  // --- Funções de Loader ---

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
 * Exibe um modal de confirmação genérico.
 * @param {string} title - O título do modal.
 * @param {string} message - A mensagem de confirmação.
 * @param {function} onConfirm - A função a ser executada se o usuário confirmar.
 */
function showConfirmationModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmation-modal');
    if (!modal) {
        console.error('Modal de confirmação não encontrado no DOM.');
        return;
    }

    const modalTitle = document.getElementById('confirmation-modal-title');
    const modalMessage = document.getElementById('confirmation-modal-message');
    const confirmButton = document.getElementById('confirmation-modal-confirm-button');
    const cancelButton = document.getElementById('confirmation-modal-cancel-button');

    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Remove event listeners antigos para evitar múltiplas execuções
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
 * Oculta o modal de confirmação.
 */
function hideConfirmationModal() {
    const modal = document.getElementById('confirmation-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// --- Funções da Página de Cadastro ---

/**
 * Busca as equipes da API e popula o dropdown de departamentos no formulário de cadastro.
 */
async function populateTeamsDropdown() {
    const departmentSelect = document.getElementById('departamento');
    if (!departmentSelect) return;

    try {
        const teams = await api.getTeams(); // Usa a função existente em api.js
        departmentSelect.innerHTML = '<option value="">Selecione um departamento</option>'; // Opção padrão

        teams.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id; // O valor será o ID da equipe
            option.textContent = team.nome; // O texto será o nome da equipe
            departmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar departamentos:', error);
        departmentSelect.innerHTML = '<option value="">Não foi possível carregar os departamentos</option>';
    }
}

// --- Funções da Página de Administração ---

// Variáveis globais para armazenar dados da página de admin
let adminUsers = [];
let adminTeams = [];

// Adiciona os event listeners para os elementos da página de admin
function setupAdminEventListeners() {
    // Botões e formulários de Equipes
    document.getElementById('add-team-button')?.addEventListener('click', () => openTeamModal());
    document.getElementById('team-form')?.addEventListener('submit', saveTeam);
    document.getElementById('cancel-team-modal')?.addEventListener('click', () => closeTeamModal());

    // Botões e formulários de Usuários
    document.getElementById('add-user-button')?.addEventListener('click', () => openUserModal());
    document.getElementById('user-form')?.addEventListener('submit', saveUser);
    document.getElementById('cancel-user-modal')?.addEventListener('click', () => closeUserModal());
}

// Funções de renderização

async function renderUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    showLoader();
    try {
        adminUsers = await api.get('/admin/users');
        tableBody.innerHTML = '';
        if (adminUsers.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4">Nenhum usuário encontrado.</td></tr>';
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
        showNotification('Falha ao carregar usuários.', 'error');
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

// Funções de CRUD para Equipes

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
    showConfirmationModal('Confirmar Remoção', 'Tem certeza que deseja remover esta equipe?', async () => {
        try {
            await api.del(`/admin/teams/${teamId}`);
            showNotification('Equipe removida com sucesso!', 'success');
            renderTeamsTable();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// Funções de CRUD para Usuários

function openUserModal(userId = null) {
    const form = document.getElementById('user-form');
    const modalTitle = document.getElementById('user-modal-title');
    form.reset();
    document.getElementById('userId').value = '';
    document.getElementById('user-password').parentElement.style.display = 'block';

    if (userId) {
        const user = adminUsers.find(u => u.id === userId);
        if (!user) return;
        modalTitle.textContent = 'Editar Usuário';
        document.getElementById('userId').value = user.id;
        document.getElementById('user-name').value = user.nome;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-jobtitle').value = user.jobTitle;
        document.getElementById('user-role').value = user.cargo;
        document.getElementById('user-team').value = user.equipeId || '';
        document.getElementById('user-status').value = user.status;
        document.getElementById('user-password').parentElement.style.display = 'none'; // Não se edita senha aqui
    } else {
        modalTitle.textContent = 'Adicionar Novo Usuário';
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

    if (userId) delete data.senha; // Não enviar senha em branco na atualização

    const url = userId ? `/admin/users/${userId}` : '/admin/users';
    const method = userId ? 'PUT' : 'POST';

    try {
        await api.request(url, { method, data });
        showNotification(`Usuário ${userId ? 'atualizado' : 'criado'} com sucesso!`, 'success');
        closeUserModal();
        renderUsersTable();
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

function deleteUser(userId) {
    showConfirmationModal('Confirmar Remoção', 'Tem certeza que deseja remover este usuário?', async () => {
        try {
            await api.del(`/admin/users/${userId}`);
            showNotification('Usuário removido com sucesso!', 'success');
            renderUsersTable();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    });
}

// Funções auxiliares
function populateTeamSelect() {
    const select = document.getElementById('user-team');
    if (!select) return;
    select.innerHTML = '<option value="">Sem Equipe</option>'; // Opção padrão
    adminTeams.forEach(team => {
        const option = document.createElement('option');
        option.value = team.id;
        option.textContent = team.nome;
        select.appendChild(option);
    });
}