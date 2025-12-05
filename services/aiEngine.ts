import { Greenhouse, Prediction, RiskLevel } from '../types';

export interface SimulatedMetric {
    temp: number;
    hum: number;
    hour: number;
}

// --- Helper: Generate Simulation Data ---
// Creates a 24-hour scattering of data points to visualize correlations
export const generateSimulatedHistory = (assetId: string): SimulatedMetric[] => {
    // Seed random based on asset ID for consistency
    const seed = assetId.charCodeAt(assetId.length - 1);
    const data: SimulatedMetric[] = [];
    
    // Base conditions based on simple mod logic
    let baseTemp = 20;
    let baseHum = 60;
    
    // Simulate a "Bad" asset vs "Good" asset based on ID parity
    if (seed % 2 === 0) {
        baseTemp = 18;
        baseHum = 88; // High humidity asset (prone to fungus)
    } else if (seed % 3 === 0) {
        baseTemp = 32; // Hot asset (prone to heat stress)
        baseHum = 40;
    }

    for (let i = 0; i < 24; i++) {
        data.push({
            hour: i,
            temp: baseTemp + Math.sin(i/3)*5 + (Math.random()*2),
            hum: Math.min(100, Math.max(0, baseHum + Math.cos(i/4)*10 + (Math.random()*5)))
        });
    }
    return data;
};

// --- CORE: AI INFERENCE ENGINE ---
// This acts as the "Python Backend" performing data science on sensor readings
export const analyzeAssetRisk = (asset: Greenhouse, history: SimulatedMetric[]): Prediction[] => {
    const predictions: Prediction[] = [];
    
    // Average metrics from history (simplified for immediate prediction)
    const avgTemp = history.reduce((acc, h) => acc + h.temp, 0) / history.length;
    const avgHum = history.reduce((acc, h) => acc + h.hum, 0) / history.length;
    const maxTemp = Math.max(...history.map(h => h.temp));
    const minTemp = Math.min(...history.map(h => h.temp));

    // --- RULES FOR GREENHOUSES (Invernadero) ---
    if (asset.assetType === 'Invernadero') {
        // 1. Botrytis cinerea (Moho Gris)
        // High Hum (>85%) + Mod Temp (15-25°C)
        if (avgHum > 80 && avgTemp > 12 && avgTemp < 28) {
            const prob = Math.min(99, ((avgHum - 80) * 3) + 40);
            predictions.push({
                id: `p_botrytis_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Moho Gris (Botrytis)',
                scientificName: 'Botrytis cinerea',
                probability: Math.round(prob),
                riskLevel: prob > 80 ? 'Critical' : 'High',
                description: 'Detectada "ventana de Botrytis": Humedad > 80% con temperaturas moderadas.',
                recommendation: 'Aumentar ventilación inmediatamente. Aplicar fungicida preventivo si persiste por +4 horas.',
                affectedCrops: ['Fresas', 'Tomates', 'Flores', 'Cannabis']
            });
        }

        // 2. Oídio (Powdery Mildew)
        // High Hum + Specific Temp Range
        if (avgHum > 70 && avgTemp > 20 && avgTemp < 30) {
            predictions.push({
                id: `p_oidio_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Oídio (Moho Polvoriento)',
                scientificName: 'Sphaerotheca macularis',
                probability: 65,
                riskLevel: 'Medium',
                description: 'Condiciones favorables para la esporulación del Oídio.',
                recommendation: 'Monitorear envés de las hojas. Reducir humedad nocturna.',
                affectedCrops: ['Rosas', 'Bayas', 'Pepinos']
            });
        }

        // 3. Downy Mildew (Mildiu Velloso)
        // Very High Hum (>90%)
        if (avgHum > 90) {
            predictions.push({
                id: `p_mildiu_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Mildiu Velloso',
                scientificName: 'Plasmopara viticola',
                probability: 92,
                riskLevel: 'Critical',
                description: 'Condición de "Hoja Mojada" detectada (>90% HR). Riesgo inminente.',
                recommendation: 'Fumigación de precisión urgente. Ventilación forzada máxima.',
                affectedCrops: ['Uvas', 'Hortalizas']
            });
        }

        // 4. Frost Damage (Heladas)
        if (minTemp < 4) {
            const prob = minTemp < 0 ? 100 : 80;
            predictions.push({
                id: `p_frost_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Riesgo de Helada',
                scientificName: 'Daño Fisiológico',
                probability: prob,
                riskLevel: 'Critical',
                description: `Temperatura mínima registrada de ${minTemp.toFixed(1)}°C.`,
                recommendation: 'Activar sistemas de calefacción o riego anti-helada.',
                affectedCrops: ['Todos']
            });
        }

        // 5. Heat Stress / Sunburn
        if (maxTemp > 35) {
            predictions.push({
                id: `p_heat_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Estrés Térmico / Golpe de Calor',
                scientificName: 'Daño Fisiológico',
                probability: 85,
                riskLevel: 'High',
                description: 'Temperaturas superiores al umbral óptimo de la planta.',
                recommendation: 'Activar sombreado y nebulización. Aumentar frecuencia de riego.',
                affectedCrops: ['Flores', 'Frutales']
            });
        }
    }

    // --- RULES FOR SILOS (Almacenamiento) ---
    if (asset.assetType === 'Silo' || asset.assetType === 'Otro') {
        // 1. Aflatoxins
        // High Temp + High Hum in Storage
        if (avgTemp > 25 && avgHum > 16) { // Grain moisture proxy
             predictions.push({
                id: `p_afla_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Riesgo de Aflatoxinas',
                scientificName: 'Aspergillus flavus',
                probability: 88,
                riskLevel: 'Critical',
                description: 'Zona caliente detectada. Riesgo de micotoxinas cancerígenas.',
                recommendation: 'Aireación focalizada inmediata para enfriar el grano.',
                affectedCrops: ['Maíz', 'Maní', 'Granos']
            });
        }

        // 2. Insects / Hotspots
        if (avgTemp > 30) {
            predictions.push({
                id: `p_hotspot_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Posible Punto Caliente (Hotspot)',
                scientificName: 'Actividad Metabólica',
                probability: 75,
                riskLevel: 'High',
                description: 'Aumento anormal de temperatura local. Posible actividad de insectos.',
                recommendation: 'Muestrear zona afectada. Verificar infestación de gorgojos.',
                affectedCrops: ['Todos los granos']
            });
        }
        
         // 3. Moisture Migration
        if (Math.abs(maxTemp - minTemp) > 15) {
             predictions.push({
                id: `p_migra_${asset.id}`,
                assetId: asset.id,
                diseaseName: 'Migración de Humedad',
                scientificName: 'Condensación',
                probability: 60,
                riskLevel: 'Medium',
                description: 'Gradiente térmico alto entre grano y pared. Riesgo de costras.',
                recommendation: 'Homogeneizar temperatura con ventilación.',
                affectedCrops: ['Todos los granos']
            });
        }
    }

    // Default "Low Risk" entry if nothing else triggers
    if (predictions.length === 0) {
        predictions.push({
            id: `p_safe_${asset.id}`,
            assetId: asset.id,
            diseaseName: 'Condiciones Óptimas',
            probability: 5,
            riskLevel: 'Low',
            description: 'Los parámetros se mantienen dentro de los rangos seguros.',
            recommendation: 'Mantener monitoreo estándar.',
            affectedCrops: []
        });
    }

    return predictions.sort((a,b) => b.probability - a.probability);
};