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
        const validations = [
            validateField(document.getElementById('avaliadoId'), document.getElementById('avaliadoId-error'), 'Selecione um colaborador.'),
            validateField(document.getElementById('titulo'), document.getElementById('titulo-error'), 'O título é obrigatório.'),
            validateRadioGroup('classificacao', document.getElementById('classificacao-error'), 'Selecione uma classificação.'),
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
            avaliadoId: document.getElementById('avaliadoId').value,
            classificacao: document.querySelector('input[name="classificacao"]:checked').value,
            nota: document.getElementById('nota').value.trim(),
            descricao: document.getElementById('descricao').value.trim(),
            isAnonymous: document.getElementById('isAnonymous').checked
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
