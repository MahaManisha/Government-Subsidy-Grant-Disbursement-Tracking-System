const fetch = require('node-fetch');
async function go() {
  const res = await fetch('http://localhost:8081/api/v1/auth/login', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({username: 'admin', password: 'password123'})});
  const d = await res.json();
  console.log("Token response: ", d);
  const appRes = await fetch('http://localhost:8081/api/v1/applications', {headers: {Authorization: 'Bearer ' + d.data.token}});
  const apps = await appRes.json();
  const target = apps.data.find(a => a.applicationNumber === 'APP-2026-000007');
  console.log("Application details: ", JSON.stringify(target, null, 2));
}
go();
