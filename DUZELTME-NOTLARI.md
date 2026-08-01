# Kritik Teknik Stabilizasyon — Düzeltme Notları

Bu turda **yalnızca teknik stabilizasyon** yapıldı. Tasarım, mimari, klasör
yapısı, build sistemi ve teknoloji seçimi değiştirilmedi. `src/` dışına yeni
kaynak dosya konulmadı.

---

## Değiştirilen dosyalar (10)

| Dosya | Düzeltme |
|---|---|
| `src/css/main.css` | K1 · katmansız kural kaldırıldı |
| `src/css/05-components/header.css` | K2 · `@media (scripting: none)` onarıldı + mobil nav |
| `src/css/05-components/faq.css` | K4 · 3 tanımsız hareket değişkeni |
| `src/css/05-components/page.css` | K4 · 2 tanımsız değişken |
| `src/static/sitemap.xml` | K5 · 3 ölü URL silindi |
| `src/static/robots.txt` | K5 · dev sayfaları + teşekkür sayfası engellendi |
| `tests/global.spec.js` | K3 · kaydırma kabı muafiyeti |
| `tests/layout.spec.js` | K3 · aynı |
| `tests/primitives.spec.js` | K3 · aynı |
| `tests/sections.spec.js` | K3 · aynı (2 yerde) |

---

## K1 · Mobil menü hiç açılmıyordu

`src/css/main.css` sonunda, hiçbir katmanın içinde olmayan bir kural vardı:

```css
.c-nav-mobile { visibility: hidden; opacity: 0; }
```

Katmansız CSS **tüm katmanlı CSS'ten önceliklidir**. Bu yüzden
`layer(components)` içindeki `.c-nav-mobile.is-open` kuralı onu ezemiyordu.
JavaScript `is-open` sınıfını doğru ekliyordu ama panel görünmüyordu.

Sonuç: 768px altında ana navigasyon tamamen erişilemezdi.

**Doğrulama (390px):**
```
visibility: visible · opacity: 1 · odak: kapatma butonu · kaydırma kilidi: aktif
Escape → kapanıyor · odak tetikleyiciye dönüyor · kilit temizleniyor
```

---

## K2 · header.css sözdizimi hatası

`@media (scripting: none) {` açılış satırı kaybolmuş, içeriği ve kapanış
parantezi kalmıştı. Dosyanın parantez dengesi **-1** idi.

Üç sonucu vardı:
1. `.c-header__inner { flex-wrap: wrap }` her genişlikte geçerliydi
2. Fazla `}` derlenmiş çıktıda `@layer components` bloğunu erken kapatıyordu
3. JS kapalıyken menü tetikleyicisi görünür kalıyor ama hiçbir şey yapmıyordu

Onarım sırasında ölçüm bir eksik daha gösterdi: tetikleyici gizlenince
mobilde header'da hiç bağlantı kalmıyordu. `@media (scripting: none)` bloğuna
`.c-nav { display: block }` eklendi.

**Doğrulama (JS kapalı):**
```
390px  · tetikleyici gizli ✓ · panel kaldırıldı ✓ · görünür nav bağlantısı: 4 ✓
1280px · tetikleyici gizli ✓ · panel kaldırıldı ✓ · görünür nav bağlantısı: 4 ✓
```

---

## K3 · Yatay taşma — ölçüm hatasıydı, kod hatası değil

İlk analiz raporunda "4 sayfa × 4 genişlikte yatay taşma" bildirilmişti.
**Bu bulgu yanlıştı.** Tarayıcıda tek tek ölçüldüğünde:

```
body overflow-x:clip kapatılıp 12 kez örneklendi → belge taşması: 0, 0, 0, ... 0
dingin halde 7 genişlik × 11 sayfa                → hepsi temiz
```

Gerçek durum:

* **Case study sayfaları** — `.c-case-mobile__rail` zaten `overflow-x: auto`
  olan kasıtlı bir yatay kaydırıcı. İçindeki görsellerin viewport dışına
  uzanması doğru davranıştır (railScrollWidth 1280 / clientWidth 320).
* **Hero** — `.c-hero` zaten `overflow: hidden` ile kendi çocuklarını
  kırpıyor. Mockup, giriş animasyonu sırasında ~15px dışarı uzanıp
  kırpılıyor; sayfada kaydırma üretmiyor.

Hatanın kaynağı tarama yöntemiydi: kaydırma/kırpma kabı içindeki öğeler
dışlanmıyordu. **Projenin kendi test paketi de aynı hatayı yapıyordu** ve bu
yüzden 6 test boşuna kırmızıydı.

Bu nedenle CSS'e değil **teste** müdahale edildi: dört spec dosyasına
`inContained()` muafiyeti eklendi. Sürekli yanlış alarm veren test,
kapatılan testtir.

---

## K4 · Tanımsız CSS değişkenleri

| Yanlış ad | Doğru ad | Görünür etki |
|---|---|---|
| `--motion-duration-fast` | `--duration-fast` | SSS ok animasyonu yoktu |
| `--motion-duration-base` | `--duration-slow` | SSS ani sıçrayarak açılıyordu |
| `--motion-ease-standard` | `--ease-in-out` | — |
| `--radius-pill` | `--radius-xs` | Sistem yalnızca 0 ve 2px tanır |
| `--action-primary` | `--action-primary-bg` | Onay kutusu rengi |

**Doğrulama:** SSS ikon geçişi 0.15s · panel geçişi 0.32s ·
derlenmiş CSS'te kalan tanımsız değişken: **yok**

---

## K5 · Sitemap ve dev sayfaları

Sitemap'te var olmayan üç sayfa listeleniyordu:
`/isler/lumea-smile-studio/`, `/isler/mehmet-kemal/`, `/isler/flowos/`.
Google bunları tarayıp 404 alıyordu.

* Üç ölü URL silindi → 10 URL'nin 10'u çalışıyor
* `/404/` ve `/iletisim/basarili/` bilinçli olarak listelenmiyor
* `robots.txt`e dört dev sayfası ve teşekkür sayfası eklendi
* `npm run build:prod` ile dev sayfaları `dist/`ten çıkarıldı

---

## Test durumu

```
ÖNCE:  13 failed · 171 passed
SONRA:   1 failed · 183 passed
```

**Kalan tek hata teknik değil, tasarım kararıdır:**

```
tests/sections.spec.js › görünür alanda tek birincil buton
  Expected: 1   Received: 5
```

Ana içerikte 5 birincil buton var; sistem kuralı 1 diyor. Testi gevşetmek
kuralı ortadan kaldırmak olurdu, bu yüzden **bilinçli olarak kırmızı
bırakıldı**. Karar bekliyor.

---

## Dokunulmayan bilinen konular

| Konu | Neden dokunulmadı |
|---|---|
| CSS bütçesi aşımı (7.6 KB / 7.0 KB gzip) | Kaynağı hero'nun dekoratif CSS'i; çözümü tasarım kararı |
| 21 denetim ihlali (glassmorphism, gölge, sabit renkler) | Tamamı hero ve header'ın görsel tercihleri |
| Hero'daki sonsuz animasyon | Tasarım kararı |
| `srcset` / AVIF eksikliği | Performans iyileştirmesi, kritik hata değil |
| FAQPage / BreadcrumbList schema | SEO iyileştirmesi |
| Stüdyo bölümünde fotoğraf eksikliği | İçerik kararı |
