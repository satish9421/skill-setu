// Central API config — update RENDER_URL after deploying to Render
const RENDER_URL = 'https://skillsetu-dbms.onrender.com';

const API = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? `http://localhost:${window.location.port || 3000}/api`
    : `${RENDER_URL}/api`;
