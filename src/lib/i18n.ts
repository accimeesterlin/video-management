import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "../../public/locales/en/common.json";
import esCommon from "../../public/locales/es/common.json";
import frCommon from "../../public/locales/fr/common.json";

const resources = {
  en: {
    common: enCommon,
  },
  es: {
    common: esCommon,
  },
  fr: {
    common: frCommon,
  },
  de: {
    common: {
      welcome: "Willkommen bei Video Editor Pro",
      welcomeBack: "Willkommen zurück, {{name}}!",
      dashboard: "Dashboard",
      companies: "Unternehmen",
      projects: "Projekte",
      videos: "Videos",
      team: "Team",
      analytics: "Analytics",
      settings: "Einstellungen",
      signOut: "Abmelden",
      language: "Sprache",
      selectLanguage: "Sprache auswählen",
    },
  },
  it: {
    common: {
      welcome: "Benvenuto su Video Editor Pro",
      welcomeBack: "Bentornato, {{name}}!",
      dashboard: "Dashboard",
      companies: "Aziende",
      projects: "Progetti",
      videos: "Video",
      team: "Team",
      analytics: "Analytics",
      settings: "Impostazioni",
      signOut: "Disconnetti",
      language: "Lingua",
      selectLanguage: "Seleziona Lingua",
    },
  },
  pt: {
    common: {
      welcome: "Bem-vindo ao Video Editor Pro",
      welcomeBack: "Bem-vindo de volta, {{name}}!",
      dashboard: "Painel",
      companies: "Empresas",
      projects: "Projetos",
      videos: "Vídeos",
      team: "Equipe",
      analytics: "Analytics",
      settings: "Configurações",
      signOut: "Sair",
      language: "Idioma",
      selectLanguage: "Selecionar Idioma",
    },
  },
  ja: {
    common: {
      welcome: "Video Editor Proへようこそ",
      welcomeBack: "おかえりなさい、{{name}}さん！",
      dashboard: "ダッシュボード",
      companies: "会社",
      projects: "プロジェクト",
      videos: "動画",
      team: "チーム",
      analytics: "分析",
      settings: "設定",
      signOut: "ログアウト",
      language: "言語",
      selectLanguage: "言語を選択",
    },
  },
  ko: {
    common: {
      welcome: "Video Editor Pro에 오신 것을 환영합니다",
      welcomeBack: "다시 오신 것을 환영합니다, {{name}}님!",
      dashboard: "대시보드",
      companies: "회사",
      projects: "프로젝트",
      videos: "비디오",
      team: "팀",
      analytics: "분석",
      settings: "설정",
      signOut: "로그아웃",
      language: "언어",
      selectLanguage: "언어 선택",
    },
  },
  zh: {
    common: {
      welcome: "欢迎使用 Video Editor Pro",
      welcomeBack: "欢迎回来，{{name}}！",
      dashboard: "仪表板",
      companies: "公司",
      projects: "项目",
      videos: "视频",
      team: "团队",
      analytics: "分析",
      settings: "设置",
      signOut: "登出",
      language: "语言",
      selectLanguage: "选择语言",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  debug: false,
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
