/**
 * SymmetryChecker 클래스
 * 대칭 위치를 계산하고 검증
 */
class SymmetryChecker {
    constructor(type, canvasWidth, canvasHeight, faceArea) {
        this.type = type; // 'horizontal', 'vertical', 'quad', 'rotational'
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.faceArea = faceArea;

        // 대칭축 계산
        this.centerX = canvasWidth / 2;
        this.centerY = faceArea.top + faceArea.height / 2;
    }

    /**
     * 주어진 위치의 대칭 위치 계산
     */
    getMirrorPosition(x, y) {
        switch (this.type) {
            case 'horizontal':
                return this.getHorizontalMirror(x, y);

            case 'vertical':
                return this.getVerticalMirror(x, y);

            case 'quad':
                return this.getQuadMirror(x, y);

            case 'rotational':
                return this.getRotationalMirror(x, y);

            default:
                return { x, y };
        }
    }

    /**
     * 좌우 대칭
     */
    getHorizontalMirror(x, y) {
        return {
            x: this.centerX + (this.centerX - x),
            y: y
        };
    }

    /**
     * 상하 대칭
     */
    getVerticalMirror(x, y) {
        return {
            x: x,
            y: this.centerY + (this.centerY - y)
        };
    }

    /**
     * 4분할 대칭
     */
    getQuadMirror(x, y) {
        // 현재 사분면 판단
        const isLeft = x < this.centerX;
        const isTop = y < this.centerY;

        let mirrorX, mirrorY;

        if (isLeft && isTop) {
            // 1사분면 → 2사분면
            mirrorX = this.centerX + (this.centerX - x);
            mirrorY = y;
        } else if (!isLeft && isTop) {
            // 2사분면 → 3사분면
            mirrorX = x;
            mirrorY = this.centerY + (this.centerY - y);
        } else if (!isLeft && !isTop) {
            // 3사분면 → 4사분면
            mirrorX = this.centerX - (x - this.centerX);
            mirrorY = y;
        } else {
            // 4사분면 → 1사분면
            mirrorX = x;
            mirrorY = this.centerY - (y - this.centerY);
        }

        return { x: mirrorX, y: mirrorY };
    }

    /**
     * 회전 대칭 (90도)
     */
    getRotationalMirror(x, y) {
        const dx = x - this.centerX;
        const dy = y - this.centerY;

        // 90도 회전: (x, y) → (-y, x)
        return {
            x: this.centerX - dy,
            y: this.centerY + dx
        };
    }

    /**
     * 두 위치가 대칭인지 검증
     */
    isSymmetric(x1, y1, x2, y2, tolerance = 20) {
        const mirror = this.getMirrorPosition(x1, y1);
        const distance = Math.sqrt(
            Math.pow(mirror.x - x2, 2) +
            Math.pow(mirror.y - y2, 2)
        );
        return distance <= tolerance;
    }

    /**
     * 대칭축 그리기
     */
    drawSymmetryAxis(ctx) {
        ctx.save();

        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);

        switch (this.type) {
            case 'horizontal':
            case 'quad':
                // 세로 대칭축
                ctx.beginPath();
                ctx.moveTo(this.centerX, this.faceArea.top);
                ctx.lineTo(this.centerX, this.faceArea.top + this.faceArea.height);
                ctx.stroke();
                break;

            case 'vertical':
                // 가로 대칭축
                ctx.beginPath();
                ctx.moveTo(0, this.centerY);
                ctx.lineTo(this.canvasWidth, this.centerY);
                ctx.stroke();
                break;
        }

        // 4분할인 경우 가로축도 그리기
        if (this.type === 'quad') {
            ctx.beginPath();
            ctx.moveTo(0, this.centerY);
            ctx.lineTo(this.canvasWidth, this.centerY);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * 대칭 위치에 가이드 표시
     */
    drawMirrorGuide(ctx, sourceX, sourceY) {
        const mirror = this.getMirrorPosition(sourceX, sourceY);

        ctx.save();
        ctx.strokeStyle = '#00FA9A';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);

        // 원형 가이드
        ctx.beginPath();
        ctx.arc(mirror.x, mirror.y, 35, 0, Math.PI * 2);
        ctx.stroke();

        // 십자선
        ctx.beginPath();
        ctx.moveTo(mirror.x - 10, mirror.y);
        ctx.lineTo(mirror.x + 10, mirror.y);
        ctx.moveTo(mirror.x, mirror.y - 10);
        ctx.lineTo(mirror.x, mirror.y + 10);
        ctx.stroke();

        ctx.restore();
    }
}
