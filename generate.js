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

// 최근 7일 데이터 추출
function getLastWeekData(calendar) {
    const allDays = calendar.weeks.flatMap(w => w.contributionDays);
    return allDays.slice(-7);
}

// SVG 생성
function generateSVG(weekData, totalContributions) {
    const width = 900;
    const height = 500;
    
    const buildingWidth = 85;
    const gap = 18;
    const maxHeight = 220;
    const groundY = 380;
    
    // 요일 이름
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    let buildings = '';
    let reflections = '';
    let stars = '';
    let bgBuildings = '';
    
    // 별 생성
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * width;
        const y = Math.random() * 140;
        const r = Math.random() * 1.8 + 0.3;
        const delay = (Math.random() * 4).toFixed(1);
        const duration = (2 + Math.random() * 2).toFixed(1);
        stars += `<circle class="star" cx="${x}" cy="${y}" r="${r}" fill="white" style="animation-delay: ${delay}s; animation-duration: ${duration}s"/>`;
    }
    
    // 배경 빌딩 실루엣 (분위기용)
    for (let i = 0; i < 15; i++) {
        const x = i * 65 - 30;
        const h = 40 + Math.random() * 80;
        const w = 30 + Math.random() * 40;
        bgBuildings += `<rect x="${x}" y="${groundY - h}" width="${w}" height="${h}" fill="#0d0d1a" opacity="0.6"/>`;
    }
    
    // 각 날짜별 건물 생성
    weekData.forEach((day, index) => {
        const level = getLevel(day.contributionCount);
        const bHeight = level === 0 ? 25 : Math.max(50, (day.contributionCount / 12) * maxHeight);
        const x = 95 + index * (buildingWidth + gap);
        const y = groundY - bHeight;
        
        // 건물 색상 (레벨별 그라데이션)
        const colors = [
            { main: '#1a2a1a', accent: '#2d4a2d', glow: '#3a5a3a' }, // 공원
            { main: '#2a3a4a', accent: '#3a4a5a', glow: '#4a6a8a' }, // 주택
            { main: '#3a4a6a', accent: '#4a5a7a', glow: '#6a8aaa' }, // 빌딩
            { main: '#4a3a6a', accent: '#5a4a7a', glow: '#8a6aaa' }, // 고층
            { main: '#5a4a3a', accent: '#7a6a4a', glow: '#aa8a5a' }  // 타워
        ][level];
        
        if (level === 0) {
            // 공원 - 나무들
            buildings += `
                <g class="building" style="animation-delay: ${index * 0.1}s">
                    <!-- 잔디 -->
                    <ellipse cx="${x + buildingWidth/2}" cy="${groundY - 5}" rx="${buildingWidth/2 + 5}" ry="8" fill="#1a3a1a"/>
                    
                    <!-- 나무 1 -->
                    <ellipse cx="${x + 25}" cy="${groundY - 45}" rx="18" ry="25" fill="#2d5a2d"/>
                    <ellipse cx="${x + 25}" cy="${groundY - 55}" rx="14" ry="20" fill="#3a6a3a"/>
                    <rect x="${x + 22}" y="${groundY - 25}" width="6" height="20" fill="#4a3020"/>
                    
                    <!-- 나무 2 -->
                    <ellipse cx="${x + 60}" cy="${groundY - 35}" rx="15" ry="20" fill="#2d5a2d"/>
                    <ellipse cx="${x + 60}" cy="${groundY - 42}" rx="12" ry="16" fill="#3a6a3a"/>
                    <rect x="${x + 57}" y="${groundY - 20}" width="5" height="15" fill="#4a3020"/>
                    
                    <!-- 라벨 -->
                    <text x="${x + buildingWidth/2}" y="${groundY + 25}" text-anchor="middle" fill="#6a7a8a" font-size="11" font-family="'SF Pro Display', Arial, sans-serif">${dayNames[day.weekday]}</text>
                    <text x="${x + buildingWidth/2}" y="${groundY + 42}" text-anchor="middle" fill="#4a9eff" font-size="14" font-weight="600" font-family="'SF Pro Display', Arial, sans-serif">${day.contributionCount}</text>
                </g>`;
        } else {
            // 창문 생성
            let windows = '';
            const windowRows = Math.floor(bHeight / 30);
            const windowCols = 4;
            const winWidth = 12;
            const winHeight = 16;
            const winGapX = (buildingWidth - 20) / windowCols;
            const winGapY = 30;
            
            for (let row = 0; row < windowRows; row++) {
                for (let col = 0; col < windowCols; col++) {
                    const wx = x + 12 + col * winGapX;
                    const wy = y + 20 + row * winGapY;
                    
                    const isLit = Math.random() > 0.25;
                    const warmth = Math.random();
                    const glowColor = isLit 
                        ? (warmth > 0.5 ? '#ffdd77' : '#ffeebb')
                        : '#151520';
                    const opacity = isLit ? (0.75 + Math.random() * 0.25).toFixed(2) : '0.9';
                    const flickerDelay = (Math.random() * 5).toFixed(1);
                    
                    windows += `
                        <rect class="window" x="${wx}" y="${wy}" width="${winWidth}" height="${winHeight}" rx="1" fill="${glowColor}" opacity="${opacity}" style="animation-delay: ${flickerDelay}s"/>
                        ${isLit ? `<rect x="${wx + 2}" y="${wy + 2}" width="${winWidth - 4}" height="${winHeight - 4}" rx="1" fill="#fff8e0" opacity="0.3"/>` : ''}
                    `;
                }
            }
            
            // 건물 반사 (물 위)
            reflections += `
                <g opacity="0.15">
                    <rect x="${x}" y="${groundY + 5}" width="${buildingWidth}" height="${bHeight * 0.4}" fill="url(#buildingGrad${level})"/>
                </g>
            `;
            
            // 건물 본체
            buildings += `
                <g class="building" style="animation-delay: ${index * 0.1}s">
                    <!-- 건물 그림자 -->
                    <rect x="${x + 8}" y="${y + 10}" width="${buildingWidth}" height="${bHeight}" rx="2" fill="#000" opacity="0.3" filter="url(#blur)"/>
                    
                    <!-- 건물 본체 -->
                    <rect x="${x}" y="${y}" width="${buildingWidth}" height="${bHeight}" rx="2" fill="url(#buildingGrad${level})"/>
                    
                    <!-- 건물 하이라이트 (왼쪽) -->
                    <rect x="${x}" y="${y}" width="3" height="${bHeight}" fill="${colors.glow}" opacity="0.4"/>
                    
                    <!-- 건물 옥상 -->
                    <rect x="${x - 2}" y="${y - 4}" width="${buildingWidth + 4}" height="6" rx="1" fill="${colors.accent}"/>
                    
                    <!-- 창문들 -->
                    ${windows}
                    
                    <!-- 라벨 -->
                    <text x="${x + buildingWidth/2}" y="${groundY + 25}" text-anchor="middle" fill="#6a7a8a" font-size="11" font-family="'SF Pro Display', Arial, sans-serif">${dayNames[day.weekday]}</text>
                    <text x="${x + buildingWidth/2}" y="${groundY + 42}" text-anchor="middle" fill="#4a9eff" font-size="14" font-weight="600" font-family="'SF Pro Display', Arial, sans-serif">${day.contributionCount}</text>
                </g>`;
        }
    });
    
    // 통계 계산
    const weekTotal = weekData.reduce((sum, d) => sum + d.contributionCount, 0);
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">
  <defs>
    <!-- 배경 그라데이션 -->
    <linearGradient id="skyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#05050f"/>
      <stop offset="40%" style="stop-color:#0a0a1f"/>
      <stop offset="70%" style="stop-color:#101025"/>
      <stop offset="100%" style="stop-color:#1a1a35"/>
    </linearGradient>
    
    <!-- 물 반사 그라데이션 -->
    <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a35"/>
      <stop offset="100%" style="stop-color:#0a0a1a"/>
    </linearGradient>
    
    <!-- 건물 그라데이션들 -->
    <linearGradient id="buildingGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#3a4a5a"/>
      <stop offset="100%" style="stop-color:#2a3a4a"/>
    </linearGradient>
    <linearGradient id="buildingGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4a5a7a"/>
      <stop offset="100%" style="stop-color:#3a4a6a"/>
    </linearGradient>
    <linearGradient id="buildingGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#5a4a7a"/>
      <stop offset="100%" style="stop-color:#4a3a6a"/>
    </linearGradient>
    <linearGradient id="buildingGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7a6a4a"/>
      <stop offset="100%" style="stop-color:#5a4a3a"/>
    </linearGradient>
    
    <!-- 달 글로우 -->
    <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" style="stop-color:#fffff8"/>
      <stop offset="60%" style="stop-color:#fffde0"/>
      <stop offset="100%" style="stop-color:#fffde0; stop-opacity:0"/>
    </radialGradient>
    
    <!-- 블러 필터 -->
    <filter id="blur" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
    </filter>
    
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <style>
      @keyframes twinkle {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 1; }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      @keyframes windowFlicker {
        0%, 92%, 100% { opacity: 1; }
        95% { opacity: 0.5; }
      }
      @keyframes shimmer {
        0%, 100% { opacity: 0.15; }
        50% { opacity: 0.25; }
      }
      .star { animation: twinkle 3s ease-in-out infinite; }
      .building { animation: float 5s ease-in-out infinite; }
      .window { animation: windowFlicker 6s ease-in-out infinite; }
      .reflection { animation: shimmer 4s ease-in-out infinite; }
    </style>
  </defs>
  
  <!-- 배경 -->
  <rect width="${width}" height="${height}" fill="url(#skyGradient)"/>
  
  <!-- 별 -->
  ${stars}
  
  <!-- 달 -->
  <circle cx="780" cy="70" r="45" fill="url(#moonGlow)" opacity="0.3"/>
  <circle cx="780" cy="70" r="28" fill="#fffde8"/>
  <circle cx="770" cy="65" r="5" fill="#f0f0d0" opacity="0.4"/>
  <circle cx="788" cy="78" r="3" fill="#f0f0d0" opacity="0.3"/>
  
  <!-- 배경 빌딩 실루엣 -->
  ${bgBuildings}
  
  <!-- 땅/물 -->
  <rect x="0" y="${groundY}" width="${width}" height="${height - groundY}" fill="url(#waterGradient)"/>
  
  <!-- 수평선 하이라이트 -->
  <line x1="0" y1="${groundY}" x2="${width}" y2="${groundY}" stroke="#3a4a6a" stroke-width="1" opacity="0.5"/>
  
  <!-- 건물 반사 -->
  <g class="reflection">
    ${reflections}
  </g>
  
  <!-- 건물들 -->
  ${buildings}
  
  <!-- 타이틀 -->
  <text x="${width/2}" y="35" text-anchor="middle" fill="#ffffff" font-family="'SF Pro Display', Arial, sans-serif" font-size="22" font-weight="600" filter="url(#glow)">
    ${USERNAME}'s Contribution City
  </text>
  
  <!-- 통계 바 -->
  <rect x="${width/2 - 180}" y="${height - 35}" width="360" height="30" rx="15" fill="#0a0a15" opacity="0.7"/>
  <text x="${width/2 - 80}" y="${height - 15}" text-anchor="middle" fill="#8a9aaa" font-family="'SF Pro Display', Arial, sans-serif" font-size="11">
    This Week: <tspan fill="#4a9eff" font-weight="600">${weekTotal}</tspan>
  </text>
  <line x1="${width/2}" y1="${height - 28}" x2="${width/2}" y2="${height - 12}" stroke="#3a4a5a" stroke-width="1"/>
  <text x="${width/2 + 80}" y="${height - 15}" text-anchor="middle" fill="#8a9aaa" font-family="'SF Pro Display', Arial, sans-serif" font-size="11">
    Total: <tspan fill="#4a9eff" font-weight="600">${totalContributions}</tspan>
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