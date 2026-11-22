import { BaseRenderer } from '../../core/BaseRenderer.js';
import { JigsawArtwork } from './JigsawArtwork.js';

const CANVAS = 600;

/**
 * 凹凸カーブ付きジグソーパズルのSVG描画・ドラッグ＆クリック操作クラス
 */
export class JigsawRenderer extends BaseRenderer {
  constructor(container, onAction) {
    super(container, onAction);
    this.selectedPieceId = null;
    this.showGhost = true;
    this.lastViewModel = null;
  }

  mount() {
    this.container.innerHTML = `<div class="jigsaw-workspace" id="jigsaw-workspace"></div>`;
    this.rootEl = this.container.querySelector('#jigsaw-workspace');
  }

  /**
   * 1ピースの正確な凹凸ベジェパス（600×600基準の絶対座標）を生成
   */
  static buildPiecePath(r, c, n, edges) {
    const s = CANVAS / n;
    const x = c * s;
    const y = r * s;
    const tab = s * 0.22;
    const neck = s * 0.14;

    const edgePath = (x1, y1, x2, y2, dir) => {
      if (dir === 0) return `L ${x2} ${y2}`;
      const dx = x2 - x1;
      const dy = y2 - y1;
      // Normal pointing outward from clockwise perimeter: (dy, -dx) normalized
      const len = Math.hypot(dx, dy);
      const nx = (dy / len) * tab * dir;
      const ny = (-dx / len) * tab * dir;
      const ux = dx / len;
      const uy = dy / len;

      const p1x = x1 + dx * 0.36;
      const p1y = y1 + dy * 0.36;
      const p2x = x1 + dx * 0.64;
      const p2y = y1 + dy * 0.64;
      const midx = x1 + dx * 0.5 + nx;
      const midy = y1 + dy * 0.5 + ny;

      return [
        `L ${p1x.toFixed(1)} ${p1y.toFixed(1)}`,
        `C ${(p1x + ux * neck * 0.35 - nx * 0.25).toFixed(1)} ${(p1y + uy * neck * 0.35 - ny * 0.25).toFixed(1)},`,
        `${(midx - ux * neck * 1.15).toFixed(1)} ${(midy - uy * neck * 1.15).toFixed(1)},`,
        `${midx.toFixed(1)} ${midy.toFixed(1)}`,
        `C ${(midx + ux * neck * 1.15).toFixed(1)} ${(midy + uy * neck * 1.15).toFixed(1)},`,
        `${(p2x - ux * neck * 0.35 - nx * 0.25).toFixed(1)} ${(p2y - uy * neck * 0.35 - ny * 0.25).toFixed(1)},`,
        `${p2x.toFixed(1)} ${p2y.toFixed(1)}`,
        `L ${x2.toFixed(1)} ${y2.toFixed(1)}`,
      ].join(' ');
    };

    return [
      `M ${x.toFixed(1)} ${y.toFixed(1)}`,
      edgePath(x, y, x + s, y, edges.top),
      edgePath(x + s, y, x + s, y + s, edges.right),
      edgePath(x + s, y + s, x, y + s, edges.bottom),
      edgePath(x, y + s, x, y, edges.left),
      'Z',
    ].join(' ');
  }

  render(viewModel) {
    this.lastViewModel = viewModel;
    const { state, elapsedText } = viewModel;
    if (!this.rootEl) return;

    const n = state.gridSize;
    const cell = CANVAS / n;
    const imgUrl = state.customImageUrl || JigsawArtwork.getSvgDataUrl(state.theme);

    if (this.selectedPieceId !== null) {
      const sel = state.pieces[this.selectedPieceId];
      if (!sel || sel.locked) this.selectedPieceId = null;
    }

    // Build defs for all pieces
    const clipDefs = state.pieces
      .map((p) => {
        const d = JigsawRenderer.buildPiecePath(p.correctR, p.correctC, n, p.edges);
        return `<clipPath id="jg-clip-${p.id}"><path d="${d}"/></clipPath>`;
      })
      .join('');

    // Placed pieces on board (shifted into placedSlot coordinates)
    const placedSvg = state.pieces
      .filter((p) => p.placedSlot !== null)
      .sort((a, b) => (a.locked ? 0 : 1) - (b.locked ? 0 : 1))
      .map((p) => {
        const slotR = Math.floor(p.placedSlot / n);
        const slotC = p.placedSlot % n;
        const dx = (slotC - p.correctC) * cell;
        const dy = (slotR - p.correctR) * cell;
        const d = JigsawRenderer.buildPiecePath(p.correctR, p.correctC, n, p.edges);
        const stroke = p.locked ? 'rgba(255,255,255,0.28)' : '#f0c45d';
        const strokeW = p.locked ? 1.2 : 2.5;
        return `
          <g transform="translate(${dx.toFixed(1)}, ${dy.toFixed(1)})" data-placed-piece="${p.id}" style="cursor:${p.locked ? 'default' : 'pointer'};">
            <image href="${imgUrl}" x="0" y="0" width="${CANVAS}" height="${CANVAS}" preserveAspectRatio="xMidYMid slice" clip-path="url(#jg-clip-${p.id})"/>
            <path d="${d}" fill="none" stroke="${stroke}" stroke-width="${strokeW}"/>
          </g>
        `;
      })
      .join('');

    // Slot drop targets
    const slotsSvg = [];
    for (let idx = 0; idx < n * n; idx++) {
      const r = Math.floor(idx / n);
      const c = idx % n;
      const occupant = state.pieces.find((p) => p.placedSlot === idx);
      if (occupant && occupant.locked) continue;
      slotsSvg.push(
        `<rect class="jigsaw-slot-target" data-slot="${idx}" x="${c * cell}" y="${r * cell}" width="${cell}" height="${cell}"/>`
      );
    }

    // Tray pieces
    const trayPieces = state.trayOrder
      .map((id) => state.pieces[id])
      .filter((p) => p && p.placedSlot === null);

    const pad = cell * 0.28;
    const trayHtml =
      trayPieces.length === 0
        ? `<div class="jigsaw-tray-empty">すべてのピースを盤面へ配置しました！</div>`
        : trayPieces
            .map((p) => {
              const vx = p.correctC * cell - pad;
              const vy = p.correctR * cell - pad;
              const vw = cell + pad * 2;
              const d = JigsawRenderer.buildPiecePath(p.correctR, p.correctC, n, p.edges);
              const selectedCls = this.selectedPieceId === p.id ? 'is-selected' : '';
              return `
                <button type="button" class="jigsaw-tray-piece ${selectedCls}" draggable="true" data-tray-piece="${p.id}" aria-label="ピース ${p.id + 1}">
                  <svg viewBox="${vx.toFixed(1)} ${vy.toFixed(1)} ${vw.toFixed(1)} ${vw.toFixed(1)}">
                    <defs><clipPath id="jg-tray-${p.id}"><path d="${d}"/></clipPath></defs>
                    <image href="${imgUrl}" x="0" y="0" width="${CANVAS}" height="${CANVAS}" preserveAspectRatio="xMidYMid slice" clip-path="url(#jg-tray-${p.id})"/>
                    <path d="${d}" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="2"/>
                  </svg>
                </button>`;
            })
            .join('');

    this.rootEl.innerHTML = `
      <div class="jigsaw-toolbar">
        <div class="jigsaw-metrics">
          <span>完成: ${state.lockedCount} / ${state.totalPieces} ピース</span>
          <span>手数: ${state.moves}</span>
          <span>タイム: ${elapsedText}</span>
        </div>
        <div class="jigsaw-tools">
          <button type="button" class="btn btn-secondary btn-sm ${this.showGhost ? 'btn-active' : ''}" id="jg-toggle-ghost">
            お手本 ${this.showGhost ? 'ON' : 'OFF'}
          </button>
          <label class="btn btn-secondary btn-sm jigsaw-upload-label">
            画像を変更
            <input type="file" accept="image/*" id="jg-upload-input" hidden>
          </label>
        </div>
      </div>

      <div class="jigsaw-stage">
        <div class="jigsaw-board-frame">
          <svg class="jigsaw-board-svg" id="jg-board-svg" viewBox="0 0 ${CANVAS} ${CANVAS}" aria-label="ジグソーパズル盤面">
            <defs>${clipDefs}</defs>
            ${
              this.showGhost
                ? `<image href="${imgUrl}" x="0" y="0" width="${CANVAS}" height="${CANVAS}" preserveAspectRatio="xMidYMid slice" opacity="0.22"/>`
                : ''
            }
            ${placedSvg}
            ${slotsSvg.join('')}
          </svg>
        </div>

        <div class="jigsaw-tray-panel">
          <div class="jigsaw-tray-title">
            <span>ピーストレー（ドラッグまたはクリックで配置）</span>
            <span>残 ${trayPieces.length}</span>
          </div>
          <div class="jigsaw-tray-grid" id="jg-tray-grid">${trayHtml}</div>
        </div>
      </div>
    `;

    this._bindEvents(state);
  }

  _bindEvents(state) {
    this.rootEl.querySelector('#jg-toggle-ghost').addEventListener('click', () => {
      this.showGhost = !this.showGhost;
      this.render(this.lastViewModel);
    });

    this.rootEl.querySelector('#jg-upload-input').addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        this.onAction({ type: 'setCustomImage', dataUrl: reader.result });
      };
      reader.readAsDataURL(file);
    });

    // Tray piece click + dragstart
    this.rootEl.querySelectorAll('[data-tray-piece]').forEach((btn) => {
      const id = Number(btn.dataset.trayPiece);
      btn.addEventListener('click', () => {
        this.selectedPieceId = this.selectedPieceId === id ? null : id;
        this.render(this.lastViewModel);
      });
      btn.addEventListener('dragstart', (e) => {
        this.selectedPieceId = id;
        e.dataTransfer?.setData('text/plain', String(id));
      });
    });

    // Board slot click + dragover + drop
    this.rootEl.querySelectorAll('[data-slot]').forEach((slotEl) => {
      const slotIndex = Number(slotEl.dataset.slot);
      slotEl.addEventListener('click', () => {
        if (this.selectedPieceId !== null) {
          const pieceId = this.selectedPieceId;
          this.selectedPieceId = null;
          this.onAction({ type: 'place', pieceId, slotIndex });
          return;
        }
        const occupant = state.pieces.find((p) => p.placedSlot === slotIndex && !p.locked);
        if (occupant) {
          this.onAction({ type: 'returnToTray', pieceId: occupant.id });
        }
      });

      slotEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        slotEl.classList.add('is-drag-over');
      });
      slotEl.addEventListener('dragleave', () => {
        slotEl.classList.remove('is-drag-over');
      });
      slotEl.addEventListener('drop', (e) => {
        e.preventDefault();
        slotEl.classList.remove('is-drag-over');
        const raw = e.dataTransfer?.getData('text/plain');
        const pieceId = raw !== '' && raw !== undefined ? Number(raw) : this.selectedPieceId;
        if (Number.isInteger(pieceId)) {
          this.selectedPieceId = null;
          this.onAction({ type: 'place', pieceId, slotIndex });
        }
      });
    });
  }
}
