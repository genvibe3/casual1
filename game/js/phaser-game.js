/**
 * 한강 러닝 - Phaser 3 버전
 * Matter.js 물리 엔진, 파티클, 카메라 효과, 사운드, 포스트 프로세싱 포함
 */

// ============================================
// 게임 설정
// ============================================
const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    physics: {
        default: 'matter',
        matter: {
            debug: false,
            gravity: { y: 1.2 }
        }
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
    pixelArt: true,
    backgroundColor: '#87CEEB'
};

const game = new Phaser.Game(config);

// ============================================
// BootScene - 초기 로딩
// ============================================
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // 로딩 바
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBar = this.add.graphics();
        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(width / 2 - 160, height / 2 - 30, 320, 50);

        const loadingText = this.add.text(width / 2, height / 2 - 60, 'LOADING...', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0xffffff, 1);
            progressBar.fillRect(width / 2 - 150, height / 2 - 20, 300 * value, 30);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // 사운드는 무료 웹 API나 로컬 파일로 대체 가능
        // 여기서는 placeholder로 진행
    }

    create() {
        this.scene.start('MenuScene');
    }
}

// ============================================
// MenuScene - 시작 화면
// ============================================
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경 그라데이션
        const bg = this.add.graphics();
        bg.fillGradientStyle(0x4299E1, 0x4299E1, 0x48BB78, 0x48BB78, 1);
        bg.fillRect(0, 0, width, height);

        // 타이틀
        this.add.text(width / 2, height / 3, '한강 러닝', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 3 + 80, '헌팅남 피하기', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#FFD700'
        }).setOrigin(0.5);

        // 조작법
        const controls = [
            '[ SPACE ] or [ ↑ ] - 점프',
            '[ 공중에서 다시! ] - 2단 점프',
            '[ ↓ ] - 슬라이드',
            '',
            '💊 콜라겐으로 나이 회복!',
            '⚠️ 80세 되면 게임오버!'
        ];

        controls.forEach((text, i) => {
            this.add.text(width / 2, height / 2 + i * 30, text, {
                fontFamily: '"Press Start 2P"',
                fontSize: '12px',
                fill: '#ffffff'
            }).setOrigin(0.5);
        });

        // 시작 버튼
        const startBtn = this.add.text(width / 2, height - 150, 'START GAME', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        startBtn.on('pointerover', () => {
            startBtn.setScale(1.1);
            startBtn.setFill('#ffff00');
        });

        startBtn.on('pointerout', () => {
            startBtn.setScale(1);
            startBtn.setFill('#00ff00');
        });

        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // 최고 기록
        const bestDistance = localStorage.getItem('bestDistance') || 0;
        this.add.text(width / 2, height - 80, `BEST: ${bestDistance}m`, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#FFD700'
        }).setOrigin(0.5);

        // 키보드로도 시작
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });
    }
}

// ============================================
// GameScene - 메인 게임
// ============================================
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // 게임 변수 초기화
        this.gameSpeed = 4;
        this.initialGameSpeed = 4;
        this.distance = 0;
        this.score = 0;
        this.collectedCoins = 0;
        this.frameCount = 0;
        this.isGameOver = false;

        // 타임 슬로우 모션
        this.timeScale = 1;
        this.slowMotionTimer = 0;

        // 배경 생성
        this.createBackground();

        // 플레이어 생성
        this.createPlayer();

        // 오브젝트 그룹
        this.obstacles = [];
        this.coins = [];
        this.collagens = [];
        this.citizens = [];
        this.speechBubbles = [];

        // 파티클 시스템
        this.setupParticles();

        // UI
        this.createUI();

        // 입력
        this.setupInput();

        // 사운드 (Placeholder - 실제로는 Web Audio API나 파일 사용)
        this.sounds = {
            jump: null,
            coin: null,
            collagen: null,
            hit: null
        };

        // 포스트 프로세싱 (CRT 필터)
        this.setupPostProcessing();

        // 카메라 설정
        this.cameras.main.setBounds(0, 0, this.scale.width, this.scale.height);
    }

    createBackground() {
        // 하늘
        const skyGradient = this.add.graphics();
        skyGradient.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xC8E6F5, 0xC8E6F5, 1);
        skyGradient.fillRect(0, 0, this.scale.width, this.scale.height * 0.5);
        skyGradient.setScrollFactor(0);

        // 태양
        const sun = this.add.circle(this.scale.width - 100, 60, 50, 0xFFE678, 0.9);
        sun.setScrollFactor(0);

        // 배경 오브젝트는 업데이트에서 스크롤
        this.bgLayers = {
            mountains: [],
            buildings: [],
            trees: []
        };

        this.createMountains();
        this.createBuildings();
        this.createGround();
    }

    createMountains() {
        // 북한산
        const mountain1 = this.add.graphics();
        mountain1.fillStyle(0x7B92A8, 1);
        mountain1.beginPath();
        mountain1.moveTo(0, this.scale.height * 0.4);
        mountain1.lineTo(this.scale.width * 0.2, this.scale.height * 0.28);
        mountain1.lineTo(this.scale.width * 0.35, this.scale.height * 0.4);
        mountain1.closePath();
        mountain1.fillPath();
        mountain1.setScrollFactor(0.05);

        this.bgLayers.mountains.push(mountain1);
    }

    createBuildings() {
        // 롯데타워 (간단한 버전)
        const lotteTower = this.add.graphics();
        lotteTower.fillStyle(0x5A8DB8, 1);
        const tx = this.scale.width * 0.7;
        lotteTower.fillRect(tx, this.scale.height * 0.15, 40, this.scale.height * 0.27);
        lotteTower.setScrollFactor(0.12);

        this.bgLayers.buildings.push(lotteTower);

        // N서울타워
        const nTower = this.add.graphics();
        const ntx = this.scale.width * 0.85;
        nTower.fillStyle(0x8B8B8B, 1);
        nTower.fillRect(ntx - 3, this.scale.height * 0.28, 6, 70);
        nTower.fillStyle(0xC9C9C9, 1);
        nTower.fillCircle(ntx, this.scale.height * 0.28, 12);
        nTower.setScrollFactor(0.12);

        this.bgLayers.buildings.push(nTower);
    }

    createGround() {
        // 한강
        const river = this.add.graphics();
        river.fillGradientStyle(0x5BA3D0, 0x5BA3D0, 0x3A82B0, 0x3A82B0, 1);
        river.fillRect(0, this.scale.height * 0.48, this.scale.width, this.scale.height * 0.14);
        river.setScrollFactor(0);

        // 잔디
        const grass = this.add.graphics();
        grass.fillGradientStyle(0x5ABE78, 0x5ABE78, 0x48A868, 0x48A868, 1);
        grass.fillRect(0, this.scale.height * 0.62, this.scale.width, this.scale.height * 0.1);
        grass.setScrollFactor(0);

        // 트랙
        const track = this.add.graphics();
        track.fillStyle(0xD84848, 1);
        track.fillRect(0, this.scale.height * 0.72, this.scale.width, this.scale.height * 0.05);
        track.setScrollFactor(0);

        // 인도 (플레이 영역)
        const path = this.add.graphics();
        path.fillGradientStyle(0xE8EDF2, 0xE8EDF2, 0xD8DDE2, 0xD8DDE2, 1);
        path.fillRect(0, this.scale.height * 0.77, this.scale.width, this.scale.height * 0.23);
        path.setScrollFactor(0);

        // 지면 (Matter.js 물리 바디)
        this.groundY = this.scale.height * 0.77 - 10;
        const ground = this.matter.add.rectangle(
            this.scale.width / 2,
            this.scale.height - 5,
            this.scale.width * 3,
            10,
            { isStatic: true, label: 'ground' }
        );
    }

    createPlayer() {
        this.player = {
            sprite: null,
            body: null,
            age: 20,
            ageTimer: 0,
            ageIncreaseRate: 0.005,
            isJumping: false,
            canDoubleJump: true,
            isDoubleJumping: false,
            rotation: 0,
            runCycle: 0
        };

        // 플레이어 그래픽 생성
        const playerGraphics = this.add.graphics();
        this.drawPlayerGraphics(playerGraphics, 25, 40, 20);
        playerGraphics.generateTexture('player', 50, 80);
        playerGraphics.destroy();

        // 플레이어 스프라이트
        this.player.sprite = this.add.sprite(150, this.groundY - 40, 'player');

        // Matter.js 바디
        this.player.body = this.matter.add.rectangle(150, this.groundY - 40, 40, 70, {
            label: 'player',
            friction: 0,
            frictionAir: 0.01
        });

        // 스프라이트와 바디 연결은 수동으로 업데이트
    }

    drawPlayerGraphics(graphics, x, y, age) {
        // 간단한 플레이어 그래픽 (은발 여성)
        const hairColor = age >= 60 ? 0xFFFFFF : age >= 40 ? 0xF0F0F0 : 0xE8E8E8;
        const skinColor = 0xFFE0BD;

        // 머리
        graphics.fillStyle(hairColor, 1);
        graphics.fillCircle(x, y - 15, 12);

        // 얼굴
        graphics.fillStyle(skinColor, 1);
        graphics.fillCircle(x, y - 12, 10);

        // 눈
        graphics.fillStyle(0x2C1810, 1);
        graphics.fillCircle(x - 3, y - 13, 2);
        graphics.fillCircle(x + 3, y - 13, 2);

        // 몸 (후드티)
        graphics.fillStyle(0x3A3A3A, 1);
        graphics.fillRect(x - 10, y - 5, 20, 25);

        // 치마
        graphics.fillStyle(0x2A2A2A, 1);
        graphics.fillTriangle(x - 10, y + 20, x, y + 35, x + 10, y + 20);

        // 다리
        graphics.fillStyle(skinColor, 1);
        graphics.fillRect(x - 7, y + 30, 5, 15);
        graphics.fillRect(x + 2, y + 30, 5, 15);

        // 신발
        graphics.fillStyle(0xE8A0A0, 1);
        graphics.fillEllipse(x - 5, y + 45, 6, 4);
        graphics.fillEllipse(x + 5, y + 45, 6, 4);
    }

    setupParticles() {
        // 점프 파티클
        this.jumpParticles = this.add.particles(0, 0, 'player', {
            speed: { min: 50, max: 150 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.3, end: 0 },
            blendMode: 'ADD',
            lifespan: 500,
            gravityY: 300,
            tint: [0xE8E8E8, 0xE8A0A0, 0xFFFFFF]
        });
        this.jumpParticles.stop();

        // 코인 파티클
        this.coinParticles = this.add.particles(0, 0, 'player', {
            speed: { min: 30, max: 100 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.4, end: 0 },
            blendMode: 'ADD',
            lifespan: 600,
            gravityY: 200,
            tint: [0xFFD700, 0xFFA500]
        });
        this.coinParticles.stop();

        // 콜라겐 파티클
        this.collagenParticles = this.add.particles(0, 0, 'player', {
            speed: { min: 40, max: 120 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.5, end: 0 },
            blendMode: 'ADD',
            lifespan: 800,
            gravityY: 100,
            tint: [0xFFB6C1, 0xFF69B4]
        });
        this.collagenParticles.stop();

        // 충돌 파티클
        this.explosionParticles = this.add.particles(0, 0, 'player', {
            speed: { min: 100, max: 300 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.6, end: 0 },
            blendMode: 'ADD',
            lifespan: 1000,
            gravityY: 400,
            tint: [0xFF0000, 0xFFA500, 0xFFFF00]
        });
        this.explosionParticles.stop();
    }

    createUI() {
        const style = {
            fontFamily: '"Press Start 2P"',
            fontSize: '14px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        };

        this.uiTexts = {
            distance: this.add.text(20, 20, 'Distance: 0m', style).setScrollFactor(0).setDepth(100),
            coins: this.add.text(20, 50, 'Coins: 0', style).setScrollFactor(0).setDepth(100),
            age: this.add.text(20, 80, 'Age: 20', style).setScrollFactor(0).setDepth(100),
            score: this.add.text(20, 110, 'Score: 0', style).setScrollFactor(0).setDepth(100)
        };

        // 슬로우 모션 인디케이터
        this.slowMotionText = this.add.text(this.scale.width / 2, 50, 'SLOW MOTION', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#00ffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setScrollFactor(0).setDepth(100).setVisible(false);
    }

    setupInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

        // 터치 입력
        this.input.on('pointerdown', (pointer) => {
            if (pointer.y < this.scale.height / 2) {
                this.playerJump();
            } else {
                this.playerSlide();
            }
        });
    }

    setupPostProcessing() {
        // CRT 필터 효과 (간단한 스캔라인)
        this.scanlines = this.add.graphics();
        this.scanlines.setScrollFactor(0);
        this.scanlines.setDepth(1000);
        this.scanlines.setAlpha(0.1);

        for (let i = 0; i < this.scale.height; i += 4) {
            this.scanlines.fillStyle(0x000000, 1);
            this.scanlines.fillRect(0, i, this.scale.width, 2);
        }

        // 비네팅 효과
        const vignette = this.add.graphics();
        vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.5, 0.5, 0);
        vignette.fillRect(0, 0, this.scale.width, this.scale.height);
        vignette.setScrollFactor(0);
        vignette.setDepth(999);
    }

    update(time, delta) {
        if (this.isGameOver) return;

        this.frameCount++;

        // 타임 스케일 적용
        const effectiveDelta = delta * this.timeScale;

        // 슬로우 모션 타이머
        if (this.slowMotionTimer > 0) {
            this.slowMotionTimer -= delta;
            if (this.slowMotionTimer <= 0) {
                this.timeScale = 1;
                this.slowMotionText.setVisible(false);
            }
        }

        // 거리 및 점수
        this.distance += this.gameSpeed * effectiveDelta * 0.001;
        this.score = Math.floor(this.distance * 10 + this.collectedCoins * 100);

        // 속도 증가
        if (this.frameCount % 300 === 0) {
            this.gameSpeed += 0.3;
        }

        // 플레이어 업데이트
        this.updatePlayer(effectiveDelta);

        // 오브젝트 생성
        this.spawnObjects();

        // 오브젝트 업데이트
        this.updateObjects(effectiveDelta);

        // 충돌 체크
        this.checkCollisions();

        // UI 업데이트
        this.updateUITexts();

        // 입력 처리
        this.handleInput();
    }

    updatePlayer(delta) {
        // 나이 증가
        this.player.ageTimer += this.player.ageIncreaseRate * delta * 0.01;
        if (this.player.ageTimer >= 1) {
            this.player.age += 1;
            this.player.ageTimer = 0;

            // 외형 업데이트
            this.updatePlayerAppearance();
        }

        // 80세 게임오버
        if (this.player.age >= 80) {
            this.gameOver();
            return;
        }

        // 달리기 애니메이션
        this.player.runCycle += 0.18 * delta * 0.01;

        // Matter.js 바디와 스프라이트 동기화
        if (this.player.body) {
            this.player.sprite.x = this.player.body.position.x;
            this.player.sprite.y = this.player.body.position.y;

            // 지면 체크
            const onGround = Math.abs(this.player.body.velocity.y) < 0.5 &&
                            this.player.body.position.y >= this.groundY - 50;

            if (onGround && this.player.isJumping) {
                this.player.isJumping = false;
                this.player.isDoubleJumping = false;
                this.player.canDoubleJump = true;
                this.player.rotation = 0;
            }

            // 2단 점프 회전
            if (this.player.isDoubleJumping) {
                this.player.rotation += 0.22 * delta * 0.01;
                this.player.sprite.setRotation(this.player.rotation);
            } else {
                this.player.sprite.setRotation(0);
            }
        }
    }

    updatePlayerAppearance() {
        // 나이에 따라 플레이어 텍스처 재생성
        const graphics = this.add.graphics();
        this.drawPlayerGraphics(graphics, 25, 40, this.player.age);
        graphics.generateTexture('player', 50, 80);
        graphics.destroy();

        this.player.sprite.setTexture('player');
    }

    handleInput() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey) ||
            Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
            this.playerJump();
        }

        if (Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
            this.playerSlide();
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.scene.pause();
            // 일시정지 UI는 별도 Scene으로 구현 가능
        }
    }

    playerJump() {
        if (!this.player.isJumping) {
            // 첫 점프
            this.matter.body.setVelocity(this.player.body, { x: 0, y: -16 });
            this.player.isJumping = true;
            this.player.canDoubleJump = true;

            // 파티클
            this.jumpParticles.emitParticleAt(this.player.sprite.x, this.player.sprite.y + 30, 12);

            // 사운드 (Placeholder)
            this.playSound('jump');

        } else if (this.player.canDoubleJump && !this.player.isDoubleJumping) {
            // 2단 점프
            this.matter.body.setVelocity(this.player.body, { x: 0, y: -14 });
            this.player.isDoubleJumping = true;
            this.player.canDoubleJump = false;
            this.player.rotation = 0;

            // 파티클
            this.jumpParticles.emitParticleAt(this.player.sprite.x, this.player.sprite.y, 15);

            // 사운드
            this.playSound('jump');
        }
    }

    playerSlide() {
        // 슬라이드 구현 (간단히 처리)
        if (!this.player.isJumping) {
            // 슬라이드 애니메이션은 생략
        }
    }

    spawnObjects() {
        // 헌팅남 생성
        if (this.frameCount % 120 === 0 && Math.random() < 0.7) {
            this.spawnObstacle();
        }

        // 코인 생성
        if (this.frameCount % 80 === 0 && Math.random() < 0.8) {
            this.spawnCoin();
        }

        // 콜라겐 생성
        if (this.frameCount % 500 === 0 && Math.random() < 0.5) {
            this.spawnCollagen();
        }

        // 시민 생성
        if (this.frameCount % 200 === 0 && Math.random() < 0.6) {
            this.spawnCitizen();
        }
    }

    spawnObstacle() {
        const types = ['walk', 'bike', 'car'];
        const type = Phaser.Utils.Array.GetRandom(types);

        let width = 50;
        let height = 80;
        let speed = this.gameSpeed;

        if (type === 'car') {
            width = 120;
            height = 70;
            speed *= 1.8;
        } else if (type === 'bike') {
            width = 80;
            height = 80;
            speed *= 1.3;
        }

        const x = this.scale.width + 200;
        const y = this.groundY - height / 2;

        const obstacle = {
            type: type,
            sprite: this.createObstacleSprite(type),
            x: x,
            y: y,
            width: width,
            height: height,
            speed: speed,
            distanceToPlayer: 1000,
            speech: '안녕하세요~',
            speechTimer: 0,
            speechDuration: 180
        };

        obstacle.sprite.setPosition(x, y);
        this.obstacles.push(obstacle);

        // 말풍선
        const bubble = this.add.text(x + 60, y - 40, obstacle.speech, {
            fontFamily: '"Press Start 2P"',
            fontSize: '8px',
            fill: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 8, y: 8 }
        }).setDepth(10);

        this.speechBubbles.push(bubble);
    }

    createObstacleSprite(type) {
        // 간단한 헌팅남 그래픽
        const graphics = this.add.graphics();

        if (type === 'walk') {
            graphics.fillStyle(0x4A90E2, 1);
            graphics.fillCircle(25, 15, 12);
            graphics.fillRect(15, 30, 20, 30);
            graphics.fillRect(15, 60, 8, 20);
            graphics.fillRect(27, 60, 8, 20);
        } else if (type === 'bike') {
            graphics.fillStyle(0xE74C3C, 1);
            graphics.fillCircle(15, 45, 12);
            graphics.fillCircle(55, 45, 12);
            graphics.fillStyle(0x4A90E2, 1);
            graphics.fillCircle(40, 10, 10);
            graphics.fillRect(33, 20, 14, 20);
        } else if (type === 'car') {
            graphics.fillStyle(0x3498DB, 1);
            graphics.fillRect(10, 30, 100, 30);
            graphics.fillRect(30, 10, 60, 20);
            graphics.fillStyle(0x2C2C2C, 1);
            graphics.fillCircle(30, 60, 8);
            graphics.fillCircle(90, 60, 8);
        }

        const texture = 'obstacle_' + type + '_' + Date.now();
        graphics.generateTexture(texture, type === 'car' ? 120 : 80, 80);
        graphics.destroy();

        return this.add.sprite(0, 0, texture).setDepth(5);
    }

    spawnCoin() {
        const x = this.scale.width + 150;
        const y = this.groundY - 100 - Math.random() * 50;

        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0xFFD700, 0xFFD700, 0xFF8C00, 0xFF8C00, 1);
        graphics.fillCircle(15, 15, 15);
        graphics.lineStyle(2, 0xB8860B);
        graphics.strokeCircle(15, 15, 15);
        graphics.fillStyle(0x8B6914, 1);
        graphics.fillText('₩', 8, 20);

        const texture = 'coin_' + Date.now();
        graphics.generateTexture(texture, 30, 30);
        graphics.destroy();

        const coin = {
            sprite: this.add.sprite(x, y, texture).setDepth(5),
            x: x,
            y: y,
            width: 30,
            height: 30,
            speed: this.gameSpeed,
            rotation: 0
        };

        this.coins.push(coin);
    }

    spawnCollagen() {
        const x = this.scale.width + 200;
        const y = this.groundY - 200; // 높은 위치

        const graphics = this.add.graphics();
        graphics.fillGradientStyle(0xFFB6C1, 0xFF69B4, 0xFFB6C1, 0xFF69B4, 1);
        graphics.fillRoundedRect(0, 0, 30, 40, 15);
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillCircle(10, 12, 4);

        const texture = 'collagen_' + Date.now();
        graphics.generateTexture(texture, 30, 40);
        graphics.destroy();

        const collagen = {
            sprite: this.add.sprite(x, y, texture).setDepth(5),
            x: x,
            y: y,
            width: 30,
            height: 40,
            speed: this.gameSpeed,
            floatOffset: 0
        };

        // 빛나는 효과
        collagen.sprite.setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: collagen.sprite,
            alpha: { from: 0.7, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.collagens.push(collagen);
    }

    spawnCitizen() {
        const x = this.scale.width + 300;
        const y = this.groundY - 40;

        const graphics = this.add.graphics();
        graphics.fillStyle(Phaser.Utils.Array.GetRandom([0x50C878, 0xFFD700, 0x9B59B6]), 1);
        graphics.fillCircle(25, 12, 12);
        graphics.fillRect(13, 27, 24, 28);
        graphics.fillRect(15, 55, 8, 20);
        graphics.fillRect(27, 55, 8, 20);

        const texture = 'citizen_' + Date.now();
        graphics.generateTexture(texture, 50, 80);
        graphics.destroy();

        const citizen = {
            sprite: this.add.sprite(x, y, texture).setDepth(4),
            x: x,
            y: y,
            width: 50,
            height: 80,
            speed: this.gameSpeed * (0.8 + Math.random() * 0.4)
        };

        this.citizens.push(citizen);
    }

    updateObjects(delta) {
        // 헌팅남
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= obs.speed * delta * 0.06 * this.timeScale;
            obs.sprite.setPosition(obs.x, obs.y);

            // 플레이어에게 접근 (y축)
            obs.distanceToPlayer = Math.abs(obs.x - this.player.sprite.x);
            const targetY = this.player.sprite.y;
            const dy = targetY - obs.y;
            if (Math.abs(dy) > 5) {
                obs.y += dy * 0.01 * this.timeScale;
                obs.sprite.setY(obs.y);
            }

            // 말풍선 업데이트
            obs.speechTimer += delta * this.timeScale;
            if (obs.speechTimer >= obs.speechDuration) {
                obs.speech = this.getObstacleSpeech(obs.distanceToPlayer);
                obs.speechTimer = 0;
                obs.speechDuration = 120 + Math.random() * 120;
            }

            if (this.speechBubbles[i]) {
                this.speechBubbles[i].setText(obs.speech);
                this.speechBubbles[i].setPosition(obs.x + 60, obs.y - 40);
            }

            // 화면 밖
            if (obs.x < -200) {
                obs.sprite.destroy();
                if (this.speechBubbles[i]) this.speechBubbles[i].destroy();
                this.obstacles.splice(i, 1);
                this.speechBubbles.splice(i, 1);
            }
        }

        // 코인
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            coin.x -= coin.speed * delta * 0.06 * this.timeScale;
            coin.rotation += 0.1 * this.timeScale;
            coin.sprite.setPosition(coin.x, coin.y);
            coin.sprite.setRotation(coin.rotation);

            if (coin.x < -50) {
                coin.sprite.destroy();
                this.coins.splice(i, 1);
            }
        }

        // 콜라겐
        for (let i = this.collagens.length - 1; i >= 0; i--) {
            const col = this.collagens[i];
            col.x -= col.speed * delta * 0.06 * this.timeScale;
            col.floatOffset += 0.08 * this.timeScale;
            const floatY = col.y + Math.sin(col.floatOffset) * 8;
            col.sprite.setPosition(col.x, floatY);

            if (col.x < -50) {
                col.sprite.destroy();
                this.collagens.splice(i, 1);
            }
        }

        // 시민
        for (let i = this.citizens.length - 1; i >= 0; i--) {
            const cit = this.citizens[i];
            cit.x -= cit.speed * delta * 0.06 * this.timeScale;
            cit.sprite.setPosition(cit.x, cit.y);

            if (cit.x < -100) {
                cit.sprite.destroy();
                this.citizens.splice(i, 1);
            }
        }
    }

    getObstacleSpeech(distance) {
        if (distance < 150) {
            return Phaser.Utils.Array.GetRandom(['사랑해요!', '사귈래요?', '번호 좀!', '예뻐요!']);
        } else if (distance < 300) {
            return Phaser.Utils.Array.GetRandom(['안녕', '인스타해요?', '혼자에요?', '같이 달릴까요?']);
        } else {
            return Phaser.Utils.Array.GetRandom(['안녕하세요~', '저기요!', '잠깐만요!']);
        }
    }

    checkCollisions() {
        const playerBounds = this.player.sprite.getBounds();

        // 헌팅남 충돌
        for (const obs of this.obstacles) {
            const obsBounds = obs.sprite.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, obsBounds)) {
                this.handleCollision(obs.x, obs.y);
                return;
            }
        }

        // 코인 획득
        for (let i = this.coins.length - 1; i >= 0; i--) {
            const coin = this.coins[i];
            const coinBounds = coin.sprite.getBounds();
            if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, coinBounds)) {
                this.collectedCoins++;
                this.score += 100;

                // 파티클
                this.coinParticles.emitParticleAt(coin.x, coin.y, 10);

                // 사운드
                this.playSound('coin');

                coin.sprite.destroy();
                this.coins.splice(i, 1);
            }
        }

        // 콜라겐 획득 (2단 점프 중)
        if (this.player.isDoubleJumping) {
            for (let i = this.collagens.length - 1; i >= 0; i--) {
                const col = this.collagens[i];
                const colBounds = col.sprite.getBounds();
                if (Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, colBounds)) {
                    this.player.age = Math.max(20, this.player.age - 15);
                    this.updatePlayerAppearance();

                    // 파티클
                    this.collagenParticles.emitParticleAt(col.x, col.y, 20);

                    // 사운드
                    this.playSound('collagen');

                    // 슬로우 모션 활성화
                    this.activateSlowMotion();

                    col.sprite.destroy();
                    this.collagens.splice(i, 1);
                }
            }
        }
    }

    handleCollision(x, y) {
        // 폭발 파티클
        this.explosionParticles.emitParticleAt(x, y, 30);

        // 카메라 쉐이크
        this.cameras.main.shake(300, 0.01);

        // 사운드
        this.playSound('hit');

        // 게임 오버
        this.time.delayedCall(300, () => {
            this.gameOver();
        });
    }

    activateSlowMotion() {
        this.timeScale = 0.3;
        this.slowMotionTimer = 2000;
        this.slowMotionText.setVisible(true);

        this.tweens.add({
            targets: this.slowMotionText,
            alpha: { from: 1, to: 0.3 },
            duration: 300,
            yoyo: true,
            repeat: 6
        });
    }

    updateUITexts() {
        this.uiTexts.distance.setText(`Distance: ${Math.floor(this.distance)}m`);
        this.uiTexts.coins.setText(`Coins: ${this.collectedCoins}`);
        this.uiTexts.age.setText(`Age: ${Math.floor(this.player.age)}`);
        this.uiTexts.score.setText(`Score: ${this.score}`);
    }

    playSound(soundKey) {
        // Placeholder - 실제 사운드는 Freesound나 웹 오디오로 구현
        // this.sounds[soundKey]?.play();
    }

    gameOver() {
        this.isGameOver = true;

        // 최고 기록
        const bestDistance = localStorage.getItem('bestDistance') || 0;
        if (this.distance > bestDistance) {
            localStorage.setItem('bestDistance', Math.floor(this.distance));
        }

        // 게임 오버 Scene으로 전환
        this.time.delayedCall(500, () => {
            this.scene.start('GameOverScene', {
                distance: Math.floor(this.distance),
                coins: this.collectedCoins,
                score: this.score,
                age: Math.floor(this.player.age)
            });
        });
    }
}

// ============================================
// GameOverScene - 게임 오버 화면
// ============================================
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.finalDistance = data.distance;
        this.finalCoins = data.coins;
        this.finalScore = data.score;
        this.finalAge = data.age;
    }

    create() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // 배경
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.9);
        bg.fillRect(0, 0, width, height);

        // 타이틀
        const reason = this.finalAge >= 80 ? '너무 늙었어요...' : '헌팅남에게 걸렸어요!';
        this.add.text(width / 2, height / 4, 'GAME OVER', {
            fontFamily: '"Press Start 2P"',
            fontSize: '48px',
            fill: '#ff0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 4 + 70, reason, {
            fontFamily: '"Press Start 2P"',
            fontSize: '16px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        // 통계
        const stats = [
            `Distance: ${this.finalDistance}m`,
            `Coins: ${this.finalCoins}`,
            `Final Age: ${this.finalAge}`,
            `Score: ${this.finalScore}`
        ];

        stats.forEach((text, i) => {
            this.add.text(width / 2, height / 2 + i * 40, text, {
                fontFamily: '"Press Start 2P"',
                fontSize: '18px',
                fill: '#FFD700'
            }).setOrigin(0.5);
        });

        // 최고 기록
        const bestDistance = localStorage.getItem('bestDistance') || 0;
        const isNewRecord = this.finalDistance > bestDistance;

        if (isNewRecord) {
            this.add.text(width / 2, height / 2 + 180, 'NEW RECORD!', {
                fontFamily: '"Press Start 2P"',
                fontSize: '24px',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
        }

        // 재시작 버튼
        const restartBtn = this.add.text(width / 2, height - 150, 'RESTART', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        restartBtn.on('pointerover', () => {
            restartBtn.setScale(1.1);
            restartBtn.setFill('#ffff00');
        });

        restartBtn.on('pointerout', () => {
            restartBtn.setScale(1);
            restartBtn.setFill('#00ff00');
        });

        restartBtn.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // 메뉴 버튼
        const menuBtn = this.add.text(width / 2, height - 100, 'MENU', {
            fontFamily: '"Press Start 2P"',
            fontSize: '20px',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setInteractive();

        menuBtn.on('pointerover', () => {
            menuBtn.setScale(1.1);
        });

        menuBtn.on('pointerout', () => {
            menuBtn.setScale(1);
        });

        menuBtn.on('pointerdown', () => {
            this.scene.start('MenuScene');
        });

        // 키보드 입력
        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('GameScene');
        });

        this.input.keyboard.once('keydown-ESC', () => {
            this.scene.start('MenuScene');
        });
    }
}
