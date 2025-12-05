const https = require('https');
const fs = require('fs');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME;

// GraphQL 쿼리로 contribution 데이터 가져오기
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

// contribution 값에 따른 레벨 계산
function getLevel(count) {
    if (count === 0) return 0;
    if (count <= 3) return 1;
    if (count <= 6) return 2;
    if (count <= 9) return 3;
    return 4;
}

// 건물 색상 팔레트
const buildingColors = {
    0: { base: '#1a3a1a', left: '#153015', right: '#1f451f', roof: '#2a4a2a' }, // 공원
    1: { base: '#5a4a3a', left: '#4a3a2a', right: '#6a5a4a', roof: '#7a6a5a' }, // 주택
    2: { base: '#4a6a8a', left: '#3a5a7a', right: '#5a7a9a', roof: '#6a8aaa' }, // 빌딩
    3: { base: '#6a5a8a', left: '#5a4a7a', right: '#7a6a9a', roof: '#8a7aaa' }, // 고층
    4: { base: '#8a6a4a', left: '#7a5a3a', right: '#9a7a5a', roof: '#aa8a6a' }  // 타워
};

// 최근 7일 데이터 추출
function getLastWeekData(calendar) {
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);
    return allDays.slice(-7);
}

// SVG 생성
function generateSVG(weekData, totalContributions) {
    const width = 800;
    const height = 400;
    
    // 건물 설정
    const buildingWidth = 80;
    const buildingDepth = 40;
    const gap = 15;
    const maxHeight = 180;
    const baseY = 320;
    
    // 등각투영 계산
    const isoX = (x, z) => 400 + (x - z) * 0.866;
    const isoY = (y, x, z) => 200 + (x + z) * 0.5 - y;
    
    let buildings = '';
    let stars = '';
    
    // 별 생성
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * width;
        const y = Math.random() * 150;
        const r = Math.random() * 1.5 + 0.5;
        const delay = (Math.random() * 3).toFixed(1);
        stars += `<circle class="star" cx="${x}" cy="${y}" r="${r}" fill="white" style="animation-delay: ${delay}s"/>`;
    }
    
    // 요일 이름
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // 각 날짜별 건물 생성
    weekData.forEach((day, index) => {
        const level = getLevel(day.contributionCount);
        const colors = buildingColors[level];
        const height = level === 0 ? 10 : Math.max(30, (day.contributionCount / 15) * maxHeight);
        
        const x = (index - 3) * (buildingWidth + gap);
        const z = 0;
        
        // 건물 꼭지점 계산 (등각투영)
        const points = {
            // 바닥
            bl: { x: isoX(x, z), y: isoY(0, x, z) },
            br: { x: isoX(x + buildingWidth, z), y: isoY(0, x + buildingWidth, z) },
            fl: { x: isoX(x, z + buildingDepth), y: isoY(0, x, z + buildingDepth) },
            fr: { x: isoX(x + buildingWidth, z + buildingDepth), y: isoY(0, x + buildingWidth, z + buildingDepth) },
            // 지붕
            tbl: { x: isoX(x, z), y: isoY(height, x, z) },
            tbr: { x: isoX(x + buildingWidth, z), y: isoY(height, x + buildingWidth, z) },
            tfl: { x: isoX(x, z + buildingDepth), y: isoY(height, x, z + buildingDepth) },
            tfr: { x: isoX(x + buildingWidth, z + buildingDepth), y: isoY(height, x + buildingWidth, z + buildingDepth) }
        };
        
        if (level === 0) {
            // 공원 (잔디 + 나무)
            buildings += `
                <g class="building">
                    <!-- 잔디 -->
                    <polygon points="${points.tbl.x},${points.tbl.y} ${points.tbr.x},${points.tbr.y} ${points.tfr.x},${points.tfr.y} ${points.tfl.x},${points.tfl.y}" fill="${colors.roof}"/>
                    <!-- 나무 -->
                    <polygon points="${isoX(x + 40, z + 20)},${isoY(60, x + 40, z + 20)} ${isoX(x + 25, z + 20)},${isoY(10, x + 25, z + 20)} ${isoX(x + 55, z + 20)},${isoY(10, x + 55, z + 20)}" fill="#2a5a2a"/>
                    <polygon points="${isoX(x + 40, z + 20)},${isoY(80, x + 40, z + 20)} ${isoX(x + 28, z + 20)},${isoY(35, x + 28, z + 20)} ${isoX(x + 52, z + 20)},${isoY(35, x + 52, z + 20)}" fill="#3a6a3a"/>
                    <rect x="${isoX(x + 38, z + 20) - 3}" y="${isoY(10, x + 38, z + 20)}" width="6" height="15" fill="#5a3a2a"/>
                    <!-- 날짜 라벨 -->
                    <text x="${isoX(x + 40, z + 20)}" y="${isoY(-20, x + 40, z + 20)}" text-anchor="middle" fill="#8b949e" font-size="10">${dayNames[day.weekday]}</text>
                    <text x="${isoX(x + 40, z + 20)}" y="${isoY(-35, x + 40, z + 20)}" text-anchor="middle" fill="#58a6ff" font-size="12" font-weight="bold">${day.contributionCount}</text>
                </g>`;
        } else {
            // 건물
            let windows = '';
            const windowRows = Math.floor(height / 25);
            const windowCols = 3;
            
            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowCols; col++) {
                    const wy = height - 20 - row * 25;
                    const wx = x + 15 + col * 20;
                    const opacity = (0.5 + Math.random() * 0.5).toFixed(2);
                    const windowX = isoX(wx, z);
                    const windowY = isoY(wy, wx, z);
                    windows += `<rect class="window" x="${windowX - 4}" y="${windowY - 6}" width="8" height="12" fill="url(#windowGlow)" opacity="${opacity}"/>`;
                }
            }
            
            let towerLight = '';
            if (level === 4) {
                const lightX = isoX(x + 40, z + 20);
                const lightY = isoY(height + 15, x + 40, z + 20);
                towerLight = `
                    <circle class="tower-light" cx="${lightX}" cy="${lightY}" r="8" fill="#ff0000" opacity="0.3"/>
                    <circle class="tower-light" cx="${lightX}" cy="${lightY}" r="4" fill="#ff3333"/>`;
            }
            
            buildings += `
                <g class="building">
                    <!-- 왼쪽 면 -->
                    <polygon points="${points.fl.x},${points.fl.y} ${points.tfl.x},${points.tfl.y} ${points.tbl.x},${points.tbl.y} ${points.bl.x},${points.bl.y}" fill="${colors.left}"/>
                    <!-- 오른쪽 면 -->
                    <polygon points="${points.fr.x},${points.fr.y} ${points.tfr.x},${points.tfr.y} ${points.tbr.x},${points.tbr.y} ${points.br.x},${points.br.y}" fill="${colors.right}"/>
                    <!-- 앞면 -->
                    <polygon points="${points.fl.x},${points.fl.y} ${points.tfl.x},${points.tfl.y} ${points.tfr.x},${points.tfr.y} ${points.fr.x},${points.fr.y}" fill="${colors.base}"/>
                    <!-- 지붕 -->
                    <polygon points="${points.tbl.x},${points.tbl.y} ${points.tbr.x},${points.tbr.y} ${points.tfr.x},${points.tfr.y} ${points.tfl.x},${points.tfl.y}" fill="${colors.roof}"/>
                    <!-- 창문 -->
                    ${windows}
                    <!-- 타워 불빛 -->
                    ${towerLight}
                    <!-- 날짜 라벨 -->
                    <text x="${isoX(x + 40, z + 20)}" y="${isoY(-20, x + 40, z + 20)}" text-anchor="middle" fill="#8b949e" font-size="10">${dayNames[day.weekday]}</text>
                    <text x="${isoX(x + 40, z + 20)}" y="${isoY(-35, x + 40, z + 20)}" text-anchor="middle" fill="#58a6ff" font-size="12" font-weight="bold">${day.contributionCount}</text>
                </g>`;
        }
    });
    
    // 통계 계산
    const weekTotal = weekData.reduce((sum, d) => sum + d.contributionCount, 0);
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#0a0a20"/>
      <stop offset="100%" style="stop-color:#1a1a40"/>
    </linearGradient>
    <linearGradient id="windowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#ffee88"/>
      <stop offset="100%" style="stop-color:#ffaa33"/>
    </linearGradient>
    <style>
      @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      @keyframes windowFlicker {
        0%, 90%, 100% { opacity: 1; }
        95% { opacity: 0.5; }
      }
      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .star { animation: twinkle 2s ease-in-out infinite; }
      .building { animation: float 4s ease-in-out infinite; }
      .building:nth-child(odd) { animation-delay: 0.5s; }
      .window { animation: windowFlicker 5s ease-in-out infinite; }
      .tower-light { animation: blink 1.5s ease-in-out infinite; }
    </style>
  </defs>
  
  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="url(#skyGradient)"/>
  
  <!-- 별 -->
  ${stars}
  
  <!-- 달 -->
  <circle cx="700" cy="50" r="20" fill="#ffffee" opacity="0.9"/>
  <circle cx="707" cy="46" r="20" fill="url(#skyGradient)"/>
  
  <!-- 땅 -->
  <polygon points="0,340 ${width},340 ${width},${height} 0,${height}" fill="#1a1a2e"/>
  <polygon points="0,340 400,300 ${width},340" fill="#252540"/>
  
  <!-- 건물들 -->
  ${buildings}
  
  <!-- 타이틀 -->
  <text x="400" y="30" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="18" font-weight="bold">
    🏙️ ${USERNAME}'s Contribution City
  </text>
  
  <!-- 통계 -->
  <text x="400" y="${height - 15}" text-anchor="middle" fill="#8b949e" font-family="Arial, sans-serif" font-size="12">
    This Week: ${weekTotal} contributions | Total: ${totalContributions} contributions
  </text>
</svg>`;

    return svg;
}

// 메인 실행
async function main() {
    try {
        console.log(`Fetching contributions for ${USERNAME}...`);
        const calendar = await fetchContributions();
        
        console.log(`Total contributions: ${calendar.totalContributions}`);
        
        const weekData = getLastWeekData(calendar);
        console.log('Last 7 days:', weekData.map(d => `${d.date}: ${d.contributionCount}`).join(', '));
        
        const svg = generateSVG(weekData, calendar.totalContributions);
        
        // 출력 디렉토리 생성
        if (!fs.existsSync('profile-3d-contrib')) {
            fs.mkdirSync('profile-3d-contrib');
        }
        
        fs.writeFileSync('profile-3d-contrib/contribution-city.svg', svg);
        console.log('Generated: profile-3d-contrib/contribution-city.svg');
        
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

main();