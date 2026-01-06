# 🥗 Diet & Fitness App - Zivata

Kişiselleştirilmiş diyet planları oluşturan, BMI hesaplayan ve akıllı mutfak yönetimi sunan modern bir sağlık uygulaması.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 İçindekiler

- [Özellikler](#-özellikler)
- [Teknolojiler](#-teknolojiler)
- [Kurulum](#-kurulum)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [API Endpoints](#-api-endpoints)
- [Proje Yapısı](#-proje-yapısı)

---

## ✨ Özellikler

### 🎯 Kullanıcı Profili & Onboarding
- **Dinamik Vücut Silueti**: BMI'ye göre renk ve şekil değiştiren görsel gösterim
- **Gerçek Zamanlı BMI Hesaplama**: Boy ve kilo değiştikçe anında güncelleme
- **Cinsiyet Bazlı Görselleştirme**: Erkek ve kadın için ayrı siluetler

### 🥘 Akıllı Mutfak Yönetimi (Pantry Manager)
- Evdeki malzemeleri etiket olarak ekleme
- Malzeme bazlı yemek önerileri
- Kolay ekleme/silme arayüzü

### 📊 Sağlık Metrikleri
- BMI (Vücut Kitle İndeksi) hesaplama
- Aktivite seviyesi takibi
- Kişiselleştirilmiş kalori hedefleri

### 🤖 AI Destekli Koçluk (Yakında)
- Google Gemini API entegrasyonu
- Akıllı diyet önerileri
- Sohbet bazlı danışmanlık

---

## 🛠 Teknolojiler

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy, Pydantic |
| **Veritabanı** | SQLite |
| **İkonlar** | Lucide React |

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+ 
- Python 3.11+
- npm veya yarn

### 1. Repoyu Klonlayın

```bash
git clone https://github.com/sametkzl22/dietappzivata.git
cd dietappzivata
```

### 2. Backend Kurulumu

```bash
# Sanal ortam oluşturun
python -m venv venv

# Sanal ortamı aktifleştirin
# macOS/Linux:
source venv/bin/activate
# Windows:
.\venv\Scripts\activate

# Bağımlılıkları yükleyin
pip install -r requirements.txt

# .env dosyası oluşturun
cp .env.example .env
# .env dosyasına GEMINI_API_KEY ekleyin (opsiyonel)
```

### 3. Frontend Kurulumu

```bash
cd frontend
npm install
```

### 4. Uygulamayı Başlatın

**Terminal 1 - Backend:**
```bash
# Ana dizinde
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Tarayıcıda Açın

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 📖 Kullanım Kılavuzu

### 1️⃣ Profil Oluşturma (Onboarding)

1. Tarayıcıda `http://localhost:3000/onboarding` adresine gidin
2. **Kişisel Bilgilerinizi Girin:**
   - Ad Soyad
   - Cinsiyet (Erkek/Kadın)
   - Boy (cm)
   - Kilo (kg)
   - Yaş
   - Aktivite Seviyesi

3. **Dinamik Silueti İzleyin:**
   - Sağ panelde vücut silueti gerçek zamanlı güncellenir
   - BMI değerine göre renk değişir:
     - 🔵 **Mavi**: Zayıf (BMI < 18.5)
     - 🟢 **Yeşil**: Normal (BMI 18.5-24.9)
     - 🟡 **Sarı**: Fazla Kilolu (BMI 25-29.9)
     - 🔴 **Kırmızı**: Obez (BMI ≥ 30)

### 2️⃣ Mutfak Yönetimi (Pantry)

1. **Malzeme Ekleyin:**
   - "My Pantry" bölümündeki input alanına malzeme yazın
   - Enter tuşuna basın veya + butonuna tıklayın
   - Örnek: "Yumurta", "Tavuk Göğsü", "Brokoli"

2. **Malzeme Silin:**
   - Malzeme etiketindeki X ikonuna tıklayın

### 3️⃣ Dashboard

1. `http://localhost:3000/dashboard` adresine gidin
2. Günlük kalori hedeflerinizi görün
3. Öğün planlarınızı takip edin
4. AI Coach ile sohbet edin (API key gerekli)

### 4️⃣ API Kullanımı

Backend API'yi doğrudan kullanmak için:

```bash
# Kullanıcı oluşturma
curl -X POST "http://localhost:8000/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "age": 30,
    "gender": "male",
    "height_cm": 180,
    "weight_kg": 85,
    "activity_level": "moderate"
  }'

# Diyet planı oluşturma
curl -X POST "http://localhost:8000/users/1/diet-plan" \
  -H "Content-Type: application/json" \
  -d '{
    "goal": "lose_weight",
    "dietary_restrictions": ["gluten_free"]
  }'
```

---

## 🔌 API Endpoints

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| `POST` | `/users/` | Yeni kullanıcı oluştur |
| `GET` | `/users/{id}` | Kullanıcı bilgilerini getir |
| `PUT` | `/users/{id}` | Kullanıcı güncelle |
| `POST` | `/users/{id}/diet-plan` | Diyet planı oluştur |
| `GET` | `/users/{id}/metrics` | Sağlık metriklerini hesapla |
| `POST` | `/pantry/` | Mutfak malzemesi ekle |
| `GET` | `/pantry/{user_id}` | Kullanıcının mutfağını getir |

Detaylı API dokümantasyonu için: `http://localhost:8000/docs`

---

## 📁 Proje Yapısı

```
dietappzivata/
├── frontend/                 # Next.js Frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx           # Ana sayfa
│   │   │   ├── dashboard/         # Dashboard sayfası
│   │   │   └── onboarding/        # Onboarding sayfası
│   │   ├── components/
│   │   │   ├── Silhouette.tsx     # Dinamik vücut silueti
│   │   │   ├── PantryManager.tsx  # Mutfak yöneticisi
│   │   │   ├── CoachWidget.tsx    # AI koç widget'ı
│   │   │   ├── MealCard.tsx       # Öğün kartı
│   │   │   └── StatsCard.tsx      # İstatistik kartı
│   │   └── lib/
│   │       └── api.ts             # API helper fonksiyonları
│   └── package.json
│
├── main.py                   # FastAPI ana dosyası
├── models.py                 # SQLAlchemy modelleri
├── schemas.py                # Pydantic şemaları
├── database.py               # Veritabanı bağlantısı
├── engine.py                 # Diyet motoru
├── ai_service.py             # AI servis sınıfı
├── requirements.txt          # Python bağımlılıkları
└── README.md                 # Bu dosya
```

---

## 🔧 Ortam Değişkenleri

`.env` dosyası oluşturun:

```env
# Veritabanı
DATABASE_URL=sqlite:///./diet_fitness.db

# AI Servisi (Opsiyonel)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

---

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

---

## 👨‍💻 Geliştirici

**Samet Kızıl** - [@sametkzl22](https://github.com/sametkzl22)

---

<p align="center">
  Made with ❤️ for a healthier life
</p>
