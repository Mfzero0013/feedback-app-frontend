document.addEventListener('DOMContentLoaded', () => {
    loadReports();
    loadUsersForFilter();

    const filtersForm = document.getElementById('report-filters-form');
    filtersForm.addEventListener('submit', (e) => {
        e.preventDefault();
        loadReports();
    });

    const exportButton = document.getElementById('export-button');
    exportButton.addEventListener('click', () => {
        exportReport();
    });
});

async function loadReports() {
    const generalContainer = document.getElementById('general-report-container');
    const engagementContainer = document.getElementById('engagement-report-container');
    
    generalContainer.innerHTML = '<p class="text-gray-500">Carregando dados do relatório...</p>';
    engagementContainer.innerHTML = '<p class="text-gray-500">Carregando dados do relatório...</p>';

    const filters = getReportFilters();

    try {
        const [generalReport, engagementReport] = await Promise.all([
            api.getGeneralReport(filters),
            api.getEngagementReport(filters)
        ]);

        renderGeneralReport(generalReport);
        renderEngagementReport(engagementReport);

    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        generalContainer.innerHTML = `<p class="text-red-500">Não foi possível carregar o relatório geral. Tente novamente.</p>`;
        engagementContainer.innerHTML = `<p class="text-red-500">Não foi possível carregar o relatório de engajamento. Tente novamente.</p>`;
    }
}

async function loadUsersForFilter() {
    const userSelect = document.getElementById('filter-user');
    try {
        const users = await api.getUsers();
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            option.textContent = user.nome;
            userSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Erro ao carregar usuários para o filtro:', error);
    }
}

function renderGeneralReport(report) {
    const container = document.getElementById('general-report-container');
    // A API já retorna o objeto de dados diretamente. Adicionamos uma verificação de segurança.
    if (!report || typeof report.totalFeedbacks === 'undefined') {
        container.innerHTML = '<p class="text-gray-500">Não há dados para o relatório geral.</p>';
        return;
    }

    container.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Visão Geral dos Feedbacks</h3>
        <p><strong>Total de Feedbacks:</strong> ${report.totalFeedbacks}</p>
        <!-- Adicionar mais detalhes do relatório geral aqui -->
    `;
}

function renderEngagementReport(users) {
    const container = document.getElementById('engagement-report-container');
    // A API já retorna a lista de usuários diretamente. Adicionamos uma verificação.
    if (!users || users.length === 0) {
        container.innerHTML = '<p class="text-gray-500">Não há dados de engajamento para exibir.</p>';
        return;
    }

    let userListHTML = users.map(user => `<li>${user.nome} (${user._count.feedbacksCriados || 0} feedbacks)</li>`).join('');

    container.innerHTML = `
        <h3 class="text-lg font-semibold text-gray-700 mb-4">Top 10 Usuários Mais Engajados</h3>
        <ul class="list-disc pl-5">${userListHTML}</ul>
    `;
}

function getReportFilters() {
    const form = document.getElementById('report-filters-form');
    const formData = new FormData(form);
    const filters = {};
    for (const [key, value] of formData.entries()) {
        if (value) {
            filters[key] = value;
        }
    }
    return filters;
}

async function exportReport() {
    const filters = getReportFilters();
    try {
        const [generalReport, engagementReport] = await Promise.all([
            api.getGeneralReport(filters),
            api.getEngagementReport(filters)
        ]);

        let csvContent = "data:text/csv;charset=utf-8,";
        
        // General Report CSV
        csvContent += "Relatorio Geral\r\n";
        csvContent += `Total de Feedbacks,${generalReport.data.totalFeedbacks}\r\n`;
        csvContent += "Status,Contagem\r\n";
        generalReport.data.feedbacksByStatus.forEach(item => {
            csvContent += `${item.status},${item._count.status}\r\n`;
        });
        csvContent += "\r\n";

        // Engagement Report CSV
        csvContent += "Relatorio de Engajamento\r\n";
        csvContent += "Usuario,Email,Feedbacks Criados\r\n";
        engagementReport.data.forEach(user => {
            csvContent += `${user.nome},${user.email},${user._count.feedbacksCriados}\r\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "relatorio_feedback.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error('Erro ao exportar relatório:', error);
        alert('Não foi possível exportar o relatório.');
    }
}
