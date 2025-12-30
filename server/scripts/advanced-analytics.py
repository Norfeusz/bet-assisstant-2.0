"""
Bet Assistant - Advanced Analytics Script
==========================================

Ten skrypt przeprowadza zaawansowaną analizę danych z typów bukmacherskich
i tworzy predykcyjny model do określania szans powodzenia.

Wymagania:
    pip install pandas numpy scikit-learn matplotlib seaborn

Użycie:
    1. Eksportuj dane: curl http://localhost:3000/api/analytics/export-csv > bets-data.csv
    2. Uruchom: python advanced-analytics.py
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

# Konfiguracja
CSV_FILE = 'bets-data.csv'
TEST_SIZE = 0.2
RANDOM_STATE = 42

def load_and_prepare_data(filepath):
    """Wczytaj i przygotuj dane do analizy"""
    print("📊 Wczytywanie danych...")
    df = pd.read_csv(filepath, encoding='utf-8-sig')
    
    print(f"✅ Wczytano {len(df)} rekordów")
    print(f"📋 Kolumny: {list(df.columns)}")
    
    # Konwersja wyniku na wartość binarną
    df['Success'] = (df['Wszedł'].str.lower() == 'tak').astype(int)
    
    # Konwersja procentów na liczby dziesiętne
    percent_columns = [col for col in df.columns if '%' in col]
    for col in percent_columns:
        df[col] = df[col].str.rstrip('%').astype(float) / 100
    
    return df

def analyze_correlations(df):
    """Analiza korelacji między zmiennymi a sukcesem"""
    print("\n🔍 Analiza korelacji...")
    
    # Wybierz kolumny numeryczne
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    
    # Oblicz korelacje z sukcesem
    correlations = df[numeric_cols].corrwith(df['Success']).sort_values(ascending=False)
    
    print("\n📊 Top 10 zmiennych skorelowanych z sukcesem:")
    print(correlations.head(10))
    
    print("\n📊 Top 10 zmiennych negatywnie skorelowanych:")
    print(correlations.tail(10))
    
    # Wizualizacja
    plt.figure(figsize=(12, 8))
    correlations.drop('Success').plot(kind='barh')
    plt.title('Korelacja zmiennych z sukcesem typu')
    plt.xlabel('Korelacja Pearsona')
    plt.tight_layout()
    plt.savefig('correlations.png', dpi=300, bbox_inches='tight')
    print("\n💾 Zapisano wykres: correlations.png")
    
    return correlations

def select_features(df, correlations, threshold=0.1):
    """Wybierz najważniejsze cechy do modelu"""
    print(f"\n🎯 Wybór cech (korelacja > {threshold})...")
    
    # Cechy z wysoką korelacją (dodatnią lub ujemną)
    important_features = correlations[abs(correlations) > threshold].index.tolist()
    important_features.remove('Success')  # Usuń zmienną docelową
    
    print(f"✅ Wybrano {len(important_features)} cech:")
    for feat in important_features:
        print(f"   - {feat}: {correlations[feat]:.3f}")
    
    return important_features

def train_models(X_train, X_test, y_train, y_test):
    """Trenuj i porównaj różne modele"""
    print("\n🤖 Trenowanie modeli...")
    
    models = {
        'Logistic Regression': LogisticRegression(max_iter=1000, random_state=RANDOM_STATE),
        'Random Forest': RandomForestClassifier(n_estimators=100, random_state=RANDOM_STATE)
    }
    
    results = {}
    
    for name, model in models.items():
        print(f"\n📈 {name}...")
        
        # Trenowanie
        model.fit(X_train, y_train)
        
        # Predykcje
        y_pred = model.predict(X_test)
        y_proba = model.predict_proba(X_test)[:, 1]
        
        # Metryki
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred)
        recall = recall_score(y_test, y_pred)
        f1 = f1_score(y_test, y_pred)
        auc = roc_auc_score(y_test, y_proba)
        
        # Cross-validation
        cv_scores = cross_val_score(model, X_train, y_train, cv=5, scoring='accuracy')
        
        results[name] = {
            'model': model,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1,
            'auc': auc,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std()
        }
        
        print(f"   Accuracy:  {accuracy:.2%}")
        print(f"   Precision: {precision:.2%}")
        print(f"   Recall:    {recall:.2%}")
        print(f"   F1 Score:  {f1:.2%}")
        print(f"   AUC:       {auc:.3f}")
        print(f"   CV Score:  {cv_scores.mean():.2%} (±{cv_scores.std():.2%})")
        
        # Confusion Matrix
        cm = confusion_matrix(y_test, y_pred)
        print(f"\n   Confusion Matrix:")
        print(f"   TN: {cm[0,0]:3d}  FP: {cm[0,1]:3d}")
        print(f"   FN: {cm[1,0]:3d}  TP: {cm[1,1]:3d}")
    
    return results

def analyze_feature_importance(model, feature_names):
    """Analiza ważności cech (dla Random Forest)"""
    if hasattr(model, 'feature_importances_'):
        print("\n🎯 Ważność cech (Random Forest):")
        
        importances = pd.DataFrame({
            'feature': feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(importances.head(10))
        
        # Wizualizacja
        plt.figure(figsize=(12, 8))
        importances.head(15).plot(x='feature', y='importance', kind='barh')
        plt.title('Ważność cech w modelu Random Forest')
        plt.xlabel('Ważność')
        plt.tight_layout()
        plt.savefig('feature_importance.png', dpi=300, bbox_inches='tight')
        print("\n💾 Zapisano wykres: feature_importance.png")
        
        return importances

def generate_weights_formula(correlations, features):
    """Wygeneruj formułę z wagami dla każdej cechy"""
    print("\n📐 Sugerowana formuła obliczania szans:")
    print("\nszanse = (")
    
    # Normalizuj korelacje do sum = 1
    abs_correlations = abs(correlations[features])
    normalized_weights = abs_correlations / abs_correlations.sum()
    
    for i, (feat, weight) in enumerate(normalized_weights.items()):
        operator = "+" if i == 0 else "  +"
        print(f"  {operator} {weight:.4f} × {feat}")
    
    print(") × 100%")
    
    # Zapisz wagi do pliku JSON
    weights_dict = normalized_weights.to_dict()
    
    import json
    with open('model_weights.json', 'w', encoding='utf-8') as f:
        json.dump(weights_dict, f, indent=2, ensure_ascii=False)
    
    print("\n💾 Zapisano wagi do: model_weights.json")
    
    return weights_dict

def analyze_by_bet_type(df):
    """Analiza skuteczności według typu zakładu"""
    print("\n📊 Analiza według typu zakładu:")
    
    bet_stats = df.groupby('Zakład').agg({
        'Success': ['count', 'sum', 'mean']
    }).round(3)
    
    bet_stats.columns = ['Liczba', 'Trafione', 'Skuteczność']
    bet_stats['Skuteczność'] = bet_stats['Skuteczność'] * 100
    bet_stats = bet_stats.sort_values('Skuteczność', ascending=False)
    
    print(bet_stats)
    
    # Wizualizacja
    if len(bet_stats) > 0:
        plt.figure(figsize=(12, 6))
        bet_stats['Skuteczność'].plot(kind='bar')
        plt.title('Skuteczność według typu zakładu')
        plt.ylabel('Skuteczność (%)')
        plt.xlabel('Typ zakładu')
        plt.xticks(rotation=45, ha='right')
        plt.axhline(y=50, color='r', linestyle='--', label='50% (próg)')
        plt.legend()
        plt.tight_layout()
        plt.savefig('bet_type_performance.png', dpi=300, bbox_inches='tight')
        print("\n💾 Zapisano wykres: bet_type_performance.png")

def analyze_by_league(df):
    """Analiza skuteczności według ligi"""
    print("\n🏆 Analiza według ligi:")
    
    league_stats = df.groupby('Liga').agg({
        'Success': ['count', 'sum', 'mean']
    }).round(3)
    
    league_stats.columns = ['Liczba', 'Trafione', 'Skuteczność']
    league_stats['Skuteczność'] = league_stats['Skuteczność'] * 100
    league_stats = league_stats[league_stats['Liczba'] >= 5]  # Min 5 typów
    league_stats = league_stats.sort_values('Skuteczność', ascending=False)
    
    print(league_stats.head(15))

def analyze_odds_impact(df):
    """Analiza wpływu kursu na skuteczność"""
    print("\n💰 Analiza wpływu kursu:")
    
    df['OddsRange'] = pd.cut(df['Kurs'], bins=[0, 1.5, 2, 2.5, 3, 100], 
                              labels=['< 1.5', '1.5-2.0', '2.0-2.5', '2.5-3.0', '≥ 3.0'])
    
    odds_stats = df.groupby('OddsRange').agg({
        'Success': ['count', 'sum', 'mean']
    }).round(3)
    
    odds_stats.columns = ['Liczba', 'Trafione', 'Skuteczność']
    odds_stats['Skuteczność'] = odds_stats['Skuteczność'] * 100
    
    print(odds_stats)

def main():
    """Główna funkcja analizy"""
    print("=" * 60)
    print("🎰 Bet Assistant - Zaawansowana Analityka")
    print("=" * 60)
    
    # 1. Wczytaj dane
    df = load_and_prepare_data(CSV_FILE)
    
    # 2. Podstawowe statystyki
    print(f"\n📊 Podstawowe statystyki:")
    print(f"   Wszystkie typy:  {len(df)}")
    print(f"   Trafione:        {df['Success'].sum()} ({df['Success'].mean()*100:.1f}%)")
    print(f"   Nietrafione:     {len(df) - df['Success'].sum()} ({(1-df['Success'].mean())*100:.1f}%)")
    
    # 3. Analiza korelacji
    correlations = analyze_correlations(df)
    
    # 4. Wybór cech
    features = select_features(df, correlations, threshold=0.1)
    
    # Przygotuj dane do treningu
    X = df[features].fillna(df[features].mean())
    y = df['Success']
    
    # Normalizacja
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=features)
    
    # Podział train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )
    
    print(f"\n✂️  Podział danych:")
    print(f"   Trening: {len(X_train)} ({len(X_train)/len(df)*100:.1f}%)")
    print(f"   Test:    {len(X_test)} ({len(X_test)/len(df)*100:.1f}%)")
    
    # 5. Trenowanie modeli
    results = train_models(X_train, X_test, y_train, y_test)
    
    # 6. Analiza ważności cech
    best_model = results['Random Forest']['model']
    analyze_feature_importance(best_model, features)
    
    # 7. Generuj formułę
    weights = generate_weights_formula(correlations, features)
    
    # 8. Dodatkowe analizy
    analyze_by_bet_type(df)
    analyze_by_league(df)
    analyze_odds_impact(df)
    
    # 9. Podsumowanie
    print("\n" + "=" * 60)
    print("✅ Analiza zakończona!")
    print("=" * 60)
    print("\n📁 Wygenerowane pliki:")
    print("   - correlations.png          (wykres korelacji)")
    print("   - feature_importance.png    (ważność cech)")
    print("   - bet_type_performance.png  (skuteczność typów)")
    print("   - model_weights.json        (wagi do implementacji)")
    
    print("\n🎯 Najlepszy model:")
    best_name = max(results.items(), key=lambda x: x[1]['f1'])[0]
    best_results = results[best_name]
    print(f"   {best_name}")
    print(f"   Accuracy:  {best_results['accuracy']:.2%}")
    print(f"   F1 Score:  {best_results['f1']:.2%}")
    print(f"   AUC:       {best_results['auc']:.3f}")
    
    print("\n💡 Następne kroki:")
    print("   1. Zaimplementuj wagi z model_weights.json w kodzie")
    print("   2. Testuj nowy wzór na nowych danych")
    print("   3. Zbieraj więcej danych i przeliczy model co ~50-100 typów")
    print("   4. Monitoruj ROI i dostosowuj wagi w razie potrzeby")

if __name__ == '__main__':
    main()
