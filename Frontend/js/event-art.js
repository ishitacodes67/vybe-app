/* VYBE EVENT ART — unique, deterministic event artwork without mismatched stock photos. */
(() => {
  const themes = {
    tech: {bg:'#17152f', a:'#9b8cff', b:'#4ce0c1', c:'#ffcf70', label:'IDEAS / CODE / FUTURE', motif:'tech'},
    design: {bg:'#f2d9cb', a:'#ff5c72', b:'#5b3acb', c:'#f7bb42', label:'MAKE / PLAY / CREATE', motif:'design'},
    music: {bg:'#24143d', a:'#ff5aa5', b:'#8c74ff', c:'#ffd36b', label:'SOUND / STAGE / SOUL', motif:'music'},
    sports: {bg:'#102f32', a:'#d8ff55', b:'#ff8c45', c:'#e8f4ef', label:'MOVE / COMPETE / WIN', motif:'sports'},
    business: {bg:'#172b45', a:'#75d6c4', b:'#f5c66a', c:'#f1eee7', label:'BUILD / PITCH / GROW', motif:'business'},
    culture: {bg:'#4b1f32', a:'#ffb36b', b:'#e86d8c', c:'#ffe8bd', label:'ROOTS / STORIES / ART', motif:'culture'},
    social: {bg:'#34234d', a:'#ff9cbb', b:'#9ce6d1', c:'#ffe17b', label:'MEET / CONNECT / BELONG', motif:'social'},
    wellness: {bg:'#1d4038', a:'#b7e5a2', b:'#f2c6a5', c:'#f8edcf', label:'RESET / BREATHE / BEGIN', motif:'wellness'}
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const hash = s => { let h=2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; };
  function category(event) {
    const raw = String(event?.category || '').toLowerCase();
    if (raw.includes('sport')) return 'sports';
    if (raw.includes('tech')) return 'tech';
    if (raw.includes('design')) return 'design';
    if (raw.includes('music')) return 'music';
    if (raw.includes('business')) return 'business';
    if (raw.includes('social')) return 'social';
    if (raw.includes('well')) return 'wellness';
    return 'culture';
  }
  function make(event) {
    const cat=category(event), t=themes[cat], seed=hash(event?._id || event?.id || event?.title || 'vybe');
    const title=esc(event?.title || 'Campus experience').toUpperCase();
    const words=title.split(/\s+/).slice(0,5).join(' ');
    const rot=(seed%19)-9, n=seed%4;
    let motif='';
    if(cat==='sports') motif=`<circle cx="790" cy="185" r="108" fill="none" stroke="${t.a}" stroke-width="30"/><circle cx="790" cy="185" r="54" fill="none" stroke="${t.c}" stroke-width="8"/><path d="M610 330 L900 40 M680 370 L970 80" stroke="${t.b}" stroke-width="18" stroke-linecap="round"/>`;
    else if(cat==='tech') motif=`<g fill="none" stroke="${t.a}" stroke-width="3"><rect x="640" y="65" width="220" height="220" rx="28" transform="rotate(${rot} 750 175)"/><path d="M610 175h280M750 35v280M650 75l200 200M850 75L650 275"/></g><circle cx="750" cy="175" r="42" fill="${t.b}"/>`;
    else if(cat==='design') motif=`<path d="M650 55 L920 190 L700 360 Z" fill="${t.a}"/><circle cx="790" cy="160" r="92" fill="${t.b}"/><path d="M625 300 Q770 180 930 315" fill="none" stroke="${t.c}" stroke-width="35" stroke-linecap="round"/>`;
    else if(cat==='music') motif=`<g fill="${t.a}"><circle cx="690" cy="270" r="32"/><circle cx="850" cy="220" r="32"/><path d="M715 270V80l165-35v175h-30V85l-105 23v162z"/></g><path d="M610 330 Q690 210 750 330 T900 330" fill="none" stroke="${t.c}" stroke-width="13"/>`;
    else if(cat==='business') motif=`<path d="M625 300V190h65v110M730 300V120h65v180M835 300V65h65v235" fill="none" stroke="${t.a}" stroke-width="24"/><path d="M620 100l105 35 95-70 100 25" fill="none" stroke="${t.b}" stroke-width="12"/>`;
    else if(cat==='wellness') motif=`<circle cx="770" cy="190" r="125" fill="none" stroke="${t.a}" stroke-width="24"/><path d="M770 300C650 235 660 120 770 170C880 120 890 235 770 300Z" fill="${t.b}"/><path d="M600 340Q770 270 940 340" fill="none" stroke="${t.c}" stroke-width="15"/>`;
    else if(cat==='social') motif=`<circle cx="690" cy="155" r="62" fill="${t.a}"/><circle cx="835" cy="155" r="62" fill="${t.b}"/><path d="M600 330Q690 205 780 330Q870 205 960 330" fill="none" stroke="${t.c}" stroke-width="30" stroke-linecap="round"/>`;
    else motif=`<path d="M650 320V130l110-70 110 70v190" fill="none" stroke="${t.a}" stroke-width="24"/><circle cx="760" cy="190" r="55" fill="${t.b}"/><path d="M610 330h300" stroke="${t.c}" stroke-width="20" stroke-linecap="round"/>`;
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 430"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.bg}"/><stop offset="1" stop-color="${t.bg}" stop-opacity=".82"/></linearGradient><pattern id="p" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.3" fill="${t.c}" opacity=".22"/></pattern></defs><rect width="1000" height="430" fill="url(#g)"/><rect width="1000" height="430" fill="url(#p)"/><path d="M0 350Q220 280 430 360T1000 320V430H0Z" fill="${t.a}" opacity=".12"/>${motif}<g font-family="Arial,Helvetica,sans-serif"><text x="58" y="68" fill="${t.c}" font-size="17" font-weight="700" letter-spacing="5">VYBE / CAMPUS CULTURE</text><text x="58" y="250" fill="#fff" font-size="${words.length>22?44:58}" font-weight="900" letter-spacing="-2">${words}</text><text x="60" y="292" fill="${t.c}" font-size="15" font-weight="700" letter-spacing="4">${t.label}</text><text x="60" y="382" fill="#fff" opacity=".65" font-size="13" letter-spacing="3">DISCOVER SOMETHING THAT FEELS LIKE YOU</text></g><circle cx="940" cy="58" r="16" fill="${t.c}"/><circle cx="940" cy="58" r="6" fill="${t.bg}"/></svg>`;
    return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
  }
  function image(event) {
    const media=Array.isArray(event?.media)?event.media:[];
    const uploaded=media.find(m=>m && m.type==='image' && m.url)?.url;
    return uploaded || event?.imageUrl || event?.coverImage || event?.bannerImage || make(event);
  }
  window.VYBEEventArt={image,make};
})();
