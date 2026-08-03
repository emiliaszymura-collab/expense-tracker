(function () {
  "use strict";

  // ---------- helpers ----------
  var DIAC = { "ł":"l","ó":"o","ą":"a","ę":"e","ś":"s","ż":"z","ź":"z","ć":"c","ń":"n","é":"e","è":"e","ô":"o","â":"a" };
  function norm(s){ return s.toLowerCase().replace(/[łóąęśżźćńéèôâ]/g, function(m){return DIAC[m]||m;}); }
  function slug(s){ return norm(s).replace(/[^a-z0-9]+/g," ").trim(); }
  function compact(s){ return norm(s).replace(/[^a-z0-9]+/g,""); }
  function money(n){ return n.toLocaleString("pl-PL",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function esc(s){ return s.replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c];}); }
  function volMl(v){ var m=v.replace(",",".").match(/([\d.]+)\s*ml/); return m?parseFloat(m[1]):null; }
  function starsHTML(r){
    var full=Math.round(r), out="";
    for(var i=1;i<=5;i++) out+= i<=full?"★":"☆";
    return '<span class="stars" aria-hidden="true">'+out+'</span>';
  }
  function plural(n,one,few,many){ if(n===1)return one; var t=n%10,h=n%100; if(t>=2&&t<=4&&!(h>=12&&h<=14))return few; return many; }

  // ---------- product illustrations ----------
  // Rysowane wektorowo sylwetki opakowan (tubka, sloik, pipeta, flakon...),
  // zamiast zdjec: podglad musi byc samowystarczalny, bez zewnetrznych hostow.
  function productSVG(d){
    var im = d.img || { form:"bottle", body:"#EEEEF0", cap:"#C9C9CE" };
    var tx = im.tx || im.accent || "#1D1D1F";
    var stroke = 'stroke="rgba(29,29,31,.07)" stroke-width="1"';
    var parts = [];

    function label(y){
      var out = "";
      if(im.l1){
        var f1 = im.l1.length>12 ? 5.6 : (im.l1.length>8 ? 6.6 : 8.5);
        var ls = im.l1.length>8 ? 0.4 : 1;
        out += '<text x="70" y="'+y+'" text-anchor="middle" font-size="'+f1+'" font-weight="700" letter-spacing="'+ls+'" fill="'+tx+'">'+esc(im.l1)+'</text>';
      }
      if(im.l2){
        var f2 = im.l2.length>13 ? 5.4 : 6.6;
        out += '<text x="70" y="'+(y+10)+'" text-anchor="middle" font-size="'+f2+'" font-weight="500" fill="'+tx+'" opacity=".72">'+esc(im.l2)+'</text>';
      }
      return out;
    }
    function shine(x,y,h){ return '<rect x="'+x+'" y="'+y+'" width="6" height="'+h+'" rx="3" fill="#FFFFFF" opacity=".45"/>'; }

    switch(im.form){
      case "tube":
        parts.push('<rect x="42" y="24" width="56" height="7" rx="3" fill="'+im.cap+'" opacity=".85"/>');
        parts.push('<rect x="40" y="31" width="60" height="102" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push('<rect x="52" y="133" width="36" height="24" rx="7" fill="'+im.cap+'"/>');
        parts.push(shine(46,40,84));
        parts.push(label(80));
        break;
      case "pump":
        parts.push('<rect x="65" y="30" width="28" height="10" rx="4" fill="'+im.cap+'"/>');
        parts.push('<rect x="65" y="36" width="10" height="14" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="46" width="24" height="12" rx="3" fill="'+im.cap+'" opacity=".85"/>');
        parts.push('<rect x="44" y="56" width="52" height="100" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(50,64,84));
        parts.push(label(102));
        break;
      case "dropper":
        parts.push('<rect x="62" y="24" width="16" height="10" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="32" width="24" height="34" rx="8" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="64" width="44" height="92" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(53,72,76));
        parts.push(label(106));
        break;
      case "jar":
        parts.push('<rect x="38" y="58" width="64" height="22" rx="9" fill="'+im.cap+'" '+stroke+'/>');
        parts.push('<rect x="42" y="80" width="56" height="76" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(48,88,60));
        parts.push(label(114));
        break;
      case "mascara":
        parts.push('<rect x="56" y="28" width="28" height="44" rx="9" fill="'+im.cap+'"/>');
        parts.push('<rect x="59" y="72" width="22" height="84" rx="8" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(62,78,72));
        break;
      case "glass":
        parts.push('<rect x="60" y="26" width="30" height="8" rx="4" fill="'+im.cap+'"/>');
        parts.push('<rect x="60" y="32" width="20" height="14" rx="3" fill="'+im.cap+'"/>');
        parts.push('<rect x="58" y="44" width="24" height="10" fill="'+im.cap+'" opacity=".82"/>');
        parts.push('<rect x="46" y="54" width="48" height="102" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(52,62,86));
        parts.push(label(112));
        break;
      case "gloss":
        parts.push('<rect x="58" y="28" width="24" height="54" rx="7" fill="'+im.cap+'"/>');
        parts.push('<rect x="55" y="82" width="30" height="74" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(59,88,60));
        break;
      case "spray":
        parts.push('<rect x="58" y="34" width="24" height="20" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="54" width="44" height="102" rx="9" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(54,62,86));
        parts.push(label(110));
        break;
      case "perfume":
        parts.push('<rect x="55" y="26" width="30" height="26" rx="7" fill="'+im.cap+'"/>');
        parts.push('<rect x="62" y="50" width="16" height="12" fill="'+im.cap+'" opacity=".7"/>');
        parts.push('<rect x="38" y="62" width="64" height="94" rx="12" fill="'+im.body+'" '+stroke+'/>');
        parts.push('<rect x="46" y="70" width="8" height="78" rx="4" fill="#FFFFFF" opacity=".32"/>');
        parts.push(label(116));
        break;
      case "toner":
        parts.push('<rect x="56" y="26" width="28" height="18" rx="5" fill="'+im.cap+'"/>');
        parts.push('<rect x="48" y="44" width="44" height="112" rx="10" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(53,52,96));
        parts.push(label(106));
        break;
      default: // bottle
        parts.push('<rect x="54" y="30" width="32" height="20" rx="6" fill="'+im.cap+'"/>');
        parts.push('<rect x="44" y="50" width="52" height="106" rx="16" fill="'+im.body+'" '+stroke+'/>');
        parts.push(shine(50,58,90));
        parts.push(label(108));
    }

    return '<svg viewBox="0 0 140 176" role="img" aria-hidden="true" '+
      'style="font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',sans-serif">'+
      '<ellipse cx="70" cy="164" rx="34" ry="5" fill="#1D1D1F" opacity=".05"/>'+
      parts.join("")+'</svg>';
  }

  var HAS_FEED = typeof FEED_P!=="undefined" && FEED_P.length>0;

  // Zdjecia: pokazujemy TYLKO studyjne zdjecia z feedow sklepow (jednolite tlo,
  // jak Hebe). Amatorskie zdjecia z Open Beauty Facts sa wylaczone, zeby produkty
  // nie wygladaly "jak uzywane" — zamiast nich spojne ilustracje.
  var SHOW_CROWD_PHOTOS = false;

  // Pelny rejestr marek: lista z data.js + marki produktow z bazy cen.
  var BRAND_ALL = (function(){
    var set={};
    (typeof BRANDS!=="undefined"?BRANDS:[]).forEach(function(b){ set[b]=1; });
    (typeof FEED_BRANDS!=="undefined"?FEED_BRANDS:[]).forEach(function(b){ set[b]=1; }); // marki z feedow (auto)
    P.forEach(function(p){ set[p.brand]=1; });
    return Object.keys(set).sort(function(a,b){return a.localeCompare(b,"pl");});
  })();
  var DATA = P.map(function(p,i){
    var offers = Object.keys(p.o).map(function(s){ return { store:s, price:p.o[s].p, was:p.o[s].w||null, url:p.o[s].u||null, inStock:true }; });
    if(!HAS_FEED && i%9===4 && offers.length>3){ offers.slice().sort(function(a,b){return a.price-b.price;})[0].inStock=false; }
    var avail = offers.filter(function(o){return o.inStock;}).sort(function(a,b){return a.price-b.price;});
    var low=avail[0].price, high=avail[avail.length-1].price;
    offers.sort(function(a,b){ if(a.inStock!==b.inStock)return a.inStock?-1:1; return a.price-b.price; });
    return {
      id:i, brand:p.brand, name:p.name, cat:p.cat, vol:p.vol, ml:volMl(p.vol),
      pop:p.pop, rate:p.rate, votes:p.votes, img:p.img, photo:p.photo||null,
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
  // Ulubione i alerty sa trwale: localStorage przezywa restart aplikacji.
  function loadStore(key){ try { return JSON.parse(localStorage.getItem(key)||"{}"); } catch(e){ return {}; } }
  function saveStore(key,obj){ try { localStorage.setItem(key, JSON.stringify(obj)); } catch(e){} }
  var favs=loadStore("blask.favs"), alerts=loadStore("blask.alerts"), cart=loadStore("blask.cart");
  var favMode=false, catalogMode=false, catPage=1, CAT_PAGE=48, catImgOnly=false, catCat="Wszystkie";
  var activeCat="Wszystkie", activeIdx=-1, curSug=[];
  var homeEl=document.getElementById("home"), pdpEl=document.getElementById("pdp");
  var cartEl=document.getElementById("cart");
  var qEl=document.getElementById("q"), sugEl=document.getElementById("suggest");
  var IS_ELECTRON=/Electron/i.test(navigator.userAgent);

  // ---------- prawdziwe zdjecia produktow ----------
  // Zrodlo: Open Beauty Facts (otwarta baza zdjec realnych produktow).
  // Adresy sa cache'owane w localStorage; gdy sieci brak (np. sandbox
  // podgladu), na kartach zostaja wektorowe ilustracje.
  var PHOTOS=loadStore("blask.photos");
  function visualInner(d){
    var url=d.photo; // wylacznie studyjne zdjecie z feedu sklepu
    if(SHOW_CROWD_PHOTOS && !url) url=PHOTOS[d.id]||catalogPhoto(d);
    return productSVG(d)+(url?'<img class="pphoto" alt="" loading="lazy" src="'+esc(url)+'">':'');
  }
  // Dopasowanie zdjecia z katalogu OBF do produktu z bazy cen (po marce i nazwie).
  var _catByBrand=null, _photoMemo={};
  function catalogPhoto(d){
    if(d.id in _photoMemo) return _photoMemo[d.id];
    if(typeof FEED_CATALOG==="undefined"){ return (_photoMemo[d.id]=""); }
    if(!_catByBrand){
      _catByBrand={};
      FEED_CATALOG.forEach(function(it){
        if(!it.img) return;
        var b=slug(it.brand||"");
        (_catByBrand[b]=_catByBrand[b]||[]).push(it);
      });
    }
    var pool=_catByBrand[slug(d.brand)]||[];
    var toks=slug(d.name).split(" ").filter(function(t){return t.length>2;});
    var best=null,bestScore=0;
    pool.forEach(function(it){
      var h=slug(it.name),sc=0;
      toks.forEach(function(t){ if(h.indexOf(t)>=0) sc++; });
      if(sc>bestScore){ bestScore=sc; best=it; }
    });
    return (_photoMemo[d.id]= best?best.img:"");
  }
  function injectPhoto(id){
    var url=PHOTOS[id]; if(!url) return;
    Array.prototype.forEach.call(document.querySelectorAll('.pv[data-pid="'+id+'"]'),function(el){
      if(el.querySelector("img.pphoto")) return;
      var im=document.createElement("img");
      im.className="pphoto"; im.alt=""; im.loading="lazy"; im.src=url;
      el.appendChild(im);
    });
  }
  // Uszkodzone/niedostepne zdjecie -> wracamy do ilustracji.
  document.addEventListener("error",function(e){
    var t=e.target;
    if(t && t.classList && t.classList.contains("pphoto")){
      var pv=t.closest(".pv");
      if(pv){ PHOTOS[pv.getAttribute("data-pid")]=""; saveStore("blask.photos",PHOTOS); }
      t.remove();
    }
  },true);
  function loadPhotos(){
    if(!SHOW_CROWD_PHOTOS) return; // zdjecia OBF wylaczone
    var queue=DATA.filter(function(d){ return !d.photo && !(d.id in PHOTOS); });
    (function next(){
      if(!queue.length){ saveStore("blask.photos",PHOTOS); return; }
      var d=queue.shift();
      var q=encodeURIComponent(d.brand+" "+d.name.split(" ").slice(0,3).join(" "));
      fetch("https://world.openbeautyfacts.org/cgi/search.pl?search_terms="+q+
            "&search_simple=1&action=process&json=1&page_size=5&sort_by=unique_scans_n&fields=image_front_url")
        .then(function(r){ return r.json(); })
        .then(function(js){
          var hit=(js.products||[]).filter(function(x){return x.image_front_url;})[0];
          PHOTOS[d.id]=hit?hit.image_front_url:"";
          if(hit) injectPhoto(d.id);
          saveStore("blask.photos",PHOTOS);
          next();
        })
        .catch(function(){ next(); /* brak sieci - zostaje ilustracja, sprobujemy przy nastepnym starcie */ });
    })();
  }

  // ---------- hero stats ----------
  var stores={}; DATA.forEach(function(d){d.offers.forEach(function(o){stores[o.store]=1;});});
  var avgPct=Math.round(DATA.reduce(function(s,d){return s+d.savePct;},0)/DATA.length);
  document.getElementById("bandStats").innerHTML =
    '<span>'+BRAND_ALL.length+' marek</span><span class="dot"></span>'+
    '<span>'+DATA.length+' produktów z cenami</span><span class="dot"></span>'+
    '<span>'+Object.keys(stores).length+' sklepów</span><span class="dot"></span>'+
    '<span>średnia różnica cen '+avgPct+'%</span>';

  // ---------- category nav ----------
  var catnav=document.getElementById("catnav");
  CATS.forEach(function(c){
    var b=document.createElement("button");
    b.className="catlink"+(c===activeCat?" on":""); b.type="button"; b.textContent=c;
    b.addEventListener("click", function(){
      activeCat=c; favMode=false; catalogMode=false;
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===c);});
      goHome(); renderGrid();
    });
    catnav.appendChild(b);
  });
  // Zakładka "Katalog" — przeglądanie całego katalogu produktów
  var catalogTab=document.createElement("button");
  catalogTab.className="catlink"; catalogTab.type="button"; catalogTab.textContent="Katalog";
  catalogTab.addEventListener("click", function(){
    catalogMode=true; favMode=false; catPage=1; activeCat="Wszystkie";
    catCat="Wszystkie"; catImgOnly=false;
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x===catalogTab);});
    var chips=document.getElementById("catFilterChips");
    if(chips) Array.prototype.forEach.call(chips.children,function(x){x.classList.toggle("on",x.textContent==="Wszystkie");});
    var io=document.getElementById("imgOnly"); if(io) io.checked=false;
    goHome(); renderGrid();
  });
  catnav.appendChild(catalogTab);

  // ---------- grid ----------
  var gridEl=document.getElementById("pgrid"), sortEl=document.getElementById("sort");
  sortEl.addEventListener("change", renderGrid);

  var brandFilter=null;
  function gridList(){
    var list=DATA.filter(function(d){
      if(brandFilter) return d.brand===brandFilter;
      if(favMode) return !!favs[d.id];
      return activeCat==="Wszystkie"||d.cat===activeCat;
    });
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
    return '<div class="pcard" role="button" tabindex="0" data-id="'+d.id+'">'+
      (d.savePct>=15?'<span class="badge">−'+d.savePct+'%</span>':'')+
      '<button class="fav'+(favs[d.id]?" on":"")+'" data-fav="'+d.id+'" type="button" aria-label="Dodaj do ulubionych">'+
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(favs[d.id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg></button>'+
      '<button class="addcart'+(inCart(d.id)?" on":"")+'" data-add="'+d.id+'" type="button" aria-label="Dodaj do koszyka" title="Dodaj do koszyka">'+
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h3l2.3 12.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg></button>'+
      '<div class="pimg pv" data-pid="'+d.id+'">'+visualInner(d)+'</div>'+
      '<div class="pbrand">'+esc(d.brand)+'</div>'+
      '<div class="pname">'+esc(d.name)+'</div>'+
      '<div class="prating">'+starsHTML(d.rate)+' '+d.rate.toFixed(1)+' ('+d.votes.toLocaleString("pl-PL")+')</div>'+
      '<div class="pfoot"><div class="pfrom">od</div>'+
      '<div class="pprice"><span class="now">'+money(d.low)+' zł</span>'+
      (d.save>0?'<span class="high">'+money(d.high)+' zł</span>':'')+'</div>'+
      '<div class="pstores">w <b>'+d.offers.length+'</b> '+plural(d.offers.length,"sklepie","sklepach","sklepach")+
      (d.save>0?' · taniej o <b>'+money(d.save)+' zł</b>':'')+'</div></div></div>';
  }

  function catalogList(){
    if(typeof FEED_CATALOG==="undefined") return [];
    var list=FEED_CATALOG.filter(function(x){
      if(catImgOnly && !x.img) return false;
      return catCat==="Wszystkie"||x.cat===catCat;
    });
    list.sort(function(a,b){ return (b.img?1:0)-(a.img?1:0); }); // ze zdjęciem najpierw
    return list;
  }

  // pasek filtrów katalogu (kategorie + tylko ze zdjęciem)
  var catFilterEl=document.getElementById("catFilter"), catFilterChips=document.getElementById("catFilterChips");
  CATS.forEach(function(c){
    var ch=document.createElement("button");
    ch.className="chip"+(c==="Wszystkie"?" on":""); ch.type="button"; ch.textContent=c;
    ch.addEventListener("click", function(){
      catCat=c; catPage=1;
      Array.prototype.forEach.call(catFilterChips.children,function(x){x.classList.toggle("on",x.textContent===c);});
      renderGrid();
    });
    catFilterChips.appendChild(ch);
  });
  var imgOnlyLabel=document.querySelector(".catfilter-toggle");
  if(!SHOW_CROWD_PHOTOS && imgOnlyLabel){ imgOnlyLabel.style.display="none"; }
  document.getElementById("imgOnly").addEventListener("change", function(){
    catImgOnly=this.checked; catPage=1; renderGrid();
  });

  function renderGrid(){
    var titleEl=document.getElementById("gridTitle"), resEl=document.getElementById("gridRes");
    catFilterEl.hidden = !catalogMode;
    if(catalogMode){
      var full=catalogList();
      _catItems=full;
      var shown=full.slice(0, catPage*CAT_PAGE);
      titleEl.childNodes[0].nodeValue = "Katalog";
      resEl.textContent=" · "+full.length.toLocaleString("pl-PL")+" "+plural(full.length,"produkt","produkty","produktów")+
        (catCat!=="Wszystkie"?" · "+catCat:"")+(catImgOnly?" · ze zdjęciem":"");
      gridEl.innerHTML = shown.length
        ? shown.map(function(it,i){ return catalogCardHTML(it,i); }).join("")+
          (full.length>shown.length
            ? '<div class="more-wrap"><button class="more-btn" id="moreBtn" type="button">Pokaż więcej ('+
              (full.length-shown.length).toLocaleString("pl-PL")+')</button></div>'
            : '')
        : '<div class="empty"><div class="t">Katalog jest pusty</div>Uruchom import (sync/import-catalog.mjs) lub GitHub Action.</div>';
      var mb=document.getElementById("moreBtn");
      if(mb) mb.addEventListener("click", function(){ catPage++; renderGrid(); });
      return;
    }
    var list=gridList();
    titleEl.childNodes[0].nodeValue =
      brandFilter ? brandFilter
      : favMode ? "Ulubione"
      : (activeCat==="Wszystkie"?"Wszystkie produkty":activeCat);
    resEl.textContent=" · "+list.length+" "+plural(list.length,"produkt","produkty","produktów");
    gridEl.innerHTML = list.length ? list.map(cardHTML).join("")
      : (favMode
        ? '<div class="empty"><div class="t">Nie masz jeszcze ulubionych</div>Kliknij ♥ na dowolnym produkcie, a znajdziesz go tutaj — zapamiętamy go na stałe.</div>'
        : '<div class="empty"><div class="t">Brak produktów</div>Zmień kategorię lub wyszukaj coś innego.</div>');
    updateHome();
  }
  var homeSectionsEl=document.getElementById("homeSections");
  function updateHome(){
    var pristine = !brandFilter && !favMode && !catalogMode && activeCat==="Wszystkie";
    homeSectionsEl.style.display = pristine ? "" : "none";
  }

  // ---------- strona główna: kafelki + karuzele + marki (styl drogerii) ----------
  function svg(inner){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+inner+'</svg>'; }
  // profesjonalne ikony wektorowe (zamiast emoji)
  var CAT_ICON = {
    "Pielęgnacja twarzy": svg('<rect x="5" y="9" width="14" height="11" rx="2.6"/><path d="M8 9V7h8v2"/><path d="M9.5 5.4h5"/>'),
    "Makijaż":            svg('<rect x="9" y="12" width="6" height="8" rx="1"/><path d="M9 12V9l5-3v6"/>'),
    "Pielęgnacja ciała":  svg('<rect x="7.5" y="10" width="9" height="10" rx="2.6"/><path d="M11 10V7h3l1-1"/><rect x="10" y="5.4" width="4" height="1.7" rx=".85"/>'),
    "Włosy":              svg('<rect x="4" y="5.4" width="16" height="3.4" rx="1.2"/><path d="M6.6 8.8v8.4M10 8.8v8.4M13.4 8.8v8.4M16.8 8.8v5.8"/>'),
    "Zapachy":            svg('<rect x="7.6" y="9.6" width="8.8" height="10.4" rx="2"/><rect x="10" y="4" width="4" height="3.2" rx="1"/><path d="M11 7.2h2v2.4h-2z"/>')
  };
  var CAT_TINT = {
    "Pielęgnacja twarzy":"#EAF2FB", "Makijaż":"#FBEAF1", "Pielęgnacja ciała":"#EAF7F1",
    "Włosy":"#F1ECFA", "Zapachy":"#FBF2E7"
  };
  var CAT_INK = {
    "Pielęgnacja twarzy":"#3E6DB0", "Makijaż":"#C05E8A", "Pielęgnacja ciała":"#2E8E6A",
    "Włosy":"#7A4CA8", "Zapachy":"#C0863E"
  };
  // ikony nagłówków sekcji
  var SEC_ICON = {
    deals: svg('<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-6.2-6.2A2 2 0 0 1 3.8 13V6.2a2 2 0 0 1 2-2h6.8a2 2 0 0 1 1.4.6l6.6 6.6a2 2 0 0 1 0 2z"/><circle cx="8.4" cy="8.4" r="1.3"/>'),
    best:  svg('<path d="M3 17l6-6 4 4 7-7"/><path d="M17 8h4v4"/>'),
    rated: svg('<path d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.6 9.7l5.8-.8z"/>')
  };
  function catTiles(){
    return '<section class="hcats">'+CATS.filter(function(c){return c!=="Wszystkie";}).map(function(c){
      return '<button class="hcat" type="button" data-hcat="'+esc(c)+'">'+
        '<span class="hcat-ic">'+(CAT_ICON[c]||"")+'</span>'+
        '<span class="hcat-nm">'+esc(c)+'</span></button>';
    }).join("")+'</section>';
  }
  function carousel(icon, title, items, sub, seeAllSort){
    if(!items.length) return "";
    return '<section class="hrow">'+
      '<div class="hrow-head"><div class="hrow-title"><span class="hrow-ic">'+icon+'</span>'+
        '<div><h2>'+title+'</h2>'+(sub?'<p>'+sub+'</p>':'')+'</div></div>'+
        (seeAllSort?'<button class="hrow-all" type="button" data-all="'+seeAllSort+'">Zobacz wszystkie <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>':'')+
      '</div>'+
      '<div class="row-scroll">'+items.map(cardHTML).join("")+'</div></section>';
  }
  function brandStrip(){
    var counts={}; DATA.forEach(function(d){ counts[d.brand]=(counts[d.brand]||0)+d.pop; });
    var top=Object.keys(counts).sort(function(a,b){return counts[b]-counts[a];}).slice(0,16);
    var ic=svg('<circle cx="12" cy="8" r="4.5"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>');
    return '<section class="hrow"><div class="hrow-head"><div class="hrow-title"><span class="hrow-ic">'+ic+'</span>'+
      '<div><h2>Popularne marki</h2></div></div></div>'+
      '<div class="hbrands">'+top.map(function(b){
        return '<button class="hbrand" type="button" data-hbrand="'+esc(b)+'">'+esc(b)+'</button>';
      }).join("")+'</div></section>';
  }
  function renderHomeSections(){
    var promo=DATA.filter(function(d){return d.savePct>=10;})
                  .sort(function(a,b){return b.savePct-a.savePct || b.save-a.save;}).slice(0,12);
    var pop=DATA.slice().sort(function(a,b){return b.pop-a.pop;}).slice(0,12);
    var rate=DATA.slice().sort(function(a,b){return b.rate-a.rate || b.votes-a.votes;}).slice(0,12);
    homeSectionsEl.innerHTML=
      carousel(SEC_ICON.deals,"Najlepsze okazje cenowe", promo, "Największe różnice cen między sklepami", "save")+
      catTiles()+
      carousel(SEC_ICON.best,"Bestsellery", pop, "Najczęściej porównywane produkty", "pop")+
      carousel(SEC_ICON.rated,"Najwyżej oceniane", rate, null, "rate")+
      brandStrip();
  }

  function scrollToGrid(){
    var t=document.querySelector(".toolbar");
    if(t) t.scrollIntoView({behavior:"smooth", block:"start"});
  }
  function selectCategory(c){
    brandFilter=null; activeCat=c; favMode=false; catalogMode=false;
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===c);});
    pdpEl.style.display="none"; infoEl.style.display="none"; cartEl.style.display="none"; homeEl.style.display="block";
    renderGrid(); scrollToGrid();
  }
  function selectBrand(b){
    brandFilter=b; favMode=false; catalogMode=false; activeCat="Wszystkie";
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.remove("on");});
    pdpEl.style.display="none"; infoEl.style.display="none"; cartEl.style.display="none"; homeEl.style.display="block";
    renderGrid(); scrollToGrid();
  }
  bindCardEvents(homeSectionsEl);
  homeSectionsEl.addEventListener("click", function(e){
    var hc=e.target.closest("[data-hcat]"); if(hc){ selectCategory(hc.getAttribute("data-hcat")); return; }
    var hb=e.target.closest("[data-hbrand]"); if(hb){ selectBrand(hb.getAttribute("data-hbrand")); return; }
    var al=e.target.closest("[data-all]"); if(al){ brandFilter=null; sortEl.value=al.getAttribute("data-all"); renderGrid(); scrollToGrid(); }
  });

  function bindCardEvents(container){
    container.addEventListener("click", function(e){
      var f=e.target.closest("[data-fav]");
      if(f){ e.stopPropagation(); toggleFav(+f.getAttribute("data-fav")); return; }
      var ac=e.target.closest("[data-add]");
      if(ac){ e.stopPropagation(); addToCart(+ac.getAttribute("data-add")); return; }
      var c=e.target.closest(".pcard"); if(!c) return;
      if(c.hasAttribute("data-cat")) openCatalog(_catItems[+c.getAttribute("data-cat")]);
      else openPDP(+c.getAttribute("data-id"));
    });
    container.addEventListener("keydown", function(e){
      if(e.key!=="Enter"&&e.key!==" ") return;
      var c=e.target.closest(".pcard"); if(!c) return; e.preventDefault();
      if(c.hasAttribute("data-cat")) openCatalog(_catItems[+c.getAttribute("data-cat")]);
      else openPDP(+c.getAttribute("data-id"));
    });
  }
  var _catItems=[];
  function catalogCardHTML(it, idx){
    return '<div class="pcard" role="button" tabindex="0" data-cat="'+idx+'">'+
      '<div class="pimg pv">'+productSVG(genericImg)+
        ((SHOW_CROWD_PHOTOS&&it.img)?'<img class="pphoto" alt="" loading="lazy" src="'+esc(it.img)+'">':'')+'</div>'+
      '<div class="pbrand">'+esc(it.brand||"")+'</div>'+
      '<div class="pname">'+esc(it.name)+'</div>'+
      '<div class="prating">'+(it.qty?esc(it.qty):'')+'</div>'+
      '<div class="pfoot"><div class="pstores">Sprawdź ceny w sklepach →</div></div></div>';
  }
  bindCardEvents(gridEl);
  bindCardEvents(document.getElementById("related"));

  // ---------- favourites / alerts ----------
  function count(obj){ return Object.keys(obj).filter(function(k){return obj[k];}).length; }
  function cartCount(){ var n=0; for(var k in cart){ if(cart[k]>0) n+=cart[k]; } return n; }
  function syncCounts(){
    var fc=count(favs), ac=count(alerts), cc=cartCount();
    var fEl=document.getElementById("favCnt"), aEl=document.getElementById("alertCnt"), cEl=document.getElementById("cartCnt");
    fEl.hidden=!fc; fEl.textContent=fc; aEl.hidden=!ac; aEl.textContent=ac;
    cEl.hidden=!cc; cEl.textContent=cc;
  }
  function toggleFav(id){
    favs[id]=!favs[id]; if(!favs[id]) delete favs[id];
    saveStore("blask.favs",favs); syncCounts();
    toast(favs[id]?"Zapisano w ulubionych ♥":"Usunięto z ulubionych");
    renderGrid(); if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  function toggleAlert(id){
    alerts[id]=!alerts[id]; if(!alerts[id]) delete alerts[id];
    saveStore("blask.alerts",alerts); syncCounts();
    toast(alerts[id]?"Alert cenowy ustawiony 🔔":"Alert wyłączony");
    if(pdpEl.style.display==="block"&&curPdp===id) paintPdpMini(id);
  }
  document.getElementById("favBtnTop").addEventListener("click", function(){
    favMode=true; catalogMode=false; activeCat="Wszystkie";
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.remove("on");});
    goHome(); renderGrid();
  });
  document.getElementById("alertBtnTop").addEventListener("click", function(){
    var n=count(alerts); toast(n?("Aktywne alerty: "+n):"Nie masz alertów — ustaw je na stronie produktu");
  });

  var toastEl=document.getElementById("toast"), toastT;
  function toast(msg){
    toastEl.textContent=msg; toastEl.classList.add("show");
    clearTimeout(toastT); toastT=setTimeout(function(){toastEl.classList.remove("show");},2200);
  }

  // ---------- KOSZYK + porownywarka koszyka ----------
  // Klient buduje koszyk, a Blask liczy, gdzie CALY koszyk wyjdzie najtaniej
  // — z uwzglednieniem kosztu i progu darmowej dostawy kazdego sklepu.
  // To wyroznik: pojedyncze ceny porownuje wielu, caly koszyk — prawie nikt.
  function saveCart(){ saveStore("blask.cart",cart); syncCounts(); }
  function inCart(id){ return cart[id]>0; }

  // udostepnianie koszyka linkiem: kodujemy pozycje w adresie (#k=id*ilosc,...)
  function encodeCart(){
    var parts=[]; for(var k in cart){ if(cart[k]>0) parts.push(k+"*"+cart[k]); }
    return parts.join(",");
  }
  function decodeCart(str){
    var out={};
    (str||"").split(",").forEach(function(p){
      var m=p.split("*"), id=parseInt(m[0],10), q=parseInt(m[1]||"1",10);
      if(!isNaN(id) && id>=0 && id<DATA.length && q>0) out[id]=Math.min(q,99);
    });
    return out;
  }
  function cartShareUrl(){ return location.origin+location.pathname+"#k="+encodeCart(); }
  function shareCartLink(){
    var enc=encodeCart();
    if(!enc){ toast("Koszyk jest pusty"); return; }
    var url=cartShareUrl();
    if(navigator.share){
      navigator.share({ title:"Mój koszyk w Blask 💛", text:"Zobacz mój koszyk kosmetyków i porównaj ceny:", url:url })
        .catch(function(){});
    } else {
      copyText(url, function(ok){ toast(ok?"Skopiowano link do koszyka 🔗":"Nie udało się skopiować"); });
    }
  }
  // Kod QR koszyka (OPCJA D wg ChatGPT): skanujesz telefonem i otwierasz koszyk.
  // QR renderuje sprawdzony generator jako obrazek (CSP dopuszcza img https:);
  // do serwisu trafia wyłącznie link koszyka (numery produktów), nic osobistego.
  var qrmodal=document.getElementById("qrmodal");
  function showCartQR(){
    if(!encodeCart()){ toast("Koszyk jest pusty"); return; }
    var url=cartShareUrl();
    document.getElementById("qrImg").src="https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=10&qzone=1&data="+encodeURIComponent(url);
    document.getElementById("qrLink").textContent=url;
    qrmodal.hidden=false; document.body.style.overflow="hidden";
  }
  function closeQR(){ qrmodal.hidden=true; document.body.style.overflow=""; }
  document.getElementById("qrClose").addEventListener("click", closeQR);
  qrmodal.addEventListener("click", function(e){ if(e.target===qrmodal) closeQR(); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !qrmodal.hidden) closeQR(); });
  document.getElementById("qrCopy").addEventListener("click", function(){
    copyText(cartShareUrl(), function(ok){ toast(ok?"Skopiowano link 🔗":"Nie udało się skopiować"); });
  });
  function importSharedCart(){
    var m=(location.hash||"").match(/[#&]k=([^&]+)/);
    if(!m) return false;
    var shared=decodeCart(decodeURIComponent(m[1])), ids=Object.keys(shared);
    try{ history.replaceState(null,"",location.pathname+location.search); }catch(e){}
    if(!ids.length) return false;
    ids.forEach(function(id){ cart[id]=(cart[id]||0)+shared[id]; });
    saveCart();
    return true;
  }
  function addToCart(id, silent){
    cart[id]=(cart[id]||0)+1; saveCart();
    if(!silent) toast("Dodano do koszyka 🛒");
    reflectCartButtons(id);
  }
  function setQty(id, q){
    if(q<=0){ delete cart[id]; } else { cart[id]=q; }
    saveCart(); reflectCartButtons(id);
    if(cartEl.style.display==="block") renderCart();
  }
  function reflectCartButtons(id){
    // odswiez przyciski „+ koszyk" na kartach i na stronie produktu
    Array.prototype.forEach.call(document.querySelectorAll('[data-add="'+id+'"]'),function(b){
      b.classList.toggle("on", inCart(id));
    });
    if(pdpEl.style.display==="block" && curPdp===id) paintPdpCart(id);
  }

  // dostawa: parsujemy koszt i prog darmowej dostawy z opisu sklepu (data.js)
  function parseDelivery(store){
    var st=STORES[store]; if(!st||st.mkt) return null;
    var dl=st.dl||"", ship=0, free=null;
    var m1=dl.match(/od\s+([\d.,]+)\s*zł/);          if(m1) ship=parseFloat(m1[1].replace(/\s/g,"").replace(",","."));
    var m2=dl.match(/darmowa\s+od\s+([\d.,]+)\s*zł/); if(m2) free=parseFloat(m2[1].replace(/\s/g,"").replace(",","."));
    return { ship: ship||0, free: free };
  }
  function realStores(){ return Object.keys(STORES).filter(function(s){ return !STORES[s].mkt; }); }

  function computeBasket(){
    var ids=[]; for(var k in cart){ if(cart[k]>0) ids.push(+k); }
    var items=ids.map(function(id){ return { d:DATA[id], qty:cart[id] }; });
    var N=items.length;
    var per={}; realStores().forEach(function(s){ per[s]={sub:0,items:0,missing:[]}; });
    items.forEach(function(it){
      var byStore={};
      it.d.offers.forEach(function(o){ if(o.inStock && STORES[o.store] && !STORES[o.store].mkt) byStore[o.store]=o.price; });
      realStores().forEach(function(s){
        if(byStore[s]!=null){ per[s].sub+=byStore[s]*it.qty; per[s].items++; }
        else per[s].missing.push(it.d);
      });
    });
    var full=[], partial=[];
    realStores().forEach(function(s){
      var ps=per[s]; if(ps.items===0) return;
      var del=parseDelivery(s)||{ship:0,free:null};
      var ship=(del.free!=null && ps.sub>=del.free)?0:del.ship;
      var row={ store:s, sub:+ps.sub.toFixed(2), ship:ship, total:+(ps.sub+ship).toFixed(2),
                items:ps.items, freeFrom:del.free, missing:ps.missing };
      (ps.items===N?full:partial).push(row);
    });
    full.sort(function(a,b){ return a.total-b.total; });
    partial.sort(function(a,b){ return b.items-a.items || a.total-b.total; });
    // „mix" — kazdy produkt tam, gdzie najtaniej (moze byc kilka sklepow)
    var byS={}, covered=0, mixSub=0, pick={};
    items.forEach(function(it){
      var best=null;
      it.d.offers.forEach(function(o){ if(o.inStock && STORES[o.store] && !STORES[o.store].mkt && (!best||o.price<best.price)) best=o; });
      if(best){ covered++; mixSub+=best.price*it.qty; byS[best.store]=(byS[best.store]||0)+best.price*it.qty; pick[it.d.id]=best.store; }
    });
    var mixShip=0;
    Object.keys(byS).forEach(function(s){
      var del=parseDelivery(s)||{ship:0,free:null};
      mixShip += (del.free!=null && byS[s]>=del.free)?0:del.ship;
    });
    var mix = covered===N && N>0
      ? { sub:+mixSub.toFixed(2), ship:+mixShip.toFixed(2), total:+(mixSub+mixShip).toFixed(2), stores:Object.keys(byS), pick:pick }
      : null;
    return { items:items, N:N, full:full, partial:partial, mix:mix };
  }

  function storeDot(s){ return '<span class="store-dot" style="background:'+((STORES[s]||{}).c||"#999")+'"></span>'; }
  // Link do KONKRETNEGO produktu w danym sklepie.
  // 1) prawdziwy URL oferty (z feedu) — najlepszy, prowadzi wprost do produktu;
  // 2) w braku niego: wyszukiwarka Google zawężona do domeny sklepu. Wewnętrzne
  //    wyszukiwarki drogerii mają różne, niepubliczne formaty (Ezebra zwracała
  //    404 albo cały katalog) — Google zawsze znajduje ten produkt w tym sklepie.
  // Gdy podłączymy feedy, punkt 1 zadziała wszędzie i Google zniknie.
  function isRealUrl(u){ return typeof u==="string" && /^https?:\/\//.test(u) && u.indexOf("{q}")<0; }
  function storeDomain(store){
    var st=STORES[store]||{};
    if(st.domain) return st.domain;
    return (st.url||"").replace(/^https?:\/\//,"").replace(/^www\./,"").replace(/\/.*$/,"");
  }
  var REAL = (typeof REAL_LINKS!=="undefined") ? REAL_LINKS : {};
  function offerUrlAt(d, store){
    var o=d.offers.filter(function(x){ return x.store===store && x.inStock; })[0];
    if(o && isRealUrl(o.url)) return o.url;
    var real=REAL[compact(d.brand+d.name)];        // ręcznie wpisany prawdziwy link produktu
    if(real) return real;
    var dom=storeDomain(store);                     // fallback: Google zawężony do sklepu
    return "https://www.google.com/search?q="+encodeURIComponent(d.brand+" "+d.name+(dom?(" site:"+dom):""));
  }

  function renderCart(){
    var body=document.getElementById("cartBody");
    var r=computeBasket();
    if(!r.N){
      body.innerHTML='<div class="cart-empty">'+
        '<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.3 12.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg>'+
        '<div class="t">Twój koszyk jest pusty</div>'+
        '<p>Dodaj kilka produktów (🛒 na karcie lub stronie produktu), a policzymy, w którym sklepie cały koszyk wyjdzie najtaniej — razem z dostawą.</p>'+
        '<button class="cta" id="cartShop" type="button">Przeglądaj produkty</button></div>';
      document.getElementById("cartShop").addEventListener("click", showHome);
      return;
    }
    // lista pozycji
    var itemsHTML=r.items.map(function(it){
      var d=it.d;
      return '<div class="citem">'+
        '<div class="citem-img pv" data-pid="'+d.id+'" data-open="'+d.id+'">'+visualInner(d)+'</div>'+
        '<div class="citem-info" data-open="'+d.id+'">'+
          '<div class="citem-brand">'+esc(d.brand)+'</div>'+
          '<div class="citem-name">'+esc(d.name)+'</div>'+
          '<div class="citem-sub">'+d.vol+' · od <b>'+money(d.low)+' zł</b> ('+d.lowStore+')</div>'+
        '</div>'+
        '<div class="citem-qty">'+
          '<button class="qbtn" data-dec="'+d.id+'" type="button" aria-label="Mniej">−</button>'+
          '<span class="qn">'+it.qty+'</span>'+
          '<button class="qbtn" data-inc="'+d.id+'" type="button" aria-label="Więcej">+</button>'+
        '</div>'+
        '<button class="citem-x" data-rm="'+d.id+'" type="button" aria-label="Usuń">'+
          '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'+
        '</div>';
    }).join("");

    // panel wyniku
    var best=r.full[0], result="";
    if(best){
      var freeInfo = best.ship===0
        ? '<span class="cfree">z darmową dostawą</span>'
        : '+ '+money(best.ship)+' zł dostawy'+(best.freeFrom!=null?' <span class="cmuted">(darmowa od '+money(best.freeFrom)+' zł)</span>':'');
      result+='<div class="cwin">'+
        '<div class="cwin-lbl">Cały koszyk najtaniej w</div>'+
        '<div class="cwin-store">'+storeDot(best.store)+'<b>'+best.store+'</b></div>'+
        '<div class="cwin-total">'+money(best.total)+'<span class="cur">zł</span></div>'+
        '<div class="cwin-break">'+money(best.sub)+' zł za produkty · '+freeInfo+'</div>'+
        '<button class="cta cwin-go" id="cwinCheckout" type="button">Dokończ zakupy w '+esc(best.store)+
          ' <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></button>'+
        '<div class="cwin-hint">Otwieramy Twoje produkty w '+esc(best.store)+' — dodajesz je do koszyka sklepu jednym kliknięciem.</div>'+
        '</div>';
      // pozostale pelne koszyki
      if(r.full.length>1){
        result+='<div class="crows">'+r.full.slice(1,4).map(function(row){
          var extra=row.total-best.total;
          return '<div class="crow"><div class="crow-s">'+storeDot(row.store)+row.store+'</div>'+
            '<div class="crow-p"><b>'+money(row.total)+' zł</b>'+
            '<span class="crow-d">'+(row.ship===0?'z dostawą':'+ '+money(row.ship)+' zł dostawy')+'</span></div>'+
            '<div class="crow-x">+'+money(extra)+' zł</div></div>';
        }).join("")+'</div>';
      }
    } else {
      result+='<div class="cwin cwin-none"><div class="cwin-lbl">Żaden sklep nie ma wszystkich produktów</div>'+
        '<p>Poniżej pokazujemy, gdzie zdobędziesz ich najwięcej, oraz wariant „każdy najtaniej".</p></div>';
      if(r.partial.length){
        result+='<div class="crows">'+r.partial.slice(0,4).map(function(row){
          return '<div class="crow"><div class="crow-s">'+storeDot(row.store)+row.store+'</div>'+
            '<div class="crow-p"><b>'+money(row.total)+' zł</b><span class="crow-d">'+(row.ship===0?'z dostawą':'+ '+money(row.ship)+' zł dostawy')+'</span></div>'+
            '<div class="crow-x">'+row.items+'/'+r.N+' produktów</div></div>';
        }).join("")+'</div>';
      }
    }

    // wariant mix (kazdy produkt najtaniej)
    if(r.mix){
      var diff = best ? +(best.total - r.mix.total).toFixed(2) : null;
      var mixClass = (diff!=null && diff>0.01) ? "cmix cmix-win" : "cmix";
      result+='<div class="'+mixClass+'">'+
        '<div class="cmix-head"><div class="cmix-lbl">Każdy produkt najtaniej '+
          '<span class="cmuted">('+r.mix.stores.length+' '+plural(r.mix.stores.length,"sklep","sklepy","sklepów")+')</span></div>'+
          '<div class="cmix-total">'+money(r.mix.total)+' zł</div></div>'+
        '<div class="cmix-stores">'+r.mix.stores.map(function(s){return storeDot(s)+s;}).join('<span class="cmix-sep">·</span>')+'</div>'+
        (diff!=null
          ? (diff>0.01
              ? '<div class="cmix-note good">Dzieląc zakupy oszczędzasz <b>'+money(diff)+' zł</b> względem jednego sklepu.</div>'
              : '<div class="cmix-note">Jeden sklep ('+best.store+') wychodzi taniej lub tak samo — mniej zachodu, ta sama cena.</div>')
          : '<div class="cmix-note">To najtańszy sposób, jeśli żaden sklep nie ma całego koszyka.</div>')+
        '</div>';
    }

    body.innerHTML=
      '<div class="cart-head"><h1>Twój koszyk</h1><span class="res">'+r.N+' '+plural(r.N,"produkt","produkty","produktów")+'</span>'+
        '<button class="cart-share" id="cartShare" type="button">'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>Udostępnij</button>'+
        '<button class="cart-share" id="cartQR" type="button">'+
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3M20 14v.01M14 20h.01M17 20h.01M20 17v3"/></svg>Kod QR</button>'+
        '<button class="cart-clear" id="cartClear" type="button">Wyczyść</button></div>'+
      '<div class="cart-grid"><div class="cart-list">'+itemsHTML+'</div>'+
      '<aside class="cart-result">'+result+
        '<p class="cart-disc">Ceny i dostawa demonstracyjne — w wersji produkcyjnej pobierane z ofert sklepów. Koszt dostawy szacujemy z progu każdego sklepu.</p>'+
      '</aside></div>';

    document.getElementById("cartClear").addEventListener("click", function(){
      cart={}; saveCart(); renderCart(); toast("Koszyk wyczyszczony");
    });
    document.getElementById("cartShare").addEventListener("click", shareCartLink);
    document.getElementById("cartQR").addEventListener("click", showCartQR);
    var cb=document.getElementById("cwinCheckout");
    if(cb && best) cb.addEventListener("click", function(){ openCheckout(best.store); });
  }

  // ---------- „Dokończ zakupy" — otwieranie koszyka w sklepie ----------
  // Sklepy (Rossmann/Hebe/Notino/Ezebra...) nie udostepniaja linku, ktory
  // wypelnia caly koszyk — to mozliwe tylko na platformach typu Shopify
  // (/cart/id:ilosc,...), ktorych te drogerie nie uzywaja, i tylko z ID
  // produktow z feedu. Dlatego automatyzujemy realnie: otwieramy po kolei
  // kazdy produkt w wybranym sklepie i pilnujemy postepu. Gdy podłaczymy
  // feedy, buildStoreCartUrl() zwroci gotowy koszyk tam, gdzie sie da.
  var coStore=null, coItems=[], coOpened={};
  function openStoreLink(url){
    // window.open bez „noopener" zwraca uchwyt okna (truthy) przy sukcesie —
    // z „noopener" Chrome zwraca null i falszywie sygnalizuje blokade.
    try{
      var w=window.open(url,"_blank");
      if(w){ try{ w.opener=null; }catch(e){} return true; }
    }catch(e){}
    // fallback: klikniecie linku (najpewniejsze w geście użytkownika)
    try{
      var a=document.createElement("a"); a.href=url; a.target="_blank"; a.rel="noopener";
      document.body.appendChild(a); a.click(); a.remove(); return true;
    }catch(e2){}
    showLinkModal(url); return false;
  }
  // Gotowy koszyk sklepu, jesli platforma i dane na to pozwalaja (Shopify).
  // Dzis zwraca null (brak ID z feedu) — mechanizm gotowy na przyszlosc.
  function buildStoreCartUrl(store, items){
    var st=STORES[store]; if(!st) return null;
    if(st.cartPre==="shopify" && st.domain){
      var parts=items.map(function(x){ var vid=x.d.sku && x.d.sku[store]; return vid?vid+":"+x.qty:null; }).filter(Boolean);
      if(parts.length===items.length) return "https://"+st.domain+"/cart/"+parts.join(",");
    }
    return null;
  }
  function openCheckout(store){
    coStore=store; coOpened={};
    coItems=computeBasket().items.map(function(it){ return { d:it.d, qty:it.qty, url:offerUrlAt(it.d, store) }; });
    // gdyby sklep wspieral gotowy koszyk (np. Shopify z feedu) — od razu tam
    var pre=buildStoreCartUrl(store, coItems);
    if(pre){ openStoreLink(pre); return; }
    document.getElementById("coTitle").innerHTML='Dokończ zakupy w '+storeDot(store)+esc(store);
    document.getElementById("coLead").innerHTML=
      'Otwórz każdy produkt w <b>'+esc(store)+'</b> i dodaj go do koszyka sklepu. '+
      'Odhaczamy otwarte, żeby nic Ci nie umknęło.';
    renderCheckout();
    var m=document.getElementById("checkout"); m.hidden=false; document.body.style.overflow="hidden";
    document.getElementById("coOpenAll").focus();
  }
  function renderCheckout(){
    var n=coItems.length, opened=Object.keys(coOpened).length, all=opened>=n && n>0;
    document.getElementById("coProg").textContent=opened+" z "+n+" otwartych";
    document.getElementById("coBar").style.width=(n?Math.round(opened/n*100):0)+"%";
    document.getElementById("coOpenAll").innerHTML = all
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Wszystkie otwarte'
      : 'Otwórz wszystkie ('+(n-opened)+')';
    document.getElementById("coList").innerHTML=coItems.map(function(x,i){
      return '<div class="co-row'+(coOpened[i]?" done":"")+'">'+
        '<span class="co-num">'+(coOpened[i]
          ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>'
          : (i+1))+'</span>'+
        '<span class="co-nm"><b>'+esc(x.d.brand)+'</b> '+esc(x.d.name)+(x.qty>1?' <span class="co-q">×'+x.qty+'</span>':'')+'</span>'+
        '<span class="co-acts">'+
          '<button class="co-copy" data-cocopy="'+i+'" type="button" title="Kopiuj nazwę — wklej w wyszukiwarkę sklepu" aria-label="Kopiuj nazwę">'+
            '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>'+
          '<button class="co-open" data-co="'+i+'" type="button">'+(coOpened[i]?"Otwórz ponownie":"Otwórz")+
            ' <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></button>'+
        '</span></div>';
    }).join("");
  }
  function coOpen(i){
    var x=coItems[i]; if(!x) return;
    if(openStoreLink(x.url)){ coOpened[i]=1; renderCheckout(); }
  }
  document.getElementById("coList").addEventListener("click", function(e){
    var cp=e.target.closest("[data-cocopy]");
    if(cp){ var x=coItems[+cp.getAttribute("data-cocopy")];
      if(x) copyText(x.d.brand+" "+x.d.name, function(ok){ toast(ok?"Skopiowano nazwę — wklej w wyszukiwarkę sklepu":"Nie udało się skopiować"); });
      return; }
    var b=e.target.closest("[data-co]"); if(b) coOpen(+b.getAttribute("data-co"));
  });
  document.getElementById("coOpenAll").addEventListener("click", function(){
    // otwieramy sekwencyjnie z drobnym odstepem (przegladarki lubia blokowac
    // wiele okien naraz — odstep i gest uzytkownika zwiekszaja skutecznosc)
    coItems.forEach(function(x,i){
      setTimeout(function(){
        var w=null; try{ w=window.open(x.url,"_blank"); }catch(e){}
        if(w){ try{ w.opener=null; }catch(e){} coOpened[i]=1; renderCheckout(); }
        else if(i===0){ showLinkModal(x.url); }
      }, i*350);
    });
  });
  function closeCheckout(){ document.getElementById("checkout").hidden=true; document.body.style.overflow=""; }
  document.getElementById("coClose").addEventListener("click", closeCheckout);
  document.getElementById("checkout").addEventListener("click", function(e){ if(e.target===this) closeCheckout(); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !document.getElementById("checkout").hidden) closeCheckout(); });

  // klik w widoku koszyka
  document.getElementById("cartBody").addEventListener("click", function(e){
    var t=e.target;
    var inc=t.closest("[data-inc]"), dec=t.closest("[data-dec]"), rm=t.closest("[data-rm]"), op=t.closest("[data-open]");
    if(inc){ var i=+inc.getAttribute("data-inc"); setQty(i,(cart[i]||0)+1); return; }
    if(dec){ var j=+dec.getAttribute("data-dec"); setQty(j,(cart[j]||0)-1); return; }
    if(rm){ setQty(+rm.getAttribute("data-rm"),0); return; }
    if(op){ openPDP(+op.getAttribute("data-open")); }
  });

  function showCart(){
    homeEl.style.display="none"; pdpEl.style.display="none"; infoEl.style.display="none"; cartEl.style.display="block";
    curPdp=null; closeSug(); renderCart(); window.scrollTo({top:0,behavior:"auto"});
    navPush({view:"cart"});
  }
  document.getElementById("cartBtnTop").addEventListener("click", showCart);
  document.getElementById("cartBack").addEventListener("click", function(){ history.back(); });
  document.getElementById("pdpCart").addEventListener("click", function(){ if(curPdp!=null) addToCart(curPdp); });

  // ---------- nawigacja wstecz (przycisk „cofnij" w telefonie/przegladarce) ----------
  // Bez tego SPA nie tworzy wpisow w historii i przycisk wstecz jest wyszarzony.
  // Kazde wejscie w glebszy widok (produkt / koszyk / strona info) dokłada wpis,
  // a popstate przywraca poprzedni widok.
  var _navSuppress=false;
  function navPush(state){ if(_navSuppress) return; try{ history.pushState(state,""); }catch(e){} }
  window.addEventListener("popstate", function(e){
    _navSuppress=true;
    var s=e.state||{view:"home"};
    if(s.view==="pdp" && DATA[s.id]) openPDP(s.id);
    else if(s.view==="info") openInfo(s.key);
    else if(s.view==="cart") showCart();
    else showHome();
    _navSuppress=false;
  });

  function paintPdpCart(id){
    var b=document.getElementById("pdpCart"); if(!b) return;
    var on=inCart(id);
    b.classList.toggle("in", on);
    b.setAttribute("data-add", id);
    b.innerHTML=(on
      ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> W koszyku ('+cart[id]+') — dodaj kolejny'
      : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.3 12.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.2L22 7H6"/></svg> Dodaj do koszyka');
  }

  // ---------- otwieranie sklepow ----------
  // W Electronie link przejmuje main.js (shell.openExternal -> systemowa
  // przegladarka). W przegladarce probujemy window.open; jesli srodowisko
  // (np. sandbox podgladu) je blokuje, pokazujemy link do skopiowania.
  function fallbackCopy(t){
    var ta=document.createElement("textarea");
    ta.value=t; ta.style.position="fixed"; ta.style.opacity="0";
    document.body.appendChild(ta); ta.select();
    var ok=false; try{ ok=document.execCommand("copy"); }catch(e){}
    ta.remove(); return ok;
  }
  function copyText(t,done){
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(t).then(function(){done(true);},function(){done(fallbackCopy(t));});
    } else done(fallbackCopy(t));
  }
  var lmodal=document.getElementById("lmodal"), lmodalUrl=document.getElementById("lmodalUrl");
  function showLinkModal(url){
    lmodalUrl.textContent=url; lmodal.hidden=false;
    document.getElementById("lmodalCopy").focus();
  }
  document.getElementById("lmodalClose").addEventListener("click", function(){ lmodal.hidden=true; });
  lmodal.addEventListener("click", function(e){ if(e.target===lmodal) lmodal.hidden=true; });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape" && !lmodal.hidden) lmodal.hidden=true; });
  document.getElementById("lmodalCopy").addEventListener("click", function(){
    copyText(lmodalUrl.textContent, function(ok){
      toast(ok?"Link skopiowany — wklej go w przeglądarce":"Nie udało się skopiować — zaznacz link ręcznie");
      if(ok) lmodal.hidden=true;
    });
  });
  document.addEventListener("click", function(e){
    var a=e.target.closest("a.buy, a.cta");
    if(!a || IS_ELECTRON) return;
    e.preventDefault();
    var url=a.getAttribute("href");
    var w=null;
    try{ w=window.open(url,"_blank","noopener"); }catch(err){}
    if(!w) showLinkModal(url);
  });

  // ---------- wyszukiwarka: porownywarka + katalog live ----------
  // Wpisac mozna cokolwiek: najpierw trafienia z porownywarki cen,
  // ponizej produkty z otwartego katalogu (Open Beauty Facts, ~pol miliona
  // kosmetykow), na koncu wyszukiwanie frazy bezposrednio w sklepach.
  var sugRows=[], catCache={}, sugTimer=null, sugSeq=0;

  // Lokalny katalog realnych produktow (z sync/import-catalog.mjs).
  // Przeszukiwany offline; uzupelnia produkty z bazy cen o pelny katalog marek.
  var CATALOG = (typeof FEED_CATALOG!=="undefined") ? FEED_CATALOG.map(function(it){
    return { item:it, hay:slug((it.brand||"")+" "+it.name) };
  }) : [];
  function searchCatalog(q){
    var qn=slug(q); if(qn.length<2||!CATALOG.length) return [];
    var toks=qn.split(" ").filter(Boolean);
    return CATALOG.filter(function(c){
      return toks.every(function(t){ return c.hay.indexOf(t)>=0; });
    }).slice(0,5).map(function(c){ return c.item; });
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

  function remoteSearch(q, cb){
    var key=norm(q);
    if(catCache[key]){ cb(catCache[key]); return; }
    fetch("https://world.openbeautyfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(q)+
          "&search_simple=1&action=process&json=1&page_size=6&sort_by=unique_scans_n"+
          "&fields=code,product_name,brands,quantity,image_front_small_url,image_front_url")
      .then(function(r){ return r.json(); })
      .then(function(js){
        var items=(js.products||[]).filter(function(p){ return p.product_name; }).map(function(p){
          return { code:p.code, name:p.product_name, brand:(p.brands||"").split(",")[0].trim(),
                   qty:p.quantity||"", img:p.image_front_small_url||p.image_front_url||"" };
        });
        catCache[key]=items; cb(items);
      })
      .catch(function(){ cb(null); });
  }

  var genericImg={ img:{ form:"bottle", body:"#E9E9EE", cap:"#C9C9CE" } };
  function rowsHTML(q){
    var qn=slug(q), html="", firstCat=true, firstBrand=true;
    sugRows.forEach(function(r,i){
      if(r.t==="brand"){
        if(firstBrand){ html+='<div class="sug-sec">Marki</div>'; firstBrand=false; }
        var st=BRAND_STYLE[r.b];
        html+='<div class="sug-item" role="option" data-i="'+i+'">'+
          '<div class="sug-thumb brand-thumb"'+(st?' style="color:'+st[1]+'"':'')+'>'+
            esc(r.b.split(/\s+/).map(function(w){return w[0]||"";}).join("").slice(0,2).toUpperCase())+'</div>'+
          '<div class="sug-body"><div class="sug-name">'+hl(r.b,qn)+'</div>'+
          '<div class="sug-meta">marka · pełna oferta w sklepach</div></div></div>';
        return;
      }
      if(r.t==="local"){
        var d=r.d;
        html+='<div class="sug-item" role="option" data-i="'+i+'">'+
          '<div class="sug-thumb pv" data-pid="'+d.id+'">'+visualInner(d)+'</div>'+
          '<div class="sug-body"><div class="sug-name">'+hl(d.brand+" "+d.name,qn)+'</div>'+
          '<div class="sug-meta">'+d.cat+' · '+d.vol+'</div></div>'+
          '<div class="sug-price">od<b>'+money(d.low)+' zł</b></div></div>';
      } else if(r.t==="cat"){
        if(firstCat){ html+='<div class="sug-sec">Katalog kosmetyków</div>'; firstCat=false; }
        var it=r.item;
        html+='<div class="sug-item" role="option" data-i="'+i+'">'+
          '<div class="sug-thumb pv">'+productSVG(genericImg)+
            ((SHOW_CROWD_PHOTOS&&it.img)?'<img class="pphoto" alt="" loading="lazy" src="'+esc(it.img)+'">':'')+'</div>'+
          '<div class="sug-body"><div class="sug-name">'+hl((it.brand?it.brand+" ":"")+it.name,qn)+'</div>'+
          '<div class="sug-meta">'+(it.qty?it.qty+' · ':'')+'sprawdź ceny w sklepach</div></div></div>';
      } else {
        html+='<div class="sug-item sug-all" role="option" data-i="'+i+'">Szukaj „'+esc(q)+'" we wszystkich sklepach →</div>';
      }
    });
    return html;
  }

  function renderSuggest(){
    var q=qEl.value.trim();
    if(q.length<2){ closeSug(); return; }
    var local=search(q).slice(0,5);
    sugRows=local.map(function(d){ return {t:"local", d:d}; });
    var qn0=slug(q);
    BRAND_ALL.filter(function(b){ return norm(b).indexOf(qn0)>=0; }).slice(0,2).forEach(function(b){
      sugRows.push({t:"brand", b:b});
    });
    // lokalny katalog (offline) — realne produkty marek
    var localKeys0={};
    local.forEach(function(d){ localKeys0[compact(d.brand+d.name)]=1; });
    searchCatalog(q).forEach(function(it){
      if(!localKeys0[compact((it.brand||"")+it.name)]) sugRows.push({t:"cat", item:it});
    });
    sugRows.push({t:"all", q:q});
    activeIdx=-1;
    sugEl.innerHTML=rowsHTML(q);
    openSug();

    // katalog online: doładuj z opóźnieniem tylko gdy lokalny nie wystarczył
    if(sugRows.filter(function(r){return r.t==="cat";}).length>=3){ return; }
    clearTimeout(sugTimer);
    var seq=++sugSeq;
    sugTimer=setTimeout(function(){
      remoteSearch(q, function(items){
        if(seq!==sugSeq || !items || !items.length) return;
        var localKeys={};
        sugRows.forEach(function(r){ if(r.t==="local") localKeys[compact(r.d.brand+r.d.name)]=1; });
        var extra=items.filter(function(it){ return !localKeys[compact((it.brand||"")+it.name)]; }).slice(0,4)
          .map(function(it){ return {t:"cat", item:it}; });
        if(!extra.length) return;
        sugRows.splice(sugRows.length-1, 0, extra[0]); // keep "all" last
        for(var k=1;k<extra.length;k++) sugRows.splice(sugRows.length-1,0,extra[k]);
        activeIdx=-1;
        if(qEl.value.trim()===q && sugEl.classList.contains("show")) sugEl.innerHTML=rowsHTML(q);
      });
    }, 300);
  }

  function activateRow(i){
    var r=sugRows[i]; if(!r) return;
    if(r.t==="local") openPDP(r.d.id);
    else if(r.t==="cat") openCatalog(r.item);
    else if(r.t==="brand") openCatalog({ isBrand:true, name:r.b });
    else openCatalog({ query:true, name:r.q||qEl.value.trim() });
  }

  qEl.addEventListener("input", renderSuggest);
  qEl.addEventListener("focus", function(){ if(qEl.value.trim().length>=2) renderSuggest(); });
  qEl.addEventListener("blur", function(){ setTimeout(closeSug,150); });
  qEl.addEventListener("keydown", function(e){
    if(!sugEl.classList.contains("show")||!sugRows.length){ if(e.key==="Enter") doSearch(); return; }
    if(e.key==="ArrowDown"){ e.preventDefault(); activeIdx=Math.min(activeIdx+1,sugRows.length-1); paintAct(); }
    else if(e.key==="ArrowUp"){ e.preventDefault(); activeIdx=Math.max(activeIdx-1,0); paintAct(); }
    else if(e.key==="Enter"){ e.preventDefault(); if(activeIdx>=0) activateRow(activeIdx); else doSearch(); }
    else if(e.key==="Escape"){ closeSug(); }
  });
  function paintAct(){
    Array.prototype.forEach.call(sugEl.querySelectorAll(".sug-item"),function(el){
      el.classList.toggle("active",+el.getAttribute("data-i")===activeIdx);
    });
  }
  sugEl.addEventListener("mousedown", function(e){
    var it=e.target.closest(".sug-item"); if(it){ e.preventDefault(); activateRow(+it.getAttribute("data-i")); }
  });
  function doSearch(){
    var q=qEl.value.trim(); if(!q) return;
    var res=search(q);
    if(res.length) openPDP(res[0].id);
    else openCatalog({ query:true, name:q });
  }
  document.getElementById("goBtn").addEventListener("click", doSearch);

  // ---------- product page ----------
  var curPdp=null;
  var wishes=loadStore("blask.wishes");

  function searchUrl(store,q){
    var st=STORES[store]||{};
    return st.search ? st.search.replace("{q}", encodeURIComponent(q)) : st.url;
  }
  function setTracked(on){
    Array.prototype.forEach.call(document.querySelectorAll(".tracked-only"),function(el){
      el.style.display = on ? "" : "none";
    });
    document.getElementById("catPanel").hidden = on;
  }

  // Produkt spoza porownywarki (katalog / surowa fraza): pokazujemy karte
  // z wyszukiwaniem w sklepach zamiast tabeli cen.
  function openCatalog(item){
    curPdp=null; closeSug(); qEl.blur();
    var isQuery=!!item.query, isBrand=!!item.isBrand;
    document.getElementById("crumbs").innerHTML=
      '<button type="button" data-home>Strona główna</button><span class="sep">›</span>'+
      '<span>'+(isBrand?"Marki":(isQuery?"Wyszukiwanie":"Katalog kosmetyków"))+'</span>';
    var vis=document.getElementById("pdpVis");
    vis.classList.add("pv"); vis.removeAttribute("data-pid");
    var bStyle=isBrand?BRAND_STYLE[item.name]:null;
    vis.innerHTML=productSVG(bStyle?{img:{form:"bottle",body:bStyle[0],cap:bStyle[1],accent:bStyle[1],
        l1:item.name.toUpperCase().slice(0,14)}}:genericImg)+
      ((SHOW_CROWD_PHOTOS&&item.img)?'<img class="pphoto" alt="" src="'+esc(item.img)+'">':'');
    document.getElementById("pdpBrand").textContent=isBrand?"Marka":(item.brand||"");
    document.getElementById("pdpName").textContent=item.name;
    document.getElementById("pdpSub").textContent=
      (item.qty?item.qty+" · ":"")+(isBrand?"wszystkie produkty tej marki znajdziesz w sklepach poniżej"
        :(isQuery?"Twoje wyszukiwanie":"z otwartego katalogu kosmetyków"));
    document.getElementById("pdpRating").innerHTML="";
    setTracked(false);
    document.getElementById("catPanelHead").textContent = isBrand
      ? "Pełna oferta marki "+item.name
      : (isQuery ? "Sprawdź „"+item.name+"” bezpośrednio w sklepach"
                 : "Tego produktu nie ma jeszcze w porównywarce cen Blask");
    document.getElementById("catPanelSub").textContent = isBrand
      ? "Zobacz wszystkie produkty tej marki w poszczególnych drogeriach — jednym kliknięciem:"
      : "Sprawdź cenę bezpośrednio w sklepach — jednym kliknięciem:";

    var q=((item.brand?item.brand+" ":"")+item.name).trim();
    document.getElementById("catShops").innerHTML=Object.keys(STORES).map(function(s){
      if(!STORES[s].search) return "";
      return '<a class="buy" href="'+esc(searchUrl(s,q))+'" target="_blank" rel="noopener noreferrer">'+
        '<span class="store-dot" style="background:'+STORES[s].c+'"></span>Szukaj w '+s+'</a>';
    }).join("");

    var wkey=item.code?("c:"+item.code):("q:"+norm(item.name));
    var wb=document.getElementById("wishBtn");
    function paintWish(){
      wb.className="mini"+(wishes[wkey]?" on":"");
      wb.textContent=wishes[wkey]?"Na liście życzeń ✓":"Chcę porównywać ceny tego produktu";
    }
    paintWish();
    wb.onclick=function(){
      wishes[wkey]=!wishes[wkey]; if(!wishes[wkey]) delete wishes[wkey];
      saveStore("blask.wishes",wishes);
      toast(wishes[wkey]?"Zapisano — dodamy ten produkt do porównywarki":"Usunięto z listy życzeń");
      paintWish();
    };

    // Produkty tej marki z bazy cen (jesli mamy) — pokazujemy je na stronie marki
    var relHead=document.getElementById("relatedHead"), relEl=document.getElementById("related");
    if(isBrand){
      var mine=DATA.filter(function(d){ return d.brand===item.name; })
                   .sort(function(a,b){ return b.pop-a.pop; });
      // produkty tej marki z katalogu OBF (ze zdjeciami), pomijajac duplikaty cenowe
      var priced={}; mine.forEach(function(d){ priced[compact(d.brand+d.name)]=1; });
      _catItems = (typeof FEED_CATALOG!=="undefined")
        ? FEED_CATALOG.filter(function(x){ return slug(x.brand)===slug(item.name) && !priced[compact((x.brand||"")+x.name)]; })
        : [];
      _catItems.sort(function(a,b){ return (b.img?1:0)-(a.img?1:0); }); // ze zdjeciem najpierw
      var total=mine.length+_catItems.length;
      var withPhoto=SHOW_CROWD_PHOTOS ? (mine.filter(function(d){return d.photo||catalogPhoto(d);}).length + _catItems.filter(function(x){return x.img;}).length) : 0;
      if(total){
        relHead.textContent="Produkty marki "+item.name+" ("+total+
          (withPhoto?" · "+withPhoto+" ze zdjęciem":"")+")";
        relEl.innerHTML=mine.map(cardHTML).join("")+
          _catItems.slice(0,48).map(function(it,i){ return catalogCardHTML(it,i); }).join("");
      } else {
        relHead.textContent="Popularne w Blask";
        relEl.innerHTML=DATA.slice().sort(function(a,b){return b.pop-a.pop;}).slice(0,4).map(cardHTML).join("");
      }
    } else {
      _catItems=[];
      relHead.textContent="Popularne w Blask";
      relEl.innerHTML=DATA.slice().sort(function(a,b){return b.pop-a.pop;}).slice(0,4).map(cardHTML).join("");
    }

    homeEl.style.display="none"; infoEl.style.display="none"; cartEl.style.display="none"; pdpEl.style.display="block";
    window.scrollTo({top:0,behavior:"auto"});
    navPush({view:"catalog"});
  }
  // ---------- historia cen (backend: sync/history.mjs → history.js) ----------
  var HIST_DIAC={"ł":"l","ó":"o","ą":"a","ę":"e","ś":"s","ż":"z","ź":"z","ć":"c","ń":"n"};
  function histKey(s){ return (s||"").toLowerCase().replace(/[łóąęśżźćń]/g,function(m){return HIST_DIAC[m]||m;}).replace(/[^a-z0-9]+/g,""); }
  function shortDate(iso){ var p=iso.split("-"); return (+p[2])+"."+(+p[1]); }

  function renderPriceHist(d){
    var box=document.getElementById("priceHist");
    var H=(typeof PRICE_HISTORY!=="undefined")?PRICE_HISTORY[histKey(d.brand+d.name)]:null;
    if(!H||H.length<2){ box.innerHTML=""; box.style.display="none"; return; }
    box.style.display="";
    var series=H.slice(-30);
    var vals=series.map(function(pt){return pt[1];});
    var lo=Math.min.apply(null,vals), hi=Math.max.apply(null,vals);
    var cur=vals[vals.length-1], loIdx=vals.indexOf(lo);
    var span=(hi-lo)||1;
    // geometria wykresu
    var W=720, Hh=180, padL=8, padR=8, padT=16, padB=26;
    var iw=W-padL-padR, ih=Hh-padT-padB, n=series.length;
    function X(i){ return padL + (n===1?iw/2:iw*i/(n-1)); }
    function Y(v){ return padT + ih*(1-(v-lo)/span); }
    var pts=series.map(function(pt,i){return X(i)+","+Y(pt[1]);});
    var line="M"+pts.join(" L");
    var area=line+" L"+X(n-1)+","+(padT+ih)+" L"+X(0)+","+(padT+ih)+" Z";
    var curX=X(n-1), curY=Y(cur), loX=X(loIdx), loY=Y(lo);
    var trend=cur<vals[0], diff=Math.abs(cur-vals[0]);
    var trendTxt=diff<0.01
      ? 'bez zmian w ostatnich 30 dniach'
      : (trend?'spadła':'wzrosła')+' o '+money(diff)+' zł ('+Math.round(diff/vals[0]*100)+'%) w 30 dni';

    box.innerHTML=
      '<div class="ph-head"><h2>Historia ceny</h2>'+
        '<span class="ph-trend '+(diff<0.01?'flat':(trend?'down':'up'))+'">'+
        (diff<0.01?'':(trend
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 15l-6-6-6 6"/></svg>'))+
        trendTxt+'</span></div>'+
      '<div class="ph-chart"><svg viewBox="0 0 '+W+' '+Hh+'" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Wykres historii ceny">'+
        '<defs><linearGradient id="phFill" x1="0" y1="0" x2="0" y2="1">'+
          '<stop offset="0" stop-color="#F2E6A0" stop-opacity=".55"/>'+
          '<stop offset="1" stop-color="#F2E6A0" stop-opacity="0"/></linearGradient></defs>'+
        '<line class="ph-grid" x1="'+padL+'" y1="'+Y(hi)+'" x2="'+(W-padR)+'" y2="'+Y(hi)+'"/>'+
        '<line class="ph-grid" x1="'+padL+'" y1="'+Y(lo)+'" x2="'+(W-padR)+'" y2="'+Y(lo)+'"/>'+
        '<path d="'+area+'" fill="url(#phFill)"/>'+
        '<path d="'+line+'" fill="none" stroke="#D6A200" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>'+
        '<circle cx="'+loX+'" cy="'+loY+'" r="4.5" fill="#1F9D55"/>'+
        '<circle cx="'+curX+'" cy="'+curY+'" r="4.5" fill="#D6A200" stroke="#fff" stroke-width="2"/>'+
      '</svg></div>'+
      '<div class="ph-axis"><span>'+shortDate(series[0][0])+'</span>'+
        '<span class="ph-lo"><b style="color:#1F9D55">'+money(lo)+' zł</b> najniżej</span>'+
        '<span>'+shortDate(series[n-1][0])+' · dziś</span></div>';
  }

  function openPDP(id){
    curPdp=id;
    var d=DATA[id];
    closeSug(); qEl.blur();

    document.getElementById("crumbs").innerHTML=
      '<button type="button" data-home>Strona główna</button><span class="sep">›</span>'+
      '<button type="button" data-cat="'+esc(d.cat)+'">'+esc(d.cat)+'</button><span class="sep">›</span>'+
      '<span>'+esc(d.brand)+'</span>';
    var vis=document.getElementById("pdpVis");
    vis.classList.add("pv"); vis.setAttribute("data-pid",d.id);
    vis.innerHTML=visualInner(d);
    document.getElementById("pdpBrand").textContent=d.brand;
    document.getElementById("pdpName").textContent=d.name;
    document.getElementById("pdpSub").textContent=d.cat+" · "+d.vol;
    document.getElementById("pdpRating").innerHTML=starsHTML(d.rate)+' <b>'+d.rate.toFixed(1)+'</b> · '+d.votes.toLocaleString("pl-PL")+' ocen';

    setTracked(true);
    var shopQ=d.brand+" "+d.name.split(" ").slice(0,3).join(" ");
    document.getElementById("bbAmt").innerHTML=money(d.low)+'<span class="cur">zł</span>';
    document.getElementById("bbAt").innerHTML='w <b>'+d.lowStore+'</b>'+(d.ml?' · '+money(d.low/d.ml*100)+' zł / 100 ml':'');
    document.getElementById("bbCta").href=offerUrlAt(d, d.lowStore);
    document.getElementById("bbSave").innerHTML=d.save>0
      ? '<span class="save-note"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>Oszczędzasz do '+money(d.save)+' zł ('+d.savePct+'%) względem najdroższej oferty</span>' : '';

    paintPdpMini(id);
    paintPdpCart(id);

    document.getElementById("offCnt").textContent=" · "+d.offers.length+" "+plural(d.offers.length,"sklep","sklepy","sklepów");
    document.getElementById("offers").innerHTML=d.offers.map(function(o){
      var st=STORES[o.store]||{c:"#999",url:"#",dl:""};
      var best=o.inStock&&o.price===d.low&&o.store===d.lowStore;
      var action=o.inStock
        ? '<a class="buy" href="'+esc(offerUrlAt(d, o.store))+'" target="_blank" rel="noopener noreferrer">'+(best?"Kup najtaniej":"Do sklepu")+
          ' <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M7 7h10v10"/></svg></a>'
        : '<span class="oos-pill">Chwilowo niedostępny</span>';
      return '<div class="offer'+(best?" best":"")+(o.inStock?"":" oos")+'">'+
        '<div class="offer-store"><span class="store-dot" style="background:'+st.c+'"></span>'+
        '<div><div class="nm">'+o.store+(best?'<span class="bflag">najniższa cena</span>':'')+'</div>'+
        '<div class="dl">'+st.dl+'</div></div></div>'+
        '<div class="offer-price"><span class="now">'+money(o.price)+' zł</span>'+
        (o.was?'<span class="was">'+money(o.was)+' zł</span>':'')+
        (d.ml?'<div class="ppu">'+money(o.price/d.ml*100)+' zł / 100 ml</div>':'')+'</div>'+
        action+'</div>';
    }).join("");

    renderPriceHist(d);

    document.getElementById("mktStrip").innerHTML='<span class="lbl">Porównaj też na:</span>'+
      Object.keys(STORES).filter(function(s){return STORES[s].mkt&&STORES[s].search;}).map(function(s){
        return '<a class="buy" href="'+esc(searchUrl(s,shopQ))+'" target="_blank" rel="noopener noreferrer">'+
          '<span class="store-dot" style="background:'+STORES[s].c+'"></span>'+s+'</a>';
      }).join("");

    document.getElementById("relatedHead").textContent="Podobne produkty";
    var rel=DATA.filter(function(x){return x.cat===d.cat&&x.id!==d.id;}).sort(function(a,b){return b.pop-a.pop;}).slice(0,4);
    document.getElementById("related").innerHTML=rel.map(cardHTML).join("");

    homeEl.style.display="none"; infoEl.style.display="none"; cartEl.style.display="none"; pdpEl.style.display="block";
    window.scrollTo({top:0,behavior:"auto"});
    navPush({view:"pdp", id:id});
  }

  function paintPdpMini(id){
    var f=document.getElementById("pdpFav"), a=document.getElementById("pdpAlert");
    f.className="mini"+(favs[id]?" on":"");
    f.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(favs[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.4 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3.4 1-4.5 2.5C10.9 4 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.1 3 5.5l7 7z"/></svg> '+
      (favs[id]?"W ulubionych":"Do ulubionych");
    a.className="mini"+(alerts[id]?" on":"");
    a.innerHTML='<svg width="14" height="14" viewBox="0 0 24 24" fill="'+(alerts[id]?"currentColor":"none")+'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg> '+
      (alerts[id]?"Śledzisz cenę":"Alert cenowy");
    f.onclick=function(){toggleFav(id);};
    a.onclick=function(){toggleAlert(id);};
    document.getElementById("pdpShare").onclick=function(){
      var d=DATA[id], url=(STORES[d.lowStore]||{}).url||"";
      copyText(d.brand+" "+d.name+" — najtaniej "+money(d.low)+" zł w "+d.lowStore+": "+url, function(ok){
        toast(ok?"Skopiowano do schowka":"Nie udało się skopiować");
      });
    };
  }

  document.getElementById("crumbs").addEventListener("click", function(e){
    var b=e.target.closest("button"); if(!b) return;
    if(b.hasAttribute("data-home")){ showHome(); }
    else if(b.hasAttribute("data-cat")){
      activeCat=b.getAttribute("data-cat"); favMode=false;
      Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent===activeCat);});
      goHome(); renderGrid();
    }
  });

  function goHome(){
    pdpEl.style.display="none"; homeEl.style.display="block"; infoEl.style.display="none"; cartEl.style.display="none"; curPdp=null;
    brandFilter=null; qEl.value=""; closeSug(); window.scrollTo({top:0,behavior:"auto"});
  }

  // ---------- strony informacyjne (pod wnioski afiliacyjne) ----------
  var infoEl=document.getElementById("info");
  var INFO={
    about:
      '<h1>O nas</h1>'+
      '<p class="lede">Blask to niezależna porównywarka cen kosmetyków. Powstała z prostej frustracji: żeby kupić ulubiony krem najtaniej, trzeba było otwierać po kilka sklepów i porównywać ręcznie.</p>'+
      '<p>Zbieramy w jednym miejscu ceny popularnych kosmetyków z polskich drogerii i perfumerii — Rossmann, Hebe, Notino, Douglas, Sephora, Superpharm, eZebra i innych — i pokazujemy, gdzie dany produkt kupisz najkorzystniej.</p>'+
      '<h2>Jak zarabiamy</h2>'+
      '<p>Dla Ciebie Blask jest i pozostanie bezpłatny. Utrzymujemy się z prowizji afiliacyjnych wypłacanych przez sklepy, gdy przejdziesz do nich przez nasz link i dokonasz zakupu. Nie wpływa to na cenę, którą płacisz, ani na kolejność ofert — zawsze pokazujemy najniższą cenę na górze.</p>',
    contact:
      '<h1>Kontakt</h1>'+
      '<p class="lede">Masz pytanie, sugestię albo jesteś sklepem zainteresowanym współpracą? Napisz do nas.</p>'+
      '<div class="card"><p><b>E-mail:</b> kontakt@blask.pl</p>'+
      '<p><b>Współpraca dla sklepów:</b> partnerzy@blask.pl</p></div>'+
      '<p class="muted">Odpowiadamy zwykle w ciągu 1–2 dni roboczych.</p>',
    partners:
      '<h1>Dla sklepów i marek</h1>'+
      '<p class="lede">Docieraj do klientów w momencie decyzji zakupowej — gdy porównują ceny i są gotowi kupić.</p>'+
      '<h2>Dlaczego Blask</h2>'+
      '<ul>'+
      '<li><b>Ruch o wysokiej intencji zakupowej</b> — użytkownik porównywarki to klient z „koszykiem w ręku".</li>'+
      '<li><b>Pełna karta produktu</b> — Twoja oferta obok konkurencji, z Twoim logo, ceną i linkiem.</li>'+
      '<li><b>Codzienna aktualizacja</b> — ceny, promocje i zdjęcia pobieramy z Twojego feedu produktowego automatycznie.</li>'+
      '<li><b>Model rozliczenia za efekt</b> — płacisz prowizję tylko za realną sprzedaż (CPS), przez sieć afiliacyjną.</li>'+
      '</ul>'+
      '<h2>Jak zacząć</h2>'+
      '<p>Współpracujemy przez sieci afiliacyjne (Awin, webePartners, TradeDoubler) oraz bezpośrednio. Napisz na <b>partnerzy@blask.pl</b> — podeślemy szczegóły i podłączymy Twój feed.</p>'+
      '<a class="cta" href="#" data-info="contact">Napisz do nas</a>',
    affiliate:
      '<h1>Współpraca afiliacyjna</h1>'+
      '<p class="lede">Jawnie i uczciwie o tym, jak działają nasze linki.</p>'+
      '<p>Część linków w Blask to linki afiliacyjne. Oznacza to, że gdy przejdziesz przez nie do sklepu i dokonasz zakupu, sklep może wypłacić nam prowizję za polecenie.</p>'+
      '<ul>'+
      '<li>Prowizja <b>nie zmienia ceny</b>, którą płacisz — jest kosztem sklepu, nie Twoim.</li>'+
      '<li>Prowizja <b>nie wpływa na kolejność</b> ofert — najniższą cenę zawsze pokazujemy na górze.</li>'+
      '<li>Współpracujemy z sieciami afiliacyjnymi (m.in. Awin, webePartners) oraz bezpośrednio ze sklepami.</li>'+
      '</ul>'+
      '<p>Dzięki temu modelowi możemy utrzymywać Blask bezpłatnym dla Ciebie. Dziękujemy, że kupując przez nasze linki, wspierasz rozwój serwisu. 💜</p>',
    terms:
      '<h1>Regulamin</h1>'+
      '<p class="muted">Wzór do uzupełnienia przez właściciela serwisu i weryfikacji prawnej przed publikacją produkcyjną.</p>'+
      '<h2>1. Charakter serwisu</h2>'+
      '<p>Blask („Serwis") to bezpłatna porównywarka cen kosmetyków o charakterze informacyjnym. Serwis nie prowadzi sprzedaży produktów — umożliwia jedynie porównanie ofert i przejście do sklepów zewnętrznych.</p>'+
      '<h2>2. Ceny i dostępność</h2>'+
      '<p>Prezentowane ceny mają charakter orientacyjny i pochodzą z danych dostarczanych przez sklepy. O ostatecznej cenie, dostępności i warunkach zakupu decyduje wyłącznie sklep, do którego prowadzi link. Blask dokłada starań, aby dane były aktualne, lecz nie gwarantuje ich pełnej zgodności w każdym momencie.</p>'+
      '<h2>3. Linki afiliacyjne</h2>'+
      '<p>Serwis korzysta z linków afiliacyjnych. Zasady opisano w sekcji „Współpraca afiliacyjna".</p>'+
      '<h2>4. Odpowiedzialność</h2>'+
      '<p>Blask nie jest stroną transakcji zawieranych w sklepach zewnętrznych i nie ponosi odpowiedzialności za ich realizację, w tym za dostawę, płatność, reklamacje i zwroty.</p>'+
      '<h2>5. Kontakt</h2>'+
      '<p>W sprawach dotyczących Serwisu: kontakt@blask.pl.</p>',
    privacy:
      '<h1>Polityka prywatności</h1>'+
      '<p class="muted">Wzór do uzupełnienia (dane administratora, ewentualna analityka) i weryfikacji prawnej przed publikacją produkcyjną.</p>'+
      '<h2>1. Administrator danych</h2>'+
      '<p>Administratorem danych jest właściciel serwisu Blask. Kontakt: kontakt@blask.pl.</p>'+
      '<h2>2. Jakie dane przetwarzamy</h2>'+
      '<ul>'+
      '<li><b>Ulubione i alerty cenowe</b> zapisujemy wyłącznie lokalnie w Twojej przeglądarce (localStorage). Nie trafiają one na nasze serwery i nie wymagają konta.</li>'+
      '<li>Jeśli w przyszłości uruchomimy analitykę lub newsletter, poinformujemy o tym i poprosimy o zgodę tam, gdzie jest wymagana.</li>'+
      '</ul>'+
      '<h2>3. Linki do sklepów</h2>'+
      '<p>Po kliknięciu w link do sklepu lub link afiliacyjny Twoje dane przetwarza już dany sklep i sieć afiliacyjna zgodnie z ich politykami prywatności.</p>'+
      '<h2>4. Twoje prawa (RODO)</h2>'+
      '<p>Masz prawo dostępu do danych, ich sprostowania, usunięcia oraz ograniczenia przetwarzania. Dane w localStorage możesz w każdej chwili usunąć, czyszcząc dane strony w przeglądarce.</p>'+
      '<h2>5. Kontakt</h2>'+
      '<p>W sprawach prywatności: kontakt@blask.pl.</p>'
  };
  function openInfo(key){
    var html=INFO[key]; if(!html) return;
    document.getElementById("infoBody").innerHTML=html;
    homeEl.style.display="none"; pdpEl.style.display="none"; cartEl.style.display="none"; infoEl.style.display="block";
    closeSug(); window.scrollTo({top:0,behavior:"auto"});
    navPush({view:"info", key:key});
  }
  document.getElementById("infoBack").addEventListener("click", function(){ history.back(); });
  document.addEventListener("click", function(e){
    var a=e.target.closest("[data-info]"); if(!a) return;
    e.preventDefault(); openInfo(a.getAttribute("data-info"));
  });
  function showHome(){
    favMode=false; catalogMode=false; activeCat="Wszystkie";
    Array.prototype.forEach.call(catnav.children,function(x){x.classList.toggle("on",x.textContent==="Wszystkie");});
    goHome(); renderGrid();
  }
  document.getElementById("logoBtn").addEventListener("click", showHome);
  document.getElementById("logoBtn2").addEventListener("click", showHome);

  renderHomeSections();
  renderGrid();
  syncCounts();
  loadPhotos();
  // jesli wejscie z udostepnionego linku — zaladuj koszyk i pokaz go
  if(importSharedCart()){ showCart(); toast("Załadowano udostępniony koszyk 🛒"); }
})();
