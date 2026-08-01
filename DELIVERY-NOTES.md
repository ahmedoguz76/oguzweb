# Teslim Notları

Bu iterasyonda tamamlananlar:

- İletişim sayfası
- İşler liste sayfası
- LUMÉA Smile Studio proje detay sayfası
- Çalışma Şekli sayfası
- Stüdyo sayfası
- Gizlilik Politikası
- Çerez Politikası
- Sitemap
- Alt sayfalar için ortak responsive bileşenler
- Ana CSS import listesindeki tekrarların temizlenmesi

## Yayından önce kontrol edilmesi gereken tek bilgi

İletişim e-postası `oguzdesigntr@outlook.com`, telefon numarası `0505 043 27 16` olarak ayarlanmıştır.
Farklı bir e-posta kullanılacaksa projede bu metni aratıp gerçek adresle değiştirin.

## Görsel içerik

Proje kartları özgün arayüz temsilleriyle çalışır. Gerçek müşteri ekran görüntüleri hazır olduğunda
`src/images/` üzerinden eklenerek portföyün ikna gücü artırılabilir.

## Fontlar

Font dosyaları lisans ve depo boyutu nedeniyle ZIP'e gömülmemiştir. Ağ erişimi varken:

```bash
npm run fonts
npm run build:prod
```

## Doğrulama

`npm run check` başarıyla tamamlandı:

- 32 kaynak dosyada tasarım sistemi ihlali yok
- CSS gzip bütçesi içinde
- JS gzip bütçesi içinde
- Tüm HTML sayfaları boyut bütçesi içinde


## Kritik düzeltmeler v4
- Portföy projeleri “Konsept çalışma” ve “Kendi ürünümüz” olarak açıkça etiketlendi.
- Ana sayfadaki tüm proje bağlantıları kendi detay sayfalarına bağlandı.
- Mehmet Kemal, Doruk Smile ve FlowOS için ayrı proje detay sayfaları eklendi.
- LUMÉA vaka metni gerçek müşteri izlenimi vermeyecek şekilde düzeltildi.
- Sitemap yeni proje sayfalarıyla güncellendi.

## Portföy Sprinti
- Dent Notes, Doruk Smile ve Şükrü Gülalan gerçek ekran görüntüleriyle ana sayfaya eklendi.
- Masaüstü + mobil sunumları WebP olarak optimize edildi.
- Canlı demo bağlantıları eklendi.
- Dent Notes ve Şükrü Gülalan için vaka çalışma sayfaları oluşturuldu.
- Instagram bağlantısı @oguz.web olarak footer'a eklendi.
- Eski konsept portföy sayfaları production paketinden çıkarıldı.
