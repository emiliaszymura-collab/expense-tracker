// Baza produktow Blask.
// RAW: [marka, nazwa, kategoria(T/M/C/W/Z), pojemnosc, cena bazowa zl, popularnosc]
// Oferty sklepow, oceny i promocje sa generowane deterministycznie z ceny
// bazowej (demo). W wersji produkcyjnej ten plik zastepuje feed cenowy
// z sieci afiliacyjnych, ktory niesie prawdziwe ceny i zdjecia.

var STORES = {
  "Rossmann":   { c:"#E4032E", url:"https://www.rossmann.pl",      search:"https://www.rossmann.pl/szukaj?Search={q}",                dl:"od 9,99 zł · darmowa od 99 zł" },
  "Hebe":       { c:"#00A9A7", url:"https://www.hebe.pl",          search:"https://www.hebe.pl/search?q={q}",                         dl:"od 8,99 zł · darmowa od 99 zł" },
  "Notino":     { c:"#E5006D", url:"https://www.notino.pl",        search:"https://www.notino.pl/search.asp?exps={q}",                dl:"od 9,90 zł · darmowa od 150 zł" },
  "Douglas":    { c:"#4A3A55", url:"https://www.douglas.pl",       search:"https://www.douglas.pl/pl/search?query={q}",               dl:"od 12,90 zł · darmowa od 150 zł" },
  "Sephora":    { c:"#7A4CC9", url:"https://www.sephora.pl",       search:"https://www.sephora.pl/szukaj?q={q}",                      dl:"od 13,99 zł · darmowa od 200 zł" },
  "Superpharm": { c:"#0072CE", url:"https://www.superpharm.pl",    search:"https://www.superpharm.pl/catalogsearch/result/?q={q}",    dl:"od 10,99 zł · darmowa od 129 zł" },
  "Ezebra":     { c:"#E09112", url:"https://www.ezebra.com.pl",    search:"https://www.ezebra.com.pl/search.php?text={q}",            dl:"od 8,90 zł · darmowa od 99 zł" },
  "e.Leclerc":  { c:"#0068B4", url:"https://www.zakupy.leclerc",   search:null,                                                       dl:"odbiór w sklepie" }
};

var CATS = ["Wszystkie","Pielęgnacja twarzy","Makijaż","Pielęgnacja ciała","Włosy","Zapachy"];
var CAT_CODE = { T:"Pielęgnacja twarzy", M:"Makijaż", C:"Pielęgnacja ciała", W:"Włosy", Z:"Zapachy" };

// Styl marki: [kolor opakowania, kolor zakretki/akcentu]
var BRAND_STYLE = {
  "La Roche-Posay":["#F2F4FA","#2F3E7C"], "CeraVe":["#F0F6FB","#1D6FB8"], "Cetaphil":["#EAF2F8","#2C6BA8"],
  "Bioderma":["#FBF0F5","#E2568F"], "Vichy":["#F0F7F4","#0F7A5A"], "Avène":["#FBF3EC","#E07B39"],
  "Eucerin":["#F8F6F1","#B99B5E"], "The Ordinary":["#FCFCFD","#1C1C1E"], "Paula's Choice":["#EAF3EE","#1C1C1E"],
  "Pixi":["#DEEEDF","#2E6B45"], "Bielenda":["#2C2833","#C9A96A"], "Ziaja":["#EFF7EF","#3E8E5A"],
  "Eveline":["#F7EFF4","#B8508A"], "AA":["#F0F4FA","#3E6DB0"], "Lirene":["#F5EFF7","#7A4CA8"],
  "Tołpa":["#EFEFEF","#4A4A4C"], "Nuxe":["#FBF3E4","#C9962E"], "Neutrogena":["#EAF0FA","#1F4FA8"],
  "Nivea":["#0E4C97","#0A3B75"], "Dove":["#FBF8F3","#C0A96A"], "Garnier":["#DFEEDC","#2E7D46"],
  "L'Oréal Paris":["#F5F1EA","#1C1C1E"], "Maybelline":["#A64E68","#5E1F35"], "NYX":["#F3E9EC","#1C1C1E"],
  "Wibo":["#F5E9EF","#B85E8A"], "Golden Rose":["#F5EFE0","#B8973E"], "Catrice":["#F0F0F2","#1C1C1E"],
  "Essence":["#FAF0F3","#D2317E"], "Makeup Revolution":["#F3EFF5","#8A8A8E"], "Bourjois":["#F7EFF2","#C05E7A"],
  "Rimmel":["#EFF2F7","#2C4E8A"], "Max Factor":["#F2F0EA","#8A7A4A"], "Inglot":["#EFEFEF","#1C1C1E"],
  "COSRX":["#FAF6EE","#D2905E"], "Some By Mi":["#F2F7F2","#5E8E6A"], "Beauty of Joseon":["#F7F2E9","#8A6D3B"],
  "BasicLab":["#F2F4F6","#3E5E8A"], "Resibo":["#F2F7EF","#5E9E4A"], "Nacomi":["#FBF5EF","#C9905E"],
  "Yope":["#FBF3EA","#C97A3E"], "OnlyBio":["#EFF7EF","#4A9E5E"], "Anwen":["#F5EFF7","#8A5EAD"],
  "L'biotica":["#F7EFEF","#B84E5E"], "Kérastase":["#1C1C1E","#C9A96A"], "Olaplex":["#FBFBFD","#1C1C1E"],
  "Moroccanoil":["#1E6E78","#C87E3E"], "Batiste":["#F5EFE5","#B85E2E"], "Head & Shoulders":["#FBFBFD","#2C6BA8"],
  "Schwarzkopf":["#F2F2F4","#8A1E2E"], "Syoss":["#1C1C1E","#C9A96A"], "Lancôme":["#F3C8D8","#C9C9CE"],
  "Yves Saint Laurent":["#EBDCA9","#C9A94F"], "Dior":["#25354F","#10151D"], "Chanel":["#FBFBFD","#1C1C1E"],
  "Giorgio Armani":["#2C2830","#8A8A8E"], "Paco Rabanne":["#C9A94F","#8A6D1E"], "Versace":["#F5EFDA","#C9A93E"],
  "Carolina Herrera":["#F7EFEF","#8A1E3E"], "Calvin Klein":["#F2F2F2","#4A4A4C"], "Hugo Boss":["#2C3440","#8A8A8E"],
  "Chloé":["#FBF3EC","#C99E6A"], "Mugler":["#2C1E3E","#8A5EAD"], "La Rive":["#F2EFF7","#7A6DAD"],
  "Rexona":["#EFF4FB","#2C6BA8"], "Old Spice":["#F7EFEA","#B83E2E"], "Carmex":["#F0DE6A","#B81E1E"],
  "Labello":["#2C6BA8","#1E4E7A"], "Bepanthen":["#EAF2FA","#5E9ED2"], "Sudocrem":["#EFEFF2","#8A8A8E"],
  "Johnson's":["#FBF5EF","#D2905E"], "Mixa":["#EFF4FB","#3E6DB0"], "Soraya":["#F7EFF2","#B8508A"],
  "Perfecta":["#F5EFF2","#8A3E5E"], "Flos-Lek":["#EFF7EF","#3E8E5A"], "Pharmaceris":["#F2F4F6","#2C4E8A"],
  "Iwostin":["#EAF2F8","#2C6BA8"], "Emolium":["#F5F1EA","#8A6D3B"], "Klorane":["#F2F7EF","#4A7A3E"],
  "e.l.f.":["#FBF7F2","#C9905E"], "Benefit":["#F7EFF2","#D2317E"], "MAC":["#1C1C1E","#4A4A4C"],
  "Estée Lauder":["#F5EFE5","#1E4E7A"], "Clinique":["#EFF7F5","#4A8A7A"], "The Inkey List":["#FBFBFD","#1C1C1E"],
  "Hada Labo":["#FBFBFD","#D2315E"], "Charlotte Tilbury":["#C09468","#6E4A2F"], "Rare Beauty":["#F5E9EC","#8A3752"],
  "Sol de Janeiro":["#F5C64F","#E8903A"], "Isana":["#F3F1F6","#9A8CC0"], "Maybelline NY":["#A64E68","#5E1F35"]
};

// Marki dostepne glownie w drogeriach (d), perfumeriach (p) lub wszedzie (x)
var BRAND_TIER = {
  d:["Ziaja","Eveline","AA","Lirene","Tołpa","Nivea","Dove","Garnier","Wibo","Golden Rose","Catrice","Essence",
     "Rimmel","Max Factor","Yope","OnlyBio","L'biotica","Batiste","Head & Shoulders","Schwarzkopf","Syoss",
     "La Rive","Rexona","Old Spice","Carmex","Labello","Sudocrem","Johnson's","Mixa","Soraya","Perfecta",
     "Flos-Lek","Isana","Neutrogena","Maybelline","NYX","L'Oréal Paris"],
  p:["Lancôme","Yves Saint Laurent","Dior","Chanel","Giorgio Armani","Paco Rabanne","Versace","Carolina Herrera",
     "Hugo Boss","Chloé","Mugler","Kérastase","Moroccanoil","Inglot","e.l.f.","Benefit","MAC","Estée Lauder",
     "Clinique","Charlotte Tilbury","Rare Beauty","Sol de Janeiro","Calvin Klein"]
};

var RAW = [
  // --- Pielęgnacja twarzy: dermokosmetyki ---
  ["La Roche-Posay","Cicaplast Baume B5 balsam regenerujący","T","40 ml",40,98],
  ["La Roche-Posay","Effaclar Duo(+) M krem przeciw niedoskonałościom","T","40 ml",70,91],
  ["La Roche-Posay","Anthelios UVMune 400 SPF50+ krem","T","50 ml",85,93],
  ["La Roche-Posay","Toleriane Sensitive krem nawilżający","T","40 ml",65,84],
  ["La Roche-Posay","Effaclar żel oczyszczający","T","200 ml",60,88],
  ["CeraVe","Krem nawilżający do twarzy i ciała","T","340 ml",52,96],
  ["CeraVe","Pianka oczyszczająca do skóry normalnej i tłustej","T","236 ml",44,88],
  ["CeraVe","Serum nawilżające z kwasem hialuronowym","T","30 ml",55,82],
  ["Cetaphil","Łagodna emulsja do mycia twarzy","T","236 ml",42,90],
  ["Cetaphil","Oczyszczający żel do mycia twarzy","T","236 ml",45,85],
  ["Cetaphil","MD Dermoprotektor balsam nawilżający","C","236 ml",40,83],
  ["Cetaphil","PRO ItchControl emulsja do ciała","C","295 ml",60,74],
  ["Bioderma","Sensibio H2O płyn micelarny","T","500 ml",58,90],
  ["Bioderma","Atoderm Intensive baume balsam","C","500 ml",70,81],
  ["Bioderma","Photoderm SPF50+ krem","T","40 ml",75,79],
  ["Vichy","Minéral 89 booster nawilżający","T","50 ml",80,83],
  ["Vichy","Liftactiv Collagen Specialist krem","T","50 ml",160,76],
  ["Vichy","Dercos szampon przeciwłupieżowy","W","200 ml",55,80],
  ["Avène","Cicalfate+ krem regenerujący","T","40 ml",55,86],
  ["Avène","Woda termalna w sprayu","T","300 ml",45,78],
  ["Avène","Cleanance żel oczyszczający","T","200 ml",58,80],
  ["Eucerin","Hyaluron-Filler krem na dzień","T","50 ml",120,82],
  ["Eucerin","DermoPure żel oczyszczający","T","200 ml",60,79],
  ["Eucerin","Aquaphor maść regenerująca","C","45 ml",50,77],
  ["Pharmaceris","A Sensilium krem łagodzący","T","50 ml",55,68],
  ["Iwostin","Solecrin krem ochronny SPF50+","T","50 ml",60,72],
  ["Bepanthen","Sensiderm krem łagodzący","C","50 g",35,80],
  ["Bepanthen","Baby maść ochronna","C","100 g",40,85],
  ["Sudocrem","Krem ochronny","C","125 g",30,76],
  ["Emolium","Emulsja do kąpieli","C","400 ml",55,70],
  // --- Pielęgnacja twarzy: apteczka azjatycka i aktywna ---
  ["The Ordinary","Niacinamide 10% + Zinc 1% serum","T","30 ml",34,94],
  ["The Ordinary","Hyaluronic Acid 2% + B5 serum","T","30 ml",37,87],
  ["The Ordinary","Glycolic Acid 7% tonik złuszczający","T","240 ml",55,84],
  ["The Ordinary","Caffeine Solution 5% serum pod oczy","T","30 ml",40,80],
  ["Paula's Choice","Skin Perfecting 2% BHA płyn złuszczający","T","118 ml",145,85],
  ["COSRX","Advanced Snail 96 Mucin esencja","T","100 ml",85,89],
  ["COSRX","Low pH Good Morning żel oczyszczający","T","150 ml",45,83],
  ["Some By Mi","AHA-BHA-PHA 30 Days Miracle tonik","T","150 ml",65,78],
  ["Beauty of Joseon","Relief Sun SPF50+ krem przeciwsłoneczny","T","50 ml",65,92],
  ["Beauty of Joseon","Glow Serum z propolisem","T","30 ml",60,84],
  ["Hada Labo","Gokujyun płyn nawilżający","T","170 ml",60,75],
  ["The Inkey List","Hyaluronic Acid serum","T","30 ml",40,73],
  ["BasicLab","Esteticus serum z retinolem 0,5%","T","30 ml",90,77],
  ["BasicLab","Micellis płyn micelarny","T","300 ml",40,72],
  ["Resibo","Sunny Sunscreen krem SPF50","T","50 ml",70,74],
  // --- Pielęgnacja twarzy: polskie i masowe ---
  ["Ziaja","Kozie mleko krem nawilżający","T","50 ml",12,85],
  ["Ziaja","Jaśminowy krem przeciwzmarszczkowy","T","50 ml",14,78],
  ["Ziaja","Med kuracja micelarna płyn","T","200 ml",17,74],
  ["Bielenda","Neuro Retinol krem-koncentrat na noc","T","50 ml",26,74],
  ["Eveline","Facemed+ płyn micelarny 3w1","T","400 ml",15,79],
  ["Eveline","Wonder Match podkład dopasowujący się","M","30 ml",28,76],
  ["AA","Tolerance krem nawilżający cera wrażliwa","T","50 ml",25,71],
  ["Lirene","Aqua Bubble krem nawilżający","T","50 ml",30,70],
  ["Tołpa","dermo face sebio norm krem matujący","T","40 ml",33,69],
  ["Mixa","Panthenol Comfort krem łagodzący","T","50 ml",35,72],
  ["Soraya","Ideal Beauty krem odżywczy","T","50 ml",25,64],
  ["Perfecta","Retinol krem przeciwzmarszczkowy 60+","T","50 ml",28,66],
  ["Flos-Lek","Krem pod oczy ze świetlikiem","T","30 ml",25,65],
  ["Neutrogena","Hydro Boost żel-krem nawilżający","T","50 ml",45,81],
  ["Garnier","Skin Naturals woda micelarna 3w1","T","400 ml",20,86],
  ["Garnier","Pure Active żel oczyszczający 3w1","T","150 ml",18,75],
  ["Nuxe","Huile Prodigieuse suchy olejek","C","100 ml",130,80],
  ["Nuxe","Rêve de Miel balsam do ust","T","15 g",45,77],
  ["Pixi","Glow Tonic tonik złuszczający","T","250 ml",72,76],
  ["Isana","Żel micelarny do mycia twarzy","T","200 ml",12,70],
  ["L'Oréal Paris","Revitalift Filler serum z kwasem hialuronowym","T","30 ml",90,82],
  // --- Pielęgnacja twarzy: premium ---
  ["Lancôme","Advanced Génifique serum","T","30 ml",320,79],
  ["Estée Lauder","Advanced Night Repair serum","T","30 ml",380,81],
  ["Clinique","Moisture Surge krem nawilżający","T","50 ml",180,78],
  // --- Makijaż ---
  ["Maybelline","Lash Sensational tusz do rzęs","M","9,5 ml",40,93],
  ["Maybelline","Fit Me podkład matujący","M","30 ml",40,88],
  ["Maybelline","Instant Anti-Age korektor","M","6,8 ml",35,86],
  ["Maybelline","SuperStay Matte Ink pomadka w płynie","M","5 ml",40,84],
  ["L'Oréal Paris","Infaillible 24H Fresh Wear podkład","M","30 ml",55,89],
  ["L'Oréal Paris","True Match podkład","M","30 ml",60,83],
  ["L'Oréal Paris","Telescopic tusz do rzęs","M","8 ml",55,81],
  ["NYX","Butter Gloss błyszczyk do ust","M","8 ml",24,81],
  ["NYX","Micro Brow Pencil kredka do brwi","M","0,09 g",40,78],
  ["NYX","Soft Matte Lip Cream pomadka","M","8 ml",30,76],
  ["Essence","Lash Princess tusz do rzęs","M","12 ml",20,90],
  ["Essence","Juicy Bomb błyszczyk","M","10 ml",15,79],
  ["Catrice","All Matt puder matujący","M","10 g",25,77],
  ["Rimmel","Stay Matte puder","M","14 g",30,74],
  ["Max Factor","False Lash Effect tusz do rzęs","M","13 ml",55,73],
  ["Bourjois","Healthy Mix podkład rozświetlający","M","30 ml",65,75],
  ["Makeup Revolution","Conceal & Define korektor","M","4 ml",30,78],
  ["Wibo","Get Loose puder sypki","M","9 g",20,66],
  ["Golden Rose","Longstay konturówka do ust","M","1,6 g",12,68],
  ["Inglot","YSM podkład kryjący","M","30 ml",95,70],
  ["Rare Beauty","Soft Pinch Liquid Blush róż w płynie","M","7,5 ml",113,92],
  ["Charlotte Tilbury","Airbrush Flawless Setting Spray","M","100 ml",175,84],
  ["e.l.f.","Halo Glow Liquid Filter rozświetlacz","M","31 ml",70,82],
  ["Benefit","They're Real! tusz do rzęs","M","8,5 g",130,77],
  ["MAC","Ruby Woo pomadka matowa","M","3 g",120,79],
  ["Yves Saint Laurent","Touche Éclat rozświetlacz w piórze","M","2,5 ml",180,76],
  ["Dior","Addict Lip Glow balsam koloryzujący","M","3,2 g",180,83],
  ["Carmex","Balsam do ust classic","M","7,5 g",18,75],
  ["Labello","Original balsam do ust","M","4,8 g",12,80],
  // --- Pielęgnacja ciała ---
  ["Nivea","Q10 balsam ujędrniający do ciała","C","400 ml",30,78],
  ["Nivea","Creme krem uniwersalny","C","75 ml",12,85],
  ["Nivea","Soft krem nawilżający","C","200 ml",18,83],
  ["Nivea","Sun Protect & Moisture balsam SPF30","C","200 ml",40,79],
  ["Dove","Deep Moisture żel pod prysznic","C","500 ml",15,82],
  ["Dove","Original antyperspirant w kulce","C","50 ml",10,78],
  ["Rexona","Invisible antyperspirant spray","C","150 ml",12,75],
  ["Old Spice","Whitewater dezodorant","C","150 ml",15,74],
  ["Sol de Janeiro","Brazilian Bum Bum krem do ciała","C","240 ml",179,86],
  ["CeraVe","SA balsam wygładzający","C","473 ml",64,79],
  ["Ziaja","Kakaowe masło balsam do ciała","C","300 ml",15,76],
  ["Eveline","Slim Extreme 4D serum antycellulitowe","C","250 ml",25,68],
  ["Nacomi","Olej ze słodkich migdałów","C","50 ml",20,67],
  ["Yope","Mydło w płynie werbena","C","500 ml",20,71],
  ["Johnson's","Oliwka pielęgnacyjna","C","300 ml",18,72],
  ["Neutrogena","Norweska formuła krem do rąk","C","75 ml",18,84],
  ["Garnier","Ambre Solaire mleczko SPF50","C","200 ml",45,77],
  // --- Włosy ---
  ["Olaplex","No.3 Hair Perfector kuracja","W","100 ml",95,88],
  ["Olaplex","No.4 Bond Maintenance szampon","W","250 ml",130,82],
  ["Olaplex","No.5 Bond Maintenance odżywka","W","250 ml",135,80],
  ["Kérastase","Elixir Ultime olejek do włosów","W","100 ml",180,78],
  ["Moroccanoil","Treatment olejek arganowy","W","100 ml",190,77],
  ["Garnier","Botanic Therapy odżywka Miód i Wosk","W","200 ml",20,72],
  ["L'Oréal Paris","Elseve Full Resist szampon wzmacniający","W","400 ml",20,76],
  ["Schwarzkopf","Gliss Ultimate Repair szampon","W","400 ml",20,73],
  ["Syoss","Keratin szampon","W","440 ml",20,70],
  ["Head & Shoulders","Classic Clean szampon przeciwłupieżowy","W","400 ml",25,75],
  ["Batiste","Original suchy szampon","W","200 ml",22,79],
  ["Anwen","Emolientowa Róża odżywka","W","200 ml",35,73],
  ["L'biotica","Biovax maska intensywnie regenerująca","W","250 ml",25,71],
  ["OnlyBio","Hair Balance szampon","W","300 ml",22,66],
  ["Yope","Szampon świeża trawa","W","300 ml",28,67],
  ["Ziaja","Szampon intensywnie regenerujący","W","300 ml",13,69],
  ["Klorane","Szampon z pokrzywą przeciw przetłuszczaniu","W","400 ml",65,68],
  ["Bielenda","Botanic Spa szampon rewitalizujący","W","400 ml",22,63],
  // --- Zapachy ---
  ["Lancôme","La Vie Est Belle woda perfumowana","Z","50 ml",340,90],
  ["Yves Saint Laurent","Libre woda perfumowana","Z","50 ml",379,87],
  ["Dior","Sauvage woda toaletowa","Z","60 ml",359,89],
  ["Dior","Miss Dior woda perfumowana","Z","50 ml",560,84],
  ["Chanel","No 5 woda perfumowana","Z","50 ml",620,82],
  ["Chanel","Coco Mademoiselle woda perfumowana","Z","50 ml",640,85],
  ["Giorgio Armani","Sì woda perfumowana","Z","50 ml",420,83],
  ["Paco Rabanne","1 Million woda toaletowa","Z","100 ml",380,81],
  ["Versace","Bright Crystal woda toaletowa","Z","90 ml",350,79],
  ["Carolina Herrera","Good Girl woda perfumowana","Z","80 ml",480,82],
  ["Calvin Klein","CK One woda toaletowa","Z","200 ml",180,74],
  ["Hugo Boss","Boss Bottled woda toaletowa","Z","100 ml",320,78],
  ["Chloé","Chloé woda perfumowana","Z","75 ml",430,77],
  ["Mugler","Alien woda perfumowana","Z","60 ml",450,76],
  ["La Rive","Queen of Life woda perfumowana","Z","75 ml",25,65]
];

// ---------- generator ofert (deterministyczny) ----------
function _hash(s){
  var h=5381;
  for(var i=0;i<s.length;i++){ h=((h<<5)+h+s.charCodeAt(i))>>>0; }
  return h;
}
function _lum(hex){
  var n=parseInt(hex.slice(1),16);
  return (0.299*((n>>16)&255)+0.587*((n>>8)&255)+0.114*(n&255))/255;
}
function _round(p){
  if(p>=100) return Math.round(p);
  var g=Math.max(1,Math.round(p));
  return g-0.01; // koncowka .99
}
function _form(name,vol,h){
  var n=name.toLowerCase();
  var ml=parseFloat((vol||"").replace(",","."))||50;
  if(/tusz|mascara/.test(n)) return "mascara";
  if(/podkład|foundation/.test(n)) return "glass";
  if(/perfum|woda perfumowana|woda toaletowa/.test(n)) return "perfume";
  if(/błyszczyk|korektor|pomadka w płynie|lip cream|blush|rozświetlacz w/.test(n)) return "gloss";
  if(/pomadka|balsam do ust|konturówka|kredka/.test(n)) return "mascara";
  if(/spray|mgiełka|dezodorant|antyperspirant|suchy szampon|woda termalna/.test(n)) return "spray";
  if(/serum|olejek|olej |esencja|booster/.test(n)) return "dropper";
  if(/puder|maska |masło|maść/.test(n)) return "jar";
  if(/tonik|płyn micelarny|woda micelarna|płyn |kuracja micelarna/.test(n)) return "toner";
  if(/pianka|żel oczyszczający|żel do mycia|żel-krem|mydło|emulsja do mycia/.test(n)) return "pump";
  if(/szampon|odżywka|żel pod prysznic|emulsja|mleczko|oliwka|balsam/.test(n)) return ml<=100?"tube":"bottle";
  if(/krem/.test(n)) return ml<=75?(h%2?"tube":"jar"):"pump";
  return "bottle";
}
var P = RAW.map(function(r){
  var brand=r[0], name=r[1], cat=CAT_CODE[r[2]], vol=r[3], base=r[4], pop=r[5];
  var h=_hash(brand+name);
  var style=BRAND_STYLE[brand]||["#EFEFF2","#8A8A8E"];
  var tier = BRAND_TIER.p.indexOf(brand)>=0 ? "p" : (BRAND_TIER.d.indexOf(brand)>=0 ? "d" : "x");
  var pool = tier==="p" ? ["Notino","Douglas","Sephora","Ezebra"]
           : tier==="d" ? ["Rossmann","Hebe","Superpharm","e.Leclerc","Ezebra","Notino"]
           : ["Rossmann","Hebe","Notino","Superpharm","Douglas","Ezebra"];
  var count = tier==="p" ? 3+(h%2) : 4+(h%3);
  count=Math.min(count,pool.length);
  var offers={}, rot=h%pool.length;
  for(var i=0;i<count;i++){
    var s=pool[(rot+i)%pool.length];
    var hs=_hash(brand+name+s);
    var price=_round(base*(0.95+(hs%18)/100)); // 0.95x - 1.12x
    var entry={p:price};
    if(hs%4===0) entry.w=_round(price*1.18);   // promocja: cena przekreslona
    offers[s]=entry;
  }
  var words=name.split(" ");
  var body=style[0];
  return {
    brand:brand, name:name, cat:cat, vol:vol, pop:pop,
    rate:+(4.0+(h%9)/10).toFixed(1), votes:150+(h%5850),
    kw:"",
    img:{ form:_form(name,vol,h), body:body, cap:style[1], accent:style[1],
          tx:_lum(body)<0.5?"#F5F2F7":null,
          l1:(words[0]||"").toUpperCase().slice(0,14), l2:words.slice(1,3).join(" ") },
    o:offers
  };
});
