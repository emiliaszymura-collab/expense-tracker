(function () {
  "use strict";

  // ---------- helpers ----------
  var DIAC = { "ł":"l","ó":"o","ą":"a","ę":"e","ś":"s","ż":"z","ź":"z","ć":"c","ń":"n","é":"e","è":"e","ô":"o","â":"a" };
  function norm(s){ return s.toLowerCase().replace(/[łóąęśżźćńéèôâ]/g, function(m){return DIAC[m]||m;}); }
  function slug(s){ return norm(s).replace(/[^a-z0-9]+/g," ").trim(); }
  function compact(s){ return norm(s).replace(/[^a-z0-9]+/g,""); }
  function money(n){ return n.toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function esc(s){ return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function initials(b){ var p=slug(b).split(" ").filter(Boolean); return p.length===1?p[0].slice(0,2).toUpperCase():(p[0][0]+p[1][0]).toUpperCase(); }
  function volMl(v){ var m=v.replace(",",".").match(/([\d.]+)\s*ml/); return m?parseFloat(m[1]):null; }
  function starsHTML(r){
    var full=Math.round(r), out="";
    for(var i=1;i<=5;i++) out+= i<=full?"★":"☆";
    return '<span class="stars" aria-hidden="true">'+out+'</span>';
  }
  function plural(n,one,few,many){ if(n===1)return one; var t=n%10,h=n%100; if(t>=2&&t<=4&&!(h>=12&&h<=14))return few; return many; }

  var DATA = P.map(function(p,i){
    var offers = Object.keys(p.o).map(function(s){ return { store:s, price:p.o[s].p, was:p.o[s].w||null, inStock:true }; });
    if(i%9===4 && offers.length>3){ offers.slice().sort(function(a,b){return a.price-b.price;})[0].inStock=false; }
    var avail = offers.filter(function(o){return o.inStock;}).sort(function(a,b){return a.price-b.price;});
    var low=avail[0].price, high=avail[avail.length-1].price;
    offers.sort(function(a,b){ if(a.inStock!==b.inStock)return a.inStock?-1:1; return a.price-b.price; });
    return {
      id:i, brand:p.brand, name:p.name, cat:p.cat, vol:p.vol, ml:volMl(p.vol),
      pop:p.pop, rate:p.rate, votes:p.votes,
      offers:offers, low:low, high:high, lowStore:avail[0].store,
      save:+(high-low).toFixed(2), savePct:Math.round((high-low)/high*100),
      hay:slug(p.brand+" "+p.name+" "+p.kw+" "+p.cat), hayc:compact(p.brand+" "+p.name+" "+p.kw)
    };
  });

  function search(qRaw){
    var q=slug(qRaw); if(!q) return [];
    var toks=q.split(" ").filter(Boolean), qc=compact(qRaw);
    return DATA.map(function(d){
      var score=0, all=true;
      toks.forEach(function(t){
        if(d.hay.indexOf(t)>=0) score+=3+(d.hay.indexOf(t)<20?2:0);
        else if(d.hayc.indexOf(t)>=0) score+=2;
        else all=false;
      });
      if(qc.length>4 && d.hayc.indexOf(qc)>=0) score+=4;
      return {d:d, s: all?score:0};
    }).filter(function(x){return x.s>0;})
      .sort(function(a,b){return b.s-a.s || b.d.pop-a.d.pop;})
      .map(function(x){return x.d;});
  }

  // ---------- state ----------
  var favs={}, alerts={}, activeCat="Wszystkie", activeIdx=-1, curSug=[];
  var homeEl=document.getElementById("home"), pdpEl=document.getElementById("pdp");
  var qEl=document.getElementById("q"), sugEl=document.getElementById("suggest");
  var root=document.documentElement;

  // ---------- band stats ----------
  var stores={}; DATA.forEach(function(d){d.offers.forEach(function(o){stores[o.store]=1;});});
  var avgPct=Math.round(DATA.reduce(function(s,d){return s+d.savePct;},0)/DATA.length);
  document.getElementById("bandStats").innerHTML =
    '<div class="bstat"><div class="v">'+DATA.length+'</div><div class="k">produktów</div></div>'+
    '<div class="bstat"><div class="v">'+Object.keys(stores).length+'</div><div class="k">sklepów</div></div>'+
    '<div class="bstat"><div class="v">'+avgPct+'%</div><div class="k">śr. różnica cen</div></div>';

  // ---------- category nav ----------
  var catnav=document.getElementById("catnav");
  CATS.forEach(function(c){
    var b=document.createElement("button");
    b.className="catlink"+(c===activeCat?" on":""); b.type="button"; b.textContent=c;
    b.addEventListener("click", function(){
      activeCat=c;
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===c);});
      goHome(); renderGrid();
    });
    catnav.appendChild(b);
  });

  // ---------- grid ----------
  var gridEl=document.getElementById("pgrid"), sortEl=document.getElementById("sort");
  sortEl.addEventListener("change", renderGrid);

  function gridList(){
    var list=DATA.filter(function(d){return activeCat==="Wszystkie"||d.cat===activeCat;});
    var s=sortEl.value;
    list.sort(function(a,b){
      if(s==="pop")return b.pop-a.pop;
      if(s==="save")return b.save-a.save;
      if(s==="low")return a.low-b.low;
      if(s==="high")return b.low-a.low;
      return b.rate-a.rate;
    });
    return list;
  }

  function cardHTML(d){
    var g=GRAD[d.cat];
    return '<div class="pcard" role="button" tabindex="0" data-id="'+d.id+'">'+
      (d.savePct>=15?'<span class="badge">−'+d.savePct+'%</span>':'')+
      '<button class="fav'+(favs[d.id]?" on":"")+'" data-fav="'+d.id+'" type="button" aria-label="Dodaj do ulubionych">'+
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="'+(favs[d.id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg></button>'+
      '<div class="pimg" style="background:linear-gradient(150deg,'+g[0]+','+g[1]+')">'+initials(d.brand)+'</div>'+
      '<div class="pbrand">'+esc(d.brand)+'</div>'+
      '<div class="pname">'+esc(d.name)+'</div>'+
      '<div class="prating">'+starsHTML(d.rate)+' '+d.rate.toFixed(1)+' ('+d.votes.toLocaleString("pl-PL")+')</div>'+
      '<div class="pfoot"><div class="pfrom">od</div>'+
      '<div class="pprice"><span class="now">'+money(d.low)+' zł</span>'+
      (d.save>0?'<span class="high">'+money(d.high)+' zł</span>':'')+'</div>'+
      '<div class="pstores">w <b>'+d.offers.length+'</b> '+plural(d.offers.length,"sklepie","sklepach","sklepach")+
      (d.save>0?' · taniej o <b>'+money(d.save)+' zł</b>':'')+'</div></div></div>';
  }

  function renderGrid(){
    var list=gridList();
    document.getElementById("gridTitle").childNodes[0].nodeValue = activeCat==="Wszystkie"?"Bestsellery":activeCat;
    document.getElementById("gridRes").textContent=" · "+list.length+" "+plural(list.length,"produkt","produkty","produktów");
    gridEl.innerHTML = list.length ? list.map(cardHTML).join("")
      : '<div class="empty"><div class="t">Brak produktów</div>Zmień kategorię lub wyszukaj coś innego.</div>';
  }

  function bindCardEvents(container){
    container.addEventListener("click", function(e){
      var f=e.target.closest("[data-fav]");
      if(f){ e.stopPropagation(); toggleFav(+f.getAttribute("data-fav")); return; }
      var c=e.target.closest(".pcard"); if(c) openPDP(+c.getAttribute("data-id"));
    });
    container.addEventListener("keydown", function(e){
      if(e.key!=="Enter"&&e.key!==" ") return;
      var c=e.target.closest(".pcard"); if(c){ e.preventDefault(); openPDP(+c.getAttribute("data-id")); }
    });
  }
  bindCardEvents(gridEl);
  bindCardEvents(document.getElementById("related"));

  // ---------- favourites / alerts ----------
  function count(obj){ return Object.keys(obj).filter(function(k){return obj[k];}).length; }
  function syncCounts(){
    var fc=count(favs), ac=count(alerts);
    var fEl=document.getElementById("favCnt"), aEl=document.getElementById("alertCnt");
    fEl.hidden=!fc; fEl.textContent=fc; aEl.hidden=!ac; aEl.textContent=ac;
  }
  function toggleFav(id){
    favs[id]=!favs[id]; syncCounts();
    toast(favs[id]?"Dodano do ulubionych ♥":"Usunięto z ulubionych");
    renderGrid(); if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  function toggleAlert(id){
    alerts[id]=!alerts[id]; syncCounts();
    toast(alerts[id]?"Alert cenowy ustawiony 🔔":"Alert wyłączony");
    if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  document.getElementById("favBtnTop").addEventListener("click", function(){
    var n=count(favs); toast(n?("Ulubione: "+n+" "+plural(n,"produkt","produkty","produktów")):"Nie masz jeszcze ulubionych — kliknij ♥ na produkcie");
  });
  document.getElementById("alertBtnTop").addEventListener("click", function(){
    var n=count(alerts); toast(n?("Aktywne alerty: "+n):"Nie masz alertów — ustaw je na stronie produktu");
  });

  var toastEl=document.getElementById("toast"), toastT;
  function toast(msg){
    toastEl.textContent=msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT=setTimeout(function(){toastEl.classList.remove("show");},2200);
  }

  // ---------- autocomplete ----------
  function renderSuggest(){
    var q=qEl.value.trim();
    if(q.length<2){ closeSug(); return; }
    curSug=search(q).slice(0,6); activeIdx=-1;
    if(!curSug.length){
      sugEl.innerHTML='<div class="sug-empty">Brak wyników dla „'+esc(q)+'". Spróbuj samej marki, np. „CeraVe".</div>';
      openSug(); return;
    }
    var qn=slug(q);
    sugEl.innerHTML=curSug.map(function(d,i){
      var g=GRAD[d.cat];
      return '<div class="sug-item" role="option" data-id="'+d.id+'" data-i="'+i+'">'+
        '<div class="sug-thumb" style="background:linear-gradient(150deg,'+g[0]+','+g[1]+')">'+initials(d.brand)+'</div>'+
        '<div class="sug-body"><div class="sug-name">'+hl(d.brand+" "+d.name,qn)+'</div>'+
        '<div class="sug-meta">'+d.cat+' · '+d.vol+'</div></div>'+
        '<div class="sug-price">od<b>'+money(d.low)+' zł</b></div></div>';
    }).join("");
    openSug();
  }
  function hl(text,qn){
    var out=esc(text);
    qn.split(" ").filter(function(t){return t.length>1;}).forEach(function(t){
      try{ out=out.replace(new RegExp("("+t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+")","ig"),"<b>$1</b>"); }catch(e){}
    });
    return out;
  }
  function openSug(){ sugEl.classList.add("show"); qEl.setAttribute("aria-expanded","true"); }
  function closeSug(){ sugEl.classList.remove("show"); qEl.setAttribute("aria-expanded","false"); activeIdx=-1; }

  qEl.addEventListener("input", renderSuggest);
  qEl.addEventListener("focus", function(){ if(qEl.value.trim().length>=2) renderSuggest(); });
  qEl.addEventListener("blur", function(){ setTimeout(closeSug,150); });
  qEl.addEventListener("keydown", function(e){
    if(!sugEl.classList.contains("show")||!curSug.length){ if(e.key==="Enter") doSearch(); return; }
    if(e.key==="ArrowDown"){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,curSug.length-1); paintAct(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); paintAct(); }
    else if(e.key==="Enter"){ e.preventDefault(); if(activeIdx>=0) openPDP(curSug[activeIdx].id); else doSearch(); }
    else if(e.key==="Escape"){ closeSug(); }
  });
  function paintAct(){
    Array.prototype.forEach.call(sugEl.querySelectorAll(".sug-item"),function(el){
      el.classList.toggle("active",+el.getAttribute("data-i")===activeIdx);
    });
  }
  sugEl.addEventListener("mousedown", function(e){
    var it=e.target.closest(".sug-item"); if(it){ e.preventDefault(); openPDP(+it.getAttribute("data-id")); }
  });
  function doSearch(){
    var res=search(qEl.value);
    if(res.length) openPDP(res[0].id);
    else renderSuggest();
  }
  document.getElementById("goBtn").addEventListener("click", doSearch);

  // ---------- product page ----------
  var curPdp=null;
  function openPDP(id){
    curPdp=id;
    var d=DATA[id], g=GRAD[d.cat];
    closeSug(); qEl.blur();

    document.getElementById("crumbs").innerHTML=
      '<button type="button" data-home>Strona główna</button><span class="sep">/</span>'+
      '<button type="button" data-cat="'+esc(d.cat)+'">'+esc(d.cat)+'</button><span class="sep">/</span>'+
      '<span>'+esc(d.brand)+'</span>';
    document.getElementById("pdpVis").style.background='linear-gradient(150deg,'+g[0]+','+g[1]+')';
    document.getElementById("pdpVis").textContent=initials(d.brand);
    document.getElementById("pdpBrand").textContent=d.brand;
    document.getElementById("pdpName").textContent=d.name;
    document.getElementById("pdpSub").textContent=d.cat+" · "+d.vol;
    document.getElementById("pdpRating").innerHTML=starsHTML(d.rate)+' <b>'+d.rate.toFixed(1)+'</b> · '+d.votes.toLocaleString("pl-PL")+' ocen';

    document.getElementById("bbAmt").innerHTML=money(d.low)+'<span class="cur">zł</span>';
    document.getElementById("bbAt").innerHTML='w <b>'+d.lowStore+'</b>'+(d.ml?' · '+money(d.low/d.ml*100)+' zł / 100 ml':'');
    document.getElementById("bbCta").href=(STORES[d.lowStore]||{}).url||"#";
    document.getElementById("bbSave").innerHTML=d.save>0
      ? '<span class="save-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Oszczędzasz do '+money(d.save)+' zł ('+d.savePct+'%) względem najdroższej oferty</span>' : '';

    paintPdpMini(id);

    document.getElementById("offCnt").textContent=" · "+d.offers.length+" "+plural(d.offers.length,"sklep","sklepy","sklepów");
    document.getElementById("offers").innerHTML=d.offers.map(function(o,idx){
      var st=STORES[o.store]||{c:"#999",url:"#",dl:""};
      var best=o.inStock&&o.price===d.low&&o.store===d.lowStore;
      var action=o.inStock
        ? '<a class="buy" href="'+st.url+'" target="_blank" rel="noopener noreferrer">'+(best?"Kup najtaniej":"Do sklepu")+
          ' <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></a>'
        : '<span class="oos-pill">Niedostępny</span>';
      return '<div class="offer'+(best?" best":"")+(o.inStock?"":" oos")+'">'+
        '<div class="rank">'+(idx+1)+'</div>'+
        '<div class="offer-store"><span class="store-dot" style="background:'+st.c+'"></span>'+
        '<div><div class="nm">'+o.store+(best?'<span class="bflag">najtaniej</span>':'')+'</div>'+
        '<div class="dl">'+st.dl+'</div></div></div>'+
        '<div class="offer-price"><span class="now">'+money(o.price)+' zł</span>'+
        (o.was?'<span class="was">'+money(o.was)+' zł</span>':'')+
        (d.ml?'<div class="ppu">'+money(o.price/d.ml*100)+' zł / 100 ml</div>':'')+'</div>'+
        action+'</div>';
    }).join("");

    var rel=DATA.filter(function(x){return x.cat===d.cat&&x.id!==d.id;}).sort(function(a,b){return b.pop-a.pop;}).slice(0,4);
    document.getElementById("related").innerHTML=rel.map(cardHTML).join("");

    homeEl.style.display="none"; pdpEl.style.display="block";
    window.scrollTo({top:0,behavior:"auto"});
  }

  function paintPdpMini(id){
    var d=DATA[id];
    var f=document.getElementById("pdpFav"), a=document.getElementById("pdpAlert");
    f.className="mini"+(favs[id]?" on":"");
    f.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(favs[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg> '+
      (favs[id]?"W ulubionych":"Do ulubionych");
    a.className="mini"+(alerts[id]?" on":"");
    a.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(alerts[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg> '+
      (alerts[id]?"Śledzisz cenę":"Alert cenowy");
    f.onclick=function(){toggleFav(id);};
    a.onclick=function(){toggleAlert(id);};
    document.getElementById("pdpShare").onclick=function(){ toast("Link skopiowany do schowka"); };
  }

  document.getElementById("crumbs").addEventListener("click", function(e){
    var b=e.target.closest("button"); if(!b) return;
    if(b.hasAttribute("data-home")){ goHome(); }
    else if(b.hasAttribute("data-cat")){
      activeCat=b.getAttribute("data-cat");
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===activeCat);});
      goHome(); renderGrid();
    }
  });

  function goHome(){
    pdpEl.style.display="none"; homeEl.style.display="block"; curPdp=null;
    qEl.value=""; closeSug(); window.scrollTo({top:0,behavior:"auto"});
  }
  document.getElementById("logoBtn").addEventListener("click", goHome);
  document.getElementById("logoBtn2").addEventListener("click", goHome);

  // ---------- theme ----------
  document.getElementById("themeBtn").addEventListener("click", function(){
    var cur=root.getAttribute("data-theme");
    if(!cur) cur=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
    root.setAttribute("data-theme",cur==="dark"?"light":"dark");
  });

  renderGrid();
  syncCounts();
})();
