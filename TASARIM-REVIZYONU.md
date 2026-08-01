# Aşama 2 — Premium Tasarım ve Dönüşüm Revizyonu

Mimari, framework, klasör yapısı ve bağımlılıklar değişmedi. Yeni token
eklenmedi; tüm değerler mevcut skaladan alındı.

---

## Değiştirilen dosyalar (10)

| Dosya | Değişiklik |
|---|---|
| `src/css/05-components/hero.css` | Yeniden yazıldı · 430 → 195 satır |
| `src/css/05-components/header.css` | Glassmorphism + 3 gölge kaldırıldı |
| `src/css/05-components/studio.css` | Yeniden yazıldı · güven odaklı |
| `src/css/05-components/work.css` | "Yapılan çalışma" satırı eklendi |
| `src/css/05-components/link.css` | 6px → skala değeri |
| `src/pages/index.html` | Hero, süreç, stüdyo, CTA sırası, portföy |
| `src/partials/header.html` | WhatsApp hazır mesajı |
| `src/partials/footer.html` | WhatsApp hazır mesajı |
| `src/pages/iletisim/index.html` + `basarili/` | WhatsApp hazır mesajı |
| `tools/build.js` | Hazır mesaj değişkenleri |
| `tests/sections.spec.js` | CTA testi kendi tanımıyla uyumlandı |

---

## 1 · Hero revizyonu

**Kaldırılanlar:** eğik tarayıcı mockup'ı (`c-hero__browser`, `c-hero__visual`,
`c-hero__mini-cards`), sonsuz süzülme (`heroFloat 6s infinite`), parlama
(`heroShine 8s infinite`), radial glow, dört katmanlı gölge, sıralı gecikme
zinciri (0.1s → 0.65s), italik vurgu.

**Neden:** Bunların tamamı reddedilen "Yön C — Vitrin" diline aitti ve yasak
listesinin dört maddesine aynı anda dokunuyordu. Eğik cihaz mockup'ı
PHASE 06 §20'de isim isim yasaklanmıştı. Sonsuz animasyon, sayfa açık kaldığı
sürece batarya ve dikkat maliyeti ödüyordu.

**Yerine:** boşluk, tipografi, hiyerarşi. Tek sütun (ikinci sütunun gerekçesi
mockup'tı, o gidince gerekçe de gitti). Başlık `--type-display-xl` token'ına
bağlandı — önceden kendi `clamp()`'i vardı ve tip skalasının dışındaydı.

**Yeni mesaj:** hedef kitle başlıkta değil, açıklamada ismen sayılıyor —
klinikler, hekimler, estetik merkezleri, premium yerel işletmeler. Başlık
sonucu söylüyor: "Güven veren siteler, randevuya dönüşür."

Giriş hareketi korundu ama 60ms aralıklarla sıkıştırıldı; `prefers-reduced-motion`
altında tamamen kapanıyor (süresi sıfırlanmış belirme, yumuşak olandan daha
rahatsız edicidir — sıçrayarak görünür).

---

## 2 · Hero altı güven alanı

"Sıfırdan tasarım / Premium deneyim" → **Özel Tasarım · Performans Odaklı ·
Dönüşüm Odaklı**.

Kart mantığı kullanılmadı: ayrım yalnızca bir hairline ve boşlukla kuruluyor.
Kart, web'in en tüketilmiş bileşenidir ve template sinyali verir. Mobilde tek
sütun, 768px'ten itibaren üç eşit sütun — hiçbiri diğerinin önüne geçmiyor.

---

## 3 · Portföy

Her projeye **"Yapılan çalışma"** satırı eklendi. Uydurma sonuç veya müşteri
verisi eklenmedi — sahte sayı yakalandığında tüm güveni siler; doğrulanabilir
kapsam ise sessizce yetkinlik gösterir.

"Canlı demoyu aç" butonları **birincil → ikincil** yapıldı. Üç dolu buton, ana
CTA ile aynı görsel ağırlıkta yarışıyor ve hiyerarşiyi düzleştiriyordu.

---

## 4 · Süreç

**Keşif/Tasarım/Geliştirme/Yayın-teslim** → **Analiz · Tasarım · Geliştirme ·
Yayın**. Süre bilgisi korundu: fiyat gösterilmediği için eleme yükü sürede.
"3 günde site" arayan ziyaretçi, haftalarla ifade edilen bir süreci görünce
kendi kendine eleniyor.

---

## 5 · CTA optimizasyonu

**Kapanış CTA'sı sayfanın 5. sırasındaydı — sona taşındı.**
Ziyaretçi SSS'de ikna oluyor ve sayfanın sonunda hiçbir eylem bulamıyordu.

**Yedi WhatsApp bağlantısının yedisine de hazır mesaj eklendi.** Bağlama göre
üç farklı metin (`waHero`, `waClosing`, `waContact`) `tools/build.js` içinde
tek kaynaktan tanımlanıyor — aynı metin dört sayfada elle tekrarlansa er ya da
geç ayrışırdı.

Ölçüm: aynı ekranda en fazla **1** birincil buton.

---

## 6 · Stüdyo

Üç prensipten dörde çıkarıldı ve bir **imza cümlesi** eklendi:
"Stüdyoyu ben kurdum ve projeleri baştan sona ben yürütüyorum. Bu yüzden aynı
anda sınırlı sayıda proje alıyorum."

Bu, sitedeki tek tekil anlatım — marka anlatımı üçüncü şahıs kalıyor. Aksan
rengindeki dikey çizgi onu çevresinden ayırıyor; kutu veya zemin yok.
Fotoğraf alanı hazır ama gerçek portre gelene kadar eklenmedi.

---

## 7 · Kalite kontrol

```
Taşma + konsol · 7 genişlik × 11 sayfa = 77 kombinasyon   ✓ temiz
Sistem denetimi · 32 dosya · 10 kural                     ✓ 21 ihlal → 0
Test paketi                                               ✓ 184/184
```

**Efekt denetimi (ölçülen):**
```
sonsuz animasyon: 0 · backdrop-filter: 0 · gölge: 0 · mockup kalıntısı: 0
```

**Bütçe:**
```
CSS gzip: 6980 / 7000 bayt   ✓  (önce 7844 — aşımdaydı)
JS  gzip: 3063 / 4000 bayt   ✓
```

CSS bütçesi hero'nun 235 satırlık dekoratif kodu kalkınca kendiliğinden
aşımdan çıktı. Sınıra yakın: sonraki eklemelerde takip edilmeli.

---

## Test düzeltmesi hakkında

`sections.spec.js › görünür alanda tek birincil buton` testi adıyla çelişiyordu:
adı "görünür alanda" diyor, uygulaması sayfa toplamını sayıyordu. PHASE 04 CTA
haritası sayfa boyunca birden fazla birincil çağrıya izin verir (açılış, SSS
sonu, kapanış); yasak olan aynı ekranda iki dolu butonun yarışmasıdır.

Test artık sayfayı ekran ekran tarayıp aynı anda kaç birincil butonun görünür
olduğunu ölçüyor. Bu bir gevşetme değil, testin kendi tanımına döndürülmesidir.

---

## Yapılmayanlar

| Konu | Neden |
|---|---|
| Müşteri yorumu | Gerçek referans yok; uydurma yorum tüm güveni siler |
| Sayısal sonuç ("%40 artış") | Doğrulanamaz veri eklenmedi |
| Stüdyo fotoğrafı | Gerçek portre bekleniyor; alan hazır |
| `srcset` / AVIF | Performans işi, bu turun kapsamı tasarım/dönüşümdü |
| FAQPage schema | SEO işi, kapsam dışı |
