/**
 * 미러 에이징 게임 - 메인 로직
 */

// 게임 상태
const gameState = {
    currentLevel: 1,
    symmetryType: 'horizontal',
    totalTiles: 5,
    placedTiles: 0,
    score: 0,
    timeLimit: 0, // 0 = 무제한
    elapsedTime: 0,
    mistakes: 0,
    maxMistakes: 999,

    tiles: [],
    placementPoints: [],
    symmetryChecker: null,

    leftFacePattern: { type: 'old' },
    rightFacePattern: { type: 'young' },

    characterAge: 50,
    collectedCosmetics: {
        essence: 0,
        serum: 0,
        ampoule: 0
    },

    isPlaying: false,
    isPaused: false
};

// 타일 타입 정의
const TILE_TYPES = ['wrinkle', 'spot', 'elasticity', 'glow', 'blood'];

// 전역 객체
let renderer;
let dragDropHandler;
let timerInterval;

/**
 * 게임 초기화
 */
function initGame() {
    console.log('게임 초기화 중...');

    // 캔버스 및 렌더러 설정
    const canvas = document.getElementById('game-canvas');
    renderer = new Renderer(canvas);

    // UI 이벤트 리스너 설정
    setupUIListeners();

    // 튜토리얼 표시
    showTutorial();
}

/**
 * UI 이벤트 리스너 설정
 */
function setupUIListeners() {
    // 게임 시작 버튼
    document.getElementById('start-game-btn').addEventListener('click', () => {
        hideTutorial();
        startLevel(gameState.currentLevel);
    });

    // 다음 레벨 버튼
    document.getElementById('next-level-btn').addEventListener('click', () => {
        hideLevelClearModal();
        gameState.currentLevel++;
        startLevel(gameState.currentLevel);
    });

    // 힌트 버튼
    document.getElementById('hint-btn').addEventListener('click', showHint);

    // 실행취소 버튼
    document.getElementById('undo-btn').addEventListener('click', undoLastMove);

    // 다시시작 버튼
    document.getElementById('restart-btn').addEventListener('click', () => {
        startLevel(gameState.currentLevel);
    });
}

/**
 * 레벨 시작
 */
function startLevel(levelNum) {
    console.log(`레벨 ${levelNum} 시작`);

    // 레벨 설정 가져오기
    const config = getLevelConfig(levelNum);

    // 게임 상태 초기화
    gameState.currentLevel = levelNum;
    gameState.symmetryType = config.symmetryType;
    gameState.totalTiles = config.tileCount;
    gameState.placedTiles = 0;
    gameState.timeLimit = config.timeLimit;
    gameState.elapsedTime = 0;
    gameState.mistakes = 0;
    gameState.isPlaying = true;

    // UI 업데이트
    updateUI();

    // 레벨 생성
    generateLevel(config);

    // 대칭 체커 생성
    const size = renderer.getSize();
    gameState.symmetryChecker = new SymmetryChecker(
        config.symmetryType,
        size.width,
        size.height,
        renderer.faceArea
    );

    // 드래그 앤 드롭 핸들러 설정
    setupDragDrop();

    // 타이머 시작
    if (config.timeLimit > 0) {
        startTimer();
    }

    // 렌더링 시작
    startRenderLoop();
}

/**
 * 레벨 설정 가져오기
 */
function getLevelConfig(levelNum) {
    if (levelNum <= 5) {
        return {
            tileCount: 3 + Math.floor(levelNum / 2),
            symmetryType: 'horizontal',
            timeLimit: 0
        };
    } else if (levelNum <= 10) {
        return {
            tileCount: 5 + Math.floor((levelNum - 5) / 2),
            symmetryType: 'horizontal',
            timeLimit: 180
        };
    } else if (levelNum <= 15) {
        return {
            tileCount: 6 + Math.floor((levelNum - 10) / 2),
            symmetryType: 'vertical',
            timeLimit: 150
        };
    } else if (levelNum <= 20) {
        return {
            tileCount: 7 + Math.floor((levelNum - 15) / 2),
            symmetryType: 'horizontal',
            timeLimit: 120
        };
    } else {
        return {
            tileCount: 8 + Math.floor((levelNum - 20) / 3),
            symmetryType: 'quad',
            timeLimit: 120
        };
    }
}

/**
 * 레벨 생성
 */
function generateLevel(config) {
    console.log('레벨 생성 시작:', config);

    gameState.tiles = [];
    gameState.placementPoints = [];

    // 배치 포인트 생성
    const areas = renderer.getAreas();
    const leftArea = areas.left;
    const rightArea = areas.right;

    console.log('얼굴 영역:', { left: leftArea, right: rightArea });

    for (let i = 0; i < config.tileCount; i++) {
        // 좌측 영역에 랜덤 포인트 생성
        const leftPoint = {
            x: leftArea.x + 50 + Math.random() * (leftArea.width - 100),
            y: leftArea.y + 50 + Math.random() * (leftArea.height - 100),
            filled: true,
            id: i
        };

        // 대칭 위치 계산 (임시 체커 사용)
        const tempChecker = new SymmetryChecker(
            config.symmetryType,
            renderer.width,
            renderer.height,
            renderer.faceArea
        );
        const mirrorPos = tempChecker.getMirrorPosition(leftPoint.x, leftPoint.y);

        // 우측 배치 포인트
        const rightPoint = {
            x: mirrorPos.x,
            y: mirrorPos.y,
            filled: false,
            id: i + 1000,
            mirrorOf: leftPoint
        };

        leftPoint.mirrorPoint = rightPoint;

        // 타일 생성
        const tileType = TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
        const tile = new Tile(i, tileType, Tile.getEmojiForType(tileType));
        tile.targetPoint = rightPoint;

        gameState.tiles.push(tile);
        gameState.placementPoints.push(leftPoint, rightPoint);
    }

    // 타일 섞기
    shuffleArray(gameState.tiles);

    // 타일을 트레이 영역 중앙에 배치
    const canvasHeight = renderer.height;
    const canvasWidth = renderer.width;

    // 트레이 Y 위치 (캔버스 하단에서 20% 지점)
    const trayY = canvasHeight * 0.75;
    const tileSpacing = 65;
    const totalWidth = config.tileCount * tileSpacing - tileSpacing / 2;
    const startX = (canvasWidth - totalWidth) / 2;

    console.log('타일 배치:', {
        tileCount: config.tileCount,
        canvasWidth: canvasWidth,
        canvasHeight: canvasHeight,
        trayY: trayY,
        startX: startX
    });

    gameState.tiles.forEach((tile, index) => {
        tile.x = startX + index * tileSpacing;
        tile.y = trayY;
        tile.originalPosition = { x: tile.x, y: tile.y };

        console.log(`타일 ${index}:`, { x: tile.x, y: tile.y, emoji: tile.emoji });
    });

    console.log('총 타일 개수:', gameState.tiles.length);
}

/**
 * 배열 섞기
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * 드래그 앤 드롭 설정
 */
function setupDragDrop() {
    const canvas = document.getElementById('game-canvas');

    dragDropHandler = new DragDropHandler(
        canvas,
        gameState.tiles,
        gameState.placementPoints,
        gameState.symmetryChecker,
        onTilePlaced,
        onTileError
    );
}

/**
 * 타일 배치 성공 콜백
 */
function onTilePlaced(tile, point) {
    console.log('타일 배치 성공:', tile.id);

    gameState.placedTiles++;
    gameState.score += 100;

    // 파티클 효과 생성
    if (renderer) {
        renderer.createSuccessParticles(point.x, point.y);
    }

    updateUI();

    // 모든 타일 배치 완료?
    if (gameState.placedTiles >= gameState.totalTiles) {
        setTimeout(() => {
            levelClear();
        }, 500);
    }
}

/**
 * 타일 배치 실패 콜백
 */
function onTileError(tile) {
    console.log('타일 배치 실패:', tile.id);

    gameState.mistakes++;
    updateUI();

    // 최대 실수 초과 시
    if (gameState.mistakes >= gameState.maxMistakes) {
        gameOver();
    }
}

/**
 * 렌더링 루프
 */
function startRenderLoop() {
    let frameCount = 0;

    function render() {
        if (!gameState.isPlaying) {
            console.log('게임이 플레이 중이 아닙니다');
            return;
        }

        if (frameCount === 0) {
            console.log('렌더링 시작! 타일 개수:', gameState.tiles.length);
        }

        renderer.render(gameState, dragDropHandler);

        frameCount++;
        requestAnimationFrame(render);
    }

    console.log('렌더 루프 시작');
    render();
}

/**
 * UI 업데이트
 */
function updateUI() {
    document.getElementById('current-level').textContent = gameState.currentLevel;
    document.getElementById('score-display').textContent = gameState.score;

    if (gameState.timeLimit > 0) {
        const remaining = gameState.timeLimit - gameState.elapsedTime;
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        document.getElementById('time-display').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const minutes = Math.floor(gameState.elapsedTime / 60);
        const seconds = gameState.elapsedTime % 60;
        document.getElementById('time-display').textContent =
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

/**
 * 타이머 시작
 */
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        if (gameState.isPlaying && !gameState.isPaused) {
            gameState.elapsedTime++;
            updateUI();

            // 시간 초과?
            if (gameState.timeLimit > 0 && gameState.elapsedTime >= gameState.timeLimit) {
                timeOut();
            }
        }
    }, 1000);
}

/**
 * 레벨 클리어
 */
function levelClear() {
    console.log('레벨 클리어!');

    gameState.isPlaying = false;

    // 타이머 정지
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    // 보상 계산
    const reward = getRandomCosmetic();
    gameState.collectedCosmetics[reward.type]++;

    // 레벨 클리어 모달 표시
    document.getElementById('cleared-level').textContent = gameState.currentLevel;
    document.getElementById('reward-item').textContent = reward.name;
    showLevelClearModal();
}

/**
 * 랜덤 화장품 획득
 */
function getRandomCosmetic() {
    const cosmetics = [
        { type: 'essence', name: '💧 에센스' },
        { type: 'serum', name: '🧴 세럼' },
        { type: 'ampoule', name: '💊 앰플' }
    ];

    return cosmetics[Math.floor(Math.random() * cosmetics.length)];
}

/**
 * 시간 초과
 */
function timeOut() {
    console.log('시간 초과!');
    gameState.isPlaying = false;

    alert('시간 초과! 다시 시도하세요.');
    startLevel(gameState.currentLevel);
}

/**
 * 게임 오버
 */
function gameOver() {
    console.log('게임 오버!');
    gameState.isPlaying = false;

    alert('게임 오버! 실수가 너무 많습니다.');
    startLevel(gameState.currentLevel);
}

/**
 * 힌트 표시
 */
function showHint() {
    console.log('힌트 요청');

    // 아직 배치되지 않은 첫 번째 타일의 정답 위치 표시
    for (let tile of gameState.tiles) {
        if (!tile.isPlaced) {
            // 잠깐 정답 위치에 가이드 표시
            highlightTargetPoint(tile.targetPoint);
            break;
        }
    }
}

/**
 * 타겟 포인트 하이라이트
 */
function highlightTargetPoint(point) {
    // 렌더링 시 특별 표시 (임시 구현)
    const originalFilled = point.filled;
    point.highlight = true;

    setTimeout(() => {
        point.highlight = false;
    }, 2000);
}

/**
 * 마지막 이동 취소
 */
function undoLastMove() {
    console.log('실행취소');

    // 마지막으로 배치된 타일 찾기
    for (let i = gameState.tiles.length - 1; i >= 0; i--) {
        const tile = gameState.tiles[i];
        if (tile.isPlaced) {
            tile.setPlaced(false);
            tile.targetPoint.filled = false;
            tile.targetPoint.tile = null;
            tile.returnToOriginalPosition();

            gameState.placedTiles--;
            updateUI();
            break;
        }
    }
}

/**
 * 튜토리얼 표시/숨기기
 */
function showTutorial() {
    document.getElementById('tutorial-overlay').classList.remove('hidden');
}

function hideTutorial() {
    document.getElementById('tutorial-overlay').classList.add('hidden');
}

/**
 * 레벨 클리어 모달 표시/숨기기
 */
function showLevelClearModal() {
    document.getElementById('level-clear-modal').classList.remove('hidden');
}

function hideLevelClearModal() {
    document.getElementById('level-clear-modal').classList.add('hidden');
}

/**
 * 페이지 로드 시 초기화
 */
window.addEventListener('DOMContentLoaded', () => {
    console.log('미러 에이징 게임 로드 완료');
    initGame();
});

/**
 * 윈도우 리사이즈 처리
 */
window.addEventListener('resize', () => {
    if (renderer) {
        renderer.setCanvasSize();
        renderer.defineAreas();
    }
});
