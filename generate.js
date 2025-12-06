const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME;

if (!GITHUB_TOKEN || !USERNAME) {
    console.error('Error: GITHUB_TOKEN and USERNAME environment variables are required.');
    process.exit(1);
}

async function fetchContributions() {
    const query = `
    query($username: String!) {
        user(login: $username) {
            contributionsCollection {
                contributionCalendar {
                    totalContributions
                    weeks {
                        contributionDays {
                            contributionCount
                            date
                            weekday
                        }
                    }
                }
            }
        }
    }`;

    const body = JSON.stringify({
        query,
        variables: { username: USERNAME }
    });

    return new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.github.com',
            path: '/graphql',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'User-Agent': 'contribution-city-generator'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.errors) {
                        reject(new Error(JSON.stringify(json.errors)));
                    } else {
                        resolve(json.data.user.contributionsCollection.contributionCalendar);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

function getLastWeekData(calendar) {
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);
    return allDays.slice(-7);
}

// 도트 폰트 (5x7)
const dotFont = {
    '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    '2': [[1,1,1],[0,0,1],[0,0,1],[1,1,1],[1,0,0],[1,0,0],[1,1,1]],
    '3': [[1,1,1],[0,0,1],[0,0,1],[1,1,1],[0,0,1],[0,0,1],[1,1,1]],
    '4': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1],[0,0,1]],
    '5': [[1,1,1],[1,0,0],[1,0,0],[1,1,1],[0,0,1],[0,0,1],[1,1,1]],
    '6': [[1,1,1],[1,0,0],[1,0,0],[1,1,1],[1,0,1],[1,0,1],[1,1,1]],
    '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
    '8': [[1,1,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,1,1]],
    '9': [[1,1,1],[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1],[1,1,1]],
    'S': [[1,1,1],[1,0,0],[1,0,0],[1,1,1],[0,0,1],[0,0,1],[1,1,1]],
    'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
    'M': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1]],
    'O': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
    'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'W': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
    'E': [[1,1,1],[1,0,0],[1,0,0],[1,1,1],[1,0,0],[1,0,0],[1,1,1]],
    'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
    'H': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'F': [[1,1,1],[1,0,0],[1,0,0],[1,1,1],[1,0,0],[1,0,0],[1,0,0]],
    'R': [[1,1,0],[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1],[1,0,1]],
    'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    'A': [[0,1,0],[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
    'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'Y': [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
    'C': [[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
    'B': [[1,1,0],[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1],[1,1,0]],
    ':': [[0],[0],[1],[0],[0],[1],[0]],
    ' ': [[0,0],[0,0],[0,0],[0,0],[0,0],[0,0],[0,0]]
};

function generateSVG(weekData, totalContributions) {
    const width = 900;
    const height = 500;
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

    // 등각투영 설정
    const tileW = 32;
    const tileH = 16;
    const originX = 450;
    const originY = 320;

    // 등각투영 변환
    const iso = (gx, gy, gz = 0) => {
        return {
            x: originX + (gx - gy) * tileW,
            y: originY + (gx + gy) * tileH - gz
        };
    };

    // 블록 그리기
    const drawBlock = (gx, gy, gz, w, d, h, colors) => {
        const p0 = iso(gx, gy, gz + h);
        const p1 = iso(gx + w, gy, gz + h);
        const p2 = iso(gx + w, gy + d, gz + h);
        const p3 = iso(gx, gy + d, gz + h);
        const p4 = iso(gx + w, gy + d, gz);
        const p5 = iso(gx, gy + d, gz);
        const p6 = iso(gx + w, gy, gz);

        let svg = '';
        // Top
        svg += `<polygon points="${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y}" fill="${colors.top}"/>`;
        // Right
        svg += `<polygon points="${p1.x},${p1.y} ${p2.x},${p2.y} ${p4.x},${p4.y} ${p6.x},${p6.y}" fill="${colors.right}"/>`;
        // Left (front)
        svg += `<polygon points="${p3.x},${p3.y} ${p2.x},${p2.y} ${p4.x},${p4.y} ${p5.x},${p5.y}" fill="${colors.left}"/>`;
        return svg;
    };

    // 복셀 텍스트
    const drawVoxelText = (text, startGx, startGy, startGz, color) => {
        let svg = '';
        let offset = 0;
        const scale = 0.15;
        for (const char of text.toUpperCase()) {
            const pattern = dotFont[char] || dotFont[' '];
            const charW = pattern[0].length;
            for (let r = 0; r < pattern.length; r++) {
                for (let c = 0; c < pattern[r].length; c++) {
                    if (pattern[r][c]) {
                        const vx = startGx + (offset + c) * scale * 2;
                        const vy = startGy;
                        const vz = startGz + (pattern.length - r) * scale * 20;
                        svg += drawBlock(vx, vy, vz, scale * 2, scale, scale * 20, {
                            top: color, right: '#222', left: color
                        });
                    }
                }
            }
            offset += charW + 1;
        }
        return svg;
    };

    // 렌더링 큐
    let renderQueue = [];

    // 1. 잔디 (뒤쪽)
    renderQueue.push({
        depth: -100,
        draw: () => {
            let s = '';
            const grassColor = { top: '#2d4a1e', right: '#1f3815', left: '#254016' };
            s += drawBlock(-10, 1, 0, 20, 12, 1.5, grassColor);
            for (let i = 0; i < 80; i++) {
                const rx = -9 + Math.random() * 18;
                const ry = 1.5 + Math.random() * 10;
                s += drawBlock(rx, ry, 1.5, 0.08, 0.08, 0.15, { top: '#4a8c4a', right: 'none', left: 'none' });
            }
            return s;
        }
    });

    // 2. 도로 (크게)
    renderQueue.push({
        depth: -50,
        draw: () => {
            let s = '';
            const roadColor = { top: '#2a2a2a', right: '#1a1a1a', left: '#222222' };
            s += drawBlock(-10, -3, 0, 20, 4, 0.3, roadColor);
            for (let x = -9; x < 10; x += 1.5) {
                s += drawBlock(x, -1, 0.35, 0.8, 0.15, 0.05, { top: '#ffcc00', right: '#cc9900', left: '#ffcc00' });
            }
            return s;
        }
    });

    // 3. 건물/가로등
    weekData.forEach((day, idx) => {
        const count = day.contributionCount;
        const gx = -6 + idx * 2;
        const gy = 1.5;
        const depth = gx + gy;

        renderQueue.push({
            depth: depth,
            draw: () => {
                let s = '';
                if (count === 0) {
                    // 가로등
                    const poleColor = { top: '#2a2a2a', right: '#1a1a1a', left: '#222222' };
                    s += drawBlock(gx + 0.4, gy + 0.4, 1.5, 0.2, 0.2, 55, poleColor);
                    s += drawBlock(gx + 0.25, gy + 0.25, 56.5, 0.5, 0.5, 2, poleColor);
                    
                    const glassColor = { top: '#fffde8', right: '#fff176', left: '#ffee58' };
                    s += drawBlock(gx + 0.3, gy + 0.3, 58.5, 0.4, 0.4, 8, glassColor);
                    s += drawBlock(gx + 0.2, gy + 0.2, 66.5, 0.6, 0.6, 1.5, poleColor);
                    s += drawBlock(gx + 0.35, gy + 0.35, 68, 0.3, 0.3, 4, poleColor);

                    const center = iso(gx + 0.5, gy + 0.5, 2);
                    s += `<ellipse cx="${center.x}" cy="${center.y}" rx="25" ry="15" fill="#fff176" opacity="0.12" class="lamp-glow"/>`;
                    
                    s += drawVoxelText(dayNames[day.weekday], gx - 0.3, gy - 0.5, 78, '#8899aa');
                    s += drawVoxelText('0', gx + 0.3, gy - 0.5, 68, '#ffdd66');
                } else {
                    // 건물
                    const h = Math.min(150, 35 + count * 8);
                    const bColor = { top: '#5a5a4a', right: '#3a3a2a', left: '#4a4a3a' };
                    s += drawBlock(gx, gy, 1.5, 1.4, 1.0, h, bColor);

                    // 창문
                    const winRows = Math.floor(h / 15);
                    for (let r = 1; r < winRows; r++) {
                        const wz = 1.5 + r * 15;
                        if (wz > h - 10) continue;
                        
                        for (let wc = 0; wc < 3; wc++) {
                            const isLit = Math.random() > 0.25;
                            const wColor = isLit 
                                ? { top: '#fdd835', right: '#fbc02d', left: '#ffeb3b' }
                                : { top: '#1a1a15', right: '#151510', left: '#181815' };
                            s += drawBlock(gx - 0.02, gy + 0.15 + wc * 0.28, wz, 0.05, 0.22, 8, wColor);
                        }
                        
                        for (let wc = 0; wc < 2; wc++) {
                            const isLit = Math.random() > 0.25;
                            const wColor = isLit 
                                ? { top: '#ddbb33', right: '#ccaa22', left: '#eedd44' }
                                : { top: '#151512', right: '#101010', left: '#131310' };
                            s += drawBlock(gx + 0.2 + wc * 0.5, gy + 0.98, wz, 0.4, 0.05, 8, wColor);
                        }
                    }
                    
                    s += drawVoxelText(dayNames[day.weekday], gx - 0.2, gy - 0.5, h + 18, '#8899aa');
                    s += drawVoxelText(count.toString(), gx + 0.2, gy - 0.5, h + 5, '#ffdd66');
                }
                return s;
            }
        });
    });

    // 4. 자동차 (파란색)
    renderQueue.push({
        depth: -30,
        draw: () => {
            let s = '';
            const cx = -4;
            const cy = -1.5;
            const cz = 0.3;
            
            s += drawBlock(cx, cy, cz, 2.5, 1.0, 2.5, { top: '#42a5f5', right: '#1e88e5', left: '#2196f3' });
            s += drawBlock(cx + 0.4, cy + 0.1, cz + 2.5, 1.7, 0.8, 1.8, { top: '#222', right: '#111', left: '#1a1a1a' });
            s += drawBlock(cx + 2.4, cy + 0.15, cz + 0.8, 0.15, 0.25, 0.8, { top: '#ffeb3b', right: '#ffeb3b', left: '#ffeb3b' });
            s += drawBlock(cx + 2.4, cy + 0.6, cz + 0.8, 0.15, 0.25, 0.8, { top: '#ffeb3b', right: '#ffeb3b', left: '#ffeb3b' });
            s += drawBlock(cx - 0.05, cy + 0.15, cz + 0.8, 0.1, 0.2, 0.6, { top: '#ff1744', right: '#ff1744', left: '#ff1744' });
            s += drawBlock(cx - 0.05, cy + 0.65, cz + 0.8, 0.1, 0.2, 0.6, { top: '#ff1744', right: '#ff1744', left: '#ff1744' });
            
            return s;
        }
    });

    renderQueue.sort((a, b) => a.depth - b.depth);
    let objectsSvg = '';
    renderQueue.forEach(obj => { objectsSvg += obj.draw(); });

    let stars = '';
    for (let i = 0; i < 60; i++) {
        const sx = Math.random() * width;
        const sy = Math.random() * height * 0.5;
        const r = Math.random() * 1.8 + 0.3;
        const delay = (Math.random() * 3).toFixed(1);
        stars += `<rect x="${sx}" y="${sy}" width="${r * 2}" height="${r * 2}" fill="white" class="star" style="animation-delay: ${delay}s"/>`;
    }

    const todayContributions = weekData[weekData.length - 1].contributionCount;

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0a0a18"/>
      <stop offset="100%" stop-color="#1a1a30"/>
    </linearGradient>
    <style>
      @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      @keyframes lampPulse { 0%, 100% { opacity: 0.12; } 50% { opacity: 0.25; } }
      .star { animation: twinkle 2.5s infinite; }
      .lamp-glow { animation: lampPulse 3s infinite; }
    </style>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#skyGrad)"/>
  
  ${stars}
  
  <!-- 달 -->
  <circle cx="800" cy="80" r="45" fill="#fffde8" opacity="0.15"/>
  <circle cx="800" cy="80" r="35" fill="#fffee8"/>
  <circle cx="790" cy="72" r="6" fill="#eeeedd" opacity="0.5"/>
  <circle cx="808" cy="88" r="4" fill="#eeeedd" opacity="0.4"/>
  
  ${objectsSvg}
  
  <!-- 타이틀 -->
  <text x="${width / 2}" y="45" text-anchor="middle" fill="#fff" font-family="'Courier New', monospace" font-size="26" font-weight="bold" stroke="#000" stroke-width="3" paint-order="stroke">CONTRIBUTION CITY</text>
  
  <!-- 통계 -->
  <text x="30" y="${height - 50}" fill="#cfd8dc" font-family="'Courier New', monospace" font-size="15" font-weight="bold">TOTAL: <tspan fill="#fdd835">${totalContributions}</tspan></text>
  <text x="30" y="${height - 28}" fill="#cfd8dc" font-family="'Courier New', monospace" font-size="15" font-weight="bold">TODAY: <tspan fill="#fdd835">${todayContributions}</tspan></text>
</svg>`;

    return svg;
}

async function main() {
    try {
        console.log(`Fetching contributions for ${USERNAME}...`);
        const calendar = await fetchContributions();
        console.log(`Total contributions: ${calendar.totalContributions}`);
        const weekData = getLastWeekData(calendar);
        console.log('Last 7 days:', weekData.map(d => `${d.date}: ${d.contributionCount}`).join(', '));
        const svg = generateSVG(weekData, calendar.totalContributions);
        const outputDir = 'profile-3d-contrib';
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
        fs.writeFileSync(`${outputDir}/contribution-city.svg`, svg);
        console.log(`Generated: ${outputDir}/contribution-city.svg`);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();
