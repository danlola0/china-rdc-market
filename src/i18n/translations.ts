export type Language = 'fr' | 'zh' | 'en';

export interface TranslationDict {
  // Top bar & Header
  corridorTitle: string;
  corridorSub: string;
  demoMode: string;
  buyerRole: string;
  agencyRole: string;
  adminRole: string;
  switchRoleTitle: string;
  active: string;

  // Navbar
  searchPlaceholder: string;
  searchButton: string;
  allCategories: string;
  allProducts: string;
  suppliersAgencies: string;
  howToBuyGuide: string;
  login: string;
  messages: string;
  rfqs: string;
  favorites: string;
  buyerSpace: string;
  agencySpace: string;
  adminSpace: string;
  navigation: string;
  managementSpaces: string;

  // Hero
  heroPill: string;
  heroTitle: string;
  heroDesc: string;
  exploreCatalog: string;
  seeAgencies: string;
  howItWorks: string;
  metricFactories: string;
  metricFactoriesSub: string;
  metricSea: string;
  metricSeaSub: string;
  metricAir: string;
  metricAirSub: string;
  metricSupport: string;
  metricSupportSub: string;
  sourcingAssistantTitle: string;
  sourcingAssistantDesc: string;
  chatSalesAgent: string;
  freeAssistance: string;

  // Categories
  popularCategoriesTitle: string;
  popularCategoriesSub: string;
  seeAll: string;
  itemsCount: string;

  // Recommended
  recommendedTitle: string;
  recommendedTag: string;
  allArticles: string;
  machinesTab: string;
  solarTab: string;
  waxTab: string;
  seeAllProductsCount: string;

  // Product Card
  moq: string;
  unit: string;
  requestQuote: string;
  chatDirect: string;

  // Featured Agencies
  featuredAgenciesTag: string;
  featuredAgenciesTitle: string;
  featuredAgenciesSub: string;
  responseTime: string;
  frenchSupport: string;
  catalogItems: string;
  visitStore: string;
  chatWithAgency: string;
  verifiedSupplier: string;

  // New arrivals
  newArrivalsTitle: string;
  newArrivalsSub: string;

  // How to buy
  guideTag: string;
  guideTitle: string;
  guideSub: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;
  step4Title: string;
  step4Desc: string;
  customsCompliance: string;
  startSourcingNow: string;

  // Catalog
  home: string;
  b2bCatalog: string;
  filters: string;
  clearFilters: string;
  cityChina: string;
  allCities: string;
  priceRangeLabel: string;
  minPrice: string;
  maxPrice: string;
  moqFilterLabel: string;
  moqAll: string;
  moqSmall: string;
  moqMedium: string;
  moqLarge: string;
  availability: string;
  onlyInStock: string;
  sortByLabel: string;
  sortFeatured: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  sortMoqAsc: string;
  sortNewest: string;
  resultsCount: string;
  noProductsFound: string;
  noProductsDesc: string;

  // Product Detail
  backToCatalog: string;
  stockStatusReady: string;
  pricePerUnit: string;
  priceTiersTitle: string;
  specifications: string;
  description: string;
  originHub: string;
  shippingOption: string;
  seaFreight: string;
  airFreight: string;
  similarProductsTitle: string;

  // Messaging & Trade Chat
  tradeChatTitle: string;
  tradeChatSub: string;
  tradeChatOnline: string;
  activeDiscussions: string;
  viewStore: string;
  productSubject: string;
  viewProductPage: string;
  usuallyReplies: string;
  quickPromptsTitle: string;
  promptBestPrice: string;
  promptSeaFreight: string;
  promptSample: string;
  promptFeri: string;
  typeMessagePlaceholder: string;
  selectDiscussionToStart: string;
  translateAction: string;
  translating: string;
  seeOriginal: string;
  autoTranslateToggle: string;
  translatedBadge: string;
  sendAction: string;

  // Buyer Dashboard
  buyerOverviewTab: string;
  buyerRfqsTab: string;
  buyerOrdersTab: string;
  buyerFavoritesTab: string;
  buyerProfileTab: string;
  buyerDashboardTitle: string;
  buyerWelcome: string;
  totalRfqsTitle: string;
  totalOrdersTitle: string;
  favoriteItemsTitle: string;
  recentOrdersTitle: string;
  noOrdersYet: string;
  orderNumber: string;
  orderTotal: string;
  orderStatus: string;

  // Statuses
  statusPending: string;
  statusInProduction: string;
  statusShippedChina: string;
  statusSeaTransit: string;
  statusCustomsMatadi: string;
  statusDeliveredKinshasa: string;

  // Footer
  footerTrustAgencies: string;
  footerTrustAgenciesDesc: string;
  footerTrustSea: string;
  footerTrustSeaDesc: string;
  footerTrustAir: string;
  footerTrustAirDesc: string;
  footerTrustSupport: string;
  footerTrustSupportDesc: string;
  footerAboutDesc: string;
  footerDemoNotice: string;
  footerHubsTitle: string;
  footerQuickLinksTitle: string;
  footerCopyright: string;

  // Toast / System
  langSwitched: string;

  // Splash Screen
  splashTitle: string;
  splashSubtitle: string;
  splashCorridor: string;
  splashPillar1Title: string;
  splashPillar1Desc: string;
  splashPillar2Title: string;
  splashPillar2Desc: string;
  splashPillar3Title: string;
  splashPillar3Desc: string;
  splashPillar4Title: string;
  splashPillar4Desc: string;
  splashEnterButton: string;
  splashSkip: string;
  splashDoNotShowAgain: string;
  splashPresentation: string;
}

export const translations: Record<Language, TranslationDict> = {
  fr: {
    // Top bar
    corridorTitle: 'Couloir Commercial Chine ⇄ RD Congo',
    corridorSub: 'Expéditions maritimes Matadi / Boma & Aérien Ndjili / Luano',
    demoMode: 'Mode Démo :',
    buyerRole: '👤 Acheteur (RDC)',
    agencyRole: '🏢 Agence (Chine)',
    adminRole: '🛡️ Administrateur',
    switchRoleTitle: 'Basculer le rôle de démonstration',
    active: 'Actif',

    // Navbar
    searchPlaceholder: 'Que recherchez-vous ? (ex: Solaire, Groupe électrogène, Wax, Carrelage...)',
    searchButton: 'Rechercher',
    allCategories: 'Toutes catégories',
    allProducts: 'Tous les produits',
    suppliersAgencies: '🏢 Fournisseurs & Agences de Chine',
    howToBuyGuide: 'Guide d’achat RDC',
    login: 'Connexion',
    messages: 'Messages',
    rfqs: 'Devis',
    favorites: 'Favoris',
    buyerSpace: 'Mon Espace Acheteur',
    agencySpace: 'Espace Agence Chine',
    adminSpace: 'Espace Admin',
    navigation: 'Navigation',
    managementSpaces: 'Espaces de gestion',

    // Hero
    heroPill: 'ASEP MARKET · ATELIER DES SOLUTIONS ENTREPRENEURIALES ET PÉDAGOGIQUES',
    heroTitle: 'Achetez directement auprès des agences & usines en Chine depuis la RDC',
    heroDesc: 'La plateforme B2B de l’ASEP dédiée aux commerçants, entrepreneurs et importateurs de Kinshasa, Lubumbashi, Goma et Matadi. Accédez aux prix fabricants en USD, négociez en direct et organisez votre expédition maritime ou aérienne.',
    exploreCatalog: 'Explorer le catalogue produits',
    seeAgencies: 'Voir les agences en Chine',
    howItWorks: 'Comment ça marche ?',
    metricFactories: '+500',
    metricFactoriesSub: 'Usines & grossistes',
    metricSea: '25-35j',
    metricSeaSub: 'Fret maritime Matadi',
    metricAir: '5-7j',
    metricAirSub: 'Fret aérien Ndjili',
    metricSupport: 'Bilingue',
    metricSupportSub: 'Support Français / Chinois',
    sourcingAssistantTitle: 'Assistance Sourcing Express',
    sourcingAssistantDesc: 'Besoin d’un produit introuvable ou d’un conteneur complet ? Décrivez votre besoin à nos agents à Guangzhou.',
    chatSalesAgent: 'Discuter avec un agent commercial',
    freeAssistance: 'Assistance gratuite & vérification d’usines',

    // Categories
    popularCategoriesTitle: 'Catégories Populaires',
    popularCategoriesSub: 'Les produits les plus importés de Chine vers la République Démocratique du Congo',
    seeAll: 'Tout voir',
    itemsCount: 'articles',

    // Recommended
    recommendedTitle: 'Sélection pour Acheteurs Congolais',
    recommendedTag: 'Offres Fabricants Directs',
    allArticles: 'Tous les articles',
    machinesTab: 'Machines & Outillage',
    solarTab: 'Solaire & Électricité',
    waxTab: 'Wax & Textile',
    seeAllProductsCount: 'Voir tous les produits du catalogue',

    // Product Card
    moq: 'MOQ :',
    unit: 'pcs',
    requestQuote: 'Demander un devis (RFQ)',
    chatDirect: 'Chat direct usine',

    // Featured Agencies
    featuredAgenciesTag: 'Partenaires Vérifiés',
    featuredAgenciesTitle: 'Agences & Fabricants Chinois de Confiance',
    featuredAgenciesSub: 'Entreprises auditées ayant une solide expérience d’expédition vers le port de Matadi',
    responseTime: 'Temps de réponse :',
    frenchSupport: 'Support bilingue :',
    catalogItems: 'Articles au catalogue :',
    visitStore: 'Boutique',
    chatWithAgency: 'Échanger',
    verifiedSupplier: 'Fournisseur Certifié',

    // New arrivals
    newArrivalsTitle: 'Nouveaux Arrivages Usines',
    newArrivalsSub: 'Dernières productions vérifiées disponibles à l’export immédiat',

    // How to buy
    guideTag: 'Guide Pratique',
    guideTitle: 'Comment acheter en Chine et se faire livrer en RDC ?',
    guideSub: 'Un processus transparent et sécurisé adapté aux réalités des entreprises et commerçants congolais.',
    step1Title: 'Sourcing & Devis',
    step1Desc: 'Sélectionnez vos produits ou déposez une demande de cotation sur mesure avec vos volumes souhaités.',
    step2Title: 'Négociation & Facture Proforma',
    step2Desc: 'Échangez avec l’agence chinoise via la messagerie intégrée et recevez votre facture proforma officielle en USD.',
    step3Title: 'Contrôle Qualité & Empotage',
    step3Desc: 'L’agence inspecte les marchandises en usine et supervise le chargement sécurisé dans le conteneur.',
    step4Title: 'Transit Maritime & Dédouanement',
    step4Desc: 'Suivez votre cargaison jusqu’au Port de Matadi (maritime) ou l’Aéroport de Ndjili (aérien) avec documents BESC/FERI.',
    customsCompliance: 'Conforme aux exigences douanières DGDA et normes OCC.',
    startSourcingNow: 'Commencer mon sourcing',

    // Catalog
    home: 'Accueil',
    b2bCatalog: 'Catalogue B2B Grossiste',
    filters: 'Filtres de recherche',
    clearFilters: 'Réinitialiser',
    cityChina: 'Pôle industriel en Chine',
    allCities: 'Toutes les villes',
    priceRangeLabel: 'Prix unitaire (USD)',
    minPrice: 'Min $',
    maxPrice: 'Max $',
    moqFilterLabel: 'Quantité Minimale de Commande (MOQ)',
    moqAll: 'Toutes quantités',
    moqSmall: 'Petits lots (1-5 pcs)',
    moqMedium: 'Lots moyens (≤ 10 pcs)',
    moqLarge: 'Gros volumes (≥ 50 pcs)',
    availability: 'Disponibilité',
    onlyInStock: 'En stock prêt à expédier',
    sortByLabel: 'Trier par :',
    sortFeatured: 'Recommandés par ASEP',
    sortPriceAsc: 'Prix : Moins cher d’abord',
    sortPriceDesc: 'Prix : Plus cher d’abord',
    sortMoqAsc: 'Plus petit MOQ d’abord',
    sortNewest: 'Nouveautés récentes',
    resultsCount: 'produits trouvés',
    noProductsFound: 'Aucun produit ne correspond à vos filtres',
    noProductsDesc: 'Essayez d’élargir vos critères ou de réinitialiser la recherche.',

    // Product Detail
    backToCatalog: 'Retour au catalogue',
    stockStatusReady: 'Stock disponible pour expédition immédiate',
    pricePerUnit: 'Prix unitaire indicatif (FOB Chine)',
    priceTiersTitle: 'Grille de prix dégressifs (USD)',
    specifications: 'Caractéristiques techniques',
    description: 'Description détaillée',
    originHub: 'Origine industrielle :',
    shippingOption: 'Options vers la RDC :',
    seaFreight: 'Fret maritime Matadi (25-35 jours)',
    airFreight: 'Fret aérien Kinshasa (5-8 jours)',
    similarProductsTitle: 'Produits similaires dans la même catégorie',

    // Messaging & Trade Chat
    tradeChatTitle: 'Messagerie Commerciale B2B (Trade Chat)',
    tradeChatSub: 'Échanges directs avec les agences et fabricants en Chine',
    tradeChatOnline: 'Interlocuteurs connectés (Guangzhou / Kinshasa)',
    activeDiscussions: 'Discussions actives',
    viewStore: 'Voir la boutique',
    productSubject: 'Objet',
    viewProductPage: 'Voir la fiche',
    usuallyReplies: 'Répond généralement sous 1h',
    quickPromptsTitle: 'Suggestions :',
    promptBestPrice: '💰 Meilleur prix pour 100 pcs ?',
    promptSeaFreight: '🚢 Tarif fret port de Matadi',
    promptSample: '📦 Demande d’échantillon',
    promptFeri: '📄 Gestion BESC / FERI',
    typeMessagePlaceholder: 'Écrivez votre message à l’agence (en français ou anglais)...',
    selectDiscussionToStart: 'Sélectionnez une discussion pour commencer.',
    translateAction: 'Traduire',
    translating: 'Traduction...',
    seeOriginal: 'Voir l’original',
    autoTranslateToggle: 'Traduction instantanée active',
    translatedBadge: 'Traduction instantanée',
    sendAction: 'Envoyer',

    // Buyer Dashboard
    buyerOverviewTab: 'Vue d’ensemble',
    buyerRfqsTab: 'Mes Devis (RFQ)',
    buyerOrdersTab: 'Commandes & Suivi Logistique',
    buyerFavoritesTab: 'Produits Favoris',
    buyerProfileTab: 'Profil Importateur',
    buyerDashboardTitle: 'Tableau de bord Acheteur',
    buyerWelcome: 'Bienvenue dans votre espace d’importation Chine–RDC.',
    totalRfqsTitle: 'Devis négociés',
    totalOrdersTitle: 'Commandes en cours',
    favoriteItemsTitle: 'Produits suivis',
    recentOrdersTitle: 'Expéditions et commandes récentes',
    noOrdersYet: 'Aucune commande enregistrée pour l’instant.',
    orderNumber: 'N° Commande',
    orderTotal: 'Total USD',
    orderStatus: 'Statut Logistique',

    // Statuses
    statusPending: 'En attente',
    statusInProduction: 'En production (Chine)',
    statusShippedChina: 'Expédié de Chine',
    statusSeaTransit: 'En mer (Transit maritime Matadi)',
    statusCustomsMatadi: 'Dédouanement Matadi',
    statusDeliveredKinshasa: 'Livré à Kinshasa',

    // Footer
    footerTrustAgencies: 'Agences certifiées en Chine',
    footerTrustAgenciesDesc: 'Licences commerciales auditées et vérifiées sur le terrain à Guangzhou, Yiwu, Shenzhen.',
    footerTrustSea: 'Fret maritime Matadi',
    footerTrustSeaDesc: 'Lignes régulières en conteneurs FCL & LCL avec suivi documentaire BESC / FERI.',
    footerTrustAir: 'Fret aérien express RDC',
    footerTrustAirDesc: 'Vols cargos hebdomadaires vers Kinshasa (Ndjili) et Lubumbashi (Luano) en 5 à 8 jours.',
    footerTrustSupport: 'Support bilingue français / chinois',
    footerTrustSupportDesc: 'Chargés de sourcing à Guangzhou pour lever les barrières linguistiques et sécuriser vos achats.',
    footerAboutDesc: 'La plateforme B2B de référence conçue par l’ASEP pour connecter directement les commerçants et importateurs de la RD Congo avec les fabricants de premier rang en Chine.',
    footerDemoNotice: '⚠️ Démonstrateur interactif conçu pour illustrer le commerce transfrontalier Chine–RDC.',
    footerHubsTitle: 'Pôles industriels en Chine',
    footerQuickLinksTitle: 'Accès rapide',
    footerCopyright: '© 2026 ASEP MARKET — Atelier des Solutions Entrepreneuriales et Pédagogiques. Tous droits réservés.',

    langSwitched: 'Langue activée : Français 🇫🇷',

    // Splash Screen
    splashTitle: 'ASEP MARKET',
    splashSubtitle: 'Atelier des Solutions Entrepreneuriales et Pédagogiques',
    splashCorridor: 'La plateforme B2B qui relie les commerçants de la RDC aux fournisseurs en Chine.',
    splashPillar1Title: 'Sourcing Direct Usines',
    splashPillar1Desc: 'Contactez directement les agences et fabricants de Guangzhou, Yiwu, Shenzhen et Foshan.',
    splashPillar2Title: 'Demandes de devis',
    splashPillar2Desc: 'Envoyez vos besoins, recevez des offres chiffrées et comparez-les avant de commander.',
    splashPillar3Title: 'Français · 中文 · English',
    splashPillar3Desc: 'Une interface et une messagerie pensées pour échanger sans barrière de langue.',
    splashPillar4Title: 'Suivi jusqu’en RDC',
    splashPillar4Desc: 'Suivez chaque commande : production, fret maritime vers Matadi ou aérien vers Kinshasa, douane, livraison.',
    splashEnterButton: 'Accéder à la plateforme',
    splashSkip: 'Passer l’introduction',
    splashDoNotShowAgain: 'Ne plus afficher au démarrage',
    splashPresentation: 'Présentation ASEP',
  },

  zh: {
    // Top bar
    corridorTitle: '中国 ⇄ 刚果(金) 双边大宗商品外贸通道',
    corridorSub: '马塔迪海运专线 (Matadi) & 金沙萨恩吉利空运专线 (Ndjili)',
    demoMode: '演示角色 :',
    buyerRole: '👤 刚果(金)买家',
    agencyRole: '🏢 中国出口商行',
    adminRole: '🛡️ 平台全境管理员',
    switchRoleTitle: '切换业务演示视角',
    active: '当前使用中',

    // Navbar
    searchPlaceholder: '搜索外贸货源 (例如：柴油发电机组、光伏组件、非洲蜡布、瓷砖、三轮摩托)...',
    searchButton: '源头直搜',
    allCategories: '全部类目',
    allProducts: '全部现货与定制',
    suppliersAgencies: '🏢 中国源头供应商与外贸行',
    howToBuyGuide: '中刚外贸采购通则',
    login: '账号登录',
    messages: '商机洽谈',
    rfqs: '询盘报价 (RFQ)',
    favorites: '收藏夹',
    buyerSpace: '买家采购中心',
    agencySpace: '中国外贸工作台',
    adminSpace: '平台监管中心',
    navigation: '快捷导航',
    managementSpaces: '业务工作区',

    // Hero
    heroPill: 'ASEP MARKET · 刚果(金)创业与教育方案研习工坊 (ASEP) 官方外贸平台',
    heroTitle: '刚果(金)进口商直连中国源头工厂与出口产业带',
    heroDesc: 'ASEP官方打造的中国—刚果(金)跨境B2B贸易服务平台。专为金沙萨、卢本巴希、戈马和马塔迪的大宗买家量身定制。以美元离岸底价直采，在线洽谈锁单，配套整柜拼箱海运与清关单证支持。',
    exploreCatalog: '浏览源头外贸商品',
    seeAgencies: '查看入驻中国商行',
    howItWorks: '采购与履约流程',
    metricFactories: '500+ 家',
    metricFactoriesSub: '中国源头工厂/产业带',
    metricSea: '25-35 天',
    metricSeaSub: '马塔迪直达海运船期',
    metricAir: '5-7 天',
    metricAirSub: '金沙萨专线空运',
    metricSupport: '中法双语',
    metricSupportSub: '广州双语外贸团队支持',
    sourcingAssistantTitle: '外贸定制与源头寻源助手',
    sourcingAssistantDesc: '需要特殊定制参数或整柜大单特批报价？即刻直连我们驻广州外贸经理获取现货清单。',
    chatSalesAgent: '即刻发起外贸采购咨询',
    freeAssistance: '提供源头实地验厂与外贸合规指导',

    // Categories
    popularCategoriesTitle: '刚果(金)热销品类与产业带',
    popularCategoriesSub: '刚果(金)市场大批量进口的中国成熟优势工业品与民生大宗消费品',
    seeAll: '查看全部类目',
    itemsCount: '款精选货源',

    // Recommended
    recommendedTitle: '刚果(金)优质进口商甄选货源',
    recommendedTag: '源头出厂底价 (FOB/CIF)',
    allArticles: '全部货源',
    machinesTab: '工程机械与重工',
    solarTab: '光伏储能与电力',
    waxTab: '非洲蜡布与纺织',
    seeAllProductsCount: '查看全部产品',

    // Product Card
    moq: '起订量 (MOQ) :',
    unit: '件/套',
    requestQuote: '申请批量报价 (RFQ)',
    chatDirect: '直连厂家洽谈',

    // Featured Agencies
    featuredAgenciesTag: '认证出口商',
    featuredAgenciesTitle: '优质中国外贸行与源头生产厂家',
    featuredAgenciesSub: '经严格实地核验，拥有丰富对非出口经验及马塔迪港成熟订舱渠道',
    responseTime: '平均响应时间 :',
    frenchSupport: '双语沟通保障 :',
    catalogItems: '在售商品款式 :',
    visitStore: '查看商行档口',
    chatWithAgency: '在线询价洽谈',
    verifiedSupplier: '认证对非出口商',

    // New arrivals
    newArrivalsTitle: '产业带最新出厂批次',
    newArrivalsSub: '经过出厂质检、现货充足且随时支持装柜发运的优质批次',

    // How to buy
    guideTag: '跨境贸易指南',
    guideTitle: '从中国选品采购并安全运抵刚果(金)的完整步骤',
    guideSub: '规范化国际贸易操作，无缝对接刚果(金)海关与商检要求。',
    step1Title: '商品选品与发起询价',
    step1Desc: '在平台根据类目或关键词挑选货源，输入预估采购数量与目的港口 (马塔迪/博马/恩吉利机场) 提交RFQ。',
    step2Title: '即时洽谈与形式发票确认',
    step2Desc: '通过内置TradeManager与中国业务员直连，敲定单价、包装与交期，取得正式USD形式发票 (Proforma Invoice)。',
    step3Title: '实地验货与装柜监装',
    step3Desc: '专业驻厂质检团队对货物进行出厂前40项检查，核实配件与数量，监督集装箱封铅并拍照留存。',
    step4Title: '远洋海运与刚果海关清关',
    step4Desc: '全程跟踪集装箱海运轨迹，协同办理刚果(金)海关必备的FERI/BESC电子货物跟踪单，在马塔迪港顺利提货。',
    customsCompliance: '严格符合刚果(金)海关总署 (DGDA) 与刚果检验署 (OCC) 进口商检标准。',
    startSourcingNow: '立即开始选品采购',

    // Catalog
    home: '首页',
    b2bCatalog: 'B2B大宗采购批发大厅',
    filters: '筛选条件',
    clearFilters: '重置筛选',
    cityChina: '中国产业带/发货港口',
    allCities: '全部产业带城市',
    priceRangeLabel: '单价区间 (USD 美元)',
    minPrice: '最低 $',
    maxPrice: '最高 $',
    moqFilterLabel: '起订量门槛 (MOQ)',
    moqAll: '不限起订量',
    moqSmall: '小批量试单 (1-5件)',
    moqMedium: '中等批量 (≤ 10件)',
    moqLarge: '集装箱大柜 (≥ 50件)',
    availability: '供货时效',
    onlyInStock: '仅看工厂现货',
    sortByLabel: '结果排序 :',
    sortFeatured: 'ASEP 官方推荐',
    sortPriceAsc: '价格从低到高',
    sortPriceDesc: '价格从高到低',
    sortMoqAsc: '起订门槛从低到高',
    sortNewest: '最新上架出厂',
    resultsCount: '件符合条件的外贸商品',
    noProductsFound: '未找到符合当前条件的商品',
    noProductsDesc: '建议放宽价格范围、起订量限制或清除类目筛选条件。',

    // Product Detail
    backToCatalog: '返回采购大厅',
    stockStatusReady: '工厂现货充足，可立即排单装柜',
    pricePerUnit: '出厂参考单价 (FOB 中国港口)',
    priceTiersTitle: '大宗采购阶梯优惠报价表 (USD)',
    specifications: '规格参数与技术指标',
    description: '商品详细说明与产品特性',
    originHub: '货源产地 :',
    shippingOption: '直达发货方案 :',
    seaFreight: '马塔迪海运拼箱/整柜 (25-35天)',
    airFreight: '金沙萨专线特快空运 (5-8天)',
    similarProductsTitle: '同类目相关畅销商品推荐',

    // Messaging & Trade Chat
    tradeChatTitle: 'B2B外贸商机即时洽谈 (Trade Chat)',
    tradeChatSub: '金沙萨采购商与中国出口商直连窗口',
    tradeChatOnline: '广州出口商 / 金沙萨进口商 双向在线',
    activeDiscussions: '活跃洽谈列表',
    viewStore: '访问商行主页',
    productSubject: '关联商品',
    viewProductPage: '查看商品详情',
    usuallyReplies: '通常1小时内回复',
    quickPromptsTitle: '快捷外贸提问 :',
    promptBestPrice: '💰 100件批量采购优惠底价是多少？',
    promptSeaFreight: '🚢 包含发往刚果(金)马塔迪港海运费报价',
    promptSample: '📦 能否先寄样品确认质感？',
    promptFeri: '📄 能否协助办理刚果(金)海关FERI电子货物跟踪单？',
    typeMessagePlaceholder: '输入您发往商行的消息 (支持中文、法文、英文)...',
    selectDiscussionToStart: '请在左侧选择对话开始洽谈。',
    translateAction: '翻译消息',
    translating: '正在翻译...',
    seeOriginal: '查看原文',
    autoTranslateToggle: '开启双语即时自动翻译',
    translatedBadge: 'AI即时翻译',
    sendAction: '发送',

    // Buyer Dashboard
    buyerOverviewTab: '采购总览',
    buyerRfqsTab: '我的询价报价 (RFQ)',
    buyerOrdersTab: '采购订单与物流追踪',
    buyerFavoritesTab: '收藏商品',
    buyerProfileTab: '进口商企业资料',
    buyerDashboardTitle: '买家采购中心',
    buyerWelcome: '欢迎使用中国—刚果(金)中刚外贸采购专属工作台。',
    totalRfqsTitle: '询盘与报价单',
    totalOrdersTitle: '在途与履约订单',
    favoriteItemsTitle: '关注储备货源',
    recentOrdersTitle: '近期国际发运订单追踪',
    noOrdersYet: '暂无采购订单记录。',
    orderNumber: '采购订单编号',
    orderTotal: '订单总金额 (USD)',
    orderStatus: '国际物流状态',

    // Statuses
    statusPending: '等待商行确认',
    statusInProduction: '中国工厂排单生产中',
    statusShippedChina: '已完成集装箱装柜出库',
    statusSeaTransit: '远洋海运途中 (发往马塔迪港)',
    statusCustomsMatadi: '马塔迪海关清关查验中',
    statusDeliveredKinshasa: '已运抵金沙萨提货中心',

    // Footer
    footerTrustAgencies: '严选中国认证供应商',
    footerTrustAgenciesDesc: '驻广州、义乌、深圳团队对企业营业执照及实体厂房开展实地验核。',
    footerTrustSea: '马塔迪远洋海运直航',
    footerTrustSeaDesc: '提供FCL整柜与LCL拼箱稳定船期，全程保障FERI/BESC提单手续合法合规。',
    footerTrustAir: '刚果(金)特快空运干线',
    footerTrustAirDesc: '每周直飞金沙萨恩吉利与卢本巴希机场，5-8天紧急配件极速交付。',
    footerTrustSupport: '中法双语专业外贸专员',
    footerTrustSupportDesc: '打破语言壁垒，从价格谈判、验货质检到外贸清关单证提供一站式贴身保障。',
    footerAboutDesc: 'ASEP MARKET 是刚果(金)“创业与教育方案研习工坊 (ASEP)”官方创立的数字化B2B外贸跨境采购平台，致力于构建中国制造与刚果(金)实体商业之间最直接、最透明的桥梁。',
    footerDemoNotice: '⚠️ 本系统为中国—刚果(金)跨境数字化商贸与供应链演示系统。',
    footerHubsTitle: '中国重点采购产业带',
    footerQuickLinksTitle: '快捷服务',
    footerCopyright: '© 2026 ASEP MARKET — Atelier des Solutions Entrepreneuriales et Pédagogiques. 版权所有。',

    langSwitched: '系统语言已切换至：🇨🇳 中文',

    // Splash Screen
    splashTitle: 'ASEP MARKET',
    splashSubtitle: 'Atelier des Solutions Entrepreneuriales et Pédagogiques',
    splashCorridor: '连接刚果(金)商户与中国供应商的B2B采购平台。',
    splashPillar1Title: '中国源头工厂直采',
    splashPillar1Desc: '直接联系广州、义乌、深圳、佛山的贸易公司与生产厂家。',
    splashPillar2Title: '在线询价',
    splashPillar2Desc: '提交采购需求，获取报价并在下单前进行比较。',
    splashPillar3Title: '中文 · Français · English',
    splashPillar3Desc: '界面与消息均支持多语言，沟通无障碍。',
    splashPillar4Title: '全程物流跟踪',
    splashPillar4Desc: '跟踪每笔订单：生产、马塔迪海运或金沙萨空运、清关与交付。',
    splashEnterButton: '进入平台',
    splashSkip: '跳过介绍',
    splashDoNotShowAgain: '下次启动不再自动弹出',
    splashPresentation: '平台概览',
  },

  en: {
    // Top bar
    corridorTitle: 'China ⇄ DR Congo B2B Commercial Trade Corridor',
    corridorSub: 'Matadi / Boma Ocean Freight & Kinshasa Ndjili Air Cargo',
    demoMode: 'Demo Role:',
    buyerRole: '👤 Buyer (DRC)',
    agencyRole: '🏢 Agency (China)',
    adminRole: '🛡️ Administrator',
    switchRoleTitle: 'Switch Interactive Demo Role',
    active: 'Active',

    // Navbar
    searchPlaceholder: 'Search wholesale products (Generators, Solar Kits, Wax Fabrics, Floor Tiles, Tricycles)...',
    searchButton: 'Search',
    allCategories: 'All Categories',
    allProducts: 'All Wholesale Products',
    suppliersAgencies: '🏢 Verified Chinese Suppliers & Agencies',
    howToBuyGuide: 'DRC Buying Guide',
    login: 'Sign In',
    messages: 'Trade Chat',
    rfqs: 'RFQs & Quotes',
    favorites: 'Favorites',
    buyerSpace: 'Buyer Portal',
    agencySpace: 'Supplier Back-Office',
    adminSpace: 'Admin Platform',
    navigation: 'Navigation',
    managementSpaces: 'Workspaces',

    // Hero
    heroPill: 'ASEP MARKET · ATELIER DES SOLUTIONS ENTREPRENEURIALES ET PÉDAGOGIQUES',
    heroTitle: 'Direct Wholesale Sourcing from Chinese Factories to DR Congo',
    heroDesc: 'The official B2B trade platform by ASEP connecting enterprises, traders, and importers across Kinshasa, Lubumbashi, Goma, and Matadi directly with verified Chinese manufacturers. Factory-direct USD pricing, bilingual chat, and integrated ocean freight.',
    exploreCatalog: 'Explore Product Catalog',
    seeAgencies: 'Browse Chinese Suppliers',
    howItWorks: 'How It Works',
    metricFactories: '500+',
    metricFactoriesSub: 'Verified factories',
    metricSea: '25-35d',
    metricSeaSub: 'Matadi ocean transit',
    metricAir: '5-7d',
    metricAirSub: 'Ndjili express air',
    metricSupport: 'Bilingual',
    metricSupportSub: 'French & Chinese teams',
    sourcingAssistantTitle: 'Express Sourcing Assistance',
    sourcingAssistantDesc: 'Looking for a custom manufactured product or full container load? Connect directly with our sourcing agents in Guangzhou.',
    chatSalesAgent: 'Chat with Trade Representative',
    freeAssistance: 'Free factory audit and export consultation',

    // Categories
    popularCategoriesTitle: 'High-Demand Categories',
    popularCategoriesSub: 'Top wholesale product lines imported from China to the Democratic Republic of Congo',
    seeAll: 'View All',
    itemsCount: 'products',

    // Recommended
    recommendedTitle: 'Selected for Congolese Importers',
    recommendedTag: 'Factory-Direct Offers',
    allArticles: 'All Products',
    machinesTab: 'Heavy Machinery & Tools',
    solarTab: 'Solar Power Systems',
    waxTab: 'African Wax Fabrics',
    seeAllProductsCount: 'View all wholesale products',

    // Product Card
    moq: 'MOQ:',
    unit: 'pcs',
    requestQuote: 'Request Quote (RFQ)',
    chatDirect: 'Direct Factory Chat',

    // Featured Agencies
    featuredAgenciesTag: 'Verified Suppliers',
    featuredAgenciesTitle: 'Trusted Chinese Exporters & Manufacturers',
    featuredAgenciesSub: 'Audited Chinese suppliers with French-speaking reps and Matadi shipping track records',
    responseTime: 'Response Time:',
    frenchSupport: 'Bilingual Support:',
    catalogItems: 'Catalog Products:',
    visitStore: 'Storefront',
    chatWithAgency: 'Message',
    verifiedSupplier: 'Verified Supplier',

    // New arrivals
    newArrivalsTitle: 'Factory New Arrivals',
    newArrivalsSub: 'Latest inspected production batches available for immediate export loading',

    // How to buy
    guideTag: 'Safe Importation Framework',
    guideTitle: 'How to purchase in China and deliver to the DR Congo',
    guideSub: 'We streamline every phase of the international transaction: from factory floor validation to customs clearance in Matadi or Kinshasa.',
    step1Title: 'Sourcing & RFQ Submission',
    step1Desc: 'Browse products or request quotation with required volume and designated discharge port (Matadi, Boma, or Ndjili Airport).',
    step2Title: 'Direct Discussion & Proforma',
    step2Desc: 'Negotiate with the Chinese exporter via integrated chat and obtain an official USD Proforma Invoice (PI).',
    step3Title: 'Quality Inspection & Loading',
    step3Desc: 'Inspectors check compliance prior to container sealing and issue mandatory FERI/BESC documentation.',
    step4Title: 'Ocean Transit & DRC Delivery',
    step4Desc: 'Track your container on sea routes and clear cargo at Matadi port or take delivery in Kinshasa/Lubumbashi.',
    customsCompliance: 'Complies with DGDA customs regulations and OCC inspection standards.',
    startSourcingNow: 'Start Sourcing Now',

    // Catalog
    home: 'Home',
    b2bCatalog: 'B2B Wholesale Catalog',
    filters: 'Filters',
    clearFilters: 'Reset Filters',
    cityChina: 'Hub / City in China',
    allCities: 'All Cities',
    priceRangeLabel: 'Price Range (USD)',
    minPrice: 'Min $',
    maxPrice: 'Max $',
    moqFilterLabel: 'Minimum Order Quantity (MOQ)',
    moqAll: 'Any MOQ',
    moqSmall: 'Low Volume (1-5 pcs)',
    moqMedium: 'Medium Volume (≤ 10 pcs)',
    moqLarge: 'Bulk Containers (≥ 50 pcs)',
    availability: 'Availability',
    onlyInStock: 'In Stock Only',
    sortByLabel: 'Sort by:',
    sortFeatured: 'ASEP Recommended',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortMoqAsc: 'Lowest MOQ First',
    sortNewest: 'New Arrivals',
    resultsCount: 'products found',
    noProductsFound: 'No products match your criteria',
    noProductsDesc: 'Try adjusting your filters or search terms.',

    // Product Detail
    backToCatalog: 'Back to catalog',
    stockStatusReady: 'Factory stock ready for loading',
    pricePerUnit: 'Indicative Unit Price (FOB China)',
    priceTiersTitle: 'Wholesale Volume Tiers (USD)',
    specifications: 'Technical Specifications',
    description: 'Detailed Description',
    originHub: 'Manufacturing Hub:',
    shippingOption: 'Shipping to DR Congo:',
    seaFreight: 'Matadi Sea Cargo (25-35 days)',
    airFreight: 'Kinshasa Express Air (5-8 days)',
    similarProductsTitle: 'Similar Products in this category',

    // Messaging & Trade Chat
    tradeChatTitle: 'B2B Trade Chat',
    tradeChatSub: 'Direct negotiations between Chinese exporters and Congolese buyers',
    tradeChatOnline: 'Connected parties (Guangzhou / Kinshasa)',
    activeDiscussions: 'Active Inquiries',
    viewStore: 'View Store',
    productSubject: 'Subject',
    viewProductPage: 'View Product',
    usuallyReplies: 'Usually replies within 1 hour',
    quickPromptsTitle: 'Quick inquiries:',
    promptBestPrice: '💰 Best unit price for 100 units?',
    promptSeaFreight: '🚢 Sea freight shipping rate to Matadi port',
    promptSample: '📦 Sample request before bulk order',
    promptFeri: '📄 Can you handle DRC customs FERI certificate?',
    typeMessagePlaceholder: 'Type your message to the agency (French, English, or Chinese)...',
    selectDiscussionToStart: 'Select an inquiry on the left to start.',
    translateAction: 'Translate',
    translating: 'Translating...',
    seeOriginal: 'Show original',
    autoTranslateToggle: 'Instant Auto-Translation Active',
    translatedBadge: 'Auto-translated',
    sendAction: 'Send',

    // Buyer Dashboard
    buyerOverviewTab: 'Overview',
    buyerRfqsTab: 'My RFQ Quotes',
    buyerOrdersTab: 'Orders & Logistics Tracking',
    buyerFavoritesTab: 'Favorite Products',
    buyerProfileTab: 'Importer Profile',
    buyerDashboardTitle: 'Buyer Portal',
    buyerWelcome: 'Welcome to your China–DR Congo international sourcing portal.',
    totalRfqsTitle: 'Active RFQs',
    totalOrdersTitle: 'Orders in Transit',
    favoriteItemsTitle: 'Bookmarked Products',
    recentOrdersTitle: 'Recent Orders & Shipment Tracking',
    noOrdersYet: 'No purchase orders recorded yet.',
    orderNumber: 'Order #',
    orderTotal: 'Total USD',
    orderStatus: 'Logistics Status',

    // Statuses
    statusPending: 'Pending Confirmation',
    statusInProduction: 'In Production (China)',
    statusShippedChina: 'Container Shipped from Factory',
    statusSeaTransit: 'At Sea (Maritime Transit to Matadi)',
    statusCustomsMatadi: 'Customs Clearance at Matadi Port',
    statusDeliveredKinshasa: 'Delivered in Kinshasa',

    // Footer
    footerTrustAgencies: 'Verified Chinese Suppliers',
    footerTrustAgenciesDesc: 'Business licenses authenticated with on-site audits in Guangzhou, Yiwu, and Shenzhen.',
    footerTrustSea: 'Matadi Ocean Freight',
    footerTrustSeaDesc: 'Regular FCL and LCL container shipments with complete FERI/BESC certificate support.',
    footerTrustAir: 'Express Air Cargo to DRC',
    footerTrustAirDesc: 'Weekly cargo flights to Kinshasa Ndjili and Lubumbashi Luano airports (5-8 days).',
    footerTrustSupport: 'Bilingual Trade Support',
    footerTrustSupportDesc: 'French and Chinese trade representatives in China assisting with price negotiation and quality control.',
    footerAboutDesc: 'Official B2B sourcing platform by ASEP connecting enterprises, traders, and importers across the DR Congo directly with top Chinese manufacturers.',
    footerDemoNotice: '⚠️ Interactive demonstration and prototype for China-DRC cross-border trade.',
    footerHubsTitle: 'China Sourcing Hubs',
    footerQuickLinksTitle: 'Quick Links',
    footerCopyright: '© 2026 ASEP MARKET — Atelier des Solutions Entrepreneuriales et Pédagogiques. Dedicated to strengthening bilateral trade between China and the DR Congo.',

    langSwitched: 'Language switched: English 🇬🇧',

    // Splash Screen
    splashTitle: 'ASEP MARKET',
    splashSubtitle: 'Atelier des Solutions Entrepreneuriales et Pédagogiques',
    splashCorridor: 'The B2B platform connecting DR Congo businesses with suppliers in China.',
    splashPillar1Title: 'Direct Factory Sourcing',
    splashPillar1Desc: 'Reach agencies and manufacturers in Guangzhou, Yiwu, Shenzhen and Foshan directly.',
    splashPillar2Title: 'Request for quotation',
    splashPillar2Desc: 'Send your requirements, receive priced offers and compare them before ordering.',
    splashPillar3Title: 'English · Français · 中文',
    splashPillar3Desc: 'An interface and messaging built for communication across languages.',
    splashPillar4Title: 'Tracking to the DRC',
    splashPillar4Desc: 'Follow each order: production, sea freight to Matadi or air to Kinshasa, customs, delivery.',
    splashEnterButton: 'Enter the platform',
    splashSkip: 'Skip Intro',
    splashDoNotShowAgain: 'Do not show on launch',
    splashPresentation: 'ASEP Overview',
  },
};
