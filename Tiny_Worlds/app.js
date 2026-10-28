'use strict';

(() => {
  const WIDTH = 10;
  const HEIGHT = 8;
  const MAX_CELLS = WIDTH * HEIGHT;
  const SAVE_KEY = 'tiny-worlds:saved-worlds:v1';
  const CURRENT_KEY = 'tiny-worlds:current:v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const BIOMES = {
    meadow: {label: 'Meadow', title: 'Little Meadow', subtitle: 'Sebuah tempat kecil yang tenang.', terrain: 'land', caption: 'a soft sunny day'},
    desert: {label: 'Desert', title: 'Little Oasis', subtitle: 'Sedikit teduh di tengah pasir.', terrain: 'sand', caption: 'warm sand, quiet skies'},
    snow: {label: 'Snowfield', title: 'Snowy Nook', subtitle: 'Dunia mungil yang diselimuti salju.', terrain: 'snow', caption: 'a tiny winter tale'},
    mystic: {label: 'Mystic', title: 'Mosslight Isle', subtitle: 'Ada sihir kecil di sudut-sudutnya.', terrain: 'mystic', caption: 'somewhere between stars'}
  };

  const TOOLS = [
    {id:'tree', label:'Pohon rindang', short:'Pohon', emoji:'🌳', category:'nature', desc:'Tempat berteduh bagi penghuni kecil.'},
    {id:'pine', label:'Pohon pinus', short:'Pinus', emoji:'🌲', category:'nature', desc:'Membawa suasana hutan ke pulau.'},
    {id:'flower', label:'Bunga liar', short:'Bunga', emoji:'🌼', category:'nature', desc:'Sedikit warna untuk sudut yang kosong.'},
    {id:'mushroom', label:'Jamur', short:'Jamur', emoji:'🍄', category:'nature', desc:'Tumbuh di tempat yang terasa ajaib.'},
    {id:'rock', label:'Batu kecil', short:'Batu', emoji:'🪨', category:'nature', desc:'Detail kecil yang bikin pulau terasa alami.'},
    {id:'pond', label:'Kolam', short:'Kolam', emoji:'💧', category:'nature', desc:'Sudut air kecil yang menenangkan.'},
    {id:'house', label:'Pondok', short:'Pondok', emoji:'🏡', category:'buildings', desc:'Rumah untuk seseorang yang mungkin tinggal di sini.'},
    {id:'dock', label:'Dermaga', short:'Dermaga', emoji:'🛶', category:'buildings', desc:'Tempat perahu kecil berhenti.'},
    {id:'windmill', label:'Kincir angin', short:'Kincir', emoji:'🌬️', category:'buildings', desc:'Berputar ketika angin lewat.'},
    {id:'bridge', label:'Jembatan', short:'Jembatan', emoji:'🌉', category:'buildings', desc:'Menghubungkan dua sudut pulau.'},
    {id:'lantern', label:'Lentera', short:'Lentera', emoji:'🏮', category:'magic', desc:'Menyalakan malam kecilmu.'},
    {id:'crystal', label:'Kristal', short:'Kristal', emoji:'💎', category:'magic', desc:'Kilau kecil dengan rahasia tersembunyi.'},
    {id:'star', label:'Bintang jatuh', short:'Bintang', emoji:'🌟', category:'magic', desc:'Semoga ada permintaan yang terkabul.'},
    {id:'fairy', label:'Peri kecil', short:'Peri', emoji:'🧚', category:'magic', desc:'Penghuni mungil yang datang tanpa suara.'},
    {id:'campfire', label:'Api unggun', short:'Api unggun', emoji:'🔥', category:'buildings', desc:'Tempat berkumpul saat malam.'},
    {id:'boat', label:'Perahu', short:'Perahu', emoji:'⛵', category:'buildings', desc:'Siap menjelajah ke tempat lain.'}
  ];

  const DISCOVERIES = [
    {id:'home-woods', title:'Rumah di antara pohon', text:'Pondok dan pohon membuat sudut yang terasa seperti rumah.', icon:'🏡', needs:['house','tree']},
    {id:'nightlight', title:'Taman bercahaya', text:'Lentera bertemu bunga: sudut kecil yang tak ingin tidur.', icon:'🏮', needs:['lantern','flower']},
    {id:'secret-garden', title:'Kebun rahasia', text:'Jamur dan kristal menemukan tempat ajaib bersama.', icon:'🍄', needs:['mushroom','crystal']},
    {id:'sea-trip', title:'Perjalanan dimulai', text:'Dermaga dan perahu siap mengantar cerita berikutnya.', icon:'⛵', needs:['dock','boat']},
    {id:'wish', title:'Satu permintaan', text:'Bintang jatuh ditemani peri. Kamu pasti berharap sesuatu.', icon:'🌟', needs:['star','fairy']},
    {id:'camp', title:'Malam yang hangat', text:'Api unggun di dekat pondok: waktu untuk beristirahat.', icon:'🔥', needs:['campfire','house']}
  ];

  const els = {
    biome: $('#biomeSelect'), newWorld: $('#newWorldBtn'), seed: $('#seedValue'), copySeed: $('#copySeedBtn'), title: $('#worldTitle'), subtitle: $('#worldSubtitle'), rename: $('#renameBtn'), reset: $('#resetBtn'), scene: $('#worldScene'), grid: $('#worldGrid'), caption: $('#sceneCaption'), sun: $('#sunOrMoon'), tileCount: $('#tileCount'), tip: $('#tipText'), save: $('#saveWorldBtn'), share: $('#shareWorldBtn'), weather: $('#weatherChoices'), time: $('#timeChoices'), objectCounter: $('#objectCounter'), toolTabs: $('#toolTabs'), palette: $('#toolPalette'), selectedTool: $('#selectedToolInfo'), erase: $('#eraseModeBtn'), undo: $('#undoBtn'), discoveryCount: $('#discoveryCount'), discoveries: $('#discoveryList'), savedCount: $('#savedCount'), savedSelect: $('#savedWorldSelect'), load: $('#loadWorldBtn'), export: $('#exportBtn'), exportPng: $('#exportPngBtn'), import: $('#importInput'), surprise: $('#surpriseBtn'), toast: $('#toast'), renameDialog: $('#renameDialog'), renameForm: $('#renameForm'), worldName: $('#worldNameInput')
  };

  let state;
  let selectedTool = 'tree';
  let selectedCategory = 'all';
  let eraseMode = false;
  let selectedCell = null;
  let undoStack = [];
  let toastTimer;

  function makeRng(seed) {
    let x = Number(seed) >>> 0;
    return () => {
      x += 0x6D2B79F5;
      let t = x;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function newSeed() { return Math.floor(Math.random() * 899999 + 100000); }
  function cellId(x,y) { return `${x},${y}`; }
  function decodeSeedFromUrl() {
    const url = new URL(window.location.href);
    const raw = Number(url.searchParams.get('seed'));
    const biome = url.searchParams.get('biome');
    return {seed: Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : null, biome: BIOMES[biome] ? biome : null};
  }

  function encodeUtf8Base64(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function decodeUtf8Base64(value) {
    let padded = value.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) padded += '=';
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function decodeSharedWorldFromUrl() {
    try {
      const encoded = new URL(window.location.href).searchParams.get('world');
      if (!encoded) return null;
      const world = JSON.parse(decodeUtf8Base64(encoded));
      if (!world || !Array.isArray(world.cells) || world.cells.length !== MAX_CELLS || !BIOMES[world.biome]) return null;
      return world;
    } catch { return null; }
  }

  function createWorld(seed = newSeed(), biome = 'meadow') {
    const rng = makeRng(seed);
    const cells = [];
    const cx = (WIDTH - 1) / 2;
    const cy = (HEIGHT - 1) / 2;
    const rx = WIDTH * 0.48;
    const ry = HEIGHT * 0.48;
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        const nx = (x - cx) / rx;
        const ny = (y - cy) / ry;
        const edge = nx * nx + ny * ny;
        const noise = (rng() - .5) * .23;
        const land = edge + noise < 0.88 && !(y === 0 && (x < 3 || x > 6)) && !(y === HEIGHT-1 && (x === 0 || x === WIDTH-1));
        cells.push({x,y,land,terrain:land ? BIOMES[biome].terrain : 'water', object:null});
      }
    }
    // Leave a few irregular shoreline notches so every seeded island looks different.
    const landCells = cells.filter(c => c.land);
    if (landCells.length > 8) {
      const notchCount = 1 + Math.floor(rng() * 4);
      for (let i=0;i<notchCount;i++) {
        const edgeCell = landCells[Math.floor(rng()*landCells.length)];
        const isEdge = [[0,-1],[1,0],[-1,0],[0,1]].some(([dx,dy]) => {
          const n = cells.find(c => c.x===edgeCell.x+dx && c.y===edgeCell.y+dy);
          return !n || !n.land;
        });
        if (isEdge) { edgeCell.land=false; edgeCell.terrain='water'; }
      }
    }
    return {id:`world-${Date.now()}`, seed, biome, name:BIOMES[biome].title, weather:'sunny', time:'morning', cells, createdAt:Date.now(), updatedAt:Date.now(), discoveries:[]};
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function pushUndo() {
    undoStack.push(clone(state));
    if (undoStack.length > 40) undoStack.shift();
    els.undo.disabled = undoStack.length === 0;
  }
  function saveCurrent() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(state)); } catch { /* Private browsing may block storage. */ }
  }
  function restoreCurrent() {
    try {
      const raw = localStorage.getItem(CURRENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.cells) && parsed.cells.length === MAX_CELLS && BIOMES[parsed.biome]) return parsed;
      }
    } catch { /* Use a fresh world when stored data is invalid. */ }
    const params = decodeSeedFromUrl();
    return createWorld(params.seed || newSeed(), params.biome || 'meadow');
  }
  function getCell(x,y) { return state.cells.find(c => c.x === x && c.y === y); }
  function currentTool() { return TOOLS.find(t => t.id === selectedTool); }
  function objectCounts() {
    const counts = {};
    state.cells.forEach(c => { if (c.object) counts[c.object] = (counts[c.object] || 0) + 1; });
    return counts;
  }
  function getFoundDiscoveries() {
    const counts = objectCounts();
    return DISCOVERIES.filter(item => item.needs.every(id => (counts[id] || 0) > 0)).map(item => item.id);
  }

  function renderGrid() {
    const frag = document.createDocumentFragment();
    const counts = objectCounts();
    state.cells.forEach(cell => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `world-tile ${cell.land ? cell.terrain : 'water'}${selectedCell === cellId(cell.x,cell.y) ? ' is-selected' : ''}`;
      btn.dataset.x = String(cell.x); btn.dataset.y = String(cell.y);
      btn.setAttribute('role','gridcell');
      const object = cell.object && TOOLS.find(t => t.id === cell.object);
      const emoji = document.createElement('span'); emoji.className='tile-emoji'; emoji.textContent = object ? object.emoji : (cell.land && cell.terrain === 'mystic' && (cell.x+cell.y)%5===0 ? '✧' : '');
      btn.append(emoji);
      if (object && (cell.object === 'crystal' || cell.object === 'star' || cell.object === 'fairy')) {
        const sparkle=document.createElement('span'); sparkle.className='sparkle'; sparkle.textContent='✦'; btn.append(sparkle);
      }
      btn.setAttribute('aria-label', `${cell.land ? cell.terrain : 'air'} tile ${cell.x+1}, ${cell.y+1}${object ? `, ${object.label}` : ''}`);
      btn.title = `${cell.x+1}, ${cell.y+1}${object ? ` · ${object.label}` : cell.land ? ` · ${cell.terrain}` : ' · laut'}`;
      btn.addEventListener('click', () => useCell(cell.x,cell.y));
      frag.append(btn);
    });
    els.grid.replaceChildren(frag);
    const landCount = state.cells.filter(c=>c.land).length;
    const things = Object.values(counts).reduce((a,b)=>a+b,0);
    els.tileCount.textContent = `${things} little ${things===1?'thing':'things'} · ${landCount} land tiles`;
    els.objectCounter.textContent = `${things} / ${landCount}`;
  }

  function renderPalette() {
    const items = TOOLS.filter(tool => selectedCategory === 'all' || tool.category === selectedCategory);
    const frag = document.createDocumentFragment();
    items.forEach(tool => {
      const btn=document.createElement('button'); btn.type='button'; btn.className=`tool-option${!eraseMode&&tool.id===selectedTool?' active':''}`; btn.dataset.tool=tool.id;
      btn.innerHTML = `<span class="check">✓</span><span class="emoji"></span><span class="tool-label"></span>`;
      $('.emoji',btn).textContent=tool.emoji; $('.tool-label',btn).textContent=tool.short;
      btn.setAttribute('aria-pressed',String(!eraseMode&&tool.id===selectedTool)); btn.setAttribute('aria-label',tool.label); btn.title=tool.label;
      btn.addEventListener('click',()=>{ selectedTool=tool.id; eraseMode=false; els.erase.classList.remove('active'); renderPalette(); renderSelectedTool(); updateTip(); });
      frag.append(btn);
    });
    els.palette.replaceChildren(frag);
  }

  function renderSelectedTool() {
    if (eraseMode) {
      $('.selected-tool-emoji',els.selectedTool).textContent='⌫';
      $('strong',els.selectedTool).textContent='Penghapus';
      $('small',els.selectedTool).textContent='Ketuk benda yang ingin dihapus.';
      $('.selected-check',els.selectedTool).textContent='✓';
      return;
    }
    const tool=currentTool();
    $('.selected-tool-emoji',els.selectedTool).textContent=tool.emoji;
    $('strong',els.selectedTool).textContent=tool.label;
    $('small',els.selectedTool).textContent=tool.desc;
  }
  function updateTip() {
    els.tip.textContent = eraseMode ? 'Mode penghapus aktif. Ketuk benda untuk menghapusnya.' : `Pilih ${currentTool().label.toLowerCase()}, lalu ketuk petak tanah untuk menaruhnya.`;
  }

  function renderDiscoveries() {
    const found = getFoundDiscoveries();
    state.discoveries = found;
    els.discoveryCount.textContent = `${found.length} / ${DISCOVERIES.length}`;
    const frag = document.createDocumentFragment();
    DISCOVERIES.forEach(item => {
      const isFound=found.includes(item.id);
      const row=document.createElement('div'); row.className=`discovery-item${isFound?' found':' locked'}`;
      const icon=document.createElement('span'); icon.className='discovery-icon'; icon.textContent=isFound?item.icon:'?';
      const copy=document.createElement('div'); const title=document.createElement('strong'); title.textContent=isFound?item.title:'Penemuan tersembunyi';
      const text=document.createElement('small'); text.textContent=isFound?item.text:'Coba letakkan dua benda yang cocok bersama.';
      copy.append(title,text); row.append(icon,copy); frag.append(row);
    });
    els.discoveries.replaceChildren(frag);
  }

  function renderHeader() {
    const biome=BIOMES[state.biome];
    els.biome.value=state.biome;
    els.seed.textContent=`TW-${String(state.seed).padStart(6,'0')}`;
    els.title.textContent=state.name || biome.title;
    els.subtitle.textContent=biome.subtitle;
    els.scene.className=`world-scene weather-${state.weather} time-${state.time}`;
    els.caption.textContent = state.weather==='rainy' ? 'little drops, little thoughts' : state.weather==='snowy' ? 'a quiet winter moment' : state.weather==='starry' ? 'under a blanket of stars' : state.time==='golden' ? 'golden hour on your island' : state.time==='night' ? 'the world is softly asleep' : biome.caption;
    els.sun.textContent = state.weather==='rainy'?'☁':state.weather==='snowy'?'❄':state.weather==='starry'||state.time==='night'?'☾':state.time==='golden'?'🌅':'☀';
    $$('.choice',els.weather).forEach(b=>{const active=b.dataset.weather===state.weather;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    $$('.choice',els.time).forEach(b=>{const active=b.dataset.time===state.time;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
  }

  function renderSavedList() {
    let worlds=[];
    try { worlds=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]'); if(!Array.isArray(worlds))worlds=[]; } catch { worlds=[]; }
    els.savedCount.textContent=String(worlds.length);
    const previous=els.savedSelect.value;
    const frag=document.createDocumentFragment();
    const placeholder=document.createElement('option'); placeholder.value=''; placeholder.textContent=worlds.length?'Pilih dunia tersimpan…':'Belum ada dunia tersimpan'; frag.append(placeholder);
    worlds.forEach(w=>{const opt=document.createElement('option');opt.value=w.id;opt.textContent=`${w.name||'Untitled'} · TW-${String(w.seed).padStart(6,'0')}`;frag.append(opt);});
    els.savedSelect.replaceChildren(frag); if(worlds.some(w=>w.id===previous))els.savedSelect.value=previous;
  }

  function renderAll() { renderHeader(); renderGrid(); renderPalette(); renderSelectedTool(); renderDiscoveries(); renderSavedList(); els.undo.disabled=undoStack.length===0; saveCurrent(); }

  function showToast(message) {
    clearTimeout(toastTimer); els.toast.textContent=message; els.toast.classList.add('show');
    toastTimer=setTimeout(()=>els.toast.classList.remove('show'),2600);
  }

  function useCell(x,y) {
    const cell=getCell(x,y); if(!cell)return;
    if (!cell.land) { showToast('Bagian biru adalah laut. Pilih petak pulau untuk membangun.'); return; }
    const previousDiscovery=getFoundDiscoveries().length;
    pushUndo();
    selectedCell=cellId(x,y);
    if (eraseMode) {
      if(!cell.object){undoStack.pop();els.undo.disabled=undoStack.length===0;showToast('Petak ini belum punya benda.');return;}
      cell.object=null;
    } else {
      const tool=currentTool();
      if(cell.object===tool.id){undoStack.pop();els.undo.disabled=undoStack.length===0;showToast('Benda itu sudah ada di sini.');return;}
      cell.object=tool.id;
    }
    renderAll();
    const nextDiscovery=getFoundDiscoveries().length;
    if(nextDiscovery>previousDiscovery){const newOne=DISCOVERIES.find(d=>state.discoveries.includes(d.id)&&!undoStack.at(-1)?.discoveries?.includes(d.id));showToast(newOne?`Penemuan baru: ${newOne.title} ✨`:'Ada penemuan baru di duniamu ✨');}
  }

  function setBiome(biome, keepObjects=true) {
    if(!BIOMES[biome])return;
    pushUndo();
    state.biome=biome;
    state.cells.forEach(c=>{if(c.land)c.terrain=BIOMES[biome].terrain;});
    if(!keepObjects)state.cells.forEach(c=>c.object=null);
    if(!state.name || Object.values(BIOMES).some(b=>b.title===state.name))state.name=BIOMES[biome].title;
    renderAll();
  }

  function makeNewWorld() {
    const keepBiome=state?.biome||'meadow';
    if(!confirm('Buat dunia baru? Dunia saat ini tetap bisa dipilih lagi jika sudah disimpan.'))return;
    pushUndo();
    const params=decodeSeedFromUrl();
    state=createWorld(newSeed(),keepBiome);
    selectedCell=null; eraseMode=false; selectedTool='tree';
    els.erase.classList.remove('active');
    updateUrlSeed(); renderAll(); showToast('Dunia baru siap dijelajahi. ✦');
  }

  function updateUrlSeed() {
    const url=new URL(window.location.href);
    url.searchParams.delete('world');
    url.searchParams.set('seed',String(state.seed)); url.searchParams.set('biome',state.biome);
    history.replaceState({},'',url.toString());
  }

  function saveWorld() {
    let worlds=[];
    try { worlds=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]'); if(!Array.isArray(worlds))worlds=[]; } catch { worlds=[]; }
    const saved=clone(state);
    saved.savedAt=Date.now();
    const existing=worlds.findIndex(w=>w.id===saved.id);
    if(existing>=0)worlds.splice(existing,1);
    worlds.unshift(saved); worlds=worlds.slice(0,20);
    try { localStorage.setItem(SAVE_KEY,JSON.stringify(worlds)); renderSavedList(); showToast(`“${saved.name}” disimpan di browser ini. ♡`); }
    catch { showToast('Penyimpanan browser penuh atau tidak tersedia. Export JSON sebagai backup.'); }
  }

  function loadWorld() {
    const id=els.savedSelect.value;
    if(!id){showToast('Pilih dulu dunia yang ingin dibuka.');return;}
    let worlds=[];try{worlds=JSON.parse(localStorage.getItem(SAVE_KEY)||'[]');}catch{worlds=[];}
    const saved=worlds.find(w=>w.id===id);
    if(!saved){showToast('Dunia tidak ditemukan di penyimpanan browser.');renderSavedList();return;}
    pushUndo();state=clone(saved);selectedCell=null;eraseMode=false;selectedTool='tree';els.erase.classList.remove('active');updateUrlSeed();renderAll();showToast(`Selamat datang kembali di ${state.name}.`);
  }

  function exportJson() {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    downloadBlob(blob,`${slug(state.name||'tiny-world')}.json`);showToast('File dunia siap disimpan.');
  }
  function downloadBlob(blob,filename) {
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function slug(value){return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'tiny-world';}

  function importJson(file) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const incoming=JSON.parse(String(reader.result));
        if(!incoming||!Array.isArray(incoming.cells)||incoming.cells.length!==MAX_CELLS||!BIOMES[incoming.biome])throw new Error('Format dunia tidak sesuai.');
        const ids=new Set(TOOLS.map(t=>t.id));
        incoming.cells.forEach((c,i)=>{
          c.x=i%WIDTH;c.y=Math.floor(i/WIDTH);c.land=Boolean(c.land);c.terrain=c.land&&['land','sand','snow','mystic'].includes(c.terrain)?c.terrain:(c.land?BIOMES[incoming.biome].terrain:'water');
          if(!ids.has(c.object))c.object=null;
        });
        pushUndo();state={...incoming,cells:incoming.cells,seed:Number(incoming.seed)||newSeed(),id:`world-${Date.now()}`,name:String(incoming.name||'Imported World').slice(0,32),weather:['sunny','rainy','snowy','starry'].includes(incoming.weather)?incoming.weather:'sunny',time:['morning','golden','night'].includes(incoming.time)?incoming.time:'morning'};
        selectedCell=null;updateUrlSeed();renderAll();showToast('Dunia berhasil diimpor. ✨');
      }catch(error){showToast(error.message||'File JSON tidak bisa dibaca.');}
      els.import.value='';
    };
    reader.onerror=()=>showToast('File gagal dibaca.');reader.readAsText(file);
  }

  async function shareWorld() {
    const urlObject=new URL(window.location.href);
    urlObject.searchParams.delete('seed'); urlObject.searchParams.delete('biome');
    urlObject.searchParams.set('world',encodeUtf8Base64(JSON.stringify(state)));
    const url=urlObject.toString();
    try { await navigator.clipboard.writeText(url); showToast('Seed dunia disalin. Kirim link ini ke teman! ↗'); }
    catch { const input=document.createElement('textarea');input.value=url;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';document.body.append(input);input.select();const ok=document.execCommand('copy');input.remove();showToast(ok?'Seed dunia disalin. Kirim link ini ke teman!':'Salin URL dari address bar untuk membagikan seed ini.'); }
  }

  function exportPng() {
    const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=700;
    const ctx=canvas.getContext('2d');if(!ctx){showToast('Export PNG tidak didukung browser ini.');return;}
    const sky={sunny:['#dcefe5','#bde2cf'],rainy:['#bfD8dc','#9fc9c8'],snowy:['#e7f0f2','#c8e1e6'],starry:['#334c65','#7aa39a']}[state.weather]||['#dcefe5','#bde2cf'];
    const grad=ctx.createLinearGradient(0,0,0,700);grad.addColorStop(0,sky[0]);grad.addColorStop(1,sky[1]);ctx.fillStyle=grad;ctx.fillRect(0,0,1200,700);
    ctx.fillStyle='#f8d977';ctx.beginPath();ctx.arc(1030,100,44,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3a765a';ctx.font='bold 22px sans-serif';ctx.fillText('TINY WORLDS',55,58);ctx.font='15px sans-serif';ctx.fillText(`${state.name} · TW-${String(state.seed).padStart(6,'0')}`,55,86);
    const size=66,gap=7,startX=(1200-(WIDTH*size+(WIDTH-1)*gap))/2,startY=155;
    state.cells.forEach(c=>{const x=startX+c.x*(size+gap),y=startY+c.y*(size+gap);const color={water:'#80cbd0',land:'#a8d890',sand:'#ecd69b',snow:'#e5f0e9',mystic:'#a7d4b7'}[c.land?c.terrain:'water'];roundRect(ctx,x,y,size,size,13,color);ctx.fillStyle='#ffffff32';roundRect(ctx,x+4,y+4,size-8,8,5,'#ffffff28');const item=c.object&&TOOLS.find(t=>t.id===c.object);if(item){ctx.font='38px "Apple Color Emoji","Segoe UI Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#253b2f';ctx.fillText(item.emoji,x+size/2,y+size/2+1);}});
    ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='14px sans-serif';ctx.fillStyle='#39765c';ctx.fillText(`${state.cells.filter(c=>c.object).length} little things · ${getFoundDiscoveries().length} discoveries`,55,650);ctx.fillStyle='#ffffffba';ctx.font='12px sans-serif';ctx.fillText('made in tiny worlds',55,675);
    canvas.toBlob(blob=>{if(blob){downloadBlob(blob,`${slug(state.name)}.png`);showToast('Snapshot dunia siap disimpan.');}else showToast('Gagal membuat PNG pada browser ini.');},'image/png');
  }
  function roundRect(ctx,x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();ctx.fill();}

  function renameWorld() { els.worldName.value=state.name||''; if(typeof els.renameDialog.showModal==='function')els.renameDialog.showModal();else{const name=prompt('Nama dunia:',state.name);if(name)applyRename(name);} }
  function applyRename(name) { const trimmed=String(name).trim().slice(0,32);if(!trimmed){showToast('Nama dunia tidak boleh kosong.');return;}pushUndo();state.name=trimmed;renderHeader();saveCurrent();showToast('Nama dunia diperbarui.'); }

  function surpriseMe() {
    const candidates=state.cells.filter(c=>c.land && !c.object);
    if(!candidates.length){showToast('Pulau sudah penuh! Hapus satu benda untuk ruang kejutan.');return;}
    pushUndo();const rng=makeRng(Date.now());
    const count=Math.min(3,candidates.length);
    const pickTools=['flower','mushroom','lantern','crystal','fairy','tree','rock','star'];
    for(let i=0;i<count;i++){
      const idx=Math.floor(rng()*candidates.length);const cell=candidates.splice(idx,1)[0];cell.object=pickTools[Math.floor(rng()*pickTools.length)];
    }
    renderAll();showToast('Sedikit keajaiban ditambahkan ke duniamu. ✨');
  }

  // Interactions
  els.newWorld.addEventListener('click',makeNewWorld);
  els.biome.addEventListener('change',e=>setBiome(e.target.value));
  els.copySeed.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(String(state.seed));showToast('World seed disalin!');}catch{showToast(`World seed: ${state.seed}`);}});
  els.rename.addEventListener('click',renameWorld);
  els.renameForm.addEventListener('submit',e=>{if(e.submitter&&e.submitter.value==='cancel')return;e.preventDefault();const name=els.worldName.value;if(name.trim()){applyRename(name);els.renameDialog.close();}});
  els.reset.addEventListener('click',()=>{if(!confirm('Hapus semua benda dan mulai ulang dengan pulau serta seed yang sama?'))return;pushUndo();const seed=state.seed,biome=state.biome;state=createWorld(seed,biome);renderAll();showToast('Duniamu kembali kosong.');});
  els.weather.addEventListener('click',e=>{const btn=e.target.closest('[data-weather]');if(!btn)return;pushUndo();state.weather=btn.dataset.weather;renderAll();});
  els.time.addEventListener('click',e=>{const btn=e.target.closest('[data-time]');if(!btn)return;pushUndo();state.time=btn.dataset.time;renderAll();});
  els.toolTabs.addEventListener('click',e=>{const btn=e.target.closest('[data-category]');if(!btn)return;selectedCategory=btn.dataset.category;$$('.tool-tab',els.toolTabs).forEach(b=>{const active=b===btn;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active));});renderPalette();});
  els.erase.addEventListener('click',()=>{eraseMode=!eraseMode;els.erase.classList.toggle('active',eraseMode);renderPalette();renderSelectedTool();updateTip();});
  els.undo.addEventListener('click',()=>{if(!undoStack.length)return;state=undoStack.pop();selectedCell=null;renderAll();showToast('Satu langkah dibatalkan.');});
  els.save.addEventListener('click',saveWorld);els.load.addEventListener('click',loadWorld);els.share.addEventListener('click',shareWorld);els.export.addEventListener('click',exportJson);els.import.addEventListener('change',e=>importJson(e.target.files&&e.target.files[0]));
  els.surprise.addEventListener('click',surpriseMe);
  els.exportPng.addEventListener('click',exportPng);

  state=restoreCurrent();
  // A shared world link takes priority over a locally saved world.
  const sharedWorld=decodeSharedWorldFromUrl();
  const shareParams=decodeSeedFromUrl();
  if(sharedWorld)state=sharedWorld;
  else if(shareParams.seed)state=createWorld(shareParams.seed,shareParams.biome||'meadow');
  // Normalize old, local, or shared worlds before rendering.
  state.cells=state.cells.map((c,i)=>({x:i%WIDTH,y:Math.floor(i/WIDTH),land:Boolean(c.land),terrain:Boolean(c.land)&&['land','sand','snow','mystic'].includes(c.terrain)?c.terrain:(c.land?BIOMES[state.biome].terrain:'water'),object:TOOLS.some(t=>t.id===c.object)?c.object:null}));
  if(!BIOMES[state.biome])state.biome='meadow';
  if(!['sunny','rainy','snowy','starry'].includes(state.weather))state.weather='sunny';
  if(!['morning','golden','night'].includes(state.time))state.time='morning';
  renderAll();
})();
