/**
 * Tile 클래스
 * 게임의 타일(젊은 피부 패치)을 나타냄
 */
class Tile {
    constructor(id, type, emoji) {
        this.id = id;
        this.type = type; // 'wrinkle', 'spot', 'elasticity', 'glow', 'blood'
        this.emoji = emoji; // 타일에 표시될 이모지
        this.x = 0;
        this.y = 0;
        this.width = 60;
        this.height = 60;
        this.isDragging = false;
        this.isPlaced = false;
        this.targetPoint = null; // 정답 배치 포인트
        this.originalPosition = { x: 0, y: 0 };
        this.scale = 1.0;
        this.opacity = 1.0;
        this.rotation = 0;

        // DOM 요소
        this.element = null;
    }

    /**
     * DOM 요소 생성
     */
    createElement() {
        const div = document.createElement('div');
        div.className = 'tile';
        div.setAttribute('data-tile-id', this.id);
        div.textContent = this.emoji;
        div.style.position = 'relative';
        this.element = div;
        return div;
    }

    /**
     * 드래그 상태 설정
     */
    setDragging(dragging) {
        this.isDragging = dragging;
        if (this.element) {
            if (dragging) {
                this.element.classList.add('dragging');
                this.scale = 1.2;
                this.opacity = 0.8;
            } else {
                this.element.classList.remove('dragging');
                this.scale = 1.0;
                this.opacity = 1.0;
            }
        }
    }

    /**
     * 배치 상태 설정
     */
    setPlaced(placed) {
        this.isPlaced = placed;
        if (this.element) {
            if (placed) {
                this.element.classList.add('placed');
            } else {
                this.element.classList.remove('placed');
            }
        }
    }

    /**
     * 특정 포인트에 스냅
     */
    snapTo(point) {
        this.x = point.x;
        this.y = point.y;
        this.setPlaced(true);
        point.filled = true;
        point.tile = this;
    }

    /**
     * 원위치로 복귀
     */
    returnToOriginalPosition() {
        this.x = this.originalPosition.x;
        this.y = this.originalPosition.y;
        this.setDragging(false);
    }

    /**
     * 부드러운 애니메이션으로 이동
     */
    animateTo(targetX, targetY, duration = 300) {
        const startX = this.x;
        const startY = this.y;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = this.easeOutCubic(progress);

            this.x = startX + (targetX - startX) * eased;
            this.y = startY + (targetY - startY) * eased;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Easing 함수
     */
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }

    /**
     * 캔버스에 그리기
     */
    draw(ctx) {
        ctx.save();

        // 위치와 스케일 적용
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = this.opacity;
        ctx.rotate(this.rotation);

        // 배경 그리기 (더 진한 색상)
        const gradient = ctx.createLinearGradient(-35, -35, 35, 35);
        gradient.addColorStop(0, '#FFB6C1');
        gradient.addColorStop(1, '#FF69B4');

        ctx.fillStyle = gradient;
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 4;

        // 둥근 사각형 (더 크게)
        this.roundRect(ctx, -35, -35, 70, 70, 12);
        ctx.fill();
        ctx.stroke();

        // 하얀 내부 테두리
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, -32, -32, 64, 64, 10);
        ctx.stroke();

        // 이모지 그리기 (더 크게)
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4;
        ctx.fillText(this.emoji, 0, 0);

        ctx.restore();
    }

    /**
     * 둥근 사각형 그리기 헬퍼
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * 마우스/터치가 타일 위에 있는지 확인
     */
    containsPoint(px, py) {
        const halfWidth = (this.width * this.scale) / 2;
        const halfHeight = (this.height * this.scale) / 2;

        return px >= this.x - halfWidth &&
               px <= this.x + halfWidth &&
               py >= this.y - halfHeight &&
               py <= this.y + halfHeight;
    }

    /**
     * 타일 타입별 이모지 반환
     */
    static getEmojiForType(type) {
        const emojiMap = {
            'wrinkle': '💫',
            'spot': '🌟',
            'elasticity': '💎',
            'glow': '✨',
            'blood': '🌸'
        };
        return emojiMap[type] || '💫';
    }
}
