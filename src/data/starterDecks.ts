import type { PresentationDeck } from '../types/presentation';

export const STARTER_DECKS: PresentationDeck[] = [
  {
    id: 'starter-en-grid',
    title: 'Grid-Scale Battery Storage Economics',
    subtitle: '2026–2030 Capital Allocation & Deployment Roadmap',
    language: 'English',
    languageCode: 'en',
    rtl: false,
    tone: 'Executive',
    theme: 'neon-aurora',
    updatedAt: '2026-11-15T10:00:00.000Z',
    slides: [
      {
        id: 'en-1',
        layout: 'title',
        kicker: 'Energy Infrastructure Briefing',
        title: 'Grid-Scale Battery Storage Economics',
        subtitle: '2026–2030 Capital Allocation & Deployment Roadmap',
        speakerNotes:
          'Welcome the executive committee. Frame the session around why utility-scale storage has moved from pilot subsidies to core grid economics.',
      },
      {
        id: 'en-2',
        layout: 'metric',
        kicker: 'Market Inflection',
        title: 'Declining Cell Costs Unlock Four-Hour Dispatch Parity',
        metrics: [
          { value: '-38%', label: 'LFP pack cost decline since 2023' },
          { value: '4.2h', label: 'Median commercial duration' },
          { value: '91.4%', label: 'Round-trip AC efficiency' },
        ],
        speakerNotes:
          'Highlight that LFP chemistry cost reductions have compressed payback periods under five years in high-renewable markets.',
      },
      {
        id: 'en-3',
        layout: 'two-column',
        kicker: 'Strategic Comparison',
        title: 'Co-Located Solar Storage vs. Standalone Transmission Hubs',
        leftColumn: {
          heading: 'Co-Located Generation Assets',
          points: [
            'Shares existing inverter and interconnection queue',
            'Captures clipped midday solar generation',
            'Lower civil engineering and permitting overhead',
          ],
        },
        rightColumn: {
          heading: 'Standalone Grid Hubs',
          points: [
            'Positioned directly at congested substations',
            'Dual revenue from arbitrage and frequency regulation',
            'Faster independent site acquisition cycle',
          ],
        },
        speakerNotes:
          'Compare capital efficiency of co-located assets versus merchant revenue flexibility of standalone transmission hubs.',
      },
      {
        id: 'en-4',
        layout: 'bullets',
        kicker: 'Risk Mitigation',
        title: 'Three Controls Protecting Long-Term Asset Yield',
        subtitle: 'Operational discipline across procurement, firmware, and offtake',
        bullets: [
          'Multi-vendor LFP supply agreements indexed to lithium carbonate benchmarks',
          'Automated thermal telemetry balancing cell degradation below 1.8% annually',
          'Blended revenue stacking combining 10-year capacity tolls with merchant dispatch',
        ],
        speakerNotes:
          'Walk through procurement diversification and how capacity tolling stabilizes debt service coverage ratios.',
      },
      {
        id: 'en-5',
        layout: 'closing',
        kicker: 'Decision Gate',
        title: 'Approve Phase II Interconnection & EPC Commitments',
        subtitle: 'Target Q1 financial close across 640 MWh priority portfolio',
        bullets: [
          'Finalize 420 MWh substation land leases by December 15',
          'Lock transformer delivery slots with Tier-1 OEM partners',
        ],
        speakerNotes:
          'Request formal sign-off on Phase II land leases and long-lead transformer procurement.',
      },
      {
        id: 'en-6',
        layout: 'bullets',
        kicker: 'Sources & Documentation',
        title: 'References',
        subtitle: 'Market benchmarks, grid filings, and engineering data sources',
        bullets: [
          'NREL Annual Technology Baseline (ATB) — Utility-Scale Battery Storage Cost Projections',
          'Lazard Levelized Cost of Storage (LCOS) & Hybrid Dispatch Economics Benchmark',
          'FERC Order 2023 Interconnection Queue & ISO Substation Telemetry Reports',
          'BloombergNEF Lithium-Ion Battery Pack Price Survey (LFP Chemistry Index)',
        ],
        speakerNotes:
          'Point the committee to the underlying cost curves, interconnection filings, and OEM benchmarks.',
      },
    ],
  },
  {
    id: 'starter-ar-digital',
    title: 'استراتيجية التحول الرقمي والمدن الذكية',
    subtitle: 'خارطة طريق الخدمات الحكومية والبنية التحتية السحابية 2027',
    language: 'Arabic',
    languageCode: 'ar',
    rtl: true,
    tone: 'Executive',
    theme: 'editorial-ivory',
    updatedAt: '2026-11-15T10:00:00.000Z',
    slides: [
      {
        id: 'ar-1',
        layout: 'title',
        kicker: 'مبادرة التطوير المؤسسي',
        title: 'استراتيجية التحول الرقمي والمدن الذكية',
        subtitle: 'خارطة طريق الخدمات الحكومية والبنية التحتية السحابية 2027',
        speakerNotes:
          'ابدأ العرض بالتأكيد على أن التحول الرقمي يركز على تجربة المواطن وسرعة إنجاز المعاملات.',
      },
      {
        id: 'ar-2',
        layout: 'metric',
        kicker: 'مؤشرات الأداء المستهدفة',
        title: 'تسريع الخدمات العامة ورفع كفاءة التشغيل',
        metrics: [
          { value: '94%', label: 'رقمنة الخدمات الأساسية' },
          { value: '62%', label: 'تقليص زمن إنجاز الطلبات' },
          { value: '3.2M', label: 'مستفيد نشط شهرياً' },
        ],
        speakerNotes:
          'استعرض الأرقام المستهدفة خلال الثمانية عشر شهراً القادمة وكيفية قياس رضا المستفيدين.',
      },
      {
        id: 'ar-3',
        layout: 'two-column',
        kicker: 'محاور التنفيذ',
        title: 'تحديث البنية التحتية مقابل تطوير تجربة المستفيد',
        leftColumn: {
          heading: 'الطبقة التأسيسية والبيانات',
          points: [
            'توحيد منصات الهوية الرقمية والتوقيع المعتمد',
            'تبادل البيانات اللحظي عبر واجهات برمجية موحدة',
            'تطبيق معايير الأمن السيبراني والامتثال السحابي',
          ],
        },
        rightColumn: {
          heading: 'منصات الخدمة المباشرة',
          points: [
            'بوابة موحدة تدعم الجوال وإمكانية الوصول الشامل',
            'معالجة تلقائية للموافقات الروتينية خلال دقائق',
            'إشعارات استباقية لتجديد التراخيص والوثائق',
          ],
        },
        speakerNotes:
          'وضح التكامل بين طبقة البيانات التأسيسية وتجربة المستخدم النهائية.',
      },
      {
        id: 'ar-4',
        layout: 'closing',
        kicker: 'الخطوات القادمة',
        title: 'إطلاق المرحلة التجريبية في الربع الأول',
        subtitle: 'تشكيل فرق العمل المشتركة واعتماد الحوكمة التنفيذية',
        bullets: [
          'اعتماد ميثاق البيانات المفتوحة بين الجهات الشريكة',
          'بدء التشغيل التجريبي لخمس خدمات ذات أولوية عالية',
        ],
        speakerNotes:
          'اختم بطلب اعتماد الجدول الزمني للمرحلة التجريبية وتحديد منسقي الجهات.',
      },
      {
        id: 'ar-5',
        layout: 'bullets',
        kicker: 'المصادر والتوثيق',
        title: 'المراجع والمصادر',
        subtitle: 'الأطر المرجعية والتقارير الاستراتيجية المعتمدة في هذا العرض',
        bullets: [
          'استراتيجية الحكومة الرقمية ومؤشرات نضج الخدمات الإلكترونية — الأمم المتحدة (UN E-Government Survey)',
          'إطار حوكمة البيانات الوطنية ومعايير التبادل البيني السحابي',
          'مواصفات ISO/IEC 27001 للأمن السيبراني وحماية البنية التحتية الرقمية',
        ],
        speakerNotes:
          'راجع المصادر والمعايير الدولية المعتمدة لقياس نضج الخدمات الرقمية وأمن البيانات.',
      },
    ],
  },
  {
    id: 'starter-ja-mobility',
    title: '次世代都市モビリティと脱炭素インフラ',
    subtitle: '2030年に向けた自動運転物流と地域エネルギー連携',
    language: 'Japanese',
    languageCode: 'ja',
    rtl: false,
    tone: 'Technical',
    theme: 'midnight-slate',
    updatedAt: '2026-11-15T10:00:00.000Z',
    slides: [
      {
        id: 'ja-1',
        layout: 'title',
        kicker: '都市インフラ構想',
        title: '次世代都市モビリティと脱炭素インフラ',
        subtitle: '2030年に向けた自動運転物流と地域エネルギー連携',
        speakerNotes:
          '本プレゼンテーションでは、都市部のラストワンマイル物流とEV充放電網の統合モデルを提案します。',
      },
      {
        id: 'ja-2',
        layout: 'bullets',
        kicker: '構造的課題',
        title: '物流効率と電力ピーク負荷の同時最適化',
        subtitle: '輸送網と配電網を一体で設計する統合アプローチ',
        bullets: [
          '配送車両の電動化に伴い、夕方時間帯の充電需要が局所的に集中',
          'V2G（Vehicle-to-Grid）制御により待機車両を分散型蓄電池として活用',
          'AI需要予測に基づく動的ルーティングで空車走行距離を24%削減',
        ],
        speakerNotes:
          '輸送コスト削減だけでなく、電力系統の安定化収益を同時に生み出す点を強調します。',
      },
      {
        id: 'ja-3',
        layout: 'metric',
        kicker: '実証成果',
        title: 'モデル地区におけるパイロット導入効果',
        metrics: [
          { value: '-31%', label: '運行あたりCO2排出量' },
          { value: '+18%', label: '積載率の改善幅' },
          { value: '99.2%', label: '定時配送達成率' },
        ],
        speakerNotes:
          '先行実証エリアでの定量的成果を示し、全国展開の妥当性を説明します。',
      },
      {
        id: 'ja-4',
        layout: 'closing',
        kicker: '今後の展開',
        title: '自治体・エネルギー事業者との共同コンソーシアム設立',
        subtitle: '2027年春の商用運行開始に向けた実装フェーズへ',
        bullets: [
          '主要3都市での急速充電ハブ整備計画の確定',
          '運行データ連携APIの標準仕様公開',
        ],
        speakerNotes:
          'パートナー各社との覚書締結に向けた次回の実務者会議を案内します。',
      },
      {
        id: 'ja-5',
        layout: 'bullets',
        kicker: '出典・参考資料',
        title: '参考文献',
        subtitle: '本構想の定量試算および制度設計で参照した主要資料',
        bullets: [
          '経済産業省・国土交通省「次世代モビリティ・物流DX推進ロードマップ」',
          '資源エネルギー庁「V2G（Vehicle-to-Grid）実証事業および需給調整市場ガイドライン」',
          'IEA Global EV Outlook — 都市部商用EVフリート電化・充電インフラ分析',
        ],
        speakerNotes:
          '試算に用いた公的統計および実証事業レポートの出典を最後に提示します。',
      },
    ],
  },
  {
    id: 'starter-es-latam',
    title: 'Expansión Sostenible en América Latina',
    subtitle: 'Estrategia Regional de Comercio Circular y Logística Verde',
    language: 'Spanish',
    languageCode: 'es',
    rtl: false,
    tone: 'Persuasive',
    theme: 'nordic-sage',
    updatedAt: '2026-11-15T10:00:00.000Z',
    slides: [
      {
        id: 'es-1',
        layout: 'title',
        kicker: 'Plan Regional 2027',
        title: 'Expansión Sostenible en América Latina',
        subtitle: 'Estrategia Regional de Comercio Circular y Logística Verde',
        speakerNotes:
          'Presentación ejecutiva sobre la oportunidad de crecimiento rentable con trazabilidad ambiental.',
      },
      {
        id: 'es-2',
        layout: 'quote',
        kicker: 'Visión Central',
        title: 'La eficiencia logística y la circularidad comparten el mismo balance',
        quote:
          'Cada ruta optimizada y cada envase recuperado reduce costos operativos mientras construye confianza de marca a largo plazo.',
        quoteAuthor: 'Dirección de Operaciones Regionales',
        speakerNotes:
          'Conectar sostenibilidad con margen operativo antes de entrar en los indicadores.',
      },
      {
        id: 'es-3',
        layout: 'metric',
        kicker: 'Proyección 24 Meses',
        title: 'Impacto Económico y Ambiental Proyectado',
        metrics: [
          { value: '6', label: 'Ciudades ancla conectadas' },
          { value: '-27%', label: 'Costo logístico por unidad' },
          { value: '78%', label: 'Tasa de retorno de empaques' },
        ],
        speakerNotes:
          'Detallar los ahorros proyectados por consolidación de carga y empaques reutilizables.',
      },
      {
        id: 'es-4',
        layout: 'closing',
        kicker: 'Próximos Pasos',
        title: 'Inicio de Operaciones Piloto en Bogotá y Santiago',
        subtitle: 'Validación comercial durante el primer semestre',
        bullets: [
          'Firmar alianzas con operadores de última milla eléctrica',
          'Activar tablero de trazabilidad para clientes corporativos',
        ],
        speakerNotes:
          'Cerrar solicitando aprobación del presupuesto inicial de despliegue.',
      },
      {
        id: 'es-5',
        layout: 'bullets',
        kicker: 'Fuentes y Documentación',
        title: 'Referencias',
        subtitle: 'Estudios regionales, marcos ESG y datos logísticos citados',
        bullets: [
          'BID (Banco Interamericano de Desarrollo) — Descarbonización del Transporte y Logística Urbana en ALC',
          'CEPAL — Economía Circular y Cadenas de Valor Sostenibles en América Latina',
          'Ellen MacArthur Foundation — Guía de Empaques Reutilizables y Trazabilidad Comercial',
        ],
        speakerNotes:
          'Presentar las fuentes institucionales que respaldan las proyecciones financieras y ambientales.',
      },
    ],
  },
];
