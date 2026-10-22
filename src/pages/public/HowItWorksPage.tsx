import React from 'react';
import { Link } from 'react-router-dom';
import {
  Ship,
  Plane,
  ShieldCheck,
  FileCheck2,
  HelpCircle,
  ArrowRight,
  CheckCircle,
  Coins,
  Warehouse,
  FileText,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const HowItWorksPage: React.FC = () => {
  const { t, language } = useApp();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-50 text-[#123B70] text-xs font-semibold">
          <img
            src="/assets/aistudio/WhatsApp_Image_2026-10-13_at_12.05.39_5fbd9453.jpeg"
            alt="Logo ASEP"
            className="w-4 h-4 rounded object-contain bg-white"
          />
          <span>{t.heroPill}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#123B70] tracking-tight">
          {t.guideTitle}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {t.guideSub}
        </p>
      </div>

      {/* 4 Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#123B70] flex items-center justify-center font-bold">
            01
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.step1Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.step1Desc}
          </p>
          <ul className="text-xs text-slate-500 space-y-1 pt-1">
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '源头直谈，免除中间商差价' : 'Négociation directe sans intermédiaire coûteux'}</li>
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '出具正规美元形式发票 (PI)' : 'Facture Proforma officielle (PI) en USD'}</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-[#FF8A00] flex items-center justify-center font-bold">
            02
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.step2Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.step2Desc}
          </p>
          <ul className="text-xs text-slate-500 space-y-1 pt-1">
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '实时双语在线客服答疑' : 'Support bilingue français / chinois'}</li>
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '支持样品邮寄及技术参数确认' : 'Échantillons et fiches techniques certifiées'}</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            03
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.step3Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.step3Desc}
          </p>
          <ul className="text-xs text-slate-500 space-y-1 pt-1">
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '出厂电气及外观性能检验' : 'Contrôle qualité avant scellage du conteneur'}</li>
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '办理刚果FERI/BESC电子货物追踪单' : 'Établissement du certificat FERI / BESC'}</li>
          </ul>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            04
          </div>
          <h2 className="font-bold text-base text-slate-900">{t.step4Title}</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {t.step4Desc}
          </p>
          <ul className="text-xs text-slate-500 space-y-1 pt-1">
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {t.customsCompliance}</li>
            <li className="flex items-center gap-1.5"><CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> {language === 'zh' ? '海运提单全程实时轨迹查询' : 'Suivi maritime et dédouanement assisté à Matadi'}</li>
          </ul>
        </div>
      </div>

      {/* Reassurance Banner */}
      <div className="bg-[#0c274c] text-white p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">
            {language === 'zh' ? '准备好开启中刚直采商机了吗？' : language === 'en' ? 'Ready to begin sourcing from China to DR Congo?' : 'Prêt à lancer votre premier approvisionnement ?'}
          </h3>
          <p className="text-xs text-slate-300 max-w-xl">
            {language === 'zh'
              ? '发布您的具体采购需求，我们的中文及法语采购专员将在24小时内为您对接优质厂家。'
              : language === 'en'
              ? 'Submit your inquiry or browse verified Chinese manufacturers to receive factory quotes.'
              : 'Consultez les produits vérifiés de nos fournisseurs ou contactez directement nos agents sur place à Guangzhou et Yiwu.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/catalog"
            className="px-6 py-3 bg-[#FF8A00] hover:bg-[#e57c00] text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-2"
          >
            <span>{t.exploreCatalog}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
