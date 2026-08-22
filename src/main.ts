import './main.css';
import { init2D } from './2d';
import { initGL } from './gl';

const app = document.getElementById('app')!;

const initAnimation = () => (
  init2D(app, () => {
    animation.dispose();
    animation = initGL(app, () => {
      animation.dispose();
      animation = initAnimation();
    });
  })
);

let animation = initAnimation();

window.addEventListener('keydown', (e) => {
  if (!e.repeat && e.key === ' ') {
    animation.next();
  }
});

window.addEventListener('pointerdown', (e) => {
  animation.tap(e);
});

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});
