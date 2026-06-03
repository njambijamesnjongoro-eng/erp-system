require(require('path').join(__dirname, 'server', 'node_modules', 'dotenv')).config({ path: require('path').join(__dirname, 'server', '.env') });
const app = require('./server/app');
const http = require('http');

const server = http.createServer(app);
const PORT = 5007;

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

let totalTests = 0;
let passedTests = 0;

const test = (name, success, status) => {
  totalTests++;
  if (success) { passedTests++; console.log(`${GREEN}\u2713 PASS${RESET} ${name}`); }
  else { console.log(`${RED}\u2717 FAIL${RESET} ${name} (${status || '?'})`); }
};

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
      console.log('Token OK\n');

      const req = (method, path, body) => new Promise(resolve => {
        const opts = {
          hostname: 'localhost', port: PORT, path, method,
          headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' }
        };
        if (body) opts.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
        const r = http.request(opts, resp => {
          let b = '';
          resp.on('data', c => b += c);
          resp.on('end', () => {
            let data;
            try { data = JSON.parse(b); } catch (e) { data = { body: b }; }
            resolve({ status: resp.statusCode, data });
          });
        });
        if (body) r.write(JSON.stringify(body));
        r.end();
      });

      let ticketId = null;
      let announcementId = null;
      let calendarId = null;
      let integrationId = null;
      let paymentId = null;
      let employeeId = null;

      req('GET', '/api/portal/ess/profile').then(r => {
        test('ESS Profile', r.status === 200, r.status);
        if (r.status === 200 && r.data && r.data.data) employeeId = r.data.data.id;
        return req('GET', '/api/portal/ess/payslips');
      }).then(r => {
        test('ESS Payslips', r.status === 200, r.status);
        return req('GET', '/api/portal/ess/leave-balances');
      }).then(r => {
        test('ESS Leave Balances', r.status === 200, r.status);
        return req('GET', '/api/portal/ess/assets');
      }).then(r => {
        test('ESS Assets', r.status === 200, r.status);
        return req('GET', '/api/portal/ess/attendance');
      }).then(r => {
        test('ESS Attendance', r.status === 200, r.status);
        return req('GET', '/api/portal/ess/trainings');
      }).then(r => {
        test('ESS Trainings', r.status === 200, r.status);
        return req('GET', '/api/portal/ess/notifications');
      }).then(r => {
        test('ESS Notifications', r.status === 200, r.status);
        return req('POST', '/api/portal/tickets', { title: 'Test Ticket from Portal Test', description: 'Automated test ticket', category: 'general', priority: 'medium' });
      }).then(r => {
        test('Create Ticket', r.status === 201, r.status);
        if (r.data && r.data.data && r.data.data.id) ticketId = r.data.data.id;
        else if (r.data && r.data.id) ticketId = r.data.id;
        return req('GET', '/api/portal/tickets/stats');
      }).then(r => {
        test('Ticket Stats', r.status === 200, r.status);
        return req('GET', '/api/portal/tickets');
      }).then(r => {
        test('List Tickets', r.status === 200, r.status);
        if (ticketId) return req('GET', '/api/portal/tickets/' + ticketId);
        else { test('Get Ticket By ID', false, 'no-id'); return Promise.resolve({ status: 0 }); }
      }).then(r => {
        if (r.status !== 0) test('Get Ticket By ID', r.status === 200, r.status);
        if (ticketId) return req('PUT', '/api/portal/tickets/' + ticketId + '/status', { status: 'in_progress' });
        else { test('Update Ticket Status', false, 'no-id'); return Promise.resolve({ status: 0 }); }
      }).then(r => {
        if (r.status !== 0) test('Update Ticket Status', r.status === 200, r.status);
        if (ticketId) return req('POST', '/api/portal/tickets/' + ticketId + '/messages', { message: 'Test message from portal test', sender_type: 'employee' });
        else { test('Add Ticket Message', false, 'no-id'); return Promise.resolve({ status: 0 }); }
      }).then(r => {
        if (r.status !== 0) test('Add Ticket Message', r.status === 201, r.status);
        if (ticketId) return req('GET', '/api/portal/tickets/' + ticketId + '/messages');
        else { test('Get Ticket Messages', false, 'no-id'); return Promise.resolve({ status: 0 }); }
      }).then(r => {
        if (r.status !== 0) test('Get Ticket Messages', r.status === 200, r.status);
        return req('GET', '/api/portal/announcements');
      }).then(r => {
        test('List Announcements', r.status === 200, r.status);
        return req('POST', '/api/portal/announcements', { title: 'Test Announcement', content: 'Test content for announcement', category: 'general', priority: 'normal' });
      }).then(r => {
        test('Create Announcement', r.status === 201, r.status);
        if (r.data && r.data.data && r.data.data.id) announcementId = r.data.data.id;
        else if (r.data && r.data.id) announcementId = r.data.id;
        if (announcementId) return req('PUT', '/api/portal/announcements/' + announcementId + '/read');
        else { test('Mark Announcement Read', false, 'no-id'); return Promise.resolve({ status: 0 }); }
      }).then(r => {
        if (r.status !== 0) test('Mark Announcement Read', r.status === 200, r.status);
        return req('GET', '/api/portal/messages/unread-count');
      }).then(r => {
        test('Messages Unread Count', r.status === 200, r.status);
        const msgRecipient = employeeId || '00000000-0000-0000-0000-000000000000';
        return req('POST', '/api/portal/messages', { recipient_id: msgRecipient, subject: 'Test Subject', message: 'Test message body' });
      }).then(r => {
        test('Send Message', r.status === 201, r.status);
        return req('GET', '/api/portal/messages/sent');
      }).then(r => {
        test('List Sent Messages', r.status === 200, r.status);
        return req('GET', '/api/portal/messages/received');
      }).then(r => {
        test('List Received Messages', r.status === 200, r.status);
        const now = new Date();
        const later = new Date(now.getTime() + 3600000);
        return req('POST', '/api/portal/calendar', { title: 'Test Calendar Event', event_type: 'meeting', start_time: now.toISOString(), end_time: later.toISOString() });
      }).then(r => {
        test('Create Calendar Event', r.status === 201, r.status);
        if (r.data && r.data.data && r.data.data.id) calendarId = r.data.data.id;
        else if (r.data && r.data.id) calendarId = r.data.id;
        return req('GET', '/api/portal/calendar');
      }).then(r => {
        test('List Calendar Events', r.status === 200, r.status);
        return req('GET', '/api/portal/calendar/stats');
      }).then(r => {
        test('Calendar Stats', r.status === 200, r.status);
        return req('GET', '/api/portal/calendar/upcoming');
      }).then(r => {
        test('Calendar Upcoming', r.status === 200, r.status);
        return req('GET', '/api/portal/integrations');
      }).then(r => {
        test('List Integrations', r.status === 200, r.status);
        return req('POST', '/api/portal/integrations', { name: 'Test Integration', provider: 'email_smtp', config: { host: 'test.com', port: 587 } });
      }).then(r => {
        test('Create Integration', r.status === 201, r.status);
        if (r.data && r.data.data && r.data.data.id) integrationId = r.data.data.id;
        else if (r.data && r.data.id) integrationId = r.data.id;
        return req('GET', '/api/portal/integrations/stats');
      }).then(r => {
        test('Integration Stats', r.status === 200, r.status);
        return req('POST', '/api/portal/payments', { amount: 100, currency: 'KES', payment_type: 'service', provider: 'cash', description: 'Test payment from portal test' });
      }).then(r => {
        test('Create Payment', r.status === 201, r.status);
        if (r.data && r.data.data && r.data.data.id) paymentId = r.data.data.id;
        else if (r.data && r.data.id) paymentId = r.data.id;
        return req('GET', '/api/portal/payments');
      }).then(r => {
        test('List Payments', r.status === 200, r.status);
        return req('GET', '/api/portal/payments/stats');
      }).then(r => {
        test('Payment Stats', r.status === 200, r.status);
        console.log('\n' + passedTests + '/' + totalTests + ' tests passed');
        server.close();
        process.exit(passedTests === totalTests ? 0 : 1);
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
