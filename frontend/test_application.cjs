const axios = require('axios');
const fs = require('fs');

const baseURL = 'http://localhost:8081/api/v1';

async function runTest() {
    try {
        console.log("1. Logging in as Admin...");
        const loginRes = await axios.post(`${baseURL}/auth/login`, {
            username: "admin",
            password: "admin123"
        });
        
        const token = loginRes.data.data.token;
        const authAxios = axios.create({
            baseURL: baseURL,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("2. Fetching schemes...");
        const schemesRes = await authAxios.get('/schemes');
        const activeSchemes = schemesRes.data.data.filter(s => s.active);
        
        if (activeSchemes.length === 0) {
            console.log("No active schemes found. Cannot apply.");
            return;
        }
        const scheme = activeSchemes[0];
        console.log("Selected scheme ID:", scheme.id);

        console.log("3. Fetching beneficiaries...");
        const benRes = await authAxios.get('/beneficiaries');
        const beneficiaries = benRes.data.data;
        if (beneficiaries.length === 0) {
            console.log("No beneficiaries found.");
            return;
        }
        const benId = beneficiaries[0].id;
        console.log("Selected Beneficiary ID:", benId);

        console.log("4. Submitting application as ADMIN...");
        const appPayload = {
            beneficiaryId: Number(benId),
            schemeId: Number(scheme.id),
            requestedAmount: 10000.0,
            priorityTier: "MEDIUM",
            remarks: "Test application by Admin",
            documents: [
                {
                    documentType: "Aadhaar Card",
                    originalFileName: "dummy.pdf",
                    storagePath: "uploads/documents/Aadhaar_Card_dummy.pdf",
                    fileSize: 1024,
                    contentType: "application/pdf"
                }
            ]
        };

        const appRes = await authAxios.post('/applications', appPayload);
        console.log("Application creation response status:", appRes.status);
        console.log("Application details:", appRes.data.data);

        console.log("5. Verifying in Admin Applications...");
        const allAppsRes = await authAxios.get('/applications');
        const found = allAppsRes.data.data.find(a => a.id === appRes.data.data.id);
        console.log("Found in All Applications:", !!found);
        
        fs.writeFileSync('test_result.json', JSON.stringify({
            success: true,
            appId: appRes.data.data.id,
            schemeId: scheme.id,
            benId: benId,
            foundInAllApps: !!found
        }));

    } catch (err) {
        console.error("Test failed:", err.response?.data || err.message);
    }
}
runTest();
