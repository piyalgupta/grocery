/* Grocery Planner — vanilla JS, localStorage is the "repo" of lists */
(() => {
  const LS = { catalog:'gp_catalog', lists:'gp_lists', current:'gp_current' };
  const UNITS = ['kg','g','L','ml','dozen','pcs','packet','bottle','can','bunch','loaf'];
  const CATS = ['Vegetables','Fruits','Dairy','Grains & Pulses','Spices & Oil','Snacks','Beverages','Household','Personal Care','Other'];

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

  /* ---------- populate selects ---------- */
  function fillSelect(el, opts, val){ el.innerHTML = opts.map(o=>`<option ${o===val?'selected':''}>${o}</option>`).join(''); }
  fillSelect($('#itemUnit'), UNITS, 'kg');
  fillSelect($('#itemCat'), CATS, 'Vegetables');

  function refreshDatalist(){
    $('#catalogList').innerHTML = Object.keys(catalog).sort().map(n=>`<option value="${n}">`).join('');
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
      const el=document.createElement('div');
      el.className='row'+(it.bought?' bought':'');
      el.innerHTML=`
        <div class="r-chk"><input class="chk" type="checkbox" ${it.bought?'checked':''} data-act="buy"></div>
        <div class="r-name">${it.name}<div class="r-sub">${it.category}</div></div>
        <div class="r-edit-wrap"><input class="r-edit" type="number" min="0" step="0.25" value="${it.qty}" data-act="qty"></div>
        <div class="r-edit-wrap"><span class="r-sub">${it.unit}</span></div>
        <div class="r-edit-wrap"><input class="r-edit" type="number" min="0" step="0.5" value="${it.price}" data-act="price"></div>
        <div class="r-sub-wrap r-sub">${it.qty} ${it.unit} × ${money(it.price)}</div>
        <div class="r-total">${money(line)}</div>
        <div class="r-actions"><button class="icon-btn del" data-act="del">🗑</button></div>`;
      el.querySelectorAll('[data-act]').forEach(node => node.addEventListener('change', ev=>edit(it.id, ev)));
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
  function delList(name){ if(confirm('Delete “'+name+'”?')){ delete lists[name]; write(LS.lists,lists); renderSaved(); renderDash(); } }

  $('#btnNew').addEventListener('click', ()=>{ cur=newList(); persist(); renderList(); show('list'); toast('New blank list'); });

  function renderSaved(){
    const box=$('#savedRows'); const keys=Object.keys(lists);
    $('#emptySaved').style.display = keys.length?'none':'block';
    box.innerHTML='';
    keys.sort((a,b)=>(lists[b].savedAt||'').localeCompare(lists[a].savedAt||'')).forEach(name=>{
      const l=lists[name]; const tot=l.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
      const el=document.createElement('div'); el.className='saved-row';
      el.innerHTML=`<div><strong>${name}</strong><div class="meta">${l.month} • ${l.items.length} items • ${money(tot)}${l.store?' • '+l.store:''}</div></div>
        <div class="r-actions">
          <button class="btn ghost" data-a="load">Load</button>
          <button class="btn danger" data-a="del">Delete</button>
        </div>`;
      el.querySelector('[data-a="load"]').addEventListener('click',()=>loadList(name));
      el.querySelector('[data-a="del"]').addEventListener('click',()=>delList(name));
      box.appendChild(el);
    });
  }

  /* ---------- dashboard ---------- */
  let charts={};
  function renderDash(){
    const all=Object.values(lists);
    const curTot=cur.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
    $('#kpiSpend').textContent=money(curTot);
    $('#kpiItems').textContent=cur.items.length;
    $('#kpiAvg').textContent=money(cur.items.length?curTot/cur.items.length:0);
    $('#kpiMonths').textContent=new Set(all.map(l=>l.month)).size;

    // aggregate across saved lists
    const byCat={}, byMonth={}, byItem={};
    all.forEach(l=>{ l.items.forEach(i=>{
      const v=(i.qty||0)*(i.price||0);
      byCat[i.category]=(byCat[i.category]||0)+v;
      byMonth[l.month]=(byMonth[l.month]||0)+v;
      const k=i.name; (byItem[k]=byItem[k]||{qty:0,val:0,unit:i.unit,months:new Set()}); byItem[k].qty+=i.qty||0; byItem[k].val+=v; byItem[k].months.add(l.month);
    });});

    drawDoughnut('catChart', Object.keys(byCat), Object.values(byCat));
    const months=Object.keys(byMonth).sort();
    drawLine('trendChart', months, months.map(m=>byMonth[m]));
    const top=Object.entries(byItem).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);
    drawBar('topChart', top.map(t=>t[0]), top.map(t=>Math.round(t[1].qty*100)/100));

    renderSuggestions(all, byItem, byMonth, months);
  }

  function renderSuggestions(all, byItem, byMonth, months){
    const ul=$('#suggestions'); const out=[];
    if(all.length===0){ ul.innerHTML='<li class="good">Save a few monthly lists to unlock consumption insights and savings tips. 📈</li>'; return; }

    // 1) frequently repeated items -> bulk buy (cap to top 2 by spend)
    Object.entries(byItem).filter(([,d])=>d.months.size>=3).sort((a,b)=>b[1].val-a[1].val).slice(0,2)
      .forEach(([name,d])=> out.push(`🔁 <b>${name}</b> bought in ${d.months.size} months — consider buying in bulk to cut cost.`));
    // 2) month-over-month spend change
    if(months.length>=2){
      const a=byMonth[months[months.length-2]], b=byMonth[months[months.length-1]];
      const diff=b-a, pct=a?Math.round(diff/a*100):0;
      if(diff>0) out.push(`📈 Spend rose ${pct}% (${money(diff)}) vs previous month — review high-cost categories.`);
      else if(diff<0) out.push(`✅||Nice! Spend dropped ${Math.abs(pct)}% (${money(-diff)}) vs last month — keep it up.`);
    }
    // 3) biggest spend item
    const topVal=Object.entries(byItem).sort((a,b)=>b[1].val-a[1].val)[0];
    if(topVal) out.push(`💰 <b>${topVal[0]}</b> is your biggest spend (${money(topVal[1].val)} total) — compare brands or stores.`);
    // 4) rarely used
    const rare=Object.entries(byItem).filter(([,d])=>d.months.size===1 && all.length>=2);
    if(rare.length) out.push(`🧹 ${rare.slice(0,3).map(r=>r[0]).join(', ')} bought only once — drop if unused to avoid waste.`);

    ul.innerHTML = out.slice(0,6).map(t=>{
      const good=t.startsWith('✅||'); return `<li class="${good?'good':''}">${t.replace('✅||','✅ ')}</li>`;
    }).join('') || '<li class="good">Looking efficient — no issues spotted this month. 🎉</li>';
  }

  function baseOpts(){ return {responsive:true, plugins:{legend:{labels:{boxWidth:12,font:{size:11}}}}}; }
  const PALETTE=['#2e7d32','#66bb6a','#f59e0b','#ef6c00','#26a69a','#5c6bc0','#ec407a','#8d6e63','#42a5f5','#ab47bc'];
  function kill(id){ if(charts[id]) charts[id].destroy(); }
  function drawDoughnut(id,labels,data){ kill(id); charts[id]=new Chart($('#'+id),{type:'doughnut',data:{labels,datasets:[{data,backgroundColor:PALETTE}]},options:baseOpts()}); }
  function drawLine(id,labels,data){ kill(id); charts[id]=new Chart($('#'+id),{type:'line',data:{labels,datasets:[{data,label:'Spend',borderColor:'#2e7d32',backgroundColor:'rgba(46,125,50,.15)',fill:true,tension:.3}]},options:{...baseOpts(),plugins:{legend:{display:false}}}}); }
  function drawBar(id,labels,data){ kill(id); charts[id]=new Chart($('#'+id),{type:'bar',data:{labels,datasets:[{data,label:'Qty',backgroundColor:'#66bb6a'}]},options:{...baseOpts(),plugins:{legend:{display:false}},indexAxis:'y'}}); }

  /* ---------- PDF ---------- */
  $('#btnPdf').addEventListener('click', ()=>{
    if(!cur.items.length){ toast('Add items first'); return; }
    const { jsPDF }=window.jspdf; const doc=new jsPDF();
    const total=cur.items.reduce((s,i)=>s+(i.qty||0)*(i.price||0),0);
    doc.setFontSize(18); doc.setTextColor(46,125,50); doc.text('Grocery Order', 14, 18);
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text('List: '+cur.name, 14, 26);
    doc.text('Month: '+cur.month, 14, 31);
    if(cur.store) doc.text('Store: '+cur.store, 14, 36);
    doc.autoTable({
      startY: cur.store?42:37,
      head:[['#','Item','Qty','Unit','Price/Unit','Amount']],
      body: cur.items.map((i,n)=>[n+1,i.name,i.qty,i.unit,money(i.price),money((i.qty||0)*(i.price||0))]),
      foot:[[{content:'Estimated Total',colSpan:5,styles:{halign:'right'}}, money(total)]],
      theme:'striped', headStyles:{fillColor:[46,125,50]}, footStyles:{fillColor:[232,245,233],textColor:[27,94,32],fontStyle:'bold'},
      styles:{fontSize:9}
    });
    doc.save((cur.name||'grocery').replace(/\s+/g,'_')+'.pdf');
    toast('PDF downloaded');
  });

  /* ---------- tabs ---------- */
  function show(view){
    document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.view===view));
    document.querySelectorAll('.view').forEach(v=>v.classList.toggle('active',v.id==='view-'+view));
    if(view==='dashboard') renderDash();
    if(view==='saved') renderSaved();
  }
  document.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>show(t.dataset.view)));

  /* ---------- init ---------- */
  refreshDatalist(); renderList();
})();
