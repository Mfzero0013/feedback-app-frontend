// Função para exibir notificações na interface
function showNotification(message, type = 'info') {
    // Verifica se já existe um container de notificações
    let container = document.getElementById('notification-container');
    if (!container) {
        // Cria o container de notificações se não existir
        container = document.createElement('div');
        container.id = 'notification-container';
        container.className = 'fixed top-4 right-4 z-50 w-80 space-y-2';
        document.body.appendChild(container);
    }

    // Cria o elemento da notificação
    const notification = document.createElement('div');
    const colors = {
        success: 'bg-green-100 border-green-400 text-green-700',
        error: 'bg-red-100 border-red-400 text-red-700',
        warning: 'bg-yellow-100 border-yellow-400 text-yellow-700',
        info: 'bg-blue-100 border-blue-400 text-blue-700'
    };

    notification.className = `border-l-4 p-4 rounded shadow-lg ${colors[type] || colors.info} mb-2`;
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="flex-shrink-0">
                ${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}
            </div>
            <div class="ml-3">
                <p class="text-sm font-medium">${message}</p>
            </div>
            <div class="ml-auto pl-3">
                <button class="text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.parentElement.remove()">
                    &times;
                </button>
            </div>
        </div>
    `;

    // Adiciona a notificação ao container
    container.appendChild(notification);

    // Remove a notificação após 5 segundos
    setTimeout(() => {
        if (notification.parentNode) {
            notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}

// Testa a conexão com a API
async function testAPIConnection() {
    try {
        console.log('Testando conexão com a API...');
        
        // Tenta primeiro o endpoint de health
        try {
            const healthResponse = await fetch('https://feedback-app-backend-x87n.onrender.com/api/health');
            if (healthResponse.ok) {
                const data = await healthResponse.json();
                console.log('Conexão com a API bem-sucedida (health endpoint):', data);
                return true;
            }
        } catch (healthError) {
            console.log('Endpoint de health não disponível, tentando endpoint alternativo...', healthError);
        }
        
        // Se o endpoint de health falhar, tenta um endpoint principal
        try {
            const response = await fetch('https://feedback-app-backend-x87n.onrender.com/api/auth/check', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
                }
            });
            
            // Se a resposta for 401, o token pode ter expirado, mas a API está acessível
            if (response.status === 401) {
                console.log('API acessível, mas token inválido/expirou');
                return true;
            }
            
            if (!response.ok) {
                throw new Error(`Erro na resposta da API: ${response.status} ${response.statusText}`);
            }
            
            console.log('Conexão com a API bem-sucedida (endpoint alternativo)');
            return true;
            
        } catch (altError) {
            console.error('Erro ao conectar com o endpoint alternativo da API:', altError);
            throw new Error('Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.');
        }
        
    } catch (error) {
        console.error('Erro ao testar conexão com a API:', error);
        showNotification(error.message || 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.', 'error');
        return false;
    }
}

// Função assíncrona para inicialização do formulário
const initializeFeedbackForm = async () => {
    console.log('DOM totalmente carregado');
    
    try {
        // Testa a conexão com a API antes de continuar
        const isAPIAvailable = await testAPIConnection();
        if (!isAPIAvailable) {
            console.error('API não está disponível');
            return; // Para a execução se a API não estiver disponível
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('userId');
        const feedbackForm = document.getElementById('feedbackForm');

        if (userId) {
            await loadFeedbackHistory(userId);
        } else if (feedbackForm) {
            await setupFeedbackForm();
        } else {
            console.error('Elemento do formulário não encontrado');
            showNotification('Erro ao carregar o formulário. Por favor, recarregue a página.', 'error');
        }
    } catch (error) {
        console.error('Erro na inicialização do formulário:', error);
        showNotification('Ocorreu um erro ao carregar o formulário. Por favor, recarregue a página.', 'error');
    }
};

// Inicializa o formulário quando o DOM estiver pronto
// Inicializa o formulário quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    initializeFeedbackForm().catch(error => {
        console.error('Erro na inicialização do formulário:', error);
        showNotification('Ocorreu um erro ao carregar o formulário. Por favor, recarregue a página.', 'error');
    });
});

function getClassificacaoBadge(classificacao) {
    const colors = {
        'OTIMO': 'bg-green-100 text-green-800',
        'MEDIA': 'bg-yellow-100 text-yellow-800',
        'RUIM': 'bg-red-100 text-red-800',
    };
    const defaultColor = 'bg-gray-100 text-gray-800';
    const text = classificacao || 'N/A';
    const colorClass = colors[classificacao] || defaultColor;
    return `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClass}">${text}</span>`;
}

async function loadFeedbackHistory(userId) {
    const pageTitle = document.getElementById('pageTitle');
    const feedbackForm = document.getElementById('feedbackForm');
    const historySection = document.getElementById('feedbackHistory');
    const historyBody = document.getElementById('feedback-history-body');

    pageTitle.textContent = 'Histórico de Feedbacks Recebidos';
    feedbackForm.classList.add('hidden');
    historySection.classList.remove('hidden');
    historyBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Carregando histórico...</td></tr>';

    try {
        const feedbacks = await api.getFeedbacksForUser(userId);
        if (feedbacks && feedbacks.length > 0) {
            historyBody.innerHTML = '';
            feedbacks.forEach(fb => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="px-6 py-4 whitespace-nowrap">${new Date(fb.createdAt).toLocaleDateString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${getClassificacaoBadge(fb.classificacao)}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${fb.nota || 'N/A'}</td>
                    <td class="px-6 py-4">${fb.descricao}</td>
                `;
                historyBody.appendChild(row);
            });
        } else {
            historyBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Nenhum feedback encontrado para este usuário.</td></tr>';
        }
    } catch (error) {
        console.error('Erro ao carregar histórico de feedbacks:', error);
        historyBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-red-500">Falha ao carregar o histórico.</td></tr>';
    }
}

async function setupFeedbackForm() {
    console.log('Iniciando setupFeedbackForm...');
    const feedbackForm = document.getElementById('feedbackForm');
    const avaliadoIdSelect = document.getElementById('avaliadoId');
    
    // Verificação inicial dos elementos do DOM
    if (!feedbackForm) {
        const errorMsg = 'Formulário de feedback não encontrado no DOM';
        console.error(errorMsg);
        showNotification('Erro ao carregar o formulário. Por favor, recarregue a página.', 'error');
        return;
    }
    
    if (!avaliadoIdSelect) {
        const errorMsg = 'Elemento avaliadoId não encontrado no DOM';
        console.error(errorMsg);
        showNotification('Erro ao carregar a lista de colaboradores. Por favor, recarregue a página.', 'error');
        return;
    }
    
    // Verifica se o usuário está autenticado
    console.log('Verificando autenticação do usuário...');
    const authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    // Log detalhado para depuração
    console.log('Dados de autenticação - authToken:', authToken ? 'presente' : 'ausente');
    console.log('Dados de autenticação - userData:', userData ? 'presente' : 'ausente');
    
    // Verifica se os dados de autenticação estão presentes
    if (!authToken || !userData) {
        const errorMsg = 'Usuário não autenticado. Dados de autenticação ausentes.';
        console.error(errorMsg);
        showNotification('Sessão expirada. Por favor, faça login novamente.', 'error');
        
        // Redireciona após um pequeno atraso para o usuário ver a mensagem
        setTimeout(() => {
            console.log('Redirecionando para a página de login...');
            window.location.href = 'index.html';
        }, 2000);
        return;
    }
    
    // Tenta fazer o parse dos dados do usuário
    let currentUser;
    try {
        console.log('Analisando dados do usuário...');
        currentUser = JSON.parse(userData);
        
        // Validação básica dos dados do usuário
        if (!currentUser || typeof currentUser !== 'object' || !currentUser.id) {
            throw new Error('Dados do usuário inválidos ou incompletos');
        }
        
        console.log('Usuário atual carregado com sucesso:', {
            id: currentUser.id,
            nome: currentUser.nome || 'Não informado',
            email: currentUser.email || 'Não informado',
            role: currentUser.role || 'Não informado'
        });
        
    } catch (error) {
        const errorMsg = `Erro ao analisar dados do usuário: ${error.message}`;
        console.error(errorMsg, error);
        
        // Limpa os dados inválidos
        localStorage.removeItem('userData');
        
        showNotification('Erro ao carregar os dados do usuário. Por favor, faça login novamente.', 'error');
        
        // Redireciona para o login
        setTimeout(() => {
            console.log('Redirecionando para a página de login...');
            window.location.href = 'index.html';
        }, 2000);
        return;
    }

    const loadUsers = async () => {
        console.log('Iniciando carregamento de usuários...');
        
        // Verifica se o elemento select existe
        if (!avaliadoIdSelect) {
            const errorMsg = 'Elemento select de colaboradores não encontrado no DOM';
            console.error(errorMsg);
            showNotification('Erro ao carregar a lista de colaboradores. Por favor, recarregue a página.', 'error');
            return;
        }
        
        // Cria mensagem de carregamento
        const loadingMessage = document.createElement('div');
        loadingMessage.id = 'loading-users-message';
        loadingMessage.textContent = 'Carregando colaboradores...';
        loadingMessage.className = 'text-gray-500 text-sm italic';
        
        try {
            console.log('Verificando elemento select...');
            if (!avaliadoIdSelect.parentNode) {
                throw new Error('Elemento pai do select de colaboradores não encontrado no DOM');
            }
            
            // Adiciona mensagem de carregamento
            console.log('Adicionando mensagem de carregamento...');
            avaliadoIdSelect.parentNode.insertBefore(loadingMessage, avaliadoIdSelect.nextSibling);
            
            // Mostra um indicador de carregamento no select
            avaliadoIdSelect.innerHTML = '<option value="">Carregando colaboradores...</option>';
            avaliadoIdSelect.disabled = true;
            
            console.log('Buscando usuários da API...');
            console.log('Token de autenticação:', localStorage.getItem('authToken') ? 'presente' : 'ausente');
            
            // Adiciona um pequeno atraso para garantir que a UI seja atualizada
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const users = await api.getUsers();
            console.log('Resposta da API - Usuários recebidos:', users ? users.length : 0, 'usuários');
            
            // Limpa o select
            console.log('Limpando select de colaboradores...');
            avaliadoIdSelect.innerHTML = '<option value="">Selecione um colaborador...</option>';
            
            if (users && Array.isArray(users) && users.length > 0) {
                console.log(`Adicionando ${users.length} usuários ao select...`);
                
                let usersAdded = 0;
                users.forEach(user => {
                    try {
                        if (!user || typeof user !== 'object') {
                            console.warn('Item inválido na lista de usuários:', user);
                            return;
                        }
                        
                        if (user.id !== currentUser.id) {
                            const option = document.createElement('option');
                            option.value = user.id;
                            option.textContent = user.nome || `Usuário ${user.id}`;
                            avaliadoIdSelect.appendChild(option);
                            usersAdded++;
                        }
                    } catch (userError) {
                        console.error('Erro ao processar usuário:', user, userError);
                    }
                });
                
                console.log(`${usersAdded} usuários adicionados com sucesso ao select`);
                
                if (usersAdded === 0) {
                    const option = document.createElement('option');
                    option.value = '';
                    option.textContent = 'Nenhum colaborador disponível';
                    option.disabled = true;
                    avaliadoIdSelect.appendChild(option);
                }
            } else {
                console.warn('Nenhum usuário retornado pela API ou formato inválido:', users);
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Nenhum colaborador disponível';
                option.disabled = true;
                avaliadoIdSelect.appendChild(option);
                
                showNotification('Nenhum colaborador encontrado para receber feedback.', 'warning');
            }
            
            // Remove a mensagem de carregamento
            if (loadingMessage.parentNode) {
                loadingMessage.parentNode.removeChild(loadingMessage);
            }
            
            // Habilita o select
            avaliadoIdSelect.disabled = false;
            
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            
            // Remove a mensagem de carregamento se ainda existir
            if (loadingMessage.parentNode) {
                loadingMessage.parentNode.removeChild(loadingMessage);
            }
            
            // Exibe mensagem de erro no select
            avaliadoIdSelect.innerHTML = '';
            const errorOption = document.createElement('option');
            errorOption.value = '';
            
            // Mensagem de erro mais descritiva
            let errorMessage = 'Erro ao carregar colaboradores';
            if (error.message.includes('401') || error.message.includes('não autenticado') || error.message.includes('Sessão expirada')) {
                errorMessage = 'Sessão expirada. Redirecionando...';
            } else if (error.message.includes('rede') || error.message.includes('NetworkError')) {
                errorMessage = 'Erro de conexão. Verifique sua internet.';
            }
            
            errorOption.textContent = errorMessage;
            errorOption.disabled = true;
            avaliadoIdSelect.appendChild(errorOption);
            
            // Exibe notificação de erro para o usuário
            showNotification(`Erro: ${errorMessage}`, 'error');
            
            // Se for erro de autenticação, redireciona para o login
            if (error.message.includes('Sessão expirada') || error.message.includes('401') || 
                error.message.includes('não autenticado') || error.message.includes('token')) {
                console.log('Redirecionando para login devido a erro de autenticação...');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
            
            // Remove a mensagem de carregamento se ainda estiver presente
            if (loadingMessage.parentNode) {
                console.log('Removendo mensagem de carregamento...');
                loadingMessage.parentNode.removeChild(loadingMessage);
            }
        } // Fecha o bloco catch
    }; // Fecha a função loadUsers

    // Chama a função para carregar os usuários
    loadUsers();

    const validateField = (field, errorField, message) => {
        if (!field.value.trim()) {
            errorField.textContent = message;
            if (field.nodeName !== 'INPUT' || field.type !== 'radio') {
                field.classList.add('border-red-500');
            }
            return false;
        }
        errorField.textContent = '';
        if (field.nodeName !== 'INPUT' || field.type !== 'radio') {
            field.classList.remove('border-red-500');
        }
        return true;
    };

    const validateRadioGroup = (groupName, errorField, message) => {
        const selected = document.querySelector(`input[name="${groupName}"]:checked`);
        if (!selected) {
            errorField.textContent = message;
            return false;
        }
        errorField.textContent = '';
        return true;
    };

    const validateForm = () => {
        console.log('Iniciando validação do formulário...');
        
        // Elementos do formulário
        const avaliadoId = document.getElementById('avaliadoId');
        const titulo = document.getElementById('titulo');
        const classificacao = document.querySelector('input[name="classificacao"]:checked');
        const nota = document.getElementById('nota');
        const descricao = document.getElementById('descricao');
        
        // Limpa mensagens de erro e estilos anteriores
        document.querySelectorAll('p[id$="-error"]').forEach(el => el.textContent = '');
        document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
        document.getElementById('flag-container')?.classList.remove('border', 'border-red-500', 'p-2', 'rounded-lg');
        
        let isValid = true;
        
        // Validação do campo avaliadoId
        if (!avaliadoId || !avaliadoId.value) {
            console.log('Validação falhou: Nenhum colaborador selecionado');
            const errorElement = document.getElementById('avaliadoId-error') || document.createElement('div');
            errorElement.textContent = 'Selecione um colaborador.';
            errorElement.className = 'text-red-500 text-sm mt-1';
            errorElement.id = 'avaliadoId-error';
            
            if (avaliadoId) {
                avaliadoId.classList.add('border-red-500');
                avaliadoId.parentNode.insertBefore(errorElement, avaliadoId.nextSibling);
            }
            
            isValid = false;
        }
        
        // Validação do campo título
        if (!titulo || !titulo.value.trim()) {
            console.log('Validação falhou: Título não preenchido');
            const errorElement = document.getElementById('titulo-error') || document.createElement('div');
            errorElement.textContent = 'O título é obrigatório.';
            errorElement.className = 'text-red-500 text-sm mt-1';
            errorElement.id = 'titulo-error';
            
            if (titulo) {
                titulo.classList.add('border-red-500');
                titulo.parentNode.insertBefore(errorElement, titulo.nextSibling);
            }
            
            isValid = false;
        }
        
        // Validação da classificação
        const flagContainer = document.getElementById('flag-container');
        if (!classificacao && flagContainer) {
            console.log('Validação falhou: Nenhuma classificação selecionada');
            let errorElement = document.getElementById('classificacao-error');
            
            if (!errorElement) {
                errorElement = document.createElement('p');
                errorElement.id = 'classificacao-error';
                errorElement.className = 'text-red-500 text-sm mt-2';
                flagContainer.parentNode.insertBefore(errorElement, flagContainer.nextSibling);
            }
            
            errorElement.textContent = 'Selecione uma classificação.';
            flagContainer.classList.add('border', 'border-red-500', 'p-2', 'rounded-lg');
            
            // Rola até o primeiro erro
            if (!isValid) {
                flagContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            
            isValid = false;
        }
        
        // Validação opcional da nota (se preenchida)
        if (nota && nota.value.trim() && nota.value.trim().length > 500) {
            console.log('Validação falhou: Nota muito longa');
            const errorElement = document.getElementById('nota-error') || document.createElement('div');
            errorElement.textContent = 'A nota não pode ter mais de 500 caracteres.';
            errorElement.className = 'text-red-500 text-sm mt-1';
            errorElement.id = 'nota-error';
            
            nota.classList.add('border-red-500');
            nota.parentNode.insertBefore(errorElement, nota.nextSibling);
            
            isValid = false;
        }
        
        // Validação opcional da descrição (se preenchida)
        if (descricao && descricao.value.trim() && descricao.value.trim().length > 2000) {
            console.log('Validação falhou: Descrição muito longa');
            const errorElement = document.getElementById('descricao-error') || document.createElement('div');
            errorElement.textContent = 'A descrição não pode ter mais de 2000 caracteres.';
            errorElement.className = 'text-red-500 text-sm mt-1';
            errorElement.id = 'descricao-error';
            
            descricao.classList.add('border-red-500');
            descricao.parentNode.insertBefore(errorElement, descricao.nextSibling);
            
            isValid = false;
        }
        
        // Se houver erros, rola até o primeiro campo com erro
        if (!isValid) {
            const firstError = document.querySelector('.border-red-500, .text-red-500');
            if (firstError) {
                firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstError.focus?.();
            }
        }
        
        console.log('Validação do formulário concluída:', isValid ? 'VÁLIDO' : 'INVÁLIDO');
        return isValid;
    };

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('Formulário de feedback submetido');

        // Desabilita o botão de envio para evitar múltiplos envios
        const submitButton = feedbackForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

        try {
            // Valida o formulário
            if (!validateForm()) {
                console.log('Validação do formulário falhou');
                showNotification('Por favor, corrija os erros no formulário.', 'warning');
                return;
            }

            // Prepara os dados do formulário
            const formData = new FormData(feedbackForm);
            const feedbackData = {
                titulo: formData.get('titulo').trim(),
                avaliadoId: formData.get('avaliadoId'),
                classificacao: formData.get('classificacao'),
                isAnonymous: formData.get('isAnonymous') === 'on',
                // Campos opcionais
                ...(formData.get('nota')?.trim() && { nota: formData.get('nota').trim() }),
                ...(formData.get('descricao')?.trim() && { descricao: formData.get('descricao').trim() })
            };

            console.log('Dados do feedback a serem enviados:', JSON.stringify(feedbackData, null, 2));
            
            // Mostra indicador de carregamento
            showNotification('Enviando feedback...', 'info');
            
            // Envia para a API
            console.log('Enviando feedback para a API...');
            const response = await api.sendFeedback(feedbackData);
            console.log('Resposta da API:', response);
            
            // Sucesso
            showNotification('Feedback enviado com sucesso!', 'success');
            
            // Reseta o formulário
            feedbackForm.reset();
            document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
            document.querySelectorAll('p[id$="-error"]').forEach(el => el.textContent = '');
            
            // Foca no primeiro campo para um novo feedback
            document.getElementById('avaliadoId')?.focus();
            
        } catch (error) {
            console.error('Erro ao enviar feedback:', error);
            
            // Tratamento de erros específicos
            let errorMessage = 'Ocorreu um erro ao enviar o feedback.';
            
            if (error.response) {
                // Erro da API com resposta
                const apiError = error.response.data?.message || error.response.statusText;
                errorMessage = `Erro ${error.response.status}: ${apiError}`;
                
                // Tratamento para token expirado
                if (error.response.status === 401) {
                    errorMessage = 'Sua sessão expirou. Redirecionando para o login...';
                    setTimeout(() => window.location.href = 'index.html', 2000);
                }
            } else if (error.request) {
                // Erro de conexão
                errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
            } else {
                // Outros erros
                errorMessage = error.message || errorMessage;
            }
            
            console.error('Detalhes do erro:', errorMessage);
            showNotification(errorMessage, 'error');
            
        } finally {
            // Reativa o botão de envio independentemente do resultado
            submitButton.disabled = false;
            submitButton.innerHTML = originalButtonText;
        }
    });

    if (feedbackForm) {
        try {
            // Carrega a lista de usuários
            const users = await loadUsers();
            if (!users || users.length === 0) {
                console.warn('Nenhum usuário encontrado para feedback');
                showNotification('Nenhum colaborador disponível para receber feedback no momento.', 'warning');
            }
            
            // Adiciona validação em tempo real para os campos
            const titulo = document.getElementById('titulo');
            const nota = document.getElementById('nota');
            const descricao = document.getElementById('descricao');
            const classificacaoInputs = document.querySelectorAll('input[name="classificacao"]');
            
            // Validação em tempo real para o campo título
            if (titulo) {
                titulo.addEventListener('input', () => {
                    titulo.classList.remove('border-red-500');
                    const errorElement = document.getElementById('titulo-error');
                    if (errorElement) errorElement.textContent = '';
                });
            }
            
            // Validação em tempo real para o campo nota
            if (nota) {
                nota.addEventListener('input', () => {
                    nota.classList.remove('border-red-500');
                    const errorElement = document.getElementById('nota-error');
                    if (errorElement) errorElement.textContent = '';
                    
                    // Atualiza o contador de caracteres
                    const charCount = nota.value.length;
                    const maxLength = 500;
                    const counter = document.getElementById('nota-char-count') || document.createElement('small');
                    counter.id = 'nota-char-count';
                    counter.className = `block text-right text-xs mt-1 ${charCount > maxLength ? 'text-red-500' : 'text-gray-500'}`;
                    counter.textContent = `${charCount}/${maxLength} caracteres`;
                    
                    if (!nota.nextElementSibling || !nota.nextElementSibling.id.includes('char-count')) {
                        nota.parentNode.insertBefore(counter, nota.nextSibling);
                    }
                });
            }
            
            // Validação em tempo real para o campo descrição
            if (descricao) {
                descricao.addEventListener('input', () => {
                    descricao.classList.remove('border-red-500');
                    const errorElement = document.getElementById('descricao-error');
                    if (errorElement) errorElement.textContent = '';
                    
                    // Atualiza o contador de caracteres
                    const charCount = descricao.value.length;
                    const maxLength = 2000;
                    const counter = document.getElementById('descricao-char-count') || document.createElement('small');
                    counter.id = 'descricao-char-count';
                    counter.className = `block text-right text-xs mt-1 ${charCount > maxLength ? 'text-red-500' : 'text-gray-500'}`;
                    counter.textContent = `${charCount}/${maxLength} caracteres`;
                    
                    if (!descricao.nextElementSibling || !descricao.nextElementSibling.id.includes('char-count')) {
                        descricao.parentNode.insertBefore(counter, descricao.nextSibling);
                    }
                });
            }
            
            // Validação em tempo real para os botões de classificação
            classificacaoInputs.forEach(input => {
                input.addEventListener('change', () => {
                    const flagContainer = document.getElementById('flag-container');
                    if (flagContainer) {
                        flagContainer.classList.remove('border', 'border-red-500');
                    }
                    const errorElement = document.getElementById('classificacao-error');
                    if (errorElement) errorElement.textContent = '';
                });
            });
            
            // Foca no primeiro campo ao carregar a página
            const avaliadoId = document.getElementById('avaliadoId');
            if (avaliadoId) {
                avaliadoId.focus();
                
                // Adiciona validação em tempo real para o select de colaboradores
                avaliadoId.addEventListener('change', () => {
                    avaliadoId.classList.remove('border-red-500');
                    const errorElement = document.getElementById('avaliadoId-error');
                    if (errorElement) errorElement.textContent = '';
                });
            }
            
        } catch (error) {
            console.error('Erro ao carregar o formulário:', error);
            showNotification('Ocorreu um erro ao carregar o formulário. Por favor, recarregue a página.', 'error');
        }
    }
}
