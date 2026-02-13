/**
 * Renderer 클래스
 * 거울을 보는 여성과 얼굴을 렌더링
 */
class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 캔버스 크기 설정 (9:16 비율)
        this.setCanvasSize();

        // 영역 정의
        this.defineAreas();

        // 파티클 배열
        this.particles = [];
    }

    /**
     * 캔버스 크기 설정 (9:16 비율)
     */
    setCanvasSize() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        // 9:16 비율 유지
        let width = containerWidth;
        let height = containerHeight;

        const aspectRatio = 9 / 16;
        if (width / height > aspectRatio) {
            width = height * aspectRatio;
        } else {
            height = width / aspectRatio;
        }

        this.canvas.width = width;
        this.canvas.height = height;

        this.width = width;
        this.height = height;
    }

    /**
     * 영역 정의
     */
    defineAreas() {
        // 거울 프레임 영역 (화면 상단 60%)
        const mirrorHeight = this.height * 0.6;
        const mirrorWidth = this.width * 0.9;
        const mirrorX = (this.width - mirrorWidth) / 2;
        const mirrorY = 20;

        this.mirrorFrame = {
            x: mirrorX,
            y: mirrorY,
            width: mirrorWidth,
            height: mirrorHeight
        };

        // 얼굴 영역 (거울 안쪽)
        const faceMargin = 40;
        const faceAreaWidth = (mirrorWidth - faceMargin * 3) / 2;
        const faceAreaHeight = mirrorHeight - faceMargin * 2;

        this.areas = {
            left: {
                x: mirrorX + faceMargin,
                y: mirrorY + faceMargin,
                width: faceAreaWidth,
                height: faceAreaHeight
            },
            right: {
                x: mirrorX + faceMargin * 2 + faceAreaWidth,
                y: mirrorY + faceMargin,
                width: faceAreaWidth,
                height: faceAreaHeight
            }
        };

        this.faceArea = {
            top: mirrorY + faceMargin,
            height: faceAreaHeight
        };

        // 타일 트레이 영역 (화면 하단 35%)
        const trayTop = mirrorY + mirrorHeight + 15;
        this.trayArea = {
            x: 10,
            y: trayTop,
            width: this.width - 20,
            height: this.height - trayTop - 10
        };
    }

    /**
     * 전체 화면 렌더링
     */
    render(gameState, dragDropHandler) {
        // 배경 클리어
        this.clearCanvas();

        // 배경 그라데이션
        this.drawBackground();

        // 여성 실루엣 (거울 뒤)
        this.drawWomanSilhouette();

        // 거울 프레임
        this.drawMirrorFrame();

        // 거울 안 얼굴 영역
        this.drawFaceAreas(gameState);

        // 대칭축
        if (gameState.symmetryChecker) {
            this.drawSymmetryLine();
        }

        // 배치 포인트
        this.drawPlacementPoints(gameState.placementPoints);

        // 타일 트레이
        this.drawTrayArea();

        // 모든 타일
        this.drawAllTiles(gameState.tiles, dragDropHandler);

        // 호버 가이드
        if (dragDropHandler) {
            dragDropHandler.drawHoverGuide(this.ctx);
        }

        // 드래그 중인 타일 (맨 위)
        const draggingTile = dragDropHandler ? dragDropHandler.getDraggingTile() : null;
        if (draggingTile) {
            draggingTile.draw(this.ctx);
        }

        // 파티클 효과
        this.updateAndDrawParticles();
    }

    /**
     * 캔버스 클리어
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }

    /**
     * 배경 그라데이션
     */
    drawBackground() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#FFF5F7');
        gradient.addColorStop(0.5, '#FFE5F1');
        gradient.addColorStop(1, '#FFD6E8');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);

        // 배경 패턴 (옅은 하트들)
        this.drawBackgroundHearts();
    }

    /**
     * 배경 하트 패턴
     */
    drawBackgroundHearts() {
        this.ctx.save();
        this.ctx.globalAlpha = 0.05;
        this.ctx.fillStyle = '#FF1493';

        for (let i = 0; i < 15; i++) {
            const x = (i * 50 + 25) % this.width;
            const y = Math.floor(i * 50 / this.width) * 60 + 30;
            this.drawHeart(x, y, 15);
        }

        this.ctx.restore();
    }

    /**
     * 하트 그리기
     */
    drawHeart(x, y, size) {
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.beginPath();
        this.ctx.moveTo(0, size / 4);
        this.ctx.bezierCurveTo(-size, -size / 2, -size * 1.5, size / 2, 0, size * 1.5);
        this.ctx.bezierCurveTo(size * 1.5, size / 2, size, -size / 2, 0, size / 4);
        this.ctx.fill();
        this.ctx.restore();
    }

    /**
     * 여성 실루엣
     */
    drawWomanSilhouette() {
        const centerX = this.width / 2;
        const bottomY = this.mirrorFrame.y + this.mirrorFrame.height;

        this.ctx.save();
        this.ctx.globalAlpha = 0.15;
        this.ctx.fillStyle = '#FF69B4';

        // 머리
        this.ctx.beginPath();
        this.ctx.ellipse(centerX, bottomY - 30, 40, 50, 0, 0, Math.PI * 2);
        this.ctx.fill();

        // 목
        this.ctx.fillRect(centerX - 15, bottomY - 10, 30, 35);

        // 어깨
        this.ctx.beginPath();
        this.ctx.moveTo(centerX - 50, bottomY + 25);
        this.ctx.lineTo(centerX + 50, bottomY + 25);
        this.ctx.lineTo(centerX + 60, bottomY + 60);
        this.ctx.lineTo(centerX - 60, bottomY + 60);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.restore();
    }

    /**
     * 거울 프레임
     */
    drawMirrorFrame() {
        const m = this.mirrorFrame;

        this.ctx.save();

        // 외부 프레임 (금색 장식)
        const gradient = this.ctx.createLinearGradient(m.x, m.y, m.x + m.width, m.y + m.height);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FFA500');
        gradient.addColorStop(1, '#FFD700');

        this.ctx.fillStyle = gradient;
        this.ctx.strokeStyle = '#DAA520';
        this.ctx.lineWidth = 4;

        // 둥근 사각형 프레임
        this.roundRect(this.ctx, m.x - 10, m.y - 10, m.width + 20, m.height + 20, 20);
        this.ctx.fill();
        this.ctx.stroke();

        // 내부 프레임 (어두운 테두리)
        this.ctx.strokeStyle = '#8B7355';
        this.ctx.lineWidth = 6;
        this.roundRect(this.ctx, m.x, m.y, m.width, m.height, 15);
        this.ctx.stroke();

        // 거울 반사 효과
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.roundRect(this.ctx, m.x, m.y, m.width, m.height, 15);
        this.ctx.fill();

        // 장식 보석들
        this.drawMirrorDecorations();

        this.ctx.restore();
    }

    /**
     * 거울 장식
     */
    drawMirrorDecorations() {
        const m = this.mirrorFrame;
        const gemPositions = [
            { x: m.x + m.width / 2, y: m.y - 5 }, // 상단 중앙
            { x: m.x - 5, y: m.y + m.height / 2 }, // 좌측 중앙
            { x: m.x + m.width + 5, y: m.y + m.height / 2 }, // 우측 중앙
        ];

        gemPositions.forEach(pos => {
            // 보석
            const gemGradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 12);
            gemGradient.addColorStop(0, '#FF1493');
            gemGradient.addColorStop(0.5, '#FF69B4');
            gemGradient.addColorStop(1, '#C71585');

            this.ctx.fillStyle = gemGradient;
            this.ctx.beginPath();
            this.ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
            this.ctx.fill();

            // 반짝임
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(pos.x - 3, pos.y - 3, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    /**
     * 얼굴 영역
     */
    drawFaceAreas(gameState) {
        // 좌측 (실제 얼굴 - 늙음)
        this.drawFaceArea(this.areas.left, '실제', gameState.leftFacePattern);

        // 우측 (거울 반사 - 젊음)
        this.drawFaceArea(this.areas.right, '거울', gameState.rightFacePattern);
    }

    /**
     * 개별 얼굴 영역
     */
    drawFaceArea(area, label, pattern) {
        this.ctx.save();

        // 배경
        const gradient = this.ctx.createRadialGradient(
            area.x + area.width / 2,
            area.y + area.height / 2,
            0,
            area.x + area.width / 2,
            area.y + area.height / 2,
            area.width / 2
        );

        if (pattern.type === 'old') {
            gradient.addColorStop(0, '#F5DEB3');
            gradient.addColorStop(1, '#D2B48C');
        } else {
            gradient.addColorStop(0, '#FFE4E1');
            gradient.addColorStop(1, '#FFB6C1');
        }

        this.ctx.fillStyle = gradient;
        this.roundRect(this.ctx, area.x, area.y, area.width, area.height, 10);
        this.ctx.fill();

        // 테두리
        this.ctx.strokeStyle = pattern.type === 'old' ? '#8B7D6B' : '#FF69B4';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 레이블
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, area.x + area.width / 2, area.y + 18);

        // 얼굴 그리기
        this.drawDetailedFace(area, pattern.type);

        this.ctx.restore();
    }

    /**
     * 상세한 얼굴 그리기
     */
    drawDetailedFace(area, type) {
        const cx = area.x + area.width / 2;
        const cy = area.y + area.height / 2;
        const faceRadius = Math.min(area.width, area.height) * 0.35;

        this.ctx.save();

        // 얼굴 윤곽
        const faceGradient = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, faceRadius);
        if (type === 'old') {
            faceGradient.addColorStop(0, '#E6C8A0');
            faceGradient.addColorStop(1, '#C9A682');
        } else {
            faceGradient.addColorStop(0, '#FFEEF0');
            faceGradient.addColorStop(1, '#FFD6E0');
        }

        this.ctx.fillStyle = faceGradient;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, faceRadius, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈
        const eyeY = cy - faceRadius * 0.2;
        const eyeGap = faceRadius * 0.4;

        this.ctx.fillStyle = type === 'old' ? '#4A4A4A' : '#6B4423';
        this.ctx.beginPath();
        this.ctx.arc(cx - eyeGap, eyeY, faceRadius * 0.12, 0, Math.PI * 2);
        this.ctx.arc(cx + eyeGap, eyeY, faceRadius * 0.12, 0, Math.PI * 2);
        this.ctx.fill();

        // 눈 하이라이트
        if (type === 'young') {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            this.ctx.beginPath();
            this.ctx.arc(cx - eyeGap + 3, eyeY - 3, faceRadius * 0.05, 0, Math.PI * 2);
            this.ctx.arc(cx + eyeGap + 3, eyeY - 3, faceRadius * 0.05, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // 코
        this.ctx.strokeStyle = type === 'old' ? '#8B7D6B' : '#FFB6C1';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - faceRadius * 0.1);
        this.ctx.lineTo(cx + faceRadius * 0.1, cy + faceRadius * 0.1);
        this.ctx.stroke();

        // 입
        this.ctx.strokeStyle = type === 'old' ? '#6B5D4F' : '#FF69B4';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy + faceRadius * 0.3, faceRadius * 0.3, 0.2, Math.PI - 0.2);
        this.ctx.stroke();

        // 늙은 얼굴 특징
        if (type === 'old') {
            // 주름 (이마)
            this.ctx.strokeStyle = '#8B7D6B';
            this.ctx.lineWidth = 1.5;
            for (let i = 0; i < 3; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(cx - faceRadius * 0.4, cy - faceRadius * 0.6 + i * 8);
                this.ctx.lineTo(cx + faceRadius * 0.4, cy - faceRadius * 0.6 + i * 8);
                this.ctx.stroke();
            }

            // 주름 (눈가)
            for (let i = 0; i < 2; i++) {
                this.ctx.beginPath();
                this.ctx.moveTo(cx - eyeGap - faceRadius * 0.2, eyeY);
                this.ctx.lineTo(cx - eyeGap - faceRadius * 0.35, eyeY - (i - 0.5) * 8);
                this.ctx.stroke();

                this.ctx.beginPath();
                this.ctx.moveTo(cx + eyeGap + faceRadius * 0.2, eyeY);
                this.ctx.lineTo(cx + eyeGap + faceRadius * 0.35, eyeY - (i - 0.5) * 8);
                this.ctx.stroke();
            }

            // 색소침착
            this.ctx.fillStyle = 'rgba(139, 125, 107, 0.4)';
            for (let i = 0; i < 7; i++) {
                const spotX = cx + (Math.random() - 0.5) * faceRadius * 1.4;
                const spotY = cy + (Math.random() - 0.5) * faceRadius * 1.4;
                const spotSize = 2 + Math.random() * 3;
                this.ctx.beginPath();
                this.ctx.arc(spotX, spotY, spotSize, 0, Math.PI * 2);
                this.ctx.fill();
            }
        } else {
            // 젊은 얼굴 - 볼터치
            this.ctx.fillStyle = 'rgba(255, 182, 193, 0.4)';
            this.ctx.beginPath();
            this.ctx.arc(cx - faceRadius * 0.5, cy + faceRadius * 0.2, faceRadius * 0.2, 0, Math.PI * 2);
            this.ctx.arc(cx + faceRadius * 0.5, cy + faceRadius * 0.2, faceRadius * 0.2, 0, Math.PI * 2);
            this.ctx.fill();

            // 하이라이트 (광채)
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            this.ctx.beginPath();
            this.ctx.arc(cx - faceRadius * 0.3, cy - faceRadius * 0.4, faceRadius * 0.25, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }

    /**
     * 대칭 라인
     */
    drawSymmetryLine() {
        const centerX = this.width / 2;
        const top = this.mirrorFrame.y;
        const bottom = this.mirrorFrame.y + this.mirrorFrame.height;

        this.ctx.save();
        this.ctx.strokeStyle = '#FFD700';
        this.ctx.lineWidth = 3;
        this.ctx.setLineDash([10, 10]);
        this.ctx.shadowColor = 'rgba(255, 215, 0, 0.5)';
        this.ctx.shadowBlur = 10;

        this.ctx.beginPath();
        this.ctx.moveTo(centerX, top);
        this.ctx.lineTo(centerX, bottom);
        this.ctx.stroke();

        this.ctx.restore();
    }

    /**
     * 배치 포인트
     */
    drawPlacementPoints(points) {
        this.ctx.save();

        for (let point of points) {
            if (!point.filled && !point.mirrorOf) {
                // 빈 배치 포인트 (우측만)
                this.ctx.strokeStyle = '#FFD700';
                this.ctx.lineWidth = 2;
                this.ctx.setLineDash([3, 3]);
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 25, 0, Math.PI * 2);
                this.ctx.stroke();

                // 중앙 점
                this.ctx.fillStyle = '#FFD700';
                this.ctx.setLineDash([]);
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        this.ctx.restore();
    }

    /**
     * 타일 트레이
     */
    drawTrayArea() {
        const t = this.trayArea;

        this.ctx.save();

        // 배경
        const gradient = this.ctx.createLinearGradient(0, t.y, 0, t.y + t.height);
        gradient.addColorStop(0, '#FFE4E1');
        gradient.addColorStop(1, '#FFC0CB');

        this.ctx.fillStyle = gradient;
        this.roundRect(this.ctx, t.x, t.y, t.width, t.height, 15);
        this.ctx.fill();

        // 테두리
        this.ctx.strokeStyle = '#FF1493';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // 레이블
        this.ctx.fillStyle = '#FF1493';
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('✨ 타일을 드래그하세요 ✨', this.width / 2, t.y + 25);

        this.ctx.restore();
    }

    /**
     * 모든 타일 그리기
     */
    drawAllTiles(tiles, dragDropHandler) {
        if (!tiles || tiles.length === 0) {
            console.warn('타일이 없습니다!');
            return;
        }

        const draggingTile = dragDropHandler ? dragDropHandler.getDraggingTile() : null;

        for (let tile of tiles) {
            if (tile !== draggingTile) {
                tile.draw(this.ctx);
            }
        }
    }

    /**
     * 파티클 생성
     */
    createSuccessParticles(x, y) {
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            const speed = 2 + Math.random() * 3;
            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                decay: 0.02,
                color: ['#FFD700', '#FF1493', '#FF69B4', '#FFA500'][Math.floor(Math.random() * 4)],
                size: 4 + Math.random() * 4
            });
        }
    }

    /**
     * 파티클 업데이트 및 그리기
     */
    updateAndDrawParticles() {
        this.ctx.save();

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // 업데이트
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // 중력
            p.life -= p.decay;

            // 그리기
            if (p.life > 0) {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.particles.splice(i, 1);
            }
        }

        this.ctx.restore();
    }

    /**
     * 둥근 사각형
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
     * 영역 정보 반환
     */
    getAreas() {
        return this.areas;
    }

    getSize() {
        return { width: this.width, height: this.height };
    }
}
