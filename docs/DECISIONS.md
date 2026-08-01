# Karar günlüğü

> "Neden böyle" bilgisi, "ne" bilgisinden değerlidir. Bu dosya, altı ay sonra
> bir kararı tartışmaya açmadan önce okunacak yerdir.

Format: `#N · karar · gerekçe · reddedilen alternatif`

---

## Altyapı

**#1 · Build adımı var, ama minimal (tek dosya, sıfır bağımlılık).**
Kaynak dosyalar saf HTML/CSS/JS kalır — betik silinse bile site elle
derlenebilir. Çözdüğü tek gerçek problem: navigasyon ve alt bilgi 8 sayfada
tekrar ediyor; elle senkronize tutmak sitenin ilk bozulacağı yerdir.
*Reddedilen:* bundler (bağımlılık ağacı, sürüm çürümesi) · hiç build yok
(parça tekrarı).

**#2 · Çok sayfa, tam sayfa yenileme. SPA yönlendirme yok.**
5 sayfalık bir yapıda SPA hiçbir fayda üretmez; LCP'ye, odak yönetimine ve JS
bütçesine zarar verir.

**#3 · Bu kod bir şablon olarak kurulur.**
Token katmanı markadan bağımsız: `02-tokens/color.css` içindeki primitive blok
değiştirildiğinde sistem başka bir markaya taşınır. Bu kararı sonradan almak
tüm CSS'i yeniden yazmak demekti.

**#4 · JS küçültülmez.**
Regex tabanlı JS küçültme doğruluk riski taşır; kazanç ~1 KB. Risk/kazanç oranı
kabul edilmedi.

**#5 · Varlık sürümleme: CSS'te dosya adı hash'i, JS'te sorgu parametresi.**
ES modül grafiğinde dosya adı değiştirmek import yollarını kırar. CSS tek dosya
olduğu için hash sorunsuz.

---

## CSS

**#6 · Cascade layer sırası bir kez `main.css`'te belirlenir.**
Katman sırası netleştiğinde özgüllük hesabı gereksizleşir ve `!important`
ihtiyacı yapısal olarak ortadan kalkar. CSS'in yıllar içinde çürümesini
engelleyen tek mekanizma budur.

**#7 · Çalışma zamanında `@import` kullanılmaz.**
İstekleri seri hale getirir ve render'ı geciktirir. Build zinciri tek dosyada
birleştirir.

**#8 · Kritik CSS ayrıştırması yapılmaz.**
Gzip sonrası 3.1 KB'lık bir dosyada kazanç ölçüm hatası seviyesinde kalır, ama
bakım maliyeti kalıcıdır.

**#9 · `js-` önekli sınıflar stil taşımaz.**
Stil sınıfını JS kancası olarak kullanmak, görsel değişiklik yapıldığında işlevi
kırar. İki sorumluluk asla aynı sınıfta birleşmez.

**#10 · `p:has(+ p)` ile alt boşluk — `p + p` ile üst boşluk değil.**
Davranış birebir aynı, ama §21/D1 ("boşluk aşağı akar") ihlal edilmiyor.
Kuralı kendi kodumuzda delmek, kuralı ortadan kaldırmaktır.

---

## Tipografi

**#11 · Serif başlık + Sans metin, aynı süper aileden.**
Source Serif 4 / Source Sans 3: Türkçe için Latin Extended-A tam kapsanır
(noktalı İ dahil), metrikler uyumlu tasarlanmış, variable, açık lisans.
*Reddedilen:* Inter (Yön B çağrışımı, aşırı yaygınlık) · tek serif (arayüz
öğelerinde okunabilirlik düşer).

**#12 · `font-display: swap` + hassas metrik eşleştirme.**
`optional` ilk ziyarette fontun hiç uygulanmaması riskini taşır — marka için
kabul edilemez. `swap`in maliyeti kaymadır; metrik override bu kaymayı sıfıra
yaklaştırır. İki seçeneğin de faydasını alan tek yol.

**#13 · Yalnızca başlık ailesi preload edilir.**
Metin ailesi ilk ekranda ikincildir; preload etmek kritik yolu şişirir.

**#14 · Akışkan tip skalası `clamp()` ile, oran 1.25 → 1.333.**
Tek oran iki uçtan birinde başarısız olur: 1.25 masaüstünde yavan kalır, 1.333
mobilde başlıkları taşırır.

**#15 · Ana metin 16px'in altına inmez.**
iOS'ta 16px altı form alanı otomatik yakınlaştırma tetikler.

---

## Renk

**#16 · Zemin kırık beyaz (`#FBF9F5`), saf beyaz değil.**
Saf beyaz ekranda parlar, uzun okumada yorar ve "varsayılan/template" hissi
verir. Tek başına en yüksek etkili renk kararı.

**#17 · Metin sıcak nötr, saf siyah değil.**
Saf siyah sert ve ucuz görünür; soğuk gri "klinik/teknoloji" kodu taşır ve
"premium ama soğuk olmasın" kriteriyle çelişir.

**#18 · Vurgu derin yeşil-mürekkep, klinik mavi değil.**
Mavi sağlık sektöründeki en tüketilmiş renk ve aynı zamanda SaaS kodu.

**#19 · Karanlık mod v1.0'da yok.**
Kâğıt metaforu karanlık modda çöker; test yükünü iki katına çıkarır; hedef
kitle için ölçülebilir fayda yok. Token mimarisi sonradan eklenmeye açık:
yalnızca semantic katman yeniden eşlenir.

---

## Hatalar ve düzeltmeler

**#20 · Küçültücü `clamp()` içindeki `+` operatörünü bozuyordu.**
`1.75rem + 3.3333vw` → `1.75rem+3.3333vw` geçersiz CSS'tir; custom property
hesaplama anında düşer ve **tüm tip skalası sessizce çöker**. Küçültücüden `+`
sıkıştırması kaldırıldı ve derlemeye kalıcı bir geçerlilik guard'ı eklendi.
Sessiz hata, gürültülü hatadan tehlikelidir.

**#21 · `apple-touch-icon.png` referansı kaldırıldı.**
Dosya yoktu; her iOS ziyaretinde 404 üretiyordu. Gerçek marka işareti hazır
olduğunda Aşama 11'de eklenecek.

**#22 · Denetim betiği bildirim tabanlı yeniden yazıldı.**
Ham regex taraması `var(--space-4)` içindeki tireyi "negatif margin" sanıyordu.
Kurallar artık ayrıştırılmış `özellik: değer` çiftleri üzerinde çalışıyor.
Yanlış pozitif üreten bir denetim, kapatılan bir denetimdir.

---

## Bekleyen kararlar

| # | Konu | Bloke ettiği |
|---|---|---|
| B1 | Hosting / deploy ortamı | Sunucu başlıkları, önbellek, yönlendirmeler |
| B2 | Form backend | `form.js`, `/iletisim` |
| B3 | Analitik seçimi | Çerez banner'ı gerekliliği, JS bütçesi |
| B4 | Eski site URL envanteri | 301 yönlendirme haritası |
| B5 | WhatsApp numarası + ön yazılı mesajlar | `whatsapp.js` |
| B6 | Proje ekran görüntüleri | Aşama 5 · Bölüm 02 |
| B7 | Portre fotoğrafı | Aşama 5 · Bölüm 05 |
| B8 | Metin içerikleri | Aşama 5'in tamamı |

---

## Aşama 2 · düzen

**#23 · Izgara `repeat(12, minmax(0, 1fr))` — `1fr` değil.**
`1fr` tek başına min-content'e kilitlenir; uzun Türkçe kelimeler ve geniş
görseller sütunu taşırır. Yatay taşmanın en yaygın gizli nedeni budur.
Doğrulama sayfasının kendi ızgarası bu guard'ı taşımıyordu ve Playwright
360/390px'te tam olarak bu taşmayı yakaladı — kuralın gerçekliği kanıtlandı.

**#24 · Şeritler daraldıkça sütun sayısını ARTIRIR.**
Şerit oranı korunsaydı okuma genişliği dar ekranda çökerdi. reading
6→8→10→12, standard 8→10→12, wide 10→12.

**#25 · A2 ekseni yalnızca ≥1280px.**
1024px'te 2 sütunluk offset ≈ 90px eder ve editöryel karar gibi değil kazara
gibi görünür. Asimetri ancak yeterli genişlikte ritim üretir.

**#26 · Bölüm boşluğu `padding-block-end` ile verilir, margin ile değil.**
Padding çakışmaz, bölümün kendi zemininin parçasıdır ve §21/D1 ("boşluk aşağı
akar") ile uyumludur.

**#27 · Test harness'ında rem/px karışıklığı.**
`getPropertyValue()` custom property'nin HAM değerini döndürür, hesaplanmış
px'i değil. İlk sürüm 28 yanlış başarısızlık üretti. Testler artık kök
font-size üzerinden dönüşüm yapıyor. Yanlış pozitif üreten test, güvenilmeyen
testtir.

**#28 · Font 404'leri ayrı raporlanır, gizlenmez.**
Font dosyaları depoya dahil değil. Test bunları kırmızıya boyamaz ama SESSİZ
de geçmez — her çalıştırmada açık uyarı basar. Sessiz muafiyet, kapatılmış
testtir.

---

## Aşama 3 · primitive bileşenler

**#29 · Oran kuralı ihlali düzeltildi (768–1023px).**
`--space-section-inner-max` space-10 (40px) → space-8 (32px). Oran 2.40 → 3.00.
Playwright eşiği de 2.4'ten 2.5'e çekildi. Testi çıktıya uydurmak, kuralı
ortadan kaldırmaktır — bu düzeltme o hatanın telafisidir.

**#30 · Kontrol yüksekliği ayrı skalaya alındı.**
Buton yükseklikleri boşluk skalasından gelmez: bunlar boşluk değil, dokunma
hedefidir. `--control-sm/md/lg` rem cinsinden tanımlandı ki kullanıcı tarayıcı
yazı boyutunu büyüttüğünde kontrol de büyüsün.

**#31 · PHASE 06 §12 iç çelişkisi · sm 40px → 44px.**
Spesifikasyon aynı anda "sm = 40px" ve "44px asgari, sm bile bu sınırın
üstünde" diyordu. 40 < 44. Erişilebilirlik taahhüdü boyut tercihinden
güçlüdür; sm 44px'e çekildi. Boyut skalası: 44 · 48 · 56.

**#32 · Odak halkası offset'i erişilebilirlik gereğidir, estetik değil.**
`outline-offset: 2px` halkayı koyu butonun ÜSTÜNE değil kâğıt zemine düşürür.
Halka içeride çizilseydi accent-900 / ink-900 kontrastı 3:1'in altında
kalırdı. Test bu oranı WCAG formülüyle hesaplayarak doğruluyor.

**#33 · Buton alt çizgisi katman sırasıyla çözülür.**
base katmanı `a` öğesine alt çizgi verir; components katmanı üsttedir.
`text-decoration: none` özgüllük savaşı olmadan kazanır. Test bunu bir
regresyon koruması olarak ölçüyor — katman sırası bozulursa kırılır.

**#34 · İkonlar elle çizildi, kütüphane kullanılmadı.**
Hazır setler (Lucide, Feather) tanınır ve template sinyali verir. 10 ikon,
24×24 ızgara, 1.5 çizgi, tek inline sprite — ek istek yok.

---

## Aşama 4 · global bileşenler

**#35 · JS'siz davranış `@media (scripting: none)` ile çözülür.**
`no-js` sınıfı enjekte eden satır içi script kullanılmadı — satır içi script
olmaması, katı bir CSP'yi mümkün kılıyor (PHASE 08 §7). Varsayılan JS'li
davranıştır; bu medya bloğu yalnızca üzerine yazar. Özelliği desteklemeyen
eski tarayıcılar varsayılanda kalır ki onların da JS'i açıktır.
JS yokken: header statik olur, tetikleyici gizlenir, navigasyon akışta kalır.
Çalışmayan bir tetikleyici göstermek, hiç göstermemekten kötüdür.

**#36 · visibility DISCRETE bir özelliktir — geçiş süresi verilemez.**
`transition: visibility 320ms` yazıldığında değer geçişin ORTASINDA değişir:
panel açıldıktan sonraki ilk 160ms boyunca hâlâ `hidden` kalır ve o aralıkta
yapılan `focus()` çağrısı SESSİZCE başarısız olur. Menü açılıyor ama klavye
kullanıcısı içine giremiyordu. Playwright yakaladı.
Çözüm: `visibility 0s linear 0s` (açılış) / `0s linear 320ms` (kapanış).

**#37 · Mobil menünün tüm kapanış yolları tek close() fonksiyonundan geçer.**
Kapatma butonu, Escape, dış tıklama, bağlantı tıklaması, masaüstüne geçiş,
modül yıkımı — altısı da aynı çıkıştan. Tek çıkış noktası, kaydırma kilidinin
hiçbir koşulda açık kalmamasını garanti eder. Ayrı ayrı kapanış kodları
yazılsaydı er ya da geç biri kilidi temizlemeyi unuturdu: sessiz, tanısı zor
ve kullanıcıyı sayfada mahsur bırakan bir hata.

**#38 · Hareket azaltmada header GİZLENMEZ — hızlandırılmaz.**
Reset katmanı geçiş sürelerini zaten sıfırlar; ama süresi sıfırlanmış bir
gizle/göster, yumuşak animasyondan daha rahatsız edicidir — sıçrayarak
kaybolur. Doğru cevap hareketi hızlandırmak değil, davranışı kapatmaktır.

**#39 · JS yorumları derlemede ayıklanır (DECISIONS #4 rafine edildi).**
#4, REGEX tabanlı küçültmeyi doğruluk riski nedeniyle reddetmişti ve o karar
geçerli. `tools/strip-comments.js` regex değil KARAKTER TARAYICISIDIR: dize,
şablon dizesi ve regex literal bağlamlarını takip eder. Çıktı `node --check`
ile doğrulanır; başarısız olursa orijinal dosya kullanılır ve uyarı basılır.
Sonuç: JS gzip 4462 → 2098 bayt. Kaynak yorumları depoda korunur.
(Not: bu ayıklayıcıyı yazarken kendi yorumumun içindeki `*` `/` dizisi
yorumu erken kapatıp build'i kırdı. Yorum işleyicisi hakkındaki yorum, yorum
işleyicisinde patladı.)

**#40 · Test hataları · kaydırma ve emülasyon.**
① `scroll-behavior: smooth` yüzünden `scrollTo(0, y)` animasyonlu kaydırıyor;
120ms sonra sayfa henüz 400px eşiğine varmamış oluyordu. Test, header
mantığını değil animasyon hızını ölçüyordu. `behavior: "instant"` + konum
bekleme ile belirlenimli hale getirildi.
② `test.use({ reducedMotion: "reduce" })` bu Playwright sürümünde bağlama
uygulanmıyor — sayfa içinde `matchMedia` false dönüyordu, yani test ölçmek
istediği şeyi HİÇ ölçmüyordu. Sessizce yeşil kalabilecek bir testti.
`page.emulateMedia()` ile açık hale getirildi ve emülasyonun uygulandığı
ayrıca doğrulanıyor.

---

## Aşama 4 · global bileşenler

**#35 · `@media (scripting: none)` ile ilerici geliştirme.**
JS'in açık olup olmadığını tarayıcının kendisi CSS'e bildirir; sınıf enjekte
eden satır içi script'e gerek kalmaz. Satır içi script kullanmamak katı bir
CSP'yi mümkün kılar. Varsayılan JS'li davranıştır, bu blok yalnızca üzerine
yazar — özelliği desteklemeyen eski tarayıcılar varsayılanda kalır, ki onların
da JS'i açıktır. Sonuç: JS yokken tetikleyici kaybolur, navigasyon akışta
durur. Çalışmayan bir buton göstermek, buton göstermemekten kötüdür.

**#36 · visibility DISCRETE bir özelliktir — gerçek hata.**
`transition: visibility 320ms` yazıldığında değer geçişin ORTASINDA (%50)
değişir. Panel açıldıktan sonraki ilk 160ms boyunca hâlâ `hidden` kalıyordu ve
o aralıkta yapılan `focus()` çağrısı sessizce başarısız oluyordu: menü açılıyor
ama klavye kullanıcısı içine giremiyordu. Ekranda hiçbir belirti yok.
Çözüm: visibility süresi 0s, yalnızca kapanışta geciktiriliyor.
Playwright yakaladı; göz yakalayamazdı.

**#37 · Tüm kapanış yolları tek close() fonksiyonundan geçer.**
Kapatma butonu, Escape, dış alana tıklama, bağlantıya tıklama, masaüstüne
geçiş, modül yok etme — altısı da aynı çıkıştan. Birden fazla kapanış kodu
yazılsaydı er ya da geç biri kaydırma kilidini temizlemeyi unuturdu ve
kullanıcı sayfayı kaydıramaz hale gelirdi: sessiz ve tanısı zor bir hata.

**#38 · Hareket azaltmada header davranışı KAPATILIR, hızlandırılmaz.**
Reset katmanı geçiş süresini zaten sıfırlar; ama süresi sıfırlanmış bir
gizle/göster, yumuşak animasyondan daha rahatsız edicidir — header sıçrayarak
kaybolur. Doğru cevap hareketi hızlandırmak değil, davranışı kaldırmaktır.

**#39 · JS yorumları derlemede ayıklanır (DECISIONS #4'ün revizyonu).**
JS gzip 4462 bayt ile 4 KB bütçesini aşıyordu. #4 REGEX tabanlı küçültmeyi
doğruluk riski nedeniyle reddetmişti ve o gerekçe hâlâ geçerli. Buradaki
yaklaşım regex değil KARAKTER TARAYICISI: dize, şablon ve regex literal
bağlamlarını takip eder. Çıktı `node --check` ile doğrulanır; başarısız olursa
orijinal dosya kullanılır. Kaynak dosyalar dokunulmaz — "neden böyle" bilgisi
depoda kalır, yalnızca dist'e gitmez. 4462 → 2098 bayt.

**#40 · Testte yumuşak kaydırma kapatılır.**
`scroll-behavior: smooth` yüzünden `scrollTo(600)` çağrıldıktan 120ms sonra
sayfa gerçekte 513px'teydi ve yön okuması kararsızdı. İki test bu yüzden
kırmızıydı — üründe hata yoktu, testte belirsizlik vardı. Bekleme süresini
uzatmak yerine belirsizliğin kaynağı kaldırıldı: test ortamında anlık
kaydırma + hedefe varıldığının doğrulanması. Zamanlama şansına bağlı test,
güvenilmeyen testtir.

---

## İterasyon 2 · içerik bölümleri

**#41 · "Hizmetler" ayrı bölüm değil, Çalışma Şekli içinde KAPSAM bloğu.**
PHASE 03 ayrı bir hizmetler sayfası/bölümü reddetmişti: hizmet listesi kapsam
dağıtır ve ajans klişesidir; kapsamın Çalışma Şekli içinde tanımlanmasına karar
verilmişti. İkonlu hizmet kartları yerine dahil / dahil değil karşıtlığı
kuruldu. "Neyi yapmadığını söylemek" değer önerisini zayıflatmaz, güçlendirir
— uzmanlık sinyali kapsam genişliğinden pahalı satar. Fiyat gösterilmediği
için "ne alıyorum" netliği dönüşümün taşıyıcısıdır.

**#42 · Karşıtlık bileşeni iki yerde kullanılıyor.**
"Neden farklı" ve "Kapsam" aynı yapıyı paylaşıyor: iki sütun, biri sessiz biri
baskın. Ayrı bileşen yazmak CSS bütçesini iki kez öderdi. Anlam farkı
modifier ile taşınıyor.

**#43 · Bütçe denetimi gzip'e taşındı.**
Ham KB bir vekil ölçüydü ve gerçek transfer maliyetini yansıtmıyordu: yorum ve
boşluk ham boyutu şişirir ama neredeyse sıfır bayta sıkışır. PHASE 08
sözleşmesi zaten gzip üzerineydi (CSS 7 KB, JS 4 KB). Derleme artık kullanıcının
gerçekten indirdiği şeyi ölçüyor. Ham limit bilgilendirici olarak kaldı.
Bu bir gevşetme değil: vekil ölçünün yerine sözleşmenin kendisi kondu.

**#44 · Taahhüt bloğu 3 maddeye sabit.**
"Belirli teslim tarihi" süreç aşamalarındaki süre bilgisiyle aynı şeyi
söylüyordu. Tekrar güveni artırmaz, dikkati dağıtır.

---

## İterasyon 2 · bölümler

**#41 · "Hizmetler" ayrı bölüm olarak açılmadı.**
PHASE 03 ayrı hizmet listesini reddetmişti: kapsam dağıtır, ajans klişesidir,
uzmanlık sinyalini zayıflatır. İstenen içerik "Her projede ne var" kapsam
bloğu olarak Çalışma Şekli'nin içine kuruldu. Ek olarak "neler dahil değil"
satırı: uzmanlık sinyali kapsam genişliğinden pahalı satar ve yanlış müşteriyi
nazikçe eler.

**#42 · Kitle bölümü tanım listesi (dl/dt/dd).**
Sektör adı ile problem cümlesi arasındaki ilişki terim–tanım ilişkisidir;
PHASE 08 §3 bunu kararlaştırmıştı. İlk yazımda div/p kullanılmıştı — test
yakaladı. Tarayıcının dd'ye verdiği 40px girinti sıfırlanmazsa editöryel eksen
bozuluyordu.

**#43 · Inline stil kullanımı temizlendi.**
Bölüm içi boşluklar için 6 yerde `style="..."` yazılmıştı. Bu hem katı bir
CSP'yi imkânsız kılar hem token disiplinini denetim dışına çıkarır — audit
yalnızca CSS dosyalarını tarar, HTML'i değil. `l-section__sub` ve
`l-section__bridge` sınıflarına taşındı.

**#44 · Süreç numaraları aria-hidden.**
Sıra bilgisini <ol> zaten taşıyor. Görsel numara da okunursa ekran okuyucu
"1, bir" diye iki kez duyurur.

**#45 · Kapanışta text-align: start açıkça beyan edildi.**
Varsayılana bırakmak yerine yazıldı: bu bir karar, bir kaza değil. İleride
biri ortalamayı denerse, karşısında gerekçesi yazılı bir satır bulur.
