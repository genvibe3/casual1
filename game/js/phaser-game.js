/**
 * 한강 러닝 - Phaser 3 버전 (수정됨)
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
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    backgroundColor: '#87CEEB'
};

const game = new Phaser.Game(config);

// 게임 변수
let player;
let cursors;
let obstacles;
let coins;
let collagens;
let gameSpeed = 300;
let distance = 0;
let score = 0;
let collectedCoins = 0;
let playerAge = 20;
let ageTimer = 0;
let isGameOver = false;
let canDoubleJump = true;
let isDoubleJumping = false;

// UI
let distanceText;
let coinsText;
let ageText;
let scoreText;
let gameState = 'menu';
let menuContainer;
let gameOverContainer;

// 파티클
let jumpParticles;
let coinParticles;
let collagenParticles;
let explosionParticles;

// 슬로우 모션
let timeScale = 1;
let slowMotionTimer = 0;
let slowMotionText;

function preload() {
    // 플레이어 텍스처 생성
    const graphics = this.add.graphics();

    // 플레이어
    graphics.fillStyle(0xE8E8E8);
    graphics.fillCircle(25, 20, 12);
    graphics.fillStyle(0xFFE0BD);
    graphics.fillCircle(25, 20, 10);
    graphics.fillStyle(0x3A3A3A);
    graphics.fillRect(15, 30, 20, 25);
    graphics.fillStyle(0x2A2A2A);
    graphics.fillTriangle(15, 55, 25, 70, 35, 55);
    graphics.fillStyle(0xE8A0A0);
    graphics.fillCircle(20, 75, 5);
    graphics.fillCircle(30, 75, 5);
    graphics.generateTexture('player', 50, 80);
    graphics.clear();

    // 헌팅남
    graphics.fillStyle(0x4A90E2);
    graphics.fillCircle(25, 15, 12);
    graphics.fillRect(15, 27, 20, 30);
    graphics.fillRect(15, 57, 8, 20);
    graphics.fillRect(27, 57, 8, 20);
    graphics.generateTexture('obstacle', 50, 80);
    graphics.clear();

    // 코인
    graphics.fillGradientStyle(0xFFD700, 0xFFD700, 0xFF8C00, 0xFF8C00);
    graphics.fillCircle(15, 15, 15);
    graphics.lineStyle(2, 0xB8860B);
    graphics.strokeCircle(15, 15, 15);
    graphics.generateTexture('coin', 30, 30);
    graphics.clear();

    // 콜라겐
    graphics.fillGradientStyle(0xFFB6C1, 0xFF69B4, 0xFFB6C1, 0xFF69B4);
    graphics.fillRoundedRect(0, 0, 30, 40, 15);
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(10, 12, 4);
    graphics.generateTexture('collagen', 30, 40);
    graphics.clear();

    // 파티클용 작은 원
    graphics.fillStyle(0xFFFFFF);
    graphics.fillCircle(2, 2, 2);
    graphics.generateTexture('particle', 4, 4);
    graphics.destroy();
}

function create() {
    this.physics.world.setBounds(0, 0, this.scale.width, this.scale.height);

    // 배경
    createBackground(this);

    // 지면
    const ground = this.add.rectangle(this.scale.width / 2, this.scale.height - 50, this.scale.width, 100, 0xD8DDE2);
    this.physics.add.existing(ground, true);

    // 플레이어
    player = this.physics.add.sprite(150, this.scale.height - 150, 'player');
    player.setCollideWorldBounds(true);
    player.body.setSize(30, 70);

    // 그룹
    obstacles = this.physics.add.group();
    coins = this.physics.add.group();
    collagens = this.physics.add.group();

    // 파티클 시스템
    jumpParticles = this.add.particles(0, 0, 'particle', {
        speed: { min: 50, max: 150 },
        angle: { min: 0, max: 360 },
        scale: { start: 1, end: 0 },
        blendMode: 'ADD',
        lifespan: 500,
        gravityY: 300,
        tint: [0xE8E8E8, 0xE8A0A0]
    });
    jumpParticles.stop();

    coinParticles = this.add.particles(0, 0, 'particle', {
        speed: { min: 30, max: 100 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.2, end: 0 },
        blendMode: 'ADD',
        lifespan: 600,
        gravityY: 200,
        tint: [0xFFD700, 0xFFA500]
    });
    coinParticles.stop();

    collagenParticles = this.add.particles(0, 0, 'particle', {
        speed: { min: 40, max: 120 },
        angle: { min: 0, max: 360 },
        scale: { start: 1.5, end: 0 },
        blendMode: 'ADD',
        lifespan: 800,
        gravityY: 100,
        tint: [0xFFB6C1, 0xFF69B4]
    });
    collagenParticles.stop();

    explosionParticles = this.add.particles(0, 0, 'particle', {
        speed: { min: 100, max: 300 },
        angle: { min: 0, max: 360 },
        scale: { start: 2, end: 0 },
        blendMode: 'ADD',
        lifespan: 1000,
        gravityY: 400,
        tint: [0xFF0000, 0xFFA500, 0xFFFF00]
    });
    explosionParticles.stop();

    // 입력
    cursors = this.input.keyboard.createCursorKeys();

    // UI
    distanceText = this.add.text(20, 20, 'Distance: 0m', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 3
    });

    coinsText = this.add.text(20, 50, 'Coins: 0', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 3
    });

    ageText = this.add.text(20, 80, 'Age: 20', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 3
    });

    scoreText = this.add.text(20, 110, 'Score: 0', {
        fontFamily: '"Press Start 2P"',
        fontSize: '14px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 3
    });

    slowMotionText = this.add.text(this.scale.width / 2, 50, 'SLOW MOTION', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        fill: '#0ff',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5).setVisible(false);

    // 메뉴 화면
    createMenu(this);

    // 충돌
    this.physics.add.collider(player, ground);
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);
    this.physics.add.overlap(player, coins, collectCoin, null, this);
    this.physics.add.overlap(player, collagens, collectCollagen, null, this);

    // 오브젝트 생성 타이머
    this.time.addEvent({
        delay: 1500,
        callback: spawnObstacle,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 1000,
        callback: spawnCoin,
        callbackScope: this,
        loop: true
    });

    this.time.addEvent({
        delay: 5000,
        callback: spawnCollagen,
        callbackScope: this,
        loop: true
    });
}

function createBackground(scene) {
    // 하늘
    const sky = scene.add.rectangle(scene.scale.width / 2, scene.scale.height * 0.25, scene.scale.width, scene.scale.height * 0.5, 0x87CEEB);

    // 태양
    scene.add.circle(scene.scale.width - 100, 60, 50, 0xFFE678, 0.9);

    // 한강
    scene.add.rectangle(scene.scale.width / 2, scene.scale.height * 0.55, scene.scale.width, scene.scale.height * 0.14, 0x5BA3D0);

    // 잔디
    scene.add.rectangle(scene.scale.width / 2, scene.scale.height * 0.67, scene.scale.width, scene.scale.height * 0.1, 0x5ABE78);

    // 트랙
    scene.add.rectangle(scene.scale.width / 2, scene.scale.height * 0.745, scene.scale.width, scene.scale.height * 0.05, 0xD84848);
}

function createMenu(scene) {
    menuContainer = scene.add.container(0, 0);

    const bg = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0x000000, 0.8);

    const title = scene.add.text(scene.scale.width / 2, scene.scale.height / 3, '한강 러닝', {
        fontFamily: '"Press Start 2P"',
        fontSize: '48px',
        fill: '#fff',
        stroke: '#000',
        strokeThickness: 6
    }).setOrigin(0.5);

    const subtitle = scene.add.text(scene.scale.width / 2, scene.scale.height / 3 + 80, '헌팅남 피하기', {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: '#FFD700'
    }).setOrigin(0.5);

    const instructions = scene.add.text(scene.scale.width / 2, scene.scale.height / 2,
        'SPACE - 점프\n\n공중에서 다시 - 2단 점프\n\n콜라겐으로 나이 회복!\n\n80세 되면 게임오버!', {
        fontFamily: '"Press Start 2P"',
        fontSize: '12px',
        fill: '#fff',
        align: 'center',
        lineSpacing: 10
    }).setOrigin(0.5);

    const startText = scene.add.text(scene.scale.width / 2, scene.scale.height - 150, 'PRESS SPACE TO START', {
        fontFamily: '"Press Start 2P"',
        fontSize: '20px',
        fill: '#0f0',
        stroke: '#000',
        strokeThickness: 4
    }).setOrigin(0.5);

    scene.tweens.add({
        targets: startText,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    menuContainer.add([bg, title, subtitle, instructions, startText]);

    scene.input.keyboard.once('keydown-SPACE', () => {
        menuContainer.setVisible(false);
        gameState = 'playing';
    });
}

function spawnObstacle() {
    if (gameState !== 'playing') return;

    const x = config.width + 50;
    const y = config.height - 150;

    const obstacle = obstacles.create(x, y, 'obstacle');
    obstacle.setVelocityX(-gameSpeed);
    obstacle.body.setAllowGravity(false);
}

function spawnCoin() {
    if (gameState !== 'playing') return;

    const x = config.width + 50;
    const y = config.height - 150 - Phaser.Math.Between(50, 150);

    const coin = coins.create(x, y, 'coin');
    coin.setVelocityX(-gameSpeed);
    coin.body.setAllowGravity(false);
}

function spawnCollagen() {
    if (gameState !== 'playing') return;

    const x = config.width + 50;
    const y = config.height - 250; // 높은 위치

    const collagen = collagens.create(x, y, 'collagen');
    collagen.setVelocityX(-gameSpeed);
    collagen.body.setAllowGravity(false);

    // 빛나는 효과
    game.scene.scenes[0].tweens.add({
        targets: collagen,
        alpha: 0.5,
        duration: 500,
        yoyo: true,
        repeat: -1
    });
}

function update(time, delta) {
    if (gameState !== 'playing') return;

    // 타임 스케일 적용
    const effectiveDelta = delta * timeScale;

    // 슬로우 모션 타이머
    if (slowMotionTimer > 0) {
        slowMotionTimer -= delta;
        if (slowMotionTimer <= 0) {
            timeScale = 1;
            slowMotionText.setVisible(false);
            game.scene.scenes[0].physics.world.timeScale = 1;
        }
    }

    // 거리 증가
    distance += effectiveDelta * 0.05;
    score = Math.floor(distance * 10 + collectedCoins * 100);

    // 나이 증가
    ageTimer += effectiveDelta * 0.0001;
    if (ageTimer >= 1) {
        playerAge += 1;
        ageTimer = 0;
    }

    // 80세 게임오버
    if (playerAge >= 80) {
        gameOver();
        return;
    }

    // UI 업데이트
    distanceText.setText(`Distance: ${Math.floor(distance)}m`);
    coinsText.setText(`Coins: ${collectedCoins}`);
    ageText.setText(`Age: ${Math.floor(playerAge)}`);
    scoreText.setText(`Score: ${score}`);

    // 입력
    if (cursors.space.isDown || cursors.up.isDown) {
        if (player.body.touching.down) {
            player.setVelocityY(-500);
            canDoubleJump = true;
            jumpParticles.emitParticleAt(player.x, player.y + 35, 12);
        } else if (canDoubleJump) {
            player.setVelocityY(-450);
            canDoubleJump = false;
            isDoubleJumping = true;
            jumpParticles.emitParticleAt(player.x, player.y, 15);

            // 회전 애니메이션
            game.scene.scenes[0].tweens.add({
                targets: player,
                angle: 360,
                duration: 500,
                onComplete: () => {
                    player.angle = 0;
                    isDoubleJumping = false;
                }
            });
        }
    }

    // 오브젝트 제거
    obstacles.children.entries.forEach(obs => {
        if (obs.x < -50) obs.destroy();
    });

    coins.children.entries.forEach(coin => {
        if (coin.x < -50) coin.destroy();
    });

    collagens.children.entries.forEach(col => {
        if (col.x < -50) col.destroy();
    });
}

function hitObstacle(player, obstacle) {
    if (isGameOver) return;

    // 폭발 파티클
    explosionParticles.emitParticleAt(obstacle.x, obstacle.y, 30);

    // 카메라 쉐이크
    game.scene.scenes[0].cameras.main.shake(300, 0.01);

    // 게임 오버
    gameOver();
}

function collectCoin(player, coin) {
    collectedCoins++;
    score += 100;

    // 파티클
    coinParticles.emitParticleAt(coin.x, coin.y, 10);

    coin.destroy();
}

function collectCollagen(player, collagen) {
    if (!isDoubleJumping && !player.body.touching.down) {
        playerAge = Math.max(20, playerAge - 15);

        // 파티클
        collagenParticles.emitParticleAt(collagen.x, collagen.y, 20);

        // 슬로우 모션
        timeScale = 0.3;
        slowMotionTimer = 2000;
        slowMotionText.setVisible(true);
        game.scene.scenes[0].physics.world.timeScale = 0.3;

        collagen.destroy();
    }
}

function gameOver() {
    isGameOver = true;
    gameState = 'gameover';

    const scene = game.scene.scenes[0];

    // 최고 기록
    const bestDistance = localStorage.getItem('bestDistance') || 0;
    if (distance > bestDistance) {
        localStorage.setItem('bestDistance', Math.floor(distance));
    }

    // 게임 오버 화면
    const bg = scene.add.rectangle(scene.scale.width / 2, scene.scale.height / 2, scene.scale.width, scene.scale.height, 0x000000, 0.9);

    const title = scene.add.text(scene.scale.width / 2, scene.scale.height / 4, 'GAME OVER', {
        fontFamily: '"Press Start 2P"',
        fontSize: '48px',
        fill: '#f00',
        stroke: '#000',
        strokeThickness: 6
    }).setOrigin(0.5);

    const reason = playerAge >= 80 ? '너무 늙었어요...' : '헌팅남에게 걸렸어요!';
    scene.add.text(scene.scale.width / 2, scene.scale.height / 4 + 70, reason, {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#fff'
    }).setOrigin(0.5);

    const stats = scene.add.text(scene.scale.width / 2, scene.scale.height / 2,
        `Distance: ${Math.floor(distance)}m\nCoins: ${collectedCoins}\nFinal Age: ${Math.floor(playerAge)}\nScore: ${score}`, {
        fontFamily: '"Press Start 2P"',
        fontSize: '18px',
        fill: '#FFD700',
        align: 'center',
        lineSpacing: 10
    }).setOrigin(0.5);

    if (distance > bestDistance) {
        scene.add.text(scene.scale.width / 2, scene.scale.height / 2 + 150, 'NEW RECORD!', {
            fontFamily: '"Press Start 2P"',
            fontSize: '24px',
            fill: '#0f0',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    const restartText = scene.add.text(scene.scale.width / 2, scene.scale.height - 100, 'PRESS SPACE TO RESTART', {
        fontFamily: '"Press Start 2P"',
        fontSize: '16px',
        fill: '#0f0',
        stroke: '#000',
        strokeThickness: 3
    }).setOrigin(0.5);

    scene.tweens.add({
        targets: restartText,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1
    });

    scene.input.keyboard.once('keydown-SPACE', () => {
        location.reload();
    });
}
