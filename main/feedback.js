document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('userId');
    const feedbackForm = document.getElementById('feedbackForm');

    if (userId) {
        loadFeedbackHistory(userId);
    } else {
        setupFeedbackForm();
    }
});

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
                    <td class="px-6 py-4 whitespace-nowrap"><span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">${fb.tipo.nome}</span></td>
                    <td class="px-6 py-4 whitespace-nowrap">${fb.nota || 'N/A'}</td>
                    <td class="px-6 py-4">${fb.conteudo}</td>
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

function setupFeedbackForm() {
    const feedbackForm = document.getElementById('feedbackForm');
    const avaliadoIdSelect = document.getElementById('avaliadoId');
    const currentUser = JSON.parse(localStorage.getItem('userData'));

    const loadUsers = async () => {
        try {
            const users = await api.getUsers();
            avaliadoIdSelect.innerHTML = '<option value="">Selecione um colaborador...</option>';
            users.forEach(user => {
                if (user.id !== currentUser.id) {
                    const option = document.createElement('option');
                    option.value = user.id;
                    option.textContent = user.nome;
                    avaliadoIdSelect.appendChild(option);
                }
            });
        } catch (error) {
            console.error('Erro ao carregar usuários:', error);
            showNotification('Falha ao carregar a lista de colaboradores.', 'error');
        }
    };

    const validateField = (field, errorField, message) => {
        if (!field.value.trim()) {
            errorField.textContent = message;
            field.classList.add('border-red-500');
            return false;
        }
        errorField.textContent = '';
        field.classList.remove('border-red-500');
        return true;
    };

    const validateForm = () => {
        const validations = [
            validateField(document.getElementById('avaliadoId'), document.getElementById('avaliadoId-error'), 'Selecione um colaborador.'),
            validateField(document.getElementById('titulo'), document.getElementById('titulo-error'), 'O título é obrigatório.'),
            validateField(document.getElementById('tipo'), document.getElementById('tipo-error'), 'Selecione um tipo de feedback.'),
            validateField(document.getElementById('nota'), document.getElementById('nota-error'), 'A nota é obrigatória.'),
            validateField(document.getElementById('descricao'), document.getElementById('descricao-error'), 'A descrição é obrigatória.')
        ];
        return validations.every(isValid => isValid);
    };

    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            showNotification('Por favor, corrija os erros no formulário.', 'warning');
            return;
        }

        const feedbackData = {
            titulo: document.getElementById('titulo').value.trim(),
            avaliadoId: document.getElementById('avaliadoId').value, // Chave alterada de destinatarioId
            tipo: document.getElementById('tipo').value,
            nota: parseInt(document.getElementById('nota').value, 10),
            conteudo: document.getElementById('descricao').value.trim(), // Chave alterada de descricao
            isAnonymous: document.getElementById('isAnonymous').checked // Chave alterada de anonimo
        };

        console.log('Enviando dados do feedback:', feedbackData);

        try {
            await api.sendFeedback(feedbackData);
            showNotification('Feedback enviado com sucesso!', 'success');
            feedbackForm.reset();
            document.querySelectorAll('.border-red-500').forEach(el => el.classList.remove('border-red-500'));
            document.querySelectorAll('p[id$="-error"]').forEach(el => el.textContent = '');
        } catch (error) {
            showNotification(error.message || 'Ocorreu um erro ao enviar o feedback.', 'error');
        }
    });

    if (feedbackForm) {
        loadUsers();
    }
}
