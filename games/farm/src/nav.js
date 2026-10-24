// 화면 이동 기록: 모든 scene.start 를 기록해 두고, 뒤로가기는 바로 이전 화면으로
//   (서재로 가면 기록을 비움 · 서재에서 뒤로가기는 원어데이로)
const hist = [];
export function installNav() {
  const P = Phaser.Scenes.ScenePlugin.prototype, start = P.start;
  P.start = function (key, data) {
    const from = this.settings.key;
    if (key === 'Town') hist.length = 0;
    // 기록하지 않는 경우: 뒤로 가는 이동 · 같은 화면 · 부팅 · 곧바로 숨은 물건으로 넘기기만 하는 이야기(part: hunt)
    else if (!(data && data.__back) && from !== key && from !== 'Boot' && !(from === 'Story' && this.settings.data && this.settings.data.part === 'hunt')) hist.push({ key: from, data: { ...(this.settings.data || {}) } });
    if (data && data.__back) delete data.__back, data.back = true;
    return start.call(this, key, data);
  };
}
// 이전 화면으로 (없으면 서재)
export function goPrev(scene) {
  if (scene.__goingBack) return true; scene.__goingBack = true; scene.events.once('shutdown', () => { scene.__goingBack = false; });   // 연타해도 한 단계만
  const p = hist.pop(); scene.cameras.main.fadeOut(200, 30, 10, 26);
  scene.cameras.main.once('camerafadeoutcomplete', () => p ? scene.scene.start(p.key, { ...p.data, auto: undefined, __back: true }) : scene.scene.start('Town'));
  return true;
}
