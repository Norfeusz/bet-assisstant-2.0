# 📊 Skrypty Analityczne

Ten folder zawiera narzędzia do zaawansowanej analizy danych typów bukmacherskich.

## Przegląd

### `advanced-analytics.py`

Kompleksowy skrypt analizy danych wykorzystujący machine learning do:

- Analizy korelacji zmiennych
- Trenowania modeli predykcyjnych
- Generowania wag dla wzoru obliczania szans
- Wizualizacji wyników

## Instalacja

### Wymagania

```bash
pip install pandas numpy scikit-learn matplotlib seaborn
```

Lub:

```bash
pip install -r requirements-analytics.txt
```

## Użycie

### Krok 1: Eksport danych z systemu

```bash
# Z poziomu katalogu projektu
curl http://localhost:3000/api/analytics/export-csv > bets-data.csv
```

Lub otwórz w przeglądarce: `http://localhost:3000/analytics.html` i kliknij "Eksportuj do CSV"

### Krok 2: Uruchom analizę

```bash
python scripts/advanced-analytics.py
```

### Krok 3: Przejrzyj wyniki

Skrypt wygeneruje:

- **correlations.png** - wykres korelacji zmiennych z sukcesem
- **feature_importance.png** - ranking ważności cech w modelu
- **bet_type_performance.png** - skuteczność różnych typów zakładów
- **model_weights.json** - wagi do implementacji w kodzie

## Wyjście programu

```
🎰 Bet Assistant - Zaawansowana Analityka
============================================================

📊 Wczytywanie danych...
✅ Wczytano 360 rekordów

🔍 Analiza korelacji...
📊 Top 10 zmiennych skorelowanych z sukcesem:
   stat15HHa        0.523
   stat15AHa        0.487
   stat10HHa        0.445
   ...

🎯 Wybór cech (korelacja > 0.1)...
✅ Wybrano 12 cech

🤖 Trenowanie modeli...
📈 Logistic Regression...
   Accuracy:  68.5%
   Precision: 72.3%
   F1 Score:  70.1%
   ...

📈 Random Forest...
   Accuracy:  71.2%
   Precision: 74.8%
   F1 Score:  73.5%
   ...

✅ Analiza zakończona!
```

## Interpretacja wyników

### Korelacje

- **> 0.5**: Silna korelacja - bardzo ważna zmienna
- **0.3 - 0.5**: Umiarkowana korelacja - ważna zmienna
- **0.1 - 0.3**: Słaba korelacja - może być przydatna
- **< 0.1**: Brak korelacji - można pominąć

### Metryki modelu

- **Accuracy**: Ogólna skuteczność modelu
- **Precision**: Jakość pozytywnych predykcji (ile z przewidzianych sukcesów to rzeczywiste sukcesy)
- **Recall**: Kompletność (ile rzeczywistych sukcesów udało się złapać)
- **F1 Score**: Średnia harmoniczna precision i recall
- **AUC**: Obszar pod krzywą ROC (im bliżej 1, tym lepiej)

### Wagi (model_weights.json)

Przykład:

```json
{
  "stat15HHa": 0.1523,
  "stat15AHa": 0.1387,
  "stat10HHa": 0.1245,
  ...
}
```

Implementacja w JavaScript:

```javascript
function calculateChance(stats, weights) {
  let totalScore = 0;

  for (const [key, weight] of Object.entries(weights)) {
    const value = parseFloat(stats[key]) || 0;
    totalScore += value * weight;
  }

  return Math.round(totalScore * 100); // Procent
}
```

## Dostosowanie

### Zmiana progu korelacji

W pliku `advanced-analytics.py`, linia 108:

```python
features = select_features(df, correlations, threshold=0.1)  # Zwiększ dla bardziej selektywnego wyboru
```

### Zmiana parametrów modelu

Linia 118-122:

```python
models = {
    'Logistic Regression': LogisticRegression(max_iter=1000, C=1.0),  # C - regularyzacja
    'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=10)  # Dostosuj liczbę drzew
}
```

### Dodanie nowych modeli

```python
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier

models = {
    ...
    'SVM': SVC(probability=True, kernel='rbf'),
    'Neural Network': MLPClassifier(hidden_layer_sizes=(100, 50))
}
```

## Rozwiązywanie problemów

### Błąd: "No module named 'pandas'"

```bash
pip install pandas numpy scikit-learn matplotlib seaborn
```

### Błąd: "File not found: bets-data.csv"

Upewnij się, że:

1. Serwer jest uruchomiony (`npm run leagues:web`)
2. Eksportowałeś dane: `curl http://localhost:3000/api/analytics/export-csv > bets-data.csv`
3. Plik jest w tym samym katalogu co skrypt

### Ostrzeżenie: "FutureWarning"

To normalne - biblioteki aktualizują API. Dodaj na początku skryptu:

```python
import warnings
warnings.filterwarnings('ignore')
```

### Za mało danych

Jeśli masz < 50 zweryfikowanych typów, model może być niestabilny:

- Zbierz więcej danych
- Użyj prostszego modelu (Logistic Regression)
- Zmniejsz liczbę cech (wyższy threshold)

## Best Practices

1. **Regularnie aktualizuj model** - co 50-100 nowych typów
2. **Waliduj na nowych danych** - nie testuj na tych samych danych, na których trenowałeś
3. **Monitoruj metryki** - czy model nie pogarsza się w czasie
4. **Zapisuj wersje** - zachowaj historię wag dla porównań
5. **A/B testing** - porównaj nowy model ze starym na żywych danych

## Zaawansowane użycie

### Jupyter Notebook

Skopiuj kod do Jupyter Notebook dla interaktywnej analizy:

```bash
jupyter notebook scripts/advanced-analytics.ipynb
```

### Automatyczna aktualizacja

Dodaj do cron/harmonogramu zadań:

```bash
# Codziennie o 2:00
0 2 * * * cd /path/to/project && curl http://localhost:3000/api/analytics/export-csv > bets-data.csv && python scripts/advanced-analytics.py
```

### Integracja z API

Stwórz endpoint w Express do automatycznego przeliczania:

```typescript
// server/routes/analytics.ts
router.post("/analytics/retrain", async (req, res) => {
  // Eksportuj dane
  // Uruchom Python script
  // Załaduj nowe wagi
  // Zwróć wyniki
});
```

## Dalsze zasoby

- [Dokumentacja scikit-learn](https://scikit-learn.org/)
- [Pandas User Guide](https://pandas.pydata.org/docs/user_guide/)
- [Machine Learning dla początkujących](https://www.coursera.org/learn/machine-learning)

---

**Autor**: Bet Assistant Team  
**Wersja**: 1.0  
**Ostatnia aktualizacja**: 17 grudnia 2025
