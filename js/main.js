import { App } from './core/App.js';

const app = new App({
  appRoot: document.getElementById('app'),
  modalRoot: document.getElementById('modal-root'),
  toastRoot: document.getElementById('toast-root'),
});

app.start();
