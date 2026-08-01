# Bileşen kayıt defteri

> Bir bileşen, aşağıdaki 8 madde yazılmadan **üretilmiş sayılmaz**.
> Bu maddeler yazılmazsa bileşen altı ay sonra farklı yerlerde farklı
> davranmaya başlar. Sistemin ölçeklenmesi dokümantasyon disiplinine bağlıdır.

## Sözleşme şablonu

```
### <Bileşen adı>            katman: primitive | composite | section | global

1. Amaç              hangi kullanıcı problemini çözüyor
2. Anatomi           parçalar; hangileri opsiyonel
3. Varyantlar        ve her birinin ne zaman kullanılacağı
4. Durumlar          default · hover · active · focus · disabled · loading · empty · error
5. İçerik kuralları  maksimum karakter · ton · yasak ifadeler
6. Erişilebilirlik   rol · etiket · klavye davranışı · odak yönetimi
7. Duyarlı davranış  her breakpoint'te ne olur
8. Do / Don't        en az 2'şer örnek
```

## Yapısal kurallar

1. **Bileşen kendi dış boşluğunu belirlemez.** Dış boşluk, bileşeni yerleştiren
   üst yapının (Section) sorumluluğudur. Aksi halde aynı bileşen farklı
   bağlamlarda düzeltilemez.
2. **Bileşen sabit sayı kullanmaz.** Yalnızca token. İhtiyaç varsa token eklenir.
3. **Bileşen kendi genişliğini varsaymaz.** Şerit genişliği dışarıdan gelir.
4. **JS'siz çalışır.** JS bileşeni geliştirir, var etmez.
5. **En az 2 gerçek kullanım yeri olmalı.** Tek kullanımlık bileşen soyutlama
   borcudur.
6. **Boş ve hata durumu tasarlanmadan bileşen bitmiş sayılmaz.**

---

## Envanter

| Bileşen | Katman | JS | Aşama | Durum |
|---|---|---|---|---|
| Button | primitive | — | 3 | bekliyor |
| Link | primitive | — | 3 | bekliyor |
| Icon | primitive | — | 3 | bekliyor |
| Image | primitive | — | 3 | bekliyor |
| Header | global | ✓ | 4 | bekliyor |
| MobileNav | global | ✓ | 4 | bekliyor |
| Footer | global | — | 4 | bekliyor |
| SkipLink | global | — | 4 | bekliyor |
| SectionHeader | composite | — | 5 | bekliyor |
| WorkItem | composite | — | 5 | bekliyor |
| AudienceRow | composite | — | 5 | bekliyor |
| ContrastList | composite | — | 5 | bekliyor |
| ProcessStep | composite | — | 5 | bekliyor |
| CommitmentItem | composite | — | 5 | bekliyor |
| StudioCard | composite | — | 5 | bekliyor |
| FAQItem | composite | ✓ | 5 | bekliyor |
| ContactForm | composite | ✓ | 10 | bekliyor |

**JS gerektiren bileşen sayısı: 4.** Diğer 13 bileşen tamamen HTML ve CSS.

---

## Aşama 1'de tanımlanan temel katman

Aşama 1 bileşen üretmez; bileşenlerin üzerine kurulacağı zemini üretir.

| Katman | Dosya | Ne sağlar |
|---|---|---|
| reset | `01-reset.css` | Davranış sıfırlaması, hareket azaltma, Türkçe kırılma |
| tokens | `02-tokens/*.css` | Renk · boşluk · tipografi · düzen · hareket |
| base | `03-base/*.css` | Font yükleme, belge, element tipografisi, medya |
| utilities | `06-utilities.css` | visually-hidden · no-scroll · measure · reveal |

Bileşenler yalnızca **semantic** token kullanır (kural A1).
