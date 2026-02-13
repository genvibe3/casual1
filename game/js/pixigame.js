/**
 * 한강 러닝 - PixiJS 고품질 버전
 * Glow 필터, 트레일 파티클, 스프라이트 애니메이션, 부드러운 전환
 */

// PixiJS 앱 초기화
const app = new PIXI.Application({
    width: 1280,
    height: 720,
    backgroundColor: 0x87CEEB,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
});

document.getElementById('game-container').appendChild(app.view);

// 게임 상태
let gameState = 'menu';
let player = null;
let obstacles = [];
let coins = [];
let collagens = [];
let citizens = [];
let trails = [];

// 게임 변수
let gameSpeed = 6;
let initialGameSpeed = 6;
let distance = 0;
let score = 0;
let collectedCoins = 0;
let playerAge = 20;
let ageTimer = 0;
let frameCount = 0;

// 배경 레이어
let bgContainer;
let gameContainer;
let fxContainer;

// 입력
let keys = {};

// ============================================
// 초기화
// ============================================
function init() {
    createContainers();
    createBackground();
    createPlayer();
    setupInput();
    updateBestScore();

    // 게임 루프
    app.ticker.add(gameLoop);
}

// ============================================
// 컨테이너 생성
// ============================================
function createContainers() {
    bgContainer = new PIXI.Container();
    gameContainer = new PIXI.Container();
    fxContainer = new PIXI.Container();

    app.stage.addChild(bgContainer);
    app.stage.addChild(gameContainer);
    app.stage.addChild(fxContainer);
}

// ============================================
// 배경 생성
// ============================================
function createBackground() {
    // 하늘
    const sky = new PIXI.Graphics();
    sky.beginFill(0x87CEEB);
    sky.drawRect(0, 0, app.screen.width, app.screen.height * 0.5);
    sky.endFill();
    bgContainer.addChild(sky);

    // 태양 (Glow 효과)
    const sun = new PIXI.Graphics();
    sun.beginFill(0xFFE678, 0.9);
    sun.drawCircle(0, 0, 50);
    sun.endFill();
    sun.position.set(app.screen.width - 100, 60);

    const glowFilter = new PIXI.filters.BlurFilter(15);
    sun.filters = [glowFilter];
    bgContainer.addChild(sun);

    // 한강
    const river = new PIXI.Graphics();
    river.beginFill(0x5BA3D0);
    river.drawRect(0, app.screen.height * 0.48, app.screen.width, app.screen.height * 0.14);
    river.endFill();
    bgContainer.addChild(river);

    // 잔디
    const grass = new PIXI.Graphics();
    grass.beginFill(0x5ABE78);
    grass.drawRect(0, app.screen.height * 0.62, app.screen.width, app.screen.height * 0.1);
    grass.endFill();
    bgContainer.addChild(grass);

    // 트랙
    const track = new PIXI.Graphics();
    track.beginFill(0xD84848);
    track.drawRect(0, app.screen.height * 0.72, app.screen.width, app.screen.height * 0.05);
    track.endFill();
    bgContainer.addChild(track);

    // 인도
    const path = new PIXI.Graphics();
    path.beginFill(0xE8EDF2);
    path.drawRect(0, app.screen.height * 0.77, app.screen.width, app.screen.height * 0.23);
    path.endFill();
    bgContainer.addChild(path);
}

// ============================================
// 플레이어 생성 (애니메이션 + Glow)
// ============================================
function createPlayer() {
    const graphics = new PIXI.Graphics();

    // 은발 여성 캐릭터
    graphics.beginFill(0xE8E8E8); // 머리
    graphics.drawCircle(25, 20, 12);
    graphics.endFill();

    graphics.beginFill(0xFFE0BD); // 얼굴
    graphics.drawCircle(25, 20, 10);
    graphics.endFill();

    graphics.beginFill(0x2C1810); // 눈
    graphics.drawCircle(21, 18, 2);
    graphics.drawCircle(29, 18, 2);
    graphics.endFill();

    graphics.beginFill(0x3A3A3A); // 후드티
    graphics.drawRect(15, 30, 20, 25);
    graphics.endFill();

    graphics.beginFill(0x2A2A2A); // 치마
    graphics.moveTo(15, 55);
    graphics.lineTo(25, 70);
    graphics.lineTo(35, 55);
    graphics.closePath();
    graphics.endFill();

    graphics.beginFill(0xE8A0A0); // 신발
    graphics.drawCircle(20, 75, 5);
    graphics.drawCircle(30, 75, 5);
    graphics.endFill();

    const texture = app.renderer.generateTexture(graphics);
    player = new PIXI.Sprite(texture);

    player.x = 150;
    player.y = app.screen.height - 170;
    player.anchor.set(0.5);

    // 물리
    player.velocityY = 0;
    player.isJumping = false;
    player.canDoubleJump = true;
    player.isDoubleJumping = false;
    player.age = 20;
    player.runCycle = 0;

    // Glow 필터
    const glowFilter = new PIXI.filters.GlowFilter({
        distance: 15,
        outerStrength: 2,
        innerStrength: 0,
        color: 0x00ffff,
        quality: 0.5
    });
    player.filters = [glowFilter];

    gameContainer.addChild(player);

    graphics.destroy();
}

// ============================================
// 입력 설정
// ============================================
function setupInput() {
    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;

        if (gameState === 'menu' && e.code === 'Space') {
            startGame();
        } else if (gameState === 'playing') {
            if (e.code === 'Space' || e.code === 'ArrowUp') {
                playerJump();
            } else if (e.code === 'ArrowDown') {
                playerSlide();
            } else if (e.code === 'Escape') {
                pauseGame();
            }
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // 버튼 이벤트
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', restartGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('quit-btn').addEventListener('click', quitGame);
}

// ============================================
// 게임 시작
// ============================================
function startGame() {
    gameState = 'playing';
    document.getElementById('start-screen').classList.add('hidden');

    // 페이드 인 효과
    gsap.from(gameContainer, { alpha: 0, duration: 0.5 });
}

function restartGame() {
    location.reload();
}

function pauseGame() {
    gameState = 'paused';
    document.getElementById('pause-screen').classList.remove('hidden');
}

function resumeGame() {
    gameState = 'playing';
    document.getElementById('pause-screen').classList.add('hidden');
}

function quitGame() {
    location.reload();
}

// ============================================
// 플레이어 점프
// ============================================
function playerJump() {
    if (!player.isJumping) {
        player.velocityY = -16;
        player.isJumping = true;
        player.canDoubleJump = true;

        // 점프 파티클 + 트레일
        createJumpParticles(player.x, player.y + 35);

    } else if (player.canDoubleJump && !player.isDoubleJumping) {
        player.velocityY = -14;
        player.isDoubleJumping = true;
        player.canDoubleJump = false;

        // 2단 점프 회전 애니메이션
        gsap.to(player, {
            rotation: Math.PI * 2,
            duration: 0.6,
            ease: 'power2.out',
            onComplete: () => {
                player.rotation = 0;
                player.isDoubleJumping = false;
            }
        });

        // 2단 점프 파티클
        createJumpParticles(player.x, player.y, true);
    }
}

function playerSlide() {
    // 슬라이드 (간단히 구현)
    if (!player.isJumping) {
        gsap.to(player.scale, { y: 0.5, duration: 0.2, yoyo: true, repeat: 1 });
    }
}

// ============================================
// 파티클 생성 (트레일 효과)
// ============================================
function createJumpParticles(x, y, isDouble = false) {
    const particleCount = isDouble ? 20 : 12;
    const colors = isDouble ? [0xE8E8E8, 0xE8A0A0, 0x00FFFF] : [0xE8E8E8, 0xE8A0A0];

    for (let i = 0; i < particleCount; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(colors[Math.floor(Math.random() * colors.length)]);
        particle.drawCircle(0, 0, 3 + Math.random() * 4);
        particle.endFill();

        particle.x = x;
        particle.y = y;

        const angle = (Math.PI * 2 / particleCount) * i;
        particle.vx = Math.cos(angle) * (2 + Math.random() * 4);
        particle.vy = Math.sin(angle) * (2 + Math.random() * 4) - 3;
        particle.life = 1;

        // Glow 필터
        const glow = new PIXI.filters.GlowFilter({
            distance: 10,
            outerStrength: 2,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        particle.filters = [glow];

        fxContainer.addChild(particle);

        // 애니메이션
        gsap.to(particle, {
            alpha: 0,
            duration: 0.8,
            onComplete: () => {
                fxContainer.removeChild(particle);
                particle.destroy();
            }
        });

        // 물리 업데이트는 게임 루프에서
        particle.update = () => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.4; // 중력
            particle.vx *= 0.98; // 마찰
        };

        trails.push(particle);
    }
}

function createCoinParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xFFD700);
        particle.drawCircle(0, 0, 2 + Math.random() * 3);
        particle.endFill();

        particle.x = x;
        particle.y = y;

        const angle = (Math.PI * 2 / 15) * i;
        particle.vx = Math.cos(angle) * 3;
        particle.vy = Math.sin(angle) * 3 - 2;

        // Glow
        const glow = new PIXI.filters.GlowFilter({
            distance: 15,
            outerStrength: 3,
            color: 0xFFD700
        });
        particle.filters = [glow];

        fxContainer.addChild(particle);

        gsap.to(particle, {
            alpha: 0,
            duration: 1,
            onComplete: () => {
                fxContainer.removeChild(particle);
                particle.destroy();
            }
        });

        particle.update = () => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.3;
        };

        trails.push(particle);
    }
}

function createCollagenParticles(x, y) {
    for (let i = 0; i < 25; i++) {
        const particle = new PIXI.Graphics();
        particle.beginFill(0xFFB6C1);
        particle.drawCircle(0, 0, 3 + Math.random() * 5);
        particle.endFill();

        particle.x = x;
        particle.y = y;

        const angle = (Math.PI * 2 / 25) * i;
        particle.vx = Math.cos(angle) * (3 + Math.random() * 4);
        particle.vy = Math.sin(angle) * (3 + Math.random() * 4);

        // Glow
        const glow = new PIXI.filters.GlowFilter({
            distance: 20,
            outerStrength: 4,
            color: 0xFF69B4
        });
        particle.filters = [glow];

        fxContainer.addChild(particle);

        gsap.to(particle, {
            alpha: 0,
            duration: 1.2,
            onComplete: () => {
                fxContainer.removeChild(particle);
                particle.destroy();
            }
        });

        particle.update = () => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.2;
            particle.vx *= 0.97;
        };

        trails.push(particle);
    }
}

function createExplosionParticles(x, y) {
    for (let i = 0; i < 40; i++) {
        const particle = new PIXI.Graphics();
        const colors = [0xFF0000, 0xFFA500, 0xFFFF00];
        particle.beginFill(colors[Math.floor(Math.random() * colors.length)]);
        particle.drawCircle(0, 0, 4 + Math.random() * 6);
        particle.endFill();

        particle.x = x;
        particle.y = y;

        const angle = (Math.PI * 2 / 40) * i;
        particle.vx = Math.cos(angle) * (5 + Math.random() * 8);
        particle.vy = Math.sin(angle) * (5 + Math.random() * 8);

        // Glow
        const glow = new PIXI.filters.GlowFilter({
            distance: 25,
            outerStrength: 5,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
        particle.filters = [glow];

        fxContainer.addChild(particle);

        gsap.to(particle, {
            alpha: 0,
            duration: 1.5,
            onComplete: () => {
                fxContainer.removeChild(particle);
                particle.destroy();
            }
        });

        particle.update = () => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += 0.5;
            particle.vx *= 0.95;
        };

        trails.push(particle);
    }
}

// ============================================
// 오브젝트 생성
// ============================================
function spawnObstacle() {
    const graphics = new PIXI.Graphics();

    // 헌팅남 (다양한 색상)
    const colors = [0x4A90E2, 0xE85D75, 0x50C878, 0xFFD700, 0x9B59B6];
    const color = colors[Math.floor(Math.random() * colors.length)];

    graphics.beginFill(color);
    graphics.drawCircle(25, 15, 12);
    graphics.drawRect(15, 27, 20, 30);
    graphics.drawRect(15, 57, 8, 20);
    graphics.drawRect(27, 57, 8, 20);
    graphics.endFill();

    const texture = app.renderer.generateTexture(graphics);
    const obstacle = new PIXI.Sprite(texture);

    obstacle.x = app.screen.width + 50;
    obstacle.y = app.screen.height - 170;
    obstacle.anchor.set(0.5);
    obstacle.vx = -gameSpeed;

    // Glow 필터
    const glow = new PIXI.filters.GlowFilter({
        distance: 10,
        outerStrength: 1,
        color: color
    });
    obstacle.filters = [glow];

    gameContainer.addChild(obstacle);
    obstacles.push(obstacle);

    graphics.destroy();
}

function spawnCoin() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFD700);
    graphics.drawCircle(15, 15, 15);
    graphics.endFill();

    const texture = app.renderer.generateTexture(graphics);
    const coin = new PIXI.Sprite(texture);

    coin.x = app.screen.width + 50;
    coin.y = app.screen.height - 150 - Math.random() * 100;
    coin.anchor.set(0.5);
    coin.vx = -gameSpeed;
    coin.rotation = 0;

    // 강한 Glow
    const glow = new PIXI.filters.GlowFilter({
        distance: 20,
        outerStrength: 3,
        color: 0xFFD700
    });
    coin.filters = [glow];

    // 회전 애니메이션
    gsap.to(coin, {
        rotation: Math.PI * 2,
        duration: 2,
        repeat: -1,
        ease: 'linear'
    });

    // 위아래 흔들림
    gsap.to(coin, {
        y: coin.y + 10,
        duration: 1,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
    });

    gameContainer.addChild(coin);
    coins.push(coin);

    graphics.destroy();
}

function spawnCollagen() {
    const graphics = new PIXI.Graphics();
    graphics.beginFill(0xFFB6C1);
    graphics.drawRoundedRect(0, 0, 30, 40, 15);
    graphics.endFill();

    graphics.beginFill(0xFFFFFF);
    graphics.drawCircle(10, 12, 4);
    graphics.endFill();

    const texture = app.renderer.generateTexture(graphics);
    const collagen = new PIXI.Sprite(texture);

    collagen.x = app.screen.width + 50;
    collagen.y = app.screen.height - 280; // 높은 위치
    collagen.anchor.set(0.5);
    collagen.vx = -gameSpeed;

    // 매우 강한 Glow
    const glow = new PIXI.filters.GlowFilter({
        distance: 30,
        outerStrength: 5,
        color: 0xFF69B4
    });
    collagen.filters = [glow];

    // 빛나는 애니메이션
    gsap.to(collagen, {
        alpha: 0.5,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
    });

    // 위아래 움직임
    gsap.to(collagen, {
        y: collagen.y + 15,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
    });

    gameContainer.addChild(collagen);
    collagens.push(collagen);

    graphics.destroy();
}

function spawnCitizen() {
    const graphics = new PIXI.Graphics();
    const colors = [0x50C878, 0xFFD700, 0x9B59B6, 0x4ECDC4];
    const color = colors[Math.floor(Math.random() * colors.length)];

    graphics.beginFill(color);
    graphics.drawCircle(25, 12, 12);
    graphics.drawRect(13, 27, 24, 28);
    graphics.drawRect(15, 55, 8, 20);
    graphics.drawRect(27, 55, 8, 20);
    graphics.endFill();

    const texture = app.renderer.generateTexture(graphics);
    const citizen = new PIXI.Sprite(texture);

    citizen.x = app.screen.width + 50;
    citizen.y = app.screen.height - 170;
    citizen.anchor.set(0.5);
    citizen.vx = -gameSpeed * (0.8 + Math.random() * 0.4);

    gameContainer.addChild(citizen);
    citizens.push(citizen);

    graphics.destroy();
}

// ============================================
// 충돌 감지
// ============================================
function checkCollision(obj1, obj2) {
    const bounds1 = obj1.getBounds();
    const bounds2 = obj2.getBounds();

    return bounds1.x < bounds2.x + bounds2.width &&
           bounds1.x + bounds1.width > bounds2.x &&
           bounds1.y < bounds2.y + bounds2.height &&
           bounds1.y + bounds1.height > bounds2.y;
}

// ============================================
// 게임 오버
// ============================================
function gameOver() {
    gameState = 'gameover';

    // 카메라 쉐이크
    gsap.to(app.stage, {
        x: -10,
        duration: 0.05,
        yoyo: true,
        repeat: 5,
        onComplete: () => {
            app.stage.x = 0;
        }
    });

    // 페이드 아웃
    gsap.to(gameContainer, { alpha: 0.3, duration: 0.5 });

    // UI 업데이트
    document.getElementById('final-distance').textContent = Math.floor(distance);
    document.getElementById('final-coins').textContent = collectedCoins;
    document.getElementById('final-age').textContent = Math.floor(playerAge);
    document.getElementById('final-score').textContent = score;

    const bestDistance = localStorage.getItem('bestDistance') || 0;
    if (distance > bestDistance) {
        localStorage.setItem('bestDistance', Math.floor(distance));
        document.getElementById('new-record').classList.remove('hidden');
    }

    // 게임 오버 화면 표시
    setTimeout(() => {
        document.getElementById('gameover-screen').classList.remove('hidden');
    }, 500);
}

// ============================================
// UI 업데이트
// ============================================
function updateUI() {
    document.getElementById('distance').textContent = Math.floor(distance);
    document.getElementById('coins').textContent = collectedCoins;
    document.getElementById('age').textContent = Math.floor(playerAge);
    document.getElementById('score').textContent = score;
}

function updateBestScore() {
    const bestDistance = localStorage.getItem('bestDistance') || 0;
    document.getElementById('best-distance').textContent = bestDistance;
}

// ============================================
// 메인 게임 루프
// ============================================
function gameLoop(delta) {
    if (gameState !== 'playing') return;

    frameCount++;

    // 거리 및 점수
    distance += gameSpeed * 0.1 * delta / 60;
    score = Math.floor(distance * 10 + collectedCoins * 100);

    // 속도 증가
    if (frameCount % 300 === 0) {
        gameSpeed += 0.3;
    }

    // 나이 증가
    ageTimer += 0.005 * delta / 60;
    if (ageTimer >= 1) {
        playerAge += 1;
        ageTimer = 0;
    }

    // 80세 게임오버
    if (playerAge >= 80) {
        createExplosionParticles(player.x, player.y);
        gameOver();
        return;
    }

    // 플레이어 물리
    if (player.isJumping) {
        player.velocityY += 0.9 * delta / 60;
        player.y += player.velocityY;

        if (player.y >= app.screen.height - 170) {
            player.y = app.screen.height - 170;
            player.velocityY = 0;
            player.isJumping = false;
            player.canDoubleJump = true;
        }
    }

    // 달리기 애니메이션
    player.runCycle += 0.18 * delta / 60;
    const bounce = Math.sin(player.runCycle) * 3;
    if (!player.isJumping) {
        player.y = app.screen.height - 170 + bounce;
    }

    // 트레일 파티클 업데이트
    for (let i = trails.length - 1; i >= 0; i--) {
        const trail = trails[i];
        if (trail.update) {
            trail.update();
        }
        if (trail.alpha <= 0) {
            trails.splice(i, 1);
        }
    }

    // 플레이어 트레일 효과 (달릴 때)
    if (frameCount % 5 === 0 && !player.isJumping) {
        const trail = new PIXI.Graphics();
        trail.beginFill(0x00FFFF, 0.3);
        trail.drawCircle(0, 0, 15);
        trail.endFill();
        trail.x = player.x;
        trail.y = player.y;

        fxContainer.addChild(trail);

        gsap.to(trail, {
            alpha: 0,
            scale: 1.5,
            duration: 0.5,
            onComplete: () => {
                fxContainer.removeChild(trail);
                trail.destroy();
            }
        });
    }

    // 오브젝트 생성
    if (frameCount % 120 === 0) spawnObstacle();
    if (frameCount % 80 === 0) spawnCoin();
    if (frameCount % 500 === 0) spawnCollagen();
    if (frameCount % 200 === 0) spawnCitizen();

    // 장애물 업데이트
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x += obs.vx * delta / 60;

        // 충돌 체크
        if (checkCollision(player, obs)) {
            createExplosionParticles(obs.x, obs.y);
            gameOver();
            return;
        }

        // 화면 밖
        if (obs.x < -100) {
            gameContainer.removeChild(obs);
            obs.destroy();
            obstacles.splice(i, 1);
        }
    }

    // 코인 업데이트
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        coin.x += coin.vx * delta / 60;

        // 충돌 체크
        if (checkCollision(player, coin)) {
            collectedCoins++;
            score += 100;

            createCoinParticles(coin.x, coin.y);

            gameContainer.removeChild(coin);
            coin.destroy();
            coins.splice(i, 1);
        }

        // 화면 밖
        if (coin.x < -50) {
            gameContainer.removeChild(coin);
            coin.destroy();
            coins.splice(i, 1);
        }
    }

    // 콜라겐 업데이트
    for (let i = collagens.length - 1; i >= 0; i--) {
        const col = collagens[i];
        col.x += col.vx * delta / 60;

        // 충돌 체크 (2단 점프 중 또는 공중에서)
        if ((player.isDoubleJumping || player.isJumping) && checkCollision(player, col)) {
            playerAge = Math.max(20, playerAge - 15);

            createCollagenParticles(col.x, col.y);

            // 화면 효과
            gsap.to(app.stage, {
                timeScale: 0.5,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });

            gameContainer.removeChild(col);
            col.destroy();
            collagens.splice(i, 1);
        }

        // 화면 밖
        if (col.x < -50) {
            gameContainer.removeChild(col);
            col.destroy();
            collagens.splice(i, 1);
        }
    }

    // 시민 업데이트
    for (let i = citizens.length - 1; i >= 0; i--) {
        const cit = citizens[i];
        cit.x += cit.vx * delta / 60;

        if (cit.x < -100) {
            gameContainer.removeChild(cit);
            cit.destroy();
            citizens.splice(i, 1);
        }
    }

    // UI 업데이트
    updateUI();
}

// ============================================
// GSAP (애니메이션 라이브러리)
// ============================================
// GSAP CDN을 사용하지 않고 간단한 애니메이션 헬퍼
const gsap = {
    to: (target, props) => {
        const duration = props.duration || 1;
        const delay = props.delay || 0;
        const startTime = Date.now() + delay * 1000;
        const startValues = {};

        Object.keys(props).forEach(key => {
            if (key !== 'duration' && key !== 'delay' && key !== 'onComplete' && key !== 'yoyo' && key !== 'repeat' && key !== 'ease') {
                startValues[key] = target[key] || 0;
            }
        });

        const animate = () => {
            const now = Date.now();
            if (now < startTime) {
                requestAnimationFrame(animate);
                return;
            }

            const elapsed = (now - startTime) / 1000;
            const progress = Math.min(elapsed / duration, 1);

            Object.keys(startValues).forEach(key => {
                const start = startValues[key];
                const end = props[key];
                const current = start + (end - start) * progress;

                if (key === 'scale') {
                    target.scale.set(current);
                } else {
                    target[key] = current;
                }
            });

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (props.onComplete) {
                props.onComplete();
            }
        };

        requestAnimationFrame(animate);
    },
    from: (target, props) => {
        // from 애니메이션 구현 (단순화)
        gsap.to(target, { ...props, onComplete: props.onComplete });
    }
};

// ============================================
// 게임 시작
// ============================================
init();
