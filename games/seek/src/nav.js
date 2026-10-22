// 화면 이동 기록: 모든 scene.start 를 기록해 두고, 뒤로가기는 바로 이전 화면으로
//   (서재로 가면 기록을 비움 · 서재에서 뒤로가기는 원어데이로)
const hist = [];
export function installNav() {
  const P = Phaser.Scenes.ScenePlugin.prototype, start = P.start;
  P.start = function (key, data) {
    const from = this.settings.key;
    if (key === 'Library') hist.length = 0;
    else if (!(data && data.__back) && from !== key && from !== 'Boot') hist.push({ key: from, data: { ...(this.settings.data || {}) } });
    if (data && data.__back) delete data.__back, data.back = true;
    return start.call(this, key, data);
  };
}
// 이전 화면으로 (없으면 서재)
export function goPrev(scene) {
  const p = hist.pop(); scene.cameras.main.fadeOut(200, 30, 10, 26);
  scene.cameras.main.once('camerafadeoutcomplete', () => p ? scene.scene.start(p.key, { ...p.data, auto: undefined, __back: true }) : scene.scene.start('Library'));
  return true;
}
