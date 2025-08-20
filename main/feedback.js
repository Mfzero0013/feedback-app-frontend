document.addEventListener('DOMContentLoaded', () => {
    const feedbackForm = document.getElementById('feedbackForm');
    const avaliadoIdSelect = document.getElementById('avaliadoId');
    const currentUser = JSON.parse(localStorage.getItem('userData'));

    const loadUsers = async () => {
        try {
            const users = await api.getAllUsers();
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
            validateField(document.getElementById('tipo'), document.getElementById('tipo-error'), 'Selecione um tipo de feedback.'),
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
            titulo: document.getElementById('titulo').value,
            destinatarioId: document.getElementById('avaliadoId').value,
            tipo: document.getElementById('tipo').value, // 'ELOGIO', 'SUGESTAO', etc.
            conteudo: document.getElementById('descricao').value,
            anonimo: document.getElementById('isAnonymous').checked
        };

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
});
