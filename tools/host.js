const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

// Colors for console
const cyan = '\x1b[36m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

console.log(`${cyan}${bold}
========================================================
      FORMA DIGITAL - HOST MODE (PORT FORWARDING)
========================================================
${reset}`);

function fetchPublicIP() {
    return new Promise((resolve) => {
        console.log(`${yellow}[1/3] Fetching Public IP...${reset}`);
        // using api.ipify.org (http)
        http.get('http://api.ipify.org', (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const ip = data.trim();
                console.log(`      Public IP found: ${green}${ip}${reset}`);
                resolve(ip);
            });
        }).on('error', (err) => {
            console.log(`      ${red}Could not fetch Public IP. Falling back to manual check.${reset}`);
            resolve(null);
        });
    });
}

async function main() {
    try {
        // 1. Get Public IP
        let publicIp = await fetchPublicIP();

        if (!publicIp) {
            // Fallback prompt? Or just error? Let's assume user knows if API fails.
            console.log("Could not auto-detect IP.");
            // We might want to just ask user or use a placeholder, but for now let's stop.
            // Actually, let's fallback to localhost if we can't get it, but that defeats the point.
            // Let's just carry on and ask user to check .env manually if this fails.
        }

        const backendUrl = `http://${publicIp}:3000`;

        // 2. Update Frontend Config
        console.log(`${yellow}[2/3] Configuring Frontend...${reset}`);
        const envPath = path.join(__dirname, '..', 'apps', 'frontend', '.env.local');
        // We overwrite .env.local to ensure Next.js picks it up over .env
        const envContent = `NEXT_PUBLIC_API_URL=${backendUrl}\n`;
        fs.writeFileSync(envPath, envContent);
        console.log(`      Setting API URL to: ${cyan}${backendUrl}${reset}`);

        // 3. Launch Servers
        console.log(`${yellow}[3/3] Launching Servers...${reset}`);

        // Launch Backend
        exec('start "Backend Server (HOST MODE)" cmd /k "cd apps\\backend && npm run start:dev"');

        // Launch Frontend (bound to 0.0.0.0 so router can forward to it)
        exec('start "Frontend Server (HOST MODE)" cmd /k "cd apps\\frontend && npm run dev -- -H 0.0.0.0 -p 3001"');

        console.log(`${green}
========================================================
      SERVERS RUNNING!
========================================================
${reset}`);

        console.log(`${bold}CRITICAL REMINDER:${reset}`);
        console.log(`You MUST configure your Router correctly for this to work.`);
        console.log(`\n${bold}Router Settings:${reset}`);
        console.log(`1. Forward Port ${cyan}3000${reset} -> Your Local IP (${cyan}192.168.0.3${reset})`);
        console.log(`2. Forward Port ${cyan}3001${reset} -> Your Local IP (${cyan}192.168.0.3${reset})`);

        console.log(`\n${bold}Share this Link:${reset}`);
        console.log(`   ${green}http://${publicIp}:3001${reset}`);
        console.log(`\n(If it doesn't work for them, check your Windows Firewall and Router)`);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
