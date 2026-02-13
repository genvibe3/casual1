// 캔버스 및 컨텍스트 설정
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// 캔버스 크기 설정
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// 게임 상태
const gameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover'
};

let currentState = gameState.MENU;

// 게임 변수
let player;
let obstacles = [];
let coins = [];
let collagens = [];
let citizens = [];
let particles = [];
let jumpEffects = [];
let distance = 0;
let score = 0;
let collectedCoins = 0;
let gameSpeed = 4;
let initialGameSpeed = 4;
let frameCount = 0;
let lastObstacleTime = 0;
let lastCoinTime = 0;
let lastCollagenTime = 0;
let lastCitizenTime = 0;
let bestDistance = localStorage.getItem('bestDistance') || 0;

// 점프 이펙트 클래스
class JumpEffect {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];

        for (let i = 0; i < 12; i++) {
            const angle = (Math.PI * 2 / 12) * i;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * 4,
                vy: Math.sin(angle) * 4 - 3,
                life: 25,
                maxLife: 25,
                size: 3 + Math.random() * 4,
                color: Math.random() > 0.5 ? 'rgba(232, 232, 232,' : 'rgba(232, 160, 160,'
            });
        }
    }

    update() {
        for (let p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.4;
            p.vx *= 0.98;
            p.life--;
        }
    }

    draw() {
        for (let p of this.particles) {
            const alpha = p.life / p.maxLife;
            ctx.fillStyle = p.color + alpha + ')';
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();

            if (p.life > p.maxLife * 0.6) {
                ctx.fillStyle = 'rgba(255, 255, 255, ' + (alpha * 0.4) + ')';
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    isDead() {
        return this.particles.every(p => p.life <= 0);
    }
}

// 플레이어 클래스 (나이 시스템 포함)
class Player {
    constructor() {
        this.width = 50;
        this.height = 80;
        this.x = 150;
        this.y = canvas.height - 170;
        this.groundY = canvas.height - 170;
        this.velocityY = 0;
        this.gravity = 0.9;
        this.jumpPower = -16;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTime = 0;
        this.canDoubleJump = true;
        this.isDoubleJumping = false;
        this.rotation = 0;

        // 나이 시스템
        this.age = 20;
        this.ageTimer = 0;
        this.ageIncreaseRate = 0.005; // 매 프레임마다 나이 증가량

        // 자연스러운 애니메이션을 위한 변수
        this.runCycle = 0;
        this.bodyBounce = 0;
        this.headTilt = 0;
        this.hairSway = [];
        for (let i = 0; i < 5; i++) {
            this.hairSway.push({ x: 0, y: 0, vx: 0, vy: 0 });
        }
        this.clothMotion = 0;
        this.isLanding = false;
        this.landingFrame = 0;
        this.squashStretch = 1;
    }

    jump() {
        if (!this.isJumping && !this.isSliding) {
            this.velocityY = this.jumpPower;
            this.isJumping = true;
            this.canDoubleJump = true;
            this.squashStretch = 0.85;
            jumpEffects.push(new JumpEffect(this.x + 25, this.y + 80));
        } else if (this.isJumping && this.canDoubleJump && !this.isDoubleJumping) {
            this.velocityY = this.jumpPower * 0.85;
            this.isDoubleJumping = true;
            this.canDoubleJump = false;
            this.rotation = 0;
            jumpEffects.push(new JumpEffect(this.x + 25, this.y + 40));
        }
    }

    slide() {
        if (!this.isSliding && !this.isJumping) {
            this.isSliding = true;
            this.slideTime = 35;
        }
    }

    update() {
        // 나이 증가
        this.ageTimer += this.ageIncreaseRate;
        if (this.ageTimer >= 1) {
            this.age += 1;
            this.ageTimer = 0;
        }

        // 80세가 되면 게임오버
        if (this.age >= 80) {
            currentState = gameState.GAMEOVER;
            showGameOver();
        }

        // 달리기 사이클 (자연스러운 속도)
        this.runCycle += 0.18;

        // 상하 바운스 (달릴 때 몸의 움직임)
        this.bodyBounce = Math.sin(this.runCycle) * 3;

        // 머리 기울기 (달릴 때)
        this.headTilt = Math.sin(this.runCycle * 0.5) * 0.05;

        // 옷 움직임
        this.clothMotion = Math.sin(this.runCycle * 1.2) * 2;

        // 머리카락 물리 시뮬레이션
        for (let i = 0; i < this.hairSway.length; i++) {
            const hair = this.hairSway[i];
            const targetX = Math.sin(this.runCycle * 0.8 + i * 0.5) * (10 - i * 1.5);
            const targetY = Math.sin(this.runCycle * 0.6 + i * 0.3) * (5 - i);

            hair.vx += (targetX - hair.x) * 0.15;
            hair.vy += (targetY - hair.y) * 0.15;
            hair.vx *= 0.85;
            hair.vy *= 0.85;
            hair.x += hair.vx;
            hair.y += hair.vy;
        }

        if (this.isSliding) {
            this.slideTime--;
            if (this.slideTime <= 0) {
                this.isSliding = false;
            }
        }

        if (this.isJumping) {
            this.velocityY += this.gravity;
            this.y += this.velocityY;

            if (this.isDoubleJumping) {
                this.rotation += 0.22;
            }

            // 착지 감지
            if (this.velocityY > 0 && this.y >= this.groundY - 10) {
                this.isLanding = true;
                this.landingFrame = 10;
            }

            if (this.y >= this.groundY) {
                this.y = this.groundY;
                this.velocityY = 0;
                this.isJumping = false;
                this.isDoubleJumping = false;
                this.canDoubleJump = true;
                this.rotation = 0;
                this.squashStretch = 0.9;
            }
        }

        // 착지 후 효과
        if (this.isLanding) {
            this.landingFrame--;
            if (this.landingFrame <= 0) {
                this.isLanding = false;
            }
        }

        // 스쿼시 & 스트레치 복구
        if (this.squashStretch < 1) {
            this.squashStretch += 0.05;
            if (this.squashStretch > 1) this.squashStretch = 1;
        } else if (this.squashStretch > 1) {
            this.squashStretch -= 0.05;
            if (this.squashStretch < 1) this.squashStretch = 1;
        }
    }

    // 나이에 따른 외형 변화
    getAgeAppearance() {
        const age = this.age;

        // 머리색 (20대: 은회색, 40대부터 점점 하얗게, 60대 이상: 백발)
        let hairColor = '#E8E8E8';
        if (age >= 60) {
            hairColor = '#FFFFFF';
        } else if (age >= 40) {
            const grayness = (age - 40) / 20;
            const gray = Math.floor(232 + (255 - 232) * grayness);
            hairColor = `rgb(${gray}, ${gray}, ${gray})`;
        } else {
            hairColor = '#E8E8E8';
        }

        // 피부색 (나이들수록 어두워짐)
        let skinColor = '#FFE0BD';
        if (age >= 50) {
            skinColor = '#E8C8A8';
        } else if (age >= 40) {
            skinColor = '#F0D0B0';
        }

        // 주름 (40세 이상부터 증가)
        const wrinkles = Math.max(0, (age - 40) / 40);

        // 허리 굽음 (60세 이상부터)
        const bend = Math.max(0, (age - 60) / 20) * 8;

        return { hairColor, skinColor, wrinkles, bend };
    }

    draw() {
        ctx.save();

        const baseY = this.y + (this.isJumping ? 0 : this.bodyBounce);
        const appearance = this.getAgeAppearance();

        if (this.isDoubleJumping) {
            ctx.translate(this.x + 25, baseY + 40);
            ctx.rotate(this.rotation);
            ctx.translate(-(this.x + 25), -(baseY + 40));
        }

        // 착지 스쿼시 효과
        if (this.isLanding) {
            ctx.translate(this.x + 25, baseY + 40);
            ctx.scale(1.1, 0.9);
            ctx.translate(-(this.x + 25), -(baseY + 40));
        }

        // 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(this.x + 25, this.groundY + 85, 20, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        if (this.isSliding) {
            this.drawSliding(baseY, appearance);
        } else {
            this.drawStanding(baseY, appearance);
        }

        ctx.restore();
    }

    drawStanding(baseY, appearance) {
        const x = this.x;
        const y = baseY;

        // 허리 굽음 적용
        const bendOffset = appearance.bend;

        // === 뒷머리 (5개 레이어) ===
        const hairColors = [
            appearance.hairColor,
            this.adjustColor(appearance.hairColor, -10),
            this.adjustColor(appearance.hairColor, -20),
            this.adjustColor(appearance.hairColor, -15),
            this.adjustColor(appearance.hairColor, -5)
        ];

        for (let i = 4; i >= 0; i--) {
            const hair = this.hairSway[i];
            const layerOffset = i * 3;

            ctx.fillStyle = hairColors[i];
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 5);
            ctx.quadraticCurveTo(
                x + 10 + hair.x - layerOffset,
                y + 35 + hair.y,
                x + 15 + hair.x - layerOffset,
                y + 65 + hair.y
            );
            ctx.quadraticCurveTo(
                x + 22 + hair.x - layerOffset,
                y + 75 + hair.y,
                x + 25 + hair.x - layerOffset,
                y + 70 + hair.y
            );
            ctx.lineTo(x + 25, y + 10);
            ctx.closePath();
            ctx.fill();
        }

        // === 얼굴 ===
        ctx.fillStyle = appearance.skinColor;
        ctx.beginPath();
        ctx.ellipse(x + 25, y + 15, 12, 15, this.headTilt, 0, Math.PI * 2);
        ctx.fill();

        // 눈 (깜빡임)
        const blink = (Math.floor(frameCount / 120) % 10 === 0 && frameCount % 120 < 15) ? 0.3 : 1;

        // 왼쪽 눈
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 12, 3.5, 4 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        // 눈동자 (갈색/황금빛)
        const gradient = ctx.createRadialGradient(x + 20, y + 12, 0, x + 20, y + 12, 3);
        gradient.addColorStop(0, '#C9A86A');
        gradient.addColorStop(0.6, '#8B6F47');
        gradient.addColorStop(1, '#6B5637');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 12, 2.5, 2.8 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        // 동공
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(x + 20, y + 12, 1.2 * blink, 0, Math.PI * 2);
        ctx.fill();

        // 하이라이트
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x + 19, y + 10.5, 0.8 * blink, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 21, y + 13, 0.5 * blink, 0, Math.PI * 2);
        ctx.fill();

        // 오른쪽 눈
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 12, 3.5, 4 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        const gradient2 = ctx.createRadialGradient(x + 30, y + 12, 0, x + 30, y + 12, 3);
        gradient2.addColorStop(0, '#C9A86A');
        gradient2.addColorStop(0.6, '#8B6F47');
        gradient2.addColorStop(1, '#6B5637');
        ctx.fillStyle = gradient2;
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 12, 2.5, 2.8 * blink, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(x + 30, y + 12, 1.2 * blink, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(x + 29, y + 10.5, 0.8 * blink, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 31, y + 13, 0.5 * blink, 0, Math.PI * 2);
        ctx.fill();

        // 주름 (나이 들면 표시)
        if (appearance.wrinkles > 0) {
            ctx.strokeStyle = `rgba(100, 80, 60, ${appearance.wrinkles * 0.5})`;
            ctx.lineWidth = 1;
            // 이마 주름
            ctx.beginPath();
            ctx.moveTo(x + 18, y + 5);
            ctx.lineTo(x + 32, y + 5);
            ctx.stroke();
            // 눈가 주름
            ctx.beginPath();
            ctx.moveTo(x + 33, y + 12);
            ctx.lineTo(x + 35, y + 13);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 17, y + 12);
            ctx.lineTo(x + 15, y + 13);
            ctx.stroke();
        }

        // 코
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 25, y + 15);
        ctx.lineTo(x + 26, y + 18);
        ctx.stroke();

        // 입
        ctx.strokeStyle = 'rgba(200, 100, 100, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 25, y + 21, 3, 0.1, Math.PI - 0.1);
        ctx.stroke();

        // === 목 ===
        ctx.fillStyle = appearance.skinColor;
        ctx.fillRect(x + 20, y + 28, 10, 8);

        // === 후드티 (검은색) ===
        ctx.fillStyle = '#3A3A3A';
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 36);
        ctx.quadraticCurveTo(x + 25 + this.clothMotion, y + 33, x + 35, y + 36);
        ctx.lineTo(x + 38, y + 55);
        ctx.quadraticCurveTo(x + 25 + this.clothMotion * 0.5, y + 58, x + 12, y + 55);
        ctx.closePath();
        ctx.fill();

        // 후드 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.ellipse(x + 25, y + 45, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // === 치마 (검은색 주름 치마) ===
        ctx.fillStyle = '#2A2A2A';
        ctx.beginPath();
        ctx.moveTo(x + 12, y + 55);
        ctx.lineTo(x + 10 + bendOffset, y + 68);
        ctx.lineTo(x + 40 + bendOffset, y + 68);
        ctx.lineTo(x + 38, y + 55);
        ctx.closePath();
        ctx.fill();

        // 치마 주름선
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath();
            ctx.moveTo(x + 15 + i * 7, y + 55);
            ctx.lineTo(x + 13 + i * 7 + bendOffset * 0.5, y + 68);
            ctx.stroke();
        }

        // === 다리 (자연스러운 달리기) ===
        const frontLegY = Math.max(0, Math.sin(this.runCycle) * 12);
        const backLegY = Math.max(0, Math.sin(this.runCycle + Math.PI) * 12);

        // 뒷다리
        ctx.fillStyle = appearance.skinColor;
        ctx.fillRect(x + 18 + bendOffset, y + 68, 6, 15 + backLegY);

        // 앞다리
        ctx.fillRect(x + 26 + bendOffset, y + 68, 6, 15 + frontLegY);

        // === 양말 (흰색) ===
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x + 18 + bendOffset, y + 83 + backLegY, 6, 8);
        ctx.fillRect(x + 26 + bendOffset, y + 83 + frontLegY, 6, 8);

        // === 운동화 (분홍색) ===
        ctx.fillStyle = '#E8A0A0';
        ctx.beginPath();
        ctx.ellipse(x + 21 + bendOffset, y + 91 + backLegY, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 29 + bendOffset, y + 91 + frontLegY, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 신발 디테일
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 17 + bendOffset, y + 90 + backLegY);
        ctx.lineTo(x + 25 + bendOffset, y + 90 + backLegY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 25 + bendOffset, y + 90 + frontLegY);
        ctx.lineTo(x + 33 + bendOffset, y + 90 + frontLegY);
        ctx.stroke();

        // === 팔 (자연스러운 스윙) ===
        const frontArmAngle = Math.sin(this.runCycle + Math.PI) * 0.6;
        const backArmAngle = Math.sin(this.runCycle) * 0.6;

        // 뒷팔
        ctx.save();
        ctx.translate(x + 16, y + 40);
        ctx.rotate(backArmAngle);
        ctx.fillStyle = '#3A3A3A';
        ctx.fillRect(-3, 0, 6, 18);
        ctx.fillStyle = appearance.skinColor;
        ctx.beginPath();
        ctx.arc(0, 18, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 앞팔
        ctx.save();
        ctx.translate(x + 34, y + 40);
        ctx.rotate(frontArmAngle);
        ctx.fillStyle = '#3A3A3A';
        ctx.fillRect(-3, 0, 6, 18);
        ctx.fillStyle = appearance.skinColor;
        ctx.beginPath();
        ctx.arc(0, 18, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // === 앞머리 ===
        ctx.fillStyle = hairColors[0];
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 8);
        ctx.quadraticCurveTo(x + 12, y + 2, x + 20, y + 5);
        ctx.quadraticCurveTo(x + 25, y + 0, x + 30, y + 5);
        ctx.quadraticCurveTo(x + 38, y + 2, x + 35, y + 8);
        ctx.lineTo(x + 32, y + 12);
        ctx.lineTo(x + 18, y + 12);
        ctx.closePath();
        ctx.fill();
    }

    drawSliding(baseY, appearance) {
        const x = this.x;
        const y = baseY + 35;

        // 슬라이딩 자세
        ctx.fillStyle = appearance.skinColor;
        ctx.beginPath();
        ctx.ellipse(x + 25, y + 5, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#3A3A3A';
        ctx.fillRect(x + 10, y + 15, 50, 20);

        ctx.fillStyle = appearance.skinColor;
        ctx.fillRect(x + 60, y + 20, 20, 8);

        ctx.fillStyle = '#E8A0A0';
        ctx.beginPath();
        ctx.ellipse(x + 80, y + 24, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    adjustColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    getHitbox() {
        if (this.isSliding) {
            return {
                x: this.x + 10,
                y: this.y + 50,
                width: 40,
                height: 25
            };
        }
        return {
            x: this.x + 10,
            y: this.y + 10,
            width: 30,
            height: 70
        };
    }
}

// 헌팅남 클래스 (플레이어에게 접근, 다양한 외형, 차/자전거)
class Obstacle {
    constructor() {
        this.width = 50;
        this.height = 80;
        this.x = canvas.width + Math.random() * 300;
        this.y = canvas.height - 170;
        this.speed = gameSpeed;

        // 타입: walk(걷기), bike(자전거), car(차)
        const rand = Math.random();
        if (rand < 0.15) {
            this.type = 'car';
            this.width = 120;
            this.height = 70;
            this.speed = gameSpeed * 1.8;
        } else if (rand < 0.35) {
            this.type = 'bike';
            this.width = 80;
            this.height = 80;
            this.speed = gameSpeed * 1.3;
        } else {
            this.type = 'walk';
        }

        // 플레이어 방향으로 접근 속도
        this.approachSpeed = 0.8 + Math.random() * 1.2;

        // 외형 다양화
        this.hairStyle = ['short', 'long', 'sport', 'curly', 'slick'][Math.floor(Math.random() * 5)];
        this.outfit = ['casual', 'suit', 'hoodie', 'sport', 'jacket'][Math.floor(Math.random() * 5)];
        this.skinColor = ['#FFE0BD', '#F5D0B8', '#E8C4A8', '#DDB896'][Math.floor(Math.random() * 4)];
        this.hairColor = ['#2C1810', '#4A3520', '#6B4423', '#8B5A2B'][Math.floor(Math.random() * 4)];

        // 의상 색상
        this.outfitColor = this.getOutfitColor();

        // 걷기 애니메이션
        this.walkCycle = Math.random() * Math.PI * 2;

        // 대화
        this.distanceToPlayer = 1000;
        this.speech = this.getInitialSpeech();
        this.speechTimer = 0;
        this.speechDuration = 180;
    }

    getOutfitColor() {
        const colors = {
            casual: ['#4A90E2', '#E85D75', '#50C878', '#FFD700'],
            suit: ['#2C3E50', '#34495E', '#1C2833'],
            hoodie: ['#95A5A6', '#E74C3C', '#3498DB', '#2ECC71'],
            sport: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'],
            jacket: ['#8B4513', '#2F4F4F', '#696969', '#556B2F']
        };
        const outfitColors = colors[this.outfit];
        return outfitColors[Math.floor(Math.random() * outfitColors.length)];
    }

    getInitialSpeech() {
        const speeches = [
            '안녕하세요~',
            '혹시...',
            '저기요!',
            '잠깐만요~',
            '어디 가세요?'
        ];
        return speeches[Math.floor(Math.random() * speeches.length)];
    }

    updateSpeech() {
        if (this.distanceToPlayer < 150) {
            // 가까움: 고백/데이트 신청
            const closeSpeeches = [
                '사랑해요! ❤️',
                '저랑 사귈래요?',
                '영화 볼래요?',
                '커피 한잔해요!',
                '번호 좀 알려주세요!',
                '정말 예뻐요!',
                '데이트 신청합니다!',
                '운명이에요!'
            ];
            this.speech = closeSpeeches[Math.floor(Math.random() * closeSpeeches.length)];
        } else if (this.distanceToPlayer < 300) {
            // 중간: 칭찬/말 걸기
            const midSpeeches = [
                '오늘 멋진데요?',
                '어디 사세요?',
                '혼자 달려요?',
                '인스타 해요?',
                '미소가 예뻐요~',
                '자주 오세요?',
                '같이 달릴까요?',
                '전화번호 좀...'
            ];
            this.speech = midSpeeches[Math.floor(Math.random() * midSpeeches.length)];
        } else {
            // 멀음: 인사/관심
            const farSpeeches = [
                '안녕하세요~',
                '저기요!',
                '잠깐만요!',
                '혹시...',
                '실례지만...',
                '어디 가세요?'
            ];
            this.speech = farSpeeches[Math.floor(Math.random() * farSpeeches.length)];
        }
    }

    update() {
        // 기본 이동
        this.x -= this.speed;

        // 플레이어에게 접근 (y축 이동)
        if (player) {
            this.distanceToPlayer = Math.abs(this.x - player.x);

            const targetY = player.y + 20;
            const dy = targetY - this.y;
            if (Math.abs(dy) > 2) {
                this.y += dy * 0.015 * this.approachSpeed;
            }
        }

        // 걷기 애니메이션
        this.walkCycle += 0.15;

        // 말풍선 업데이트
        this.speechTimer++;
        if (this.speechTimer >= this.speechDuration) {
            this.updateSpeech();
            this.speechTimer = 0;
            this.speechDuration = 120 + Math.random() * 120;
        }
    }

    draw() {
        if (this.type === 'car') {
            this.drawCar();
        } else if (this.type === 'bike') {
            this.drawBike();
        } else {
            this.drawWalking();
        }

        // 말풍선
        this.drawSpeechBubble();
    }

    drawWalking() {
        const x = this.x;
        const y = this.y;

        ctx.save();

        // 머리카락
        ctx.fillStyle = this.hairColor;
        this.drawHair(x, y);

        // 얼굴
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.ellipse(x + 25, y + 15, 11, 14, 0, 0, Math.PI * 2);
        ctx.fill();

        // 눈
        ctx.fillStyle = '#2C1810';
        ctx.beginPath();
        ctx.arc(x + 21, y + 13, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 29, y + 13, 2, 0, Math.PI * 2);
        ctx.fill();

        // 입 (미소)
        ctx.strokeStyle = '#C86464';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(x + 25, y + 20, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();

        // 목
        ctx.fillStyle = this.skinColor;
        ctx.fillRect(x + 20, y + 28, 10, 7);

        // 상의
        this.drawOutfit(x, y);

        // 하의 (바지)
        ctx.fillStyle = this.adjustColorBrightness(this.outfitColor, -40);
        ctx.fillRect(x + 15, y + 58, 10, 25);
        ctx.fillRect(x + 25, y + 58, 10, 25);

        // 신발
        ctx.fillStyle = '#4A3520';
        const legL = Math.max(0, Math.sin(this.walkCycle) * 8);
        const legR = Math.max(0, Math.sin(this.walkCycle + Math.PI) * 8);

        ctx.beginPath();
        ctx.ellipse(x + 20, y + 83 + legL, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 83 + legR, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    drawHair(x, y) {
        ctx.fillStyle = this.hairColor;

        switch (this.hairStyle) {
            case 'short':
                // 짧은 머리
                ctx.beginPath();
                ctx.arc(x + 25, y + 10, 13, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'long':
                // 긴 머리
                ctx.beginPath();
                ctx.ellipse(x + 25, y + 15, 13, 25, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'sport':
                // 스포츠 머리
                ctx.beginPath();
                ctx.arc(x + 25, y + 8, 12, 0, Math.PI);
                ctx.fill();
                break;
            case 'curly':
                // 곱슬머리
                ctx.beginPath();
                ctx.arc(x + 18, y + 10, 8, 0, Math.PI * 2);
                ctx.arc(x + 25, y + 8, 9, 0, Math.PI * 2);
                ctx.arc(x + 32, y + 10, 8, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'slick':
                // 넘긴 머리
                ctx.beginPath();
                ctx.ellipse(x + 25, y + 10, 13, 10, 0.3, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
    }

    drawOutfit(x, y) {
        ctx.fillStyle = this.outfitColor;

        switch (this.outfit) {
            case 'casual':
                // 티셔츠
                ctx.fillRect(x + 13, y + 35, 24, 23);
                // 팔
                ctx.fillRect(x + 8, y + 35, 5, 15);
                ctx.fillRect(x + 37, y + 35, 5, 15);
                break;
            case 'suit':
                // 정장
                ctx.fillRect(x + 15, y + 35, 20, 23);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x + 25, y + 35);
                ctx.lineTo(x + 25, y + 58);
                ctx.stroke();
                // 팔
                ctx.fillStyle = this.outfitColor;
                ctx.fillRect(x + 8, y + 35, 7, 18);
                ctx.fillRect(x + 35, y + 35, 7, 18);
                break;
            case 'hoodie':
                // 후드티
                ctx.beginPath();
                ctx.moveTo(x + 13, y + 35);
                ctx.quadraticCurveTo(x + 25, y + 33, x + 37, y + 35);
                ctx.lineTo(x + 37, y + 58);
                ctx.lineTo(x + 13, y + 58);
                ctx.closePath();
                ctx.fill();
                // 팔
                ctx.fillRect(x + 8, y + 35, 5, 18);
                ctx.fillRect(x + 37, y + 35, 5, 18);
                break;
            case 'sport':
                // 운동복
                ctx.fillRect(x + 13, y + 35, 24, 23);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.strokeRect(x + 15, y + 37, 20, 19);
                ctx.setLineDash([]);
                // 팔
                ctx.fillStyle = this.outfitColor;
                ctx.fillRect(x + 8, y + 35, 5, 15);
                ctx.fillRect(x + 37, y + 35, 5, 15);
                break;
            case 'jacket':
                // 재킷
                ctx.fillRect(x + 13, y + 35, 24, 23);
                ctx.fillStyle = this.adjustColorBrightness(this.outfitColor, -30);
                ctx.fillRect(x + 13, y + 35, 5, 23);
                // 팔
                ctx.fillStyle = this.outfitColor;
                ctx.fillRect(x + 8, y + 35, 7, 18);
                ctx.fillRect(x + 35, y + 35, 7, 18);
                break;
        }
    }

    drawBike() {
        const x = this.x;
        const y = this.y + 20;

        // 사람 (간단히)
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(x + 40, y + 5, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.outfitColor;
        ctx.fillRect(x + 33, y + 15, 14, 20);

        // 자전거 바퀴
        ctx.strokeStyle = '#4A4A4A';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + 15, y + 45, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x + 55, y + 45, 12, 0, Math.PI * 2);
        ctx.stroke();

        // 자전거 프레임
        ctx.strokeStyle = '#E74C3C';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x + 35, y + 30);
        ctx.lineTo(x + 15, y + 45);
        ctx.moveTo(x + 35, y + 30);
        ctx.lineTo(x + 55, y + 45);
        ctx.moveTo(x + 35, y + 30);
        ctx.lineTo(x + 35, y + 15);
        ctx.stroke();
    }

    drawCar() {
        const x = this.x;
        const y = this.y + 30;

        // 차체
        ctx.fillStyle = this.outfitColor;
        ctx.fillRect(x + 10, y + 20, 100, 30);
        ctx.fillRect(x + 30, y + 5, 60, 15);

        // 창문
        ctx.fillStyle = 'rgba(100, 150, 200, 0.6)';
        ctx.fillRect(x + 35, y + 8, 25, 12);
        ctx.fillRect(x + 65, y + 8, 20, 12);

        // 바퀴
        ctx.fillStyle = '#2C2C2C';
        ctx.beginPath();
        ctx.arc(x + 30, y + 50, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 90, y + 50, 8, 0, Math.PI * 2);
        ctx.fill();

        // 헤드라이트
        ctx.fillStyle = '#FFE66D';
        ctx.fillRect(x + 105, y + 25, 5, 8);

        // 사람 얼굴 (운전석)
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.arc(x + 75, y + 13, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawSpeechBubble() {
        const bubbleX = this.x + this.width + 10;
        const bubbleY = this.y - 30;
        const padding = 8;

        ctx.font = '12px Arial';
        const textWidth = ctx.measureText(this.speech).width;
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 24;

        // 말풍선 배경
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 5);
        ctx.fill();
        ctx.stroke();

        // 말풍선 꼬리
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.moveTo(bubbleX + 10, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight + 8);
        ctx.lineTo(bubbleX + 20, bubbleY + bubbleHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 텍스트
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(this.speech, bubbleX + padding, bubbleY + 16);
    }

    adjustColorBrightness(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    getHitbox() {
        return {
            x: this.x + 10,
            y: this.y + 10,
            width: this.width - 20,
            height: this.height - 20
        };
    }

    isOffScreen() {
        return this.x + this.width < -100;
    }
}

// 일반 시민 클래스
class Citizen {
    constructor() {
        this.width = 50;
        this.height = 80;
        this.x = canvas.width + Math.random() * 400;
        this.y = canvas.height - 170;
        this.speed = gameSpeed * (0.8 + Math.random() * 0.4);

        // 외형
        this.gender = Math.random() > 0.5 ? 'male' : 'female';
        this.skinColor = ['#FFE0BD', '#F5D0B8', '#E8C4A8', '#DDB896'][Math.floor(Math.random() * 4)];
        this.hairColor = ['#2C1810', '#4A3520', '#6B4423', '#8B5A2B', '#C9A86A'][Math.floor(Math.random() * 5)];
        this.outfitColor = ['#4A90E2', '#E85D75', '#50C878', '#FFD700', '#9B59B6'][Math.floor(Math.random() * 5)];

        // 걷기 애니메이션
        this.walkCycle = Math.random() * Math.PI * 2;
    }

    update() {
        this.x -= this.speed;
        this.walkCycle += 0.15;
    }

    draw() {
        const x = this.x;
        const y = this.y;

        ctx.save();

        // 머리
        ctx.fillStyle = this.hairColor;
        ctx.beginPath();
        ctx.arc(x + 25, y + 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // 얼굴
        ctx.fillStyle = this.skinColor;
        ctx.beginPath();
        ctx.ellipse(x + 25, y + 15, 10, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        // 운동복 상의
        ctx.fillStyle = this.outfitColor;
        ctx.fillRect(x + 13, y + 27, 24, 28);

        // 운동복 하의
        ctx.fillStyle = this.adjustColorBrightness(this.outfitColor, -30);
        const legL = Math.max(0, Math.sin(this.walkCycle) * 10);
        const legR = Math.max(0, Math.sin(this.walkCycle + Math.PI) * 10);

        ctx.fillRect(x + 15, y + 55, 8, 20 + legL);
        ctx.fillRect(x + 27, y + 55, 8, 20 + legR);

        // 운동화
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.ellipse(x + 19, y + 75 + legL, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 31, y + 75 + legR, 6, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    adjustColorBrightness(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const r = Math.max(0, Math.min(255, (num >> 16) + amount));
        const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
        const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
        return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// 콜라겐 캡슐 클래스 (나이 회복 아이템)
class Collagen {
    constructor() {
        this.width = 30;
        this.height = 40;
        this.x = canvas.width + Math.random() * 200;
        this.y = canvas.height - 280; // 높은 위치 (2단 점프로만 획득 가능)
        this.speed = gameSpeed;
        this.floatOffset = 0;
        this.floatSpeed = 0.08;
    }

    update() {
        this.x -= this.speed;
        this.floatOffset += this.floatSpeed;
    }

    draw() {
        const x = this.x;
        const y = this.y + Math.sin(this.floatOffset) * 8;

        // 빛나는 효과
        ctx.save();
        ctx.shadowColor = 'rgba(255, 182, 193, 0.8)';
        ctx.shadowBlur = 15;

        // 캡슐 (분홍색)
        const gradient = ctx.createLinearGradient(x, y, x, y + 40);
        gradient.addColorStop(0, '#FFB6C1');
        gradient.addColorStop(0.5, '#FF69B4');
        gradient.addColorStop(1, '#FFB6C1');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, 30, 40, 15);
        ctx.fill();

        // 반짝임
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(x + 10, y + 12, 4, 0, Math.PI * 2);
        ctx.fill();

        // 텍스트
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Arial';
        ctx.fillText('콜라겐', x + 2, y + 26);

        ctx.restore();

        // 반짝이는 파티클
        for (let i = 0; i < 3; i++) {
            const angle = this.floatOffset + (i * Math.PI * 2 / 3);
            const px = x + 15 + Math.cos(angle) * 20;
            const py = y + 20 + Math.sin(angle) * 15;
            ctx.fillStyle = `rgba(255, 182, 193, ${0.3 + Math.sin(this.floatOffset * 2) * 0.3})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    getHitbox() {
        return {
            x: this.x,
            y: this.y + Math.sin(this.floatOffset) * 8,
            width: this.width,
            height: this.height
        };
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// 코인 클래스
class Coin {
    constructor() {
        this.width = 30;
        this.height = 30;
        this.x = canvas.width + Math.random() * 200;
        this.y = canvas.height - 200 - Math.random() * 50;
        this.speed = gameSpeed;
        this.rotation = 0;
        this.value = 10;
    }

    update() {
        this.x -= this.speed;
        this.rotation += 0.1;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + 15, this.y + 15);
        ctx.rotate(this.rotation);

        const scale = Math.abs(Math.cos(this.rotation));
        ctx.scale(scale, 1);

        const gradient = ctx.createRadialGradient(0, 0, 5, 0, 0, 15);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFA500');
        gradient.addColorStop(1, '#FF8C00');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#B8860B';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#8B6914';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('₩', 0, 0);

        ctx.restore();
    }

    getHitbox() {
        return {
            x: this.x + 5,
            y: this.y + 5,
            width: 20,
            height: 20
        };
    }

    isOffScreen() {
        return this.x + this.width < -50;
    }
}

// 파티클 클래스
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6 - 2;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = 3 + Math.random() * 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.3;
        this.vx *= 0.98;
        this.life--;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color.replace('1)', alpha + ')');
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }

    isDead() {
        return this.life <= 0;
    }
}

// 배경 그리기 (서울 랜드마크)
function drawBackground() {
    // === 하늘 ===
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.5);
    skyGradient.addColorStop(0, '#87CEEB');
    skyGradient.addColorStop(0.5, '#A8D8EA');
    skyGradient.addColorStop(1, '#C8E6F5');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.5);

    // 태양
    ctx.fillStyle = 'rgba(255, 230, 120, 0.9)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 60, 50, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 240, 150, 0.4)';
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 60, 70, 0, Math.PI * 2);
    ctx.fill();

    // === 구름 ===
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    const cloudOffset = (frameCount * 0.15) % (canvas.width + 500);
    for (let i = 0; i < 6; i++) {
        const x = (i * 500 - cloudOffset) % (canvas.width + 500);
        const y = 30 + i * 30;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.arc(x + 40, y, 42, 0, Math.PI * 2);
        ctx.arc(x + 80, y, 35, 0, Math.PI * 2);
        ctx.arc(x + 120, y, 30, 0, Math.PI * 2);
        ctx.fill();
    }

    // === 뒤쪽 산 (북한산) ===
    const mountainOffset = (frameCount * gameSpeed * 0.05) % 200;
    ctx.fillStyle = '#7B92A8';
    ctx.beginPath();
    ctx.moveTo(-50 - mountainOffset, canvas.height * 0.4);
    ctx.lineTo(canvas.width * 0.2 - mountainOffset, canvas.height * 0.28);
    ctx.lineTo(canvas.width * 0.35 - mountainOffset, canvas.height * 0.4);
    ctx.lineTo(-50 - mountainOffset, canvas.height * 0.4);
    ctx.fill();

    ctx.fillStyle = '#8BA2B8';
    ctx.beginPath();
    ctx.moveTo(canvas.width * 0.3 - mountainOffset, canvas.height * 0.4);
    ctx.lineTo(canvas.width * 0.5 - mountainOffset, canvas.height * 0.3);
    ctx.lineTo(canvas.width * 0.7 - mountainOffset, canvas.height * 0.4);
    ctx.fill();

    // === 롯데월드타워 (가장 높은 빌딩) ===
    const buildingOffset = (frameCount * gameSpeed * 0.12) % 300;
    const lotteTowerX = canvas.width * 0.7 - buildingOffset;

    // 롯데타워 본체
    ctx.fillStyle = '#5A8DB8';
    ctx.beginPath();
    ctx.moveTo(lotteTowerX, canvas.height * 0.15);
    ctx.lineTo(lotteTowerX - 12, canvas.height * 0.42);
    ctx.lineTo(lotteTowerX + 32, canvas.height * 0.42);
    ctx.lineTo(lotteTowerX + 20, canvas.height * 0.15);
    ctx.closePath();
    ctx.fill();

    // 유리 반사
    ctx.fillStyle = 'rgba(135, 206, 235, 0.4)';
    for (let i = 0; i < 25; i++) {
        if (Math.random() > 0.3) {
            ctx.fillRect(lotteTowerX - 8 + (i % 3) * 8, canvas.height * 0.18 + Math.floor(i / 3) * 12, 6, 10);
        }
    }

    // 첨탑
    ctx.fillStyle = '#4A7DA8';
    ctx.beginPath();
    ctx.moveTo(lotteTowerX + 10, canvas.height * 0.15);
    ctx.lineTo(lotteTowerX + 5, canvas.height * 0.18);
    ctx.lineTo(lotteTowerX + 15, canvas.height * 0.18);
    ctx.closePath();
    ctx.fill();

    // === N서울타워 (남산) ===
    const towerX = canvas.width * 0.85 - buildingOffset * 0.8;

    // 남산 언덕
    ctx.fillStyle = '#68A968';
    ctx.beginPath();
    ctx.moveTo(towerX - 100, canvas.height * 0.42);
    ctx.quadraticCurveTo(towerX, canvas.height * 0.34, towerX + 100, canvas.height * 0.42);
    ctx.lineTo(towerX + 100, canvas.height * 0.42);
    ctx.closePath();
    ctx.fill();

    // 타워 기둥
    ctx.fillStyle = '#8B8B8B';
    ctx.fillRect(towerX - 3, canvas.height * 0.28, 6, 70);

    // 전망대
    ctx.fillStyle = '#C9C9C9';
    ctx.beginPath();
    ctx.arc(towerX, canvas.height * 0.28, 12, 0, Math.PI * 2);
    ctx.fill();

    // 첨탑
    ctx.fillStyle = '#FF6B6B';
    ctx.beginPath();
    ctx.moveTo(towerX, canvas.height * 0.24);
    ctx.lineTo(towerX - 4, canvas.height * 0.28);
    ctx.lineTo(towerX + 4, canvas.height * 0.28);
    ctx.closePath();
    ctx.fill();

    // === 여의도/강남 빌딩 스카이라인 ===
    for (let i = -1; i < canvas.width / 180 + 2; i++) {
        const x = i * 180 - buildingOffset;
        const heights = [140, 180, 160, 200, 150, 190];
        const colors = ['#4A5568', '#5A6578', '#3A4558', '#6A7588'];
        const height = heights[Math.abs(i) % heights.length];
        const color = colors[Math.abs(i) % colors.length];

        ctx.fillStyle = color;
        ctx.fillRect(x + 20, canvas.height * 0.42 - height, 140, height);

        // 창문 (금색/노란색)
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        for (let row = 0; row < Math.floor(height / 14); row++) {
            for (let col = 0; col < 6; col++) {
                if (Math.random() > 0.15) {
                    ctx.fillRect(x + 25 + col * 22, canvas.height * 0.42 - height + 8 + row * 14, 16, 10);
                }
            }
        }
    }

    // === 숭례문 ===
    const gateX = canvas.width * 0.25 - buildingOffset * 1.2;

    // 성벽
    ctx.fillStyle = '#8B7355';
    ctx.fillRect(gateX - 40, canvas.height * 0.4, 80, 35);

    // 문
    ctx.fillStyle = '#654321';
    ctx.fillRect(gateX - 15, canvas.height * 0.4 + 10, 30, 25);

    // 지붕
    ctx.fillStyle = '#5A5A5A';
    ctx.beginPath();
    ctx.moveTo(gateX - 50, canvas.height * 0.4);
    ctx.lineTo(gateX, canvas.height * 0.37);
    ctx.lineTo(gateX + 50, canvas.height * 0.4);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#6A6A6A';
    ctx.beginPath();
    ctx.moveTo(gateX - 45, canvas.height * 0.4 - 8);
    ctx.lineTo(gateX, canvas.height * 0.37 - 5);
    ctx.lineTo(gateX + 45, canvas.height * 0.4 - 8);
    ctx.closePath();
    ctx.fill();

    // === 한강대교 ===
    ctx.strokeStyle = '#8B96A0';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.48);
    ctx.lineTo(canvas.width, canvas.height * 0.48);
    ctx.stroke();

    // 교각
    const bridgeOffset = (frameCount * gameSpeed * 0.25) % 220;
    ctx.fillStyle = '#A0AEC0';
    for (let i = -1; i < canvas.width / 220 + 2; i++) {
        const x = i * 220 - bridgeOffset;
        ctx.fillRect(x + 100, canvas.height * 0.48, 12, 65);

        // 교각 그림자
        ctx.fillStyle = '#8B9AAA';
        ctx.fillRect(x + 110, canvas.height * 0.48, 2, 65);
        ctx.fillStyle = '#A0AEC0';
    }

    // === 한강 물 ===
    const waterGradient = ctx.createLinearGradient(0, canvas.height * 0.48, 0, canvas.height * 0.62);
    waterGradient.addColorStop(0, '#5BA3D0');
    waterGradient.addColorStop(0.4, '#4A92C0');
    waterGradient.addColorStop(1, '#3A82B0');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, canvas.height * 0.48, canvas.width, canvas.height * 0.14);

    // 한강 물결
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    for (let i = 0; i < canvas.width; i += 50) {
        const waveY = canvas.height * 0.55 + Math.sin((i + frameCount * 2) * 0.02) * 10;
        ctx.beginPath();
        ctx.arc((i + frameCount) % canvas.width, waveY, 18, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 한강 반짝임
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    for (let i = 0; i < 40; i++) {
        const x = (i * 70 + frameCount * 2.5) % canvas.width;
        const y = canvas.height * 0.52 + Math.sin(frameCount * 0.08 + i) * 10;
        const size = 2 + Math.sin(frameCount * 0.12 + i) * 2;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
    }

    // === 한강공원 잔디 ===
    const grassGradient = ctx.createLinearGradient(0, canvas.height * 0.62, 0, canvas.height * 0.72);
    grassGradient.addColorStop(0, '#5ABE78');
    grassGradient.addColorStop(1, '#48A868');
    ctx.fillStyle = grassGradient;
    ctx.fillRect(0, canvas.height * 0.62, canvas.width, canvas.height * 0.1);

    // === 러닝 트랙 (빨간 우레탄) ===
    ctx.fillStyle = '#D84848';
    ctx.fillRect(0, canvas.height * 0.72, canvas.width, canvas.height * 0.05);

    // 트랙 레인
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([18, 12]);
    const laneOffset = (frameCount * gameSpeed) % 30;
    ctx.beginPath();
    ctx.moveTo(-laneOffset, canvas.height * 0.745);
    ctx.lineTo(canvas.width, canvas.height * 0.745);
    ctx.stroke();
    ctx.setLineDash([]);

    // === 인도 ===
    const pathGradient = ctx.createLinearGradient(0, canvas.height * 0.77, 0, canvas.height);
    pathGradient.addColorStop(0, '#E8EDF2');
    pathGradient.addColorStop(1, '#D8DDE2');
    ctx.fillStyle = pathGradient;
    ctx.fillRect(0, canvas.height * 0.77, canvas.width, canvas.height * 0.23);

    // 인도 타일
    ctx.strokeStyle = '#B8BDC2';
    ctx.lineWidth = 1.5;
    const tileOffset = (frameCount * gameSpeed) % 55;
    for (let i = -1; i < canvas.width / 55 + 1; i++) {
        const x = i * 55 - tileOffset;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height * 0.77);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // === 벚꽃나무 ===
    const treeOffset = (frameCount * gameSpeed * 0.3) % 250;
    for (let i = -1; i < canvas.width / 250 + 2; i++) {
        const x = i * 250 - treeOffset;

        // 나무 줄기
        ctx.fillStyle = '#8B6F47';
        ctx.fillRect(x + 20, canvas.height * 0.68, 8, 35);

        // 벚꽃
        ctx.fillStyle = 'rgba(255, 182, 193, 0.8)';
        ctx.beginPath();
        ctx.arc(x + 24, canvas.height * 0.67, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 12, canvas.height * 0.71, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + 36, canvas.height * 0.71, 14, 0, Math.PI * 2);
        ctx.fill();
    }

    // 날리는 벚꽃잎
    ctx.fillStyle = 'rgba(255, 192, 203, 0.7)';
    for (let i = 0; i < 15; i++) {
        const x = (i * 120 + frameCount * 1.5) % canvas.width;
        const y = canvas.height * 0.65 + Math.sin(frameCount * 0.05 + i) * 30 + (frameCount * 0.5) % 200;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(frameCount * 0.05 + i);
        ctx.beginPath();
        ctx.ellipse(0, 0, 4, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// 충돌 감지
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 객체가 너무 가까운지 확인
function isTooClose(newObj, existingObjects, minDistance = 150) {
    for (let obj of existingObjects) {
        if (Math.abs(newObj.x - obj.x) < minDistance) {
            return true;
        }
    }
    return false;
}

// 게임 초기화
function initGame() {
    player = new Player();
    obstacles = [];
    coins = [];
    collagens = [];
    citizens = [];
    particles = [];
    jumpEffects = [];
    distance = 0;
    score = 0;
    collectedCoins = 0;
    gameSpeed = initialGameSpeed;
    frameCount = 0;
    lastObstacleTime = 0;
    lastCoinTime = 0;
    lastCollagenTime = 0;
    lastCitizenTime = 0;
}

// UI 업데이트
function updateUI() {
    document.getElementById('distance').textContent = Math.floor(distance);
    document.getElementById('coins').textContent = collectedCoins;
    document.getElementById('score').textContent = score;
    document.getElementById('best-distance').textContent = bestDistance;

    // 연령 표시 추가
    if (player) {
        const ageDisplay = document.getElementById('age');
        if (ageDisplay) {
            ageDisplay.textContent = Math.floor(player.age);
        }
    }
}

// 게임 오버 표시
function showGameOver() {
    document.getElementById('final-distance').textContent = Math.floor(distance);
    document.getElementById('final-coins').textContent = collectedCoins;
    document.getElementById('final-score').textContent = score;

    if (distance > bestDistance) {
        bestDistance = Math.floor(distance);
        localStorage.setItem('bestDistance', bestDistance);
        document.getElementById('new-record').classList.remove('hidden');
    } else {
        document.getElementById('new-record').classList.add('hidden');
    }

    document.getElementById('gameover-screen').classList.remove('hidden');
}

// 게임 업데이트
function update() {
    if (currentState !== gameState.PLAYING) return;

    frameCount++;
    distance += gameSpeed * 0.1;
    score = Math.floor(distance * 10 + collectedCoins * 100);

    // 게임 속도 점진적 증가
    if (frameCount % 300 === 0) {
        gameSpeed += 0.3;
    }

    // 플레이어 업데이트
    player.update();

    // 점프 이펙트 업데이트
    for (let i = jumpEffects.length - 1; i >= 0; i--) {
        jumpEffects[i].update();
        if (jumpEffects[i].isDead()) {
            jumpEffects.splice(i, 1);
        }
    }

    // 장애물 생성 (헌팅남)
    if (frameCount - lastObstacleTime > 100 + Math.random() * 80) {
        const newObstacle = new Obstacle();
        if (!isTooClose(newObstacle, [...obstacles, ...coins, ...collagens])) {
            obstacles.push(newObstacle);
            lastObstacleTime = frameCount;
        }
    }

    // 코인 생성
    if (frameCount - lastCoinTime > 80 + Math.random() * 60) {
        const newCoin = new Coin();
        if (!isTooClose(newCoin, [...obstacles, ...coins, ...collagens])) {
            coins.push(newCoin);
            lastCoinTime = frameCount;
        }
    }

    // 콜라겐 생성 (더 드물게)
    if (frameCount - lastCollagenTime > 400 + Math.random() * 300) {
        const newCollagen = new Collagen();
        if (!isTooClose(newCollagen, [...obstacles, ...coins, ...collagens])) {
            collagens.push(newCollagen);
            lastCollagenTime = frameCount;
        }
    }

    // 시민 생성
    if (frameCount - lastCitizenTime > 150 + Math.random() * 150) {
        const newCitizen = new Citizen();
        citizens.push(newCitizen);
        lastCitizenTime = frameCount;
    }

    // 장애물 업데이트
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();

        // 충돌 체크
        if (checkCollision(player.getHitbox(), obstacles[i].getHitbox())) {
            currentState = gameState.GAMEOVER;
            showGameOver();
            return;
        }

        if (obstacles[i].isOffScreen()) {
            obstacles.splice(i, 1);
        }
    }

    // 코인 업데이트
    for (let i = coins.length - 1; i >= 0; i--) {
        coins[i].update();

        // 충돌 체크
        if (checkCollision(player.getHitbox(), coins[i].getHitbox())) {
            collectedCoins++;
            score += coins[i].value * 10;

            // 파티클 생성
            for (let j = 0; j < 8; j++) {
                particles.push(new Particle(coins[i].x + 15, coins[i].y + 15, 'rgba(255, 215, 0, 1)'));
            }

            coins.splice(i, 1);
        } else if (coins[i].isOffScreen()) {
            coins.splice(i, 1);
        }
    }

    // 콜라겐 업데이트
    for (let i = collagens.length - 1; i >= 0; i--) {
        collagens[i].update();

        // 충돌 체크 (2단 점프 중일 때만 먹을 수 있음)
        if (player.isDoubleJumping && checkCollision(player.getHitbox(), collagens[i].getHitbox())) {
            // 나이 회복
            player.age = Math.max(20, player.age - 15);

            // 파티클 생성
            for (let j = 0; j < 15; j++) {
                particles.push(new Particle(collagens[i].x + 15, collagens[i].y + 20, 'rgba(255, 182, 193, 1)'));
            }

            collagens.splice(i, 1);
        } else if (collagens[i].isOffScreen()) {
            collagens.splice(i, 1);
        }
    }

    // 시민 업데이트
    for (let i = citizens.length - 1; i >= 0; i--) {
        citizens[i].update();

        if (citizens[i].isOffScreen()) {
            citizens.splice(i, 1);
        }
    }

    // 파티클 업데이트
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].isDead()) {
            particles.splice(i, 1);
        }
    }

    updateUI();
}

// 게임 그리기
function draw() {
    // 배경
    drawBackground();

    // 게임 객체들
    if (currentState === gameState.PLAYING) {
        // 시민
        for (let citizen of citizens) {
            citizen.draw();
        }

        // 장애물 (헌팅남)
        for (let obstacle of obstacles) {
            obstacle.draw();
        }

        // 코인
        for (let coin of coins) {
            coin.draw();
        }

        // 콜라겐
        for (let collagen of collagens) {
            collagen.draw();
        }

        // 파티클
        for (let particle of particles) {
            particle.draw();
        }

        // 점프 이펙트
        for (let effect of jumpEffects) {
            effect.draw();
        }

        // 플레이어
        player.draw();
    }
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 입력 처리
document.addEventListener('keydown', (e) => {
    if (currentState !== gameState.PLAYING) return;

    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        player.jump();
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        player.slide();
    } else if (e.code === 'Escape') {
        currentState = gameState.PAUSED;
        document.getElementById('pause-screen').classList.remove('hidden');
    }
});

// 터치 입력 (모바일)
let touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
    if (currentState !== gameState.PLAYING) return;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    if (currentState !== gameState.PLAYING) return;
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    if (Math.abs(diff) > 30) {
        if (diff > 0) {
            player.jump();
        } else {
            player.slide();
        }
    }
});

// 버튼 이벤트
document.getElementById('start-btn').addEventListener('click', () => {
    initGame();
    currentState = gameState.PLAYING;
    document.getElementById('start-screen').classList.add('hidden');
    gameLoop();
});

document.getElementById('restart-btn').addEventListener('click', () => {
    initGame();
    currentState = gameState.PLAYING;
    document.getElementById('gameover-screen').classList.add('hidden');
});

document.getElementById('resume-btn').addEventListener('click', () => {
    currentState = gameState.PLAYING;
    document.getElementById('pause-screen').classList.add('hidden');
});

document.getElementById('quit-btn').addEventListener('click', () => {
    currentState = gameState.MENU;
    document.getElementById('pause-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
});

// 최고 기록 표시
updateUI();
