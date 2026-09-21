/**
 * SnapFind AI - Internationalization (i18n) & Localization System
 * 
 * Supports:
 * - English (en-US)
 * - Spanish (es-ES)
 * - French (fr-FR)
 * - German (de-DE)
 * - Japanese (ja-JP)
 * - Chinese (zh-CN)
 * - Urdu (ur-PK) [Full RTL support]
 */

export type SupportedLanguage = "en-US" | "es-ES" | "fr-FR" | "de-DE" | "ja-JP" | "zh-CN" | "ur-PK";

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  isRtl: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: "en-US", name: "English (US)", nativeName: "English", isRtl: false },
  { code: "es-ES", name: "Spanish", nativeName: "Español", isRtl: false },
  { code: "fr-FR", name: "French", nativeName: "Français", isRtl: false },
  { code: "de-DE", name: "German", nativeName: "Deutsch", isRtl: false },
  { code: "ja-JP", name: "Japanese", nativeName: "日本語", isRtl: false },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "中文 (简体)", isRtl: false },
  { code: "ur-PK", name: "Urdu", nativeName: "اردو", isRtl: true },
];

export const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  "en-US": {
    "nav.dashboard": "Dashboard",
    "nav.gallery": "Gallery",
    "nav.search": "Search",
    "nav.collections": "Collections",
    "nav.trash": "Trash",
    "nav.history": "History",
    "nav.founders": "Founders Club",
    "nav.pricing": "Plans & Pricing",
    "nav.settings": "Settings",
    "nav.import": "Import",
    "nav.duplicates": "Duplicates",
    "action.upload": "Upload Screenshot",
    "action.import": "Import Screenshots",
    "action.search": "Search Screenshots",
    "action.clean_duplicates": "Clean Duplicates",
    "action.inspect": "Inspect",
    "action.delete": "Delete",
    "action.restore": "Restore",
    "action.favorite": "Favorite",
    "action.save": "Save Changes",
    "status.already_indexed": "Already Indexed",
    "status.duplicate": "Duplicate",
    "status.processing": "Processing",
    "status.completed": "Completed",
    "status.private": "Private",
    "status.highly_sensitive": "Highly Sensitive",
    "privacy.title": "Privacy & Security",
    "privacy.sensitive_detected": "Sensitive Information Detected",
    "settings.appearance": "Appearance & Theme",
    "settings.accent": "Interface Accent Tone",
    "settings.language": "Interface Language",
    "settings.density": "Compact Grid Density",
  },
  "es-ES": {
    "nav.dashboard": "Panel de Control",
    "nav.gallery": "Galería",
    "nav.search": "Búsqueda",
    "nav.collections": "Colecciones",
    "nav.trash": "Papelera",
    "nav.history": "Historial",
    "nav.founders": "Club de Fundadores",
    "nav.pricing": "Planes y Precios",
    "nav.settings": "Configuración",
    "nav.import": "Importar",
    "nav.duplicates": "Duplicados",
    "action.upload": "Subir Captura",
    "action.import": "Importar Capturas",
    "action.search": "Buscar Capturas",
    "action.clean_duplicates": "Limpiar Duplicados",
    "action.inspect": "Inspeccionar",
    "action.delete": "Eliminar",
    "action.restore": "Restaurar",
    "action.favorite": "Favorito",
    "action.save": "Guardar Cambios",
    "status.already_indexed": "Ya Indexado",
    "status.duplicate": "Duplicado",
    "status.processing": "Procesando",
    "status.completed": "Completado",
    "status.private": "Privado",
    "status.highly_sensitive": "Muy Confidencial",
    "privacy.title": "Privacidad y Seguridad",
    "privacy.sensitive_detected": "Información Confidencial Detectada",
    "settings.appearance": "Apariencia y Tema",
    "settings.accent": "Tono de Acento de la Interfaz",
    "settings.language": "Idioma de la Interfaz",
    "settings.density": "Densidad de Cuadrícula Compacta",
  },
  "fr-FR": {
    "nav.dashboard": "Tableau de Bord",
    "nav.gallery": "Galerie",
    "nav.search": "Recherche",
    "nav.collections": "Collections",
    "nav.trash": "Corbeille",
    "nav.history": "Historique",
    "nav.founders": "Club des Fondateurs",
    "nav.pricing": "Formules & Tarifs",
    "nav.settings": "Paramètres",
    "nav.import": "Importer",
    "nav.duplicates": "Doublons",
    "action.upload": "Téléverser Capture",
    "action.import": "Importer Captures",
    "action.search": "Rechercher Captures",
    "action.clean_duplicates": "Nettoyer Doublons",
    "action.inspect": "Inspecter",
    "action.delete": "Supprimer",
    "action.restore": "Restaurer",
    "action.favorite": "Favori",
    "action.save": "Enregistrer",
    "status.already_indexed": "Déjà Indexé",
    "status.duplicate": "Doublon",
    "status.processing": "Traitement en cours",
    "status.completed": "Terminé",
    "status.private": "Privé",
    "status.highly_sensitive": "Hautement Sensible",
    "privacy.title": "Confidentialité & Sécurité",
    "privacy.sensitive_detected": "Données Sensibles Détectées",
    "settings.appearance": "Apparence & Thème",
    "settings.accent": "Ton d'Accent de l'Interface",
    "settings.language": "Langue de l'Interface",
    "settings.density": "Densité de Grille Compacte",
  },
  "de-DE": {
    "nav.dashboard": "Übersicht",
    "nav.gallery": "Galerie",
    "nav.search": "Suche",
    "nav.collections": "Sammlungen",
    "nav.trash": "Papierkorb",
    "nav.history": "Verlauf",
    "nav.founders": "Gründer-Club",
    "nav.pricing": "Preise & Tarife",
    "nav.settings": "Einstellungen",
    "nav.import": "Importieren",
    "nav.duplicates": "Duplikate",
    "action.upload": "Screenshot hochladen",
    "action.import": "Screenshots importieren",
    "action.search": "Screenshots durchsuchen",
    "action.clean_duplicates": "Duplikate bereinigen",
    "action.inspect": "Prüfen",
    "action.delete": "Löschen",
    "action.restore": "Wiederherstellen",
    "action.favorite": "Favorit",
    "action.save": "Speichern",
    "status.already_indexed": "Bereits indexiert",
    "status.duplicate": "Duplikat",
    "status.processing": "Wird verarbeitet",
    "status.completed": "Abgeschlossen",
    "status.private": "Privat",
    "status.highly_sensitive": "Streng vertraulich",
    "privacy.title": "Datenschutz & Sicherheit",
    "privacy.sensitive_detected": "Sensible Daten erkannt",
    "settings.appearance": "Erscheinungsbild & Design",
    "settings.accent": "Akzentfarbe der Benutzeroberfläche",
    "settings.language": "Sprache der Benutzeroberfläche",
    "settings.density": "Kompakte Rasterdichte",
  },
  "ja-JP": {
    "nav.dashboard": "ダッシュボード",
    "nav.gallery": "ギャラリー",
    "nav.search": "検索",
    "nav.collections": "コレクション",
    "nav.trash": "ゴミ箱",
    "nav.history": "検索履歴",
    "nav.founders": "創設者クラブ",
    "nav.pricing": "料金プラン",
    "nav.settings": "設定",
    "nav.import": "インポート",
    "nav.duplicates": "重複画像",
    "action.upload": "スクショをアップロード",
    "action.import": "スクショをインポート",
    "action.search": "スクショを検索",
    "action.clean_duplicates": "重複をクリーンアップ",
    "action.inspect": "詳細確認",
    "action.delete": "削除",
    "action.restore": "復元",
    "action.favorite": "お気に入り",
    "action.save": "変更を保存",
    "status.already_indexed": "既にインデックス済み",
    "status.duplicate": "重複",
    "status.processing": "解析中",
    "status.completed": "完了",
    "status.private": "非公開",
    "status.highly_sensitive": "高機密データ",
    "privacy.title": "プライバシーとセキュリティ",
    "privacy.sensitive_detected": "機密情報が検出されました",
    "settings.appearance": "外観とテーマ",
    "settings.accent": "インターフェースアクセントカラー",
    "settings.language": "表示言語",
    "settings.density": "コンパクトグリッド表示",
  },
  "zh-CN": {
    "nav.dashboard": "控制台",
    "nav.gallery": "画廊",
    "nav.search": "智能搜索",
    "nav.collections": "分类集合",
    "nav.trash": "回收站",
    "nav.history": "搜索历史",
    "nav.founders": "创始者俱乐部",
    "nav.pricing": "套餐价格",
    "nav.settings": "系统设置",
    "nav.import": "批量导入",
    "nav.duplicates": "重复快照",
    "action.upload": "上传截图",
    "action.import": "导入截图",
    "action.search": "搜索截图",
    "action.clean_duplicates": "清理重复项",
    "action.inspect": "查看详情",
    "action.delete": "删除",
    "action.restore": "恢复",
    "action.favorite": "收藏",
    "action.save": "保存更改",
    "status.already_indexed": "已建立索引",
    "status.duplicate": "重复项",
    "status.processing": "分析处理中",
    "status.completed": "已完成",
    "status.private": "私密",
    "status.highly_sensitive": "高度敏感数据",
    "privacy.title": "隐私与安全保护",
    "privacy.sensitive_detected": "检测到敏感信息",
    "settings.appearance": "外观与主题",
    "settings.accent": "界面强调色调",
    "settings.language": "界面显示语言",
    "settings.density": "紧凑网格密度",
  },
  "ur-PK": {
    "nav.dashboard": "ڈیش بورڈ",
    "nav.gallery": "گیلری",
    "nav.search": "تلاش",
    "nav.collections": "مجموعے",
    "nav.trash": "کوڑے دان",
    "nav.history": "تلاش کی تاریخ",
    "nav.founders": "بانیان کلب",
    "nav.pricing": "منصوبے اور قیمتیں",
    "nav.settings": "ترتیبات",
    "nav.import": "درآمد کریں",
    "nav.duplicates": "ڈپلیکیٹس",
    "action.upload": "اسکرین شاٹ اپ لوڈ کریں",
    "action.import": "اسکرین شاٹس درآمد کریں",
    "action.search": "اسکرین شاٹس تلاش کریں",
    "action.clean_duplicates": "ڈپلیکیٹس صاف کریں",
    "action.inspect": "معائنہ کریں",
    "action.delete": "حذف کریں",
    "action.restore": "بحال کریں",
    "action.favorite": "پسندیدہ",
    "action.save": "تبدیلیاں محفوظ کریں",
    "status.already_indexed": "پہلے سے انڈیکس شدہ",
    "status.duplicate": "ڈپلیکیٹ",
    "status.processing": "پراسیس ہو رہا ہے",
    "status.completed": "مکمل",
    "status.private": "نجی",
    "status.highly_sensitive": "انتہائی حساس",
    "privacy.title": "رازداری اور تحفظ",
    "privacy.sensitive_detected": "حساس معلومات کی نشاندہی ہوئی",
    "settings.appearance": "ظاہری شکل اور تھیم",
    "settings.accent": "انٹرفیس ایکسنٹ ٹون",
    "settings.language": "انٹرفیس کی زبان",
    "settings.density": "کمپیکٹ گرڈ ڈینسٹی",
  },
};

const LANG_STORAGE_KEY = "snapfind_lang_v1";

let currentLanguage: SupportedLanguage = "en-US";

/**
 * Set and apply the active language
 */
export function setLanguage(lang: string): void {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === lang) || SUPPORTED_LANGUAGES[0];
  currentLanguage = match.code;

  if (typeof document !== "undefined") {
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = match.isRtl ? "rtl" : "ltr";
  }

  try {
    localStorage.setItem(LANG_STORAGE_KEY, currentLanguage);
  } catch (e) {
    // ignore
  }
}

/**
 * Get the currently active language
 */
export function getCurrentLanguage(): SupportedLanguage {
  if (typeof localStorage !== "undefined") {
    try {
      const stored = localStorage.getItem(LANG_STORAGE_KEY) as SupportedLanguage;
      if (stored && TRANSLATIONS[stored]) {
        currentLanguage = stored;
      }
    } catch (e) {
      // ignore
    }
  }
  return currentLanguage;
}

/**
 * Translate a key into the active language
 */
export function t(key: string, fallback?: string): string {
  const lang = getCurrentLanguage();
  const dict = TRANSLATIONS[lang] || TRANSLATIONS["en-US"];
  return dict[key] || TRANSLATIONS["en-US"][key] || fallback || key;
}
