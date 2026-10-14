import assert from 'node:assert/strict';

export async function checkExperience({ evaluate, wait, go, click, set, viewport, shot, check, send, pause, results, fixtures }) {
  await viewport(1440);
  const height = await evaluate("document.querySelector('.time-hero').getBoundingClientRect().height");
  const states = ['morning', 'noon', 'afternoon', 'night'];
  for (let i = 0; i < states.length; i++) {
    await click(`.time-controls button:nth-child(${i + 2})`);
    await wait(`document.querySelector('.home-page').dataset.timeTheme === '${states[i]}'`);
    await pause(1500);
    assert.equal(await evaluate("document.querySelector('.time-hero').getBoundingClientRect().height"), height);
    await check(`Home ${states[i]} theme desktop`);
    await shot(`home-${states[i]}`);
    const contrast = await evaluate(`(() => {
      const el = document.querySelector('.time-controls button[aria-pressed="true"]');
      const style = getComputedStyle(el);
      const luminance = color => color.match(/[\\d.]+/g).slice(0,3).map(Number).map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
      const a=luminance(style.color), b=luminance(style.backgroundColor);
      return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
    })()`);
    assert.ok(contrast >= 4.5, `${states[i]} selected theme control contrast: ${contrast}`);
  }
  results.push('Theme previews preserve hero dimensions and readable selected controls');
  await click('.time-controls button:first-child');
  // Advance the browser-local wall clock across 11:00; the existing timer must update without navigation.
  await evaluate(`(() => {
    const RealDate = window.Date; window.__realDate = RealDate;
    const start = RealDate.now(); const base = new RealDate(2026,9,12,10,59,59,200).getTime();
    window.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [base + RealDate.now() - start])); } };
    window.dispatchEvent(new Event('focus'));
  })()`);
  await wait("document.querySelector('.home-page').dataset.timeTheme === 'morning'");
  await wait("document.querySelector('.home-page').dataset.timeTheme === 'noon'");
  await click('.time-controls button:nth-child(5)');
  await evaluate("window.dispatchEvent(new Event('focus'))");
  assert.equal(await evaluate("document.querySelector('.home-page').dataset.timeTheme"), 'night');
  await evaluate("window.Date=window.__realDate;delete window.__realDate;window.dispatchEvent(new Event('focus'))");
  results.push('Auto crosses local time boundary without reload; manual preview overrides clock');

  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await wait("document.querySelector('.time-hero').dataset.motion === 'paused'");
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.time-stars')).animationName"), 'none');
  assert.equal(await evaluate("getComputedStyle(document.querySelector('.time-landscape')).transform"), 'none');
  for (const width of [320,375,768,1024,1201,1440]) {
    await viewport(width);
    for (let i = 0; i < states.length; i++) {
      await click(`.time-controls button:nth-child(${i + 2})`);
      await check(`Home ${states[i]} at ${width}px`);
      assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), true);
    }
  }
  await viewport(375, 844);
  await shot('home-night-mobile');
  await evaluate("document.querySelector('.home-stories').scrollIntoView()");
  await wait("document.querySelector('.home-reviews-content')?.innerText.includes('Chờ những câu chuyện')");
  assert.equal(await evaluate("document.querySelector('.site-header').classList.contains('is-scrolled')"), true);
  results.push('Reduced motion disables decorative animation; empty reviews stay honest; header changes on scroll');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

  fixtures({ reviewsFail: true });
  await go('/');
  await evaluate("document.querySelector('.home-stories').scrollIntoView()");
  await wait("document.querySelector('.home-reviews-content')?.innerText.includes('Chưa tải được đánh giá')");
  fixtures({ reviewsFail: false, review: { id: 99, author: 'Synthetic UI reviewer', rating: 4, comment: 'UI-only API fixture feedback' } });
  await click('.home-reviews-content .btn');
  await wait("document.querySelector('.home-review')?.innerText.includes('UI-only API fixture feedback')");
  results.push('Home reviews recover from API failure and render only API fixture content');
  fixtures({ review: null });

  await go('/destinations');
  await wait("document.querySelector('.destination-card')");
  await viewport(1440);
  await check('Destinations desktop');
  await shot('destinations-desktop');
  const destination = await evaluate("document.querySelector('.destination-card h3').textContent");
  await click('.destination-card');
  await wait("location.pathname === '/tours'");
  assert.equal(await evaluate("new URLSearchParams(location.search).get('q')"), destination);
  await go('/destinations');
  await set('.destination-search input', 'missing-fixture-place');
  await wait("document.querySelector('.empty-state')?.innerText.includes('Chưa tìm thấy khu vực')");
  await click('.empty-state .btn');
  await wait("document.querySelector('.destination-card')");
  fixtures({ emptyTours: true });
  await go('/destinations');
  await wait("document.querySelector('.empty-state')?.innerText.includes('Điểm đến đang được cập nhật')");
  assert.equal(await evaluate("document.querySelectorAll('.destination-card').length"), 0);
  fixtures({ emptyTours: false });
  results.push('Destinations preserve API location filters and handle missing/empty data');

  await go('/contact');
  await evaluate("Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.__copiedSupport=text}}})");
  await set('.contact-compose textarea', 'Synthetic UI support question');
  await evaluate("document.querySelector('.contact-compose').requestSubmit()");
  await wait("document.querySelector('.contact-compose [role=status]')");
  assert.ok((await evaluate("document.querySelector('.contact-compose [role=status]').textContent")).includes('Chưa có thông tin nào được gửi'));
  assert.ok((await evaluate("window.__copiedSupport")).includes('Synthetic UI support question'));
  await shot('contact-desktop');
  for (const path of ['/contact','/destinations','/handbook','/about']) {
    await go(path);
    await viewport(320, 844);
    await check(`${path} content 320px`);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"), true);
    assert.equal(await evaluate("document.querySelector('[data-time-theme]')"), null);
  }
  results.push('Contact draft does not claim submission; homepage theme is absent on other public pages');
  await go('/');
  await viewport(390, 844);
}
