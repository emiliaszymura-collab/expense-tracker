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
  "Sephora":    { c:"#7A4CC9", url:"https://www.sephora.pl",       search:null,                                                       dl:"od 13,99 zł · darmowa od 200 zł" },
  "Superpharm": { c:"#0072CE", url:"https://www.superpharm.pl",    search:"https://www.superpharm.pl/catalogsearch/result/?q={q}",    dl:"od 10,99 zł · darmowa od 129 zł" },
  "Ezebra":     { c:"#E09112", url:"https://www.ezebra.pl",        search:"https://www.ezebra.pl/pl/searchquery/{q}",                 dl:"od 8,90 zł · darmowa od 99 zł" },
  // Marketplace'y — wyszukiwanie (ceny z feedow/API mozna podpiac pozniej)
  "Allegro":    { c:"#FF5A00", url:"https://allegro.pl",           search:"https://allegro.pl/listing?string={q}",                    dl:"wielu sprzedawców", mkt:true },
  "Amazon.pl":  { c:"#FF9900", url:"https://www.amazon.pl",        search:"https://www.amazon.pl/s?k={q}",                            dl:"marketplace", mkt:true },
  "Empik":      { c:"#2B2B2B", url:"https://www.empik.com",        search:"https://www.empik.com/szukaj/produkt?q={q}",               dl:"Empik Place", mkt:true },
  "Ceneo":      { c:"#F47820", url:"https://www.ceneo.pl",         search:"https://www.ceneo.pl/;szukaj-{q}",                         dl:"porównywarka", mkt:true }
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
  "Sol de Janeiro":["#F5C64F","#E8903A"], "Isana":["#F3F1F6","#9A8CC0"], "Maybelline NY":["#A64E68","#5E1F35"],
  "Huda Beauty":["#3A2A3E","#C9962E"], "Fenty Beauty":["#F2E9E0","#8A6D5E"], "NARS":["#1C1C1E","#8A8A8E"],
  "Anastasia Beverly Hills":["#2C2830","#C9A96A"], "Too Faced":["#F7D9E4","#C05E8A"], "Urban Decay":["#3E3444","#8A5EAD"],
  "Tarte":["#5E3A6B","#C99E6A"], "KVD Beauty":["#1C1C1E","#B81E2E"], "Milk Makeup":["#F2F2F4","#4A4A4C"],
  "Sephora Collection":["#1C1C1E","#E4779A"], "Laura Mercier":["#F5EFE5","#8A7A5E"], "Drunk Elephant":["#F7E9A8","#C05E8A"],
  "Glow Recipe":["#F7D9DE","#E86F8A"], "Laneige":["#DEEBF7","#3E6DB0"], "Summer Fridays":["#F2E9DE","#8A7A6A"],
  "Youth To The People":["#EFF4EF","#3E5E4A"], "Caudalie":["#F2EFE9","#8A3E5E"], "Clarins":["#B81E3E","#8A1E2E"],
  "Shiseido":["#F7F2EE","#8A1E2E"], "Kiehl's":["#FBFBFD","#1C1C1E"], "Burberry":["#F2EFE9","#8A7A5E"],
  "Jean Paul Gaultier":["#5E7A8A","#2C4E5E"], "Valentino":["#F5D9DE","#B81E3E"], "Prada":["#1C1C1E","#8A8A8E"],
  "Kayali":["#C9A94F","#8A6D1E"], "Bell":["#F5EFF2","#B85E8A"], "Lovely":["#F7E9EF","#D2317E"],
  "Claresa":["#F5E9EC","#C05E7A"], "Delia":["#F0F4FA","#3E6DB0"], "Dermacol":["#F2F2F4","#1C1C1E"],
  "Revlon":["#1C1C1E","#B81E2E"], "Wet n Wild":["#F5EFDA","#C9A93E"], "Paese":["#F5EFE5","#8A6D3B"],
  "Pierre René":["#EFEFF2","#4A4A4C"], "Under Twenty":["#DEF2EF","#2C8A7A"], "Pantene":["#F5EFDA","#C9A93E"],
  "OGX":["#EFE9DE","#8A6D3B"], "Aussie":["#7A2D8E","#4A1E5E"], "John Frieda":["#2C2830","#C9A96A"],
  "Palmolive":["#DFEEDC","#2E7D46"], "Vaseline":["#EAF0FA","#1F4FA8"], "Anua":["#EFF4EF","#5E8E6A"],
  "Skin1004":["#F2F7F2","#3E6B4A"], "Round Lab":["#EAF2F8","#5E8AA8"], "Torriden":["#DEEBF7","#3E6DB0"],
  "Purito":["#EFF7EF","#4A9E5E"], "Mixsoon":["#F5F1EA","#8A7A5E"]
};

// Marki dostepne glownie w drogeriach (d), perfumeriach (p) lub wszedzie (x)
var BRAND_TIER = {
  d:["Ziaja","Eveline","AA","Lirene","Tołpa","Nivea","Dove","Garnier","Wibo","Golden Rose","Catrice","Essence",
     "Rimmel","Max Factor","Yope","OnlyBio","L'biotica","Batiste","Head & Shoulders","Schwarzkopf","Syoss",
     "La Rive","Rexona","Old Spice","Carmex","Labello","Sudocrem","Johnson's","Mixa","Soraya","Perfecta",
     "Flos-Lek","Isana","Neutrogena","Maybelline","NYX","L'Oréal Paris",
     "Bell","Lovely","Claresa","Delia","Dermacol","Revlon","Wet n Wild","Paese","Pierre René","Under Twenty",
     "Pantene","OGX","Aussie","John Frieda","Palmolive","Vaseline"],
  p:["Lancôme","Yves Saint Laurent","Dior","Chanel","Giorgio Armani","Paco Rabanne","Versace","Carolina Herrera",
     "Hugo Boss","Chloé","Mugler","Kérastase","Moroccanoil","Inglot","e.l.f.","Benefit","MAC","Estée Lauder",
     "Clinique","Charlotte Tilbury","Rare Beauty","Sol de Janeiro","Calvin Klein",
     "Huda Beauty","Fenty Beauty","NARS","Anastasia Beverly Hills","Too Faced","Urban Decay","Tarte","KVD Beauty",
     "Milk Makeup","Sephora Collection","Laura Mercier","Drunk Elephant","Glow Recipe","Summer Fridays",
     "Youth To The People","Caudalie","Clarins","Shiseido","Kiehl's","Burberry","Jean Paul Gaultier","Valentino",
     "Prada","Kayali"]
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
  ["La Rive","Queen of Life woda perfumowana","Z","75 ml",25,65],
  // --- Sephora: makijaż premium ---
  ["Huda Beauty","Easy Bake puder sypki utrwalający","M","20 g",120,88],
  ["Huda Beauty","FauxFilter Luminous Matte podkład","M","35 ml",180,86],
  ["Huda Beauty","Legit Lashes tusz do rzęs","M","12 ml",130,82],
  ["Huda Beauty","Obsessions paleta cieni Rose Quartz","M","10 g",150,84],
  ["Fenty Beauty","Pro Filt'r Soft Matte podkład","M","32 ml",170,87],
  ["Fenty Beauty","Gloss Bomb Universal błyszczyk","M","9 ml",95,89],
  ["Fenty Beauty","Killawatt rozświetlacz","M","7,8 g",160,83],
  ["NARS","Radiant Creamy korektor","M","6 ml",140,85],
  ["NARS","Blush róż Orgasm","M","4,8 g",150,84],
  ["Anastasia Beverly Hills","Brow Wiz kredka do brwi","M","0,085 g",110,85],
  ["Anastasia Beverly Hills","Dipbrow Pomade pomada do brwi","M","4 g",100,80],
  ["Too Faced","Better Than Sex tusz do rzęs","M","8 ml",120,81],
  ["Urban Decay","All Nighter spray utrwalający makijaż","M","116 ml",140,83],
  ["Urban Decay","Naked3 paleta cieni","M","15,6 g",230,79],
  ["Tarte","Shape Tape korektor","M","10 ml",140,82],
  ["KVD Beauty","Tattoo Liner eyeliner w pisaku","M","0,55 ml",110,78],
  ["Milk Makeup","Hydro Grip baza pod makijaż","M","45 ml",160,77],
  ["Sephora Collection","Cream Lip Stain pomadka w płynie","M","5 ml",60,80],
  ["Sephora Collection","Best Skin Ever podkład","M","25 ml",90,75],
  ["Laura Mercier","Translucent puder sypki","M","29 g",190,78],
  ["Benefit","Hoola bronzer matowy","M","8 g",150,80],
  ["Benefit","Benetint tint do ust i policzków","M","12,5 ml",120,74],
  ["Charlotte Tilbury","Pillow Talk pomadka","M","3,5 g",170,85],
  ["Charlotte Tilbury","Hollywood Flawless Filter rozświetlacz","M","30 ml",200,86],
  ["MAC","Studio Fix Fluid podkład SPF15","M","30 ml",160,81],
  ["MAC","Prep + Prime Fix+ mgiełka utrwalająca","M","100 ml",120,79],
  ["Rare Beauty","Perfect Strokes tusz do rzęs","M","8,5 ml",105,80],
  ["Yves Saint Laurent","Lash Clash tusz do rzęs","M","8,5 ml",160,77],
  ["Lancôme","Teint Idole Ultra Wear podkład","M","30 ml",210,78],
  ["Lancôme","Hypnôse tusz do rzęs","M","6,2 ml",150,76],
  ["Estée Lauder","Double Wear podkład długotrwały","M","30 ml",220,82],
  ["Giorgio Armani","Luminous Silk podkład","M","30 ml",260,80],
  ["Dior","Backstage Face & Body podkład","M","50 ml",200,79],
  ["Dior","Forever Skin Glow podkład","M","30 ml",250,81],
  // --- Sephora: pielęgnacja premium ---
  ["Drunk Elephant","Protini Polypeptide krem peptydowy","T","50 ml",320,78],
  ["Glow Recipe","Watermelon Glow PHA+BHA tonik","T","150 ml",145,82],
  ["Glow Recipe","Watermelon Glow Niacinamide Dew Drops serum","T","40 ml",160,84],
  ["Laneige","Lip Sleeping Mask maska do ust na noc","T","20 g",95,90],
  ["Laneige","Water Bank Blue Hyaluronic krem","T","50 ml",170,79],
  ["Summer Fridays","Jet Lag Mask maska nawilżająca","T","64 ml",220,76],
  ["Summer Fridays","Lip Butter Balm balsam do ust","T","15 g",110,83],
  ["Youth To The People","Superfood żel oczyszczający","T","237 ml",160,75],
  ["Caudalie","Beauty Elixir mgiełka do twarzy","T","100 ml",180,77],
  ["Caudalie","Vinoperfect serum rozświetlające","T","30 ml",220,76],
  ["Clarins","Double Serum kuracja przeciwstarzeniowa","T","30 ml",320,77],
  ["Shiseido","Ultimune serum wzmacniające","T","30 ml",340,74],
  ["Kiehl's","Midnight Recovery olejek na noc","T","30 ml",190,78],
  ["Kiehl's","Ultra Facial Cream krem nawilżający","T","50 ml",150,80],
  // --- K-beauty (Hebe / Notino / Douglas) ---
  ["Anua","Heartleaf 77% Soothing tonik","T","250 ml",95,86],
  ["Skin1004","Madagascar Centella ampułka","T","55 ml",80,84],
  ["Round Lab","1025 Dokdo tonik nawilżający","T","200 ml",75,82],
  ["Torriden","Dive-In serum z kwasem hialuronowym","T","50 ml",85,83],
  ["Purito","Wonder Releaf Centella krem","T","50 ml",70,78],
  ["Mixsoon","Bean esencja fermentowana","T","50 ml",90,76],
  // --- makijaż drogeryjny: polskie i masowe ---
  ["Bell","HypoAllergenic podkład nawilżający","M","30 g",25,72],
  ["Lovely","Full Matte pomadka w płynie","M","4 g",12,68],
  ["Claresa","Lakier hybrydowy Red 101","M","5 g",25,74],
  ["Delia","Eyebrow Expert henna do brwi","M","15 ml",15,70],
  ["Dermacol","Make-up Cover podkład ekstrakryjący","M","30 g",40,79],
  ["Revlon","ColorStay podkład matujący","M","30 ml",70,75],
  ["Wet n Wild","MegaGlo rozświetlacz","M","5,4 g",30,73],
  ["Paese","Run For Cover korektor","M","9 ml",40,71],
  ["Pierre René","Natural Glow podkład","M","30 ml",50,66],
  ["Inglot","Duraline płyn do cieni","M","9 ml",60,69],
  ["NYX","Matte Finish spray utrwalający","M","60 ml",45,77],
  ["NYX","Jumbo kredka do oczu Milk","M","5 g",25,76],
  ["Maybelline","Sky High tusz do rzęs","M","7,2 ml",50,91],
  ["Maybelline","SuperStay Vinyl Ink pomadka","M","4,2 ml",45,82],
  ["L'Oréal Paris","Paradise Extatic tusz do rzęs","M","6,4 ml",50,78],
  ["Rimmel","Kind & Free podkład","M","30 ml",45,72],
  ["Catrice","True Skin podkład nawilżający","M","30 ml",30,76],
  ["Essence","Baby Got Blush róż w sztyfcie","M","5,5 g",18,78],
  ["Essence","8h Matte pomadka w płynie","M","2,5 ml",15,75],
  ["Golden Rose","Velvet Matte pomadka","M","4,2 g",15,69],
  // --- pielęgnacja drogeryjna: uzupełnienia ---
  ["Garnier","Vitamin C serum rozświetlające","T","30 ml",40,85],
  ["Nivea","Cellular Luminous630 serum na przebarwienia","T","30 ml",80,79],
  ["L'Oréal Paris","Hyaluron Specialist krem wypełniający","T","50 ml",55,77],
  ["Ziaja","Manuka tonik normalizujący","T","200 ml",12,71],
  ["Bielenda","Skin Clinic Professional serum z witaminą C","T","30 ml",35,75],
  ["Eveline","Retinol Gold Lift krem-serum","T","50 ml",30,70],
  ["Under Twenty","Anti! Acne żel oczyszczający","T","150 ml",20,68],
  // --- ciało: uzupełnienia ---
  ["Palmolive","Naturals żel pod prysznic mleko i miód","C","500 ml",12,74],
  ["Vaseline","Intensive Care Advanced Repair balsam","C","400 ml",25,76],
  ["Bielenda","Vanilla Macadamia balsam do ciała","C","400 ml",25,69],
  // --- włosy: uzupełnienia ---
  ["Pantene","Repair & Protect szampon","W","400 ml",18,74],
  ["OGX","Argan Oil of Morocco szampon","W","385 ml",35,77],
  ["Aussie","3 Minute Miracle maska regenerująca","W","250 ml",30,75],
  ["John Frieda","Frizz Ease serum wygładzające","W","50 ml",45,72],
  ["L'Oréal Paris","Elseve Extraordinary Oil olejek do włosów","W","100 ml",40,78],
  // --- zapachy: uzupełnienia ---
  ["Versace","Eros woda toaletowa","Z","100 ml",380,80],
  ["Lancôme","Idôle woda perfumowana","Z","50 ml",400,79],
  ["Burberry","Her woda perfumowana","Z","50 ml",420,77],
  ["Calvin Klein","Euphoria woda perfumowana","Z","100 ml",350,75],
  ["Jean Paul Gaultier","Le Male woda toaletowa","Z","125 ml",420,80],
  ["Valentino","Born in Roma Donna woda perfumowana","Z","50 ml",450,78],
  ["Prada","Paradoxe woda perfumowana","Z","50 ml",470,76],
  ["Kayali","Vanilla 28 woda perfumowana","Z","50 ml",480,81],
  ["Paco Rabanne","Lady Million woda perfumowana","Z","50 ml",390,77],
  ["Giorgio Armani","Acqua di Giò woda toaletowa","Z","100 ml",420,82],
  // --- marki wcześniej bez produktów: prawdziwe pozycje flagowe ---
  ["Yoskine","Golden Snail krem na dzień 50+","T","50 ml",40,80],
  ["Yoskine","Sakura Zen krem liftingujący 40+","T","50 ml",38,74],
  ["Yoskine","Classic krem-serum 60+","T","50 ml",42,70],
  ["Yoskine","Bakuchiol serum ujędrniające","T","30 ml",45,72],
  ["Holika Holika","Aloe 99% Soothing Gel żel","C","250 ml",30,82],
  ["Holika Holika","Good Cera Super Ceramide krem","T","60 ml",55,78],
  ["Holika Holika","Pig Nose Clear Blackhead plastry","T","3 szt",20,80],
  ["Holika Holika","Sleek Egg Skin baza pod makijaż","M","25 ml",35,74],
  ["Semilac","Lakier hybrydowy 056 Power Woman","M","7 ml",30,88],
  ["Semilac","Base Protein baza hybrydowa","M","7 ml",35,85],
  ["Semilac","Top No Wipe nabłyszczacz","M","7 ml",35,84],
  ["Semilac","Lampa UV/LED 24/48 W","M","1 szt",160,79],
  ["NeoNail","Lakier hybrydowy Pure Love","M","7,2 ml",28,82],
  ["NeoNail","Base Protein baza","M","7,2 ml",33,80],
  ["NeoNail","Top Secret nabłyszczacz","M","7,2 ml",33,78],
  ["Kiko Milano","3D Hydra Lipgloss błyszczyk","M","6,5 ml",55,84],
  ["Kiko Milano","Unlimited Foundation podkład","M","30 ml",95,82],
  ["Kiko Milano","Smart Fusion pomadka","M","3 g",35,80],
  ["Kiko Milano","Tattoo Eyeliner eyeliner w pisaku","M","1 ml",45,76],
  ["Missha","Time Revolution First Treatment esencja","T","150 ml",120,84],
  ["Missha","M Perfect Cover BB Cream SPF42","M","50 ml",70,82],
  ["Numbuzin","No.3 Skin Softening serum","T","50 ml",90,83],
  ["Numbuzin","No.5 Vitamin-Niacinamide krem","T","55 ml",95,80],
  ["Rom&nd","Juicy Lasting Tint pomadka","M","5,5 g",45,86],
  ["Rom&nd","Better Than Eyes paleta cieni","M","6,5 g",70,82],
  ["Tirtir","Mask Fit Red Cushion podkład","M","18 g",110,85],
  ["Medicube","Zero Pore Pad płatki złuszczające","T","70 szt",90,80],
  ["Medicube","Collagen Niacinamide serum","T","30 ml",130,78],
  ["Miya Cosmetics","myBEAUTYgel serum z witaminą C","T","30 ml",45,79],
  ["Miya Cosmetics","mySUPERskin krem uniwersalny","T","75 ml",55,80],
  ["Dr Irena Eris","ProVoke krem liftingujący 50+","T","50 ml",95,78],
  ["Dr Irena Eris","Lumina krem rozświetlający","T","50 ml",85,75],
  ["Farmona","Nutri Argan Oil olejek arganowy","T","50 ml",25,72],
  ["Farmona","Herbolic maska ziołowa do włosów","W","250 ml",30,70],
  ["Anua","Peach 77 Niacinamide serum","T","30 ml",75,82],
  ["Anua","Azelaic Acid 10 serum wyrównujące","T","30 ml",80,80],
  ["Skin1004","Poremizing serum oczyszczające","T","50 ml",75,79],
  ["Torriden","SolidIn olejek do twarzy","T","50 ml",70,76],
  ["Wella","Oil Reflections olejek nabłyszczający","W","100 ml",90,76],
  ["Wella","Invigo Nutri-Enrich maska","W","300 ml",70,74],
  ["Redken","Acidic Bonding Concentrate szampon","W","300 ml",95,80],
  ["Matrix","Total Results maska Instacure","W","500 ml",65,73],
  ["Colgate","Max White Ultra pasta wybielająca","T","50 ml",25,80],
  ["Sensodyne","Repair & Protect pasta","T","75 ml",22,82],
  ["Elmex","Caries Protection płyn do płukania","T","400 ml",25,74],
  ["Flormar","Matte Liquid Lipstick pomadka","M","4 ml",30,72],
  ["LAMEL","OhMy Matte pomadka w płynie","M","5 ml",25,74],
  ["Makeup Revolution","Reloaded paleta cieni","M","16,5 g",60,80],
  ["Milani","Baked Blush róż wypiekany","M","3,5 g",50,76],
  ["Sleek","Highlighting Palette rozświetlacze","M","9 g",55,74],
  ["Bourjois","Rouge Velvet pomadka matowa","M","2,4 g",45,72],
  ["Nanoil","Keratynowa maska do włosów","W","300 ml",40,75],
  ["Nanoil","Olejek do włosów niskoporowatych","W","100 ml",50,78],
  ["Joanna","Multi Efekt keratyna spray","W","150 ml",15,72],
  ["Nesti Dante","Mydło naturalne Amber & Wild Fig","C","250 g",30,68],
  ["Lattafa","Yara woda perfumowana","Z","100 ml",130,84],
  ["Lattafa","Asad woda perfumowana","Z","100 ml",120,82],
  ["Armaf","Club de Nuit Intense Man woda toaletowa","Z","105 ml",180,83],
  ["Al Haramain","Amber Oud Gold woda perfumowana","Z","60 ml",280,79],
  ["Juliette Has a Gun","Not a Perfume woda perfumowana","Z","50 ml",340,77]
];

// ---------- rejestr marek polskiego rynku drogeryjnego ----------
// Kazda marka jest rozpoznawana przez wyszukiwarke; marka bez produktow
// w bazie cen dostaje strone z wyszukiwaniem jej oferty we wszystkich sklepach.
var BRANDS = [
  // polska pielegnacja
  "Ziaja","Bielenda","Eveline","AA","Lirene","Tołpa","Soraya","Perfecta","Dax Cosmetics","Miraculum",
  "Pani Walewska","Bandi","Clarena","Farmona","Dr Irena Eris","Pharmaceris","Emotopic","Emolium","Oillan",
  "Iwostin","Vis Plantis","Green Pharmacy","Barwa","Biały Jeleń","4organic","Yope","OnlyBio","Nacomi",
  "Resibo","BasicLab","Iossi","Mokosh","FaceBoom","BodyBoom","Sylveco","Vianek","Ministerstwo Dobrego Mydła",
  "Hagi","Cztery Szpaki","Orientana","Fluff","Bielenda Professional","Under Twenty","Flos-Lek","Floslek",
  // polski makijaz i paznokcie
  "Inglot","Wibo","Lovely","Bell","Paese","Pierre René","Claresa","NeoNail","Semilac","Delia","Miyo",
  "Hean","Joko","Ingrid","Vipera","AA Wings of Color",
  // miedzynarodowa pielegnacja masowa i dermo
  "Nivea","Garnier","L'Oréal Paris","Olay","Neutrogena","Mixa","Diadermine","Vichy","La Roche-Posay",
  "CeraVe","Bioderma","Avène","Eucerin","Cetaphil","Uriage","SVR","Noreva","Mustela","Bepanthen","Sudocrem",
  "Oilatum","Aveeno","Dove","Vaseline","Johnson's","Bambino","Bobini","Dermedic","Ducray","A-Derma",
  "Embryolisse","Lierac","Filorga","Institut Esthederm","Nuxe","Caudalie","Clarins","Clinique","Estée Lauder",
  "Lancôme","Shiseido","Kiehl's","Origins","Fresh","La Mer","Sisley","Guerlain","Darphin",
  // kosmetyka azjatycka
  "COSRX","Anua","Skin1004","Round Lab","Torriden","Purito","Mixsoon","Some By Mi","Beauty of Joseon",
  "Mizon","Holika Holika","Tony Moly","It's Skin","Missha","Innisfree","Etude","Laneige","Klairs","Benton",
  "Pyunkang Yul","Isntree","Haruharu Wonder","Ma:nyo","Medicube","VT Cosmetics","Hada Labo","Sulwhasoo",
  // zachodnie marki aktywne
  "The Ordinary","The Inkey List","Paula's Choice","Revolution Skincare","Q+A","Byoma","Bubble","Naturium",
  "Geek & Gorgeous","Dermalogica","Murad","REN","Youth To The People","Drunk Elephant","Glow Recipe",
  "Summer Fridays","Sol de Janeiro","Tree Hut","Mario Badescu",
  // makijaz masowy
  "Maybelline","NYX","Essence","Catrice","Rimmel","Max Factor","Bourjois","Revlon","Wet n Wild",
  "Makeup Revolution","Revolution Pro","I Heart Revolution","Sleek","Milani","e.l.f.","Flormar","LAMEL",
  "Kiko Milano","Golden Rose","Astor",
  // makijaz premium
  "MAC","Benefit","Too Faced","Urban Decay","NARS","Huda Beauty","Fenty Beauty","Rare Beauty",
  "Charlotte Tilbury","Anastasia Beverly Hills","Tarte","KVD Beauty","Milk Makeup","Laura Mercier",
  "Bobbi Brown","Hourglass","Natasha Denona","Makeup By Mario","ONE/SIZE","Haus Labs","Sephora Collection",
  "Danessa Myricks","Yves Saint Laurent","Dior","Chanel","Giorgio Armani","Givenchy",
  // wlosy
  "Olaplex","Kérastase","L'Oréal Professionnel","Wella","Wella Professionals","Schwarzkopf","Gliss","Syoss",
  "Taft","got2b","Pantene","Head & Shoulders","Herbal Essences","Aussie","OGX","John Frieda","Batiste",
  "Moroccanoil","Nanoil","Anwen","L'biotica","Biovax","Joanna","Kallos","Marion","K18","Redken","Matrix",
  "Elseve","Fructis","Klorane",
  // zapachy
  "Paco Rabanne","Versace","Carolina Herrera","Calvin Klein","Hugo Boss","Chloé","Mugler",
  "Jean Paul Gaultier","Valentino","Prada","Hermès","Burberry","Dolce & Gabbana","Gucci","Tom Ford",
  "Montblanc","Azzaro","Cacharel","Coach","DKNY","Escada","Lacoste","Mexx","Davidoff","Bruno Banani",
  "Adidas","La Rive","Bi-es","Lattafa","Armaf","Al Haramain","Kayali","Juliette Has a Gun",
  // higiena, deo, golenie, jama ustna, slonce
  "Rexona","Old Spice","Axe","Fa","STR8","Garnier Mineral","Palmolive","Le Petit Marseillais","Luksja",
  "Gillette","Gillette Venus","Wilkinson","Veet","Nair","Carmex","Labello","EOS","Blistex",
  "Colgate","Sensodyne","Elmex","Blend-a-med","Meridol","Lacalut","Curaprox","Listerine",
  "Hawaiian Tropic","Piz Buin","Ambre Solaire","Isana","Balea","Cien",
  // marki wlasne sieci
  "Alterra","Rival de Loop","Hebe Cosmetics","Kobo Professional","Alverde","Yves Rocher",
  // polska pielegnacja i makijaz — druga fala
  "Ava Laboratorium","Dermika","Bioliq","Yonelle","Annabelle Minerals","Pixie Cosmetics","Ecocera",
  "Venita","Prosalon","Chantal","Stapiz","Victoria Vynn","Indigo Nails","GLOV","Donegal","Dzidziuś",
  "On Line","Bohoboco","Flagolie","Celia","Gracja",
  "Yoskine","Miya Cosmetics","Lift4Skin","Oceanic","Rich","Clochee","Make Me Bio","Phenomé","Fitomed",
  "Lavo","Nova Kosmetyki","Ziołolek","Cera+","Dermovix","Pharma Vitae","Skinlab","Vollare","Bingospa",
  "Eoliia","Nesti Dante","Cztery Pory Roku",
  // naturalne / niemieckie
  "Weleda","Lavera","Sante","Logona","Dr. Hauschka",
  // masowe zagraniczne
  "Simple","Clean & Clear","Clearasil","St. Ives","Byphasse","Lumene","Physicians Formula","IsaDora",
  "Pupa Milano","Deborah Milano","Artdeco","Gosh Copenhagen","Note Cosmetics",
  // dermokosmetyki hiszpanskie i kliniczne
  "Sesderma","ISDIN","Heliocare","Martiderm","Medik8","SkinCeuticals",
  // K-beauty i J-beauty — druga fala
  "Heimish","Banila Co","Neogen","I'm From","By Wishtrend","Dr. Jart+","Dr. Ceuracle","AXIS-Y",
  "Numbuzin","Abib","Goodal","Mary&May","Jumiso","TIRTIR","Rom&nd","Peripera","Clio","La'dor","DHC",
  // zachodnie aktywne — uzupelnienia
  "The Purest Solutions","Ole Henriksen","First Aid Beauty",
  // pielegnacja premium
  "La Prairie","Payot","Biotherm","Helena Rubinstein","Perricone MD","Elemis","Rituals","The Body Shop",
  "Korres","Ahava","Apivita","Collistar","Sensai","Erborian","Augustinus Bader",
  // makijaz i akcesoria — uzupelnienia
  "Zoeva","Morphe","Iconic London","Pat McGrath Labs","Real Techniques","EcoTools",
  // wlosy — profesjonalne i pielegnacja fal
  "Tigi","Fanola","Alfaparf","Londa Professional","Goldwell","Paul Mitchell","CHI","Cantu",
  "Shea Moisture","Curlsmith","TRESemmé","Color Wow","Davines",
  // zapachy — pelna sciana perfumeryjna
  "Zadig & Voltaire","Marc Jacobs","Michael Kors","Ralph Lauren","Tommy Hilfiger","Trussardi","Bvlgari",
  "Cartier","Narciso Rodriguez","Issey Miyake","Kenzo","Salvatore Ferragamo","Moschino","Police","Diesel",
  "Joop!","Playboy","Ariana Grande","Billie Eilish","Britney Spears","Naomi Campbell","Jennifer Lopez",
  "Antonio Banderas","Shakira","Tous","Roberto Cavalli","Montale","Mancera","Nishane","Amouage",
  "Maison Margiela","Jo Malone London","Creed","Parfums de Marly","Xerjoff","Chopard",
  // higiena, jama ustna, slonce, mezczyzni
  "8x4","Borotalco","Aquafresh","Signal","Parodontax","Marvis","Splat","Jordan","Oral-B",
  "Australian Gold","Proraso","American Crew","Arko","Palmer's","Bio-Oil"
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
           : tier==="d" ? ["Rossmann","Hebe","Superpharm","Ezebra","Notino"]
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
