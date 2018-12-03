import Logo from '/logo.js';

(async () => {
    if (!window.error) {
        const res = await fetch('/logo.json');
        const logo = await res.json();
        const logoEl = document.querySelector('.js-logo');

        new Logo(logoEl, logo);
    }
})();
