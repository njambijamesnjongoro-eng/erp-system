require(require('path').join(__dirname, 'server', 'node_modules', 'dotenv')).config({ path: require('path').join(__dirname, 'server', '.env') });
const app = require('./server/app');
const http = require('http');

const server = http.createServer(app);
const PORT = 5007;

server.listen(PORT, () => {
  console.log(`Test server on ${PORT}`);
  const creds = JSON.stringify({ email: 'admin@erp.com', password: 'Admin@123456' });
  const login = http.request({ hostname: 'localhost', port: PORT, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(creds) } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const j = JSON.parse(d);
      if (!j.success) { console.log('Login failed:', j.message); server.close(); process.exit(1); }
      const token = j.data.accessToken;
      console.log('Token OK, testing procurement API...');

      const get = (p) => new Promise(resolve => {
        http.get({ hostname: 'localhost', port: PORT, path: p, headers: { 'Authorization': 'Bearer ' + token } }, r => {
          let b = '';
          r.on('data', c => b += c);
          r.on('end', () => resolve(JSON.parse(b)));
        });
      });

      Promise.all([
        get('/api/procurement/requests/categories').then(r => console.log('Categories:', r.data?.length ?? 0)),
        get('/api/procurement/suppliers').then(r => console.log('Suppliers:', r.total ?? 0)),
        get('/api/procurement/warehouses').then(r => console.log('Warehouses:', r.total ?? 0)),
        get('/api/procurement/inventory/categories').then(r => console.log('InvCats:', r.data?.length ?? 0)),
        get('/api/procurement/dashboard/stats').then(r => console.log('Stats ok:', !!r.data)),
      ]).then(() => {
        console.log('ALL ENDPOINTS PASSED');
        server.close();
        process.exit(0);
      }).catch(e => {
        console.log('Error:', e.message);
        server.close();
        process.exit(1);
      });
    });
  });
  login.write(creds);
  login.end();
});
