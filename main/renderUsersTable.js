/**
 * Renderiza a tabela de usuários com paginação, ordenação e filtros
 * @param {Array} [users=null] - Lista de usuários (opcional, busca do servidor se não fornecido)
 */
async function renderUsersTable(users = null) {
    const tableBody = document.getElementById('users-table-body');
    const paginationContainer = document.getElementById('users-pagination');
    const searchInput = document.getElementById('users-search');
    const statusFilter = document.getElementById('users-status-filter');
    const teamFilter = document.getElementById('users-team-filter');
    
    if (!tableBody) return;

    // Função para mostrar estado de carregamento
    const showLoadingState = () => {
        // Adicionar classe de transição suave
        tableBody.style.transition = 'opacity 200ms ease-in-out';
        tableBody.style.opacity = '0.7';
        
        // Criar elemento de carregamento
        const loadingHtml = `
            <tr class="table-loader">
                <td colspan="5" class="text-center py-12">
                    <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600"></div>
                        <p class="text-gray-600 font-medium">Carregando usuários...</p>
                        <p class="text-sm text-gray-400">Isso pode levar alguns instantes</p>
                    </div>
                </td>
            </tr>`;
        
        // Manter o conteúdo existente, mas adicionar o loader por cima
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
    
    try {
        // Buscar usuários se não foram fornecidos
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
        
        // Ordenação
        filteredUsers.sort((a, b) => {
            let aValue = a[sortConfig.key];
            let bValue = b[sortConfig.key];
            
            // Tratamento para ordenação de valores aninhados
            if (sortConfig.key === 'equipe') {
                aValue = a.equipe?.nome || '';
                bValue = b.equipe?.nome || '';
            }
            
            // Converter para string para garantir comparação
            aValue = String(aValue || '').toLowerCase();
            bValue = String(bValue || '').toLowerCase();
            
            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Paginação
        const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
        currentPage = Math.min(Math.max(1, currentPage), totalPages || 1);
        const startIndex = (currentPage - 1) * itemsPerPage;
        const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);
        
        // Renderizar tabela
        tableBody.innerHTML = '';
        
        if (paginatedUsers.length === 0) {
            const noResultsMessage = filteredUsers.length === 0 && adminUsers.length > 0 
                ? 'Nenhum usuário encontrado com os filtros atuais.' 
                : 'Nenhum usuário cadastrado.';
                
            const noResultsHtml = `
                <tr>
                    <td colspan="5" class="text-center py-8 text-gray-500">
                        <div class="flex flex-col items-center">
                            <i class="fas fa-users-slash text-4xl text-gray-300 mb-2"></i>
                            <p>${noResultsMessage}</p>
                            ${filteredUsers.length === 0 && adminUsers.length > 0 ? 
                                '<button onclick="resetFilters()" class="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium">Limpar filtros</button>' : ''
                            }
                        </div>
                    </td>
                </tr>`;
            tableBody.innerHTML = noResultsHtml;
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
                                title="Editar usuário">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteUser('${user.id}', this)" 
                                class="text-red-600 hover:text-red-900 hover:bg-red-50 px-2 py-1 rounded"
                                title="Remover usuário">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>`;
                tableBody.appendChild(row);
            });
        }
        
        // Atualizar controles de paginação
        updatePaginationControls(filteredUsers.length);
        
        // Atualizar contador de resultados
        updateResultsCounter(filteredUsers.length, adminUsers.length);
        
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        let errorMessage = 'Falha ao carregar usuários.';
        let showRetry = true;
        let redirectToLogin = false;
        
        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Sessão expirada. Redirecionando para login...';
                showRetry = false;
                redirectToLogin = true;
            } else if (error.response.status === 403) {
                errorMessage = 'Você não tem permissão para visualizar usuários.';
            } else if (error.response.status === 404) {
                errorMessage = 'Recurso não encontrado. Por favor, recarregue a página.';
            } else if (error.response.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.response.status >= 500) {
                errorMessage = 'Erro no servidor. Por favor, tente novamente mais tarde.';
            }
        } else if (error.request) {
            errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão com a internet.';
        }
        
        // Usar a função de notificação global se disponível
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
            
        // Redirecionar para login se necessário
        if (redirectToLogin) {
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    } finally {
        // Restaurar opacidade e remover loaders
        if (tableBody) {
            tableBody.style.opacity = '1';
            
            // Remover loaders locais
            const loaders = tableBody.querySelectorAll('.table-loader');
            loaders.forEach(loader => loader.remove());
        }
        
        // Esconder loader global
        hideLoader();
        
        // Melhorar acessibilidade removendo foco de elementos temporários
        const activeElement = document.activeElement;
        if (activeElement?.blur && 
            (activeElement.tagName === 'BUTTON' || activeElement.tagName === 'A' || 
             activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
            activeElement.blur();
        }
    }
}
