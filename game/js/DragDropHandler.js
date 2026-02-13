/**
 * DragDropHandler 클래스
 * 드래그 앤 드롭 기능 처리
 */
class DragDropHandler {
    constructor(canvas, tiles, placementPoints, symmetryChecker, onSuccess, onError) {
        this.canvas = canvas;
        this.tiles = tiles;
        this.placementPoints = placementPoints;
        this.symmetryChecker = symmetryChecker;
        this.onSuccess = onSuccess;
        this.onError = onError;

        this.draggingTile = null;
        this.offset = { x: 0, y: 0 };
        this.hoveredPoint = null;

        this.setupEventListeners();
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 마우스 이벤트
        this.canvas.addEventListener('mousedown', this.onPointerDown.bind(this));
        this.canvas.addEventListener('mousemove', this.onPointerMove.bind(this));
        this.canvas.addEventListener('mouseup', this.onPointerUp.bind(this));

        // 터치 이벤트
        this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

        // 캔버스 밖으로 나갈 때
        this.canvas.addEventListener('mouseleave', this.onPointerUp.bind(this));
    }

    /**
     * 마우스/터치 다운
     */
    onPointerDown(e) {
        const pos = this.getCanvasPosition(e);
        const tile = this.findTileAt(pos.x, pos.y);

        if (tile && !tile.isPlaced) {
            this.startDragging(tile, pos.x, pos.y);
            e.preventDefault();
        }
    }

    onTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            const pos = this.getCanvasPosition(touch);
            const tile = this.findTileAt(pos.x, pos.y);

            if (tile && !tile.isPlaced) {
                this.startDragging(tile, pos.x, pos.y);
                e.preventDefault();
            }
        }
    }

    /**
     * 드래그 시작
     */
    startDragging(tile, x, y) {
        this.draggingTile = tile;
        this.offset = {
            x: x - tile.x,
            y: y - tile.y
        };
        tile.setDragging(true);

        // 사운드 재생 (옵션)
        this.playSound('pickup');
    }

    /**
     * 마우스/터치 이동
     */
    onPointerMove(e) {
        if (!this.draggingTile) return;

        const pos = this.getCanvasPosition(e);
        this.updateDragging(pos.x, pos.y);
        e.preventDefault();
    }

    onTouchMove(e) {
        if (!this.draggingTile || e.touches.length !== 1) return;

        const touch = e.touches[0];
        const pos = this.getCanvasPosition(touch);
        this.updateDragging(pos.x, pos.y);
        e.preventDefault();
    }

    /**
     * 드래그 업데이트
     */
    updateDragging(x, y) {
        this.draggingTile.x = x - this.offset.x;
        this.draggingTile.y = y - this.offset.y;

        // 가까운 배치 포인트 찾기
        this.hoveredPoint = this.findNearestPoint(this.draggingTile.x, this.draggingTile.y);
    }

    /**
     * 마우스/터치 업
     */
    onPointerUp(e) {
        if (!this.draggingTile) return;

        this.endDragging();
        e.preventDefault();
    }

    onTouchEnd(e) {
        if (!this.draggingTile) return;

        this.endDragging();
        e.preventDefault();
    }

    /**
     * 드래그 종료
     */
    endDragging() {
        const tile = this.draggingTile;
        const snapPoint = this.hoveredPoint;

        if (snapPoint && this.isCorrectPlacement(tile, snapPoint)) {
            // 정답!
            tile.snapTo(snapPoint);
            this.playSound('success');

            if (this.onSuccess) {
                this.onSuccess(tile, snapPoint);
            }
        } else {
            // 오답 - 원위치
            tile.returnToOriginalPosition();
            this.playSound('error');

            if (this.onError) {
                this.onError(tile);
            }
        }

        tile.setDragging(false);
        this.draggingTile = null;
        this.hoveredPoint = null;
    }

    /**
     * 캔버스 좌표 계산
     */
    getCanvasPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * 특정 위치의 타일 찾기
     */
    findTileAt(x, y) {
        for (let i = this.tiles.length - 1; i >= 0; i--) {
            const tile = this.tiles[i];
            if (!tile.isPlaced && tile.containsPoint(x, y)) {
                return tile;
            }
        }
        return null;
    }

    /**
     * 가장 가까운 배치 포인트 찾기
     */
    findNearestPoint(x, y) {
        const snapDistance = 50;
        let nearest = null;
        let minDist = snapDistance;

        for (let point of this.placementPoints) {
            if (!point.filled) {
                const dist = this.distance(x, y, point.x, point.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearest = point;
                }
            }
        }

        return nearest;
    }

    /**
     * 거리 계산
     */
    distance(x1, y1, x2, y2) {
        return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    /**
     * 올바른 배치인지 검증
     */
    isCorrectPlacement(tile, point) {
        return tile.targetPoint === point;
    }

    /**
     * 호버 중인 포인트에 가이드 그리기
     */
    drawHoverGuide(ctx) {
        if (this.hoveredPoint) {
            ctx.save();

            // 반짝이는 원
            ctx.strokeStyle = '#00FA9A';
            ctx.lineWidth = 4;
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.arc(this.hoveredPoint.x, this.hoveredPoint.y, 35, 0, Math.PI * 2);
            ctx.stroke();

            // 내부 채우기
            ctx.fillStyle = 'rgba(0, 250, 154, 0.2)';
            ctx.fill();

            ctx.restore();
        }
    }

    /**
     * 사운드 재생 (간단한 구현)
     */
    playSound(type) {
        // AudioContext를 사용한 간단한 비프음
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            switch (type) {
                case 'pickup':
                    oscillator.frequency.value = 400;
                    gainNode.gain.value = 0.1;
                    break;
                case 'success':
                    oscillator.frequency.value = 800;
                    gainNode.gain.value = 0.2;
                    break;
                case 'error':
                    oscillator.frequency.value = 200;
                    gainNode.gain.value = 0.15;
                    break;
            }

            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (e) {
            // 사운드 재생 실패 시 무시
        }
    }

    /**
     * 드래그 중인 타일 반환
     */
    getDraggingTile() {
        return this.draggingTile;
    }

    /**
     * 호버 포인트 반환
     */
    getHoveredPoint() {
        return this.hoveredPoint;
    }
}
