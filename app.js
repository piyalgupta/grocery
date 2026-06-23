/* Grocery Planner — vanilla JS, localStorage is the "repo" of lists */
(() => {
  const LS = { catalog:'gp_catalog', lists:'gp_lists', current:'gp_current' };
  const UNITS = ['kg','g','L','ml','dozen','pcs','packet','bottle','can','bunch','loaf'];
  const CATS = ['Vegetables','Fruits','Dairy','Grains & Pulses','Spices & Oil','Snacks','Beverages','Household','Personal Care','Other'];

  // Category -> [icon name, accent colour]
  const CATMETA = {
    'Vegetables':['leaf','#3fae5a'], 'Fruits':['apple','#e8553b'], 'Dairy':['milk','#3a9ec4'],
    'Grains & Pulses':['sprout','#d6a32a'], 'Spices & Oil':['flame','#d9582f'], 'Snacks':['cookie','#c0823e'],
    'Beverages':['coffee','#8a6d4f'], 'Household':['home','#9b5bd6'], 'Personal Care':['droplet','#e36aa0'],
    'Other':['bag','#8a93a0']
  };

  // Lucide-style icon path data
  const ICONS = {
    basket:'<path d="m5 11 4-7"/><path d="m19 11-4-7"/><path d="M2 11h20"/><path d="m3.8 11 1.7 7.4a2 2 0 0 0 2 1.6h9a2 2 0 0 0 2-1.6l1.7-7.4"/><path d="m9 11 1 9"/><path d="m15 11-1 9"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    list:'<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
    chart:'<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12" y="6" width="3" height="11" rx="1"/><rect x="17" y="13" width="3" height="4" rx="1"/>',
    bookmark:'<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
    save:'<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    copy:'<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
    plus:'<path d="M5 12h14"/><path d="M12 5v14"/>',
    x:'<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    trash:'<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    folder:'<path d="M6 14l1.5-2.9A2 2 0 0 1 9.24 10H21a1 1 0 0 1 .96 1.27l-1.42 5A2 2 0 0 1 18.62 18H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v1"/>',
    cart:'<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    leaf:'<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/>',
    apple:'<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06z"/><path d="M10 2c1 .5 2 2 2 5"/>',
    milk:'<path d="M8 2h8"/><path d="M9 2v2.79a4 4 0 0 1-.67 2.22l-.66.98A4 4 0 0 0 7 10.21V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.79a4 4 0 0 0-.67-2.22l-.66-.98A4 4 0 0 1 15 4.79V2"/><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0"/>',
    sprout:'<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    flame:'<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
    cookie:'<path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/><path d="M8.5 8.5v.01"/><path d="M16 15.5v.01"/><path d="M12 12v.01"/><path d="M11 17v.01"/><path d="M7 14v.01"/>',
    coffee:'<path d="M10 2v2"/><path d="M14 2v2"/><path d="M6 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>',
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-6h6v6"/>',
    droplet:'<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C4 11.1 3 13 3 15a7 7 0 0 0 7 7z"/>',
    bag:'<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
    repeat:'<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    trendingUp:'<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>',
    check:'<path d="M21.8 10A10 10 0 1 1 12 2c2.5 0 4.8.9 6.6 2.4"/><path d="m9 11 3 3L22 4"/>',
    wallet:'<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h16a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V5"/><path d="M3 5v14a2 2 0 0 0 2 2h16a1 1 0 0 0 1-1v-4"/><path d="M18 12a.5.5 0 0 0 0 1h.01"/>',
    sparkles:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>'
  };
  function icon(name, size, color){
    return `<svg width="${size||22}" height="${size||22}" viewBox="0 0 24 24" fill="none" stroke="${color||'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex:none;display:block">${ICONS[name]||''}</svg>`;
  }
  const catMeta = c => CATMETA[c] || ['bag','#8a93a0'];

  // Seed catalog: name -> {unit, category, lastPrice}
  const SEED = {
    'Rice':['kg','Grains & Pulses',60],'Wheat Flour':['kg','Grains & Pulses',45],'Toor Dal':['kg','Grains & Pulses',140],
    'Sugar':['kg','Grains & Pulses',45],'Salt':['kg','Spices & Oil',25],'Cooking Oil':['L','Spices & Oil',150],
    'Milk':['L','Dairy',60],'Curd':['kg','Dairy',70],'Paneer':['g','Dairy',90],'Butter':['g','Dairy',55],'Eggs':['dozen','Dairy',75],
    'Onion':['kg','Vegetables',35],'Potato':['kg','Vegetables',30],'Tomato':['kg','Vegetables',40],'Garlic':['g','Vegetables',30],
    'Ginger':['g','Vegetables',25],'Spinach':['bunch','Vegetables',20],'Banana':['dozen','Fruits',50],'Apple':['kg','Fruits',180],
    'Tea':['g','Beverages',60],'Coffee':['g','Beverages',120],'Bread':['loaf','Snacks',40],'Biscuits':['packet','Snacks',30],
    'Turmeric':['g','Spices & Oil',20],'Chilli Powder':['g','Spices & Oil',25],'Detergent':['kg','Household',120],
    'Dish Soap':['bottle','Household',95],'Toothpaste':['pcs','Personal Care',55],'Soap':['pcs','Personal Care',35],
    'Shampoo':['bottle','Personal Care',180]
  };

  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const read = (k,d) => { try{ return JSON.parse(localStorage.getItem(k)) ?? d }catch{ return d } };
  const write = (k,v) => localStorage.setItem(k, JSON.stringify(v));
  const money = n => '₹' + (Math.round((+n||0)*100)/100).toLocaleString('en-IN');
  const uid = () => Math.random().toString(36).slice(2,9);
  const ucFirst = s => s.replace(/\b\w/g, c => c.toUpperCase());

  let catalog = read(LS.catalog, null);
  if(!catalog){ catalog={}; for(const [n,[u,c,p]] of Object.entries(SEED)) catalog[n]={unit:u,category:c,lastPrice:p}; write(LS.catalog,catalog); }
  let lists = read(LS.lists, {});
  let cur = read(LS.current, null) || newList();

  function newList(){ const d=new Date(); return { name:'Untitled', month:d.toISOString().slice(0,7), store:'', items:[] }; }
  function persist(){ write(LS.current, cur); }
  function toast(m){ const t=$('#toast'); t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2200); }

  /* ---------- static icons ---------- */
  function initIcons(){
    $('#logo').innerHTML   = icon('basket',24);
    $('#calIc').innerHTML  = icon('calendar',18);
    $('#tabList').innerHTML  = icon('list',22);
    $('#tabDash').innerHTML  = icon('chart',22);
    $('#tabSaved').innerHTML = icon('bookmark',22);
    $('#btnSave').innerHTML   = icon('save',20);
    $('#btnSaveAs').innerHTML = icon('copy',20);
    $('#btnPdf').innerHTML    = icon('download',20);
    $('#btnAdd').innerHTML    = icon('plus',20);
    $('#btnNew').innerHTML    = icon('plus',20);
    $('#cartIc').innerHTML    = icon('cart',18,'#3f7a58');
  }

  /* ---------- populate selects ---------- */
  function fillSelect(el, opts, val){ el.innerHTML = opts.map(o=>`<option ${o===val?'selected':''}>${esc(o)}</option>`).join(''); }
  function refreshDatalist(){
    $('#catalogList').innerHTML = Object.keys(catalog).sort().map(n=>`<option value="${esc(n)}">`).join('');
  }

  /* ---------- add form: auto unit/price/category from catalog ---------- */
  $('#itemName').addEventListener('input', e => {
    const c = catalog[e.target.value.trim()] || catalog[ucFirst(e.target.value.trim())];
    if(c){ $('#itemUnit').value=c.unit; $('#itemCat').value=c.category; if(c.lastPrice!=null) $('#itemPrice').value=c.lastPrice; }
  });

  $('#btnAdd').addEventListener('click', () => {
    const name = ucFirst($('#itemName').value.trim());
    if(!name){ toast('Enter an item name'); return; }
    const unit=$('#itemUnit').value, category=$('#itemCat').value;
    const qty=+$('#itemQty').value||0, price=+$('#itemPrice').value||0;
    cur.items.push({ id:uid(), name, qty, unit, price, category, bought:false });
    // catalog learns the item + carries last price + unit
    catalog[name] = { unit, category, lastPrice: price || catalog[name]?.lastPrice || 0 };
    write(LS.catalog, catalog); refreshDatalist();
    $('#itemName').value=''; $('#itemQty').value='1'; $('#itemPrice').value='';
    persist(); renderList(); toast(name+' added');
    $('#itemName').focus();
  });

  /* ---------- render list ---------- */
  function renderList(){
    $('#curListName').textContent = cur.name;
    $('#storeInput').value = cur.store || '';
    $('#monthInput').value = cur.month;
    const box=$('#itemRows'); box.innerHTML='';
    $('#emptyList').style.display = cur.items.length ? 'none' : 'block';
    let total=0;
    cur.items.forEach(it => {
      const line=(it.qty||0)*(it.price||0); total+=line;
      const [iconName,color]=catMeta(it.category);
      const el=document.createElement('div');
      el.className='row'+(it.bought?' bought':'');
      el.innerHTML=`
        <input class="chk" type="checkbox" ${it.bought?'checked':''} data-act="buy" aria-label="Bought">
        <div class="dot" style="background:${color}22;color:${color};border:1px solid ${color}40">${icon(iconName,20)}</div>
        <div class="r-main">
          <div class="r-name">${esc(it.name)}</div>
          <div class="r-cat">${esc(it.category)}</div>
        </div>
        <div class="r-edit-wrap">
          <input class="r-qty" type="number" min="0" step="0.25" value="${it.qty}" data-act="qty" aria-label="Quantity">
          <span class="r-unit">${esc(it.unit)}</span>
          <input class="r-price" type="number" min="0" step="0.5" value="${it.price}" data-act="price" aria-label="Price per unit">
          <span class="r-line">${money(line)}</span>
          <button class="r-del" data-act="del" title="Remove" aria-label="Remove">${icon('x',17)}</button>
        </div>`;
      el.querySelector('[data-act="buy"]').addEventListener('change', ev=>edit(it.id, ev));
      el.querySelector('[data-act="qty"]').addEventListener('change', ev=>edit(it.id, ev));
      el.querySelector('[data-act="price"]').addEventListener('change', ev=>edit(it.id, ev));
      el.querySelector('[data-act="del"]').addEventListener('click', ()=>{ cur.items=cur.items.filter(x=>x.id!==it.id); persist(); renderList(); });
      box.appendChild(el);
    });
    $('#itemCount').textContent = cur.items.length;
    $('#grandTotal').textContent = money(total);
  }
  function edit(id, ev){
    const it=cur.items.find(x=>x.id===id); if(!it) return;
    const act=ev.target.dataset.act;
    if(act==='qty') it.qty=+ev.target.value||0;
    if(act==='price'){ it.price=+ev.target.value||0; catalog[it.name]={unit:it.unit,category:it.category,lastPrice:it.price}; write(LS.catalog,catalog); }
    if(act==='buy') it.bought=ev.target.checked;
    persist(); renderList();
  }

  $('#monthInput').addEventListener('change', e=>{ cur.month=e.target.value; persist(); });
  $('#storeInput').addEventListener('input', e=>{ cur.store=e.target.value; persist(); });

  /* ---------- save / load ---------- */
  $('#btnSave').addEventListener('click', ()=>{
    if(cur.name==='Untitled'){ return saveAs(); }
    doSave(cur.name);
  });
  $('#btnSaveAs').addEventListener('click', saveAs);
  function saveAs(){
    const n=prompt('Save list as:', cur.name==='Untitled'? cur.month+' Groceries' : cur.name+' copy');
    if(n && n.trim()) doSave(n.trim());
  }
  function doSave(name){
    cur.name=name;
    lists[name]={ ...structuredClone(cur), savedAt:new Date().toISOString() };
    write(LS.lists, lists); persist(); renderList(); renderSaved(); toast('Saved “'+name+'”');
  }
  function loadList(name){ cur=structuredClone(lists[name]); delete cur.savedAt; persist(); renderList(); show('list'); toast('Loaded “'+name+'”'); }
  function delList(name){ if(confirm('Delete “'+name+'”?')){ delete lists[name]; write(LS.lists,lists); renderSaved(); } }

  $('#btnNew').addEventListener('click', ()=>{ cur=newList(); persist(); renderList(); show('list'); toast('New blank list'); });

  function renderSaved(){
    const box=$('#savedRows'); const keys=Object.keys(lists);
    $('#emptySaved').style.display = keys.length?'none':'block';
    box.innerHTML='';
    keys.sort((a,b)=>(lists[b].savedAt||'').localeCompare(lists[a].savedAt||'')).forEach(name=>{
      const l=lists[name]; const tot=l.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
      const meta=`${l.month} · ${l.items.length} items · ${money(tot)}${l.store?' · '+esc(l.store):''}`;
      const el=document.createElement('div'); el.className='saved-row';
      el.innerHTML=`
        <div>
          <strong>${esc(name)}</strong>
          <div class="meta">${meta}</div>
        </div>
        <div class="saved-actions">
          <button class="btn-icon glass" data-a="load" title="Load list" aria-label="Load">${icon('folder',20)}</button>
          <button class="btn-icon danger" data-a="del" title="Delete list" aria-label="Delete">${icon('trash',20)}</button>
        </div>`;
      el.querySelector('[data-a="load"]').addEventListener('click',()=>loadList(name));
      el.querySelector('[data-a="del"]').addEventListener('click',()=>delList(name));
      box.appendChild(el);
    });
  }

  /* ---------- dashboard ---------- */
  let charts={};
  function dashData(){
    const all=Object.values(lists);
    const byCat={}, byMonth={}, byItem={};
    all.forEach(l=>{ l.items.forEach(i=>{
      const v=(i.qty||0)*(i.price||0);
      byCat[i.category]=(byCat[i.category]||0)+v;
      byMonth[l.month]=(byMonth[l.month]||0)+v;
      const k=i.name; (byItem[k]=byItem[k]||{qty:0,val:0,unit:i.unit,months:new Set()}); byItem[k].qty+=i.qty||0; byItem[k].val+=v; byItem[k].months.add(l.month);
    });});
    return { all, byCat, byMonth, byItem, months:Object.keys(byMonth).sort() };
  }
  function renderDash(){
    const { all, byCat, byMonth, byItem, months } = dashData();
    const curTot=cur.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
    $('#kpiSpend').textContent=money(curTot);
    $('#kpiItems').textContent=cur.items.length;
    $('#kpiAvg').textContent=money(cur.items.length?curTot/cur.items.length:0);
    $('#kpiMonths').textContent=new Set(all.map(l=>l.month)).size;
    renderSuggestions(all, byItem, byMonth, months);
    draw(byCat, byMonth, byItem, months);
  }

  function renderSuggestions(all, byItem, byMonth, months){
    const box=$('#suggestions'); const out=[];
    if(all.length===0){
      out.push({icon:'trendingUp',good:true,text:'Save a few monthly lists to unlock consumption insights and savings tips.'});
    } else {
      // frequently repeated items -> bulk buy (top 2 by spend)
      Object.entries(byItem).filter(([,d])=>d.months.size>=3).sort((a,b)=>b[1].val-a[1].val).slice(0,2)
        .forEach(([n,d])=>out.push({icon:'repeat',good:false,text:`${n} bought in ${d.months.size} months — consider buying in bulk to cut cost.`}));
      // month-over-month spend change
      if(months.length>=2){
        const a=byMonth[months[months.length-2]], b=byMonth[months[months.length-1]];
        const diff=b-a, pct=a?Math.round(diff/a*100):0;
        if(diff>0) out.push({icon:'trendingUp',good:false,text:`Spend rose ${pct}% (${money(diff)}) vs previous month — review high-cost categories.`});
        else if(diff<0) out.push({icon:'check',good:true,text:`Spend dropped ${Math.abs(pct)}% (${money(-diff)}) vs last month — keep it up.`});
      }
      // biggest spend item
      const top=Object.entries(byItem).sort((a,b)=>b[1].val-a[1].val)[0];
      if(top) out.push({icon:'wallet',good:false,text:`${top[0]} is your biggest spend (${money(top[1].val)} total) — compare brands or stores.`});
      // rarely used
      const rare=Object.entries(byItem).filter(([,d])=>d.months.size===1 && all.length>=2);
      if(rare.length) out.push({icon:'sparkles',good:false,text:`${rare.slice(0,3).map(r=>r[0]).join(', ')} bought only once — drop if unused to avoid waste.`});
    }
    box.innerHTML = out.slice(0,6).map(s=>{
      const color = s.good ? '#2f9e5b' : '#d9882f';
      return `<div class="sug ${s.good?'good':'warn'}"><span class="sug-ic">${icon(s.icon,20,color)}</span><span>${esc(s.text)}</span></div>`;
    }).join('');
  }

  const PALETTE=['#3fae5a','#e8553b','#3a9ec4','#d6a32a','#d9582f','#c0823e','#8a6d4f','#9b5bd6','#e36aa0','#8a93a0'];
  function draw(byCat, byMonth, byItem, months){
    if(!window.Chart){ return setTimeout(()=>renderDash(),200); }
    Chart.defaults.font.family="'JetBrains Mono',monospace";
    Chart.defaults.font.size=11;
    Chart.defaults.color='#8c95a3';
    const base={responsive:false, maintainAspectRatio:false, animation:false};
    const kill=id=>{ if(charts[id]) charts[id].destroy(); };
    const mk=(id,cfg)=>{
      try{
        const el=document.getElementById(id); if(!el||!el.parentElement) return;
        const r=el.parentElement.getBoundingClientRect();
        el.width=Math.max(r.width,200); el.height=Math.max(r.height,160);
        kill(id); charts[id]=new Chart(el,cfg);
      }catch(e){}
    };
    if(!draw._rz){ draw._rz=()=>{ clearTimeout(draw._rzt); draw._rzt=setTimeout(()=>{ if(curView==='dashboard') renderDash(); },150); }; window.addEventListener('resize',draw._rz); }

    mk('catChart',{type:'doughnut',data:{labels:Object.keys(byCat),datasets:[{data:Object.values(byCat),backgroundColor:PALETTE,borderWidth:2,borderColor:'rgba(255,255,255,.7)'}]},
      options:{...base,cutout:'62%',plugins:{legend:{position:'bottom',labels:{boxWidth:10,padding:10}}}}});
    mk('trendChart',{type:'line',data:{labels:months,datasets:[{data:months.map(m=>byMonth[m]),borderColor:'#2f9e5b',backgroundColor:'rgba(47,158,91,.14)',fill:true,tension:.35,pointBackgroundColor:'#2f9e5b',borderWidth:2}]},
      options:{...base,plugins:{legend:{display:false}}}});
    const top=Object.entries(byItem).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);
    mk('topChart',{type:'bar',data:{labels:top.map(t=>t[0]),datasets:[{data:top.map(t=>Math.round(t[1].qty*100)/100),backgroundColor:'#3fae5a',borderRadius:6}]},
      options:{...base,indexAxis:'y',plugins:{legend:{display:false}}}});
  }

  /* ---------- PDF ---------- */
  $('#btnPdf').addEventListener('click', ()=>{
    if(!cur.items.length){ toast('Add items first'); return; }
    const { jsPDF }=window.jspdf; const doc=new jsPDF();
    const total=cur.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
    doc.setFontSize(18); doc.setTextColor(47,158,91); doc.text('Grocery Order', 14, 18);
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text('List: '+cur.name, 14, 26);
    doc.text('Month: '+cur.month, 14, 31);
    if(cur.store) doc.text('Store: '+cur.store, 14, 36);
    doc.autoTable({
      startY: cur.store?42:37,
      head:[['#','Item','Qty','Unit','Price/Unit','Amount']],
      body: cur.items.map((i,n)=>[n+1,i.name,i.qty,i.unit,money(i.price),money((i.qty||0)*(i.price||0))]),
      foot:[[{content:'Estimated Total',colSpan:5,styles:{halign:'right'}}, money(total)]],
      theme:'striped', headStyles:{fillColor:[47,158,91]}, footStyles:{fillColor:[234,246,236],textColor:[31,122,68],fontStyle:'bold'},
      styles:{fontSize:9}
    });
    doc.save((cur.name||'grocery').replace(/\s+/g,'_')+'.pdf');
    toast('PDF downloaded');
  });

  /* ---------- tabs ---------- */
  let curView='list';
  function show(view){
    curView=view;
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
    if(view==='dashboard') setTimeout(renderDash,60);
    if(view==='saved') renderSaved();
  }
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>show(t.dataset.view)));

  /* ---------- init ---------- */
  initIcons();
  fillSelect($('#itemUnit'), UNITS, 'kg');
  fillSelect($('#itemCat'), CATS, 'Vegetables');
  refreshDatalist();
  renderList();
})();
