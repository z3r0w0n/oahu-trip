var DATA;
var dataReady = fetch('itinerary.json').then(function(r){return r.json();}).then(function(d){DATA=d;});

function icon(name, size=20) {
  const p = ICONS[name] || ICONS['circle'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

var state={page:'today',dayIso:null,expandedKey:null,foodFilter:'all',
  costcoChecked:new Set(JSON.parse(localStorage.getItem('ck')||'[]')),
  booksDone:new Set(JSON.parse(localStorage.getItem('bd')||'[]'))};

function todayIso(){var d=new Date(),s=d.toISOString().slice(0,10);var days=DATA.days;if(s<days[0].iso)return days[0].iso;if(s>days[days.length-1].iso)return days[days.length-1].iso;return s;}
function currentDay(){var t=state.dayIso||todayIso();return DATA.days.find(function(d){return d.iso===t;})||DATA.days[0];}

// Map each event to one of 7 display categories
function categoryFor(e){
  var cat=e.category||'';
  var ic=(e.icon||'').replace('ti-','');
  if(cat==='booking'||e.badge==='Do this NOW'||e.badge==='Urgent') return 'urgent';
  if(cat==='transit'||['plane-arrival','plane-departure','plane','key','parking','steering-wheel'].includes(ic)) return 'transit';
  if(['car'].includes(ic)&&cat!=='food') return 'transit';
  if(cat==='food'||cat==='dessert'||['bowl','coffee','fish','cup','tools-kitchen-2','bread','glass-cocktail','truck','snowflake','meat','apple'].includes(ic)) return 'food';
  if(cat==='beach'||cat==='nature'||cat==='hike'||cat==='view'||['beach','swimming','walk','plant','wind','droplets','sunset','mountain'].includes(ic)) return 'activity';
  if(cat==='culture'||cat==='free'||['building-monument','temple','anchor','ship','palm-tree','flame'].includes(ic)) return 'culture';
  if(cat==='rest'||['bed','bath','zzz','moon'].includes(ic)) return 'rest';
  if(cat==='shopping'||['shopping-cart','shopping-bag','luggage'].includes(ic)) return 'task';
  if(['building','building-castle','alarm'].includes(ic)) return 'rest';
  return 'transit';
}

var CAT_LABELS={transit:'✈ Transit',food:'🍜 Food & Drink',activity:'🏄 Activity',culture:'🏛 Culture',rest:'🛏 Rest',task:'🛒 Errand',urgent:'⚠ Urgent'};

// Render helpers
function hintsFor(e){
  var h=[];
  if(e.outfit) h.push('<span class="hint h-outfit">'+icon('shirt',12)+' Outfit</span>');
  if(e.weather) h.push('<span class="hint h-weather">'+icon('cloud',12)+' Weather</span>');
  if(e.alternates&&e.alternates.length) h.push('<span class="hint h-alt">'+icon('replace',12)+' Alternatives</span>');
  if(e.badge){
    var bc='h-note';
    if(e.badge==='Gentle pace') bc='h-gentle';
    else if(e.badge==='Do this NOW'||e.badge==='Urgent') bc='h-urgent';
    else if(e.badge==='Pre-booked'||e.badge==='Book ahead') bc='h-book';
    else if(e.badge==='Optional') bc='h-optional';
    h.push('<span class="hint '+bc+'">'+icon('info-circle',12)+' '+e.badge+'</span>');
  }
  if(e.optional&&!e.badge) h.push('<span class="hint h-optional">'+icon('info-circle',12)+' Optional</span>');
  return h.length?'<div class="hintrow">'+h.join('')+'</div>':'';
}

function renderEvent(e,i,dayIso){
  var key=dayIso+'-'+i;
  var open=state.expandedKey===key;
  var tParts=e.time.match(/(\d+:\d+)\s*(AM|PM)/i)||['','',''];
  var hasDetails=e.outfit||e.weather||(e.alternates&&e.alternates.length);
  var iconName=(e.icon||'circle').replace('ti-','');
  var evCat=categoryFor(e);

  var details='';
  if(hasDetails){
    var blocks='';
    if(e.outfit) blocks+='<div class="detblock"><div class="detlbl outfit">'+icon('shirt',11)+' Outfit</div><div class="detval">'+e.outfit+'</div></div>';
    if(e.weather) blocks+='<div class="detblock"><div class="detlbl weather">'+icon('cloud',11)+' Weather note</div><div class="detval">'+e.weather+'</div></div>';
    if(e.alternates&&e.alternates.length){
      var lis=e.alternates.map(function(a){return '<li>'+a+'</li>';}).join('');
      blocks+='<div class="detblock"><div class="detlbl alt">'+icon('replace',11)+' Alternatives</div><div class="detval"><ul>'+lis+'</ul></div></div>';
    }
    details='<div class="evdetails"><div class="det-inner"><div class="det-sep"></div>'+blocks+'</div></div>';
  }

  return '<div class="tl-event cat-'+evCat+(open?' open':'')+'" data-key="'+key+'">'
    +'<div class="evtime">'+tParts[1]+'<small>'+tParts[2]+'</small></div>'
    +'<div class="evbody">'
    +'<div class="evrow">'
    +'<div class="evicon">'+icon(iconName,18)+'</div>'
    +'<div class="evtitle">'+e.title+'</div>'
    +(hasDetails?'<div class="evchev">'+icon('chevron-down',16)+'</div>':'')
    +'</div>'
    +(e.details?'<div class="evdesc">'+e.details+'</div>':'')
    +'<div class="cat-pill">'+CAT_LABELS[evCat]+'</div>'
    +hintsFor(e)
    +details
    +'</div></div>';
}

function renderToday(){
  var day=currentDay();
  var todIso=todayIso();
  var chips=DATA.days.map(function(d){
    var cls='daychip'+(d.iso===day.iso?' active':'')+(d.iso===todIso?' today':'');
    var lab=d.label;
    var dateShort=d.date.split(' ').slice(1).join(' ');
    return '<button class="'+cls+'" data-iso="'+d.iso+'">'+lab+'<span class="chipdate">'+dateShort+'</span></button>';
  }).join('');

  var events=day.events.map(function(e,i){return renderEvent(e,i,day.iso);}).join('');

  return '<div class="page active th-'+day.color+'" id="pg-today">'
    +'<div class="daypicker" id="dpicker">'+chips+'</div>'
    +'<div class="hero">'
    +'<svg class="hero-palm" viewBox="0 0 165 295" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M80 84 Q28 68 2 88" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"/><path d="M80 84 Q34 46 12 18" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/><path d="M80 84 Q58 36 50 4" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><path d="M80 84 Q74 36 76 2" fill="none" stroke="currentColor" stroke-width="15" stroke-linecap="round"/><path d="M80 84 Q102 38 114 4" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round"/><path d="M80 84 Q124 44 148 18" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/><path d="M80 84 Q130 68 160 86" fill="none" stroke="currentColor" stroke-width="22" stroke-linecap="round"/><path d="M82 290 C80 254 76 212 74 174 C72 142 74 112 80 84" fill="none" stroke="currentColor" stroke-width="10" stroke-linecap="round"/></svg>'
    +'<p class="hero-greeting">'+(day.iso===todIso?'Today':'Looking at')+' · <strong>'+day.date+'</strong></p>'
    +'<h1>'+day.theme+'</h1>'
    +'<div class="hero-meta">'
    +'<span>'+icon(day.car?'car':'walk',14)+' '+(day.car?'Car day':'No car')+'</span>'
    +'<span>'+icon('list',14)+' '+day.events.length+' stops</span>'
    +'</div>'
    +'<p class="hero-summary">'+day.summary+'</p>'
    +'</div>'
    +'<div class="wxstrip">'
    +'<div class="wxcell"><div class="wx-lbl">High</div><div class="wx-val">'+day.weather.high+'</div></div>'
    +'<div class="wxcell"><div class="wx-lbl">Rain</div><div class="wx-val">'+day.weather.rain+'</div></div>'
    +'<div class="wxcell"><div class="wx-lbl">Note</div><div class="wx-val sm">'+day.weather.note+'</div></div>'
    +'</div>'
    +'<div class="timeline">'+events+'</div>'
    +'<p class="footnote">— Aloha —</p>'
    +'</div>';
}

function renderTrip(){
  var stats='<div class="meta-grid">'
    +'<div class="metastat"><div class="mlbl">Hotel</div><div class="mval">Bamboo Waikiki</div><div class="msub">Kuhio Ave, Honolulu</div></div>'
    +'<div class="metastat"><div class="mlbl">Duration</div><div class="mval">9 days</div><div class="msub">8 nights</div></div>'
    +'<div class="metastat"><div class="mlbl">Car · Hertz</div><div class="mval">7 days</div><div class="msub">$251 weekly</div></div>'
    +'<div class="metastat"><div class="mlbl">Pickup</div><div class="mval">May 12</div><div class="msub">Hyatt Regency</div></div>'
    +'</div>';

  var contacts=DATA.quickContacts.map(function(c){
    var iconName=c.icon.replace('ti-','');
    return '<div class="contactbtn"'+(c.phone?' onclick="window.location.href=\'tel:'+c.phone+'\'"':'')+'>'
      +'<div class="ci">'+icon(iconName,17)+'</div>'
      +'<div class="ct">'+c.name+(c.phone?'<small>'+c.phone+'</small>':'')+'</div>'
      +'</div>';
  }).join('');

  var cards=DATA.days.map(function(d,i){
    return '<div class="daycard th-'+d.color+'" data-jump="'+d.iso+'">'
      +'<div class="dcnum">'+(i+1)+'<small>'+d.date.split(' ').slice(1).join(' ')+'</small></div>'
      +'<div class="dcbody"><div class="dctitle">'+d.theme+'</div>'
      +'<div class="dcsub">'+d.events.length+' stops · '+(d.car?'Car':'No car')+' · '+d.weather.high+'</div></div>'
      +'<div class="dcarrow">'+icon('chevron-right',16)+'</div>'
      +'</div>';
  }).join('');

  return '<div class="page active" id="pg-trip">'
    +'<div class="trip-hero"><h1>Aloha,<br><em>Oahu</em></h1>'
    +'<p class="dates">May 11 — 19, 2026</p></div>'
    +'<div class="sec-title">At a glance</div>'+stats
    +'<div class="sec-title">Quick contacts</div>'
    +'<div class="contact-grid">'+contacts+'</div>'
    +'<div class="sec-title">The week</div>'
    +'<div class="daycards">'+cards+'</div>'
    +'<p class="footnote">Mahalo for letting Claude plan</p>'
    +'</div>';
}

function renderBookings(){
  var total=DATA.bookings.length;
  var done=DATA.bookings.filter(function(b){return state.booksDone.has(b.what);}).length;
  var pct=Math.round(done/total*100);
  var pb='<div class="progress-bar"><div class="pb-row"><span>Progress</span><span style="color:var(--accent);font-weight:500;">'+pct+'%</span></div><div class="pb-track"><div class="pb-fill" style="width:'+pct+'%;background:var(--accent);"></div></div></div>';
  var cards=DATA.bookings.map(function(b){
    var d=state.booksDone.has(b.what);
    return '<div class="bookcard'+(d?' done':'')+'" data-booking="'+b.what.replace(/"/g,'&quot;')+'">'
      +'<div class="bookcard-hd"><h3>'+b.what+'</h3>'
      +'<div class="bookcheck">'+(d?icon('check',13):'')+'</div></div>'
      +'<div class="bookwhere">'+b.where+'</div>'
      +'<div class="bookwhen">'+b.when+'</div>'
      +'<div class="booknotes">'+b.notes+'</div>'
      +'</div>';
  }).join('');
  return '<div class="page active listpage" id="pg-book">'
    +'<h1>Bookings</h1><p class="pagesub">'+done+' of '+total+' confirmed</p>'
    +pb+cards+'<p class="footnote">— Book early, sleep well —</p></div>';
}

function renderFood(){
  var types=['all'].concat([...new Set(DATA.foodGuide.map(function(f){return f.type;}))]);
  var filtered=state.foodFilter==='all'?DATA.foodGuide:DATA.foodGuide.filter(function(f){return f.type===state.foodFilter;});
  var chips=types.map(function(t){return '<button class="fchip'+(state.foodFilter===t?' active':'')+'" data-filter="'+t+'">'+t+'</button>';}).join('');
  var cards=filtered.map(function(f){
    return '<div class="foodcard">'
      +'<div class="foodcard-row"><div class="foodname">'+f.name+'</div><div class="foodprice">'+f.price+'</div></div>'
      +'<div class="foodwhat">'+f.what+'</div>'
      +'<div class="foodmeta"><span class="foodtype">'+f.type+'</span><span>'+f.when+'</span></div>'
      +'</div>';
  }).join('');
  return '<div class="page active listpage" id="pg-food">'
    +'<h1>Food</h1><p class="pagesub">'+DATA.foodGuide.length+' carefully chosen stops</p>'
    +'<div class="food-filters">'+chips+'</div>'+cards
    +'<p class="footnote">Try everything once</p></div>';
}

function renderCostco(){
  var groups={};
  DATA.costco.forEach(function(item){if(!groups[item.category])groups[item.category]=[];groups[item.category].push(item);});
  var total=DATA.costco.length,got=state.costcoChecked.size,pct=Math.round(got/total*100);
  var pb='<div class="progress-bar"><div class="pb-row"><span>In cart</span><span style="color:var(--palm);font-weight:500;">'+got+' of '+total+'</span></div><div class="pb-track"><div class="pb-fill" style="width:'+pct+'%;background:var(--palm);"></div></div></div>';
  var sections=Object.entries(groups).map(function(e){
    var cat=e[0],items=e[1];
    var rows=items.map(function(item){
      var chk=state.costcoChecked.has(item.item);
      return '<div class="costoitem'+(chk?' checked':'')+'" data-costco="'+item.item.replace(/"/g,'&quot;')+'">'
        +'<div class="costocheck">'+(chk?icon('check',13):'')+'</div>'
        +'<div class="costotext"><div class="costoname">'+item.item+'</div><div class="costonote">'+item.note+'</div></div>'
        +'</div>';
    }).join('');
    return '<div class="costo-section"><div class="costo-sec-title">'+cat+'</div>'+rows+'</div>';
  }).join('');
  return '<div class="page active listpage" id="pg-costco">'
    +'<h1>Costco list</h1><p class="pagesub">Iwilei · Open 10 AM · Tue May 12</p>'
    +pb+sections+'<p class="footnote">— Black card · 2% back —</p></div>';
}

function render(){
  var m=document.getElementById('main');
  var html='';
  if(state.page==='today') html=renderToday();
  else if(state.page==='trip') html=renderTrip();
  else if(state.page==='bookings') html=renderBookings();
  else if(state.page==='food') html=renderFood();
  else if(state.page==='costco') html=renderCostco();
  m.innerHTML=html;
  attach();
  document.querySelectorAll('.navbtn').forEach(function(b){b.classList.toggle('active',b.dataset.page===state.page);});
  window.scrollTo(0,0);
  var tb=document.querySelector('.topbar');
  if(tb) document.documentElement.style.setProperty('--topbar-h',tb.offsetHeight+'px');
}

function attach(){
  // Day picker
  document.querySelectorAll('.daychip').forEach(function(c){
    c.addEventListener('click',function(){state.dayIso=c.dataset.iso;state.expandedKey=null;render();});
  });
  // Timeline events
  document.querySelectorAll('.tl-event').forEach(function(el){
    el.addEventListener('click',function(){
      var k=el.dataset.key;
      state.expandedKey=state.expandedKey===k?null:k;
      el.classList.toggle('open');
      if(state.expandedKey===k) setTimeout(function(){el.scrollIntoView({behavior:'smooth',block:'nearest'});},280);
    });
  });
  // Bookings
  document.querySelectorAll('.bookcard').forEach(function(el){
    el.addEventListener('click',function(){
      var k=el.dataset.booking;
      if(state.booksDone.has(k)) state.booksDone.delete(k); else state.booksDone.add(k);
      localStorage.setItem('bd',JSON.stringify([...state.booksDone]));render();
    });
  });
  // Costco
  document.querySelectorAll('.costoitem').forEach(function(el){
    el.addEventListener('click',function(){
      var k=el.dataset.costco;
      if(state.costcoChecked.has(k)) state.costcoChecked.delete(k); else state.costcoChecked.add(k);
      localStorage.setItem('ck',JSON.stringify([...state.costcoChecked]));render();
    });
  });
  // Food filter
  document.querySelectorAll('.fchip').forEach(function(c){
    c.addEventListener('click',function(){state.foodFilter=c.dataset.filter;render();});
  });
  // Day card jump
  document.querySelectorAll('.daycard').forEach(function(c){
    c.addEventListener('click',function(){state.dayIso=c.dataset.jump;state.page='today';render();});
  });
}

// Nav listeners and render — called after unlock (DATA is guaranteed loaded)
function initApp(){
  DATA.bookings.forEach(function(b){if(b.done)state.booksDone.add(b.what);});
  document.querySelectorAll('.navbtn').forEach(function(b){
    b.addEventListener('click',function(){
      state.page=b.dataset.page;state.expandedKey=null;
      if(b.dataset.page==='today') state.dayIso=null;
      render();
    });
  });

  var overlay=document.getElementById('overlay'),sheet=document.getElementById('msheet');
  document.getElementById('menubtn').addEventListener('click',function(){overlay.classList.add('open');sheet.classList.add('open');});
  overlay.addEventListener('click',function(){overlay.classList.remove('open');sheet.classList.remove('open');});
  document.querySelectorAll('.menuitem').forEach(function(it){
    it.addEventListener('click',function(){
      var a=it.dataset.action;
      if(a==='reset-costco'){if(confirm('Reset Costco list?')){state.costcoChecked.clear();localStorage.setItem('ck','[]');render();}}
      else if(a==='reset-bookings'){if(confirm('Reset bookings?')){state.booksDone.clear();DATA.bookings.forEach(function(b){if(b.done)state.booksDone.add(b.what);});localStorage.setItem('bd',JSON.stringify([...state.booksDone]));render();}}
      else if(a==='about'){alert('Aloha!\nYour Oahu itinerary · works offline\nProgress saves to your device.');}
      overlay.classList.remove('open');sheet.classList.remove('open');
    });
  });

  render();
}

// PIN LOCK — SHA-256 hash of "1091" (no plaintext PIN stored)
(function(){
  // SHA-256 of "1091" — computed via: echo -n "1091" | sha256sum
  var PIN_HASH='11bde34a6593b3da0d81a8a71b24dc6f6cf05d18e9f59e610e58ff202263adef';

  async function sha256(str){
    var buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }

  var entered='';
  var dots=document.querySelectorAll('.pin-dot');
  var errorEl=document.getElementById('lockError');
  var dotsWrap=document.getElementById('pinDots');
  var lockEl=document.getElementById('lockscreen');
  var appEl=document.getElementById('app');

  async function revealApp(){
    sessionStorage.setItem('unlocked','1');
    lockEl.classList.add('unlocking');
    await dataReady;
    lockEl.style.display='none';
    appEl.style.display='';
    initApp();
  }

  // Skip lock if already unlocked in this tab session
  if(sessionStorage.getItem('unlocked')==='1'){
    dataReady.then(function(){
      lockEl.style.display='none';
      appEl.style.display='';
      initApp();
    });
    return;
  }

  function updateDots(){
    dots.forEach(function(d,i){
      d.classList.toggle('filled', i < entered.length);
      d.classList.remove('error');
    });
  }

  function wrongPin(){
    dots.forEach(function(d){ d.classList.add('error'); d.classList.remove('filled'); });
    dotsWrap.classList.add('shake');
    errorEl.classList.add('show');
    setTimeout(function(){
      dotsWrap.classList.remove('shake');
      entered='';
      updateDots();
    },400);
  }

  function tryUnlock(){
    var attempt=entered;
    sha256(attempt).then(function(hash){
      if(hash===PIN_HASH){
        revealApp();
      } else {
        wrongPin();
      }
    });
  }

  document.querySelectorAll('.pin-key[data-n]').forEach(function(btn){
    btn.addEventListener('click',function(){
      if(entered.length>=4) return;
      errorEl.classList.remove('show');
      entered+=btn.dataset.n;
      updateDots();
      if(entered.length===4) setTimeout(tryUnlock,120);
    });
  });

  document.getElementById('pinDel').addEventListener('click',function(){
    if(entered.length>0){
      entered=entered.slice(0,-1);
      errorEl.classList.remove('show');
      updateDots();
    }
  });
})();
