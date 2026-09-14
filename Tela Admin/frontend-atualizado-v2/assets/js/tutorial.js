// Theme Toggle
        function toggleTheme() {
            const body = document.body;
            const html = document.documentElement;
            const iconDark = document.getElementById('theme-icon-dark');
            const iconLight = document.getElementById('theme-icon-light');
           
            const isLight = body.classList.contains('light');
           
            if (isLight) {
                body.classList.remove('light');
                html.classList.remove('light');
                localStorage.setItem('theme', 'dark');
                iconDark?.classList.remove('hidden');
                iconLight?.classList.add('hidden');
            } else {
                body.classList.add('light');
                html.classList.add('light');
                localStorage.setItem('theme', 'light');
                iconDark?.classList.add('hidden');
                iconLight?.classList.remove('hidden');
            }
           
            setTimeout(() => lucide.createIcons(), 100);
        }

        // Load saved theme
        (function initTheme() {
            const savedTheme = localStorage.getItem('theme');
            const body = document.body;
            const html = document.documentElement;
            const iconDark = document.getElementById('theme-icon-dark');
            const iconLight = document.getElementById('theme-icon-light');
           
            if (savedTheme === 'light') {
                body.classList.add('light');
                html.classList.add('light');
                iconDark?.classList.add('hidden');
                iconLight?.classList.remove('hidden');
            }
        })();

        // Set active side nav (desktop)
        function setActiveSideNav(element) {
            document.querySelectorAll('.side-nav-link').forEach(link => link.classList.remove('active'));
            element.classList.add('active');
        }

        // Navigation Active State
        function updateActiveNav() {
            const sections = document.querySelectorAll('section[id]');
            const sideNavLinks = document.querySelectorAll('.side-nav-link');
            const mobileNavItems = document.querySelectorAll('.mobile-nav-item');
            let currentSection = '';

            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                if (window.scrollY >= (sectionTop - 200)) {
                    currentSection = section.getAttribute('id');
                }
            });

            sideNavLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('data-section') === currentSection) {
                    link.classList.add('active');
                }
            });

            mobileNavItems.forEach(item => {
                item.classList.remove('active');
                if (item.getAttribute('data-section') === currentSection) {
                    item.classList.add('active');
                }
            });
        }

        window.addEventListener('scroll', updateActiveNav);
        window.addEventListener('load', updateActiveNav);

        // FAQ Toggle
        function toggleFAQ(element) {
            const content = element.querySelector('.collapsible-content');
            const icon = element.querySelector('.faq-icon');
           
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                icon.style.transform = 'rotate(0deg)';
            } else {
                document.querySelectorAll('.collapsible-content').forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.faq-icon').forEach(i => i.style.transform = 'rotate(0deg)');
               
                content.classList.add('active');
                icon.style.transform = 'rotate(180deg)';
            }
        }

        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const offset = 100;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.scrollY - offset;
                    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
                }
            });
        });

        // Initialize Lucide icons
        lucide.createIcons();