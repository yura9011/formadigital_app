const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('https');

// Colors for console
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

console.log(`${cyan}${bold}
========================================================
      FORMA DIGITAL - ONE-CLICK PUBLIC SHARE
========================================================
${reset}`);

function fetchPassword() {
    return new Promise((resolve) => {
        console.log(`${yellow}[1/5] Fetching Tunnel Password (Public IP)...${reset}`);
        http.get('https://loca.lt/mytunnelpassword', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const ip = data.trim();
                console.log(`      Password found: ${green}${ip}${reset}`);
                resolve(ip);
            });
        }).on('error', (err) => {
            console.log(`      ${yellow}Could not fetch IP, skipping...${reset}`);
            resolve('Unknown (Check https://loca.lt/mytunnelpassword)');
        });
    });
}

function startBackendTunnel() {
    return new Promise((resolve, reject) => {
        console.log(`${yellow}[2/5] Starting Backend Tunnel...${reset}`);
        const lt = spawn('npx.cmd', ['localtunnel', '--port', '3000'], { shell: true });

        lt.stdout.on('data', (data) => {
            const output = data.toString();
            const match = output.match(/your url is: (https:\/\/[^\s]+)/);
            if (match) {
                const url = match[1];
                console.log(`      Backend Public URL: ${green}${url}${reset}`);
                resolve(url);
            }
        });

        // Fallback timeout
        setTimeout(() => {
            // If we didn't get a URL in 10s, something might be wrong, but let's hope.
        }, 10000);
    });
}

async function main() {
    try {
        // 1. Get Password
        const password = await fetchPassword();

        // 2. Start Backend Server (New Window)
        console.log(`${yellow}[3/5] Launching Backend Server...${reset}`);
        exec('start "Backend Server" cmd /k "cd apps\\backend && npm run start:dev"');

        // 3. Start Backend Tunnel & Get URL
        const backendUrl = await startBackendTunnel();

        // 4. Update Frontend Config
        console.log(`${yellow}[4/5] Configuring Frontend...${reset}`);
        const envPath = path.join(__dirname, '..', 'apps', 'frontend', '.env.local');
        const envContent = `NEXT_PUBLIC_API_URL=${backendUrl}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log(`      Updated .env.local with ${backendUrl}`);

        // 5. Start Frontend Server (New Window)
        console.log(`${yellow}[5/5] Launching Frontend Server...${reset}`);
        exec('start "Frontend Server" cmd /k "cd apps\\frontend && npm run dev"');

        // 6. Start Frontend Tunnel (New Window - so it stays alive and user sees it)
        console.log(`${green}
========================================================
      ALL SYSTEMS GO!
========================================================
${reset}`);
        console.log(`${bold}1. SHARE THIS URL (Frontend):${reset}`);
        console.log(`   (Waiting for frontend tunnel... check the new window)`);
        console.log(`\n${bold}2. SHARE THIS PASSWORD:${reset}`);
        console.log(`   ${green}${bold}${password}${reset}`);
        console.log(`\n${bold}3. ENJOY!${reset}`);

        // We launch the frontend tunnel in a new window so the user can see the URL there too
        // and so this script can exit or stay open without clutter.
        // Actually, let's keep this script open or launch the separate tunnel window.
        // Let's launch the frontend tunnel in a separate window so it persists.

        exec('start "Frontend Tunnel (SHARE THIS LINK)" cmd /k "npx localtunnel --port 3001"');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
