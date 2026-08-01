# OğuzWeb

Resmi web sitesi. Görsel yön: **Editöryel Sessizlik** + sistem disiplini (ODS v1.0).

HTML5 · CSS3 · Vanilla JS (ES Modules). Framework yok, bundler yok, UI kütüphanesi yok.

---

## Kurulum

```bash
node --version        # 20 veya üzeri gerekli
npm install           # yalnızca sharp (opsiyonel, görsel dönüşümü için)
npm run fonts         # Source Serif 4 + Source Sans 3 indirir
npm run dev           # derler ve http://localhost:4173 adresinde sunar
```

`npm install` başarısız olursa sorun değil: `sharp` opsiyoneldir ve yalnızca
`npm run images` tarafından kullanılır. Derleme ve sunucu sıfır bağımlılıkla çalışır.

---

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run build` | `src/` → `dist/` derler (geliştirme sayfaları dahil) |
| `npm run build:prod` | Üretim derlemesi — `_` ile başlayan sayfaları hariç tutar |
| `npm run dev` | Derler + yerel sunucu başlatır |
| `npm run watch` | Değişiklikleri izler |
| `npm run fonts` | Font dosyalarını indirir |
| `npm run images` | Görselleri AVIF/WebP + 4 boyuta dönüştürür (`sharp` gerekir) |
| `npm run audit` | Design system kurallarını denetler |
| `npm run check` | Denetim + derleme |
| `npm test` | Playwright · 171 test |

---

## Fontlar — zorunlu ilk adım

Font dosyaları depoya dahil **edilmez**. İki yol var:

**A · Ağ erişimi varsa**
```bash
npm run fonts
```

**B · Ağ erişimi yoksa** (kısıtlı ortam)
```bash
bash tools/download-fonts.sh        # macOS / Linux
powershell tools/download-fonts.ps1 # Windows
```
Betikler dosyaları `src/fonts/` içine yerleştirir ve eksikleri raporlar.

Font olmadan site çalışır ama **yedek fontla** görüntülenir. Bu durumda
tipografi doğrulaması geçerli değildir.

### Yedek metrik doğrulaması (Aşama 1'in kapanış adımı)

`src/css/03-base/fonts.css` içindeki `size-adjust` / `ascent-override` /
`descent-override` değerleri, iki ailenin yayınlanmış metriklerinden
hesaplanmıştır. Yerel Georgia/Arial sürümleri işletim sistemine göre az da
olsa farklılık gösterebilir.

```bash
npm run fonts
npm run dev
# tarayıcıda: tools/font-metrics.html
```

Ölçülen değerler farklıysa `fonts.css` güncellenir.
**Bu doğrulama yapılmadan CLS ≤ 0.02 hedefi kanıtlanmış sayılmaz.**

---

## Görseller

Ağ erişimi kısıtlıysa görseller indirilemez. Bu durumda:

```bash
bash tools/download-images.sh        # macOS / Linux
powershell tools/download-images.ps1 # Windows
```

Proje ekran görüntüsü standardı: 1440px yakalama genişliği · tarayıcı çerçevesi
yok · 16:10 (masaüstü) / 4:5 (mobil) · sRGB · kaynak PNG.

---

## Klasör yapısı

```
src/
  pages/        sayfalar (build girdisi)
  partials/     tekrar eden HTML parçaları
  css/          01-reset · 02-tokens · 03-base · 04-layout · 05-components · 06-utilities
  js/           main.js + modules/
  fonts/        woff2 (depoda yok — indirilecek)
  images/       kaynak görseller
  static/       robots, favicon, manifest → dist köküne kopyalanır
tools/          build · audit · serve · fonts · images · indirme betikleri
dist/           üretilen çıktı (depoda yok)
docs/           DECISIONS.md · COMPONENTS.md
```

---

## Derleme sözleşmesi

**Parça ekleme**
```html
<!-- include: header.html -->
```

**Sayfa meta bloğu** (dosyanın ilk satırı olmalı)
```html
<!-- meta { "title": "...", "description": "...", "canonical": "...", "robots": "index, follow" } -->
```

**Kullanılabilir değişkenler**
`{{title}}` `{{description}}` `{{canonical}}` `{{robots}}` `{{cssPath}}`
`{{jsPath}}` `{{basePath}}` `{{version}}` `{{buildYear}}` + meta bloğundaki her anahtar

---

## Design system kuralları (denetim tarafından zorlanır)

| Kural | Açıklama |
|---|---|
| A1 | Bileşen dosyalarında primitive token (`--ink-*`, `--paper-*`, `--accent-*`) yasak — yalnızca semantic |
| A2 | Skala dışı px değeri yasak |
| A3 | Negatif margin yasak |
| A4 | `!important` yasak (reset ve utilities hariç) |
| A5 | ID seçici yasak |
| A6 | Üst boşluk yasak — boşluk aşağı akar |
| A7 | `border-radius` yalnızca `--radius-*` |
| A8 | `box-shadow` yalnızca `--shadow-*` |
| A9 | `text-transform: uppercase` yasak (Türkçe i/İ) |
| A10 | Yalnızca `opacity` / `transform` animasyonu |

Gerekçeli muafiyet:
```css
/* audit-ignore: A3 · neden gerekli olduğunun açıklaması */
```

---

## Bütçeler

| Kaynak | Bütçe | Şu an |
|---|---|---|
| CSS (küçültülmüş) | bilgi | 24.9 KB |
| CSS (gzip) | 7 KB | 4.9 KB |
| JS (ham) | 12 KB | 6.4 KB |
| JS (gzip) | 4 KB | 2.0 KB |
| HTML (sayfa başına) | 40 KB | 0.9 KB |

Bütçe aşımı **hata** olarak raporlanır, uyarı olarak değil.

---

## Geliştirme durumu

| Aşama | Kapsam | Durum |
|---|---|---|
| 1 | Temel: yapı, build, token, reset, base, font altyapısı | **tamam** |
| 2 | Düzen iskeleti: container · lane · section | **tamam** |
| 3 | Primitive bileşenler: button · link · icon · image | **tamam** |
| 4 | Global bileşenler: header · mobil menü · footer | **tamam** |
| 5 | Ana sayfa bölümleri · 03 kimler için · 04 çalışma şekli · 07 kapanış | **tamam** |
| 5b | Ana sayfa bölümleri · 01 açılış · 02 çalışmalar · 05 stüdyo · 06 SSS | **tamam** |
| 6 | Hareket ve cila | bekliyor |
| 7 | Performans ve SEO | bekliyor |
| 8 | Erişilebilirlik geçişi | bekliyor |
| 9 | Playwright test paketi | bekliyor |
| 10 | Alt sayfalar | bekliyor |
| 11 | Teslim | bekliyor |

---

## Teslim öncesi

- [ ] `npm run audit` — ihlal yok
- [ ] `npm run build:prod` — bütçe aşımı yok
- [ ] `src/pages/_dev-*.html` sayfaları silindi
- [ ] Font metrikleri gerçek dosyalarla doğrulandı
- [ ] `apple-touch-icon.png` gerçek marka ile eklendi
- [ ] `favicon.svg` geçici yer tutucudan gerçek marka işaretine çevrildi
- [ ] Playwright: 7 genişlikte sıfır taşma, sıfır konsol hatası
- [ ] Lighthouse ≥ 95 × 4 kategori (gerçek cihaz, kısıtlı 4G)
- [ ] LCP ≤ 1.5s · CLS ≤ 0.02 · INP ≤ 150ms
