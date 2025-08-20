document.addEventListener('DOMContentLoaded', function () {
    const navPlaceholder = document.getElementById('nav-placeholder');
    if (navPlaceholder) {
        const navHTML = `
            <div id="sidebar-container" class="bg-indigo-800 text-white w-64 px-4 py-6 flex flex-col h-full fixed">
                <h1 class="text-2xl font-bold mb-10 pl-2"><span class="font-light">Feedback</span><span class="font-bold">Hub</span></h1>
                <nav class="space-y-2 flex-grow" id="main-nav">
                    <a href="dashboard.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Dashboard</a>
                                        <a href="my-team.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Minha Equipe</a>
                    <a href="create-team.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white" data-permission="GESTOR,ADMINISTRADOR">Cadastrar Equipe</a>
                    <a href="reports.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Relatórios</a>
                    <a href="settings.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Configurações</a>
                    <a href="profile.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Meu Perfil</a>
                    <a href="admin.html" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white" data-permission="ADMIN">Administração</a>
                </nav>
                <div class="mt-auto">
                    <a href="#" id="logout-button" class="block px-4 py-2.5 rounded-lg text-gray-200 hover:bg-indigo-700 hover:text-white">Sair</a>
                </div>
            </div>
        `;

        navPlaceholder.innerHTML = navHTML;
        setActiveLink();
        setupPermissions();

        const logoutButton = document.getElementById('logout-button');
        if (logoutButton) {
            logoutButton.addEventListener('click', (e) => {
                e.preventDefault();
                localStorage.removeItem('token');
                localStorage.removeItem('userData');
                window.location.href = 'index.html';
            });
        }
    }
});

function setActiveLink() {
    const navLinks = document.querySelectorAll('#main-nav a');
    const currentPage = window.location.pathname.split('/').pop();

    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('bg-indigo-700', 'font-bold');
        }
    });
}

function setupPermissions() {
    try {
        const userDataString = localStorage.getItem('userData');
        if (!userDataString) {
            console.warn('User data not found in localStorage for permissions setup.');
            return;
        }

        const userData = JSON.parse(userDataString);
        const userRole = userData ? userData.cargo : null;

        if (!userRole) {
            console.warn('User role not found in user data.');
            return;
        }

        document.querySelectorAll('[data-permission]').forEach(elem => {
            const requiredPermissions = elem.dataset.permission.split(',');
            if (!requiredPermissions.includes(userRole)) {
                elem.style.display = 'none';
            }
        });
    } catch (error) {
        console.error('Failed to setup permissions:', error);
    }
}
