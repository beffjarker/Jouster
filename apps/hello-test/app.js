document.getElementById('branch').textContent = window.JOUSTER_BRANCH || 'local';

document.getElementById('time').textContent = 'Loaded at ' + new Date().toISOString();