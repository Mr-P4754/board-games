import { Router } from './Router.js';
import { GameRegistry } from './GameRegistry.js';
import { StorageManager } from './StorageManager.js';
import { SoundManager } from './SoundManager.js';
import { AIWorkerBridge } from './AIWorkerBridge.js';
import { HeaderView } from '../ui/HeaderView.js';
import { LobbyView } from '../ui/LobbyView.js';
import { SetupModal } from '../ui/SetupModal.js';
import { GameLayoutView } from '../ui/GameLayoutView.js';
import { ResultModal } from '../ui/ResultModal.js';
import { RuleModal } from '../ui/RuleModal.js';
import { StatsModal } from '../ui/StatsModal.js';
import { ToastManager } from '../ui/ToastManager.js';

/**
 * アプリケーション全体のライフサイクル・画面遷移・対局管理を行うメインクラス
 */
export class App {
  constructor({ appRoot, modalRoot, toastRoot }) {
    this.appRoot = appRoot;
    this.modalRoot = modalRoot;

    this.storage = new StorageManager();
    this.registry = new GameRegistry();
    this.sound = new SoundManager(this.storage.getSettings().sound);
    this.aiBridge = new AIWorkerBridge();
    this.toast = new ToastManager(toastRoot);

    this.setupModal = new SetupModal(modalRoot);
    this.resultModal = new ResultModal(modalRoot);
    this.ruleModal = new RuleModal(modalRoot);
    this.statsModal = new StatsModal(modalRoot, this.storage, this.registry.getAll());

    this.headerView = new HeaderView({
      onOpenStats: () =>
        this.statsModal.open(() => {
          if (this.currentRoute?.view === 'lobby') {
            this._renderLobby();
          }
        }),
      onToggleSound: () => this._toggleSound(),
      onToggleTheme: () => this._toggleTheme(),
    });

    this.mainEl = document.createElement('main');
    this.mainEl.className = 'app-main';

    this.pendingConfigs = new Map();
    this.activeController = null;
    this.activeLayout = null;
    this.currentRoute = null;

    this.router = new Router((route) => this._onRouteChange(route));
  }

  start() {
    this._applyTheme(this.storage.getSettings().theme);
    this.appRoot.innerHTML = '';
    this.appRoot.appendChild(this.headerView.render(this.storage.getSettings()));
    this.appRoot.appendChild(this.mainEl);
    this.router.start();
  }

  _applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
  }

  _toggleTheme() {
    const current = this.storage.getSettings().theme;
    const next = current === 'dark' ? 'light' : 'dark';
    this.storage.updateSetting('theme', next);
    this._applyTheme(next);
    this.headerView.render(this.storage.getSettings());
  }

  _toggleSound() {
    const next = !this.storage.getSettings().sound;
    this.storage.updateSetting('sound', next);
    this.sound.setEnabled(next);
    this.headerView.render(this.storage.getSettings());
    this.toast.show(next ? '効果音をONにしました' : '効果音をOFFにしました');
  }

  _cleanupActiveGame() {
    if (this.activeController) {
      this.activeController.destroy();
      this.activeController = null;
    }
    this.activeLayout = null;
  }

  async _onRouteChange(route) {
    this.currentRoute = route;
    this._cleanupActiveGame();
    this.modalRoot.innerHTML = '';

    if (route.view === 'game' && route.gameId) {
      const gameMeta = this.registry.get(route.gameId);
      if (!gameMeta) {
        this.router.navigate('/');
        return;
      }
      await this._enterGame(gameMeta);
    } else {
      this._renderLobby();
    }
  }

  _renderLobby() {
    this.mainEl.className = 'app-main';
    this.mainEl.innerHTML = '';
    const lobby = new LobbyView({
      games: this.registry.getAll(),
      storage: this.storage,
      onSelectGame: async (gameMeta) => {
        const config = await this.setupModal.open(gameMeta, this.pendingConfigs.get(gameMeta.id));
        if (!config) return;
        this.pendingConfigs.set(gameMeta.id, config);
        this.router.navigate(`/game/${gameMeta.id}`);
      },
    });
    this.mainEl.appendChild(lobby.render());
  }

  async _enterGame(gameMeta) {
    let config = this.pendingConfigs.get(gameMeta.id);
    if (!config) {
      config = await this.setupModal.open(gameMeta);
      if (!config) {
        this.router.navigate('/');
        return;
      }
      this.pendingConfigs.set(gameMeta.id, config);
    }

    this.mainEl.className = gameMeta.wideLayout ? 'app-main app-main--wide' : 'app-main';
    this.mainEl.innerHTML = '';

    const layout = new GameLayoutView({
      gameMeta,
      config,
      settings: this.storage.getSettings(),
      handlers: {
        onBack: () => this.router.navigate('/'),
        onRules: () => this.ruleModal.open(gameMeta),
        onChangeSetup: async () => {
          const nextConfig = await this.setupModal.open(gameMeta, config);
          if (!nextConfig) return;
          this.pendingConfigs.set(gameMeta.id, nextConfig);
          this._cleanupActiveGame();
          await this._enterGame(gameMeta);
        },
        onRestart: () => {
          this.modalRoot.innerHTML = '';
          this.activeController?.restart();
        },
        onToggleHints: () => {
          const next = !this.storage.getSettings().showHints;
          this.storage.updateSetting('showHints', next);
          layout.updateHintButton(next);
          this.activeController?.refreshSettings();
        },
        onUndo: () => this.activeController?.undo(),
        onResign: () => this.activeController?.resign(),
      },
    });

    this.activeLayout = layout;
    this.mainEl.appendChild(layout.render());

    const ControllerClass = await gameMeta.loadController();
    // Guard against navigation away while loading module
    if (this.currentRoute?.gameId !== gameMeta.id) return;

    this.activeController = new ControllerClass({
      gameMeta,
      config,
      layoutView: layout,
      storage: this.storage,
      sound: this.sound,
      toast: this.toast,
      aiBridge: this.aiBridge,
      onShowResult: (summary) => {
        this.resultModal.open(summary, {
          onLobby: () => this.router.navigate('/'),
          onSetup: async () => {
            const nextConfig = await this.setupModal.open(gameMeta, config);
            if (!nextConfig) return;
            this.pendingConfigs.set(gameMeta.id, nextConfig);
            this._cleanupActiveGame();
            await this._enterGame(gameMeta);
          },
          onRematch: () => this.activeController?.restart(),
        });
      },
    });

    this.activeController.start();
  }
}
